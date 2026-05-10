// Glasshouse Terminals page. Cosmetic wrapper around the existing
// TerminalGrid — full feature parity (multi-pane, providers, danger flags,
// resize handles, focus management) is preserved. Adds page header + a
// glassy outer frame so the grid sits in the same visual language as the
// rest of the glasshouse views.
//
// "Open in browser" sits in the page header. The TerminalPane already
// scans output for dev-server URLs and dispatches `flowade:openInBrowser`
// when one appears — we listen for that event, remember the freshest URL,
// and offer a one-click external launch via shell.openExternal. Manual
// URL entry is also supported via a small popover for cases the detector
// misses.

import { useState, useEffect, useRef } from 'react';
import TerminalGrid from '../TerminalGrid';
import ErrorBoundary from '../ErrorBoundary';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const STORAGE_LAST_URL = 'flowade.glass.lastPreviewUrl';

function smartUrl(input) {
  const t = input.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (/^localhost(:\d+)?(\/|$)|^127\.|^\d+\.\d+\.\d+\.\d+/.test(t)) return 'http://' + t;
  return '';
}

function shortLabel(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname && u.pathname !== '/' ? u.pathname : '');
  } catch { return url; }
}

export default function TerminalsGlasshouse({ dangerFlags = {}, onToggleDanger = () => {} }) {
  // Last detected dev-server URL (or the last manual entry). Persisted so
  // the button keeps offering one-click reopen across page navigation.
  const [previewUrl, setPreviewUrl] = useState(() => {
    try { return localStorage.getItem(STORAGE_LAST_URL) || ''; } catch { return ''; }
  });
  const [openerOpen, setOpenerOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const popRef = useRef(null);

  // Wire up the preview-URL pipeline. TerminalPane fires
  // 'flowade:openInBrowser' on detection; we just stash the URL.
  useEffect(() => {
    const handler = (e) => {
      const url = e.detail?.url;
      if (!url) return;
      setPreviewUrl(url);
      try { localStorage.setItem(STORAGE_LAST_URL, url); } catch {}
    };
    window.addEventListener('flowade:openInBrowser', handler);
    return () => window.removeEventListener('flowade:openInBrowser', handler);
  }, []);

  // Click-outside dismissal for the manual-URL popover.
  useEffect(() => {
    if (!openerOpen) return;
    const onDoc = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpenerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openerOpen]);

  const launch = (url) => {
    const final = smartUrl(url);
    if (!final) return false;
    window.flowade?.shell?.openExternal?.(final);
    setPreviewUrl(final);
    try { localStorage.setItem(STORAGE_LAST_URL, final); } catch {}
    return true;
  };

  return (
    <div style={s.root}>
      <div style={s.head}>
        <div style={s.headTextWrap}>
          <h1 style={s.h1}>Terminals</h1>
          <p style={s.sub}>Multi-pane shell · split, focus, swap providers — same engine as before, polished chrome.</p>
        </div>

        <div style={s.headChips}>
          <span style={s.chip}>
            <span style={s.dot} /> Live
          </span>
          <span style={s.chipMute}>⌘ T to spawn</span>

          <div style={{ position: 'relative' }} ref={popRef}>
            {previewUrl ? (
              <button
                onClick={() => launch(previewUrl)}
                onContextMenu={(e) => { e.preventDefault(); setOpenerOpen(true); setManualInput(previewUrl); }}
                title={`Open ${previewUrl} in your default browser (right-click to edit)`}
                style={s.openBtn}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(77,230,240,0.6)'; e.currentTarget.style.background = 'rgba(77,230,240,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(77,230,240,0.35)'; e.currentTarget.style.background = 'rgba(77,230,240,0.06)'; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
                  <path d="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" />
                </svg>
                <span>Open</span>
                <span style={s.openHost}>{shortLabel(previewUrl)}</span>
              </button>
            ) : (
              <button
                onClick={() => setOpenerOpen(o => !o)}
                title="Open a URL in your default browser"
                style={s.openBtn}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(77,230,240,0.6)'; e.currentTarget.style.background = 'rgba(77,230,240,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(77,230,240,0.35)'; e.currentTarget.style.background = 'rgba(77,230,240,0.06)'; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
                  <path d="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" />
                </svg>
                <span>Open in browser</span>
              </button>
            )}

            {openerOpen && (
              <div style={s.popover}>
                <div style={s.popHead}>
                  <span style={s.popHeadLabel}>Open URL</span>
                  <span style={s.popHeadHint}>Esc to dismiss</span>
                </div>
                <input
                  autoFocus
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { if (launch(manualInput)) setOpenerOpen(false); }
                    if (e.key === 'Escape') setOpenerOpen(false);
                  }}
                  placeholder="localhost:3000"
                  spellCheck={false}
                  style={s.popInput}
                />
                <div style={s.popHelp}>Launches in your default system browser.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={s.frame}>
        <ErrorBoundary name="Glasshouse · Terminals">
          <TerminalGrid dangerFlags={dangerFlags} onToggleDanger={onToggleDanger} />
        </ErrorBoundary>
      </div>
    </div>
  );
}

const s = {
  root: {
    flex: 1, padding: '24px 24px 18px',
    display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0,
  },
  head: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 14, marginBottom: 16,
  },
  headTextWrap: { minWidth: 0 },
  h1: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 28, letterSpacing: '-0.03em', margin: '0 0 4px',
  },
  sub: {
    fontSize: 12, color: '#94a3b8',
    margin: 0, fontFamily: FONT_MONO, lineHeight: 1.5,
  },
  headChips: { display: 'flex', alignItems: 'center', gap: 8 },
  chip: {
    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
    padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(77,230,240,0.3)', background: 'rgba(77,230,240,0.06)',
    color: '#4de6f0',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    letterSpacing: '0.05em',
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#4de6f0',
    boxShadow: '0 0 8px #4de6f0',
  },
  chipMute: {
    fontFamily: FONT_MONO, fontSize: 10,
    padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    letterSpacing: '0.05em',
  },

  openBtn: {
    all: 'unset', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '4px 12px', borderRadius: 99,
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.06)',
    color: '#4de6f0',
    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.05em',
    transition: 'background 0.15s, border-color 0.15s',
  },
  openHost: {
    color: '#88f0d8',
    opacity: 0.85,
    fontWeight: 500,
    maxWidth: 180,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  popover: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    width: 280,
    background: 'rgba(8,8,18,0.92)',
    border: '1px solid rgba(77,230,240,0.18)',
    borderRadius: 10,
    boxShadow: '0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
    backdropFilter: 'blur(16px)',
    padding: 12,
    zIndex: 30,
  },
  popHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 8,
  },
  popHeadLabel: {
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 700,
    letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0',
  },
  popHeadHint: {
    fontFamily: FONT_MONO, fontSize: 9,
    color: '#4a5168', letterSpacing: '0.1em',
  },
  popInput: {
    all: 'unset',
    boxSizing: 'border-box',
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    fontFamily: FONT_MONO, fontSize: 12,
    color: '#f1f5f9',
  },
  popHelp: {
    marginTop: 8,
    fontFamily: FONT_MONO, fontSize: 10, color: '#6b7a90',
    lineHeight: 1.5,
  },

  // Glassy outer container — matches the panel chrome on Overview / Memory /
  // Pricing pages so the terminal grid feels native to the glasshouse shell.
  frame: {
    flex: 1, minHeight: 0, minWidth: 0,
    position: 'relative',
    background: 'rgba(8, 8, 18, 0.55)',
    border: '1px solid rgba(77,230,240,0.07)',
    borderRadius: 14,
    backdropFilter: 'blur(16px) saturate(1.15)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.04),' +
      'inset 0 0 0 1px rgba(77,230,240,0.04),' +
      '0 16px 48px rgba(0,0,0,0.4)',
    padding: 12,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
};
