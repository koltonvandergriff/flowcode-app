// Glasshouse Terminals page. Cosmetic wrapper around the existing
// TerminalGrid — full feature parity (multi-pane, providers, danger flags,
// resize handles, focus management) is preserved. Adds page header + a
// glassy outer frame so the grid sits in the same visual language as the
// rest of the glasshouse views.
//
// The classic WorkspaceSwitcher used a purple-gradient pill that didn't
// belong in the cyan glass shell; we inline a slim cyan-themed version
// here using the same WorkspaceContext, so behavior (rename, delete,
// create) is identical but the visuals match.

import { useContext, useRef, useState, useEffect } from 'react';
import TerminalGrid from '../TerminalGrid';
import ErrorBoundary from '../ErrorBoundary';
import { WorkspaceContext } from '../../contexts/WorkspaceContext';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

export default function TerminalsGlasshouse({ dangerFlags = {}, onToggleDanger = () => {} }) {
  return (
    <div style={s.root}>
      <div style={s.head}>
        <div style={s.headTextWrap}>
          <h1 style={s.h1}>Terminals</h1>
          <p style={s.sub}>Multi-pane shell · split, focus, swap providers — same engine as before, polished chrome.</p>
        </div>
        <div style={s.headChips}>
          <span style={s.chip}>
            <span style={s.dot} /> Live
          </span>
          <span style={s.chipMute}>⌘ T to spawn</span>
        </div>
      </div>

      <WorkspaceTabs />

      <div style={s.frame}>
        <ErrorBoundary name="Glasshouse · Terminals">
          <TerminalGrid dangerFlags={dangerFlags} onToggleDanger={onToggleDanger} />
        </ErrorBoundary>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceTabs — glasshouse-skinned switcher.
//   single-click: switch
//   double-click: rename
//   right-click: delete (with cheap confirm via window.confirm)
//   +: spawn new workspace, auto-name "Workspace N"
// ---------------------------------------------------------------------------
function WorkspaceTabs() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) return null;
  const { workspaces, activeId, createWorkspace, switchWorkspace, deleteWorkspace, renameWorkspace } = ctx;

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const editRef = useRef(null);

  useEffect(() => {
    if (editingId && editRef.current) { editRef.current.focus(); editRef.current.select(); }
  }, [editingId]);

  const commitRename = (id) => {
    const name = editValue.trim();
    if (name) renameWorkspace(id, name);
    setEditingId(null);
  };

  const commitCreate = async () => {
    const name = (createValue || `Workspace ${workspaces.length + 1}`).trim();
    if (!name) { setCreating(false); return; }
    const ws = await createWorkspace(name);
    if (ws) switchWorkspace(ws.id);
    setCreating(false);
    setCreateValue('');
  };

  return (
    <div style={tabs.row} aria-label="Workspaces">
      {workspaces.map(ws => {
        const isActive = ws.id === activeId;
        const isEditing = editingId === ws.id;
        return (
          <div key={ws.id} style={tabs.tabWrap}>
            {isEditing ? (
              <input
                ref={editRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(ws.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => commitRename(ws.id)}
                style={tabs.input}
              />
            ) : (
              <button
                onClick={() => !isActive && switchWorkspace(ws.id)}
                onDoubleClick={() => { setEditingId(ws.id); setEditValue(ws.name); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (workspaces.length <= 1) return;
                  if (window.confirm(`Delete workspace "${ws.name}"?`)) deleteWorkspace(ws.id);
                }}
                title={`${ws.name} · ${ws.terminalCount || 0} terminals — double-click to rename, right-click to delete`}
                style={{
                  ...tabs.tab,
                  ...(isActive ? tabs.tabActive : null),
                }}
              >
                <span style={{ ...tabs.tabDot, ...(isActive ? tabs.tabDotActive : null) }} />
                <span style={tabs.tabLabel}>{ws.name}</span>
                {typeof ws.terminalCount === 'number' && ws.terminalCount > 0 && (
                  <span style={tabs.tabCount}>{ws.terminalCount}</span>
                )}
              </button>
            )}
          </div>
        );
      })}

      {creating ? (
        <input
          autoFocus
          value={createValue}
          onChange={(e) => setCreateValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitCreate();
            if (e.key === 'Escape') { setCreating(false); setCreateValue(''); }
          }}
          onBlur={commitCreate}
          placeholder={`Workspace ${workspaces.length + 1}`}
          style={tabs.input}
        />
      ) : (
        <button onClick={() => setCreating(true)} title="New workspace" style={tabs.addBtn}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}

const s = {
  root: {
    flex: 1, padding: '24px 24px 18px',
    display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0,
  },
  head: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 14, marginBottom: 12,
  },
  headTextWrap: { minWidth: 0 },
  h1: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 28, letterSpacing: '-0.03em', margin: '0 0 4px',
  },
  sub: {
    fontSize: 12, color: '#94a3b8',
    margin: 0, fontFamily: FONT_MONO, lineHeight: 1.5,
  },
  headChips: { display: 'flex', alignItems: 'center', gap: 8 },
  chip: {
    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
    padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(77,230,240,0.3)', background: 'rgba(77,230,240,0.06)',
    color: '#4de6f0',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    letterSpacing: '0.05em',
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#4de6f0',
    boxShadow: '0 0 8px #4de6f0',
  },
  chipMute: {
    fontFamily: FONT_MONO, fontSize: 10,
    padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#94a3b8',
    letterSpacing: '0.05em',
  },

  // Glassy outer container — matches the panel chrome on Overview / Memory /
  // Pricing pages so the terminal grid feels native to the glasshouse shell.
  frame: {
    flex: 1, minHeight: 0, minWidth: 0,
    position: 'relative',
    background: 'rgba(8, 8, 18, 0.55)',
    border: '1px solid rgba(77,230,240,0.07)',
    borderRadius: 14,
    backdropFilter: 'blur(16px) saturate(1.15)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.04),' +
      'inset 0 0 0 1px rgba(77,230,240,0.04),' +
      '0 16px 48px rgba(0,0,0,0.4)',
    padding: 12,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
};

const tabs = {
  row: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tabWrap: { position: 'relative' },
  tab: {
    all: 'unset', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 8,
    fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600,
    letterSpacing: '0.03em',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#94a3b8',
    transition: 'background .15s, border-color .15s, color .15s',
  },
  tabActive: {
    background: 'rgba(77,230,240,0.08)',
    border: '1px solid rgba(77,230,240,0.4)',
    color: '#4de6f0',
    boxShadow: '0 0 12px rgba(77,230,240,0.08), inset 0 0 0 1px rgba(77,230,240,0.1)',
  },
  tabDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#4a5168',
    transition: 'background .15s, box-shadow .15s',
  },
  tabDotActive: {
    background: '#4de6f0',
    boxShadow: '0 0 8px #4de6f0',
  },
  tabLabel: {
    maxWidth: 140,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tabCount: {
    fontSize: 9, fontWeight: 700,
    padding: '1px 5px', borderRadius: 99,
    background: 'rgba(255,255,255,0.05)',
    color: '#6b7a90',
    letterSpacing: 0,
  },
  input: {
    all: 'unset',
    padding: '5px 10px', borderRadius: 8,
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(77,230,240,0.4)',
    boxShadow: '0 0 0 3px rgba(77,230,240,0.08)',
    fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600,
    color: '#f1f5f9',
    minWidth: 100,
  },
  addBtn: {
    all: 'unset', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: 8,
    border: '1px dashed rgba(255,255,255,0.18)',
    color: '#94a3b8',
    transition: 'border-color .15s, color .15s, background .15s',
  },
};
