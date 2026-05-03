import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { FONTS, COLORS, TERMINAL_THEME } from '../lib/constants';
import { ToastContext } from '../contexts/ToastContext';
import { useVoiceInput } from '../hooks/useVoiceInput';

const fc = FONTS.mono;

function parseTerminalOptions(raw) {
  const text = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trimEnd()).filter(Boolean);
  const last = lines.slice(-25);

  const numbered = [];
  for (const line of last) {
    const m = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    if (m) numbered.push({ label: `${m[1]}. ${m[2].trim()}`, value: m[1] });
  }
  if (numbered.length >= 2) return numbered;

  const tail = last.slice(-5).join(' ');
  if (/\(y\)/i.test(tail) || /\by\/n\b/i.test(tail) || /\byes.*no\b/i.test(tail) || /\ballow\b.*\bdeny\b/i.test(tail)) {
    const opts = [{ label: 'Yes', value: 'y' }, { label: 'No', value: 'n' }];
    if (/\(a\)/i.test(tail) || /\balways\b/i.test(tail)) opts.push({ label: 'Always', value: 'a' });
    return opts;
  }
  return null;
}

function parseContextUsage(raw) {
  const text = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  const m = text.match(/ctx\s+(\d+)%\s*used/);
  return m ? parseInt(m[1], 10) : null;
}

function ContextBar({ percent }) {
  if (percent == null) return null;
  const color = percent >= 90 ? COLORS.status.error : percent >= 70 ? COLORS.status.warning : COLORS.accent.green;
  return (
    <div style={{ height: 3, background: COLORS.bg.surface, borderRadius: 2, flexShrink: 0 }}>
      <div style={{
        height: '100%', width: `${percent}%`, borderRadius: 2,
        background: color, transition: 'width .5s ease, background .5s ease',
      }} />
    </div>
  );
}

