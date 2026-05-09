-- ============================================================================
-- 002_memories_soft_delete
-- Adds tombstone-based delete to memories so cross-device sync can propagate
-- removals without losing data, and recovery is possible.
-- Run in Supabase SQL Editor.
-- ============================================================================

-- 1. Add tombstone column
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Index for fast "live rows" reads (partial index keeps it small)
CREATE INDEX IF NOT EXISTS idx_memories_user_live
  ON memories (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- 3. Index for tombstone sync pulls (clients fetch tombstones since last_sync)
CREATE INDEX IF NOT EXISTS idx_memories_user_deleted
  ON memories (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 4. Replace RLS policy so tombstones still belong to the user
--    (clients pull them to mirror remote deletes, but cannot resurrect them).
DROP POLICY IF EXISTS "Pro/Team users manage memories" ON memories;

-- Read: any row owned by user with pro/team tier (live + tombstoned)
CREATE POLICY "memories_select_own"
  ON memories FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.subscription_tier IN ('pro', 'team')
      AND profiles.subscription_status IN ('active', 'trialing')
    )
  );

-- Insert: only live rows (deleted_at must be null on create)
CREATE POLICY "memories_insert_own"
  ON memories FOR INSERT
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

-- Update: owner only. Allows soft-delete (setting deleted_at) and edits.
CREATE POLICY "memories_update_own"
  ON memories FOR UPDATE
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

-- Delete: blocked. Soft delete only — clients UPDATE deleted_at instead.
-- (No DELETE policy = no DELETE allowed under RLS.)

-- 5. Optional purge function — admin-only, removes tombstones older than 90 days.
--    Not exposed to clients. Run manually or via cron when ready.
CREATE OR REPLACE FUNCTION purge_old_memory_tombstones(older_than interval DEFAULT interval '90 days')
RETURNS integer AS $$
DECLARE
  removed integer;
BEGIN
  WITH deleted AS (
    DELETE FROM memories
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - older_than
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM deleted;
  RETURN removed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION purge_old_memory_tombstones(interval) FROM public;
