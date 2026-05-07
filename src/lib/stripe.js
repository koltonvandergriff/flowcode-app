/**
 * Stripe integration for FlowADE subscriptions.
 * Uses Stripe Checkout (redirect) — no Stripe.js SDK needed on the client.
 * Actual checkout sessions are created server-side (Supabase Edge Function).
 */

// Price IDs will be configured after Stripe product setup
const PRICE_IDS = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
  team_monthly: import.meta.env.VITE_STRIPE_PRICE_TEAM || '',
};

export async function createCheckoutSession(planId, userId) {
  // Calls Supabase Edge Function to create a Stripe Checkout session
  // Returns { url } to redirect user to
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    // Mock mode: simulate upgrade
    return { url: null, mock: true };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({ planId, priceId: PRICE_IDS[`${planId}_monthly`] }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Checkout failed: ${err}`);
  }

  return response.json();
}

export async function openBillingPortal(customerId) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return { url: null, mock: true };

  const response = await fetch(`${supabaseUrl}/functions/v1/billing-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({ customerId }),
  });

  if (!response.ok) throw new Error('Failed to open billing portal');
  return response.json();
}

async function getAuthToken() {
  const { getToken } = await import('./authService.js');
  return (await getToken()) || '';
}
