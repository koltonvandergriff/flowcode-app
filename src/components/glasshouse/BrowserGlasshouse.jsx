// Glasshouse-native preview browser. Replaces the classic BrowserPanel inside
// the glasshouse shell so the chrome matches the rest of the app — glass dark
// surface, cyan accents, mono fonts, subtle hover states.
//
// Same wiring as the legacy panel: webview element with did-navigate /
// did-stop-loading / page-title-updated listeners, plus the
// `flowade:openInBrowser` window event for terminal "Open in browser" links.

import { useState, useEffect, useRef, useCallback } from 'react';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const CY = '#4de6f0';
const CY_DEEP = '#1aa9bc';
const TXT = '#f1f5f9';
const TXT_DIM = '#94a3b8';
const TXT_GHOST = '#4a5168';
const BG_GLASS = 'rgba(8, 8, 18, 0.65)';
const BG_RAISED = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(77,230,240,0.12)';
const BORDER_SUBTLE = 'rgba(255,255,255,0.06)';

function smartUrl(input) {
  const s = input.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^localhost|^127\.|^\d+\.\d+\.\d+\.\d+|^[\w-]+\.\w{2,}/.test(s)) return 'http://' + s;
  return 'https://www.google.com/search?q=' + encodeURIComponent(s);
}

export default function BrowserGlasshouse({ open, onToggle, width: propWidth }) {
  const webviewRef = useRef(null);
  const [url, setUrl] = useState('https://www.google.com');
  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [focused, setFocused] = useState(false);

  const navigate = useCallback((next) => {
    const final = smartUrl(next);
    if (!final) return;
    setUrl(final);
    setInputUrl(final);
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const onNav = () => {
      setInputUrl(wv.getURL());
      setCanGoBack(wv.canGoBack());
      setCanGoForward(wv.canGoForward());
    };
    const onTitle = (e) => setTitle(e.title);
    const onStart = () => setLoading(true);
    const onStop = () => { setLoading(false); onNav(); };
    wv.addEventListener('did-navigate', onNav);
    wv.addEventListener('did-navigate-in-page', onNav);
    wv.addEventListener('page-title-updated', onTitle);
    wv.addEventListener('did-start-loading', onStart);
    wv.addEventListener('did-stop-loading', onStop);
    return () => {
      wv.removeEventListener('did-navigate', onNav);
      wv.removeEventListener('did-navigate-in-page', onNav);
      wv.removeEventListener('page-title-updated', onTitle);
      wv.removeEventListener('did-start-loading', onStart);
      wv.removeEventListener('did-stop-loading', onStop);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.url) navigate(e.detail.url);
    };
    window.addEventListener('flowade:openInBrowser', handler);
    return () => window.removeEventListener('flowade:openInBrowser', handler);
  }, [navigate]);

  if (!open) {
    return (
      <button
        onClick={onToggle}
        title="Open preview browser"
        style={s.rail}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(77,230,240,0.3)'; e.currentTarget.style.color = CY; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TXT_DIM; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <span style={s.railLabel}>PREVIEW</span>
      </button>
    );
  }

  const width = propWidth || 500;

  return (
    <div style={{ ...s.shell, width }}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <NavBtn label="back" disabled={!canGoBack} onClick={() => webviewRef.current?.goBack()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </NavBtn>
        <NavBtn label="forward" disabled={!canGoForward} onClick={() => webviewRef.current?.goForward()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </NavBtn>
        <NavBtn
          label={loading ? 'stop' : 'reload'}
          onClick={() => loading ? webviewRef.current?.stop() : webviewRef.current?.reload()}
        >
          {loading ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
          )}
        </NavBtn>

        <div style={{
          ...s.urlBox,
          borderColor: focused ? 'rgba(77,230,240,0.45)' : BORDER_SUBTLE,
          boxShadow: focused ? '0 0 0 3px rgba(77,230,240,0.08)' : 'none',
        }}>
          {loading ? (
            <span style={s.loadDot} />
          ) : (
            <span style={s.lockMark}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </span>
          )}
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); navigate(inputUrl); } }}
            onFocus={(e) => { setFocused(true); e.target.select(); }}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            style={s.urlInput}
          />
        </div>

        {!window.flowade?.window?.isPopout?.() && (
          <NavBtn
            label="popout"
            onClick={() => {
              window.flowade?.window?.popoutPanel('browser', { width: 1000, height: 700 });
              onToggle();
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
              <path d="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" />
            </svg>
          </NavBtn>
        )}
        <NavBtn label="close" onClick={onToggle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </NavBtn>
      </div>

      {/* Tab strip */}
      <div style={s.tab}>
        <span style={s.tabPill}>
          <span style={s.tabDot} />
          <span style={s.tabLabel}>{title || 'New tab'}</span>
        </span>
      </div>

      {/* Webview */}
      <div style={s.viewWrap}>
        {loading && <div style={s.progressBar} />}
        <webview
          ref={webviewRef}
          src={url}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          allowpopups="true"
        />
      </div>

      {/* Footer status */}
      <div style={s.foot}>
        <span style={s.footMark}>◉</span>
        <span style={s.footText}>{loading ? 'loading…' : (canGoBack || canGoForward ? 'history loaded' : 'idle')}</span>
        <span style={s.footSep}>·</span>
        <span style={s.footUrl} title={inputUrl}>{shortHost(inputUrl)}</span>
      </div>
    </div>
  );
}

function shortHost(u) {
  try { return new URL(u).host || u; } catch { return u; }
}

function NavBtn({ children, label, onClick, disabled }) {
  const base = disabled ? TXT_GHOST : TXT_DIM;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        all: 'unset',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        width: 28, height: 28, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: base,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(77,230,240,0.08)'; e.currentTarget.style.color = CY; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = base; }}
    >
      {children}
    </button>
  );
}

