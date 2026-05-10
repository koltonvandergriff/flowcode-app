import { useState, useContext, useEffect } from 'react';
import { FONTS, PROVIDERS } from '../lib/constants';
import { PALETTES } from '../lib/themes';
import { useTheme } from '../hooks/useTheme';
import { SettingsContext } from '../contexts/SettingsContext';

const fc = FONTS.mono;

const SHELLS = [
  { value: 'powershell.exe', label: 'PowerShell' },
  { value: 'cmd.exe', label: 'Command Prompt' },
  { value: 'bash', label: 'Bash' },
  { value: 'wsl.exe', label: 'WSL' },
];

const API_PROVIDERS = [
  { key: 'OPENAI_API_KEY', label: 'OpenAI', desc: 'Powers Whisper voice transcription & ChatGPT sessions', placeholder: 'sk-...' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic', desc: 'Claude API access for direct API sessions', placeholder: 'sk-ant-...' },
];

const GITHUB_FIELDS = [
  { key: 'GITHUB_PAT', label: 'Personal Access Token', placeholder: 'ghp_...', secret: true },
  { key: 'GITHUB_DEFAULT_ORG', label: 'Default Org / User', placeholder: 'your-org' },
  { key: 'GITHUB_DEFAULT_REPO', label: 'Default Repository', placeholder: 'your-repo' },
];

function SecretInput({ value, onChange, placeholder, colors }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          flex: 1, background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
          borderRadius: 6, padding: '8px 36px 8px 12px', color: '#fff', fontSize: 13,
          fontFamily: fc, outline: 'none', width: '100%',
        }}
      />
      <button onClick={() => setVisible(!visible)} style={{
        all: 'unset', cursor: 'pointer', position: 'absolute', right: 8,
        fontSize: 11, color: colors.text.ghost, fontFamily: fc,
      }} title={visible ? 'Hide' : 'Show'}>
        {visible ? 'HIDE' : 'SHOW'}
      </button>
    </div>
  );
}

function SectionHeader({ children, colors }) {
  return (
    <h3 style={{
      fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc,
      letterSpacing: 1.5, margin: 0, paddingBottom: 12,
      borderBottom: `1px solid ${colors.border.subtle}`,
    }}>{children}</h3>
  );
}

function StatusDot({ active, colors }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: active ? colors.status.success : colors.border.subtle,
    }} />
  );
}

