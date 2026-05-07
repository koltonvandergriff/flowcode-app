import { useState, useCallback, useEffect, useMemo } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import flowadeLogo from '../../assets/flowade-logo-256.png';

const STEP_COUNT = 4;
const CARD_WIDTH = 530;

const SHELLS = [
  { value: 'powershell.exe', label: 'PowerShell' },
  { value: 'bash', label: 'Bash' },
  { value: 'cmd.exe', label: 'Command Prompt' },
  { value: 'wsl.exe', label: 'WSL' },
];

function buildFeatures(colors) {
  return [
  {
    title: 'Multi-Terminal Layouts',
    desc: 'Run 1-4 terminals side by side with flexible grid layouts.',
    color: colors.accent.green,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: 'Voice Input',
    desc: 'Speak commands with Whisper-powered voice transcription.',
    color: colors.accent.purple,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  {
    title: 'Git Integration',
    desc: 'Built-in file activity panel with diff viewer and status.',
    color: colors.accent.amber,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 012 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    ),
  },
  {
    title: 'Keyboard Shortcuts',
    desc: 'Ctrl+T new terminal, Ctrl+W close, Ctrl+D danger toggle.',
    color: colors.accent.cyan,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="6" y1="8" x2="6" y2="8" />
        <line x1="10" y1="8" x2="10" y2="8" />
        <line x1="14" y1="8" x2="14" y2="8" />
        <line x1="18" y1="8" x2="18" y2="8" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <line x1="8" y1="16" x2="16" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Danger Mode',
    desc: 'Skip permission prompts for rapid iteration when you need speed.',
    color: colors.accent.pink,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Code Editor',
    desc: 'Built-in Monaco editor with file tree, tabs, and syntax highlighting.',
    color: colors.accent.green,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'Mobile Notifications',
    desc: 'Get push alerts for builds, tests, and crashes on your phone.',
    color: colors.accent.cyan,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  ];
}

function SecretInput({ value, onChange, placeholder, focused, onFocus, onBlur }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      background: colors.bg.raised, border: `1px solid ${focused ? colors.border.focus : colors.border.subtle}`,
      borderRadius: 8, transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxShadow: focused ? `0 0 0 3px ${colors.border.focus}20` : 'none',
    }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          all: 'unset', flex: 1, padding: '10px 40px 10px 14px',
          fontSize: 13, color: colors.text.primary, fontFamily: FONTS.mono,
          caretColor: colors.accent.green, width: '100%', boxSizing: 'border-box',
        }}
      />
      <button onClick={() => setVisible(!visible)} style={{
        all: 'unset', cursor: 'pointer', position: 'absolute', right: 10,
        fontSize: 10, fontWeight: 700, color: colors.text.ghost, fontFamily: FONTS.mono,
        letterSpacing: 0.5, padding: '2px 4px', borderRadius: 3,
        transition: 'color 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = colors.text.secondary; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.ghost; }}
      title={visible ? 'Hide' : 'Show'}>
        {visible ? 'HIDE' : 'SHOW'}
      </button>
    </div>
  );
}

function StepIndicator({ current, total }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 24 : 8,
          height: 8,
          borderRadius: 4,
          background: i === current
            ? `linear-gradient(135deg, ${colors.accent.purple}, ${colors.accent.cyan})`
            : i < current
              ? colors.accent.purple + '60'
              : colors.border.subtle,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      ))}
    </div>
  );
}

function NavButton({ children, onClick, variant = 'default', disabled = false }) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const base = {
    all: 'unset',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isPrimary ? '0 28px' : isGhost ? '0 12px' : '0 20px',
    height: isPrimary ? 42 : 36,
    borderRadius: isPrimary ? 10 : 8,
    fontSize: isPrimary ? 14 : 13,
    fontWeight: isPrimary ? 600 : 500,
    fontFamily: FONTS.body,
    letterSpacing: isPrimary ? 0.5 : 0.3,
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.5 : 1,
  };

  if (isPrimary) {
    return (
      <button onClick={disabled ? undefined : onClick} style={{
        ...base,
        background: `linear-gradient(135deg, ${colors.accent.cyan}, ${colors.accent.blue})`,
        color: '#0f1623',
        boxShadow: `0 4px 16px ${colors.accent.cyan}30, 0 1px 4px rgba(0,0,0,0.2)`,
      }}>
        {children}
      </button>
    );
  }

  if (isGhost) {
    return (
      <button onClick={disabled ? undefined : onClick} style={{
        ...base,
        background: 'transparent',
        color: colors.text.muted,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = colors.text.secondary; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.muted; }}
      >
        {children}
      </button>
    );
  }

  return (
    <button onClick={disabled ? undefined : onClick} style={{
      ...base,
      background: colors.bg.overlay,
      color: colors.text.secondary,
      border: `1px solid ${colors.border.subtle}`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = colors.border.focus;
      e.currentTarget.style.color = colors.text.primary;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = colors.border.subtle;
      e.currentTarget.style.color = colors.text.secondary;
    }}
    >
      {children}
    </button>
  );
}

