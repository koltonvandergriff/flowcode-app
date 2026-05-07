import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;
const fb = FONTS.body;

const TYPES = [
  { id: 'fact', label: 'Fact', icon: '📌' },
  { id: 'decision', label: 'Decision', icon: '⚖️' },
  { id: 'context', label: 'Context', icon: '📎' },
  { id: 'reference', label: 'Reference', icon: '🔗' },
  { id: 'note', label: 'Note', icon: '📝' },
];

export default function MemoryPanel({ open, onToggle }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'note', tags: '' });

  const load = useCallback(async () => {
    const data = await window.flowcode?.memory.list();
    setEntries(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e => {
    if (filterType && e.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.title?.toLowerCase().includes(q) || e.content?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await window.flowcode?.memory.create({
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setForm({ title: '', content: '', type: 'note', tags: '' });
    setCreating(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editingId || !form.title.trim()) return;
    await window.flowcode?.memory.update(editingId, {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditingId(null);
    setForm({ title: '', content: '', type: 'note', tags: '' });
    load();
  };

  const handleDelete = async (id) => {
    await window.flowcode?.memory.delete(id);
    load();
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setForm({ title: e.title, content: e.content, type: e.type, tags: (e.tags || []).join(', ') });
    setCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderBottom: `1px solid ${colors.border.subtle}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>🧠</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.text.primary, fontFamily: fb }}>Memory</span>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 8,
                background: (colors.accent.primary || colors.accent.cyan) + '15',
                color: colors.accent.primary || colors.accent.cyan, fontFamily: fc,
              }}>{entries.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => { setCreating(true); setEditingId(null); setForm({ title: '', content: '', type: 'note', tags: '' }); }}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: colors.accent.secondary || colors.accent.green }}>+</button>
              <button onClick={onToggle}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 10, color: colors.text.dim }}>◀</button>
            </div>
          </div>

          {/* Search + Filter */}
          <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memory..."
              style={{
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                borderRadius: 5, padding: '4px 8px', color: colors.text.secondary,
                fontSize: 11, fontFamily: fc, outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setFilterType(filterType === t.id ? null : t.id)}
                  style={{
                    all: 'unset', cursor: 'pointer', fontSize: 10, padding: '3px 7px', borderRadius: 4,
                    fontFamily: fc, fontWeight: 600,
                    background: filterType === t.id ? (colors.accent.primary || colors.accent.purple) + '20' : 'transparent',
                    color: filterType === t.id ? (colors.accent.primary || colors.accent.purple) : colors.text.dim,
                  }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </div>

          {/* Create / Edit Form */}
          {(creating || editingId) && (
            <div style={{ padding: '6px 8px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title" style={{
                  background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                  borderRadius: 4, padding: '5px 8px', color: colors.text.primary,
                  fontSize: 11, fontFamily: fc, outline: 'none',
                }} />
              <textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Content..." rows={3} style={{
                  background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                  borderRadius: 4, padding: '5px 8px', color: colors.text.secondary,
                  fontSize: 11, fontFamily: fc, outline: 'none', resize: 'vertical',
                }} />
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{
                    background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                    borderRadius: 4, padding: '2px 4px', color: colors.text.secondary,
                    fontSize: 9, fontFamily: fc, outline: 'none',
                  }}>
                  {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="tags (comma sep)" style={{
                    flex: 1, background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                    borderRadius: 4, padding: '2px 4px', color: colors.text.secondary,
                    fontSize: 9, fontFamily: fc, outline: 'none',
                  }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={editingId ? handleUpdate : handleCreate} style={{
                  all: 'unset', cursor: 'pointer', fontSize: 9, fontWeight: 700, padding: '3px 8px',
                  borderRadius: 4, background: colors.accent.primary || colors.accent.green, color: '#fff', fontFamily: fc,
                }}>{editingId ? 'Update' : 'Save'}</button>
                <button onClick={() => { setCreating(false); setEditingId(null); }} style={{
                  all: 'unset', cursor: 'pointer', fontSize: 9, color: colors.text.dim, fontFamily: fc,
                }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Entries */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: colors.text.ghost, fontSize: 10, fontFamily: fb }}>
                {entries.length === 0 ? 'No memories yet. Click + to add one.' : 'No matches.'}
              </div>
            )}
            {filtered.map(e => {
              const typeInfo = TYPES.find(t => t.id === e.type) || TYPES[4];
              return (
                <div key={e.id} onClick={() => startEdit(e)} onContextMenu={(ev) => { ev.preventDefault(); handleDelete(e.id); }}
                  style={{
                    padding: '8px 10px', marginBottom: 6, borderRadius: 6, cursor: 'pointer',
                    background: editingId === e.id ? (colors.accent.primary || colors.accent.purple) + '10' : colors.bg.surface,
                    border: `1px solid ${editingId === e.id ? colors.accent.primary || colors.accent.purple : colors.border.subtle}`,
                    transition: 'all .15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 10 }}>{typeInfo.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily: fc, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </span>
                  </div>
                  {e.content && (
                    <div style={{ fontSize: 10, color: colors.text.dim, fontFamily: fc, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.content}
                    </div>
                  )}
                  {e.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                      {e.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 3, fontFamily: fc,
                          background: (colors.accent.primary || colors.accent.cyan) + '10',
                          color: colors.accent.primary || colors.accent.cyan,
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* MCP Info */}
          <div style={{
            padding: '6px 8px', borderTop: `1px solid ${colors.border.subtle}`,
            fontSize: 10, color: colors.text.ghost, fontFamily: fc, textAlign: 'center',
          }}>
            Shared via MCP · External tools can read/write
          </div>
    </div>
  );
}
