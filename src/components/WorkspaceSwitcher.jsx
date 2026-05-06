import { useState, useContext, useRef, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { ToastContext } from '../contexts/ToastContext';

const fc = FONTS.mono;

const SENSITIVE_KEYS = ['apiKey', 'apiKeys', 'envVars', 'env', 'secrets', 'tokens', 'credentials', 'password', 'secret'];

function stripSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(stripSensitiveData);
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) continue;
    cleaned[key] = typeof value === 'object' ? stripSensitiveData(value) : value;
  }
  return cleaned;
}

function validateWorkspaceData(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.name !== 'string' || !data.name.trim()) return false;
  if (data.layout && typeof data.layout !== 'string') return false;
  if (data.terminals && !Array.isArray(data.terminals)) return false;
  if (data.macros && !Array.isArray(data.macros)) return false;
  return true;
}

export default function WorkspaceSwitcher() {
  const { colors } = useTheme();
  const { workspaces, activeId, createWorkspace, switchWorkspace, deleteWorkspace, renameWorkspace } = useContext(WorkspaceContext);
  const { addToast } = useContext(ToastContext);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef(null);

  const handleExport = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await window.flowcode.workspace.load(activeId);
      if (!data) {
        addToast('Failed to load workspace data', 'error');
        return;
      }

      const exportData = stripSensitiveData({
        name: data.name,
        layout: data.layout,
        terminals: (data.terminals || []).map((t) => ({
          label: t.label,
          provider: t.provider,
          cwd: t.cwd,
        })),
        macros: data.macros || [],
        exportedAt: new Date().toISOString(),
        version: '1.0',
      });

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowcode-workspace-${data.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`Workspace "${data.name}" exported`, 'success');
    } catch (err) {
      addToast('Export failed: ' + err.message, 'error');
    }
  }, [activeId, addToast]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!validateWorkspaceData(data)) {
        addToast('Invalid workspace file: missing required fields (name)', 'error');
        return;
      }

      const ws = await createWorkspace(data.name + ' (imported)');
      if (ws) {
        const saveData = {
          ...ws,
          layout: data.layout || '2x1',
          terminals: (data.terminals || []).map((t) => ({
            label: t.label || 'Terminal',
            provider: t.provider || 'shell',
            cwd: t.cwd || '',
          })),
          macros: data.macros || [],
        };
        await window.flowcode.workspace.save(ws.id, saveData);
        await switchWorkspace(ws.id);
        addToast(`Workspace "${data.name}" imported`, 'success');
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        addToast('Invalid JSON file', 'error');
      } else {
        addToast('Import failed: ' + err.message, 'error');
      }
    }
  }, [createWorkspace, switchWorkspace, addToast]);

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
                background: colors.bg.surface, border: `1px solid ${colors.border.focus}`, borderRadius: 6,
                padding: '5px 10px', color: colors.text.primary, fontSize: 11, fontFamily: fc, outline: 'none',
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
                background: ws.id === activeId ? `linear-gradient(135deg,${colors.accent.purple},#6c5ce7)` : 'transparent',
                color: ws.id === activeId ? '#fff' : colors.text.dim,
                transition: 'all .2s ease',
                boxShadow: ws.id === activeId ? `0 2px 10px ${colors.accent.purple}30` : 'none',
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
              background: colors.bg.surface, border: `1px solid ${colors.border.focus}`, borderRadius: 6,
              padding: '5px 10px', color: colors.text.primary, fontSize: 11, fontFamily: fc, outline: 'none',
              width: 120,
            }}
          />
          <button onClick={() => setCreating(false)} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, color: colors.text.dim, fontFamily: fc,
          }}>&#10005;</button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} style={{
          all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '6px 10px',
          borderRadius: 8, fontFamily: fc, color: colors.text.dim,
          border: `1px dashed ${colors.border.subtle}`,
        }}>+</button>
      )}

      {/* Import/Export buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
        <button
          onClick={handleExport}
          title="Export current workspace"
          style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 6, transition: 'background .15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text.dim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import workspace from file"
          style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 6, transition: 'background .15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text.dim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
