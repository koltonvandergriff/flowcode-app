import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { supabase } from './supabaseClient.js';
import { SyncQueue, classifySupabaseError } from './syncQueue.js';
import { detectSecretsInFields } from './secretScrub.js';

function getDeviceId() {
  const settingsPath = join(app.getPath('userData'), 'flowade-data', 'device.json');
  try {
    const data = JSON.parse(readFileSync(settingsPath, 'utf8'));
    if (data.deviceId) return data.deviceId;
  } catch {}
  const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const dir = join(app.getPath('userData'), 'flowade-data');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify({ deviceId: id }), 'utf8');
  } catch {}
  return id;
}

const TIER_LIMITS = { starter: 50, pro: 500, team: 5000 };
const TIER_CACHE_TTL_MS = 5 * 60 * 1000;
const REALTIME_IDLE_MS = 5 * 60 * 1000;
const REALTIME_RETRY_MS = 5_000;
const DEBUG = process.env.FLOWADE_DEBUG_MEMORY === '1';

export class MemoryStore {
  constructor() {
    const dataDir = join(app.getPath('userData'), 'flowade-data');
    this.dataDir = dataDir;
    this.memoryDir = join(dataDir, 'memory');
    this.tierCachePath = join(dataDir, 'tier-cache.json');
    this.queuePath = join(dataDir, 'memory-sync-queue.json');
    this.syncCursorPath = join(dataDir, 'memory-sync-cursor.json');
    this.ensureDir();
    this.userId = getDeviceId();
    this.tier = 'starter';
    this.tierFetchedAt = 0;
    this.lastSyncAt = 0;
    this.realtimeChannel = null;
    this.realtimeIdleTimer = null;
    this.realtimeRetryTimer = null;
    this.onChange = null;
    this.onStatusChange = null;

    this._loadTierCache();
    this._loadSyncCursor();
    this.queue = new SyncQueue(this.queuePath);
    this.queue.on('change', () => this._emitStatus());
    this.queue.on('dropped', ({ op, error }) => {
      console.error('[Memory] Op dropped:', op.type, op.id, error);
      // RLS deny most often means our cached tier is stale (e.g. user
      // downgraded or profile was reset). Force a re-read on next access.
      if (error && /row-level security|permission denied/i.test(error)) {
        this.tier = 'starter';
        this.tierFetchedAt = 0;
        this._saveTierCache();
        this.fetchTier(true).then(() => this._emitStatus());
      }
    });
  }

  _loadTierCache() {
    try {
      if (existsSync(this.tierCachePath)) {
        const cache = JSON.parse(readFileSync(this.tierCachePath, 'utf8'));
        if (cache.userId === this.userId && cache.tier) {
          this.tier = cache.tier;
          this.tierFetchedAt = cache.fetchedAt || 0;
        }
      }
    } catch {}
  }

  _saveTierCache() {
    try {
      writeFileSync(this.tierCachePath, JSON.stringify({
        userId: this.userId, tier: this.tier, fetchedAt: this.tierFetchedAt,
      }), 'utf8');
    } catch {}
  }

  _loadSyncCursor() {
    try {
      if (existsSync(this.syncCursorPath)) {
        const cache = JSON.parse(readFileSync(this.syncCursorPath, 'utf8'));
        if (cache.userId === this.userId) this.lastSyncAt = cache.lastSyncAt || 0;
      }
    } catch {}
  }

  _saveSyncCursor() {
    try {
      writeFileSync(this.syncCursorPath, JSON.stringify({
        userId: this.userId, lastSyncAt: this.lastSyncAt,
      }), 'utf8');
    } catch {}
  }

  setOnChange(cb) { this.onChange = cb; }
  setOnStatusChange(cb) { this.onStatusChange = cb; }

  _emitChange() { try { this.onChange?.(); } catch {} }
  _emitStatus() { try { this.onStatusChange?.(this.getStatus()); } catch {} }

  isCloudEnabled() {
    return this.userId && !this.userId.startsWith('dev-') && this.userId !== 'dev-logged-out';
  }

