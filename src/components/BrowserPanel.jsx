import { useState, useEffect, useRef, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;
const fb = FONTS.body;

export default function BrowserPanel({ open, onToggle, width: propWidth }) {
  const { colors } = useTheme();
  const webviewRef = useRef(null);
  const [url, setUrl] = useState('https://www.google.com');
  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const navigate = useCallback((newUrl) => {
    let final = newUrl.trim();
    if (!final) return;
    if (!/^https?:\/\//i.test(final)) {
      if (/^localhost|^127\.|^\d+\.\d+\.\d+\.\d+|^[\w-]+\.\w{2,}/.test(final)) {
        final = 'http://' + final;
      } else {
        final = 'https://www.google.com/search?q=' + encodeURIComponent(final);
      }
    }
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
      const detail = e.detail;
      if (detail?.url) navigate(detail.url);
    };
    window.addEventListener('flowcode:openInBrowser', handler);
    return () => window.removeEventListener('flowcode:openInBrowser', handler);
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigate(inputUrl);
    }
  };

  const width = open ? (propWidth || 500) : 36;

  const navBtn = (label, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled} style={{
      all: 'unset', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 6, fontSize: 14,
      color: disabled ? colors.text.ghost : colors.text.dim,
      transition: 'all .12s',
      opacity: disabled ? 0.3 : 1,
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = colors.bg.overlay; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >{label}</button>
  );

  if (!open) {
    return (
      <div onClick={onToggle} style={{
        width: 36, minWidth: 36, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 0', gap: 8, cursor: 'pointer',
        background: colors.bg.glass || colors.bg.surface,
        borderLeft: `1px solid ${colors.border.subtle}`,
        borderRadius: '0 10px 10px 0',
      }} className="fc-glass">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text.dim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <span style={{
          writingMode: 'vertical-rl', fontSize: 9, fontWeight: 700,
          color: colors.text.dim, fontFamily: fb, letterSpacing: 1,
        }}>BROWSER</span>
      </div>
    );
  }

  return (
    <div className="fc-glass" style={{
      width, minWidth: 300, display: 'flex', flexDirection: 'column',
      background: colors.bg.glass || colors.bg.raised,
      borderLeft: `1px solid ${colors.border.subtle}`,
      borderRadius: '0 10px 10px 0', overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 8px', borderBottom: `1px solid ${colors.border.subtle}`,
        flexShrink: 0,
      }}>
        {navBtn('←', () => webviewRef.current?.goBack(), !canGoBack)}
        {navBtn('→', () => webviewRef.current?.goForward(), !canGoForward)}
        {navBtn(loading ? '✕' : '↻', () => {
          if (loading) webviewRef.current?.stop();
          else webviewRef.current?.reload();
        }, false)}

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: colors.bg.surface, borderRadius: 6,
          border: `1px solid ${colors.border.subtle}`,
          padding: '0 8px', minWidth: 0,
        }}>
          {loading && (
            <span style={{ fontSize: 8, color: colors.accent.primary || colors.accent.cyan, marginRight: 4, animation: 'glowPulse 1s infinite' }}>●</span>
          )}
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            style={{
              all: 'unset', flex: 1, fontSize: 11, fontFamily: fc,
              color: colors.text.secondary, padding: '5px 0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          />
        </div>

        {!window.flowcode?.window?.isPopout?.() && (
          <button onClick={() => {
            window.flowcode?.window?.popoutPanel('browser', { width: 1000, height: 700 });
            onToggle();
          }} title="Pop out browser" style={{
            all: 'unset', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            fontSize: 11, color: colors.text.dim,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
              <path d="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" />
            </svg>
          </button>
        )}
        <button onClick={onToggle} title="Close browser" style={{
          all: 'unset', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6,
          fontSize: 11, color: colors.text.dim,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >✕</button>
      </div>

      {/* Title bar */}
      {title && (
        <div style={{
          padding: '3px 12px', fontSize: 10, color: colors.text.dim, fontFamily: fb,
          borderBottom: `1px solid ${colors.border.subtle}`,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {title}
        </div>
      )}

      {/* Webview */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <webview
          ref={webviewRef}
          src={url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowpopups="true"
        />
      </div>
    </div>
  );
}
