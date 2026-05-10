// OpenAI text-embedding-3-small wrapper. Used by memoryStore on memory
// create/update and by an explicit backfill IPC for the existing vault.
//
// Cost reference (2026-05): $0.02 per 1M input tokens — backfilling 1k memories
// with ~80 tokens of context each ≈ $0.0016. Negligible.

import { supabase } from './supabaseClient.js';
import { detectSecrets } from './secretScrub.js';

const OPENAI_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small'; // 1536 dims — matches migration 006
const EMBED_INPUT_MAX = 8000; // chars; keeps single rows well under model token limit

function shapeForEmbedding(memory) {
  // Embed a compact projection so titles + tags carry weight even when content
  // is long. Order matters — leading tokens get the most attention.
  const parts = [];
  if (memory.title) parts.push(`Title: ${memory.title}`);
  if (memory.type && memory.type !== 'note') parts.push(`Type: ${memory.type}`);
  if ((memory.tags || []).length) {
    parts.push(`Tags: ${(memory.tags || []).filter(Boolean).join(', ')}`);
  }
  if (memory.content) parts.push(`Content: ${memory.content}`);
  const joined = parts.join('\n');
  return joined.length > EMBED_INPUT_MAX ? joined.slice(0, EMBED_INPUT_MAX) : joined;
}

async function embedBatch(inputs, apiKey) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI embeddings ${response.status}: ${text || response.statusText}`);
  }
  const json = await response.json();
  return json.data.map(d => d.embedding); // array of float[]
}

export async function embedMemory(memory, apiKey) {
  if (!apiKey || !memory) return null;
  const input = shapeForEmbedding(memory);
  if (!input.trim()) return null;
  // Belt-and-suspenders: even though memoryStore.create now blocks
  // secret-bearing input, this path is also invoked from the backfill
  // IPC over legacy rows that pre-date the scrubber. Refuse to ship
  // detectable secrets to OpenAI under any circumstance.
  if (detectSecrets(input).hasSecrets) {
    console.warn('[memoryEmbeddings] skipping memory', memory.id, '— secret pattern matched');
    return null;
  }
  const [vector] = await embedBatch([input], apiKey);
  return vector || null;
}

/**
 * Push the embedding onto the cloud row. Local files don't store the vector
 * (it's bulky and we never read it client-side for now).
 */
export async function persistEmbedding(memoryId, embedding) {
  if (!memoryId || !embedding) return;
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;
  await supabase
    .from('memories')
    .update({ embedding })
    .eq('id', memoryId)
    .eq('user_id', userId);
}

/**
 * One-shot backfill for memories that don't yet have an embedding. Streams
 * progress via the optional callback so the UI can render a count.
 */
export async function backfillEmbeddings({ apiKey, onProgress, batchSize = 32 } = {}) {
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('memories')
    .select('id, title, content, type, tags')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('embedding', null);
  if (error) throw error;
  const todo = data || [];
  if (todo.length === 0) {
    onProgress?.({ phase: 'done', message: 'All memories already have embeddings.', total: 0 });
    return { updated: 0, total: 0 };
  }

  let done = 0;
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const inputs = batch.map(shapeForEmbedding);
    const vectors = await embedBatch(inputs, apiKey);
    // Update one row at a time; pgvector + .upsert([rows]) is fragile across
    // supabase-js versions, and the batch is small.
    for (let j = 0; j < batch.length; j++) {
      await supabase
        .from('memories')
        .update({ embedding: vectors[j] })
        .eq('id', batch[j].id)
        .eq('user_id', userId);
      done++;
    }
    onProgress?.({ phase: 'progress', message: `Embedding ${done}/${todo.length}…`, done, total: todo.length });
  }
  onProgress?.({ phase: 'done', message: `Embedded ${done} memories.`, done, total: todo.length });
  return { updated: done, total: todo.length };
}

/**
 * Embed a query string and run the match_memories RPC.
 */
export async function semanticSearch({ query, apiKey, limit = 20, threshold = 0.2 } = {}) {
  if (!query || !apiKey) throw new Error('Missing query or OPENAI_API_KEY');
  const [vector] = await embedBatch([query], apiKey);
  if (!vector) return [];
  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: vector,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error) throw error;
  return data || [];
}