export default function TerminalPane({
  id, label, provider = 'claude', cwd,
  onClose, onRename,
  isDangerous, onToggleDanger,
  isDragging, isDropTarget,
  onDragStart, onDragEnd, onDragOver, onDrop,
}) {
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const fitRef = useRef(null);
  const outputBufRef = useRef('');
  const optionScanRef = useRef(null);
  const isDangerousRef = useRef(isDangerous);
  const [status, setStatus] = useState('connecting');
  const [termOptions, setTermOptions] = useState(null);
  const [ctxPercent, setCtxPercent] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(label);
  const ctxAlertedRef = useRef(0);
  const unsubDataRef = useRef(null);
  const unsubExitRef = useRef(null);
  const { addToast } = useContext(ToastContext);

  useEffect(() => { isDangerousRef.current = isDangerous; }, [isDangerous]);

  const sendToTerminal = useCallback((text) => {
    window.flowcode?.terminal.write(id, text);
  }, [id]);

  const { listening, status: voiceStatus, toggle: toggleVoice } = useVoiceInput(sendToTerminal);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      theme: TERMINAL_THEME,
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

    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') return false;
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && term.hasSelection()) return false;
      return true;
    });

    const termEl = termRef.current;
    const pasteHandler = (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text');
      if (text) window.flowcode?.terminal.write(id, text);
    };
    termEl.addEventListener('paste', pasteHandler);

    (async () => {
      try {
        const info = await window.flowcode.terminal.spawn({
          id,
          cols: term.cols,
          rows: term.rows,
          cwd: cwd || undefined,
        });

        if (!info) { setStatus('error'); return; }

        unsubDataRef.current = window.flowcode.terminal.onData((termId, data) => {
          if (termId !== id) return;
          term.write(data);
          outputBufRef.current += data;
          if (outputBufRef.current.length > 3000) outputBufRef.current = outputBufRef.current.slice(-2000);

          const ctx = parseContextUsage(data);
          if (ctx != null) {
            setCtxPercent(ctx);
            if (ctx >= 90 && ctxAlertedRef.current < 90) {
              ctxAlertedRef.current = 90;
              addToast(`${label}: Context 90%+ — consider /compact`, 'error');
            } else if (ctx >= 70 && ctxAlertedRef.current < 70) {
              ctxAlertedRef.current = 70;
              addToast(`${label}: Context 70%+`, 'warning');
            }
          }

          if (optionScanRef.current) clearTimeout(optionScanRef.current);
          optionScanRef.current = setTimeout(() => {
            const options = parseTerminalOptions(outputBufRef.current);
            if (isDangerousRef.current && options) {
              const approve = options.find((o) => o.value === 'a') || options.find((o) => o.value === 'y');
              if (approve) {
                window.flowcode.terminal.write(id, approve.value);
                outputBufRef.current = '';
                setTermOptions(null);
                return;
              }
            }
            setTermOptions(options);
          }, 400);
        });

        unsubExitRef.current = window.flowcode.terminal.onExit((termId, exitCode) => {
          if (termId !== id) return;
          setStatus('disconnected');
          term.writeln(`\r\n\x1b[33m[Session ended — code ${exitCode}]\x1b[0m`);
        });

        setStatus('connected');

        // Auto-launch claude CLI if provider is claude
        if (provider === 'claude') {
          setTimeout(() => window.flowcode.terminal.write(id, 'claude\r'), 500);
        }
      } catch (err) {
        term.writeln(`\r\n\x1b[31mFailed to spawn terminal: ${err.message}\x1b[0m`);
        setStatus('error');
      }
    })();

    term.onData((data) => {
      window.flowcode?.terminal.write(id, data);
      setTermOptions(null);
      outputBufRef.current = '';
    });

    term.onResize(({ cols, rows }) => {
      window.flowcode?.terminal.resize(id, cols, rows);
    });

    const ro = new ResizeObserver(() => { try { fit.fit(); } catch {} });
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      termEl.removeEventListener('paste', pasteHandler);
      unsubDataRef.current?.();
      unsubExitRef.current?.();
      term.dispose();
    };
  }, [id]);

  const statusColor = status === 'connected' ? COLORS.status.success
    : status === 'connecting' ? COLORS.status.warning : COLORS.status.error;

  const borderColor = isDropTarget ? COLORS.border.focus
    : isDangerous ? COLORS.border.danger
    : status === 'connected' ? COLORS.border.active : COLORS.border.subtle;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      style={{
        background: COLORS.bg.raised, border: `2px solid ${borderColor}`,
        borderRadius: 14, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: 0,
        opacity: isDragging ? 0.4 : 1,
        transition: 'border-color .2s ease, opacity .2s ease',
      }}
    >
      {/* Header */}
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={onDragEnd}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: isDangerous ? '#3a1520' : COLORS.bg.overlay,
          borderBottom: `1px solid ${borderColor}`,
          cursor: 'grab', flexShrink: 0,
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: isDangerous ? COLORS.status.error : statusColor,
          animation: isDangerous || status === 'connecting' ? 'pulse 1.5s infinite' : 'none',
        }} />

        {isRenaming ? (
          <input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={() => { onRename?.(renameVal); setIsRenaming(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onRename?.(renameVal); setIsRenaming(false); }
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            style={{
              flex: 1, background: 'transparent', border: `1px solid ${COLORS.border.focus}`,
              borderRadius: 4, padding: '2px 6px', color: COLORS.accent.green,
              fontSize: 13, fontWeight: 600, fontFamily: fc, outline: 'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { setRenameVal(label); setIsRenaming(true); }}
            style={{ fontSize: 13, fontWeight: 600, color: isDangerous ? COLORS.status.error : COLORS.accent.green, fontFamily: fc, flex: 1 }}
          >
            flowcode://{label}
          </span>
        )}

        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, fontFamily: fc,
          background: `linear-gradient(135deg,${COLORS.accent.green},${COLORS.accent.cyan})`, color: '#fff',
        }}>{provider.toUpperCase()}</span>

        {ctxPercent != null && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, fontFamily: fc,
            background: ctxPercent >= 90 ? '#E74C3C18' : ctxPercent >= 70 ? '#F39C1218' : COLORS.bg.surface,
            color: ctxPercent >= 90 ? COLORS.status.error : ctxPercent >= 70 ? COLORS.status.warning : COLORS.text.dim,
            border: `1px solid ${ctxPercent >= 70 ? (ctxPercent >= 90 ? '#E74C3C30' : '#F39C1230') : COLORS.border.subtle}`,
          }}>{ctxPercent}% ctx</span>
        )}

        {/* Danger toggle */}
        <button onClick={onToggleDanger} style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 5, fontFamily: fc, fontSize: 10, fontWeight: 700,
          background: isDangerous ? '#E74C3C18' : COLORS.bg.surface,
          color: isDangerous ? COLORS.status.error : COLORS.text.dim,
          border: `1px solid ${isDangerous ? '#E74C3C30' : COLORS.border.subtle}`,
        }}>
          <div style={{
            width: 28, height: 14, borderRadius: 7, position: 'relative',
            background: isDangerous ? COLORS.status.error : COLORS.border.subtle,
            transition: 'background .25s ease',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', position: 'absolute', top: 2,
              left: isDangerous ? 16 : 2,
              background: isDangerous ? '#fff' : COLORS.text.dim,
              transition: 'left .25s ease',
            }} />
          </div>
          {isDangerous && <span style={{ color: COLORS.status.error }}>DANGER</span>}
        </button>

        {/* Voice toggle */}
        <button onClick={toggleVoice} style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: 6,
          background: listening ? '#E74C3C20' : COLORS.bg.surface,
          border: `1px solid ${listening ? COLORS.status.error : COLORS.border.subtle}`,
        }} title={listening ? 'Stop voice' : 'Start voice'}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={listening ? COLORS.status.error : COLORS.text.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="1" width="6" height="11" rx="3" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <button onClick={onClose} style={{
          all: 'unset', cursor: 'pointer', fontSize: 12, color: COLORS.text.dim, fontFamily: fc, padding: '0 4px',
        }} title="Kill terminal">✕</button>
      </div>

      <ContextBar percent={ctxPercent} />

      {/* Voice status bar */}
      {listening && (
        <div style={{
          padding: '4px 12px', background: COLORS.bg.overlay, borderBottom: `1px solid ${COLORS.border.subtle}`,
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.status.error, animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 11, color: COLORS.text.dim, fontFamily: fc, fontStyle: 'italic' }}>
            {voiceStatus || 'Listening...'}
          </span>
        </div>
      )}

      {/* Terminal */}
      <div ref={termRef} style={{ flex: 1, padding: '4px 8px', minHeight: 0, overflow: 'hidden' }} />

      {/* Quick-action buttons */}
      {termOptions && (
        <div style={{
          padding: '6px 12px', background: COLORS.bg.overlay, borderTop: `1px solid ${COLORS.border.subtle}`,
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: COLORS.text.dim, fontFamily: fc }}>Quick:</span>
          {termOptions.map((opt, i) => (
            <button key={i} onClick={() => {
              sendToTerminal(/^\d+$/.test(opt.value) ? opt.value + '\r' : opt.value);
              setTermOptions(null);
              outputBufRef.current = '';
            }} style={{
              all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              padding: '4px 12px', borderRadius: 6, fontFamily: fc,
              background: COLORS.bg.surface, color: COLORS.accent.green, border: `1px solid ${COLORS.border.subtle}`,
              transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = COLORS.accent.green; }}
            onMouseLeave={(e) => { e.target.style.borderColor = COLORS.border.subtle; }}
            >{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
