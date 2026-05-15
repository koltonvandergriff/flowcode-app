import { EventEmitter } from 'events';
import { supabase } from './supabaseClient.js';

const VALID_KINDS = new Set([
  'plan', 'intent', 'claim', 'progress', 'blocker',
  'diff', 'done', 'review-fail', 'cancel', 'finish',
]);

const MAX_LOCAL_BUFFER = 1000;

function rowToEvent(row) {
  return {
    tokenId: Number(row.token_id),
    runId: row.run_id,
    workerId: row.worker_id ?? null,
    kind: row.kind,
    payload: row.payload ?? {},
    postedAt: row.posted_at,
  };
}

class SwarmChannel extends EventEmitter {
  constructor() {
    super();
    // Map<runId, Array<event>> — local fast-tail buffer; cloud is source of truth.
    this._buffer = new Map();
    // Map<runId, number> — next token id per run.
    this._nextToken = new Map();
  }

  _appendLocal(runId, event) {
    let buf = this._buffer.get(runId);
    if (!buf) { buf = []; this._buffer.set(runId, buf); }
    buf.push(event);
    if (buf.length > MAX_LOCAL_BUFFER) buf.splice(0, buf.length - MAX_LOCAL_BUFFER);
  }

  _bufferCovers(runId, sinceTokenId) {
    const buf = this._buffer.get(runId);
    if (!buf || buf.length === 0) return false;
    // Buffer "covers" a since cursor iff the oldest event's tokenId is
    // <= sinceTokenId + 1, i.e. no gap between the cursor and what we have.
    return buf[0].tokenId <= sinceTokenId + 1;
  }

  async post({ runId, workerId, kind, payload }) {
    if (!runId || typeof runId !== 'string') throw new Error('runId required');
    if (!VALID_KINDS.has(kind)) throw new Error(`invalid kind: ${kind}`);
    const next = (this._nextToken.get(runId) || 0) + 1;
    this._nextToken.set(runId, next);
    const postedAt = new Date().toISOString();
    const row = {
      run_id: runId,
      worker_id: workerId ?? null,
      kind,
      payload: payload ?? {},
      token_id: next,
      posted_at: postedAt,
    };
    const { error } = await supabase
      .from('swarm_channel_events')
      .insert(row);
    if (error) {
      // Roll back token counter so the same id can be retried.
      this._nextToken.set(runId, next - 1);
      throw new Error(error.message || String(error));
    }
    const event = rowToEvent(row);
    this._appendLocal(runId, event);
    this.emit('event', event);
    this.emit(`event:${kind}`, event);
    this.emit(`event:run:${runId}`, event);
    return { ok: true, tokenId: next, postedAt };
  }

  async read({ runId, sinceTokenId = 0, kinds = null, limit = 200 }) {
    if (!runId || typeof runId !== 'string') throw new Error('runId required');
    const kindFilter = Array.isArray(kinds) && kinds.length > 0 ? kinds : null;

    if (this._bufferCovers(runId, sinceTokenId)) {
      const buf = this._buffer.get(runId) || [];
      let events = buf.filter((e) => e.tokenId > sinceTokenId);
      if (kindFilter) events = events.filter((e) => kindFilter.includes(e.kind));
      if (events.length > limit) events = events.slice(0, limit);
      const latestTokenId = buf.length > 0 ? buf[buf.length - 1].tokenId : sinceTokenId;
      return { events, latestTokenId };
    }

    let q = supabase
      .from('swarm_channel_events')
      .select('*')
      .eq('run_id', runId)
      .gt('token_id', sinceTokenId)
      .order('token_id', { ascending: true })
      .limit(limit);
    if (kindFilter) q = q.in('kind', kindFilter);
    const { data, error } = await q;
    if (error) throw new Error(error.message || String(error));
    const events = (data || []).map(rowToEvent);
    const latestTokenId = events.length > 0
      ? events[events.length - 1].tokenId
      : sinceTokenId;
    // Opportunistically warm the local buffer.
    for (const ev of events) {
      const cur = this._nextToken.get(runId) || 0;
      if (ev.tokenId > cur) this._nextToken.set(runId, ev.tokenId);
      this._appendLocal(runId, ev);
    }
    return { events, latestTokenId };
  }

  bridgeHandlers() {
    return {
      'channel.post': (p) => this.post(p),
      'channel.read': (p) => this.read(p),
    };
  }

  registerBridge(bridge) {
    if (!bridge || typeof bridge.registerMethod !== 'function') return;
    for (const [n, fn] of Object.entries(this.bridgeHandlers())) bridge.registerMethod(n, fn);
  }
}

export { SwarmChannel };
export const swarmChannel = new SwarmChannel();
