import { useState, useCallback } from 'react';
import { login, resetPassword } from '../../lib/authService';
import StarfieldBackground from './StarfieldBackground';
import logoFull from '../../assets/branding/logo-full.png';

// Glasshouse-themed login screen. Only handles sign-in + forgot-password —
// account creation routes to the onboarding wizard ("Create your free account
// →"). Calls the existing authService so the auth backend is unchanged.
export default function LoginScreenGlasshouse({ onAuthenticated, onStartSignup }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focused, setFocused] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'forgot') {
        await resetPassword(email);
        setSuccess('Password reset link sent. Check your email.');
      } else {
        await login(email, password, rememberMe);
        onAuthenticated();
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, rememberMe, onAuthenticated]);

  const isForgot = mode === 'forgot';

  return (
    <div style={s.root}>
      <StarfieldBackground />

      <div style={s.card}>
        <div style={s.brand}>
          <img src={logoFull} alt="FlowADE" style={s.logo} />
          <span style={s.tag}>a desktop dev workspace</span>
        </div>

        <h1 style={s.heading}>
          {isForgot ? <>Reset your <em style={s.em}>password.</em></> : <>Welcome <em style={s.em}>back.</em></>}
        </h1>
        <p style={s.lead}>
          {isForgot
            ? "Enter your email and we'll send you a reset link."
            : 'The terminal you keep coming back to. Sign in to pick up where every machine left off.'}
        </p>

        <form onSubmit={handleSubmit} style={s.form}>
          {error && <div style={{ ...s.banner, ...s.errorBanner }}>{error}</div>}
          {success && <div style={{ ...s.banner, ...s.successBanner }}>{success}</div>}

          <Field label="Email">
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              placeholder="you@dutchmade.co" autoComplete="email" autoFocus
              style={{ ...s.input, ...(focused === 'email' ? s.inputFocus : null) }}
            />
          </Field>

          {!isForgot && (
            <Field label="Password" right={
              <button type="button" onClick={() => { setMode('forgot'); setError(''); }} style={s.secondaryLink}>Forgot password?</button>
            }>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                placeholder="••••••••" autoComplete="current-password"
                style={{ ...s.input, ...(focused === 'password' ? s.inputFocus : null) }}
              />
            </Field>
          )}

          {!isForgot && (
            <label style={s.checkRow} onClick={() => setRememberMe(!rememberMe)}>
              <span style={{ ...s.checkBox, ...(rememberMe ? s.checkBoxOn : null) }}>
                {rememberMe && '✓'}
              </span>
              <span style={s.checkText}>Remember me</span>
            </label>
          )}

          <button type="submit" disabled={loading} style={{ ...s.primaryBtn, ...(loading ? s.btnLoading : null) }}>
            {loading ? (isForgot ? 'Sending…' : 'Signing in…') : (isForgot ? 'Send reset link' : 'Sign in')}
          </button>

          {!isForgot && (
            <>
              <div style={s.divider}>OR</div>
              <button type="button" style={s.ghostBtn}>Continue with GitHub</button>
            </>
          )}
        </form>

        <div style={s.foot}>
          {isForgot ? (
            <>Remember your password? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={s.cta}>Back to sign in →</button></>
          ) : (
            <>New to FlowADE? <button type="button" onClick={onStartSignup} style={s.cta}>Create your free account →</button></>
          )}
        </div>
      </div>

      <div style={s.legal}>
        By signing in you agree to our <span style={s.legalLink}>Terms of Service</span> and <span style={s.legalLink}>Privacy Policy</span>
      </div>
    </div>
  );
}

