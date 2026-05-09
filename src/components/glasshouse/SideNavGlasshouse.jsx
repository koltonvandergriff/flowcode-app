// Glasshouse-themed drop-in for SideNav. Same 44px column, same API
// (activePanel + onSelect + badges). Visual differences:
//  - FA monogram at top
//  - Cyan glow on active item with text-shadow
//  - Glass background instead of solid bg
//  - Cyan ambient halo on hover
import logoFa from '../../assets/branding/logo-fa.png';

const ICON_SIZE = 16;

const NAV_ITEMS = [
  {
    id: 'code',
    label: 'Code Editor',
    icon: (
      <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="9" y2="9" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="15" y1="8" x2="21" y2="8" />
      </svg>
    ),
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: (
      <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: (
      <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
];

export default function SideNavGlasshouse({ activePanel, onSelect, badges }) {
  return (
    <div style={s.root}>
      <div style={s.brand} title="FlowADE">
        <img src={logoFa} alt="FA" style={s.logo} />
      </div>
      <div style={s.divider} />

      {NAV_ITEMS.map(item => {
        const active = activePanel === item.id;
        const badge = badges?.[item.id];
        return (
          <button
            key={item.id}
            onClick={() => onSelect(active ? null : item.id)}
            title={item.label}
            style={{ ...s.btn, ...(active ? s.btnActive : null) }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(77,230,240,0.06)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            {item.icon}
            {badge > 0 && <span style={s.badge}>{badge}</span>}
            {active && <span style={s.activeRail} />}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => onSelect(activePanel === 'settings' ? null : 'settings')}
        title="Settings"
        style={{ ...s.btn, color: '#4a5168' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#4a5168'}
      >
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}

const s = {
  root: {
    width: 44, minWidth: 44,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '8px 0', gap: 4,
    background: 'rgba(10, 14, 24, 0.55)',
    backdropFilter: 'blur(14px) saturate(1.1)',
    borderRight: '1px solid rgba(77,230,240,0.06)',
    borderRadius: '10px 0 0 10px',
    boxShadow: 'inset 0 1px 0 rgba(77,230,240,0.04)',
  },
  brand: {
    width: 30, height: 30, padding: 4,
    display: 'grid', placeItems: 'center',
    margin: '2px 0',
  },
  logo: {
    width: '100%', height: '100%', objectFit: 'contain',
    filter: 'drop-shadow(0 0 6px rgba(77,230,240,0.4))',
  },
  divider: {
    width: 22, height: 1,
    background: 'rgba(77,230,240,0.15)',
    margin: '4px 0 6px',
  },
  btn: {
    all: 'unset', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 8, position: 'relative',
    color: '#94a3b8',
    transition: 'all 0.15s',
  },
  btnActive: {
    color: '#4de6f0',
    background: 'rgba(77,230,240,0.12)',
    boxShadow: '0 0 18px rgba(77,230,240,0.18)',
  },
  activeRail: {
    position: 'absolute', left: -5, top: 6, bottom: 6,
    width: 2, borderRadius: 2,
    background: '#4de6f0',
    boxShadow: '0 0 8px #4de6f0',
  },
  badge: {
    position: 'absolute', top: 1, right: 1,
    fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 6,
    background: '#4de6f0', color: '#001014',
    fontFamily: 'var(--gh-font-mono, monospace)',
    lineHeight: '11px', minWidth: 8, textAlign: 'center',
  },
};
