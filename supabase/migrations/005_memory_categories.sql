-- ============================================================================
-- 005_memory_categories
-- Hierarchical categories for memories. Categories are user-owned, support a
-- self-referential parent_id so trees can nest, and use the same tombstone
-- soft-delete pattern as memories.
-- Memories gain a nullable category_id pointing at their leaf category.
-- Run in Supabase SQL Editor.
-- ============================================================================

-- 1. Categories table
CREATE TABLE IF NOT EXISTS memory_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES memory_categories(id) ON DELETE SET NULL,
  name          text NOT NULL,
  emoji         text,
  description   text,
  color         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_memory_categories_user_live
  ON memory_categories (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memory_categories_parent
  ON memory_categories (parent_id)
  WHERE deleted_at IS NULL;

-- 2. Touch trigger so dashboard edits propagate
CREATE OR REPLACE FUNCTION memory_categories_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memory_categories_touch ON memory_categories;
CREATE TRIGGER trg_memory_categories_touch
  BEFORE UPDATE ON memory_categories
  FOR EACH ROW EXECUTE FUNCTION memory_categories_touch_updated_at();

-- 3. RLS — own rows, pro/team tier (matches memories policy)
ALTER TABLE memory_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memory_categories_select_own" ON memory_categories;
CREATE POLICY "memory_categories_select_own"
  ON memory_categories FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.subscription_tier IN ('pro', 'team')
      AND profiles.subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "memory_categories_insert_own" ON memory_categories;
CREATE POLICY "memory_categories_insert_own"
  ON memory_categories FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.subscription_tier IN ('pro', 'team')
      AND profiles.subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "memory_categories_update_own" ON memory_categories;
CREATE POLICY "memory_categories_update_own"
  ON memory_categories FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.subscription_tier IN ('pro', 'team')
      AND profiles.subscription_status IN ('active', 'trialing')
    )
  )
  WITH CHECK (user_id = auth.uid());

-- (No DELETE policy — soft delete only.)

-- 4. Add category_id column on memories
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES memory_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memories_category
  ON memories (category_id)
  WHERE deleted_at IS NULL AND category_id IS NOT NULL;

-- 5. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE memory_categories;
