import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { FONTS } from './lib/constants';
import { useTheme } from './hooks/useTheme';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider, WorkspaceContext } from './contexts/WorkspaceContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useMacros } from './hooks/useMacros';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import TerminalGrid from './components/TerminalGrid';
import CommandLibrary from './components/CommandLibrary';
import MacroBar from './components/MacroBar';
import UsagePanel from './components/UsagePanel';
import SettingsPanel from './components/SettingsPanel';
import FileActivity from './components/FileActivity';
import PromptTemplates from './components/PromptTemplates';
import LoginScreen from './components/LoginScreen';
import OnboardingWizard from './components/OnboardingWizard';
import PlanSelector from './components/PlanSelector';
import HelpGuide from './components/HelpGuide';
import FeedbackPanel from './components/FeedbackPanel';
import SessionHistory from './components/SessionHistory';
import SubscriptionPanel from './components/SubscriptionPanel';
import KeybindingsPanel from './components/KeybindingsPanel';
import PluginManagerPanel from './components/PluginManager';
import UpdateNotification from './components/UpdateNotification';
import PopoutTerminal from './components/PopoutTerminal';
import { isAuthenticated, logout } from './lib/authService';

const RIGHT_PANEL_WIDTH = 280;
const RIGHT_COLLAPSED_WIDTH = 36;

