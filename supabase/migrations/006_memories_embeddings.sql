-- ============================================================================
-- 006_memories_embeddings
-- Adds OpenAI text-embedding-3-small vectors (1536 dims) to memories +
-- a similarity-search RPC backed by an ivfflat cosine index.
-- Run in Supabase SQL Editor. Requires the pgvector extension; the first
-- statement enables it idempotently.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ivfflat is fine at this scale; lists=100 is the standard starter value for
-- O(thousands) of rows. Bump later if recall drops.
CREATE INDEX IF NOT EXISTS idx_memories_embedding_cos
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- match_memories — top-k semantic search scoped to the calling user.
-- Uses SECURITY INVOKER so RLS still applies (caller can only see their rows).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS match_memories(vector, double precision, integer);
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.0,
  match_count integer DEFAULT 20
)
RETURNS TABLE (
  id text,
  title text,
  content text,
  type text,
  tags jsonb,
  category_id uuid,
  created_at bigint,
  updated_at bigint,
  similarity double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id, m.title, m.content, m.type, m.tags, m.category_id,
    m.created_at, m.updated_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = auth.uid()
    AND m.deleted_at IS NULL
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) >= match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION match_memories(vector, double precision, integer) FROM public;
GRANT EXECUTE ON FUNCTION match_memories(vector, double precision, integer) TO authenticated;
