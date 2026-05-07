import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fb = FONTS.body;

const NAV_ITEMS = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    icon: <span style={{ fontSize: 16 }}>🧠</span>,
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
];

export default function SideNav({ activePanel, onSelect, badges }) {
  const { colors } = useTheme();

  return (
    <div className="fc-glass" style={{
      width: 44, minWidth: 44, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '8px 0', gap: 2,
      background: colors.bg.glass || colors.bg.surface,
      borderRight: `1px solid ${colors.border.subtle}`,
      borderRadius: '10px 0 0 10px',
    }}>
      {NAV_ITEMS.map(item => {
        const active = activePanel === item.id;
        const badge = badges?.[item.id];
        return (
          <button
            key={item.id}
            onClick={() => onSelect(active ? null : item.id)}
            title={item.label}
            style={{
              all: 'unset', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, position: 'relative',
              background: active ? (colors.accent.primary || colors.accent.purple) + '18' : 'transparent',
              color: active ? (colors.accent.primary || colors.accent.purple) : colors.text.dim,
              transition: 'all .15s ease',
              borderLeft: active ? `2px solid ${colors.accent.primary || colors.accent.purple}` : '2px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = colors.bg.overlay;
                e.currentTarget.style.color = colors.text.secondary;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.text.dim;
              }
            }}
          >
            {item.icon}
            {badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 6,
                background: colors.accent.primary || colors.accent.cyan,
                color: '#000', fontFamily: fb, lineHeight: '11px',
                minWidth: 8, textAlign: 'center',
              }}>{badge}</span>
            )}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Bottom section - settings hint */}
      <button
        onClick={() => onSelect(activePanel === 'settings' ? null : 'settings')}
        title="Settings"
        style={{
          all: 'unset', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 8,
          color: colors.text.ghost, transition: 'all .15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = colors.text.secondary; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.ghost; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