/* ==================== STEP COMPONENTS ==================== */

function StepWelcome({ onNext }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '12px 0' }}>
      {/* Logo */}
      <div style={{
        width: 72, height: 72, borderRadius: 16, overflow: 'hidden',
        boxShadow: `0 8px 32px ${colors.accent.cyan}35, 0 2px 8px rgba(0,0,0,0.3)`,
      }}>
        <img src={flowadeLogo} alt="FlowADE" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* Heading */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: colors.text.primary,
          fontFamily: FONTS.display, margin: 0, letterSpacing: 2,
        }}>
          Welcome to FlowADE
        </h1>
        <p style={{
          fontSize: 14, color: colors.text.muted, fontFamily: FONTS.body,
          margin: '12px 0 0', lineHeight: 1.6, maxWidth: 400,
        }}>
          Your AI-powered coding workspace. Multiple terminals, voice input, live preview — all in one place.
        </p>
      </div>

      {/* Decorative line */}
      <div style={{
        width: 60, height: 2, borderRadius: 1,
        background: `linear-gradient(90deg, ${colors.accent.purple}, ${colors.accent.cyan})`,
      }} />

      <NavButton variant="primary" onClick={onNext}>
        Get Started
      </NavButton>
    </div>
  );
}

function StepApiKeys({ onNext, onBack }) {
  const { colors } = useTheme();
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleNext = useCallback(async () => {
    setSaving(true);
    try {
      if (openaiKey.trim() && window.flowade?.env?.set) {
        await window.flowade.env.set('OPENAI_API_KEY', openaiKey.trim());
      }
      if (anthropicKey.trim() && window.flowade?.env?.set) {
        await window.flowade.env.set('ANTHROPIC_API_KEY', anthropicKey.trim());
      }
      setSaved(true);
      setTimeout(() => onNext(), 300);
    } catch {
      onNext();
    } finally {
      setSaving(false);
    }
  }, [openaiKey, anthropicKey, onNext]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{
          fontSize: 20, fontWeight: 600, color: colors.text.primary,
          fontFamily: FONTS.body, margin: 0, letterSpacing: 0.3,
        }}>
          Connect Your AI Providers
        </h2>
        <p style={{
          fontSize: 13, color: colors.text.muted, fontFamily: FONTS.body,
          margin: '8px 0 0', lineHeight: 1.5,
        }}>
          Add API keys to unlock voice transcription and direct AI sessions. You can always change these later in Settings.
        </p>
      </div>

      {/* OpenAI key */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{
          fontSize: 12, fontWeight: 500, color: colors.text.secondary,
          fontFamily: FONTS.body, letterSpacing: 0.3,
        }}>OpenAI API Key</label>
        <SecretInput
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          focused={focusedField === 'openai'}
          onFocus={() => setFocusedField('openai')}
          onBlur={() => setFocusedField(null)}
        />
        <span style={{ fontSize: 11, color: colors.text.dim, fontFamily: FONTS.body }}>
          Powers Whisper voice transcription
        </span>
      </div>

      {/* Anthropic key */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{
          fontSize: 12, fontWeight: 500, color: colors.text.secondary,
          fontFamily: FONTS.body, letterSpacing: 0.3,
        }}>Anthropic API Key</label>
        <SecretInput
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          placeholder="sk-ant-..."
          focused={focusedField === 'anthropic'}
          onFocus={() => setFocusedField('anthropic')}
          onBlur={() => setFocusedField(null)}
        />
        <span style={{ fontSize: 11, color: colors.text.dim, fontFamily: FONTS.body }}>
          Claude API access for direct sessions
        </span>
      </div>

      {/* Security note */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderRadius: 8, background: colors.accent.green + '08',
        border: `1px solid ${colors.accent.green}20`,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span style={{ fontSize: 11, color: colors.text.muted, fontFamily: FONTS.body, lineHeight: 1.4 }}>
          Keys are stored locally on your machine only. They are never sent to our servers.
        </span>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <NavButton onClick={onBack}>Back</NavButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavButton variant="ghost" onClick={onNext}>Skip for now</NavButton>
          <NavButton variant="primary" onClick={handleNext} disabled={saving}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Next'}
          </NavButton>
        </div>
      </div>
    </div>
  );
}