const s = {
  // Closed-state vertical rail. Same width pattern the classic shell used so
  // surrounding flex math doesn't shift when the user toggles open.
  rail: {
    all: 'unset',
    cursor: 'pointer',
    width: 36, minWidth: 36,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'flex-start',
    gap: 10,
    padding: '14px 0',
    background: BG_GLASS,
    borderLeft: `1px solid ${BORDER}`,
    backdropFilter: 'blur(14px) saturate(1.15)',
    color: TXT_DIM,
    transition: 'border-color 0.15s, color 0.15s',
  },
  railLabel: {
    writingMode: 'vertical-rl',
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 700,
    letterSpacing: '0.32em', textTransform: 'uppercase',
    color: 'inherit',
    marginTop: 4,
  },

  // Open-state shell.
  shell: {
    minWidth: 300,
    display: 'flex', flexDirection: 'column',
    background: BG_GLASS,
    borderLeft: `1px solid ${BORDER}`,
    backdropFilter: 'blur(16px) saturate(1.2)',
    overflow: 'hidden',
    boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.03), -8px 0 28px rgba(0,0,0,0.35)',
  },

  toolbar: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '8px 8px 8px 10px',
    borderBottom: `1px solid ${BORDER_SUBTLE}`,
    flexShrink: 0,
  },

  urlBox: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
    height: 28, padding: '0 10px',
    background: BG_RAISED,
    border: '1px solid',
    borderRadius: 7,
    minWidth: 0,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  urlInput: {
    all: 'unset',
    flex: 1,
    fontFamily: FONT_MONO, fontSize: 11.5,
    color: TXT, padding: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  lockMark: {
    color: CY_DEEP,
    display: 'inline-flex', alignItems: 'center',
  },
  loadDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: CY,
    boxShadow: `0 0 8px ${CY}`,
    animation: 'flowadeBrowserPulse 1s ease-in-out infinite',
  },

  tab: {
    display: 'flex', alignItems: 'center',
    padding: '6px 10px',
    borderBottom: `1px solid ${BORDER_SUBTLE}`,
    background: 'rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  tabPill: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    maxWidth: '100%',
    padding: '4px 10px 4px 8px',
    background: 'rgba(77,230,240,0.05)',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    fontFamily: FONT_MONO, fontSize: 10.5,
    color: TXT,
    minWidth: 0,
  },
  tabDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: CY, boxShadow: `0 0 6px ${CY}`,
    flexShrink: 0,
  },
  tabLabel: {
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  viewWrap: {
    flex: 1, minHeight: 0,
    position: 'relative',
    background: '#fff',
  },
  progressBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: `linear-gradient(90deg, transparent, ${CY}, transparent)`,
    backgroundSize: '200% 100%',
    animation: 'flowadeBrowserScan 1.2s linear infinite',
    zIndex: 2,
    pointerEvents: 'none',
  },

  foot: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px',
    borderTop: `1px solid ${BORDER_SUBTLE}`,
    fontFamily: FONT_MONO, fontSize: 9,
    color: TXT_GHOST,
    background: 'rgba(0,0,0,0.3)',
    flexShrink: 0,
    letterSpacing: '0.04em',
  },
  footMark: { color: CY_DEEP, fontSize: 7 },
  footText: { color: TXT_DIM },
  footSep: { color: TXT_GHOST, opacity: 0.5 },
  footUrl: {
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    flex: 1, textAlign: 'right',
    color: TXT_GHOST,
  },
};