function Field({ label, right, children }) {
  return (
    <div style={s.fieldGroup}>
      <div style={s.fieldHead}>
        <span style={s.fieldLabel}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

const s = {
  root: {
    position: 'fixed', inset: 0,
    display: 'grid', placeItems: 'center',
    padding: '40px 20px',
    background: `
      radial-gradient(1200px 700px at 80% -20%, rgba(77,230,240,0.07), transparent 60%),
      radial-gradient(900px 600px at -10% 110%, rgba(77,230,240,0.04), transparent 60%),
      #06060c
    `,
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
    color: 'var(--gh-ink, #f1f5f9)',
    overflow: 'auto',
    zIndex: 0,
    WebkitAppRegion: 'drag',
  },
  card: {
    position: 'relative', zIndex: 2,
    width: '100%', maxWidth: 440, padding: 36,
    background: 'rgba(10, 14, 24, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
    borderRadius: 18,
    boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(77,230,240,0.04)',
    WebkitAppRegion: 'no-drag',
  },
  brand: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    margin: '-8px 0 18px',
  },
  logo: {
    width: 200, height: 200, objectFit: 'contain',
    filter: 'drop-shadow(0 0 22px rgba(77,230,240,0.25))',
    marginBottom: -10,
  },
  tag: {
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
    fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0', opacity: 0.85,
    padding: '4px 12px', border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.04)',
  },
  heading: {
    fontFamily: 'var(--gh-font-display, "Outfit", sans-serif)',
    fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05,
    margin: '0 0 8px',
  },
  em: { color: '#4de6f0', fontStyle: 'normal' },
  lead: {
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
    fontSize: 12.5, color: '#94a3b8',
    margin: '0 0 28px', lineHeight: 1.55,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
    color: '#4a5168',
  },
  input: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: 8, padding: '10px 12px',
    color: '#f1f5f9', fontSize: 13,
    fontFamily: 'var(--gh-font-mono, monospace)',
    outline: 'none', transition: 'border-color 0.15s, background 0.15s',
    width: '100%', boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: 'rgba(77,230,240,0.5)',
    background: 'rgba(77,230,240,0.04)',
  },
  banner: {
    padding: '10px 14px', borderRadius: 8,
    fontSize: 12, fontFamily: 'var(--gh-font-mono, monospace)',
  },
  errorBanner: {
    background: 'rgba(255,107,107,0.08)',
    border: '1px solid rgba(255,107,107,0.3)',
    color: '#ff6b6b',
  },
  successBanner: {
    background: 'rgba(88,224,168,0.08)',
    border: '1px solid rgba(88,224,168,0.3)',
    color: '#58e0a8',
  },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', userSelect: 'none', marginTop: -2,
  },
  checkBox: {
    width: 16, height: 16, borderRadius: 4,
    border: '1.5px solid rgba(255,255,255,0.13)',
    display: 'grid', placeItems: 'center',
    fontSize: 11, fontWeight: 700,
    transition: 'all 0.15s',
  },
  checkBoxOn: {
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    border: '1px solid #4de6f0',
    color: '#001014',
  },
  checkText: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 12, color: '#94a3b8',
  },
  primaryBtn: {
    all: 'unset', cursor: 'pointer',
    boxSizing: 'border-box', width: '100%',
    padding: 12, borderRadius: 9,
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    color: '#001014',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(77,230,240,0.25)',
    transition: 'transform 0.1s, box-shadow 0.2s',
    marginTop: 4,
  },
  btnLoading: { opacity: 0.7, cursor: 'wait' },
  ghostBtn: {
    all: 'unset', cursor: 'pointer',
    boxSizing: 'border-box', width: '100%',
    padding: 11, borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '8px 0 4px', color: '#4a5168',
    fontSize: 10, letterSpacing: '0.15em',
  },
  secondaryLink: {
    all: 'unset', cursor: 'pointer',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 11, color: '#4de6f0',
    fontWeight: 500,
  },
  foot: {
    marginTop: 18, fontSize: 11, color: '#4a5168',
    textAlign: 'center',
    fontFamily: 'var(--gh-font-mono, monospace)',
  },
  cta: {
    all: 'unset', cursor: 'pointer',
    color: '#4de6f0', fontSize: 11, fontWeight: 600,
  },
  legal: {
    position: 'relative', zIndex: 2, marginTop: 22,
    fontSize: 11, color: '#4a5168', textAlign: 'center',
    maxWidth: 380, lineHeight: 1.6,
    fontFamily: 'var(--gh-font-mono, monospace)',
  },
  legalLink: {
    color: '#94a3b8', cursor: 'pointer',
    textDecoration: 'underline', textUnderlineOffset: 2,
  },
};