function StepWorkspace({ onNext, onBack }) {
  const { colors } = useTheme();
  const [shell, setShell] = useState('powershell.exe');
  const [cwd, setCwd] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [saving, setSaving] = useState(false);

  const handlePickFolder = useCallback(async () => {
    try {
      if (window.flowade?.dialog?.pickFolder) {
        const folder = await window.flowade.dialog.pickFolder();
        if (folder) setCwd(folder);
      }
    } catch {
      // user cancelled
    }
  }, []);

  const handleNext = useCallback(async () => {
    setSaving(true);
    try {
      const set = window.flowade?.settings?.set;
      if (set) {
        await set('defaultShell', shell);
        if (cwd) await set('defaultCwd', cwd);
        await set('terminalFontSize', fontSize);
      }
      onNext();
    } catch {
      onNext();
    } finally {
      setSaving(false);
    }
  }, [shell, cwd, fontSize, onNext]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{
          fontSize: 20, fontWeight: 600, color: colors.text.primary,
          fontFamily: FONTS.body, margin: 0, letterSpacing: 0.3,
        }}>
          Set Up Your Workspace
        </h2>
        <p style={{
          fontSize: 13, color: colors.text.muted, fontFamily: FONTS.body,
          margin: '8px 0 0', lineHeight: 1.5,
        }}>
          Configure your default terminal environment. These can be changed anytime in Settings.
        </p>
      </div>

      {/* Default shell */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{
          fontSize: 12, fontWeight: 500, color: colors.text.secondary,
          fontFamily: FONTS.body, letterSpacing: 0.3,
        }}>Default Shell</label>
        <select
          value={shell}
          onChange={(e) => setShell(e.target.value)}
          style={{
            background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
            borderRadius: 8, padding: '10px 14px', color: colors.text.primary,
            fontSize: 13, fontFamily: FONTS.mono, outline: 'none',
            cursor: 'pointer', appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239899b3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
          }}
        >
          {SHELLS.map((s) => (
            <option key={s.value} value={s.value} style={{ background: colors.bg.surface }}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Default working directory */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{
          fontSize: 12, fontWeight: 500, color: colors.text.secondary,
          fontFamily: FONTS.body, letterSpacing: 0.3,
        }}>Default Working Directory</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
            borderRadius: 8, padding: '0 14px', minHeight: 40,
          }}>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="C:\Users\you\projects"
              style={{
                all: 'unset', flex: 1, fontSize: 13,
                color: colors.text.primary, fontFamily: FONTS.mono,
                caretColor: colors.accent.green,
              }}
            />
          </div>
          <button onClick={handlePickFolder} style={{
            all: 'unset', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 8,
            background: colors.bg.overlay, border: `1px solid ${colors.border.subtle}`,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.focus; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; }}
          title="Browse for folder"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Font size slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{
            fontSize: 12, fontWeight: 500, color: colors.text.secondary,
            fontFamily: FONTS.body, letterSpacing: 0.3,
          }}>Terminal Font Size</label>
          <span style={{
            fontSize: 13, fontWeight: 600, color: colors.accent.purple,
            fontFamily: FONTS.mono,
          }}>{fontSize}px</span>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min={10}
            max={20}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{
              width: '100%', height: 6, appearance: 'none', outline: 'none',
              borderRadius: 3, cursor: 'pointer',
              background: `linear-gradient(to right, ${colors.accent.purple} 0%, ${colors.accent.purple} ${((fontSize - 10) / 10) * 100}%, ${colors.border.subtle} ${((fontSize - 10) / 10) * 100}%, ${colors.border.subtle} 100%)`,
            }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 4,
          }}>
            <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: FONTS.mono }}>10px</span>
            <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: FONTS.mono }}>20px</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <NavButton onClick={onBack}>Back</NavButton>
        <NavButton variant="primary" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving...' : 'Next'}
        </NavButton>
      </div>
    </div>
  );
}

