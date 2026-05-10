// Edge Function: verify-tier
//
// Server-side feature-gate check. The client sends the caller's auth JWT
// in the Authorization header; this function reads profiles.subscription_tier
// for that user and returns the canonical tier + a yes/no for the requested
// feature. Use it as a gate BEFORE running any future server-side feature
// (e.g. provider-key relay, hosted memory categorization, team-features).
//
// Reasoning: client-side localStorage tier reads can be tampered with. The
// canonical truth lives in `profiles.subscription_tier` (written by the
// Stripe webhook). This function reads that table using the user's JWT so
// RLS guarantees the row read belongs to the caller.
//
// Endpoint: POST /functions/v1/verify-tier
// Body:     { feature?: 'memory.embed' | 'memory.categorize' | 'ai.chat' | ... }
// Response: { tier, allowed, limits, reason? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface VerifyRequest {
  feature?: string;
}

interface TierLimits {
  terminals: number;
  workspaces: number;
  memoryEntries: number;
  tokensPerMonth: number;
  retentionDays: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  starter: { terminals: 3,        workspaces: 1,        memoryEntries: 50,    tokensPerMonth: 500_000,    retentionDays: 7 },
  pro:     { terminals: Infinity, workspaces: 10,       memoryEntries: 5000,  tokensPerMonth: 25_000_000, retentionDays: 30 },
  team:    { terminals: Infinity, workspaces: Infinity, memoryEntries: 50000, tokensPerMonth: Infinity,   retentionDays: 90 },
};

const FEATURE_MIN_TIER: Record<string, string> = {
  'memory.embed':      'pro',
  'memory.categorize': 'pro',
  'ai.chat':           'starter',
  'workspace.share':   'team',
};

const TIER_RANK: Record<string, number> = { starter: 0, pro: 1, team: 2 };

function meetsTier(actual: string, required: string): boolean {
  return (TIER_RANK[actual] ?? 0) >= (TIER_RANK[required] ?? 0);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method-not-allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'missing-auth' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'server-misconfigured' }, 500);
  }

  // Use the user's JWT — RLS enforces that the SELECT below reads only
  // the caller's profile row.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: 'invalid-auth' }, 401);
  }

  let body: VerifyRequest = {};
  try { body = await req.json(); } catch { /* allow empty body */ }
  const feature = (body.feature || '').trim();

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    return jsonResponse({ error: 'profile-read-failed' }, 500);
  }

  const tier = profile?.subscription_tier || 'starter';
  const status = profile?.subscription_status || 'active';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.starter;
  const minRequired = feature ? FEATURE_MIN_TIER[feature] : 'starter';

  let allowed = true;
  let reason: string | undefined;

  if (status !== 'active' && status !== 'trialing') {
    allowed = false;
    reason = `subscription_status_${status}`;
  } else if (minRequired && !meetsTier(tier, minRequired)) {
    allowed = false;
    reason = `tier_required_${minRequired}`;
  }

  return jsonResponse({
    tier,
    status,
    allowed,
    feature: feature || null,
    minRequired: minRequired || null,
    limits,
    reason,
  });
});
