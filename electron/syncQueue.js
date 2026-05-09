/**
 * Append-only sync queue for cloud-mutating operations.
 *
 * Persists to a single JSON file under userData. Survives crashes.
 * Drain is caller-driven (no internal timers) so the queue stays cold
 * when nothing is happening.
 *
 *   const q = new SyncQueue(path);
 *   q.enqueue({ type: 'upsert', id, payload });
 *   q.enqueue({ type: 'tombstone', id, payload: { deleted_at: ... } });
 *   await q.drain(async (ops) => [...resultsPerOp]);
 *
 * Op shape on disk:
 *   { type, id, payload, ts, attempts, nextRetryAt, lastError }
 *
 * Result returned by executor for each op:
 *   { status: 'sent' | 'permanent' | 'transient', error?: string }
 *     - sent:       remove from queue
 *     - permanent:  drop and surface (RLS deny, 4xx, validation)
 *     - transient:  keep, schedule retry with backoff
 */

import { EventEmitter } from 'events';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { dirname } from 'path';

const BACKOFF_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000]; // 5s, 30s, 2m, 10m, 1h
const MAX_ATTEMPTS_BEFORE_DROP = BACKOFF_MS.length + 2; // ~6 tries over ~1.2h

function backoffFor(attempts) {
  const i = Math.min(attempts - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[Math.max(i, 0)];
}

/**
 * Coalesce ops per id so we don't send obsolete state.
 * Rules:
 *   - Multiple upserts for same id → keep newest (by ts).
 *   - Tombstone after upsert (newer ts) → drop the upsert.
 *   - Upsert after tombstone (newer ts) → keep upsert (resurrect).
 *   - Same op type and id, older ts → drop older.
 */
function coalesce(ops) {
  const byId = new Map();
  for (const op of ops) {
    const prev = byId.get(op.id);
    if (!prev) { byId.set(op.id, op); continue; }
    // Newest ts wins; ties prefer tombstone (deletes are intentional).
    if (op.ts > prev.ts) byId.set(op.id, op);
    else if (op.ts === prev.ts && op.type === 'tombstone') byId.set(op.id, op);
  }
  return [...byId.values()];
}

export class SyncQueue extends EventEmitter {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this.draining = false;
    this.ops = this._load();
  }

  _load() {
    try {
      if (!existsSync(this.filePath)) return [];
      const raw = readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _persist() {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.ops), 'utf8');
      renameSync(tmp, this.filePath);
    } catch (err) {
      this.emit('error', err);
    }
  }

  enqueue({ type, id, payload }) {
    if (!type || !id) throw new Error('SyncQueue.enqueue requires type and id');
    const op = {
      type,
      id,
      payload: payload || null,
      ts: Date.now(),
      attempts: 0,
      nextRetryAt: 0,
      lastError: null,
    };
    // Drop superseded ops for same id immediately to keep file small.
    this.ops = this.ops.filter(o => o.id !== id || o.ts > op.ts);
    this.ops.push(op);
    this._persist();
    this.emit('enqueued', op);
    this.emit('change', this.status());
  }

  size() {
    return this.ops.length;
  }

  failedCount() {
    return this.ops.filter(o => o.attempts > 0).length;
  }

  status() {
    const total = this.ops.length;
    const failed = this.failedCount();
    return {
      pending: total - failed,
      failed,
      total,
      state: total === 0 ? 'idle' : failed > 0 ? 'error' : 'pending',
    };
  }

  /**
   * Hand the queue to an executor that performs the actual cloud calls.
   * @param {(ops: Array) => Promise<Array<{status: string, error?: string}>>} executor
   */
  async drain(executor) {
    if (this.draining || !this.ops.length) return { sent: 0, kept: 0, dropped: 0 };
    this.draining = true;
    let sent = 0, kept = 0, dropped = 0;
    try {
      const now = Date.now();
      const ready = this.ops.filter(o => (o.nextRetryAt || 0) <= now);
      if (!ready.length) return { sent: 0, kept: this.ops.length, dropped: 0 };

      const batch = coalesce(ready);
      const results = await executor(batch);

      // Map results back to ready set by id (executor returns same order as batch).
      const verdictById = new Map();
      batch.forEach((op, i) => verdictById.set(op.id, results[i] || { status: 'transient', error: 'no result' }));

      const remaining = [];
      for (const op of this.ops) {
        if (!ready.includes(op)) { remaining.push(op); continue; }
        const verdict = verdictById.get(op.id);
        if (!verdict || verdict.status === 'sent') { sent++; continue; }
        if (verdict.status === 'permanent') {
          dropped++;
          this.emit('dropped', { op, error: verdict.error });
          continue;
        }
        // transient
        op.attempts += 1;
        op.lastError = verdict.error || null;
        if (op.attempts >= MAX_ATTEMPTS_BEFORE_DROP) {
          dropped++;
          this.emit('dropped', { op, error: verdict.error || 'max attempts exceeded' });
          continue;
        }
        op.nextRetryAt = Date.now() + backoffFor(op.attempts);
        remaining.push(op);
        kept++;
      }
      this.ops = remaining;
      this._persist();
      this.emit('drained', { sent, kept, dropped });
      this.emit('change', this.status());
      return { sent, kept, dropped };
    } catch (err) {
      this.emit('error', err);
      return { sent, kept, dropped };
    } finally {
      this.draining = false;
    }
  }

  /** Clear all queued ops. Used on logout. */
  reset() {
    this.ops = [];
    this._persist();
    this.emit('change', this.status());
  }
}

/**
 * Classify a Supabase error into 'permanent' or 'transient'.
 * RLS denies, validation, auth = permanent (no retry).
 * Network, 5xx, timeouts = transient (retry with backoff).
 */
export function classifySupabaseError(error) {
  if (!error) return null;
  const code = error.code || error.status || '';
  const msg = (error.message || '').toLowerCase();

  // PostgREST validation codes — true permanent failures (data shape wrong)
  if (code === '23502' || code === '23503' || code === '23505' || code === '23514') return 'permanent'; // not-null, fk, unique, check

  // RLS denies and JWT issues are recoverable: tier upgrade or session
  // refresh can flip them. Treat as transient so the op stays queued.
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST302') return 'transient';
  if (msg.includes('row-level security') || msg.includes('permission denied')) return 'transient';
  if (msg.includes('jwt') || msg.includes('expired')) return 'transient';

  // HTTP status hints
  const status = Number(code);
  if (Number.isFinite(status)) {
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) return 'permanent';
    if (status >= 500 || status === 408 || status === 429) return 'transient';
  }

  // Network-ish messages
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') ||
      msg.includes('econnrefused') || msg.includes('socket')) return 'transient';

  // Default: be cautious — retry once or twice.
  return 'transient';
}
