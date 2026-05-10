// Glasshouse notification center. Top-center toast stack that slides
// down from the topbar, glass dark + green accent, used for terminal
// completion alerts when a pane finishes a prompt in the background.
//
// Subscribes to the `flowade:terminalComplete` event dispatched from
// TerminalPane's busy → complete transition. Configurable via
// `flowade.notify.terminalDone` (Settings → Notifications); when '0' the
// center is fully silent. Default: enabled.
//
// Each banner auto-dismisses after BANNER_TTL_MS; hovering pauses the
// timer so users can read longer alerts. Click dismisses immediately and
// also fires `flowade:focusTerminal` so future shell features can jump
// to the offending pane (no listener yet — graceful no-op).

import { useEffect, useState, useRef, useCallback } from 'react';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const BANNER_TTL_MS = 6000;
const MAX_BANNERS = 4;
const PREF_KEY = 'flowade.notify.terminalDone';

function isEnabled() {
  try {
    const v = localStorage.getItem(PREF_KEY);
    // Default: enabled when unset.
    return v === null || v === '1';
  } catch { return true; }
}

export default function NotificationCenter() {
  const [banners, setBanners] = useState([]);
  const [pausedIds, setPausedIds] = useState(new Set());
  const timersRef = useRef(new Map()); // id -> { remaining, lastTick }

  const dismiss = useCallback((id) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    const t = timersRef.current.get(id);
    if (t?.timeout) clearTimeout(t.timeout);
    timersRef.current.delete(id);
  }, []);

  const scheduleDismiss = useCallback((id, ms) => {
    const existing = timersRef.current.get(id);
    if (existing?.timeout) clearTimeout(existing.timeout);
    const lastTick = Date.now();
    const timeout = setTimeout(() => dismiss(id), ms);
    timersRef.current.set(id, { remaining: ms, lastTick, timeout });
  }, [dismiss]);

  useEffect(() => {
    const handler = (e) => {
      if (!isEnabled()) return;
      const { terminalId, label, provider, at } = e.detail || {};
      const id = `${terminalId}-${at || Date.now()}`;
      setBanners(prev => {
        // De-dupe rapid bursts from the same pane.
        const filtered = prev.filter(b => b.terminalId !== terminalId);
        const next = [...filtered, { id, terminalId, label: label || 'Terminal', provider, at: at || Date.now() }];
        return next.slice(-MAX_BANNERS);
      });
      scheduleDismiss(id, BANNER_TTL_MS);
    };
    window.addEventListener('flowade:terminalComplete', handler);
    return () => window.removeEventListener('flowade:terminalComplete', handler);
  }, [scheduleDismiss]);

  // Pause timer while hovered, resume on leave.
  const pause = (id) => {
    const t = timersRef.current.get(id);
    if (!t || !t.timeout) return;
    clearTimeout(t.timeout);
    const elapsed = Date.now() - t.lastTick;
    t.remaining = Math.max(0, t.remaining - elapsed);
    t.timeout = null;
    setPausedIds(s => { const n = new Set(s); n.add(id); return n; });
  };
  const resume = (id) => {
    const t = timersRef.current.get(id);
    if (!t) return;
    scheduleDismiss(id, t.remaining > 0 ? t.remaining : 2000);
    setPausedIds(s => { const n = new Set(s); n.delete(id); return n; });
  };

  if (banners.length === 0) return null;

  return (
    <div style={s.layer}>
      {banners.map(b => (
        <button
          key={b.id}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('flowade:focusTerminal', { detail: { terminalId: b.terminalId } }));
            dismiss(b.id);
          }}
          onMouseEnter={() => pause(b.id)}
          onMouseLeave={() => resume(b.id)}
          style={s.banner}
        >
          <span style={s.iconWrap}>
            <span style={s.iconCheck}>✓</span>
            <span style={s.iconGlow} />
          </span>
          <div style={s.body}>
            <div style={s.head}>
              <span style={s.headTag}>PROMPT DONE</span>
              <span style={s.headSep}>·</span>
              <span style={s.headTime}>{relTime(b.at)}</span>
            </div>
            <div style={s.title}>
              <span style={s.titleLabel}>{b.label}</span>
              {b.provider && <span style={s.titleProvider}>{b.provider}</span>}
            </div>
          </div>
          <span style={s.dismiss} aria-hidden>✕</span>
          {!pausedIds.has(b.id) && <span style={s.ttlBar} />}
        </button>
      ))}
    </div>
  );
}

function relTime(at) {
  const diff = Math.max(0, Date.now() - at);
  if (diff < 4000) return 'just now';
  return `${Math.floor(diff / 1000)}s ago`;
}

const s = {
  layer: {
    position: 'fixed',
    top: 56, // sits below the 48px topbar
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', gap: 8,
    zIndex: 200,
    pointerEvents: 'none',
    width: 380,
    maxWidth: 'calc(100vw - 48px)',
  },
  banner: {
    all: 'unset', cursor: 'pointer',
    pointerEvents: 'auto',
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px 10px 12px',
    background: 'rgba(8, 8, 18, 0.78)',
    border: '1px solid rgba(88,224,168,0.32)',
    borderRadius: 12,
    backdropFilter: 'blur(18px) saturate(1.2)',
    boxShadow:
      '0 14px 40px rgba(0,0,0,0.55),' +
      '0 0 28px rgba(88,224,168,0.12),' +
      'inset 0 1px 0 rgba(255,255,255,0.04)',
    color: '#f1f5f9',
    overflow: 'hidden',
    animation: 'flowadeNotifySlide 260ms cubic-bezier(.22,1,.36,1)',
  },
  iconWrap: {
    position: 'relative',
    width: 28, height: 28, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  iconCheck: {
    position: 'relative', zIndex: 1,
    fontFamily: FONT_DISP, fontSize: 14, fontWeight: 800,
    color: '#58e0a8',
    textShadow: '0 0 8px rgba(88,224,168,0.6)',
  },
  iconGlow: {
    position: 'absolute', inset: 0,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(88,224,168,0.35) 0%, transparent 65%)',
    filter: 'blur(2px)',
  },
  body: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  head: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: FONT_TECH, fontSize: 8.5, fontWeight: 700,
    letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#58e0a8',
  },
  headTag: {},
  headSep: { color: '#3b4760', letterSpacing: 0 },
  headTime: { color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 500 },
  title: {
    display: 'flex', alignItems: 'baseline', gap: 6,
    fontFamily: FONT_MONO, fontSize: 12,
    color: '#f1f5f9',
    overflow: 'hidden',
  },
  titleLabel: {
    fontWeight: 700,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    flex: '0 1 auto', minWidth: 0,
  },
  titleProvider: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
    color: '#88f0d8', textTransform: 'uppercase',
    padding: '1px 6px', borderRadius: 99,
    background: 'rgba(77,230,240,0.08)',
    border: '1px solid rgba(77,230,240,0.18)',
  },
  dismiss: {
    flexShrink: 0,
    width: 18, height: 18, borderRadius: 4,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, color: '#6b7a90',
    fontFamily: FONT_MONO,
  },
  ttlBar: {
    position: 'absolute', bottom: 0, left: 0, height: 2,
    width: '100%',
    background: 'linear-gradient(90deg, rgba(88,224,168,0.55), rgba(77,230,240,0.4))',
    transformOrigin: 'left center',
    animation: `flowadeNotifyTtl ${BANNER_TTL_MS}ms linear forwards`,
  },
};
