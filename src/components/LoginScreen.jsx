import { useState, useCallback, useMemo } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { login, signup, resetPassword } from '../lib/authService';
import flowadeLogo from '../../assets/flowade-logo-256.png';

const orb = FONTS.display;
const mono = FONTS.mono;

export default function LoginScreen({ onAuthenticated }) {
  const { colors } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMessage('Password reset link sent! Check your email.');
        setLoading(false);
        return;
      }
      if (mode === 'signup') {
        await signup(email, password, name);
      } else {
        await login(email, password, rememberMe);
      }
      onAuthenticated();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, name, rememberMe, mode, onAuthenticated]);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  }, []);

  const s = useMemo(() => buildStyles(colors), [colors]);

  const titleText = mode === 'forgot' ? 'Reset password' : mode === 'signup' ? 'Create account' : 'Welcome back';
  const subtitleText = mode === 'forgot' ? 'Enter your email to receive a reset link' : mode === 'signup' ? 'Sign up for a new workspace' : 'Sign in to your workspace';
  const submitLabel = mode === 'forgot' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Sign In';
  const loadingLabel = mode === 'forgot' ? 'Sending...' : mode === 'signup' ? 'Creating account...' : 'Signing in...';

  return (
    <div style={s.root}>
      <div style={s.glowTopRight} />
      <div style={s.glowBottomLeft} />
      <div style={s.gridOverlay} />

      <div style={s.container}>
        <div style={s.logoSection}>
          <div style={s.logoBox}>
            <img src={flowadeLogo} alt="FlowADE" style={s.logoImg} />
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>{titleText}</h2>
            <p style={s.cardSubtitle}>{subtitleText}</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            {error && (
              <div style={s.errorBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.status.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div style={s.successBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div style={s.fieldGroup}>
                <label style={s.label}>Name</label>
                <div style={{
                  ...s.inputWrapper,
                  borderColor: focusedField === 'name' ? colors.border.focus : colors.border.subtle,
                  boxShadow: focusedField === 'name' ? `0 0 0 3px ${colors.border.focus}20` : 'none',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'name' ? colors.text.secondary : colors.text.dim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                    placeholder="Your name" style={s.input} autoComplete="name" autoFocus />
                </div>
              </div>
            )}

            <div style={s.fieldGroup}>
              <label style={s.label}>Email</label>
              <div style={{
                ...s.inputWrapper,
                borderColor: focusedField === 'email' ? colors.border.focus : colors.border.subtle,
                boxShadow: focusedField === 'email' ? `0 0 0 3px ${colors.border.focus}20` : 'none',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'email' ? colors.text.secondary : colors.text.dim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="22,4 12,13 2,4" />
                </svg>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com" style={s.input} autoComplete="email" autoFocus={mode !== 'signup'} />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div style={s.fieldGroup}>
                <div style={s.labelRow}>
                  <label style={s.label}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')} style={s.forgotLink}>Forgot password?</button>
                  )}
                </div>
                <div style={{
                  ...s.inputWrapper,
                  borderColor: focusedField === 'password' ? colors.border.focus : colors.border.subtle,
                  boxShadow: focusedField === 'password' ? `0 0 0 3px ${colors.border.focus}20` : 'none',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'password' ? colors.text.secondary : colors.text.dim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                    style={s.input} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div style={s.rememberRow}>
                <label style={s.checkboxLabel} onClick={() => setRememberMe(!rememberMe)}>
                  <div style={{
                    ...s.checkbox,
                    background: rememberMe ? `linear-gradient(135deg, ${colors.accent.cyan}, ${colors.accent.blue})` : 'transparent',
                    borderColor: rememberMe ? 'transparent' : colors.border.subtle,
                  }}>
                    {rememberMe && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={s.checkboxText}>Remember me</span>
                </label>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? (
                <div style={s.spinnerContainer}>
                  <div style={s.spinner} />
                  <span>{loadingLabel}</span>
                </div>
              ) : (
                <span style={s.submitBtnText}>{submitLabel}</span>
              )}
            </button>
          </form>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine} />
          </div>

          <div style={s.createAccountRow}>
            {mode === 'login' && (
              <>
                <span style={s.createAccountText}>Don't have an account?</span>
                <button type="button" onClick={() => switchMode('signup')} style={s.createAccountLink}>Create Account</button>
              </>
            )}
            {mode === 'signup' && (
              <>
                <span style={s.createAccountText}>Already have an account?</span>
                <button type="button" onClick={() => switchMode('login')} style={s.createAccountLink}>Sign In</button>
              </>
            )}
            {mode === 'forgot' && (
              <>
                <span style={s.createAccountText}>Remember your password?</span>
                <button type="button" onClick={() => switchMode('login')} style={s.createAccountLink}>Back to Sign In</button>
              </>
            )}
          </div>
        </div>

        <p style={s.legal}>
          By signing in you agree to our{' '}
          <span onClick={() => {}} style={s.legalLink}>Terms of Service</span>{' '}
          and{' '}
          <span onClick={() => {}} style={s.legalLink}>Privacy Policy</span>
        </p>

        <div style={s.versionTag}>
          <span>v{window.flowade?.version || '0.1.0'}</span>
          <span style={{ margin: '0 6px', color: colors.text.ghost }}>|</span>
          <span>DutchMade Co.</span>
        </div>
      </div>

      <style>{`
        @keyframes fc-spin { to { transform: rotate(360deg); } }
        @keyframes fc-fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-glow-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

function buildStyles(c) {
  return {
    root: {
      fontFamily: FONTS.body, background: c.bg.base, color: c.text.primary,
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative', WebkitAppRegion: 'drag',
    },
    glowTopRight: {
      position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%',
      background: `radial-gradient(circle, ${c.accent.cyan}15 0%, transparent 70%)`,
      pointerEvents: 'none', animation: 'fc-glow-pulse 6s ease-in-out infinite',
    },
    glowBottomLeft: {
      position: 'absolute', bottom: -100, left: -100, width: 350, height: 350, borderRadius: '50%',
      background: `radial-gradient(circle, ${c.accent.green}12 0%, transparent 70%)`,
      pointerEvents: 'none', animation: 'fc-glow-pulse 8s ease-in-out infinite', animationDelay: '3s',
    },
    gridOverlay: {
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `linear-gradient(${c.border.subtle}08 1px, transparent 1px), linear-gradient(90deg, ${c.border.subtle}08 1px, transparent 1px)`,
      backgroundSize: '60px 60px',
    },
    container: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      zIndex: 1, WebkitAppRegion: 'no-drag', animation: 'fc-fade-in 0.5s ease-out',
    },
    logoSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
    logoBox: {
      width: 100, height: 100, borderRadius: 20,
      overflow: 'hidden',
      boxShadow: `0 8px 32px ${c.accent.cyan}35, 0 2px 8px rgba(0,0,0,0.3)`,
    },
    logoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    card: {
      width: 380, background: c.bg.surface, border: `1px solid ${c.border.subtle}`,
      borderRadius: 16, padding: '32px 28px 28px',
      boxShadow: `0 16px 64px rgba(0,0,0,0.4), 0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 ${c.border.subtle}40`,
    },
    cardHeader: { marginBottom: 24 },
    cardTitle: { fontSize: 20, fontWeight: 600, color: c.text.primary, fontFamily: FONTS.body, margin: 0, letterSpacing: 0.3 },
    cardSubtitle: { fontSize: 13, color: c.text.muted, margin: '6px 0 0', fontFamily: FONTS.body },
    form: { display: 'flex', flexDirection: 'column', gap: 18 },
    errorBanner: {
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
      background: c.status.error + '12', border: `1px solid ${c.status.error}30`,
      fontSize: 12, color: c.status.error, fontFamily: FONTS.body,
    },
    successBanner: {
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
      background: c.accent.green + '12', border: `1px solid ${c.accent.green}30`,
      fontSize: 12, color: c.accent.green, fontFamily: FONTS.body,
    },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 500, color: c.text.secondary, fontFamily: FONTS.body, letterSpacing: 0.3 },
    labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    inputWrapper: {
      display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 44,
      background: c.bg.raised, border: `1px solid ${c.border.subtle}`, borderRadius: 10,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    input: {
      all: 'unset', flex: 1, fontSize: 13, color: c.text.primary, fontFamily: FONTS.body,
      lineHeight: '44px', caretColor: c.accent.green,
    },
    forgotLink: {
      all: 'unset', cursor: 'pointer', fontSize: 11, color: c.accent.cyan,
      fontFamily: FONTS.body, fontWeight: 500, letterSpacing: 0.2, transition: 'color 0.15s ease',
    },
    rememberRow: { display: 'flex', alignItems: 'center', marginTop: -4 },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' },
    checkbox: {
      width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${c.border.subtle}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', flexShrink: 0,
    },
    checkboxText: { fontSize: 12, color: c.text.muted, fontFamily: FONTS.body },
    submitBtn: {
      all: 'unset', boxSizing: 'border-box', width: '100%', height: 44, borderRadius: 10,
      background: `linear-gradient(135deg, ${c.accent.cyan}, ${c.accent.blue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      transition: 'opacity 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
      boxShadow: `0 4px 16px ${c.accent.cyan}30, 0 1px 4px rgba(0,0,0,0.2)`, marginTop: 4,
    },
    submitBtnText: { fontSize: 14, fontWeight: 600, color: '#0f1623', fontFamily: FONTS.body, letterSpacing: 0.5 },
    spinnerContainer: { display: 'flex', alignItems: 'center', gap: 8, color: '#0f1623', fontSize: 13, fontWeight: 600, fontFamily: FONTS.body },
    spinner: { width: 16, height: 16, border: '2px solid #0f162340', borderTopColor: '#0f1623', borderRadius: '50%', animation: 'fc-spin 0.6s linear infinite' },
    divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' },
    dividerLine: { flex: 1, height: 1, background: c.border.subtle },
    dividerText: { fontSize: 11, color: c.text.ghost, fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: 1 },
    createAccountRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    createAccountText: { fontSize: 13, color: c.text.muted, fontFamily: FONTS.body },
    createAccountLink: {
      all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: c.accent.cyan,
      fontFamily: FONTS.body, letterSpacing: 0.2, transition: 'color 0.15s ease',
    },
    legal: {
      fontSize: 11, color: c.text.ghost, fontFamily: FONTS.body, textAlign: 'center',
      lineHeight: 1.6, maxWidth: 320, margin: '4px 0 0',
    },
    legalLink: {
      color: c.text.dim, cursor: 'pointer', textDecoration: 'underline',
      textDecorationColor: c.text.ghost, textUnderlineOffset: 2, transition: 'color 0.15s ease',
    },
    versionTag: { fontSize: 10, color: c.text.ghost, fontFamily: mono, letterSpacing: 0.5, display: 'flex', alignItems: 'center' },
  };
}
