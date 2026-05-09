-- ============================================================================
-- 003_memory_purge_schedule
-- Tighten tombstone retention to 72h and schedule an hourly purge job.
-- Requires the pg_cron extension. Enable it once via:
--   Supabase Dashboard → Database → Extensions → pg_cron → Enable
-- ============================================================================

-- 1. Ensure pg_cron is available (no-op if already enabled).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Tighten the default retention window to 72 hours.
CREATE OR REPLACE FUNCTION purge_old_memory_tombstones(older_than interval DEFAULT interval '72 hours')
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

-- 3. Schedule hourly purge. Idempotent: drop any existing schedule of the
--    same name first so re-running this migration is safe.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-memory-tombstones')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-memory-tombstones');
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not yet present, or job didn't exist — ignore.
  NULL;
END;
$$;

SELECT cron.schedule(
  'purge-memory-tombstones',
  '0 * * * *',
  $$SELECT purge_old_memory_tombstones(interval '72 hours')$$
);
