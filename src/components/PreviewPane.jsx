import { useState, useRef, useCallback, useEffect } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;

/**
 * PreviewPane — renders an iframe pointing at a detected dev-server URL.
 *
 * Props:
 *   url       {string}   The URL to load
 *   onClose   {function} Collapse the preview back into the terminal
 *   onPopout  {function} Request a pop-out window for the preview
 */
export default function PreviewPane({ url, onClose, onPopout }) {
  const { colors } = useTheme();
  const [currentUrl, setCurrentUrl] = useState(url);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(url);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef(null);
  const checkTimerRef = useRef(null);

  // Sync when parent URL changes
  useEffect(() => {
    setCurrentUrl(url);
    setUrlInput(url);
    setLoading(true);
    setError(false);
  }, [url]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(false);
    if (iframeRef.current) {
      try {
        iframeRef.current.src = currentUrl;
      } catch {
        setError(true);
        setLoading(false);
      }
    }
  }, [currentUrl]);

  const handleUrlSubmit = useCallback(() => {
    let finalUrl = urlInput.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'http://' + finalUrl;
    }
    if (finalUrl) {
      setCurrentUrl(finalUrl);
      setLoading(true);
      setError(false);
    }
    setEditingUrl(false);
  }, [urlInput]);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  // Poll to verify the URL is reachable when in error state
  useEffect(() => {
    if (!error) return;
    checkTimerRef.current = setInterval(() => {
      fetch(currentUrl, { mode: 'no-cors' })
        .then(() => {
          setError(false);
          setLoading(true);
          if (iframeRef.current) iframeRef.current.src = currentUrl;
        })
        .catch(() => { /* still down */ });
    }, 3000);
    return () => clearInterval(checkTimerRef.current);
  }, [error, currentUrl]);

  const handlePopout = useCallback(() => {
    if (onPopout) {
      onPopout(currentUrl);
    }
    // Also dispatch a custom event for the main app to handle
    window.dispatchEvent(new CustomEvent('flowade:previewPopout', {
      detail: { url: currentUrl },
    }));
  }, [currentUrl, onPopout]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, minWidth: 200, minHeight: 0,
      background: colors.bg.base,
      borderLeft: `1px solid ${colors.border.subtle}`,
    }}>
      {/* URL bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 8px',
        background: colors.bg.overlay,
        borderBottom: `1px solid ${colors.border.subtle}`,
        flexShrink: 0,
      }}>
        {/* Status dot */}
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: error ? colors.status.error : loading ? colors.status.warning : colors.status.success,
          transition: 'background .3s',
        }} />

        {/* Editable URL */}
        {editingUrl ? (
          <input
            autoFocus
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit();
              if (e.key === 'Escape') { setEditingUrl(false); setUrlInput(currentUrl); }
            }}
            style={{
              flex: 1, minWidth: 0,
              background: colors.bg.surface,
              border: `1px solid ${colors.border.focus}`,
              borderRadius: 4, padding: '3px 8px',
              color: colors.text.primary, fontSize: 10, fontFamily: fc,
              outline: 'none',
            }}
          />
        ) : (
          <span
            onClick={() => { setUrlInput(currentUrl); setEditingUrl(true); }}
            style={{
              flex: 1, minWidth: 0, cursor: 'text',
              fontSize: 10, fontFamily: fc, color: colors.text.dim,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '3px 8px', borderRadius: 4,
              background: colors.bg.surface,
              border: `1px solid transparent`,
            }}
            title={currentUrl}
          >
            {currentUrl}
          </span>
        )}

        {/* Refresh button */}
        <button onClick={handleRefresh} style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', width: 22, height: 22, borderRadius: 4,
          background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
          color: colors.text.dim, transition: 'all .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.cyan; e.currentTarget.style.color = colors.accent.cyan; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
        title="Refresh">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Pop-out button */}
        <button onClick={handlePopout} style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', width: 22, height: 22, borderRadius: 4,
          background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
          color: colors.text.dim, transition: 'all .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.purple; e.currentTarget.style.color = colors.accent.purple; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
        title="Pop out">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>

        {/* Close button */}
        <button onClick={onClose} style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', width: 22, height: 22, borderRadius: 4,
          background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
          color: colors.text.dim, fontSize: 12, fontFamily: fc,
          transition: 'all .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.status.error; e.currentTarget.style.color = colors.status.error; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
        title="Close preview">
          &#10005;
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* Loading overlay */}
        {loading && !error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: `${colors.bg.base}cc`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: `2px solid ${colors.border.subtle}`,
              borderTopColor: colors.accent.cyan,
              animation: 'previewSpin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.dim }}>
              Loading preview...
            </span>
            <style>{`
              @keyframes previewSpin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: colors.bg.base,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 10, padding: 24,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.status.error} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span style={{ fontSize: 12, fontFamily: fc, fontWeight: 600, color: colors.text.secondary }}>
              Cannot reach server
            </span>
            <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.ghost, textAlign: 'center' }}>
              {currentUrl}
            </span>
            <span style={{ fontSize: 9, fontFamily: fc, color: colors.text.ghost }}>
              Retrying automatically...
            </span>
            <button onClick={handleRefresh} style={{
              all: 'unset', cursor: 'pointer', marginTop: 4,
              fontSize: 10, fontWeight: 700, fontFamily: fc,
              padding: '6px 16px', borderRadius: 6,
              background: colors.bg.surface, color: colors.accent.cyan,
              border: `1px solid ${colors.border.subtle}`,
            }}>
              RETRY NOW
            </button>
          </div>
        )}

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Dev Server Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          style={{
            width: '100%', height: '100%',
            border: 'none', background: '#fff',
            display: error ? 'none' : 'block',
          }}
        />
      </div>
    </div>
  );
}
