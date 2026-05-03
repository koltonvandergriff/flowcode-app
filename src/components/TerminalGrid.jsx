import { useState, useCallback, useContext } from 'react';
import { FONTS, COLORS, LAYOUTS } from '../lib/constants';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import TerminalPane from './TerminalPane';

const fc = FONTS.mono;

export default function TerminalGrid({ dangerFlags, onToggleDanger }) {
  const { activeData, updateWorkspace } = useContext(WorkspaceContext);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const layout = activeData?.layout || '2x1';
  const terminals = activeData?.terminals || [];
  const layoutDef = LAYOUTS.find((l) => l.id === layout) || LAYOUTS[1];

  const setLayout = useCallback((id) => {
    updateWorkspace((prev) => ({ ...prev, layout: id }));
  }, [updateWorkspace]);

  const addTerminal = useCallback(() => {
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const num = terminals.length + 1;
    updateWorkspace((prev) => ({
      ...prev,
      terminals: [...(prev.terminals || []), { id, label: `Session ${num}`, provider: 'claude' }],
    }));
  }, [terminals, updateWorkspace]);

  const removeTerminal = useCallback((id) => {
    window.flowcode?.terminal.kill(id);
    updateWorkspace((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).filter((t) => t.id !== id),
    }));
  }, [updateWorkspace]);

  const renameTerminal = useCallback((id, label) => {
    updateWorkspace((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).map((t) => t.id === id ? { ...t, label } : t),
    }));
  }, [updateWorkspace]);

  const swapTerminals = useCallback((fromId, toId) => {
    updateWorkspace((prev) => {
      const list = [...(prev.terminals || [])];
      const fi = list.findIndex((t) => t.id === fromId);
      const ti = list.findIndex((t) => t.id === toId);
      if (fi >= 0 && ti >= 0) [list[fi], list[ti]] = [list[ti], list[fi]];
      return { ...prev, terminals: list };
    });
  }, [updateWorkspace]);

  const handleDrop = useCallback((toId) => {
    if (dragId && dragId !== toId) swapTerminals(dragId, toId);
    setDragId(null);
    setDropTarget(null);
  }, [dragId, swapTerminals]);

  // Auto-create first terminal
  if (terminals.length === 0 && activeData) {
    addTerminal();
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: COLORS.bg.raised, borderRadius: 12, border: `1px solid ${COLORS.border.subtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent.green, letterSpacing: 1.5, fontFamily: fc }}>
            TERMINALS
          </span>
          <span style={{ fontSize: 11, color: COLORS.text.muted, fontFamily: fc }}>
            {terminals.length} session{terminals.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => setLayout(l.id)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              padding: '6px 10px', borderRadius: 6, fontFamily: fc,
              background: layout === l.id ? COLORS.bg.overlay : 'transparent',
              color: layout === l.id ? '#fff' : COLORS.text.dim,
              transition: 'all .2s ease',
            }}>{l.label}</button>
          ))}
          <button onClick={addTerminal} style={{
            all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            padding: '6px 14px', borderRadius: 8, fontFamily: fc,
            background: `linear-gradient(135deg,${COLORS.accent.green},${COLORS.accent.cyan})`, color: '#fff',
            marginLeft: 4, boxShadow: `0 2px 8px ${COLORS.accent.green}30`,
          }}>+ TERMINAL</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${layoutDef.cols}, minmax(0, 1fr))`,
        gridAutoRows: layout === '2x2' ? '1fr' : undefined,
        gridTemplateRows: layout === '2x2' ? '1fr 1fr' : '1fr',
        gap: 6, flex: 1, minHeight: 0, overflow: 'hidden',
      }}>
        {terminals.slice(0, layoutDef.max).map((t) => (
          <TerminalPane
            key={t.id}
            id={t.id}
            label={t.label}
            provider={t.provider}
            cwd={t.cwd}
            onClose={() => removeTerminal(t.id)}
            onRename={(name) => renameTerminal(t.id, name)}
            isDangerous={dangerFlags?.global || !!dangerFlags?.perTerminal?.[t.id]}
            onToggleDanger={() => onToggleDanger?.(t.id)}
            isDragging={dragId === t.id}
            isDropTarget={dropTarget === t.id && dragId !== t.id}
            onDragStart={() => setDragId(t.id)}
            onDragEnd={() => { setDragId(null); setDropTarget(null); }}
            onDragOver={() => setDropTarget(t.id)}
            onDrop={() => handleDrop(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
