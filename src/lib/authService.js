/**
 * FlowCode Auth Service
 *
 * Abstraction layer for authentication. Uses Supabase when configured
 * (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY), otherwise falls back
 * to a mock implementation that always succeeds (for local dev).
 */

import { supabase } from './supabase';

const AUTH_TOKEN_KEY = 'flowcode_auth_token';
const AUTH_USER_KEY = 'flowcode_auth_user';

// ---------------------------------------------------------------------------
// Mock helpers (used when Supabase is not configured)
// ---------------------------------------------------------------------------

function mockUser(email, name) {
  return {
    id: crypto.randomUUID?.() || 'usr_' + Date.now(),
    email,
    name: name || email.split('@')[0],
    createdAt: new Date().toISOString(),
  };
}

function mockToken(userId) {
  return 'fc_' + btoa(JSON.stringify({ sub: userId, iat: Date.now() }));
}

function mockStore(user, token, rememberMe) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function mockClear() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with email/password.
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(email, password, rememberMe = true) {
  if (!supabase) {
    // Mock mode: simulate latency, always succeeds
    await new Promise((r) => setTimeout(r, 800));
    const user = mockUser(email);
    const token = mockToken(user.id);
    mockStore(user, token, rememberMe);
    return { user, token };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const user = {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name || data.user.email.split('@')[0],
    createdAt: data.user.created_at,
  };
  const token = data.session.access_token;

  return { user, token };
}

/**
 * Create a new account.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<{ user: object, token: string|null }>}
 */
export async function signup(email, password, name) {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 800));
    const user = mockUser(email, name);
    const token = mockToken(user.id);
    mockStore(user, token, true);
    return { user, token };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);

  const user = {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name || name || data.user.email.split('@')[0],
    createdAt: data.user.created_at,
  };
  const token = data.session?.access_token || null;

  return { user, token };
}

/**
 * Log the current user out and clear stored credentials.
 */
export async function logout() {
  if (!supabase) {
    mockClear();
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Check whether a user is currently authenticated.
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  if (!supabase) {
    return !!(localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY));
  }

  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/**
 * Get the current authenticated user, or null.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  if (!supabase) {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name || data.user.email.split('@')[0],
    createdAt: data.user.created_at,
  };
}

/**
 * Get the current auth token, or null.
 * @returns {Promise<string|null>}
 */
export async function getToken() {
  if (!supabase) {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Send a password reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  if (!supabase) {
    // Mock mode: simulate success
    await new Promise((r) => setTimeout(r, 600));
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

/**
 * Subscribe to auth state changes.
 * @param {function} callback - Receives (event, session)
 * @returns {{ unsubscribe: function }} - Call unsubscribe() to stop listening
 */
export function onAuthStateChange(callback) {
  if (!supabase) {
    // Mock mode: no-op subscription
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return { unsubscribe: () => data.subscription.unsubscribe() };
}
