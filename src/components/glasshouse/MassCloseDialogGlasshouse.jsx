// Mass-close dialog. Renders an overlay grid of all current panes; user
// taps cards to toggle keep/close. Confirm closes the marked set in one
// shot. Designed for the "I have 16 panes open and want 2" workflow.

import { useState, useEffect, useMemo } from 'react';
import { PROVIDERS } from '../../lib/constants';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

export default function MassCloseDialogGlasshouse({ open, terminals, focusedId, onApply, onCancel }) {
  // Decisions: id → 'keep' | 'close'
  const [decisions, setDecisions] = useState({});

  // Reset decisions whenever the dialog reopens. Default: keep the focused
  // pane, mark every other pane for close.
  useEffect(() => {
    if (!open) return;
    const next = {};
    for (const t of terminals) next[t.id] = t.id === focusedId ? 'keep' : 'close';
    setDecisions(next);
  }, [open, terminals, focusedId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmRef.apply?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const confirmRef = {};

  const stats = useMemo(() => {
    let keep = 0, close = 0;
    for (const id in decisions) decisions[id] === 'keep' ? keep++ : close++;
    return { keep, close };
  }, [decisions]);

  const toggle = (id) => setDecisions(d => ({ ...d, [id]: d[id] === 'keep' ? 'close' : 'keep' }));
  const allKeep   = () => setDecisions(Object.fromEntries(terminals.map(t => [t.id, 'keep'])));
  const allClose  = () => setDecisions(Object.fromEntries(terminals.map(t => [t.id, 'close'])));
  const onlyFocus = () => setDecisions(Object.fromEntries(terminals.map(t => [t.id, t.id === focusedId ? 'keep' : 'close'])));

  const apply = () => {
    const ids = Object.entries(decisions).filter(([, v]) => v === 'close').map(([k]) => k);
    onApply?.(ids);
  };
  confirmRef.apply = apply;

  if (!open) return null;

  return (
    <div style={s.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div style={s.card} role="dialog" aria-modal="true">
        <div style={s.head}>
          <div style={s.headLeft}>
            <span style={s.stamp}>manage panes</span>
            <h2 style={s.h}>Close panes <em style={s.em}>quickly.</em></h2>
            <p style={s.lead}>Tap a pane to toggle keep / close. Default: keep the focused pane, close the rest.</p>
          </div>
          <button onClick={onCancel} style={s.x} title="Cancel (Esc)">✕</button>
        </div>

        <div style={s.shortcuts}>
          <span style={s.shortcutsLabel}>Quick picks</span>
          <button onClick={onlyFocus}  style={s.shortcutBtn}>Only focused</button>
          <button onClick={allKeep}    style={s.shortcutBtn}>Keep all</button>
          <button onClick={allClose}   style={s.shortcutBtn}>Close all</button>
        </div>

        <div style={s.grid}>
          {terminals.map(t => {
            const d = decisions[t.id] || 'keep';
            const provDef = PROVIDERS.find(p => p.id === t.provider) || {};
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                style={{
                  ...s.tile,
                  ...(d === 'keep'  ? s.tileKeep  : null),
                  ...(d === 'close' ? s.tileClose : null),
                  ...(t.id === focusedId ? s.tileFocused : null),
                }}
                aria-pressed={d === 'keep'}
              >
                <div style={s.tileTop}>
                  <span style={{ ...s.tileDot, background: provDef.color || '#94a3b8' }} />
                  <span style={s.tileLabel}>{t.label || 'Untitled'}</span>
                  <span style={{ ...s.tileMark, ...(d === 'keep' ? s.tileMarkKeep : s.tileMarkClose) }}>
                    {d === 'keep' ? '✓' : '✕'}
                  </span>
                </div>
                <div style={s.tileMeta}>
                  <span>{provDef.name || t.provider || 'unknown'}</span>
                  {t.cwd && <span style={s.tileCwd} title={t.cwd}>{shortCwd(t.cwd)}</span>}
                </div>
                {t.id === focusedId && <span style={s.tileFocusBadge}>focused</span>}
                {t.dangerous && <span style={s.tileDangerBadge}>danger</span>}
                {t.pending && <span style={s.tilePendingBadge}>config…</span>}
              </button>
            );
          })}
        </div>

        <div style={s.foot}>
          <div style={s.statRow}>
            <span style={s.statKeep}><span style={{ ...s.statDot, background: '#4de6f0' }} /> {stats.keep} keep</span>
            <span style={s.statClose}><span style={{ ...s.statDot, background: '#ff6b6b' }} /> {stats.close} close</span>
            <span style={s.shortcutHint}>
              <kbd style={s.kbd}>Esc</kbd> cancel · <kbd style={s.kbd}>⌘ ⏎</kbd> apply · <kbd style={s.kbd}>⌘ ⌥ W</kbd> close all but focused
            </span>
          </div>
          <div style={s.actions}>
            <button onClick={onCancel} style={s.cancel}>Cancel</button>
            <button onClick={apply} disabled={stats.close === 0} style={{ ...s.confirm, ...(stats.close === 0 ? s.confirmDisabled : null) }}>
              Close {stats.close} pane{stats.close === 1 ? '' : 's'} ⏎
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function shortCwd(p) {
  if (!p) return '';
  const max = 28;
  if (p.length <= max) return p;
  const tail = p.slice(-max + 1);
  const slash = tail.indexOf(/[\\/]/);
  return '…' + (slash > 0 ? tail.slice(slash) : tail);
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9100,
    background: 'rgba(2, 2, 8, 0.55)',
    backdropFilter: 'blur(4px)',
    display: 'grid', placeItems: 'center',
    padding: 24,
    animation: 'mcdFade 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  card: {
    width: '100%', maxWidth: 840, maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    background: 'rgba(8, 8, 18, 0.85)',
    border: '1px solid rgba(77,230,240,0.15)',
    borderRadius: 16,
    backdropFilter: 'blur(20px) saturate(1.2)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(77,230,240,0.06)',
    color: '#f1f5f9', fontFamily: FONT_MONO,
    overflow: 'hidden',
  },
  head: {
    padding: '22px 26px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
  },
  headLeft: { minWidth: 0 },
  stamp: {
    display: 'inline-block', marginBottom: 12,
    fontFamily: FONT_TECH, fontSize: 9.5, fontWeight: 600,
    letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0',
    padding: '4px 10px',
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.05)',
  },
  h: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 26, letterSpacing: '-0.03em',
    margin: '0 0 6px', lineHeight: 1.05,
  },
  em: { fontStyle: 'normal', color: '#4de6f0', textShadow: '0 0 22px rgba(77,230,240,0.35)' },
  lead: { fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.55 },
  x: {
    all: 'unset', cursor: 'pointer', flexShrink: 0,
    width: 28, height: 28, borderRadius: 6,
    display: 'grid', placeItems: 'center',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.04)',
  },

  shortcuts: {
    padding: '12px 26px',
    display: 'flex', alignItems: 'center', gap: 8,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  shortcutsLabel: {
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 600,
    letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#94a3b8',
    marginRight: 6,
  },
  shortcutBtn: {
    all: 'unset', cursor: 'pointer',
    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
    padding: '5px 12px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8',
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
  },

  grid: {
    flex: 1, overflowY: 'auto',
    padding: 18,
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10,
  },
  tile: {
    all: 'unset', cursor: 'pointer', position: 'relative',
    padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex', flexDirection: 'column', gap: 6,
    transition: 'all 0.15s',
    minHeight: 76,
  },
  tileKeep: {
    border: '1px solid rgba(77,230,240,0.4)',
    background: 'rgba(77,230,240,0.06)',
    boxShadow: '0 0 18px rgba(77,230,240,0.1)',
  },
  tileClose: {
    border: '1px solid rgba(255,107,107,0.35)',
    background: 'rgba(255,107,107,0.05)',
    opacity: 0.78,
  },
  tileFocused: { outline: '2px solid rgba(77,230,240,0.25)', outlineOffset: 2 },
  tileTop: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  tileDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  tileLabel: {
    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontSize: 12, fontWeight: 600, color: '#f1f5f9',
    fontFamily: FONT_MONO,
  },
  tileMark: {
    width: 18, height: 18, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    fontSize: 10, fontWeight: 800, flexShrink: 0,
  },
  tileMarkKeep:  { background: '#4de6f0', color: '#001014' },
  tileMarkClose: { background: '#ff6b6b', color: '#1a0606' },
  tileMeta: {
    display: 'flex', gap: 6, fontSize: 10, color: '#94a3b8',
    fontFamily: FONT_MONO, letterSpacing: '0.04em',
    overflow: 'hidden',
  },
  tileCwd: {
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    color: '#4a5168',
  },
  tileFocusBadge: {
    position: 'absolute', top: 8, right: 30,
    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
    color: '#4de6f0', textTransform: 'uppercase',
    fontFamily: FONT_MONO,
  },
  tileDangerBadge: {
    position: 'absolute', bottom: 8, right: 12,
    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
    padding: '2px 6px', borderRadius: 3,
    background: 'rgba(255,107,107,0.18)', color: '#ff6b6b',
    textTransform: 'uppercase',
    fontFamily: FONT_MONO,
  },
  tilePendingBadge: {
    position: 'absolute', bottom: 8, right: 12,
    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
    padding: '2px 6px', borderRadius: 3,
    background: 'rgba(255,229,102,0.18)', color: '#ffe566',
    textTransform: 'uppercase',
    fontFamily: FONT_MONO,
  },

  foot: {
    padding: '14px 22px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 14, flexWrap: 'wrap',
  },
  statRow: { display: 'flex', gap: 14, fontFamily: FONT_MONO, fontSize: 11, alignItems: 'center', flexWrap: 'wrap' },
  shortcutHint: {
    color: '#4a5168', fontSize: 10, letterSpacing: '0.04em', marginLeft: 8,
  },
  kbd: {
    fontFamily: FONT_MONO, padding: '1px 6px', borderRadius: 4,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8', fontSize: 10,
  },
  statKeep:  { color: '#4de6f0', display: 'inline-flex', alignItems: 'center', gap: 6 },
  statClose: { color: '#ff6b6b', display: 'inline-flex', alignItems: 'center', gap: 6 },
  statDot: { width: 7, height: 7, borderRadius: '50%' },

  actions: { display: 'flex', gap: 8 },
  cancel: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 16px', borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8',
    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
  },
  confirm: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 18px', borderRadius: 9,
    background: 'linear-gradient(135deg, #ff6b6b, #c43333)',
    color: '#1a0606',
    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    boxShadow: '0 8px 24px rgba(255,107,107,0.25)',
  },
  confirmDisabled: { opacity: 0.4, cursor: 'not-allowed', boxShadow: 'none' },
};
