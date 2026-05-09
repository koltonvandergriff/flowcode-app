import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SUPABASE_URL = process.env.FLOWADE_SUPABASE_URL || 'https://kmythgbkodmhlwvbjwjj.supabase.co';
const SUPABASE_ANON_KEY = process.env.FLOWADE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXRoZ2Jrb2RtaGx3dmJqd2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTM4OTgsImV4cCI6MjA5Mzc4OTg5OH0.WBAi5iQFRZuaUNSYuY1ZFnqfd1HvQdRI2t1F8AiViik';

function getSessionPath() {
  const appData = process.platform === 'win32'
    ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'flowade')
    : process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support', 'flowade')
      : join(homedir(), '.config', 'flowade');
  return join(appData, 'flowade-data', 'supabase-session.json');
}

function loadStoredSession() {
  try {
    const sessionPath = getSessionPath();
    if (!existsSync(sessionPath)) return null;
    const store = JSON.parse(readFileSync(sessionPath, 'utf8'));
    const sessionKey = Object.keys(store).find(k => k.startsWith('sb-'));
    if (!sessionKey) return null;
    const session = JSON.parse(store[sessionKey]);
    return session || null;
  } catch {
    return null;
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { transport: WebSocket },
  auth: { persistSession: false },
});

export async function restoreSession() {
  const stored = loadStoredSession();
  if (!stored?.access_token || !stored?.refresh_token) return null;
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    });
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getAuthUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}
