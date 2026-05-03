import { useState, useCallback } from 'react';
import { FONTS, COLORS } from './lib/constants';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { useMacros } from './hooks/useMacros';
import Header from './components/Header';
import TerminalGrid from './components/TerminalGrid';
import CommandLibrary from './components/CommandLibrary';
import MacroBar from './components/MacroBar';
import UsagePanel from './components/UsagePanel';

export default function App() {
  const [dangerFlags, setDangerFlags] = useState({ global: false, perTerminal: {} });
  const { macros, createMacro, deleteMacro } = useMacros();

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
        // Dispatched through workspace context via event
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

  return (
    <ToastProvider>
      <WorkspaceProvider>
        <div style={{
          fontFamily: FONTS.body,
          background: COLORS.bg.base,
          color: '#fff',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Header />

          <div style={{
            flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column',
            gap: 10, overflow: 'hidden', minHeight: 0,
          }}>
            <UsagePanel />

            <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <TerminalGrid
                dangerFlags={dangerFlags}
                onToggleDanger={toggleDanger}
              />
              <CommandLibrary />
            </div>

            <MacroBar
              macros={macros}
              onExecute={executeMacro}
              onDelete={deleteMacro}
            />
          </div>

          <footer style={{
            padding: '6px 24px', borderTop: `1px solid ${COLORS.border.subtle}`,
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: COLORS.text.dim, fontFamily: FONTS.mono,
            background: COLORS.bg.surface, flexShrink: 0,
          }}>
            <span>FlowCode v0.1.0</span>
            <span>DutchMade Co.</span>
          </footer>
        </div>
      </WorkspaceProvider>
    </ToastProvider>
  );
}
