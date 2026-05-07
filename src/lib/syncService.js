import { supabase } from './supabase';

let currentUserId = null;
const debounceTimers = {};

function debounce(key, fn, ms = 500) {
  clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, ms);
}

async function getUserId() {
  if (currentUserId) return currentUserId;
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  currentUserId = data?.user?.id || null;
  return currentUserId;
}

export function clearSyncUser() {
  currentUserId = null;
}

// --- Workspaces ---

export async function syncWorkspace(workspace) {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  const { error } = await supabase.from('workspaces').upsert({
    id: workspace.id,
    user_id: userId,
    name: workspace.name,
    layout: workspace.layout || '2x1',
    terminal_count: workspace.terminals?.length || 1,
    default_shell: workspace.defaultShell || null,
    default_cwd: workspace.defaultCwd || null,
    is_active: workspace.isActive || false,
    last_activity_at: new Date().toISOString(),
  }, { onConflict: 'id,user_id' });

  if (error) console.warn('[sync] workspace upsert failed:', error.message);
}

export function syncWorkspaceDebounced(workspace) {
  debounce(`ws-${workspace.id}`, () => syncWorkspace(workspace));
}

export async function deleteWorkspaceSync(workspaceId) {
  const userId = await getUserId();
  if (!userId || !supabase) return;
  await supabase.from('workspaces').delete().match({ id: workspaceId, user_id: userId });
}

export async function setActiveWorkspaceSync(workspaceId) {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  await supabase.from('workspaces').update({ is_active: false }).eq('user_id', userId);
  if (workspaceId) {
    await supabase.from('workspaces').update({ is_active: true }).match({ id: workspaceId, user_id: userId });
  }
}

// --- Activity Events ---

export async function syncActivityEvent(event) {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  const { error } = await supabase.from('activity_events').insert({
    id: event.id,
    user_id: userId,
    workspace_id: event.workspaceId || null,
    workspace_name: event.workspace || null,
    terminal_label: event.terminal || null,
    event_type: event.type,
    title: event.title,
    snippet: event.snippet || null,
  });

  if (error && !error.message.includes('duplicate')) {
    console.warn('[sync] event insert failed:', error.message);
  }
}

// --- Tasks ---

export async function syncTask(task) {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    user_id: userId,
    title: task.title,
    status: task.status || 'todo',
    workspace_id: task.workspaceId || null,
  }, { onConflict: 'id,user_id' });

  if (error) console.warn('[sync] task upsert failed:', error.message);
}

export function syncTaskDebounced(task) {
  debounce(`task-${task.id}`, () => syncTask(task));
}

export async function deleteTaskSync(taskId) {
  const userId = await getUserId();
  if (!userId || !supabase) return;
  await supabase.from('tasks').delete().match({ id: taskId, user_id: userId });
}

export async function syncAllTasks(tasks) {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  const rows = tasks.map((t) => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    status: t.status || 'todo',
    workspace_id: t.workspaceId || null,
  }));

  const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'id,user_id' });
  if (error) console.warn('[sync] bulk task sync failed:', error.message);
}

// --- User Preferences ---

export async function syncPreferences(prefs) {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    theme: prefs.theme || 'dark',
    palette: prefs.palette || 'flowcode',
    font_size: prefs.fontSize || 14,
    default_shell: prefs.defaultShell || null,
    default_cwd: prefs.defaultCwd || null,
    notify_builds: prefs.notifyBuilds !== false,
    notify_tests: prefs.notifyTests !== false,
    notify_deploys: prefs.notifyDeploys !== false,
    notify_crashes: prefs.notifyCrashes !== false,
  }, { onConflict: 'user_id' });

  if (error) console.warn('[sync] preferences upsert failed:', error.message);
}

export function syncPreferencesDebounced(prefs) {
  debounce('prefs', () => syncPreferences(prefs));
}

// --- Fetch (for initial load / mobile) ---

export async function fetchWorkspaces() {
  const userId = await getUserId();
  if (!userId || !supabase) return [];
  const { data } = await supabase.from('workspaces')
    .select('*').eq('user_id', userId).order('last_activity_at', { ascending: false });
  return data || [];
}

export async function fetchActivityEvents(limit = 100) {
  const userId = await getUserId();
  if (!userId || !supabase) return [];
  const { data } = await supabase.from('activity_events')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function fetchTasks() {
  const userId = await getUserId();
  if (!userId || !supabase) return [];
  const { data } = await supabase.from('tasks')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function fetchPreferences() {
  const userId = await getUserId();
  if (!userId || !supabase) return null;
  const { data } = await supabase.from('user_preferences')
    .select('*').eq('user_id', userId).single();
  return data || null;
}

// --- Realtime Subscriptions ---

export function subscribeToChanges(table, callback) {
  if (!supabase) return () => {};

  const channel = supabase.channel(`sync-${table}-${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter: `user_id=eq.${currentUserId}`,
    }, (payload) => {
      callback(payload.eventType, payload.new, payload.old);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}