function StepTour({ onComplete, onBack }) {
  const { colors } = useTheme();
  const features = buildFeatures(colors);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 600, color: colors.text.primary,
          fontFamily: FONTS.body, margin: 0, letterSpacing: 0.3,
        }}>
          You're All Set!
        </h2>
        <p style={{
          fontSize: 13, color: colors.text.muted, fontFamily: FONTS.body,
          margin: '8px 0 0', lineHeight: 1.5,
        }}>
          Here's what you can do with FlowADE.
        </p>
      </div>

      {/* Feature grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {features.map((feat) => (
          <div key={feat.title} style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: '14px 16px', borderRadius: 10,
            background: colors.bg.raised,
            border: `1px solid ${colors.border.subtle}`,
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = feat.color + '50';
            e.currentTarget.style.background = colors.bg.overlay;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border.subtle;
            e.currentTarget.style.background = colors.bg.raised;
          }}
          >
            <div style={{ color: feat.color, display: 'flex', alignItems: 'center', gap: 8 }}>
              {feat.icon}
              <span style={{
                fontSize: 12, fontWeight: 600, color: colors.text.primary,
                fontFamily: FONTS.body, letterSpacing: 0.2,
              }}>{feat.title}</span>
            </div>
            <span style={{
              fontSize: 11, color: colors.text.dim, fontFamily: FONTS.body,
              lineHeight: 1.4,
            }}>{feat.desc}</span>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <NavButton onClick={onBack}>Back</NavButton>
        <NavButton variant="primary" onClick={onComplete}>
          Start Building
        </NavButton>
      </div>
    </div>
  );
}

/* ==================== MAIN WIZARD ==================== */

export default function OnboardingWizard({ onComplete }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [animating, setAnimating] = useState(false);

  const goNext = useCallback(() => {
    if (animating) return;
    setDirection(1);
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
      setAnimating(false);
    }, 200);
  }, [animating]);

  const goBack = useCallback(() => {
    if (animating) return;
    setDirection(-1);
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setAnimating(false);
    }, 200);
  }, [animating]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('flowade_onboarding_complete', 'true');
    onComplete();
  }, [onComplete]);

  const stepLabels = ['Welcome', 'API Keys', 'Workspace', 'Quick Tour'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      fontFamily: FONTS.body,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -100, right: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.accent.purple}12 0%, transparent 70%)`,
        pointerEvents: 'none',
        animation: 'fc-onboard-glow 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 350, height: 350, borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.accent.green}10 0%, transparent 70%)`,
        pointerEvents: 'none',
        animation: 'fc-onboard-glow 8s ease-in-out infinite',
        animationDelay: '3s',
      }} />

      {/* Card */}
      <div style={{
        width: CARD_WIDTH, maxHeight: '90vh',
        background: colors.bg.surface,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, padding: '32px 32px 24px',
        boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 ${colors.border.subtle}40`,
        display: 'flex', flexDirection: 'column', gap: 24,
        overflow: 'auto',
        animation: 'fc-onboard-appear 0.4s ease-out',
        zIndex: 1,
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <StepIndicator current={step} total={STEP_COUNT} />
          <span style={{
            fontSize: 10, fontWeight: 700, color: colors.text.ghost,
            fontFamily: FONTS.mono, letterSpacing: 1.5, textTransform: 'uppercase',
          }}>
            {stepLabels[step]}
          </span>
        </div>

        {/* Step content */}
        <div style={{
          opacity: animating ? 0 : 1,
          transform: animating ? `translateX(${direction * 20}px)` : 'translateX(0)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}>
          {step === 0 && <StepWelcome onNext={goNext} />}
          {step === 1 && <StepApiKeys onNext={goNext} onBack={goBack} />}
          {step === 2 && <StepWorkspace onNext={goNext} onBack={goBack} />}
          {step === 3 && <StepTour onComplete={handleComplete} onBack={goBack} />}
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fc-onboard-appear {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fc-onboard-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        /* Range input thumb styling */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${colors.accent.purple};
          border: 2px solid ${colors.bg.surface};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          margin-top: -5px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${colors.accent.purple};
          border: 2px solid ${colors.bg.surface};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
