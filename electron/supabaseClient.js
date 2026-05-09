import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.FLOWADE_SUPABASE_URL || 'https://kmythgbkodmhlwvbjwjj.supabase.co';
const SUPABASE_ANON_KEY = process.env.FLOWADE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXRoZ2Jrb2RtaGx3dmJqd2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTM4OTgsImV4cCI6MjA5Mzc4OTg5OH0.WBAi5iQFRZuaUNSYuY1ZFnqfd1HvQdRI2t1F8AiViik';

function getSessionPath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'flowade-data', 'supabase-session.json');
}

function ensureSessionDir() {
  const dir = path.dirname(getSessionPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore() {
  try {
    const filePath = getSessionPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (_) {
    // corrupt or missing — return empty
  }
  return {};
}

function writeStore(data) {
  try {
    ensureSessionDir();
    fs.writeFileSync(getSessionPath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) {
    // swallow write errors
  }
}

const DEBUG = process.env.FLOWADE_DEBUG_AUTH === '1';

const fileStorage = {
  getItem(key) {
    const store = readStore();
    const value = store[key] ?? null;
    if (DEBUG) console.log(`[SupabaseStorage] getItem ${key} → ${value ? 'present' : 'null'}`);
    return Promise.resolve(value);
  },
  setItem(key, value) {
    const store = readStore();
    store[key] = value;
    writeStore(store);
    if (DEBUG) console.log(`[SupabaseStorage] setItem ${key} (${(value || '').length} chars)`);
    return Promise.resolve();
  },
  removeItem(key) {
    const store = readStore();
    delete store[key];
    writeStore(store);
    if (DEBUG) console.log(`[SupabaseStorage] removeItem ${key}`);
    return Promise.resolve();
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { transport: WebSocket },
  auth: {
    persistSession: true,
    storage: fileStorage,
  },
});

// Keep the realtime websocket's JWT in lockstep with auth state. Without this,
// restored sessions and token refreshes leave realtime authed with a stale (or
// no) token, so RLS-filtered postgres_changes channels CLOSE in a tight loop.
supabase.auth.onAuthStateChange((_event, session) => {
  try {
    supabase.realtime.setAuth(session?.access_token ?? null);
  } catch (_) {}
});

export async function setAuthSession(accessToken, refreshToken) {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  // Propagate the JWT to the realtime websocket so RLS-filtered
  // postgres_changes subscriptions don't immediately CLOSE on auth check.
  try { supabase.realtime.setAuth(accessToken); } catch (_) {}
  return data;
}

export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function clearAuthSession() {
  await supabase.auth.signOut();
}
