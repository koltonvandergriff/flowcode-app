import { FONTS, COLORS } from '../lib/constants';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const fc = FONTS.mono;
const orb = FONTS.display;

export default function Header() {
  const isElectron = !!window.flowcode?.window;

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 24px', borderBottom: `1px solid ${COLORS.border.subtle}`,
      background: COLORS.bg.surface, position: 'sticky', top: 0, zIndex: 10,
      WebkitAppRegion: 'drag',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, WebkitAppRegion: 'no-drag' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg,${COLORS.accent.pink},${COLORS.accent.purple},${COLORS.accent.green})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 900, color: '#fff', fontFamily: orb,
          boxShadow: `0 4px 20px ${COLORS.accent.purple}30`,
        }}>F</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: orb, letterSpacing: 1 }}>
            FlowCode
          </div>
          <div style={{ fontSize: 9, color: COLORS.text.dim, letterSpacing: 2, fontFamily: fc, marginTop: 1 }}>
            VIBE CODER WORKSPACE
          </div>
        </div>
      </div>

      <div style={{ WebkitAppRegion: 'no-drag' }}>
        <WorkspaceSwitcher />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' }}>
        <span style={{ fontSize: 10, color: COLORS.text.ghost, fontFamily: fc }}>
          v{window.flowcode?.version || '0.1.0'}
        </span>

        {isElectron && (
          <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
            <button onClick={() => window.flowcode.window.minimize()} style={winBtnStyle}>
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5" stroke={COLORS.text.dim} strokeWidth="1.5" /></svg>
            </button>
            <button onClick={() => window.flowcode.window.maximize()} style={winBtnStyle}>
              <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke={COLORS.text.dim} strokeWidth="1.5" /></svg>
            </button>
            <button onClick={() => window.flowcode.window.close()} style={{ ...winBtnStyle, ':hover': { background: COLORS.status.error } }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke={COLORS.text.dim} strokeWidth="1.5" /><line x1="9" y1="1" x2="1" y2="9" stroke={COLORS.text.dim} strokeWidth="1.5" /></svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const winBtnStyle = {
  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, transition: 'background .15s ease',
};
