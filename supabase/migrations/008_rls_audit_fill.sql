-- 008_rls_audit_fill.sql
-- Comprehensive RLS posture for every user-owned table.
--
-- Run this migration after the prior 001-007 are applied. It is idempotent:
-- enables RLS where missing, then drops + re-creates each policy so the
-- effective set matches what's declared here. Audit by running:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY 1,3;
-- and compare against this file.

-- ---------------------------------------------------------------------------
-- Helper: every user-owned table is filtered by auth.uid() = user_id (or
-- = id for the profiles row). Service role bypasses RLS for migrations
-- and webhook writes (Stripe → subscription_tier updates).
-- ---------------------------------------------------------------------------

-- profiles (one row per user, id = auth.uid())
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own   ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own   ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own   ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own   ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- DELETE intentionally omitted: profile rows are tombstoned via the
-- Stripe-webhook / account-deletion path, not by the user directly.

-- subscriptions (optional table; some installs use profiles.subscription_*)
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE intentionally omitted: only the Stripe webhook
-- (running with service-role key) should write subscription rows.

-- devices (mobile push tokens)
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS devices_select_own  ON public.devices;
DROP POLICY IF EXISTS devices_insert_own  ON public.devices;
DROP POLICY IF EXISTS devices_update_own  ON public.devices;
DROP POLICY IF EXISTS devices_delete_own  ON public.devices;
CREATE POLICY devices_select_own ON public.devices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY devices_insert_own ON public.devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY devices_update_own ON public.devices
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY devices_delete_own ON public.devices
  FOR DELETE USING (auth.uid() = user_id);

-- memories (main vault)
ALTER TABLE IF EXISTS public.memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memories_select_own ON public.memories;
DROP POLICY IF EXISTS memories_insert_own ON public.memories;
DROP POLICY IF EXISTS memories_update_own ON public.memories;
DROP POLICY IF EXISTS memories_delete_own ON public.memories;
CREATE POLICY memories_select_own ON public.memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY memories_insert_own ON public.memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY memories_update_own ON public.memories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY memories_delete_own ON public.memories
  FOR DELETE USING (auth.uid() = user_id);

-- memory_categories
ALTER TABLE IF EXISTS public.memory_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memory_categories_select_own ON public.memory_categories;
DROP POLICY IF EXISTS memory_categories_insert_own ON public.memory_categories;
DROP POLICY IF EXISTS memory_categories_update_own ON public.memory_categories;
DROP POLICY IF EXISTS memory_categories_delete_own ON public.memory_categories;
CREATE POLICY memory_categories_select_own ON public.memory_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY memory_categories_insert_own ON public.memory_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY memory_categories_update_own ON public.memory_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY memory_categories_delete_own ON public.memory_categories
  FOR DELETE USING (auth.uid() = user_id);

-- workspaces
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspaces_select_own ON public.workspaces;
DROP POLICY IF EXISTS workspaces_insert_own ON public.workspaces;
DROP POLICY IF EXISTS workspaces_update_own ON public.workspaces;
DROP POLICY IF EXISTS workspaces_delete_own ON public.workspaces;
CREATE POLICY workspaces_select_own ON public.workspaces
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY workspaces_insert_own ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY workspaces_update_own ON public.workspaces
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY workspaces_delete_own ON public.workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- activity_events (telemetry / audit log)
ALTER TABLE IF EXISTS public.activity_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_events_select_own ON public.activity_events;
DROP POLICY IF EXISTS activity_events_insert_own ON public.activity_events;
CREATE POLICY activity_events_select_own ON public.activity_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY activity_events_insert_own ON public.activity_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE/DELETE on activity_events from app users — it's an
-- append-only audit log. Use service role for retention sweeps.

-- tasks
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
CREATE POLICY tasks_select_own ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tasks_insert_own ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_update_own ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_delete_own ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- user_preferences
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_preferences_select_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_insert_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_update_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_delete_own ON public.user_preferences;
CREATE POLICY user_preferences_select_own ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_preferences_insert_own ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_preferences_update_own ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_preferences_delete_own ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- feature_gates (server-side toggles; read-only for app users)
ALTER TABLE IF EXISTS public.feature_gates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_gates_select_authenticated ON public.feature_gates;
CREATE POLICY feature_gates_select_authenticated ON public.feature_gates
  FOR SELECT USING (auth.role() = 'authenticated');
-- INSERT/UPDATE/DELETE only via service role.

-- ---------------------------------------------------------------------------
-- Grants — the `authenticated` role needs base-level access before RLS
-- can even evaluate. Without these the policies are dead-letter.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles            TO authenticated;
GRANT SELECT                                  ON public.subscriptions       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_categories   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces          TO authenticated;
GRANT SELECT, INSERT                          ON public.activity_events     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences    TO authenticated;
GRANT SELECT                                  ON public.feature_gates       TO authenticated;
