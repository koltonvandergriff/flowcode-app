import { useState, useContext } from 'react';
import { FONTS, COLORS } from '../lib/constants';
import { WorkspaceContext } from '../contexts/WorkspaceContext';

const fc = FONTS.mono;

export default function WorkspaceSwitcher() {
  const { workspaces, activeId, createWorkspace, switchWorkspace, deleteWorkspace, renameWorkspace } = useContext(WorkspaceContext);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {workspaces.map((ws) => (
        <div key={ws.id} style={{ display: 'flex', alignItems: 'center' }}>
          {editingId === ws.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => { renameWorkspace(ws.id, editName); setEditingId(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { renameWorkspace(ws.id, editName); setEditingId(null); }
                if (e.key === 'Escape') setEditingId(null);
              }}
              style={{
                background: COLORS.bg.surface, border: `1px solid ${COLORS.border.focus}`, borderRadius: 6,
                padding: '5px 10px', color: COLORS.text.primary, fontSize: 11, fontFamily: fc, outline: 'none',
                width: 100,
              }}
            />
          ) : (
            <button
              onClick={() => switchWorkspace(ws.id)}
              onDoubleClick={() => { setEditingId(ws.id); setEditName(ws.name); }}
              onContextMenu={(e) => { e.preventDefault(); if (workspaces.length > 1) deleteWorkspace(ws.id); }}
              title={`${ws.name} (${ws.terminalCount || 0} terminals)\nDouble-click to rename, right-click to delete`}
              style={{
                all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                padding: '6px 14px', borderRadius: 8, fontFamily: fc,
                background: ws.id === activeId ? `linear-gradient(135deg,${COLORS.accent.purple},#6c5ce7)` : 'transparent',
                color: ws.id === activeId ? '#fff' : COLORS.text.dim,
                transition: 'all .2s ease',
                boxShadow: ws.id === activeId ? `0 2px 10px ${COLORS.accent.purple}30` : 'none',
              }}
            >
              {ws.name}
            </button>
          )}
        </div>
      ))}

      {creating ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                createWorkspace(newName.trim());
                setNewName('');
                setCreating(false);
              }
              if (e.key === 'Escape') setCreating(false);
            }}
            placeholder="Workspace name"
            style={{
              background: COLORS.bg.surface, border: `1px solid ${COLORS.border.focus}`, borderRadius: 6,
              padding: '5px 10px', color: COLORS.text.primary, fontSize: 11, fontFamily: fc, outline: 'none',
              width: 120,
            }}
          />
          <button onClick={() => setCreating(false)} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, color: COLORS.text.dim, fontFamily: fc,
          }}>&#10005;</button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} style={{
          all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '6px 10px',
          borderRadius: 8, fontFamily: fc, color: COLORS.text.dim,
          border: `1px dashed ${COLORS.border.subtle}`,
        }}>+</button>
      )}
    </div>
  );
}
