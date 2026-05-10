import { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { FONTS, LAYOUTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { isGlasshouseEnabled } from '../lib/glasshouseTheme';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { SettingsContext } from '../contexts/SettingsContext';
import TerminalPane from './TerminalPane';
import ResizeHandle from './ResizeHandle';

const fc = FONTS.mono;
const fb = FONTS.body;

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
      window.dispatchEvent(new CustomEvent('flowade:insertToTerminal', { detail: { terminalId: focusedId, text: e.detail } }));
    };
    const onApplyRoom = (e) => {
      const room = e.detail;
      if (!room) return;
      updateWorkspace((prev) => {
        const newTerminals = room.terminals.map((t, i) => ({
          id: `term-${Date.now()}-${i}`,
          label: t.label,
          provider: t.provider,
          cwd: settings?.defaultCwd || undefined,
        }));
        return { ...prev, layout: room.layout, terminals: newTerminals };
      });
    };

    window.addEventListener('flowade:setLayout', onSetLayout);
    window.addEventListener('flowade:addTerminal', onAddTerminal);
    window.addEventListener('flowade:closeTerminal', onCloseTerminal);
    window.addEventListener('flowade:cycleFocus', onCycleFocus);
    window.addEventListener('flowade:insertSnippet', onInsertSnippet);
    window.addEventListener('flowade:applyRoom', onApplyRoom);
    return () => {
      window.removeEventListener('flowade:setLayout', onSetLayout);
      window.removeEventListener('flowade:addTerminal', onAddTerminal);
      window.removeEventListener('flowade:closeTerminal', onCloseTerminal);
      window.removeEventListener('flowade:cycleFocus', onCycleFocus);
      window.removeEventListener('flowade:insertSnippet', onInsertSnippet);
      window.removeEventListener('flowade:applyRoom', onApplyRoom);
    };
  }, [focusedId, visible, updateWorkspace, settings]);

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
    window.flowade?.terminal.kill(id);
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

  const rows = layoutDef.rows || 1;
  const colSizes = paneSizes?.col || Array(layoutDef.cols).fill(100 / layoutDef.cols);
  const rowSizes = paneSizes?.row || Array(rows).fill(100 / rows);

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
    const rows = layoutDef.rows || 1;
    const cols = layoutDef.cols || 1;

    if (rows <= 1) {
      return (
        <div ref={gridRef} style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {buildRow(visible, 0)}
        </div>
      );
    }

    const rowChunks = [];
    for (let r = 0; r < rows; r++) {
      rowChunks.push(visible.slice(r * cols, (r + 1) * cols));
    }

    return (
      <div ref={gridRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {rowChunks.map((chunk, r) => {
          if (chunk.length === 0) return null;
          return (
            <div key={r} style={{ display: 'contents' }}>
              {r > 0 && (
                <ResizeHandle direction="horizontal" onResize={(delta) => handleResize(r - 1, delta, 'row')} />
              )}
              <div style={{ flex: `${rowSizes[r] || (100 / rows)} 1 0`, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
                {buildRow(chunk, r)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Glasshouse swaps the toolbar palette + provides a cyan-tinted glass
  // background. All controls + behavior unchanged; visual only.
  const glass = isGlasshouseEnabled();
  const cy = '#4de6f0';
  const cyDeep = '#1aa9bc';
  const tbBg     = glass ? 'rgba(8, 8, 18, 0.55)'                    : (colors.bg.glass || colors.bg.raised);
  const tbBorder = glass ? '1px solid rgba(77,230,240,0.07)'         : `1px solid ${colors.border.subtle}`;
  const labelCol = glass ? '#94a3b8'                                 : colors.text.secondary;
  const countBg  = glass ? 'rgba(77,230,240,0.1)'                    : (colors.accent.primary || colors.accent.green) + '15';
  const countCol = glass ? cy                                        : (colors.accent.primary || colors.accent.green);
  const layBg    = glass ? 'rgba(0,0,0,0.4)'                         : colors.bg.overlay + '80';
  const layActBg = glass ? 'rgba(77,230,240,0.18)'                   : (colors.accent.primary || colors.accent.purple) + '20';
  const layActCol= glass ? cy                                        : (colors.accent.primary || colors.accent.purple);
  const layCol   = glass ? '#94a3b8'                                 : colors.text.dim;
  const addBg    = glass ? 'linear-gradient(135deg, ' + cy + ', ' + cyDeep + ')' : (colors.accent.secondary || colors.accent.green) + '15';
  const addCol   = glass ? '#001014'                                 : (colors.accent.secondary || colors.accent.green);
  const addShadow= glass ? '0 4px 14px rgba(77,230,240,0.25)'        : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div className="fc-glass" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: tbBg, borderRadius: 8,
        border: tbBorder,
        backdropFilter: glass ? 'blur(14px)' : undefined,
        boxShadow: glass ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : undefined,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: labelCol, letterSpacing: glass ? '0.18em' : 0.3,
            textTransform: glass ? 'uppercase' : 'none',
            fontFamily: glass ? 'var(--gh-font-techno, "Chakra Petch", sans-serif)' : fb,
          }}>
            Terminals
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
            background: countBg, color: countCol, fontFamily: fc,
          }}>
            {terminals.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <div style={{
            display: 'flex', gap: 1, padding: 2, borderRadius: glass ? 99 : 6,
            background: layBg,
            border: glass ? '1px solid rgba(255,255,255,0.13)' : 'none',
          }}>
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => setLayout(l.id)} style={{
                all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                padding: '4px 10px', borderRadius: glass ? 99 : 4, fontFamily: fc,
                letterSpacing: '0.04em',
                background: layout === l.id ? layActBg : 'transparent',
                color: layout === l.id ? layActCol : layCol,
                boxShadow: glass && layout === l.id ? '0 0 12px rgba(77,230,240,0.25)' : 'none',
                transition: 'all .15s ease',
              }}>{l.label}</button>
            ))}
          </div>
          <button onClick={addTerminal} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
            padding: '5px 14px', borderRadius: 99, fontFamily: fc,
            letterSpacing: '0.04em',
            background: addBg, color: addCol,
            marginLeft: 6, transition: 'all .15s',
            boxShadow: addShadow,
          }}
          onMouseEnter={(e) => {
            if (glass) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(77,230,240,0.35)'; }
            else { e.currentTarget.style.background = (colors.accent.secondary || colors.accent.green) + '25'; }
          }}
          onMouseLeave={(e) => {
            if (glass) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = addShadow; }
            else { e.currentTarget.style.background = (colors.accent.secondary || colors.accent.green) + '15'; }
          }}
          >+ Terminal</button>
        </div>
      </div>

      {renderGrid()}
    </div>
  );
}
