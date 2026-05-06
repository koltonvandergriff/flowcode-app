import { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { FONTS, LAYOUTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { SettingsContext } from '../contexts/SettingsContext';
import TerminalPane from './TerminalPane';
import ResizeHandle from './ResizeHandle';

const fc = FONTS.mono;

export default function TerminalGrid({ dangerFlags, onToggleDanger }) {
  const { colors } = useTheme();
  const { activeData, updateWorkspace } = useContext(WorkspaceContext);
  const { settings } = useContext(SettingsContext);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const [paneSizes, setPaneSizes] = useState(null);
  const gridRef = useRef(null);

  const layout = activeData?.layout || '2x1';
  const terminals = activeData?.terminals || [];
  const layoutDef = LAYOUTS.find((l) => l.id === layout) || LAYOUTS[1];
  const visible = terminals.slice(0, layoutDef.max);

  useEffect(() => {
    if (visible.length > 0 && (!focusedId || !visible.find((t) => t.id === focusedId))) {
      setFocusedId(visible[0]?.id || null);
    }
  }, [visible, focusedId]);

  useEffect(() => {
    setPaneSizes(null);
  }, [layout]);

  // Custom event listeners for keyboard shortcuts
  useEffect(() => {
    const onSetLayout = (e) => setLayout(e.detail);
    const onAddTerminal = () => addTerminal();
    const onCloseTerminal = () => { if (focusedId) removeTerminal(focusedId); };
    const onCycleFocus = () => {
      if (visible.length < 2) return;
      const idx = visible.findIndex((t) => t.id === focusedId);
      setFocusedId(visible[(idx + 1) % visible.length].id);
    };
    const onInsertSnippet = (e) => {
      window.dispatchEvent(new CustomEvent('flowcode:insertToTerminal', { detail: { terminalId: focusedId, text: e.detail } }));
    };

    window.addEventListener('flowcode:setLayout', onSetLayout);
    window.addEventListener('flowcode:addTerminal', onAddTerminal);
    window.addEventListener('flowcode:closeTerminal', onCloseTerminal);
    window.addEventListener('flowcode:cycleFocus', onCycleFocus);
    window.addEventListener('flowcode:insertSnippet', onInsertSnippet);
    return () => {
      window.removeEventListener('flowcode:setLayout', onSetLayout);
      window.removeEventListener('flowcode:addTerminal', onAddTerminal);
      window.removeEventListener('flowcode:closeTerminal', onCloseTerminal);
      window.removeEventListener('flowcode:cycleFocus', onCycleFocus);
      window.removeEventListener('flowcode:insertSnippet', onInsertSnippet);
    };
  }, [focusedId, visible]);

  const setLayout = useCallback((id) => {
    updateWorkspace((prev) => ({ ...prev, layout: id }));
  }, [updateWorkspace]);

  const addTerminal = useCallback(() => {
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const num = terminals.length + 1;
    const provider = settings?.defaultProvider || 'claude';
    const cwd = settings?.defaultCwd || undefined;
    updateWorkspace((prev) => ({
      ...prev,
      terminals: [...(prev.terminals || []), { id, label: `Session ${num}`, provider, cwd }],
    }));
  }, [terminals, updateWorkspace, settings]);

  const removeTerminal = useCallback((id) => {
    window.flowcode?.terminal.kill(id);
    updateWorkspace((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).filter((t) => t.id !== id),
    }));
    if (focusedId === id) {
      const remaining = visible.filter((t) => t.id !== id);
      setFocusedId(remaining[0]?.id || null);
    }
  }, [updateWorkspace, focusedId, visible]);

  const renameTerminal = useCallback((id, label) => {
    updateWorkspace((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).map((t) => t.id === id ? { ...t, label } : t),
    }));
  }, [updateWorkspace]);

  const updateTerminalCwd = useCallback((id, cwd) => {
    updateWorkspace((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).map((t) => t.id === id ? { ...t, cwd } : t),
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

  const handleResize = useCallback((index, delta, axis) => {
    if (!gridRef.current) return;
    const container = gridRef.current;
    const totalSize = axis === 'col' ? container.offsetWidth : container.offsetHeight;
    const deltaPercent = (delta / totalSize) * 100;

    setPaneSizes((prev) => {
      const count = axis === 'col' ? layoutDef.cols : (layout === '2x2' ? 2 : 1);
      const sizes = prev?.[axis] || Array(count).fill(100 / count);
      const next = [...sizes];
      const minSize = 15;
      next[index] = Math.max(minSize, next[index] + deltaPercent);
      next[index + 1] = Math.max(minSize, next[index + 1] - deltaPercent);
      return { ...(prev || {}), [axis]: next };
    });
  }, [layoutDef, layout]);

  if (terminals.length === 0 && activeData) {
    addTerminal();
    return null;
  }

  const renderPane = (t, style) => (
    <div key={t.id} style={style} onClick={() => setFocusedId(t.id)}>
      <TerminalPane
        id={t.id}
        label={t.label}
        provider={t.provider}
        cwd={t.cwd}
        fontSize={settings?.fontSize}
        isFocused={focusedId === t.id}
        onClose={() => removeTerminal(t.id)}
        onRename={(name) => renameTerminal(t.id, name)}
        onCwdChange={(cwd) => updateTerminalCwd(t.id, cwd)}
        isDangerous={dangerFlags?.global || !!dangerFlags?.perTerminal?.[t.id]}
        onToggleDanger={() => onToggleDanger?.(t.id)}
        isDragging={dragId === t.id}
        isDropTarget={dropTarget === t.id && dragId !== t.id}
        onDragStart={() => setDragId(t.id)}
        onDragEnd={() => { setDragId(null); setDropTarget(null); }}
        onDragOver={() => setDropTarget(t.id)}
        onDrop={() => handleDrop(t.id)}
      />
    </div>
  );

  const colSizes = paneSizes?.col || Array(layoutDef.cols).fill(100 / layoutDef.cols);
  const rowSizes = paneSizes?.row || (layout === '2x2' ? [50, 50] : [100]);

  const buildRow = (items, rowIdx) => {
    const result = [];
    items.forEach((t, i) => {
      result.push(renderPane(t, { flex: `${colSizes[i] || (100 / items.length)} 1 0`, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }));
      if (i < items.length - 1) {
        result.push(
          <ResizeHandle key={`rh-${rowIdx}-${i}`} direction="vertical"
            onResize={(delta) => handleResize(i, delta, 'col')} />
        );
      }
    });
    return result;
  };

  const renderGrid = () => {
    if (layout === '2x2') {
      const row1 = visible.slice(0, 2);
      const row2 = visible.slice(2, 4);
      return (
        <div ref={gridRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: `${rowSizes[0]} 1 0`, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            {buildRow(row1, 0)}
          </div>
          {row2.length > 0 && (
            <>
              <ResizeHandle direction="horizontal" onResize={(delta) => handleResize(0, delta, 'row')} />
              <div style={{ flex: `${rowSizes[1]} 1 0`, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
                {buildRow(row2, 1)}
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div ref={gridRef} style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {buildRow(visible, 0)}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: colors.bg.raised, borderRadius: 12, border: `1px solid ${colors.border.subtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.accent.green, letterSpacing: 1.5, fontFamily: fc }}>
            TERMINALS
          </span>
          <span style={{ fontSize: 11, color: colors.text.muted, fontFamily: fc }}>
            {terminals.length} session{terminals.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => setLayout(l.id)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              padding: '6px 10px', borderRadius: 6, fontFamily: fc,
              background: layout === l.id ? colors.accent.purple + '20' : 'transparent',
              color: layout === l.id ? colors.accent.purple : colors.text.dim,
              transition: 'all .2s ease',
            }}>{l.label}</button>
          ))}
          <button onClick={addTerminal} style={{
            all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            padding: '6px 14px', borderRadius: 8, fontFamily: fc,
            background: `linear-gradient(135deg,${colors.accent.green},${colors.accent.cyan})`, color: '#fff',
            marginLeft: 4, boxShadow: `0 2px 8px ${colors.accent.green}30`,
          }}>+ TERMINAL</button>
        </div>
      </div>

      {renderGrid()}
    </div>
  );
}
