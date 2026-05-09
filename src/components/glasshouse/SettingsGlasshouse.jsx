// Glasshouse settings page — inline, real wiring. Subnav + section cards.
// API keys read/write via window.flowade.env (which routes to OS keychain
// for SECRET_KEYS via keytar).

import { useState, useEffect, useCallback } from 'react';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const SECTIONS = [
  { id: 'account',     label: 'Account' },
  { id: 'keys',        label: 'API Keys' },
  { id: 'memory',      label: 'Memory' },
  { id: 'appearance',  label: 'Appearance' },
  { id: 'keybindings', label: 'Keybindings' },
  { id: 'notify',      label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
];

const KEY_DEFS = [
  { id: 'ANTHROPIC_API_KEY', label: 'Anthropic',   desc: 'Claude — required for AI chat & categorization' },
  { id: 'OPENAI_API_KEY',    label: 'OpenAI',      desc: 'GPT + embeddings (semantic search)' },
  { id: 'GITHUB_PAT',        label: 'GitHub PAT',  desc: 'Repo access for code search & PR helper' },
];

export default function SettingsGlasshouse({ onLogout }) {
  const [section, setSection] = useState('keys');

  return (
    <div style={s.root}>
      <div style={s.head}>
        <h1 style={s.h1}>Settings</h1>
        <p style={s.sub}>Preferences sync across devices · API keys stay local</p>
      </div>

      <div style={s.layout}>
        <nav style={s.subnav}>
          {SECTIONS.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{ ...s.subnavLink, ...(section === item.id ? s.subnavLinkActive : null) }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={onLogout} style={{ ...s.subnavLink, color: '#ff6b6b' }}>Sign out</button>
          </div>
        </nav>

        <div style={s.card}>
          {section === 'account'      && <AccountSection />}
          {section === 'keys'         && <KeysSection />}
          {section === 'memory'       && <MemorySection />}
          {section === 'appearance'   && <AppearanceSection />}
          {section === 'keybindings'  && <PlaceholderSection title="Keybindings" body="Customize keyboard shortcuts. Configuration UI lives in the legacy Keybindings panel — opens via Cmd Palette › Keyboard Shortcuts." />}
          {section === 'notify'       && <PlaceholderSection title="Notifications" body="Push notifications, mobile devices, email digests. Wired via the legacy Notifications panel — opens via Cmd Palette." />}
          {section === 'integrations' && <PlaceholderSection title="Integrations" body="Slack, Linear, GitHub bridges. Available on Team and Max tiers." />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
function AccountSection() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('flowade_auth_user') || '{}')); } catch {}
  }, []);
  return (
    <>
      <h2 style={s.cardH2}>Account</h2>
      <p style={s.cardSub}>Workspace identity · email · sign-in info.</p>
      <Row label="Name">
        <input style={s.textInput} defaultValue={user?.name || ''} />
      </Row>
      <Row label="Email">
        <input style={s.textInput} defaultValue={user?.email || ''} disabled />
      </Row>
      <Row label="Workspace">
        <input style={s.textInput} defaultValue="Default" />
      </Row>
      <Row label="Plan">
        <span style={{ ...s.tag, color: '#4de6f0', borderColor: 'rgba(77,230,240,0.3)' }}>Trial · 6 days left</span>
      </Row>
    </>
  );
}

function KeysSection() {
  const [keys, setKeys] = useState({});
  const [savedAt, setSavedAt] = useState({});

  useEffect(() => {
    let alive = true;
    Promise.all(
      KEY_DEFS.map(k => window.flowade?.env?.get?.(k.id).then(v => [k.id, v]))
    ).then(rows => {
      if (!alive) return;
      const obj = {};
      rows.forEach(r => { if (r) obj[r[0]] = r[1] || ''; });
      setKeys(obj);
    });
    return () => { alive = false; };
  }, []);

  const setKey = useCallback(async (id, value) => {
    setKeys(k => ({ ...k, [id]: value }));
    try {
      await window.flowade?.env?.set?.(id, value);
      setSavedAt(s2 => ({ ...s2, [id]: Date.now() }));
    } catch {}
  }, []);

  return (
    <>
      <h2 style={s.cardH2}>API Keys</h2>
      <p style={s.cardSub}>Stored in your OS keychain — never sent to FlowADE servers.</p>
      {KEY_DEFS.map(k => {
        const recent = savedAt[k.id] && Date.now() - savedAt[k.id] < 2500;
        return (
          <div key={k.id} style={s.row}>
            <div style={s.rowLeft}>
              <div style={s.rowLabel}>{k.label}</div>
              <div style={s.rowDesc}>{k.desc}</div>
            </div>
            <input
              type="password"
              value={keys[k.id] ?? ''}
              onChange={(e) => setKey(k.id, e.target.value)}
              placeholder={`${k.id.toLowerCase().includes('pat') ? 'ghp_' : 'sk-'}...`}
              style={{ ...s.keyInput, ...(recent ? { borderColor: '#4de6f0', boxShadow: '0 0 0 3px rgba(77,230,240,0.12)' } : null) }}
            />
          </div>
        );
      })}
      <div style={s.vault}>
        <span style={{ color: '#4de6f0', fontSize: 18 }}>🔒</span>
        <div>
          <div style={s.vaultH}>Stored in your OS keychain</div>
          <div style={s.vaultB}>Same place Windows holds your wifi passwords. Never sent to FlowADE servers, never written to disk in plaintext.</div>
        </div>
      </div>
    </>
  );
}