  /**
   * Poll briefly for an active Supabase session. Avoids races where startup
   * hits the DB before the persisted session has been hydrated by the auth
   * client. Returns true if a session is live, false if the timeout is hit.
   */
  async _waitForSession(timeoutMs = 3000, intervalMs = 100) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) return true;
      } catch {}
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
  }

  isCloudTier() {
    return this.tier === 'pro' || this.tier === 'team';
  }

  async setUserId(id) {
    const changed = this.userId !== id;
    if (changed) {
      // Identity changed — wipe local state belonging to the previous user
      // so a different account on this device cannot read their memories.
      // (Cloud holds the source of truth and will re-populate on login.)
      this._wipeLocalState();
      this.tier = 'starter';
      this.tierFetchedAt = 0;
      this.lastSyncAt = 0;
      this.queue.reset();
    }
    this.userId = id;
    if (changed) this._saveSyncCursor();
    if (this.isCloudEnabled()) {
      await this.fetchTier();
      await this._fullSync();
    } else {
      this._teardownRealtime();
    }
    this._emitChange();
    this._emitStatus();
  }

  _wipeLocalState() {
    try {
      if (existsSync(this.memoryDir)) {
        for (const f of readdirSync(this.memoryDir)) {
          if (f.endsWith('.json')) {
            try { unlinkSync(join(this.memoryDir, f)); } catch {}
          }
        }
      }
    } catch {}
    try { if (existsSync(this.tierCachePath)) unlinkSync(this.tierCachePath); } catch {}
    try { if (existsSync(this.syncCursorPath)) unlinkSync(this.syncCursorPath); } catch {}
  }

  async fetchTier(force = false) {
    if (!this.isCloudEnabled()) return this.tier;
    const fresh = !force && (Date.now() - this.tierFetchedAt) < TIER_CACHE_TTL_MS;
    if (fresh && this.tier !== 'starter') return this.tier;
    // Wait for session to be live before hitting RLS-gated tables. Without
    // this, a startup race makes the SELECT run as anon → RLS hides the
    // profile row → we incorrectly think the row is missing.
    const ready = await this._waitForSession();
    if (!ready) {
      console.warn('[Memory] fetchTier skipped — auth session not ready');
      return this.tier;
    }
    const before = this.tier;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', this.userId)
        .maybeSingle();
      if (error) {
        console.error('[Memory] fetchTier error:', error.message);
        return this.tier;
      }
      if (!data) {
        // Profile row missing (signup trigger never fired or row was deleted).
        // Insert one so memories RLS has something to check against.
        await this._ensureProfile();
        this.tier = 'starter';
      } else {
        this.tier = data.subscription_tier || 'starter';
      }
      this.tierFetchedAt = Date.now();
      this._saveTierCache();
    } catch (err) {
      console.error('[Memory] fetchTier failed:', err.message);
    }
    // Tier just upgraded into cloud-enabled territory → run full sync so
    // entries created while gated reach the cloud automatically.
    if (before !== this.tier && this.isCloudTier()) {
      this._fullSync().catch(() => {});
    }
    return this.tier;
  }

  /**
   * Insert a minimal profile row if one is missing. The handle_new_user
   * trigger should normally do this on signup, but we self-heal in case
   * the row was lost (e.g. cascaded delete during testing).
   */
  async _ensureProfile() {
    if (!this.isCloudEnabled()) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: this.userId }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[Memory] ensureProfile error:', error.message);
      else console.log('[Memory] Created missing profile row for', this.userId);
    } catch (err) {
      console.error('[Memory] ensureProfile failed:', err.message);
    }
  }

  /**
   * Pull cloud → local, backfill orphan local entries, drain queue.
   * Called on login and on tier upgrade. Uses a full pull (bypassing the
   * incremental cursor) so a fresh device gets every row.
   */
  async _fullSync() {
    if (!this.isCloudEnabled() || !this.isCloudTier()) return;
    const cloudMap = await this.syncFromCloud(true);
    this._backfillToQueue(cloudMap);
    await this.drain();
  }

  getLimit() { return TIER_LIMITS[this.tier] || 50; }

  getCount() {
    return this.list().length;
  }

  getStatus() {
    return {
      ...this.queue.status(),
      tier: this.tier,
      cloudEnabled: this.isCloudEnabled() && this.isCloudTier(),
      userId: this.userId,
      count: this.getCount(),
      limit: this.getLimit(),
    };
  }

  // ---------------------------------------------------------------------------
  // File-level helpers
  // ---------------------------------------------------------------------------

  ensureDir() {
    if (!existsSync(this.memoryDir)) mkdirSync(this.memoryDir, { recursive: true });
  }

  _readJson(path) {
    try { return JSON.parse(readFileSync(path, 'utf8')); }
    catch { return null; }
  }

  _writeLocal(entry) {
    writeFileSync(join(this.memoryDir, `${entry.id}.json`), JSON.stringify(entry, null, 2), 'utf8');
  }

  _allEntries() {
    this.ensureDir();
    try {
      return readdirSync(this.memoryDir)
        .filter(f => f.endsWith('.json'))
        .map(f => this._readJson(join(this.memoryDir, f)))
        .filter(Boolean);
    } catch { return []; }
  }

  // ---------------------------------------------------------------------------
  // Public CRUD — local-first, queue-driven cloud sync
  // ---------------------------------------------------------------------------

  list(tag) {
    let entries = this._allEntries()
      .filter(e => !e.deletedAt)
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    if (tag) entries = entries.filter(e => e.tags?.includes(tag));
    return entries;
  }

  get(id) {
    const entry = this._readJson(join(this.memoryDir, `${id}.json`));
    if (!entry || entry.deletedAt) return null;
    return entry;
  }

  create({ title, content, tags = [], type = 'note' }) {
    const limit = this.getLimit();
    const count = this.getCount();
    if (count >= limit) {
      return { error: `Memory limit reached (${count}/${limit} for ${this.tier} tier)` };
    }
    // Block secret-bearing input before it reaches local disk OR the
    // sync queue. Better to fail loudly than to quietly ship a key to
    // Supabase + OpenAI + Anthropic.
    const scan = detectSecretsInFields({ title, content, tags: (tags || []).join(' ') });
    if (scan.hasSecrets) {
      return { error: 'secret-detected', secretHits: scan.hits };
    }
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const entry = { id, title, content, tags, type, createdAt: Date.now(), updatedAt: Date.now() };
    this._writeLocal(entry);
    this._queueUpsert(entry);
    this._emitChange();
    return entry;
  }

  update(id, updates) {
    const path = join(this.memoryDir, `${id}.json`);
    const entry = this._readJson(path);
    if (!entry || entry.deletedAt) return null;
    // Re-scan on every update. Users sometimes edit a memory to paste
    // in a key after it was created clean.
    const merged = { ...entry, ...updates };
    const scan = detectSecretsInFields({
      title: merged.title || '',
      content: merged.content || '',
      tags: (merged.tags || []).join(' '),
    });
    if (scan.hasSecrets) {
      return { error: 'secret-detected', secretHits: scan.hits };
    }
    Object.assign(entry, updates, { updatedAt: Date.now() });
    this._writeLocal(entry);
    this._queueUpsert(entry);
    this._emitChange();
    return entry;
  }

  delete(id) {
    const path = join(this.memoryDir, `${id}.json`);
    const entry = this._readJson(path);
    if (!entry) return false;
    entry.deletedAt = new Date().toISOString();
    entry.updatedAt = Date.now();
    this._writeLocal(entry);
    this._queueTombstone(entry);
    this._emitChange();
    return true;
  }

  search(query) {
    const q = query.toLowerCase();
    return this.list().filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.content?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  // ---------------------------------------------------------------------------
  // Sync queue plumbing
  // ---------------------------------------------------------------------------

  _queueUpsert(entry) {
    // Always enqueue — gating happens at drain time. Op is held safely on
    // disk until the user is logged in and on a tier that allows cloud sync.
    if (!this.isCloudEnabled()) return;
    this.queue.enqueue({
      type: 'upsert',
      id: entry.id,
      payload: {
        id: entry.id,
        title: entry.title,
        content: entry.content || '',
        type: entry.type || 'note',
        tags: entry.tags || [],
        category_id: entry.categoryId || null,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      },
    });
    this._kickDrain();
  }

  _queueTombstone(entry) {
    if (!this.isCloudEnabled()) return;
    this.queue.enqueue({
      type: 'tombstone',
      id: entry.id,
      payload: { id: entry.id, deleted_at: entry.deletedAt, updated_at: entry.updatedAt },
    });
    this._kickDrain();
  }

  /**
   * Debounced auto-drain. Coalesces rapid writes into one network round-trip.
   */
  _kickDrain() {
    if (this._drainTimer) return;
    this._drainTimer = setTimeout(() => {
      this._drainTimer = null;
      this.drain().catch(() => {});
    }, 400);
  }

  /**
   * Drain queued cloud ops. Called on focus, login, online.
   * Lightweight no-op when queue empty.
   */
  async drain() {
    if (!this.isCloudEnabled() || !this.isCloudTier() || this.queue.size() === 0) return;
    await this.queue.drain(async (ops) => this._executeBatch(ops));
  }

  async _executeBatch(ops) {
    // Bail out early if we don't have a live session. Avoids hitting the
    // server unauthenticated and tripping RLS as a false negative.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (DEBUG) console.log('[Memory] Drain skipped — no auth session');
      const verdict = { status: 'transient', error: 'no auth session' };
      return ops.map(() => verdict);
    }
    if (DEBUG) console.log(`[Memory] Drain — session.user.id=${session.user?.id}, userId=${this.userId}, tier=${this.tier}`);

    const upserts = ops.filter(o => o.type === 'upsert');
    const tombstones = ops.filter(o => o.type === 'tombstone');
    const results = new Map(); // id -> verdict

    if (upserts.length) {
      const rows = upserts.map(o => ({ ...o.payload, user_id: this.userId }));
      const { error } = await supabase.from('memories').upsert(rows);
      if (error) {
        const verdict = { status: classifySupabaseError(error), error: error.message };
        for (const o of upserts) results.set(o.id, verdict);
      } else {
        for (const o of upserts) results.set(o.id, { status: 'sent' });
      }
    }

    if (tombstones.length) {
      // Tombstones: UPDATE deleted_at on existing rows. Use upsert so a row
      // soft-deleted before it ever reached the cloud is still inserted with
      // deleted_at set (RLS allows insert only when deleted_at IS NULL, so
      // we instead try update first; if no row matched, insert+update sequence).
      for (const op of tombstones) {
        const { error } = await supabase
          .from('memories')
          .update({ deleted_at: op.payload.deleted_at, updated_at: op.payload.updated_at })
          .eq('id', op.id)
          .eq('user_id', this.userId);
        if (error) {
          results.set(op.id, { status: classifySupabaseError(error), error: error.message });
        } else {
          results.set(op.id, { status: 'sent' });
        }
      }
    }

    return ops.map(o => results.get(o.id) || { status: 'transient', error: 'no result' });
  }

  /**
   * Pull cloud → local. Includes tombstones so deletes propagate across devices.
   * Incremental — only fetches rows with updated_at > lastSyncAt cursor.
   * Pass `full=true` to bypass cursor (used by login/manual sync).
   * @returns {Map<string, number>} cloud id → updated_at (for backfill comparison)
   */
  async syncFromCloud(full = false) {
    const cloudMap = new Map();
    if (!this.isCloudEnabled() || !this.isCloudTier()) return cloudMap;
    try {
      let q = supabase
        .from('memories')
        .select('*')
        .eq('user_id', this.userId)
        .order('updated_at', { ascending: false });
      if (!full && this.lastSyncAt > 0) {
        q = q.gt('updated_at', this.lastSyncAt);
      }
      const { data, error } = await q;
      if (error) { console.error('[Memory] Cloud pull error:', error.message); return cloudMap; }
      if (!data) return cloudMap;
      if (DEBUG) console.log(`[Memory] Cloud pull (${full ? 'full' : 'incremental'}) returned ${data.length} rows`);

      let touched = 0;
      let maxUpdated = this.lastSyncAt;
      for (const row of data) {
        cloudMap.set(row.id, row.updated_at || 0);
        if ((row.updated_at || 0) > maxUpdated) maxUpdated = row.updated_at;
        const local = this._readJson(join(this.memoryDir, `${row.id}.json`));
        // LWW: skip if local is newer.
        if (local && (local.updatedAt || 0) >= (row.updated_at || 0)) continue;
        const entry = {
          id: row.id,
          title: row.title,
          content: row.content || '',
          type: row.type || 'note',
          tags: row.tags || [],
          categoryId: row.category_id || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at || null,
        };
        this._writeLocal(entry);
        touched++;
      }
      if (maxUpdated > this.lastSyncAt) {
        this.lastSyncAt = maxUpdated;
        this._saveSyncCursor();
      }
      if (touched) this._emitChange();
    } catch (err) {
      console.error('[Memory] Cloud pull failed:', err.message);
    }
    return cloudMap;
  }

  /**
   * List soft-deleted memories that are still recoverable (within tombstone TTL).
   */
  async listDeleted() {
    if (!this.isCloudEnabled() || !this.isCloudTier()) return [];
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', this.userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) { console.error('[Memory] listDeleted error:', error.message); return []; }
      return (data || []).map(r => ({
        id: r.id,
        title: r.title,
        content: r.content || '',
        type: r.type || 'note',
        tags: r.tags || [],
        categoryId: r.category_id || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
      }));
    } catch (err) {
      console.error('[Memory] listDeleted failed:', err.message);
      return [];
    }
  }

  /**
   * Undo a soft delete. Sets deleted_at = NULL and bumps updated_at so the
   * change propagates to other devices via realtime.
   */
  async restore(id) {
    if (!this.isCloudEnabled() || !this.isCloudTier()) return false;
    const updatedAt = Date.now();
    try {
      const { error } = await supabase
        .from('memories')
        .update({ deleted_at: null, updated_at: updatedAt })
        .eq('id', id)
        .eq('user_id', this.userId);
      if (error) { console.error('[Memory] restore error:', error.message); return false; }
      // Pull just this row to refresh local copy.
      await this.syncFromCloud(true);
      this._emitChange();
      return true;
    } catch (err) {
      console.error('[Memory] restore failed:', err.message);
      return false;
    }
  }

  /**
   * Enqueue local entries that the cloud is missing or has an older copy of.
   * Runs once on login and after pull, so previously-orphan local memories
   * get a chance to reach the cloud.
   */
  _backfillToQueue(cloudMap) {
    if (!this.isCloudEnabled() || !this.isCloudTier()) return;
    const local = this._allEntries();
    let queued = 0;
    for (const entry of local) {
      const cloudUpdatedAt = cloudMap.get(entry.id) || 0;
      if ((entry.updatedAt || 0) <= cloudUpdatedAt) continue;
      if (entry.deletedAt) this._queueTombstone(entry);
      else this._queueUpsert(entry);
      queued++;
    }
    if (queued && DEBUG) console.log(`[Memory] Backfilled ${queued} local entries to sync queue`);
  }

  // ---------------------------------------------------------------------------
  // Realtime — single channel, lazy lifecycle
  // ---------------------------------------------------------------------------

  enableRealtime() {
    if (!this.isCloudEnabled() || !this.isCloudTier() || this.realtimeChannel) {
      this._scheduleRealtimeIdle();
      return;
    }
    try {
      this.realtimeChannel = supabase
        .channel(`memories:${this.userId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'memories', filter: `user_id=eq.${this.userId}` },
          // Real change event → pull fresh (bypasses incremental cursor so
          // out-of-band writes still land locally).
          () => { this._throttledPull(true); })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Catch up on anything we missed while disconnected — throttled
            // so reconnect storms don't fan out into N full pulls.
            this._throttledPull(true).catch(() => {});
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[Memory] Realtime channel', status, '— scheduling reconnect');
            this._scheduleRealtimeReconnect();
          }
        });
    } catch (err) {
      console.error('[Memory] Realtime subscribe failed:', err.message);
      this.realtimeChannel = null;
      this._scheduleRealtimeReconnect();
    }
    this._scheduleRealtimeIdle();
  }

  /**
   * Pull, but coalesce rapid-fire requests into one network round-trip per
   * REALTIME_PULL_THROTTLE_MS so reconnect storms don't fan out.
   */
  async _throttledPull(full = false) {
    const now = Date.now();
    if (this._lastPullAt && now - this._lastPullAt < 1500) return;
    this._lastPullAt = now;
    await this.syncFromCloud(full);
  }

  _scheduleRealtimeReconnect() {
    if (this.realtimeRetryTimer) return;
    this.realtimeRetryTimer = setTimeout(() => {
      this.realtimeRetryTimer = null;
      // Tear down stale channel and resubscribe if still active.
      if (this.realtimeChannel) {
        try { supabase.removeChannel(this.realtimeChannel); } catch {}
        this.realtimeChannel = null;
      }
      // Only reconnect if the user still has the panel open / wants events.
      if (!this.realtimeIdleTimer) return; // idle teardown already happened
      this.enableRealtime();
    }, REALTIME_RETRY_MS);
  }

  _scheduleRealtimeIdle() {
    if (this.realtimeIdleTimer) clearTimeout(this.realtimeIdleTimer);
    this.realtimeIdleTimer = setTimeout(() => this._teardownRealtime(), REALTIME_IDLE_MS);
  }

  touchRealtime() {
    if (this.realtimeChannel) this._scheduleRealtimeIdle();
    else this.enableRealtime();
  }

  _teardownRealtime() {
    if (this.realtimeIdleTimer) { clearTimeout(this.realtimeIdleTimer); this.realtimeIdleTimer = null; }
    if (this.realtimeRetryTimer) { clearTimeout(this.realtimeRetryTimer); this.realtimeRetryTimer = null; }
    if (this.realtimeChannel) {
      try { supabase.removeChannel(this.realtimeChannel); } catch {}
      this.realtimeChannel = null;
    }
  }

  disableRealtime() { this._teardownRealtime(); }
}
