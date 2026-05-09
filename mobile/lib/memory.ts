import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type MemoryType = 'fact' | 'decision' | 'context' | 'reference' | 'note';

export interface Memory {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: string | null;
}

interface CloudRow {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: MemoryType;
  tags: string[] | null;
  created_at: number;
  updated_at: number;
  deleted_at: string | null;
}

const CACHE_KEY = 'flowade.memories.cache';
const CURSOR_KEY = 'flowade.memories.cursor';

async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

function rowToMemory(r: CloudRow): Memory {
  return {
    id: r.id,
    title: r.title,
    content: r.content || '',
    type: r.type || 'note',
    tags: r.tags || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

async function readCache(): Promise<Memory[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCache(memories: Memory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memories));
  } catch {}
}

async function readCursor(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CURSOR_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function writeCursor(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(CURSOR_KEY, String(value));
  } catch {}
}

export async function clearMemoryCache(): Promise<void> {
  await AsyncStorage.multiRemove([CACHE_KEY, CURSOR_KEY]);
}

/**
 * Pull memories from the cloud, merging into the local cache. Incremental
 * after the first call (uses an updated_at cursor). Pass `full=true` to
 * bypass the cursor (e.g. for pull-to-refresh).
 */
export async function fetchMemories(full = false): Promise<Memory[]> {
  if (!supabase) return readCache();
  const userId = await getUserId();
  if (!userId) return readCache();

  let q = supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (!full) {
    const cursor = await readCursor();
    if (cursor > 0) q = q.gt('updated_at', cursor);
  }

  const { data, error } = await q;
  if (error) {
    console.warn('[memory] fetch error:', error.message);
    return readCache();
  }

  const incoming = (data || []).map(rowToMemory);
  const cache = full ? [] : await readCache();

  const byId = new Map<string, Memory>();
  for (const m of cache) byId.set(m.id, m);
  let maxUpdated = full ? 0 : await readCursor();
  for (const m of incoming) {
    byId.set(m.id, m); // newer wins because select ordered by updated_at desc and we overwrite
    if (m.updatedAt > maxUpdated) maxUpdated = m.updatedAt;
  }

  const merged = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  await writeCache(merged);
  if (maxUpdated > 0) await writeCursor(maxUpdated);

  return merged.filter(m => !m.deletedAt);
}

/**
 * Like fetchMemories but returns only soft-deleted entries (recoverable).
 */
export async function fetchDeletedMemories(): Promise<Memory[]> {
  if (!supabase) return [];
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.warn('[memory] fetchDeleted error:', error.message);
    return [];
  }
  return (data || []).map(rowToMemory);
}

export async function createMemory(input: {
  title: string;
  content?: string;
  tags?: string[];
  type?: MemoryType;
}): Promise<Memory | null> {
  if (!supabase) return null;
  const userId = await getUserId();
  if (!userId) return null;

  const now = Date.now();
  const id = `mem-${now}-${Math.random().toString(36).slice(2, 5)}`;
  const memory: Memory = {
    id,
    title: input.title.trim(),
    content: (input.content || '').trim(),
    type: input.type || 'note',
    tags: input.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from('memories').insert({
    id, user_id: userId, title: memory.title, content: memory.content,
    type: memory.type, tags: memory.tags,
    created_at: memory.createdAt, updated_at: memory.updatedAt,
  });

  if (error) {
    console.warn('[memory] create error:', error.message);
    return null;
  }

  const cache = await readCache();
  cache.unshift(memory);
  await writeCache(cache);
  return memory;
}

export async function updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
  if (!supabase) return null;
  const userId = await getUserId();
  if (!userId) return null;

  const updatedAt = Date.now();
  const payload: any = { updated_at: updatedAt };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.tags !== undefined) payload.tags = updates.tags;

  const { error } = await supabase
    .from('memories')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.warn('[memory] update error:', error.message);
    return null;
  }

  const cache = await readCache();
  const idx = cache.findIndex(m => m.id === id);
  if (idx >= 0) {
    cache[idx] = { ...cache[idx], ...updates, updatedAt };
    await writeCache(cache);
    return cache[idx];
  }
  return null;
}

/**
 * Soft delete — mirrors desktop behaviour. Sets deleted_at on the cloud row;
 * tombstone propagates to other devices.
 */
export async function deleteMemory(id: string): Promise<boolean> {
  if (!supabase) return false;
  const userId = await getUserId();
  if (!userId) return false;

  const deletedAt = new Date().toISOString();
  const { error } = await supabase
    .from('memories')
    .update({ deleted_at: deletedAt, updated_at: Date.now() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.warn('[memory] delete error:', error.message);
    return false;
  }

  const cache = await readCache();
  const idx = cache.findIndex(m => m.id === id);
  if (idx >= 0) {
    cache[idx] = { ...cache[idx], deletedAt };
    await writeCache(cache);
  }
  return true;
}

export async function restoreMemory(id: string): Promise<boolean> {
  if (!supabase) return false;
  const userId = await getUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('memories')
    .update({ deleted_at: null, updated_at: Date.now() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.warn('[memory] restore error:', error.message);
    return false;
  }

  const cache = await readCache();
  const idx = cache.findIndex(m => m.id === id);
  if (idx >= 0) {
    cache[idx] = { ...cache[idx], deletedAt: null };
    await writeCache(cache);
  }
  return true;
}

/**
 * Subscribe to realtime changes for the current user. Returns an unsubscribe
 * function. Reconnects automatically on transient channel errors.
 */
export function subscribeToMemories(onChange: () => void): () => void {
  if (!supabase) return () => {};
  let channel: any;
  let retryTimer: any = null;
  let active = true;

  const wireUp = async () => {
    const userId = await getUserId();
    if (!userId || !active) return;
    channel = supabase!
      .channel(`mobile-memories-${userId}-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'memories', filter: `user_id=eq.${userId}` },
        () => onChange())
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!active) return;
          if (retryTimer) return;
          retryTimer = setTimeout(() => {
            retryTimer = null;
            try { supabase!.removeChannel(channel); } catch {}
            wireUp();
          }, 5000);
        }
      });
  };

  wireUp();

  return () => {
    active = false;
    if (retryTimer) clearTimeout(retryTimer);
    if (channel) {
      try { supabase!.removeChannel(channel); } catch {}
    }
  };
}

export async function getSubscriptionTier(): Promise<'starter' | 'pro' | 'team'> {
  if (!supabase) return 'starter';
  const userId = await getUserId();
  if (!userId) return 'starter';
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();
  return (data?.subscription_tier as any) || 'starter';
}
