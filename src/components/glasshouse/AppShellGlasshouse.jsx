// Glasshouse app shell — wholesale replacement for the classic AppInner layout.
//
// Layout matches flowADE-mockups/refined-current/index.html:
//   - 220px sidebar (SideNavGlasshouse) with brand header + sectioned nav +
//     user footer
//   - Slim topbar with breadcrumbs left + Trial/Sync pills right
//   - Main content area swaps based on the selected sidebar item, reusing
//     existing panels (TerminalGrid, MemoryPanel, TaskBoard) so behavior
//     stays identical to classic
//
// Settings + Pricing remain overlay panels (existing components).

import { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import SettingsPanel from '../SettingsPanel';
import SubscriptionPanel from '../SubscriptionPanel';
import HelpGuide from '../HelpGuide';
import FeedbackPanel from '../FeedbackPanel';
import SessionHistory from '../SessionHistory';
import KeybindingsPanel from '../KeybindingsPanel';
import PluginManagerPanel from '../PluginManager';
import AnalyticsDashboard from '../AnalyticsDashboard';
import NotificationsPanel from '../NotificationsPanel';
import CommandPalette from '../CommandPalette';
import UpdateNotification from '../UpdateNotification';
import BrowserPanel from '../BrowserPanel';
import ResizeHandle from '../ResizeHandle';
import SideNavGlasshouse from './SideNavGlasshouse';
import OverviewGlasshouse from './OverviewGlasshouse';
import PricingGlasshouse from './PricingGlasshouse';
import SettingsGlasshouse from './SettingsGlasshouse';
import AIChatGlasshouse from './AIChatGlasshouse';
import TerminalsGlasshouse from './TerminalsGlasshouse';
import TasksGlasshouse from './TasksGlasshouse';
import MemoryGlasshouse from './MemoryGlasshouse';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const PAGE_LABELS = {
  overview: 'Overview',
  terminals: 'Terminals',
  chat: 'AI Chat',
  tasks: 'Tasks',
  memory: 'Memory',
  settings: 'Settings',
  pricing: 'Pricing',
};

export default function AppShellGlasshouse({ onLogout }) {
  // Default landing: Overview on first launch, then last picked.
  const [page, setPage] = useState(() => {
    try {
      const seen = localStorage.getItem('flowade.overview.seen') === '1';
      const last = localStorage.getItem('flowade.glass.page');
      return seen && last ? last : 'overview';
    } catch { return 'overview'; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('flowade.glass.page', page);
      if (page === 'overview') localStorage.setItem('flowade.overview.seen', '1');
    } catch {}
  }, [page]);

  // Browser side-pane (preview for locally-running apps). Toggleable via the
  // globe button in the topbar, the cmd palette, or the
  // `flowade:openInBrowser` event. Persists open + width across sessions.
  const [browserOpen, setBrowserOpen] = useState(() => {
    try { return localStorage.getItem('flowade.glass.browserOpen') === '1'; } catch { return false; }
  });
  const [browserWidth, setBrowserWidth] = useState(() => {
    try {
      const w = parseInt(localStorage.getItem('flowade.glass.browserWidth') || '', 10);
      return Number.isFinite(w) && w >= 300 ? w : 500;
    } catch { return 500; }
  });
  useEffect(() => {
    try { localStorage.setItem('flowade.glass.browserOpen', browserOpen ? '1' : '0'); } catch {}
  }, [browserOpen]);
  useEffect(() => {
    try { localStorage.setItem('flowade.glass.browserWidth', String(browserWidth)); } catch {}
  }, [browserWidth]);
  useEffect(() => {
    const handler = () => setBrowserOpen(true);
    window.addEventListener('flowade:openInBrowser', handler);
    return () => window.removeEventListener('flowade:openInBrowser', handler);
  }, []);

  // Overlay panels — opened from sidebar (settings/pricing) or cmd palette.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // Pull cached auth user once for sidebar avatar + greeting.
  const [authUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flowade_auth_user') || '{}'); } catch { return {}; }
  });
  const userFirstName = authUser?.name?.split(' ')?.[0] || (authUser?.email?.split('@')?.[0]) || 'there';

  // Danger flags — global and per-terminal. Mirrors the state managed by
  // the classic AppInner so the shell-level pane menus actually toggle.
  const [dangerFlags, setDangerFlags] = useState({ global: false, perTerminal: {} });
  const toggleDanger = useCallback((terminalId) => {
    setDangerFlags(prev => {
      if (!terminalId) return { ...prev, global: !prev.global };
      const next = { ...prev.perTerminal };
      if (next[terminalId]) delete next[terminalId];
      else next[terminalId] = true;
      return { ...prev, perTerminal: next };
    });
  }, []);

  const handleNav = useCallback((id) => {
    // Settings and Pricing are inline pages now (not modal overlays).
    setPage(id);
  }, []);

  // Cmd palette actions — minimal subset since most live elsewhere.
  const cmdActions = [
    { id: 'go-overview',  label: 'Go: Overview',  category: 'Navigation', onAction: () => setPage('overview') },
    { id: 'go-terminals', label: 'Go: Terminals', category: 'Navigation', onAction: () => setPage('terminals') },
    { id: 'go-tasks',     label: 'Go: Tasks',     category: 'Navigation', onAction: () => setPage('tasks') },
    { id: 'go-memory',    label: 'Go: Memory',    category: 'Navigation', onAction: () => setPage('memory') },
    { id: 'toggle-browser', label: 'Toggle Browser', category: 'Panels', onAction: () => setBrowserOpen(o => !o) },
    { id: 'open-settings', label: 'Open Settings', category: 'Panels', onAction: () => setSettingsOpen(true) },
    { id: 'open-billing',  label: 'Open Pricing',  category: 'Panels', onAction: () => setSubscriptionOpen(true) },
    { id: 'open-help',     label: 'Help',          category: 'Panels', onAction: () => setHelpOpen(true) },
    { id: 'logout',        label: 'Sign out',      category: 'Account', onAction: onLogout },
  ];

  return (
    <div style={shell.root}>
      <SideNavGlasshouse activePanel={page} onSelect={handleNav} user={authUser} />

      <main style={shell.main}>
        <Topbar
          pageId={page}
          browserOpen={browserOpen}
          onToggleBrowser={() => setBrowserOpen(o => !o)}
        />

        <div style={shell.content}>
          <div style={shell.pageWrap}>
            <ErrorBoundary name={`Glasshouse Page · ${page}`}>
              {page === 'overview' && (
                <OverviewGlasshouse userName={userFirstName} onJump={(id) => setPage(id)} />
              )}
              {page === 'terminals' && (
                <TerminalsGlasshouse dangerFlags={dangerFlags} onToggleDanger={toggleDanger} />
              )}
              {page === 'chat' && <AIChatGlasshouse />}
              {page === 'tasks' && <TasksGlasshouse onClose={() => setPage('overview')} />}
              {page === 'memory' && <MemoryGlasshouse onClose={() => setPage('overview')} />}
              {page === 'settings' && <SettingsGlasshouse onLogout={onLogout} />}
              {page === 'pricing'  && <PricingGlasshouse />}
            </ErrorBoundary>
          </div>

          {browserOpen && (
            <ResizeHandle direction="vertical" onResize={(delta) => {
              setBrowserWidth(w => Math.max(300, Math.min(900, (w || 500) - delta)));
            }} />
          )}
          <ErrorBoundary name="Browser Panel">
            <BrowserPanel
              open={browserOpen}
              onToggle={() => setBrowserOpen(o => !o)}
              width={browserWidth}
            />
          </ErrorBoundary>
        </div>
      </main>

      <UpdateNotification />

      {/* Overlays — same components used by the classic shell */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onLogout={onLogout} />
      <SubscriptionPanel open={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
      <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />
      <FeedbackPanel open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SessionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <KeybindingsPanel open={keybindingsOpen} onClose={() => setKeybindingsOpen(false)} />
      <PluginManagerPanel open={pluginsOpen} onClose={() => setPluginsOpen(false)} />
      <AnalyticsDashboard open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} actions={cmdActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topbar — slim crumb bar + sync pill, replaces classic Header
// ---------------------------------------------------------------------------
function Topbar({ pageId, browserOpen, onToggleBrowser }) {
  return (
    <div style={top.bar}>
      <div style={top.crumbs}>
        <span>Workspace</span>
        <span style={{ color: '#4a5168' }}>›</span>
        <span style={{ color: '#f1f5f9' }}>{PAGE_LABELS[pageId] || pageId}</span>
      </div>
      <div style={top.right}>
        <span style={{ ...top.pill, ...top.pillCy }}>
          <span style={{ ...top.dot, background: '#4de6f0' }} /> Synced · 405 memories
        </span>
        <IconBtn title={browserOpen ? 'Hide preview browser' : 'Open preview browser'} onClick={onToggleBrowser} active={browserOpen}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </IconBtn>
        <IconBtn title="Search">⌕</IconBtn>
        <IconBtn title="Notifications">◔</IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick, active }) {
  const baseColor = active ? '#4de6f0' : '#94a3b8';
  const baseBg = active ? 'rgba(77,230,240,0.1)' : 'transparent';
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ ...top.iconBtn, color: baseColor, background: baseBg }}
      onMouseEnter={(e) => { e.currentTarget.style.background = active ? 'rgba(77,230,240,0.15)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = active ? '#4de6f0' : '#f1f5f9'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = baseBg; e.currentTarget.style.color = baseColor; }}
    >
      {children}
    </button>
  );
}

function ComingSoon({ title, subtitle }) {
  return (
    <div style={cs.root}>
      <div style={cs.card}>
        <div style={cs.stamp}>coming soon</div>
        <h2 style={cs.h}>{title}</h2>
        <p style={cs.b}>{subtitle}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const shell = {
  root: {
    display: 'grid', gridTemplateColumns: '220px 1fr',
    width: '100vw', height: '100vh',
    fontFamily: FONT_MONO, color: '#f1f5f9',
    background: 'transparent',
    // No drag at root — children would inherit and break clicks. Drag region
    // is scoped to the topbar background below.
    WebkitAppRegion: 'no-drag',
  },
  main: {
    display: 'flex', flexDirection: 'column', minWidth: 0,
  },
  content: {
    flex: 1, display: 'flex', minHeight: 0,
    overflow: 'hidden',
  },
  pageWrap: {
    flex: 1, minWidth: 0, minHeight: 0,
    display: 'flex',
  },
};

const top = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(8,8,18,0.4)',
    backdropFilter: 'blur(10px)',
    flexShrink: 0,
    // Drag region lives only on the topbar — interactive children below
    // override with no-drag so clicks still register.
    WebkitAppRegion: 'drag',
  },
  crumbs: {
    fontFamily: FONT_MONO, fontSize: 11,
    color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'center',
    WebkitAppRegion: 'no-drag',
  },
  right: { marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', WebkitAppRegion: 'no-drag' },
  pill: {
    fontSize: 10, padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: FONT_MONO,
  },
  pillCy: {
    color: '#4de6f0', borderColor: 'rgba(77,230,240,0.3)',
    background: 'rgba(77,230,240,0.06)',
  },
  dot: { width: 6, height: 6, borderRadius: '50%', boxShadow: '0 0 6px currentColor' },
  iconBtn: {
    all: 'unset', cursor: 'pointer',
    width: 28, height: 28, borderRadius: 6,
    display: 'grid', placeItems: 'center',
    color: '#94a3b8', fontSize: 14,
    transition: 'all 0.15s',
  },
};

const cs = {
  root: { flex: 1, display: 'grid', placeItems: 'center', padding: 32 },
  card: {
    maxWidth: 480, padding: 36, textAlign: 'center',
    background: 'rgba(10,14,24,0.55)',
    border: '1px solid rgba(77,230,240,0.07)',
    borderRadius: 14, backdropFilter: 'blur(14px)',
  },
  stamp: {
    display: 'inline-block', marginBottom: 18,
    fontFamily: FONT_TECH, fontSize: 10, letterSpacing: '0.32em',
    textTransform: 'uppercase', color: '#4de6f0',
    padding: '5px 12px',
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.05)',
  },
  h: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 32, letterSpacing: '-0.02em', margin: '0 0 8px',
  },
  b: { fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.55 },
};
