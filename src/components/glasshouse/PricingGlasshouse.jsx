// Glasshouse pricing page — inline, not a modal. Ports the 5-tier layout
// from flowADE-mockups/refined-current/index.html#pricing with the
// monthly/annual toggle and the grandfather-lock callout.
//
// Real subscription state (current tier, trial days remaining) should hook
// into subscriptionService once that exposes a useSubscription hook —
// numbers are placeholders for now.
import { useState } from 'react';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const TIERS = [
  {
    id: 'trial', name: 'Trial', sub: '7-day full access. Auto-rolls into Basic when it ends.',
    monthly: 0, annual: 0, special: 'trial', features: ['Every Pro feature unlocked', 'Cross-device sync + mobile', 'AI categorization + embeddings', 'Card on file required'],
  },
  {
    id: 'basic', name: 'Basic', sub: 'Where you land after the trial. Solo + cross-device, lighter limits.',
    monthly: 15, annual: 153,
    features: ['200 memories, fully synced', '3 workspaces', 'Mobile app + MCP server', 'Bring your own AI keys', 'Community support'],
  },
  {
    id: 'pro', name: 'Pro', sub: 'Heavy memory graph, AI categorization, semantic search.',
    monthly: 35, annual: 357, recommended: true,
    features: ['2,000 memories, fully synced', 'Unlimited workspaces', 'AI categorization + embeddings', 'Priority sync + realtime', 'Priority email support'],
  },
  {
    id: 'max', name: 'Max', sub: 'Power users + small teams. Highest limits, fastest sync.',
    monthly: 70, annual: 714,
    features: ['20,000 memories, fully synced', 'Unlimited workspaces + members', 'Shared categories + activity feed', 'SSO + audit log', 'Slack / Linear / GitHub bridges'],
  },
  {
    id: 'lifetime', name: 'Lifetime', sub: 'Pay once, keep forever. Founder pricing — promo ends soon, then $299.',
    oneTime: 99, strike: 299, special: 'lifetime',
    features: ['All Pro features, forever', 'One-time payment', 'Lifetime updates', 'Founder badge in profile'],
  },
];

export default function PricingGlasshouse({ currentTier = 'trial', trialDaysLeft = 6 }) {
  const [period, setPeriod] = useState('monthly');

  return (
    <div style={s.root}>
      <div style={s.head}>
        <h1 style={s.h1}>Pricing</h1>
        <p style={s.sub}>Bring your own AI keys. We charge for sync, not tokens. Trial is full Pro access — pick a tier when it ends.</p>
      </div>

      <div style={s.toggleBar}>
        <BillingToggle period={period} onChange={setPeriod} />
        <div style={s.lock}>
          <span style={{ color: '#4de6f0' }}>🔒</span>
          <span><strong style={{ color: '#f1f5f9' }}>Price-locked for life.</strong> If our rates change, you stay grandfathered at the price you signed up at.</span>
        </div>
      </div>

      <div style={s.grid}>
        {TIERS.map(t => (
          <TierCard key={t.id} tier={t} period={period} isCurrent={currentTier === t.id} trialDaysLeft={trialDaysLeft} />
        ))}
      </div>
    </div>
  );
}

function BillingToggle({ period, onChange }) {
  return (
    <div style={s.toggle}>
      <button onClick={() => onChange('monthly')} style={{ ...s.toggleBtn, ...(period === 'monthly' ? s.toggleBtnActive : null) }}>Monthly</button>
      <button onClick={() => onChange('annual')} style={{ ...s.toggleBtn, ...(period === 'annual' ? s.toggleBtnActive : null) }}>
        Annual <span style={{ ...s.savePill, ...(period === 'annual' ? s.savePillActive : null) }}>save 15%</span>
      </button>
    </div>
  );
}

