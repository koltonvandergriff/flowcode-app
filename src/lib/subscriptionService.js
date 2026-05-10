/**
 * FlowADE Subscription Service
 * Reads subscription tier from Supabase profiles table.
 * Falls back to localStorage cache when offline or Supabase unavailable.
 */

import { supabase } from './supabase';

const STORAGE_KEY = 'flowade_subscription';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    interval: 'mo',
    perSeat: false,
    limits: { terminals: 3, workspaces: 1, tokensPerMonth: 500_000, costPerMonth: 5.00, retentionDays: 7 },
    features: [
      'Up to 3 terminals',
      '1 workspace',
      'Shell + Claude CLI providers',
      'Basic usage dashboard (7-day)',
      'Default keybindings',
      'Community Discord',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 18,
    interval: 'mo',
    perSeat: false,
    limits: { terminals: Infinity, workspaces: 10, tokensPerMonth: 25_000_000, costPerMonth: 75.00, retentionDays: 30 },
    features: [
      'Unlimited terminals',
      '10 workspaces',
      'All AI providers (Claude API, ChatGPT)',
      'Voice input',
      'Custom prompt templates',
      'Full analytics (30-day)',
      'Custom keybindings',
      'Priority email support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 36,
    interval: 'mo',
    perSeat: true,
    limits: { terminals: Infinity, workspaces: Infinity, tokensPerMonth: Infinity, costPerMonth: Infinity, retentionDays: 90 },
    features: [
      'Everything in Pro',
      'Unlimited shared workspaces',
      'Team usage reporting',
      'Shared prompt libraries',
      'SSO / SAML',
      'Admin controls',
      'Dedicated support channel',
    ],
  },
];

const MOCK_BILLING_HISTORY = [
  { id: 'inv_001', date: '2026-05-01', description: 'Pro Plan — May 2026', amount: 18.00, status: 'paid' },
  { id: 'inv_002', date: '2026-04-01', description: 'Pro Plan — Apr 2026', amount: 18.00, status: 'paid' },
  { id: 'inv_003', date: '2026-03-01', description: 'Pro Plan — Mar 2026', amount: 18.00, status: 'paid' },
  { id: 'inv_004', date: '2026-02-01', description: 'Starter Plan — Feb 2026', amount: 0.00, status: 'paid' },
  { id: 'inv_005', date: '2026-01-01', description: 'Starter Plan — Jan 2026', amount: 0.00, status: 'paid' },
];

function getDefaultSubscription() {
  return {
    planId: 'starter',
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    seats: 1,
    usage: { terminals: 1, workspaces: 1 },
  };
}

function loadSubscription() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt data, reset
  }
  const def = getDefaultSubscription();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
  return def;
}

function saveSubscription(sub) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sync subscription tier from Supabase profiles table into localStorage cache.
 */
export async function syncSubscriptionFromCloud() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single();
    if (error || !data) return null;
    const sub = loadSubscription();
    sub.planId = data.subscription_tier || 'starter';
    sub.status = data.subscription_status || 'active';
    if (data.subscription_expires_at) sub.currentPeriodEnd = data.subscription_expires_at;
    saveSubscription(sub);
    return sub;
  } catch {
    return null;
  }
}

/**
 * Check if user has access to a specific feature tier.
 */
export function hasFeatureAccess(requiredTier) {
  const tierOrder = { starter: 0, pro: 1, team: 2 };
  const sub = loadSubscription();
  return (tierOrder[sub.planId] || 0) >= (tierOrder[requiredTier] || 0);
}

/**
 * Returns the current plan object merged with subscription metadata.
 */
export function getCurrentPlan() {
  const sub = loadSubscription();
  const plan = PLANS.find((p) => p.id === sub.planId) || PLANS[0];
  return {
    ...plan,
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    seats: sub.seats,
    usage: sub.usage,
  };
}

/**
 * Returns all available plan tiers.
 */
export function getPlans() {
  return PLANS;
}

/**
 * Simulates upgrading to a new plan (800ms delay).
 */
export async function upgradePlan(planId) {
  await delay(800);
  const sub = loadSubscription();
  const target = PLANS.find((p) => p.id === planId);
  if (!target) throw new Error(`Unknown plan: ${planId}`);
  sub.planId = planId;
  sub.status = 'active';
  sub.cancelAtPeriodEnd = false;
  sub.currentPeriodStart = new Date().toISOString();
  sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  saveSubscription(sub);
  return getCurrentPlan();
}

/**
 * Simulates downgrading to a lower plan (800ms delay).
 */
export async function downgradePlan(planId) {
  await delay(800);
  const sub = loadSubscription();
  const target = PLANS.find((p) => p.id === planId);
  if (!target) throw new Error(`Unknown plan: ${planId}`);
  sub.planId = planId;
  sub.status = 'active';
  sub.cancelAtPeriodEnd = false;
  sub.currentPeriodStart = new Date().toISOString();
  sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  saveSubscription(sub);
  return getCurrentPlan();
}

/**
 * Simulates cancelling the subscription (sets cancelAtPeriodEnd).
 */
export async function cancelSubscription() {
  await delay(800);
  const sub = loadSubscription();
  sub.cancelAtPeriodEnd = true;
  saveSubscription(sub);
  return getCurrentPlan();
}

/**
 * Returns mock billing history entries.
 */
export function getBillingHistory() {
  return MOCK_BILLING_HISTORY;
}

/**
 * Returns a badge { label, color } for the current plan, suitable for header/footer display.
 */
export function getPlanBadge() {
  const sub = loadSubscription();
  const badges = {
    starter: { label: 'STARTER', color: '#6a6b85' },
    pro:     { label: 'PRO',     color: '#8b5cf6' },
    team:    { label: 'TEAM',    color: '#22c55e' },
  };
  return badges[sub.planId] || badges.starter;
}
