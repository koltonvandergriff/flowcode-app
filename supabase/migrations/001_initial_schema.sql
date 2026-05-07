-- FlowADE Cloud Sync Schema
-- Run this in your Supabase SQL Editor after creating the project

-- Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Workspaces
create table if not exists public.workspaces (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  layout text default '2x1',
  terminal_count int default 1,
  default_shell text,
  default_cwd text,
  is_active boolean default false,
  last_activity_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

alter table public.workspaces enable row level security;
create policy "Users can CRUD own workspaces" on public.workspaces for all using (auth.uid() = user_id);
create index idx_workspaces_user on public.workspaces(user_id);
create index idx_workspaces_active on public.workspaces(user_id, is_active);

-- Activity Events (terminal build/test/deploy/crash events)
create table if not exists public.activity_events (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id text,
  workspace_name text,
  terminal_label text,
  event_type text not null,
  title text not null,
  snippet text,
  created_at timestamptz default now()
);

alter table public.activity_events enable row level security;
create policy "Users can CRUD own events" on public.activity_events for all using (auth.uid() = user_id);
create index idx_events_user_time on public.activity_events(user_id, created_at desc);
create index idx_events_type on public.activity_events(user_id, event_type);

-- Tasks
create table if not exists public.tasks (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text default 'todo',
  workspace_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

alter table public.tasks enable row level security;
create policy "Users can CRUD own tasks" on public.tasks for all using (auth.uid() = user_id);
create index idx_tasks_user_status on public.tasks(user_id, status);

-- User Preferences (synced settings)
create table if not exists public.user_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  theme text default 'dark',
  palette text default 'flowade',
  font_size int default 14,
  default_shell text default 'powershell.exe',
  default_cwd text,
  notify_builds boolean default true,
  notify_tests boolean default true,
  notify_deploys boolean default true,
  notify_crashes boolean default true,
  updated_at timestamptz default now()
);

alter table public.user_preferences enable row level security;
create policy "Users can CRUD own preferences" on public.user_preferences for all using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.workspaces for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.tasks for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.user_preferences for each row execute function public.update_updated_at();

-- Enable Realtime for live sync
alter publication supabase_realtime add table public.workspaces;
alter publication supabase_realtime add table public.activity_events;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.user_preferences;

-- Cleanup old events (keep 30 days)
create or replace function public.cleanup_old_events()
returns void as $$
begin
  delete from public.activity_events
  where created_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;