function TierCard({ tier, period, isCurrent, trialDaysLeft }) {
  const lifetime = tier.special === 'lifetime';
  const trial = tier.special === 'trial';
  const rec = tier.recommended;

  const cardStyle = {
    ...s.card,
    ...(rec ? s.cardRecommended : null),
    ...(lifetime ? s.cardLifetime : null),
    ...(trial ? s.cardTrial : null),
    ...(isCurrent && !lifetime ? s.cardCurrent : null),
  };

  return (
    <div style={cardStyle}>
      {rec && <span style={s.badgeRec}>Recommended</span>}
      {lifetime && <span style={s.badgeLifetime}>Limited</span>}

      <h3 style={{ ...s.tierName, ...(lifetime ? s.tierNameLifetime : null) }}>
        {tier.name}
        {trial && isCurrent && <span style={s.trialDays}> — {trialDaysLeft} days left</span>}
      </h3>
      <p style={s.tierSub}>{tier.sub}</p>

      <div style={{ ...s.tierPrice, ...(lifetime ? s.tierPriceLifetime : null) }}>
        {lifetime ? (
          <>
            <span style={s.strike}>${tier.strike}</span>${tier.oneTime}<small style={s.per}>once</small>
          </>
        ) : trial ? (
          <>$0<small style={s.per}>/7 days</small></>
        ) : period === 'annual' ? (
          <>${(tier.annual / 12).toFixed(2)}<small style={s.per}>/mo</small></>
        ) : (
          <>${tier.monthly}<small style={s.per}>/mo</small></>
        )}
      </div>

      {!lifetime && !trial && period === 'annual' && (
        <div style={s.priceSub}>${tier.annual} billed annually · save ${tier.monthly * 12 - tier.annual}/yr</div>
      )}
      {!lifetime && !trial && period === 'monthly' && (
        <div style={s.priceSubMute}>billed monthly</div>
      )}
      {lifetime && <div style={s.priceSubLifetime}>⚡ price → $299 when promo ends</div>}

      <ul style={s.features}>
        {tier.features.map((f, i) => (
          <li key={i} style={{ ...s.feat, ...(lifetime ? s.featLifetime : null) }}>
            <span style={{ ...s.featCheck, ...(lifetime ? { color: '#ffe566' } : null) }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button style={{ ...s.cta, ...(rec ? s.ctaPrimary : null), ...(lifetime ? s.ctaLifetime : null) }}>
        {isCurrent ? 'Current plan' : lifetime ? 'Claim lifetime →' : trial ? 'Activate trial' : `Upgrade to ${tier.name}`}
      </button>
    </div>
  );
}

const s = {
  root: { flex: 1, padding: '32px 36px', overflowY: 'auto', minHeight: 0 },
  head: { marginBottom: 24, maxWidth: 720 },
  h1: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 32, letterSpacing: '-0.03em', margin: '0 0 6px',
  },
  sub: {
    fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.55,
    fontFamily: FONT_MONO,
  },
  toggleBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 14, marginBottom: 22,
  },
  toggle: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: 4,
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 99, backdropFilter: 'blur(10px)',
  },
  toggleBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '8px 18px', borderRadius: 99,
    fontFamily: FONT_MONO,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    color: '#94a3b8',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all 0.18s',
  },
  toggleBtnActive: {
    background: '#4de6f0', color: '#001014',
    boxShadow: '0 0 18px rgba(77,230,240,0.35)',
  },
  savePill: {
    fontFamily: FONT_TECH, fontWeight: 600,
    fontSize: 9, letterSpacing: '0.18em',
    padding: '2px 7px', borderRadius: 99,
    background: 'rgba(77,230,240,0.15)', color: '#4de6f0',
  },
  savePillActive: { background: 'rgba(0,0,0,0.2)', color: '#001014' },
  lock: {
    fontFamily: FONT_MONO, fontSize: 11, color: '#94a3b8',
    display: 'inline-flex', alignItems: 'center', gap: 8,
  },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14, alignItems: 'stretch',
  },
  card: {
    position: 'relative', padding: 24,
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 14, backdropFilter: 'blur(12px)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardCurrent: {
    borderColor: 'rgba(77,230,240,0.4)',
    background: 'radial-gradient(400px 200px at 50% -20%, rgba(77,230,240,0.08), transparent 60%), rgba(10, 14, 24, 0.55)',
  },
  cardRecommended: {
    borderColor: 'rgba(77,230,240,0.5)',
    background: 'radial-gradient(400px 200px at 50% -20%, rgba(77,230,240,0.12), transparent 60%), rgba(10, 14, 24, 0.55)',
    boxShadow: '0 0 32px rgba(77,230,240,0.18)',
  },
  cardTrial: {
    borderColor: 'rgba(77,230,240,0.4)',
  },
  cardLifetime: {
    border: '2px solid rgba(255,229,102,0.5)',
    background: 'radial-gradient(500px 240px at 50% 0%, rgba(255,229,102,0.14), transparent 60%), linear-gradient(160deg, rgba(35,28,8,0.85), rgba(14,11,2,0.85))',
    boxShadow: '0 14px 44px rgba(255,229,102,0.18), inset 0 0 0 1px rgba(255,229,102,0.2)',
  },

  badgeRec: {
    position: 'absolute', top: -10, left: 24,
    fontFamily: FONT_TECH, fontWeight: 600,
    fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
    padding: '4px 10px', borderRadius: 5,
    background: '#4de6f0', color: '#001014',
  },
  badgeLifetime: {
    position: 'absolute', top: -10, left: 24,
    fontFamily: FONT_TECH, fontWeight: 600,
    fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
    padding: '5px 12px', borderRadius: 5,
    background: 'linear-gradient(90deg, #fff5a0, #ffe566, #ffba2e)',
    color: '#1a1400',
    boxShadow: '0 0 18px rgba(255,229,102,0.6)',
  },

  tierName: {
    fontFamily: FONT_DISP, fontWeight: 800, fontSize: 22,
    letterSpacing: '-0.02em', margin: '0 0 4px',
  },
  tierNameLifetime: { color: '#ffe566', letterSpacing: '0.04em' },
  trialDays: {
    fontSize: 12, color: '#4de6f0',
    fontWeight: 400, letterSpacing: 0,
    fontFamily: FONT_MONO,
  },
  tierSub: {
    fontSize: 12, color: '#94a3b8', margin: '0 0 16px',
    minHeight: 30, lineHeight: 1.45, fontFamily: FONT_MONO,
  },
  tierPrice: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 38, letterSpacing: '-0.04em', lineHeight: 1, color: '#f1f5f9',
  },
  tierPriceLifetime: { color: '#ffe566', textShadow: '0 0 22px rgba(255,229,102,0.4)' },
  strike: {
    fontSize: 18, color: 'rgba(255,229,102,0.5)', fontWeight: 400,
    textDecoration: 'line-through', marginRight: 8, letterSpacing: 0,
  },
  per: {
    fontSize: 13, color: '#94a3b8', fontWeight: 400, letterSpacing: 0,
    fontFamily: FONT_MONO, marginLeft: 4,
  },
  priceSub: {
    fontFamily: FONT_MONO, fontSize: 11, color: '#4de6f0',
    marginTop: 6, letterSpacing: '0.04em',
  },
  priceSubMute: {
    fontFamily: FONT_MONO, fontSize: 11, color: '#94a3b8',
    marginTop: 6, letterSpacing: '0.04em',
  },
  priceSubLifetime: {
    fontFamily: FONT_MONO, fontSize: 11, color: '#ffe566',
    marginTop: 6, letterSpacing: '0.04em',
  },

  features: { listStyle: 'none', padding: 0, margin: '20px 0' },
  feat: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '5px 0',
    fontSize: 12, color: '#f1f5f9',
    fontFamily: FONT_MONO,
  },
  featLifetime: { color: '#fff' },
  featCheck: { color: '#4de6f0', fontSize: 11, marginTop: 2 },

  cta: {
    all: 'unset', cursor: 'pointer',
    padding: '11px 16px', borderRadius: 9,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    fontFamily: FONT_MONO,
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    textAlign: 'center',
    marginTop: 'auto',
  },
  ctaPrimary: {
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    border: 'none', color: '#001014',
    boxShadow: '0 8px 24px rgba(77,230,240,0.25)',
  },
  ctaLifetime: {
    background: 'linear-gradient(135deg, #ffe566, #ffba2e)',
    border: 'none', color: '#1a1400',
    boxShadow: '0 8px 24px rgba(255,229,102,0.3)',
  },
};
