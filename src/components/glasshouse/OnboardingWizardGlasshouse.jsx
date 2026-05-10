import { useState, useCallback, useMemo, useEffect } from 'react';
import { signup } from '../../lib/authService';
import logoFa from '../../assets/branding/logo-fa.png';

// Glasshouse onboarding wizard. 5 steps: Account → Payment → AI keys →
// Layout → Ready. State persists in localStorage so a reload picks up where
// the user left off.
//
// Phase 1 scope:
//  - Account step: real signup via authService.signup
//  - Payment step: visual card capture only (NO real Stripe charge yet —
//    real Stripe wiring lands in a follow-up PR)
//  - Keys step: writes through window.flowade.env.set (keychain)
//  - Layout step: writes selected layout into localStorage
//  - Ready step: onComplete() → setOnboarded + setPlanSelected upstream

const STEPS = [
  { id: 'signup',  label: 'Account' },
  { id: 'payment', label: 'Payment' },
  { id: 'keys',    label: 'AI keys' },
  { id: 'layout',  label: 'Layout' },
  { id: 'ready',   label: 'Ready' },
];

const STORAGE_KEY = 'flowade.onb.glasshouse';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export default function OnboardingWizardGlasshouse({ onAuthenticated, onComplete, onBackToLogin, startStep = 'signup' }) {
  const [step, setStep] = useState(startStep);
  const [data, setData] = useState(() => loadState());

  useEffect(() => { saveState(data); }, [data]);

  const idx = STEPS.findIndex(s => s.id === step);
  const goNext = useCallback(() => {
    const nextIdx = Math.min(STEPS.length - 1, idx + 1);
    setStep(STEPS[nextIdx].id);
  }, [idx]);
  const goPrev = useCallback(() => {
    if (idx === 0) { onBackToLogin?.(); return; }
    setStep(STEPS[idx - 1].id);
  }, [idx, onBackToLogin]);

  const handleAccountDone = useCallback(({ email, password, name }) => {
    setData(d => ({ ...d, email, name }));
    onAuthenticated?.({ email, password, name });
    goNext();
  }, [onAuthenticated, goNext]);

  const handleComplete = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    onComplete?.();
  }, [onComplete]);

  return (
    <div style={shell.root}>
      <div style={shell.top}>
        <div style={shell.topLeft}>
          <img src={logoFa} alt="FA" style={shell.logoFa} />
          <span style={shell.brand}>FlowADE</span>
        </div>
      </div>

      <Progress idx={idx} />

      <div style={shell.content}>
        {step === 'signup'  && <StepAccount data={data} onSubmit={handleAccountDone} onBackToLogin={onBackToLogin} />}
        {step === 'payment' && <StepPayment data={data} setData={setData} onNext={goNext} onBack={goPrev} />}
        {step === 'keys'    && <StepKeys data={data} setData={setData} onNext={goNext} onBack={goPrev} />}
        {step === 'layout'  && <StepLayout data={data} setData={setData} onNext={goNext} onBack={goPrev} />}
        {step === 'ready'   && <StepReady data={data} onEnter={handleComplete} onBack={goPrev} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress strip
// ---------------------------------------------------------------------------
function Progress({ idx }) {
  return (
    <div style={shell.progress}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={shell.step}>
          <div style={{
            ...shell.bar,
            ...(i < idx ? shell.barDone : null),
            ...(i === idx ? shell.barCurr : null),
          }} />
          <div style={{
            ...shell.lbl,
            ...(i < idx ? shell.lblDone : null),
            ...(i === idx ? shell.lblCurr : null),
          }}>
            <span style={shell.num}>{String(i + 1).padStart(2, '0')}</span>{s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 01 — Account
// ---------------------------------------------------------------------------
// Version hash of the legal-document bundle in this build. Bump when
// any of TOS / Privacy / AUP changes meaningfully. Stored alongside the
// acceptance timestamp so we can detect when an existing user needs to
// re-consent to a material update.
const LEGAL_VERSION = '2026-05-10';

function StepAccount({ data, onSubmit, onBackToLogin }) {
  const [email, setEmail] = useState(data.email || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(data.name || '');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(async (e) => {
    e.preventDefault();
    if (!legalAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const result = await signup(email, password, name);
      if (result?.confirmationPending) {
        setError('Check your email to confirm your account. (Then re-open setup.)');
        setLoading(false);
        return;
      }
      // Record consent locally — also fire-and-forget a profile update so
      // the server has an auditable acceptance row. Server-side write is
      // best-effort; the local timestamp is the user-facing record.
      const acceptedAt = new Date().toISOString();
      try {
        localStorage.setItem('flowade.legal.acceptedAt', acceptedAt);
        localStorage.setItem('flowade.legal.acceptedVersion', LEGAL_VERSION);
      } catch {}
      window.flowade?.auth?.recordLegalConsent?.({ acceptedAt, version: LEGAL_VERSION })?.catch?.(() => {});
      onSubmit({ email, password, name });
    } catch (err) {
      setError(err?.message || 'Sign-up failed.');
    } finally {
      setLoading(false);
    }
  }, [email, password, name, legalAccepted, onSubmit]);

  return (
    <div style={card.normal}>
      <span style={card.stamp}>step 01 · account</span>
      <h1 style={card.h1}>Create your <em style={card.em}>workspace.</em></h1>
      <p style={card.lead}>
        <strong style={{ color: 'var(--gh-cy, #4de6f0)' }}>7 days free, then $15/mo Basic.</strong> Card on file required so the rollover is friction-free. Cancel any time during the trial and you won't be charged.
      </p>

      <form onSubmit={submit} style={{ ...card.form, maxWidth: 460 }}>
        <button type="button" style={{ ...btn.provider, gridColumn: '1 / -1' }}>
          <span style={btn.providerIc}>⌬</span> Continue with GitHub
        </button>
        <div style={card.divider}>— or sign up with email —</div>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kolton Vandergriff" autoComplete="name" autoFocus style={card.input} />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dutchmade.co" autoComplete="email" style={card.input} />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 12 characters" autoComplete="new-password" style={card.input} />
        </Field>

        <div style={card.providers}>
          <button type="button" style={btn.provider}><span style={btn.providerIc}>G</span> Google</button>
          <button type="button" style={btn.provider}><span style={btn.providerIc}>⏍</span> Magic link</button>
        </div>

        <label style={card.consentRow}>
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            style={card.consentBox}
          />
          <span style={card.consentText}>
            I have read and agree to the{' '}
            <a
              href="https://github.com/koltonvandergriff/flowade-app/blob/main/legal/TERMS_OF_SERVICE.md"
              onClick={(e) => { e.preventDefault(); window.flowade?.shell?.openExternal?.('https://github.com/koltonvandergriff/flowade-app/blob/main/legal/TERMS_OF_SERVICE.md'); }}
              style={card.consentLink}
            >Terms of Service</a>
            {', '}
            <a
              href="https://github.com/koltonvandergriff/flowade-app/blob/main/legal/PRIVACY_POLICY.md"
              onClick={(e) => { e.preventDefault(); window.flowade?.shell?.openExternal?.('https://github.com/koltonvandergriff/flowade-app/blob/main/legal/PRIVACY_POLICY.md'); }}
              style={card.consentLink}
            >Privacy Policy</a>
            {', and '}
            <a
              href="https://github.com/koltonvandergriff/flowade-app/blob/main/legal/AI_OUTPUT_DISCLAIMER.md"
              onClick={(e) => { e.preventDefault(); window.flowade?.shell?.openExternal?.('https://github.com/koltonvandergriff/flowade-app/blob/main/legal/AI_OUTPUT_DISCLAIMER.md'); }}
              style={card.consentLink}
            >AI Output Disclaimer</a>
            . I understand that AI-generated output may be incorrect and that I'm responsible for reviewing it before relying on it.
          </span>
        </label>

        {error && <div style={card.errorBanner}>{error}</div>}
      </form>

      <div style={card.bottom}>
        <button type="button" onClick={onBackToLogin} style={btn.signInLink}>
          Already have an account? Sign in →
        </button>
        <button onClick={submit} disabled={loading} style={{ ...btn.primary, ...(loading ? btn.loading : null) }}>
          {loading ? 'Creating account…' : 'Continue to payment →'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 02 — Payment (visual only, real Stripe in follow-up)
// ---------------------------------------------------------------------------
const PLAN_OPTIONS = [
  { id: 'trial',    name: 'Free trial', priceMonthly: 0,  priceAnnual: 0,    blurb: 'Full Pro access for 7 days. Auto-rolls into Basic on day 8.' },
  { id: 'basic',    name: 'Basic',      priceMonthly: 15, priceAnnual: 153,  blurb: 'Solo + cross-device. Where the trial lands by default.' },
  { id: 'pro',      name: 'Pro',        priceMonthly: 35, priceAnnual: 357,  blurb: 'Heavy memory graph, priority sync, AI categorization.', recommended: true },
  { id: 'max',      name: 'Max',        priceMonthly: 70, priceAnnual: 714,  blurb: 'Power users + small teams. Highest limits, fastest sync.' },
  { id: 'lifetime', name: 'Lifetime',   oneTime: 99,                          blurb: 'Pay once, keep forever. Founder pricing — promo ends soon, then jumps to $299.', limited: true },
];

function StepPayment({ data, setData, onNext, onBack }) {
  const [plan, setPlan] = useState(data.plan || 'trial');
  const [period, setPeriod] = useState(data.period || 'monthly');

  const select = (p) => { setPlan(p); setData(d => ({ ...d, plan: p })); };
  const togglePeriod = (p) => { setPeriod(p); setData(d => ({ ...d, period: p })); };

  return (
    <div style={card.wide}>
      <span style={card.stamp}>step 02 · payment</span>
      <h1 style={card.h1}>Pick your <em style={card.em}>plan.</em></h1>
      <p style={card.lead}>
        <strong style={{ color: 'var(--gh-cy, #4de6f0)' }}>$0 today on the 7-day trial.</strong> Card held by Stripe — we never see or store the number. Plan price locks in at today's rate; if our rates rise later, you stay grandfathered.
      </p>

      <div style={pay.toggleBar}>
        <BillingToggle period={period} onChange={togglePeriod} />
        <div style={pay.lock}>
          <span style={{ color: 'var(--gh-cy, #4de6f0)' }}>🔒</span>
          <span><strong>Locked at signup rate.</strong> Future price increases don't apply.</span>
        </div>
      </div>

      <div style={pay.grid}>
        {PLAN_OPTIONS.map(p => (
          <PlanCard key={p.id} plan={p} period={period} selected={plan === p.id} onSelect={() => select(p.id)} />
        ))}
      </div>

      <CardForm />

      <div style={pay.trustRow}>
        <span style={pay.trust}>🔒 PCI-compliant via Stripe</span>
        <span style={pay.trust}>✱ Card never touches our servers</span>
        <span style={pay.trust}>↻ Cancel any time, $0 charge until day 8</span>
      </div>

      <div style={card.bottom}>
        <button onClick={onBack} style={btn.ghost}>← Back</button>
        <button onClick={onNext} style={btn.primary}>Start 7-day trial →</button>
      </div>
    </div>
  );
}

function BillingToggle({ period, onChange }) {
  return (
    <div style={pay.toggle}>
      <button onClick={() => onChange('monthly')} style={{ ...pay.toggleBtn, ...(period === 'monthly' ? pay.toggleBtnActive : null) }}>
        Monthly
      </button>
      <button onClick={() => onChange('annual')} style={{ ...pay.toggleBtn, ...(period === 'annual' ? pay.toggleBtnActive : null) }}>
        Annual <span style={{ ...pay.savePill, ...(period === 'annual' ? pay.savePillActive : null) }}>save 15%</span>
      </button>
    </div>
  );
}

function PlanCard({ plan, period, selected, onSelect }) {
  const isLifetime = plan.id === 'lifetime';
  const cardBg = isLifetime ? pay.cardLifetime : null;
  const selBg = isLifetime
    ? (selected ? pay.cardLifetimeSelected : null)
    : (selected ? pay.cardSelected : null);

  return (
    <div onClick={onSelect} style={{ ...pay.card, ...cardBg, ...selBg }}>
      {plan.recommended && <span style={pay.ribbonCy}>Recommended</span>}
      {plan.limited && <span style={pay.ribbonYl}>Limited</span>}
      <span style={{ ...pay.check, ...(selected ? (isLifetime ? pay.checkOnYl : pay.checkOn) : null) }}>{selected && '✓'}</span>
      <div style={{ ...pay.name, ...(isLifetime ? { color: 'var(--gh-yl, #ffe566)', letterSpacing: '0.32em', fontWeight: 700 } : selected ? { color: 'var(--gh-cy, #4de6f0)' } : null) }}>{plan.name}</div>
      <PlanPrice plan={plan} period={period} selected={selected} />
      <div style={pay.sub}>
        {plan.id === 'trial'    ? plan.blurb :
         plan.id === 'lifetime' ? plan.blurb :
         period === 'annual'    ? `$${plan.priceAnnual}/yr · save $${plan.priceMonthly * 12 - plan.priceAnnual} · ${plan.blurb}` :
                                  `billed monthly · ${plan.blurb}`}
      </div>
      {isLifetime && <div style={pay.urgency}>⚡ promo ends soon · price → $299</div>}
    </div>
  );
}

function PlanPrice({ plan, period, selected }) {
  if (plan.id === 'trial') {
    return <div style={{ ...pay.price, ...(selected ? pay.priceCy : null) }}>$0<span style={pay.per}>/7 days</span></div>;
  }
  if (plan.id === 'lifetime') {
    return (
      <div style={{ ...pay.price, color: 'var(--gh-yl, #ffe566)', textShadow: '0 0 24px rgba(255,229,102,0.5)' }}>
        <span style={pay.strike}>$299</span>$99
      </div>
    );
  }
  if (period === 'annual') {
    const perMonth = (plan.priceAnnual / 12).toFixed(2);
    return <div style={{ ...pay.price, ...(selected ? pay.priceCy : null) }}>${perMonth}<span style={pay.per}>/mo</span></div>;
  }
  return <div style={{ ...pay.price, ...(selected ? pay.priceCy : null) }}>${plan.priceMonthly}<span style={pay.per}>/mo</span></div>;
}

function CardForm() {
  return (
    <div style={pay.cardForm}>
      <div style={pay.cardFormHead}>
        <div style={pay.cardFormTitle}><span style={{ color: 'var(--gh-cy, #4de6f0)' }}>🔒</span> Card details</div>
        <span style={pay.poweredBy}>
          <span style={pay.poweredLbl}>Powered by</span>
          <span style={pay.stripeMark}>stripe</span>
        </span>
      </div>

      <Field label="Card number">
        <input placeholder="1234 1234 1234 1234" style={card.input} />
      </Field>

      <div style={pay.cardRow}>
        <Field label="Expiration"><input placeholder="MM / YY" style={card.input} /></Field>
        <Field label="CVC"><input placeholder="123" style={card.input} /></Field>
        <Field label="ZIP"><input placeholder="78701" style={card.input} /></Field>
      </div>

      <Field label="Name on card">
        <input placeholder="Kolton Vandergriff" style={card.input} />
      </Field>

      <label style={pay.consent}>
        <input type="checkbox" defaultChecked style={pay.consentBox} />
        <span>I authorize FlowADE (DutchMade Co.) to charge this card per the plan selected above. Trial members auto-roll to <strong>Basic ($15/mo) on day 8</strong> unless cancelled. Plan price locks at signup rate — future increases don't apply. Cancel or change plans any time from Settings → Billing.</span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 03 — AI keys
// ---------------------------------------------------------------------------
const KEY_DEFS = [
  { id: 'ANTHROPIC_API_KEY', label: 'Anthropic', icon: 'A', desc: 'Claude — powers AI chat, memory categorization, and code review.', recommended: true },
  { id: 'OPENAI_API_KEY',    label: 'OpenAI',    icon: 'O', desc: 'GPT-4o for chat + text-embedding-3-small for semantic memory search.' },
  { id: 'GITHUB_PAT',        label: 'GitHub PAT', icon: 'G', desc: 'Repo access for code search, PR helper, and your activity feed.' },
];

function StepKeys({ data, setData, onNext, onBack }) {
  const [keys, setKeys] = useState(data.keys || {});
  const [saving, setSaving] = useState(false);

  const setKey = (id, val) => setKeys(k => ({ ...k, [id]: val }));

  const submit = async (skip = false) => {
    setSaving(true);
    try {
      if (!skip && window.flowade?.env?.setMany) {
        const filled = Object.fromEntries(Object.entries(keys).filter(([, v]) => v));
        if (Object.keys(filled).length > 0) await window.flowade.env.setMany(filled);
      }
      setData(d => ({ ...d, keys }));
      onNext();
    } catch (err) {
      console.warn('[onb] env setMany failed:', err);
      onNext(); // soft-fail; user can set keys later in Settings
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={card.normal}>
      <span style={card.stamp}>step 03 · ai providers</span>
      <h1 style={card.h1}>Connect your <em style={card.em}>AI keys.</em></h1>
      <p style={card.lead}>FlowADE never holds your keys — they live in your OS keychain (Windows Credential Manager / macOS Keychain). You bring the model, you pay the model. We just plumb.</p>

      <div style={keysStyles.list}>
        {KEY_DEFS.map(k => (
          <div key={k.id} style={keysStyles.item}>
            <div style={keysStyles.ic}>{k.icon}</div>
            <div style={keysStyles.meta}>
              <div style={keysStyles.lbl}>
                {k.label}
                {k.recommended && <span style={keysStyles.recPill}>recommended</span>}
              </div>
              <div style={keysStyles.desc}>{k.desc}</div>
            </div>
            <span style={keysStyles.optional}>Optional</span>
            <input
              type="password"
              value={keys[k.id] || ''}
              onChange={(e) => setKey(k.id, e.target.value)}
              placeholder={`${k.id.toLowerCase().replace('_api_key', '').replace('_pat', '_pat')}-...`}
              style={{ ...card.input, gridColumn: '1 / -1', marginTop: 6 }}
            />
          </div>
        ))}
      </div>

      <div style={keysStyles.vault}>
        <div style={keysStyles.vaultIc}>🔒</div>
        <div>
          <div style={keysStyles.vaultH}>Stored in your OS keychain</div>
          <div style={keysStyles.vaultB}>Same place Windows holds your wifi passwords. Never sent to FlowADE servers, never written to disk in plaintext, never visible in your <code style={keysStyles.code}>.env</code>.</div>
        </div>
      </div>

      <div style={card.bottom}>
        <button onClick={onBack} style={btn.ghost}>← Back</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => submit(true)} style={btn.ghost}>Skip for now</button>
          <button onClick={() => submit(false)} disabled={saving} style={btn.primary}>{saving ? 'Saving…' : 'Continue →'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 04 — Layout
// ---------------------------------------------------------------------------
const LAYOUTS = [
  { id: 'indie',     ic: '⚡', ti: 'Indie hacker · single-screen sprint',  desc: '2 terminals, AI chat side-by-side, memory always visible. For shipping fast.' },
  { id: 'backend',   ic: '▣', ti: 'Backend dev · log-heavy',               desc: '4-pane terminal grid, log tail, DB shell. Memory tucked into a sidebar.' },
  { id: 'fullstack', ic: '⌘', ti: 'Full-stack · everything visible',       desc: 'Terminals, code editor, browser preview, AI chat. The kitchen-sink layout.' },
  { id: 'custom',    ic: '✎', ti: 'Custom · arrange it myself',            desc: 'Empty workspace. Drag panels in.' },
];

function StepLayout({ data, setData, onNext, onBack }) {
  const [pick, setPick] = useState(data.layout || 'indie');

  const choose = (id) => { setPick(id); setData(d => ({ ...d, layout: id })); };

  return (
    <div style={card.normal}>
      <span style={card.stamp}>step 04 · layout</span>
      <h1 style={card.h1}>Pick your <em style={card.em}>flow.</em></h1>
      <p style={card.lead}>FlowADE adapts to how you ship. Choose a starting layout — you can change it any time from the workspace switcher.</p>

      <div style={lay.list}>
        {LAYOUTS.map(l => (
          <div key={l.id} onClick={() => choose(l.id)} style={{ ...lay.opt, ...(pick === l.id ? lay.optSelected : null) }}>
            <div style={lay.ic}>{l.ic}</div>
            <div>
              <div style={lay.ti}>{l.ti}</div>
              <div style={lay.desc}>{l.desc}</div>
            </div>
            <div style={{ ...lay.check, ...(pick === l.id ? lay.checkOn : null) }}>{pick === l.id && '✓'}</div>
          </div>
        ))}
      </div>

      <div style={card.bottom}>
        <button onClick={onBack} style={btn.ghost}>← Back</button>
        <button onClick={() => { try { localStorage.setItem('flowade_layout', pick); } catch {} ; onNext(); }} style={btn.primary}>Continue →</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 05 — Ready
// ---------------------------------------------------------------------------
function StepReady({ onEnter, onBack }) {
  return (
    <div style={card.normal}>
      <div style={ready.hero}>
        <img src={logoFa} alt="FA" style={ready.logo} />
        <span style={card.stamp}>step 05 · ready</span>
        <h1 style={{ ...card.h1, textAlign: 'center' }}>You're <em style={card.em}>set.</em></h1>
        <p style={{ ...card.lead, textAlign: 'center', maxWidth: 560 }}>
          <strong style={{ color: 'var(--gh-cy, #4de6f0)' }}>7-day trial active.</strong> Card on file with Stripe — auto-rolls into Basic ($15/mo) on day 8. Workspace provisioned, keys vaulted, memory graph empty. Cancel any time from Settings → Billing.
        </p>
      </div>

      <div style={ready.tiles}>
        <Tile ic="▶" h="Open a terminal"        b={<><Kbd>⌘ T</Kbd> spawns a new shell. Run <Code>claude</Code> to start an agent.</>} />
        <Tile ic="✦" h="Save your first memory" b={<><Kbd>⌘ M</Kbd> opens the brain. Anything you save becomes shared context.</>} />
        <Tile ic="◈" h="Ask the model"          b={<><Kbd>⌘ K</Kbd> opens AI chat with your active terminal as context.</>} />
        <Tile ic="⌘" h="Cmd palette"            b={<><Kbd>⌘ ⇧ P</Kbd> jumps anywhere. Try "switch workspace" or "new task".</>} />
      </div>

      <div style={card.bottom}>
        <button onClick={onBack} style={btn.ghost}>← Back</button>
        <button onClick={onEnter} style={btn.primary}>Enter workspace ⏎</button>
      </div>
    </div>
  );
}

function Tile({ ic, h, b }) {
  return (
    <div style={ready.tile}>
      <div style={ready.tileIc}>{ic}</div>
      <div>
        <div style={ready.tileH}>{h}</div>
        <div style={ready.tileB}>{b}</div>
      </div>
    </div>
  );
}
function Kbd({ children }) { return <kbd style={ready.kbd}>{children}</kbd>; }
function Code({ children }) { return <code style={ready.code}>{children}</code>; }

// ---------------------------------------------------------------------------
// Reusable Field
// ---------------------------------------------------------------------------
function Field({ label, children }) {
  return (
    <div style={card.field}>
      <span style={card.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

// ===========================================================================
// Styles
// ===========================================================================
const shell = {
  root: {
    position: 'fixed', inset: 0, overflow: 'auto',
    display: 'grid', gridTemplateRows: 'auto auto 1fr',
    padding: '28px 32px',
    background: `
      radial-gradient(1200px 700px at 80% 0%, rgba(77,230,240,0.08), transparent 60%),
      radial-gradient(900px 600px at 0% 100%, rgba(77,230,240,0.04), transparent 60%),
      #06060c
    `,
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
    color: '#f1f5f9',
    WebkitAppRegion: 'drag',
  },
  top: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    maxWidth: 1100, width: '100%', margin: '0 auto',
    WebkitAppRegion: 'no-drag',
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logoFa: {
    width: 32, height: 32, objectFit: 'contain',
    filter: 'drop-shadow(0 0 8px rgba(77,230,240,0.35))',
  },
  brand: {
    fontFamily: 'var(--gh-font-techno, "Chakra Petch", sans-serif)',
    fontSize: 14, fontWeight: 600, letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  skipLink: {
    all: 'unset', cursor: 'pointer',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em',
    padding: '6px 12px', border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: 6,
  },
  progress: {
    display: 'flex', alignItems: 'center', gap: 12,
    maxWidth: 1100, width: '100%', margin: '22px auto 0',
    WebkitAppRegion: 'no-drag',
  },
  step: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  bar: {
    height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
    overflow: 'hidden',
  },
  barDone: { background: '#4de6f0' },
  barCurr: {
    background: 'linear-gradient(90deg, #4de6f0 60%, rgba(77,230,240,0.15))',
    boxShadow: '0 0 12px rgba(77,230,240,0.4)',
  },
  lbl: {
    fontFamily: 'var(--gh-font-techno, sans-serif)', fontWeight: 600,
    fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#4a5168',
  },
  lblDone: { color: '#94a3b8' },
  lblCurr: { color: '#4de6f0' },
  num: { color: 'inherit', marginRight: 6 },
  content: {
    width: '100%',
    display: 'flex', flexDirection: 'column',
    WebkitAppRegion: 'no-drag',
    paddingBottom: 30,
  },
};

const card = {
  normal: { maxWidth: 720, width: '100%', margin: '60px auto 40px', alignSelf: 'start' },
  wide:   { maxWidth: 1100, width: '100%', margin: '40px auto 30px', alignSelf: 'start' },
  stamp: {
    display: 'inline-block', marginBottom: 22,
    fontFamily: 'var(--gh-font-techno, sans-serif)',
    fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0',
    padding: '5px 12px',
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.05)',
  },
  h1: {
    fontFamily: 'var(--gh-font-display, "Outfit", sans-serif)',
    fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
    margin: '0 0 14px',
  },
  em: {
    color: '#4de6f0', fontStyle: 'normal',
    textShadow: '0 0 22px rgba(77,230,240,0.4)',
  },
  lead: {
    fontSize: 16, color: '#94a3b8', lineHeight: 1.55,
    margin: '0 0 38px', maxWidth: 560,
  },
  form: { display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: {
    fontFamily: 'var(--gh-font-techno, sans-serif)',
    fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#94a3b8',
  },
  input: {
    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 8, padding: '11px 13px',
    color: '#f1f5f9',
    fontFamily: 'var(--gh-font-mono, monospace)', fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    width: '100%', boxSizing: 'border-box',
  },
  divider: {
    fontSize: 10, color: '#4a5168', letterSpacing: '0.25em',
    margin: '6px 0', textAlign: 'center',
  },
  providers: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  consentRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 4,
  },
  consentBox: {
    marginTop: 2,
    width: 14, height: 14,
    accentColor: '#4de6f0',
    cursor: 'pointer',
    flexShrink: 0,
  },
  consentText: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 11.5,
    color: '#94a3b8',
    lineHeight: 1.55,
  },
  consentLink: {
    color: '#4de6f0',
    textDecoration: 'none',
    borderBottom: '1px dotted rgba(77,230,240,0.5)',
    fontWeight: 600,
  },
  errorBanner: {
    padding: '10px 14px', borderRadius: 8,
    background: 'rgba(255,107,107,0.08)',
    border: '1px solid rgba(255,107,107,0.3)',
    color: '#ff6b6b', fontSize: 12,
    fontFamily: 'var(--gh-font-mono, monospace)',
  },
  bottom: {
    display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', maxWidth: 1100, width: '100%', margin: '14px auto 0',
  },
  hint: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 10, color: '#4a5168', letterSpacing: '0.1em',
  },
};

const btn = {
  primary: {
    all: 'unset', cursor: 'pointer',
    padding: '12px 22px', borderRadius: 9,
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    color: '#001014',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    boxShadow: '0 8px 24px rgba(77,230,240,0.25)',
  },
  ghost: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 16px', borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
  },
  loading: { opacity: 0.6, cursor: 'wait' },
  signInLink: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 16px', borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    transition: 'all 0.15s',
  },
  provider: {
    all: 'unset', cursor: 'pointer',
    padding: 11, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.13)',
    fontFamily: 'var(--gh-font-mono, monospace)', fontSize: 12,
    color: '#f1f5f9',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  providerIc: {
    width: 18, height: 18, display: 'grid', placeItems: 'center',
    fontFamily: 'var(--gh-font-display, sans-serif)', fontWeight: 700,
  },
};

const pay = {
  toggleBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 14, marginBottom: 22, paddingTop: 4,
  },
  toggle: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: 4,
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 99,
  },
  toggleBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '8px 18px', borderRadius: 99,
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    color: '#94a3b8',
    display: 'inline-flex', alignItems: 'center', gap: 8,
  },
  toggleBtnActive: {
    background: '#4de6f0', color: '#001014',
    boxShadow: '0 0 18px rgba(77,230,240,0.35)',
  },
  savePill: {
    fontFamily: 'var(--gh-font-techno, sans-serif)', fontWeight: 600,
    fontSize: 9, letterSpacing: '0.18em', padding: '2px 7px', borderRadius: 99,
    background: 'rgba(77,230,240,0.15)', color: '#4de6f0',
  },
  savePillActive: { background: 'rgba(0,0,0,0.2)', color: '#001014' },
  lock: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 11, color: '#94a3b8', display: 'inline-flex',
    alignItems: 'center', gap: 8,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 10, marginBottom: 32, paddingTop: 18,
  },
  card: {
    position: 'relative', cursor: 'pointer', minHeight: 220,
    padding: '18px 18px 16px',
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 14,
    backdropFilter: 'blur(12px)',
    display: 'flex', flexDirection: 'column', gap: 8,
    transition: 'all 0.15s',
  },
  cardSelected: {
    borderColor: '#4de6f0',
    background: 'radial-gradient(400px 180px at 50% 0%, rgba(77,230,240,0.14), transparent 60%), rgba(10, 14, 24, 0.55)',
    boxShadow: '0 0 28px rgba(77,230,240,0.18), inset 0 0 0 1px rgba(77,230,240,0.25)',
  },
  cardLifetime: {
    border: '2px solid rgba(255,229,102,0.6)',
    background: 'radial-gradient(500px 240px at 50% 0%, rgba(255,229,102,0.18), transparent 60%), linear-gradient(160deg, rgba(35,28,8,0.85), rgba(14,11,2,0.85))',
    boxShadow: '0 12px 40px rgba(255,229,102,0.18), inset 0 0 0 1px rgba(255,229,102,0.15)',
    transform: 'translateY(-6px) scale(1.02)',
  },
  cardLifetimeSelected: {
    borderColor: '#ffe566',
    background: 'radial-gradient(500px 240px at 50% 0%, rgba(255,229,102,0.32), transparent 60%), linear-gradient(160deg, rgba(45,36,8,0.85), rgba(20,16,2,0.85))',
    boxShadow: '0 16px 56px rgba(255,229,102,0.4), inset 0 0 0 1px rgba(255,229,102,0.5)',
  },
  ribbonCy: {
    position: 'absolute', top: -10, right: 14,
    fontFamily: 'var(--gh-font-techno, sans-serif)', fontWeight: 600,
    fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase',
    padding: '4px 10px', borderRadius: 4,
    background: '#4de6f0', color: '#001014',
  },
  ribbonYl: {
    position: 'absolute', top: -10, right: 14,
    fontFamily: 'var(--gh-font-techno, sans-serif)', fontWeight: 600,
    fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase',
    padding: '5px 12px', borderRadius: 4,
    background: 'linear-gradient(90deg, #fff5a0, #ffe566, #ffba2e)',
    color: '#1a1400',
    boxShadow: '0 0 18px rgba(255,229,102,0.7)',
  },
  check: {
    position: 'absolute', top: 14, right: 14,
    width: 18, height: 18, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.13)',
    background: 'rgba(0,0,0,0.4)',
    display: 'grid', placeItems: 'center',
    fontSize: 11, fontWeight: 700, color: '#001014',
  },
  checkOn: { background: '#4de6f0', borderColor: '#4de6f0' },
  checkOnYl: { background: '#ffe566', borderColor: '#ffe566', color: '#1a1400' },
  name: {
    fontFamily: 'var(--gh-font-techno, sans-serif)', fontWeight: 600,
    fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#94a3b8',
  },
  price: {
    fontFamily: 'var(--gh-font-display, sans-serif)', fontWeight: 800,
    fontSize: 32, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 2,
  },
  priceCy: { color: '#4de6f0', textShadow: '0 0 20px rgba(77,230,240,0.4)' },
  per: {
    fontSize: 12, color: '#94a3b8', fontWeight: 400,
    letterSpacing: 0, marginLeft: 4,
  },
  strike: {
    fontSize: 18, color: 'rgba(255,229,102,0.5)', fontWeight: 400,
    textDecoration: 'line-through', letterSpacing: 0, marginRight: 8,
  },
  sub: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginTop: 'auto' },
  urgency: {
    fontFamily: 'var(--gh-font-mono, monospace)', fontWeight: 700,
    fontSize: 10, color: '#ffe566', letterSpacing: '0.08em',
    marginTop: 10, padding: '6px 10px',
    background: 'rgba(255,229,102,0.1)',
    border: '1px solid rgba(255,229,102,0.3)',
    borderRadius: 4, textAlign: 'center',
  },
  cardForm: {
    padding: 22,
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 14, backdropFilter: 'blur(12px)',
    display: 'flex', flexDirection: 'column', gap: 14,
    marginBottom: 14,
  },
  cardFormHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  cardFormTitle: {
    fontFamily: 'var(--gh-font-display, sans-serif)',
    fontSize: 15, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  poweredBy: { display: 'flex', alignItems: 'center', gap: 6 },
  poweredLbl: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
    color: '#4a5168',
  },
  stripeMark: {
    fontFamily: 'var(--gh-font-display, sans-serif)', fontWeight: 700,
    fontSize: 14, letterSpacing: '-0.01em',
    color: '#635bff', padding: '2px 8px', borderRadius: 4,
    background: 'rgba(99,91,255,0.1)', border: '1px solid rgba(99,91,255,0.3)',
  },
  cardRow: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 },
  consent: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10,
    alignItems: 'start',
    paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
    fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55,
  },
  consentBox: { width: 16, height: 16, marginTop: 2, accentColor: '#4de6f0' },
  trustRow: {
    display: 'flex', gap: 18, flexWrap: 'wrap',
    paddingTop: 16, borderTop: '1px dashed rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  trust: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 10.5, color: '#94a3b8', letterSpacing: '0.04em',
  },
};

const keysStyles = {
  list: { display: 'grid', gap: 14 },
  item: {
    padding: 18,
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 12, backdropFilter: 'blur(10px)',
    display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 16, alignItems: 'start',
  },
  ic: {
    width: 36, height: 36, display: 'grid', placeItems: 'center',
    background: 'rgba(77,230,240,0.08)', border: '1px solid rgba(77,230,240,0.25)',
    color: '#4de6f0',
    fontFamily: 'var(--gh-font-display, sans-serif)', fontWeight: 700, fontSize: 13,
  },
  meta: { minWidth: 0 },
  lbl: {
    fontSize: 14, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 8,
  },
  recPill: {
    fontSize: 9, padding: '3px 7px', borderRadius: 99,
    background: 'rgba(77,230,240,0.15)', color: '#4de6f0',
    fontFamily: 'var(--gh-font-mono, monospace)',
    letterSpacing: '0.05em',
  },
  desc: {
    fontSize: 11.5, color: '#94a3b8', marginTop: 4, lineHeight: 1.45,
  },
  optional: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 9, padding: '3px 7px', border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8', letterSpacing: '0.08em',
  },
  vault: {
    marginTop: 12,
    padding: '16px 18px',
    border: '1px dashed rgba(77,230,240,0.3)', borderRadius: 10,
    background: 'rgba(77,230,240,0.04)',
    display: 'grid', gridTemplateColumns: '32px 1fr', gap: 14, alignItems: 'center',
  },
  vaultIc: { color: '#4de6f0', fontSize: 22 },
  vaultH: { fontSize: 12, fontWeight: 600, color: '#4de6f0', marginBottom: 3 },
  vaultB: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 },
  code: {
    background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3,
    fontFamily: 'var(--gh-font-mono, monospace)',
  },
};

const lay = {
  list: { display: 'grid', gap: 12, marginBottom: 22 },
  opt: {
    padding: '18px 20px',
    border: '1px solid rgba(255,255,255,0.13)', borderRadius: 12,
    cursor: 'pointer',
    display: 'grid', gridTemplateColumns: '32px 1fr 24px', alignItems: 'center', gap: 16,
    transition: 'all 0.15s',
    background: 'rgba(255,255,255,0.02)',
  },
  optSelected: {
    borderColor: '#4de6f0', background: 'rgba(77,230,240,0.08)',
    boxShadow: '0 0 28px rgba(77,230,240,0.12), inset 0 0 0 1px rgba(77,230,240,0.2)',
  },
  ic: { fontSize: 22, color: '#4de6f0' },
  ti: { fontSize: 15, fontWeight: 600 },
  desc: { fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 },
  check: {
    width: 18, height: 18, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.13)', background: 'transparent',
    display: 'grid', placeItems: 'center',
    fontSize: 11, fontWeight: 700,
  },
  checkOn: {
    background: '#4de6f0', borderColor: '#4de6f0', color: '#001014',
  },
};

const ready = {
  hero: {
    display: 'grid', placeItems: 'center', gap: 26, padding: '30px 0',
    textAlign: 'center',
  },
  logo: {
    width: 88, height: 88, objectFit: 'contain',
    filter: 'drop-shadow(0 0 22px rgba(77,230,240,0.35))',
  },
  tiles: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16, marginTop: 12, marginBottom: 22,
  },
  tile: {
    padding: 18,
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, backdropFilter: 'blur(10px)',
    display: 'grid', gridTemplateColumns: '32px 1fr', gap: 14, alignItems: 'start',
  },
  tileIc: { color: '#4de6f0', fontSize: 18 },
  tileH: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  tileB: { fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 },
  kbd: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    padding: '1px 5px', background: 'rgba(255,255,255,0.06)',
    borderRadius: 3, color: '#94a3b8',
  },
  code: {
    background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3,
    fontFamily: 'var(--gh-font-mono, monospace)',
  },
};