function RightSidebarPanel({ open, onToggle, activeTab, onTabChange, onInsert }) {
  const fc = FONTS.mono;
  const { colors } = useTheme();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      flexShrink: 0,
      width: open ? RIGHT_PANEL_WIDTH : RIGHT_COLLAPSED_WIDTH,
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    }}>
      {/* Panel content */}
      <div style={{
        width: RIGHT_PANEL_WIDTH - RIGHT_COLLAPSED_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg.raised,
        borderLeft: `1px solid ${colors.border.subtle}`,
        borderRadius: '8px 0 0 8px',
        opacity: open ? 1 : 0,
        transition: 'opacity 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Tab header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          borderBottom: `1px solid ${colors.border.subtle}`,
          flexShrink: 0,
        }}>
          <button onClick={() => onTabChange('prompts')} style={{
            all: 'unset', cursor: 'pointer', flex: 1, padding: '9px 0',
            textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            fontFamily: fc, transition: 'all 0.15s',
            color: activeTab === 'prompts' ? colors.accent.purple : colors.text.dim,
            borderBottom: `2px solid ${activeTab === 'prompts' ? colors.accent.purple : 'transparent'}`,
            background: activeTab === 'prompts' ? colors.accent.purple + '08' : 'transparent',
          }}>PROMPTS</button>
          <button onClick={() => onTabChange('commands')} style={{
            all: 'unset', cursor: 'pointer', flex: 1, padding: '9px 0',
            textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            fontFamily: fc, transition: 'all 0.15s',
            color: activeTab === 'commands' ? colors.accent.amber : colors.text.dim,
            borderBottom: `2px solid ${activeTab === 'commands' ? colors.accent.amber : 'transparent'}`,
            background: activeTab === 'commands' ? colors.accent.amber + '08' : 'transparent',
          }}>COMMANDS</button>
          <button onClick={onToggle} title="Close panel" style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 4, fontSize: 12, color: colors.text.dim,
            transition: 'all 0.15s', flexShrink: 0, marginRight: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; e.currentTarget.style.color = colors.text.secondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.dim; }}
          >&#10005;</button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: activeTab === 'prompts' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <PromptTemplates onInsert={onInsert} />
          </div>
          <div style={{ display: activeTab === 'commands' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <CommandLibrary />
          </div>
        </div>
      </div>

      {/* Collapsed icon strip */}
      <div style={{
        width: RIGHT_COLLAPSED_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        gap: 4,
        background: colors.bg.raised,
        borderLeft: `1px solid ${colors.border.subtle}`,
        borderRadius: open ? '0 8px 8px 0' : 8,
      }}>
        <button onClick={() => { if (!open) { onToggle(); onTabChange('prompts'); } else if (activeTab !== 'prompts') { onTabChange('prompts'); } else { onToggle(); } }}
          title="Prompts" style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6,
          background: open && activeTab === 'prompts' ? colors.accent.purple + '18' : 'transparent',
          color: open && activeTab === 'prompts' ? colors.accent.purple : colors.text.dim,
          transition: 'all 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>
        <button onClick={() => { if (!open) { onToggle(); onTabChange('commands'); } else if (activeTab !== 'commands') { onTabChange('commands'); } else { onToggle(); } }}
          title="Commands" style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6,
          background: open && activeTab === 'commands' ? colors.accent.amber + '18' : 'transparent',
          color: open && activeTab === 'commands' ? colors.accent.amber : colors.text.dim,
          transition: 'all 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AppInner({ onLogout }) {
  const { colors } = useTheme();
  const [dangerFlags, setDangerFlags] = useState({ global: false, perTerminal: {} });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gitOpen, setGitOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightTab, setRightTab] = useState('prompts');
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const { macros, createMacro, deleteMacro } = useMacros();
  const { activeData } = useContext(WorkspaceContext);

  const focusedCwd = useMemo(() => {
    const terms = activeData?.terminals || [];
    return terms[0]?.cwd || null;
  }, [activeData]);

  const toggleDanger = useCallback((terminalId) => {
    setDangerFlags((prev) => ({
      ...prev,
      perTerminal: {
        ...prev.perTerminal,
        [terminalId]: !prev.perTerminal[terminalId],
      },
    }));
  }, []);

  const executeMacro = useCallback((macro) => {
    if (macro.type === 'create') {
      createMacro(macro);
      return;
    }
    const action = macro.action;
    if (!action) return;
    switch (action.type) {
      case 'toggleDanger':
        setDangerFlags((prev) => ({ ...prev, global: action.value }));
        break;
      case 'setLayout':
        window.dispatchEvent(new CustomEvent('flowcode:setLayout', { detail: action.value }));
        break;
      case 'sendAll':
        window.dispatchEvent(new CustomEvent('flowcode:sendAll', { detail: action.value }));
        break;
      case 'sendActive':
        window.dispatchEvent(new CustomEvent('flowcode:sendActive', { detail: action.value }));
        break;
    }
  }, [createMacro]);

  const shortcutActions = useMemo(() => ({
    addTerminal: () => window.dispatchEvent(new Event('flowcode:addTerminal')),
    closeTerminal: () => window.dispatchEvent(new Event('flowcode:closeTerminal')),
    setLayout: (id) => window.dispatchEvent(new CustomEvent('flowcode:setLayout', { detail: id })),
    toggleDanger: () => setDangerFlags((prev) => ({ ...prev, global: !prev.global })),
    cycleFocus: () => window.dispatchEvent(new Event('flowcode:cycleFocus')),
    openSettings: () => setSettingsOpen(true),
  }), []);

  useKeyboardShortcuts(shortcutActions);

  const handleInsertSnippet = useCallback((text) => {
    window.dispatchEvent(new CustomEvent('flowcode:insertSnippet', { detail: text }));
  }, []);

  return (
    <div style={{
      fontFamily: FONTS.body,
      background: colors.bg.base,
      color: '#fff',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
        <UpdateNotification />
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenFeedback={() => setFeedbackOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenSubscription={() => setSubscriptionOpen(true)}
          onOpenKeybindings={() => setKeybindingsOpen(true)}
          onOpenPlugins={() => setPluginsOpen(true)}
          onOpenPrompts={() => { setRightPanelOpen(true); setRightTab('prompts'); }}
          onOpenCommands={() => { setRightPanelOpen(true); setRightTab('commands'); }}
        />

        <div style={{
          flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column',
          gap: 8, overflow: 'hidden', minHeight: 0,
        }}>
          <ErrorBoundary name="Usage Panel">
            <UsagePanel />
          </ErrorBoundary>

          <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <ErrorBoundary name="File Activity">
              <FileActivity
                cwd={focusedCwd}
                open={gitOpen}
                onToggle={() => setGitOpen((o) => !o)}
              />
            </ErrorBoundary>

            <div style={{ flex: 1, minWidth: 0, padding: '0 6px', transition: 'all 0.25s ease' }}>
              <ErrorBoundary name="Terminal Grid">
                <TerminalGrid
                  dangerFlags={dangerFlags}
                  onToggleDanger={toggleDanger}
                />
              </ErrorBoundary>
            </div>

            <ErrorBoundary name="Right Sidebar">
              <RightSidebarPanel
                open={rightPanelOpen}
                onToggle={() => setRightPanelOpen((o) => !o)}
                activeTab={rightTab}
                onTabChange={setRightTab}
                onInsert={handleInsertSnippet}
              />
            </ErrorBoundary>
          </div>

          <ErrorBoundary name="Macro Bar">
            <MacroBar
              macros={macros}
              onExecute={executeMacro}
              onDelete={deleteMacro}
            />
          </ErrorBoundary>
        </div>

        <footer style={{
          padding: '6px 24px', borderTop: `1px solid ${colors.border.subtle}`,
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: colors.text.dim, fontFamily: FONTS.mono,
          background: colors.bg.surface, flexShrink: 0,
        }}>
          <span>FlowCode v0.1.0</span>
          <span>DutchMade Co.</span>
        </footer>

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />
        <FeedbackPanel open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        <SessionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
        <SubscriptionPanel open={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
        <KeybindingsPanel open={keybindingsOpen} onClose={() => setKeybindingsOpen(false)} />
        <PluginManagerPanel open={pluginsOpen} onClose={() => setPluginsOpen(false)} />
    </div>
  );
}

function AuthGate() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('flowcode_onboarding_complete') === 'true'
  );
  const [planSelected, setPlanSelected] = useState(
    () => localStorage.getItem('flowcode_plan_selected') === 'true'
  );

  useEffect(() => {
    isAuthenticated().then((result) => {
      setAuthed(result);
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) return null;

  if (!authed) {
    return <LoginScreen onAuthenticated={() => setAuthed(true)} />;
  }

  return (
    <SettingsProvider>
      <ThemeProvider>
        <ToastProvider>
          <WorkspaceProvider>
            {!onboarded ? (
              <OnboardingWizard onComplete={() => setOnboarded(true)} />
            ) : !planSelected ? (
              <PlanSelector onComplete={() => setPlanSelected(true)} />
            ) : (
              <AppInner onLogout={() => { logout(); setAuthed(false); }} />
            )}
          </WorkspaceProvider>
        </ToastProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default function App() {
  // If this is a popout window, render only the terminal pane
  if (window.flowcode?.window?.isPopout?.()) {
    return <PopoutTerminal />;
  }

  return <AuthGate />;
}
