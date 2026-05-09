// Glasshouse sidebar — 220px wide, label-bearing, sectioned. Matches the
// mockup at flowADE-mockups/refined-current/. Same activePanel + onSelect
// API but with explicit nav items: overview, terminals, chat, tasks,
// memory, settings, pricing.
import logoFa from '../../assets/branding/logo-fa.png';

const ICON_SIZE = 14;

function Icon({ name }) {
  const props = { width: ICON_SIZE, height: ICON_SIZE, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'overview': return <svg {...props}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
    case 'terminals': return <svg {...props}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>;
    case 'chat': return <svg {...props}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>;
    case 'tasks': return <svg {...props}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>;
    case 'memory': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
    case 'pricing': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 1.5-2.5 3.5M12 17v.01" /></svg>;
    default: return null;
  }
}

const SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview',  label: 'Overview' },
      { id: 'terminals', label: 'Terminals' },
      { id: 'chat',      label: 'AI Chat' },
      { id: 'tasks',     label: 'Tasks' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'memory', label: 'Memory' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings' },
      { id: 'pricing',  label: 'Pricing' },
    ],
  },
];

export default function SideNavGlasshouse({ activePanel, onSelect, user, badges }) {
  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'You');
  const userInitials = (userName.match(/\b[A-Z]/g) || ['Y']).slice(0, 2).join('').toUpperCase() || 'Y';
  const userEmail = user?.email || '';

  return (
    <aside style={s.root}>
      <div style={s.brandHead}>
        <img src={logoFa} alt="FA" style={s.logoFa} />
        <span style={s.brandName}>FlowADE</span>
        <span style={s.brandTag}>PRO</span>
      </div>

      <div style={s.list}>
        {SECTIONS.map(section => (
          <div key={section.label} style={s.section}>
            <div style={s.sectionLabel}>{section.label}</div>
            {section.items.map(item => {
              const active = activePanel === item.id;
              const badge = badges?.[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect?.(item.id)}
                  title={item.label}
                  style={{ ...s.navLink, ...(active ? s.navLinkActive : null) }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f5f9'; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
                >
                  <span style={s.navIcon}><Icon name={item.id} /></span>
                  <span>{item.label}</span>
                  {badge > 0 && <span style={s.badge}>{badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={s.footUser}>
        <div style={s.avatar}>{userInitials}</div>
        <div style={s.userMeta}>
          <div style={s.userName}>{userName}</div>
          {userEmail && <div style={s.userEmail}>{userEmail}</div>}
        </div>
      </div>
    </aside>
  );
}

const s = {
  root: {
    width: 220, minWidth: 220, height: '100%',
    background: 'linear-gradient(180deg, rgba(14,14,28,0.85), rgba(8,8,16,0.95))',
    borderRight: '1px solid rgba(77,230,240,0.06)',
    backdropFilter: 'blur(14px)',
    display: 'flex', flexDirection: 'column',
    flexShrink: 0,
  },
  brandHead: {
    padding: '20px 18px 16px',
    display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoFa: {
    width: 26, height: 26, objectFit: 'contain',
    filter: 'drop-shadow(0 0 8px rgba(77,230,240,0.4))',
  },
  brandName: {
    fontFamily: 'var(--gh-font-techno, "Chakra Petch", sans-serif)',
    fontWeight: 600, fontSize: 14, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: '#f1f5f9',
  },
  brandTag: {
    marginLeft: 'auto',
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
    fontSize: 9, letterSpacing: '0.22em', fontWeight: 700,
    padding: '3px 8px',
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.04)',
    color: '#4de6f0',
  },
  list: { flex: 1, padding: '6px 10px', overflowY: 'auto' },
  section: { display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 14 },
  sectionLabel: {
    fontFamily: 'var(--gh-font-techno, "Chakra Petch", sans-serif)',
    fontWeight: 600, fontSize: 9,
    letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0', opacity: 0.55,
    padding: '14px 14px 6px',
  },
  navLink: {
    all: 'unset', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 8,
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
    fontSize: 12, color: '#94a3b8',
    transition: 'all 0.15s',
  },
  navLinkActive: {
    background: 'linear-gradient(90deg, rgba(77,230,240,0.14), transparent 80%)',
    color: '#4de6f0',
    boxShadow: 'inset 2px 0 0 #4de6f0, 0 0 24px rgba(77,230,240,0.08)',
    textShadow: '0 0 8px rgba(77,230,240,0.5)',
  },
  navIcon: {
    width: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0.85,
  },
  badge: {
    marginLeft: 'auto',
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 9, fontWeight: 700,
    padding: '1px 6px', borderRadius: 99,
    background: 'rgba(77,230,240,0.15)', color: '#4de6f0',
  },
  footUser: {
    padding: '12px 14px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', gap: 10,
    flexShrink: 0,
  },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    display: 'grid', placeItems: 'center',
    fontFamily: 'var(--gh-font-display, "Outfit", sans-serif)',
    fontWeight: 700, fontSize: 12, color: '#001014',
    flexShrink: 0,
    boxShadow: '0 0 12px rgba(77,230,240,0.35)',
  },
  userMeta: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  userName: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 11, color: '#f1f5f9',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  userEmail: {
    fontFamily: 'var(--gh-font-mono, monospace)',
    fontSize: 9, color: '#4a5168',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
};
