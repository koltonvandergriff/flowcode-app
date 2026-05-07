import { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

/**
 * PopoutTerminal — A minimal full-window wrapper that renders a single
 * terminal pane for use in popout (child) Electron windows.
 * No header, footer, or sidebar — just the terminal filling the viewport.
 */
export default function PopoutTerminal() {
  const { colors, terminalTheme } = useTheme();
  const terminalId = window.flowade?.window?.getPopoutTerminalId?.();
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const fitRef = useRef(null);
  const unsubDataRef = useRef(null);
  const unsubExitRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!termRef.current || !terminalId) return;

    const term = new Terminal({
      theme: terminalTheme,
      fontFamily: FONTS.mono,
      fontSize: 13,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();
    xtermRef.current = term;
    fitRef.current = fit;

    // Allow paste
    term.attachCustomKeyEventHandler((event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key === 'v') return false;
      if (mod && event.key === 'c' && term.hasSelection()) return false;
      if (mod && event.key === 'k') return false;
      return true;
    });

    const termEl = termRef.current;
    const pasteHandler = (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text');
      if (text) window.flowade?.terminal.write(terminalId, text);
    };
    termEl.addEventListener('paste', pasteHandler);

    // Subscribe to data from the already-spawned PTY (the main window owns the PTY)
    unsubDataRef.current = window.flowade.terminal.onData((id, data) => {
      if (id !== terminalId) return;
      term.write(data);
    });

    unsubExitRef.current = window.flowade.terminal.onExit((id, exitCode) => {
      if (id !== terminalId) return;
      setStatus('disconnected');
      term.writeln(`\r\n\x1b[33m[Session ended — code ${exitCode}]\x1b[0m`);
    });

    setStatus('connected');

    // Forward typed data back to PTY
    term.onData((data) => {
      window.flowade?.terminal.write(terminalId, data);
    });

    term.onResize(({ cols, rows }) => {
      window.flowade?.terminal.resize(terminalId, cols, rows);
    });

    const ro = new ResizeObserver(() => {
      try { fit.fit(); } catch {}
    });
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      termEl.removeEventListener('paste', pasteHandler);
      unsubDataRef.current?.();
      unsubExitRef.current?.();
      term.dispose();
    };
  }, [terminalId]);

  if (!terminalId) {
    return (
      <div style={{
        fontFamily: FONTS.body,
        background: colors.bg.base,
        color: colors.text.muted,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}>
        No terminal ID specified.
      </div>
    );
  }

  const statusColor = status === 'connected' ? colors.status.success
    : status === 'connecting' ? colors.status.warning : colors.status.error;

  return (
    <div style={{
      fontFamily: FONTS.body,
      background: colors.bg.base,
      color: colors.text.primary,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Minimal top bar for drag region and status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: colors.bg.overlay,
        borderBottom: `1px solid ${colors.border.subtle}`,
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          fontFamily: FONTS.mono,
          color: colors.accent.green,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {terminalId}
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          fontFamily: FONTS.mono,
          background: colors.accent.purple + '18',
          color: colors.accent.purple,
          border: `1px solid ${colors.accent.purple}30`,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          POPOUT
        </span>
        <div style={{ flex: 1 }} />
      </div>

      {/* Terminal fills remaining space */}
      <div
        ref={termRef}
        style={{
          flex: 1,
          padding: '4px 8px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      />
    </div>
  );
}