export default function SettingsPanel({ open, onClose, onLogout }) {
  const { colors, paletteName, setPalette, themeName, toggleTheme } = useTheme();
  const { settings, updateSetting } = useContext(SettingsContext);
  const [cwdInput, setCwdInput] = useState(settings?.defaultCwd || '');
  const [tab, setTab] = useState('general');
  const [envKeys, setEnvKeys] = useState({});
  const [envDirty, setEnvDirty] = useState({});
  const [ghTest, setGhTest] = useState(null);

  useEffect(() => {
    if (open && window.flowade?.env) {
      window.flowade.env.getAll().then((keys) => {
        setEnvKeys(keys);
        setEnvDirty({});
      });
    }
  }, [open]);

  if (!open || !settings) return null;

  const selectStyle = {
    background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
    borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13,
    fontFamily: fc, outline: 'none', width: '100%', cursor: 'pointer',
  };

  const updateEnvKey = (key, value) => {
    setEnvKeys((prev) => ({ ...prev, [key]: value }));
    setEnvDirty((prev) => ({ ...prev, [key]: true }));
  };

  const saveEnvKey = async (key) => {
    await window.flowade?.env.set(key, envKeys[key] || '');
    setEnvDirty((prev) => ({ ...prev, [key]: false }));
  };

  const saveAllEnv = async () => {
    const dirtyPairs = {};
    for (const key of Object.keys(envDirty)) {
      if (envDirty[key]) dirtyPairs[key] = envKeys[key] || '';
    }
    if (Object.keys(dirtyPairs).length > 0) {
      await window.flowade?.env.setMany(dirtyPairs);
      setEnvDirty({});
    }
  };

  const testGitHub = async () => {
    setGhTest('testing');
    try {
      const token = envKeys.GITHUB_PAT;
      if (!token) { setGhTest('missing'); return; }
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (res.ok) {
        const data = await res.json();
        setGhTest(`connected:${data.login}`);
      } else {
        setGhTest('failed');
      }
    } catch {
      setGhTest('error');
    }
  };

  const hasDirty = Object.values(envDirty).some(Boolean);

  const tabs = [
    { id: 'general', label: 'GENERAL' },
    { id: 'appearance', label: 'APPEARANCE' },
    { id: 'apikeys', label: 'API KEYS' },
    { id: 'github', label: 'GITHUB' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, width: 560, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 28px 0', flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: FONTS.display, letterSpacing: 1, color: '#fff', margin: 0 }}>
            Settings
          </h2>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim, padding: '0 4px',
          }}>&#10005;</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, padding: '16px 28px 0', flexShrink: 0,
          borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              fontFamily: fc, letterSpacing: 1.5, padding: '8px 16px',
              color: tab === t.id ? colors.accent.purple : colors.text.dim,
              borderBottom: `2px solid ${tab === t.id ? colors.accent.purple : 'transparent'}`,
              marginBottom: -1, transition: 'all .2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px 28px' }}>

          {/* General tab */}
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                  DEFAULT SHELL
                </label>
                <select value={settings.defaultShell} onChange={(e) => updateSetting('defaultShell', e.target.value)} style={selectStyle}>
                  {SHELLS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                  DEFAULT PROVIDER
                </label>
                <select value={settings.defaultProvider} onChange={(e) => updateSetting('defaultProvider', e.target.value)} style={selectStyle}>
                  {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                  DEFAULT WORKING DIRECTORY
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={cwdInput} onChange={(e) => setCwdInput(e.target.value)}
                    onBlur={() => updateSetting('defaultCwd', cwdInput)}
                    placeholder="Leave empty for ~/Desktop/Claude" style={{ ...selectStyle, flex: 1, cursor: 'text' }} />
                  <button onClick={async () => {
                    const folder = await window.flowade?.dialog.pickFolder(cwdInput);
                    if (folder) { setCwdInput(folder); updateSetting('defaultCwd', folder); }
                  }} style={{
                    all: 'unset', cursor: 'pointer', padding: '8px 14px', borderRadius: 6,
                    background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, color: colors.text.dim, fontSize: 14,
                  }} title="Browse...">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                  TERMINAL FONT SIZE — {settings.fontSize}px
                </label>
                <input type="range" min="10" max="20" step="1" value={settings.fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: colors.accent.green }} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 4 }}>
                      LEAN MODE BY DEFAULT
                    </label>
                    <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc }}>
                      Auto-enable on new Claude CLI terminals. Compresses AI responses to trim tokens (~30-50% typical, more at higher intensity).
                    </span>
                  </div>
                  <button onClick={() => updateSetting('leanDefault', !(settings.leanDefault ?? settings.cavemanDefault))} style={{
                    all: 'unset', cursor: 'pointer', width: 36, height: 18, borderRadius: 9, position: 'relative',
                    background: (settings.leanDefault ?? settings.cavemanDefault) ? '#4de6f0' : colors.border.subtle,
                    transition: 'background .25s ease', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', position: 'absolute', top: 2,
                      left: (settings.leanDefault ?? settings.cavemanDefault) ? 20 : 2,
                      background: (settings.leanDefault ?? settings.cavemanDefault) ? '#001014' : colors.text.dim,
                      transition: 'left .25s ease',
                    }} />
                  </button>
                </div>
              </div>

              <div style={{ paddingTop: 8, borderTop: `1px solid ${colors.border.subtle}` }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, marginBottom: 12 }}>
                  KEYBOARD SHORTCUTS
                </h3>
                <p style={{ fontSize: 11, color: colors.text.dim, fontFamily: fc, margin: '0 0 10px' }}>
                  Shortcuts can be customized from the Keyboard Shortcuts panel in the header toolbar.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, fontFamily: fc }}>
                  {[
                    ['Ctrl+T', 'New terminal'],
                    ['Ctrl+W', 'Close terminal'],
                    ['Ctrl+1-4', 'Switch layout'],
                    ['Ctrl+Tab', 'Cycle focus'],
                    ['Ctrl+Shift+D', 'Toggle danger'],
                    ['Ctrl+,', 'Settings'],
                  ].map(([key, desc]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: colors.accent.purple, fontWeight: 600 }}>{key}</span>
                      <span style={{ color: colors.text.dim }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <div style={{ paddingTop: 16, borderTop: `1px solid ${colors.border.subtle}` }}>
                <button onClick={() => { onClose(); onLogout?.(); }} style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, width: '100%', padding: '10px 0',
                  borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: fc,
                  letterSpacing: 1, color: colors.status.error || '#E74C3C',
                  border: `1px solid ${colors.status.error || '#E74C3C'}40`,
                  background: `${colors.status.error || '#E74C3C'}08`,
                  transition: 'all .2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${colors.status.error || '#E74C3C'}15`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${colors.status.error || '#E74C3C'}08`; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  LOG OUT
                </button>
              </div>
            </div>
          )}

          {/* Appearance tab */}
          {tab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 12 }}>
                  THEME MODE
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['dark', 'light'].map(mode => (
                    <button key={mode} onClick={() => { if (themeName !== mode) toggleTheme(); }} style={{
                      all: 'unset', cursor: 'pointer', flex: 1, padding: '10px 16px',
                      borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 600,
                      fontFamily: fc, letterSpacing: 0.5, transition: 'all .2s',
                      background: themeName === mode ? (colors.accent.primary + '20') : colors.bg.surface,
                      border: `1px solid ${themeName === mode ? colors.accent.primary : colors.border.subtle}`,
                      color: themeName === mode ? colors.accent.primary : colors.text.dim,
                    }}>
                      {mode === 'dark' ? '\u{1F319} Dark' : '☀️ Light'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 12 }}>
                  COLOR PALETTE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Object.entries(PALETTES).map(([key, palette]) => {
                    const active = paletteName === key;
                    return (
                      <button key={key} onClick={() => setPalette(key)} style={{
                        all: 'unset', cursor: 'pointer', padding: '10px 12px',
                        borderRadius: 8, transition: 'all .2s',
                        background: active ? (palette.accent.primary + '18') : colors.bg.surface,
                        border: `1.5px solid ${active ? palette.accent.primary : colors.border.subtle}`,
                      }}>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                          {[palette.accent.primary, palette.accent.secondary, palette.accent.green, palette.accent.pink].map((c, i) => (
                            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                          ))}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
                          color: active ? palette.accent.primary : colors.text.dim,
                          textTransform: 'capitalize',
                        }}>{key}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, marginBottom: 8 }}>
                  PREVIEW
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['primary', 'secondary', 'green', 'purple', 'amber', 'cyan', 'pink', 'blue'].map(key => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: colors.accent[key] }} />
                      <span style={{ fontSize: 8, color: colors.text.ghost, fontFamily: fc }}>{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API Keys tab */}
          {tab === 'apikeys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: colors.bg.surface, borderRadius: 8, border: `1px solid ${colors.border.subtle}`,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span style={{ fontSize: 11, color: colors.text.muted, fontFamily: fc, lineHeight: 1.4 }}>
                  Credentials are stored locally on your machine only. They are never uploaded, synced, or backed up to any server.
                </span>
              </div>

              {API_PROVIDERS.map((p) => (
                <div key={p.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <StatusDot active={!!envKeys[p.key]} colors={colors} />
                    <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1 }}>
                      {p.label.toUpperCase()}
                    </label>
                    {envDirty[p.key] && (
                      <span style={{ fontSize: 9, color: colors.status.warning, fontFamily: fc }}>unsaved</span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc, display: 'block', marginBottom: 6 }}>
                    {p.desc}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <SecretInput
                        value={envKeys[p.key] || ''}
                        onChange={(e) => updateEnvKey(p.key, e.target.value)}
                        placeholder={p.placeholder}
                        colors={colors}
                      />
                    </div>
                    {envDirty[p.key] && (
                      <button onClick={() => saveEnvKey(p.key)} style={{
                        all: 'unset', cursor: 'pointer', padding: '8px 14px', borderRadius: 6,
                        background: colors.accent.green, color: '#fff', fontSize: 11,
                        fontWeight: 700, fontFamily: fc,
                      }}>SAVE</button>
                    )}
                  </div>
                </div>
              ))}

              {hasDirty && (
                <button onClick={saveAllEnv} style={{
                  all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px',
                  borderRadius: 8, fontFamily: fc, fontSize: 11, fontWeight: 700, color: '#fff',
                  background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
                  boxShadow: `0 2px 8px ${colors.accent.green}30`,
                }}>SAVE ALL CHANGES</button>
              )}
            </div>
          )}

          {/* GitHub tab */}
          {tab === 'github' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: colors.bg.surface, borderRadius: 8, border: `1px solid ${colors.border.subtle}`,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span style={{ fontSize: 11, color: colors.text.muted, fontFamily: fc, lineHeight: 1.4 }}>
                  GitHub credentials are stored locally on your machine only.
                </span>
              </div>

              {GITHUB_FIELDS.map((f) => (
                <div key={f.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <StatusDot active={!!envKeys[f.key]} colors={colors} />
                    <label style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1 }}>
                      {f.label.toUpperCase()}
                    </label>
                    {envDirty[f.key] && (
                      <span style={{ fontSize: 9, color: colors.status.warning, fontFamily: fc }}>unsaved</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      {f.secret ? (
                        <SecretInput
                          value={envKeys[f.key] || ''}
                          onChange={(e) => updateEnvKey(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          colors={colors}
                        />
                      ) : (
                        <input
                          value={envKeys[f.key] || ''}
                          onChange={(e) => updateEnvKey(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          style={{
                            width: '100%', background: colors.bg.surface,
                            border: `1px solid ${colors.border.subtle}`, borderRadius: 6,
                            padding: '8px 12px', color: '#fff', fontSize: 13,
                            fontFamily: fc, outline: 'none',
                          }}
                        />
                      )}
                    </div>
                    {envDirty[f.key] && (
                      <button onClick={() => saveEnvKey(f.key)} style={{
                        all: 'unset', cursor: 'pointer', padding: '8px 14px', borderRadius: 6,
                        background: colors.accent.green, color: '#fff', fontSize: 11,
                        fontWeight: 700, fontFamily: fc,
                      }}>SAVE</button>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ paddingTop: 8, borderTop: `1px solid ${colors.border.subtle}` }}>
                <button onClick={testGitHub} disabled={ghTest === 'testing'} style={{
                  all: 'unset', cursor: ghTest === 'testing' ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 8, fontFamily: fc, fontSize: 11, fontWeight: 700,
                  background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                  color: colors.text.secondary, transition: 'all .2s',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
                  </svg>
                  {ghTest === 'testing' ? 'TESTING...' : 'TEST CONNECTION'}
                </button>

                {ghTest && ghTest !== 'testing' && (
                  <div style={{
                    marginTop: 10, padding: '8px 14px', borderRadius: 6, fontSize: 11,
                    fontFamily: fc, fontWeight: 600,
                    background: ghTest.startsWith('connected') ? '#2ECC7115' : '#E74C3C15',
                    color: ghTest.startsWith('connected') ? colors.status.success : colors.status.error,
                    border: `1px solid ${ghTest.startsWith('connected') ? '#2ECC7130' : '#E74C3C30'}`,
                  }}>
                    {ghTest.startsWith('connected')
                      ? `Connected as ${ghTest.split(':')[1]}`
                      : ghTest === 'missing' ? 'No token configured — enter a Personal Access Token above'
                      : ghTest === 'failed' ? 'Authentication failed — check your token'
                      : 'Connection error — check your network'}
                  </div>
                )}
              </div>

              {hasDirty && (
                <button onClick={saveAllEnv} style={{
                  all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px',
                  borderRadius: 8, fontFamily: fc, fontSize: 11, fontWeight: 700, color: '#fff',
                  background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
                  boxShadow: `0 2px 8px ${colors.accent.green}30`,
                }}>SAVE ALL CHANGES</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
