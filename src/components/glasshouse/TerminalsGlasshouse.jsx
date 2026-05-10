// Glasshouse Terminals page. Cosmetic wrapper around the existing
// TerminalGrid — full feature parity (multi-pane, providers, danger flags,
// resize handles, focus management) is preserved. Adds page header + a
// glassy outer frame so the grid sits in the same visual language as the
// rest of the glasshouse views.

import TerminalGrid from '../TerminalGrid';
import ErrorBoundary from '../ErrorBoundary';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

export default function TerminalsGlasshouse({ dangerFlags = {}, onToggleDanger = () => {} }) {
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
