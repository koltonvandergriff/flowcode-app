// In-pane terminal wizard. Renders inside a freshly-spawned terminal pane
// while it's in `pending` state. On submit the parent commits the config
// to the workspace store and the pane transitions into a live terminal.
//
// Refname format: {provider}-{label-slug}-{hex4}
//   pwsh-deploy-bb12 · claude-feat-auth-7f3a · gpt-debug-091e
//
// Naming logic mirrors what bridgemind / similar tools use — short slug
// + 4-char hex so two panes with the same human label still differ.

import { useState, useMemo } from 'react';
import { PROVIDERS } from '../../lib/constants';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const MODELS_BY_PROVIDER = {
  'claude-api': [
    { id: 'claude-opus-4-7',          label: 'Opus 4.7' },
    { id: 'claude-sonnet-4-6',        label: 'Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
  ],
  chatgpt: [
    { id: 'gpt-4o',      label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  ],
  openclaw: [
    { id: 'auto', label: 'Auto-route' },
  ],
};

export default function TerminalWizardGlasshouse({
  initialDefaults = {},   // { provider, cwd, model, dangerous }
  onCommit,
  onCancel,
}) {
  const [provider, setProvider]   = useState(initialDefaults.provider || 'claude');
  const [model,    setModel]      = useState(initialDefaults.model || '');
  const [cwd,      setCwd]        = useState(initialDefaults.cwd || '');
  const [danger,   setDanger]     = useState(!!initialDefaults.dangerous);
  const [label,    setLabel]      = useState('');
  const [saveDefault, setSaveDefault] = useState(false);

  const providerDef = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
  const isApi   = !!providerDef.apiProvider;
  const isShell = provider === 'shell' || provider === 'custom';
  const models  = MODELS_BY_PROVIDER[provider] || [];

  // Default the model when switching providers if the current pick doesn't apply.
  useMemo(() => {
    if (models.length && !models.find(m => m.id === model)) setModel(models[0].id);
    if (!models.length && model) setModel('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const generated = useMemo(() => slugify(provider, label), [provider, label]);

  const submit = (e) => {
    e?.preventDefault();
    onCommit?.({
      provider,
      model: models.length ? (model || models[0].id) : undefined,
      cwd: cwd || undefined,
      dangerous: isShell ? danger : false,
      label: generated,
      saveAsDefault: saveDefault,
    });
  };

  const pickFolder = async () => {
    try {
      const next = await window.flowade?.dialog?.pickFolder?.(cwd || undefined);
      if (next) setCwd(next);
    } catch {}
  };

  return (
    <div style={s.root}>
      <form onSubmit={submit} style={s.form}>
        <div style={s.head}>
          <span style={s.stamp}>new terminal · custom</span>
          <h2 style={s.h}>Configure your <em style={s.em}>session.</em></h2>
          <p style={s.lead}>
            Pick the provider, model, working directory, and a memorable label. We'll mint a refname like
            <code style={s.code}> {generated}</code> so other panes and agents can reference this session.
          </p>
        </div>

        <Field label="Provider">
          <div style={s.providerGrid}>
            {PROVIDERS.map(p => (
              <button type="button" key={p.id} onClick={() => setProvider(p.id)}
                style={{ ...s.providerChip, ...(provider === p.id ? s.providerChipActive : null) }}
              >
                <span style={{ ...s.providerDot, background: p.color }} />
                <span style={s.providerName}>{p.name}</span>
                {p.apiProvider && <span style={s.providerTag}>API</span>}
              </button>
            ))}
          </div>
        </Field>

        {models.length > 0 && (
          <Field label="Model">
            <div style={s.chipRow}>
              {models.map(m => (
                <button type="button" key={m.id} onClick={() => setModel(m.id)}
                  style={{ ...s.smallChip, ...(model === m.id ? s.smallChipActive : null) }}
                >{m.label}</button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Working directory">
          <div style={s.inlineRow}>
            <input
              type="text" value={cwd} onChange={(e) => setCwd(e.target.value)}
              placeholder="C:\Users\kolto\Desktop\Claude\flowADE-app"
              style={s.input}
            />
            <button type="button" onClick={pickFolder} style={s.ghostBtn}>Pick…</button>
          </div>
        </Field>

        {isShell && (
          <Field label="Danger mode" desc="Allows commands without per-action confirmation. Use only for trusted sessions.">
            <Toggle on={danger} onChange={setDanger} />
          </Field>
        )}

        <Field label="Label" desc="Optional. Becomes part of the refname.">
          <input
            type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="feat/auth · deploy · debug · review"
            maxLength={32}
            style={s.input}
          />
          <div style={s.refPreview}>
            refname will be <code style={s.code}>{generated}</code>
          </div>
        </Field>

        <label style={s.checkRow}>
          <input type="checkbox" checked={saveDefault} onChange={(e) => setSaveDefault(e.target.checked)} style={s.check} />
          <span>Save this configuration as my new default for the <code style={s.code}>+ Terminal</code> button</span>
        </label>

        <div style={s.actions}>
          <button type="button" onClick={onCancel} style={s.cancelBtn}>Cancel</button>
          <button type="submit" style={s.openBtn}>Open terminal ⏎</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div style={s.field}>
      <div style={s.fieldHead}>
        <span style={s.fieldLabel}>{label}</span>
      </div>
      {children}
      {desc && <div style={s.fieldDesc}>{desc}</div>}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button" onClick={() => onChange(!on)}
      style={{
        all: 'unset', cursor: 'pointer',
        width: 38, height: 22, borderRadius: 99,
        background: on ? 'rgba(77,230,240,0.18)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${on ? 'rgba(77,230,240,0.4)' : 'rgba(255,255,255,0.13)'}`,
        position: 'relative', transition: 'all 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 1, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? '#4de6f0' : '#94a3b8',
        transition: 'all 0.18s',
      }} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Refname helper
// ---------------------------------------------------------------------------
function slugify(provider, label) {
  const slug = (label || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  // Stable hex once `label` and `provider` are set together — recompute only
  // when the user types into the label field (useMemo dependency in caller).
  const provSlug = (provider || 'term').replace(/[^a-z0-9]+/g, '-');
  return slug ? `${provSlug}-${slug}-${hex}` : `${provSlug}-${hex}`;
}

// ---------------------------------------------------------------------------
// Styles — glasshouse aesthetic, in-pane sizing
// ---------------------------------------------------------------------------
const s = {
  root: {
    flex: 1, minHeight: 0, minWidth: 0,
    background:
      'radial-gradient(600px 300px at 20% -10%, rgba(77,230,240,0.07), transparent 60%),' +
      'rgba(8, 8, 18, 0.55)',
    color: '#f1f5f9',
    fontFamily: FONT_MONO,
    overflow: 'auto',
    display: 'flex', justifyContent: 'center',
  },
  form: {
    width: '100%', maxWidth: 540,
    padding: '28px 28px 22px',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  head: { marginBottom: 4 },
  stamp: {
    display: 'inline-block', marginBottom: 14,
    fontFamily: FONT_TECH, fontSize: 9.5, letterSpacing: '0.32em',
    textTransform: 'uppercase', color: '#4de6f0',
    padding: '4px 10px',
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.05)',
  },
  h: {
    fontFamily: FONT_DISP, fontWeight: 800, fontSize: 28,
    letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 8px',
  },
  em: {
    fontStyle: 'normal', color: '#4de6f0',
    textShadow: '0 0 22px rgba(77,230,240,0.35)',
  },
  lead: {
    fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.55,
  },

  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: {
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 600,
    letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#94a3b8',
  },
  fieldDesc: {
    fontSize: 10.5, color: '#4a5168', marginTop: 2, lineHeight: 1.4,
  },

  inlineRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  input: {
    flex: 1, background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 8, padding: '10px 12px',
    color: '#f1f5f9', fontSize: 12.5, fontFamily: FONT_MONO,
    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    width: '100%', boxSizing: 'border-box',
  },
  ghostBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '0 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8', fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600,
    letterSpacing: '0.04em', display: 'flex', alignItems: 'center',
  },

  providerGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6,
  },
  providerChip: {
    all: 'unset', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.02)',
    transition: 'all 0.12s',
  },
  providerChipActive: {
    border: '1px solid rgba(77,230,240,0.45)',
    background: 'rgba(77,230,240,0.08)',
    boxShadow: '0 0 18px rgba(77,230,240,0.12)',
  },
  providerDot: {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
  },
  providerName: {
    flex: 1, minWidth: 0, fontSize: 12, fontFamily: FONT_MONO, color: '#f1f5f9',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  providerTag: {
    fontSize: 8, fontFamily: FONT_MONO, fontWeight: 700,
    padding: '1px 5px', borderRadius: 3,
    background: 'rgba(77,230,240,0.12)', color: '#4de6f0',
    letterSpacing: '0.1em',
  },

  chipRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  smallChip: {
    all: 'unset', cursor: 'pointer',
    padding: '5px 12px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 600,
    letterSpacing: '0.04em',
  },
  smallChipActive: {
    border: '1px solid rgba(77,230,240,0.45)',
    background: 'rgba(77,230,240,0.08)',
    color: '#4de6f0',
  },

  refPreview: {
    fontSize: 10.5, color: '#94a3b8', fontFamily: FONT_MONO, marginTop: 2,
  },
  code: {
    background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 3,
    fontFamily: FONT_MONO, color: '#4de6f0', fontSize: 11,
  },

  checkRow: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10,
    alignItems: 'center',
    padding: '12px 14px', borderRadius: 8,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5,
    fontFamily: FONT_MONO, cursor: 'pointer',
  },
  check: { width: 16, height: 16, accentColor: '#4de6f0' },

  actions: {
    display: 'flex', gap: 10, justifyContent: 'space-between',
    marginTop: 6,
  },
  cancelBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 16px', borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
    letterSpacing: '0.04em',
  },
  openBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 18px', borderRadius: 9,
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    color: '#001014',
    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
    letterSpacing: '0.04em',
    boxShadow: '0 8px 24px rgba(77,230,240,0.25)',
  },
};
