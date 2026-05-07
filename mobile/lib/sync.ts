import { supabase } from './supabase';

export interface Workspace {
  id: string;
  name: string;
  layout: string;
  terminal_count: number;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  workspace_name: string | null;
  terminal_label: string | null;
  event_type: string;
  title: string;
  snippet: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: string;
  palette: string;
  font_size: number;
  default_shell: string;
  notify_builds: boolean;
  notify_tests: boolean;
  notify_deploys: boolean;
  notify_crashes: boolean;
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('workspaces')
    .select('*').order('last_activity_at', { ascending: false });
  return (data || []) as Workspace[];
}

export async function fetchActivityEvents(limit = 100): Promise<ActivityEvent[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('activity_events')
    .select('*').order('created_at', { ascending: false }).limit(limit);
  return (data || []) as ActivityEvent[];
}

export async function fetchTasks(): Promise<Task[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('tasks')
    .select('*').order('created_at', { ascending: false });
  return (data || []) as Task[];
}

export async function fetchPreferences(): Promise<UserPreferences | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('user_preferences')
    .select('*').single();
  return data as UserPreferences | null;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('tasks').update(updates).match({ id: taskId, user_id: userId });
}

export async function createTask(title: string): Promise<Task | null> {
  if (!supabase) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data } = await supabase.from('tasks').insert({
    id, user_id: userId, title, status: 'todo',
  }).select().single();
  return data as Task | null;
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('tasks').delete().match({ id: taskId, user_id: userId });
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<void> {
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('user_preferences').upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });
}

export function subscribeToTable(
  table: string,
  callback: (type: string, record: any) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase.channel(`mobile-${table}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      callback(payload.eventType, payload.new);
    })
    .subscribe();
  return () => supabase!.removeChannel(channel);
}