function MemorySection() {
  const [auto, setAuto] = useState(() => readBool('flowade.mem.autoCategorize', true));
  const [embed, setEmbed] = useState(() => readBool('flowade.mem.autoEmbed', true));
  const [sync, setSync] = useState(() => readBool('flowade.mem.syncMobile', true));

  return (
    <>
      <h2 style={s.cardH2}>Memory</h2>
      <p style={s.cardSub}>How knowledge gets organized.</p>
      <Toggle label="Auto-categorize on create" desc="Slot every new memory into a leaf via Haiku 4.5." on={auto} onChange={(v) => { setAuto(v); writeBool('flowade.mem.autoCategorize', v); }} />
      <Toggle label="Auto-embed on create" desc="Compute vector for semantic search." on={embed} onChange={(v) => { setEmbed(v); writeBool('flowade.mem.autoEmbed', v); }} />
      <Toggle label="Sync to mobile" desc="Real-time cross-device updates." on={sync} onChange={(v) => { setSync(v); writeBool('flowade.mem.syncMobile', v); }} />
    </>
  );
}

function AppearanceSection() {
  const [glass, setGlass] = useState(() => localStorage.getItem('flowade.theme.glasshouse') === '1');
  const apply = (v) => {
    setGlass(v);
    try {
      if (v) localStorage.setItem('flowade.theme.glasshouse', '1');
      else localStorage.removeItem('flowade.theme.glasshouse');
      document.body.dataset.theme = v ? 'glasshouse' : '';
      // Reload to remount auth tree under the right shell.
      setTimeout(() => location.reload(), 100);
    } catch {}
  };

  return (
    <>
      <h2 style={s.cardH2}>Appearance</h2>
      <p style={s.cardSub}>Visual theme. Glasshouse is the new layout you're using right now.</p>
      <Toggle
        label="Glasshouse theme (preview)"
        desc="Cyan + glass aesthetic, single-pane navigation, mockup-driven layout. Toggle off to return to the classic terminal-grid shell."
        on={glass}
        onChange={apply}
      />
    </>
  );
}

function PlaceholderSection({ title, body }) {
  return (
    <>
      <h2 style={s.cardH2}>{title}</h2>
      <p style={s.cardSub}>{body}</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------
function Row({ label, children }) {
  return (
    <div style={s.row}>
      <div style={s.rowLeft}>
        <div style={s.rowLabel}>{label}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, on, onChange }) {
  return (
    <div style={s.row}>
      <div style={s.rowLeft}>
        <div style={s.rowLabel}>{label}</div>
        <div style={s.rowDesc}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        style={{
          all: 'unset', cursor: 'pointer',
          width: 38, height: 22, borderRadius: 99,
          background: on ? 'rgba(77,230,240,0.18)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${on ? 'rgba(77,230,240,0.4)' : 'rgba(255,255,255,0.13)'}`,
          position: 'relative',
          transition: 'all 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 1, left: on ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: on ? '#4de6f0' : '#94a3b8',
          transition: 'all 0.18s',
        }} />
      </button>
    </div>
  );
}

function readBool(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v === '1';
  } catch { return def; }
}
function writeBool(key, val) {
  try { localStorage.setItem(key, val ? '1' : '0'); } catch {}
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = {
  root: { flex: 1, padding: '32px 36px', overflowY: 'auto', minHeight: 0 },
  head: { marginBottom: 24, maxWidth: 720 },
  h1: { fontFamily: FONT_DISP, fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em', margin: '0 0 6px' },
  sub: { fontSize: 13, color: '#94a3b8', margin: 0, fontFamily: FONT_MONO },

  layout: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' },

  subnav: {
    display: 'flex', flexDirection: 'column', gap: 2,
    minHeight: 320,
  },
  subnavLink: {
    all: 'unset', cursor: 'pointer',
    padding: '8px 12px', borderRadius: 8,
    fontFamily: FONT_MONO, fontSize: 12,
    color: '#94a3b8',
    transition: 'all 0.15s',
  },
  subnavLinkActive: {
    background: 'rgba(77,230,240,0.08)',
    color: '#4de6f0',
  },

  card: {
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 14, padding: 28,
    backdropFilter: 'blur(14px) saturate(1.15)',
  },
  cardH2: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 22, letterSpacing: '-0.02em', margin: '0 0 4px',
  },
  cardSub: {
    fontSize: 12, color: '#94a3b8', marginBottom: 22,
    fontFamily: FONT_MONO,
  },

  row: {
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 16,
    padding: '14px 0', alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  rowLeft: {},
  rowLabel: { fontSize: 13, color: '#f1f5f9' },
  rowDesc: {
    fontSize: 11, color: '#94a3b8', marginTop: 3,
    fontFamily: FONT_MONO,
  },

  textInput: {
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 8, padding: '8px 12px',
    color: '#f1f5f9',
    fontFamily: FONT_MONO, fontSize: 12, outline: 'none',
    width: 280,
  },
  keyInput: {
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 8, padding: '8px 12px',
    color: '#f1f5f9',
    fontFamily: FONT_MONO, fontSize: 12, outline: 'none',
    width: 320,
    transition: 'all 0.2s',
  },
  tag: {
    fontFamily: FONT_MONO, fontSize: 10,
    padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
  },

  vault: {
    marginTop: 16, padding: '14px 16px',
    border: '1px dashed rgba(77,230,240,0.3)', borderRadius: 10,
    background: 'rgba(77,230,240,0.04)',
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center',
  },
  vaultH: { fontSize: 12, fontWeight: 600, color: '#4de6f0', marginBottom: 3 },
  vaultB: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontFamily: FONT_MONO },
};
