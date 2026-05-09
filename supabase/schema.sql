-- ============================================================================
-- FlowADE Database Schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. PROFILES (extends auth.users)
-- Auto-created on signup via trigger. Holds subscription tier + display info.
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  subscription_tier text NOT NULL DEFAULT 'starter'
    CHECK (subscription_tier IN ('starter', 'pro', 'team')),
  subscription_status text NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  subscription_expires_at timestamptz,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Auto-insert on signup"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 2. SUBSCRIPTIONS (detailed billing records)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter', 'pro', 'team')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  seats integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());


-- 3. DEVICES (link device IDs to user accounts)
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  platform text,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own devices"
  ON devices FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 4. MEMORIES (subscription-gated: pro + team only)
-- Soft delete via deleted_at: clients UPDATE this column instead of DELETE,
-- so tombstones propagate across devices and recovery is possible.
DROP TABLE IF EXISTS memories;

CREATE TABLE memories (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text DEFAULT '',
  type text DEFAULT 'note'
    CHECK (type IN ('fact', 'decision', 'context', 'reference', 'note')),
  tags jsonb DEFAULT '[]'::jsonb,
  created_at bigint,
  updated_at bigint,
  deleted_at timestamptz
);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Read: live + tombstoned rows owned by user (clients mirror tombstones locally)
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

-- Insert: only live rows
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

-- Update: owner only. Allows edits and soft-delete (setting deleted_at).
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

-- DELETE: not permitted under RLS. Soft delete only.


-- 5. WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text,
  layout text DEFAULT '2x1',
  terminal_count integer DEFAULT 1,
  default_shell text,
  default_cwd text,
  is_active boolean DEFAULT false,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workspaces"
  ON workspaces FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 6. ACTIVITY EVENTS
CREATE TABLE IF NOT EXISTS activity_events (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id text,
  workspace_name text,
  terminal_label text,
  event_type text,
  title text,
  snippet text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own events"
  ON activity_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 7. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  status text DEFAULT 'todo',
  workspace_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks"
  ON tasks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 8. USER PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark',
  palette text DEFAULT 'flowade',
  font_size integer DEFAULT 14,
  default_shell text,
  default_cwd text,
  notify_builds boolean DEFAULT true,
  notify_tests boolean DEFAULT true,
  notify_deploys boolean DEFAULT true,
  notify_crashes boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 9. FEATURE GATES (which features each tier unlocks)
CREATE TABLE IF NOT EXISTS feature_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  min_tier text NOT NULL DEFAULT 'starter'
    CHECK (min_tier IN ('starter', 'pro', 'team')),
  created_at timestamptz DEFAULT now()
);

-- No RLS — read-only reference table
ALTER TABLE feature_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature gates"
  ON feature_gates FOR SELECT
  USING (true);

-- Seed feature gates
INSERT INTO feature_gates (feature_key, display_name, description, min_tier) VALUES
  ('cloud_memories',    'Cloud Memory Sync',        'Sync memories across devices',           'pro'),
  ('unlimited_terminals','Unlimited Terminals',      'No limit on concurrent terminals',       'pro'),
  ('voice_input',       'Voice Input',               'Speech-to-text in terminals',            'pro'),
  ('prompt_templates',  'Custom Prompt Templates',   'Create and share prompt templates',      'pro'),
  ('analytics_30d',     'Full Analytics (30-day)',    'Extended usage analytics',               'pro'),
  ('custom_keybindings','Custom Keybindings',        'Customize keyboard shortcuts',           'pro'),
  ('workspaces_10',     'Up to 10 Workspaces',       'Save up to 10 workspace layouts',        'pro'),
  ('shared_workspaces', 'Shared Workspaces',         'Share workspaces with team members',     'team'),
  ('team_reporting',    'Team Usage Reporting',       'Aggregated team analytics',              'team'),
  ('shared_prompts',    'Shared Prompt Libraries',    'Team-wide prompt template library',      'team'),
  ('sso_saml',          'SSO / SAML',                'Enterprise single sign-on',              'team'),
  ('admin_controls',    'Admin Controls',            'Team administration panel',              'team')
ON CONFLICT (feature_key) DO NOTHING;


-- 10. UPDATED_AT TRIGGER (auto-update timestamp)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY['profiles', 'subscriptions', 'tasks', 'user_preferences'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; '
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;


-- 11. INDEXES
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_memories_user_live
  ON memories (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_user_deleted
  ON memories (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON profiles(stripe_customer_id);
