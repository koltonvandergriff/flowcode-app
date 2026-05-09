-- ============================================================================
-- 004_memories_touch_trigger
-- Auto-bump memories.updated_at on every UPDATE so dashboard edits and any
-- non-app writes are picked up by client LWW + incremental pulls.
-- ============================================================================

CREATE OR REPLACE FUNCTION touch_memory_updated_at()
RETURNS trigger AS $$
BEGIN
  -- Only stamp if the caller didn't already provide a newer value, so
  -- client-side timestamps still win when the app is the one writing.
  IF NEW.updated_at IS NULL OR NEW.updated_at <= OLD.updated_at THEN
    NEW.updated_at := (extract(epoch from now()) * 1000)::bigint;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memories_touch_updated_at ON memories;
CREATE TRIGGER memories_touch_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION touch_memory_updated_at();
