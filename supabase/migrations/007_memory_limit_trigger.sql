-- 007_memory_limit_trigger.sql
-- Server-side enforcement of per-tier memory limits.
--
-- Client code already checks the limit in memoryStore.create, but a user
-- editing the running JS or replacing the binary could bypass that. Putting
-- the check in a Postgres BEFORE INSERT trigger means even a fully
-- compromised client cannot exceed the subscription tier — the limit is
-- enforced inside the database next to the row it would create.
--
-- Tier-to-limit mapping mirrors the client (see src/lib/subscriptionService.js).
-- Keep them in sync; client side stays for UX, server side is the truth.

CREATE OR REPLACE FUNCTION enforce_memory_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_limit int;
  v_count int;
BEGIN
  -- Soft-deleted rows can still be inserted (used for tombstone propagation
  -- from the sync queue). Only count toward the limit when the row arrives
  -- in a non-deleted state.
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = NEW.user_id;
  v_tier := COALESCE(v_tier, 'starter');

  v_limit := CASE v_tier
    WHEN 'starter' THEN 50
    WHEN 'pro'     THEN 5000
    WHEN 'team'    THEN 50000
    ELSE 50
  END;

  SELECT COUNT(*) INTO v_count
  FROM memories
  WHERE user_id = NEW.user_id AND deleted_at IS NULL;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'memory_limit_reached: tier=% limit=% count=%', v_tier, v_limit, v_count
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS memory_limit_check ON memories;
CREATE TRIGGER memory_limit_check
  BEFORE INSERT ON memories
  FOR EACH ROW
  EXECUTE FUNCTION enforce_memory_limit();

COMMENT ON FUNCTION enforce_memory_limit IS
  'Rejects INSERTs on memories when the user has reached their tier limit. Cannot be bypassed by editing client code.';
