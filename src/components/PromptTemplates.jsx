import { useState, useContext, useMemo } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { SettingsContext } from '../contexts/SettingsContext';

const fc = FONTS.mono;

export default function PromptTemplates({ onInsert }) {
  const { colors } = useTheme();
  const { settings, updateSetting } = useContext(SettingsContext);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [newContent, setNewContent] = useState('');

  const templates = settings?.promptTemplates || [];

  const filtered = useMemo(() => {
    if (!search) return templates;
    const s = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(s) || t.content.toLowerCase().includes(s) || t.category.toLowerCase().includes(s));
  }, [templates, search]);

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))].sort(), [templates]);

  const saveNew = () => {
    if (!newName.trim() || !newContent.trim()) return;
    const tpl = { id: `tpl-${Date.now()}`, name: newName.trim(), category: newCategory, content: newContent.trim() };
    updateSetting('promptTemplates', [...templates, tpl]);
    setCreating(false);
    setNewName('');
    setNewContent('');
  };

  const deleteTemplate = (id) => {
    updateSetting('promptTemplates', templates.filter((t) => t.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.subtle}`, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, background: colors.bg.surface,
          border: `1px solid ${colors.border.subtle}`, borderRadius: 6, padding: '6px 10px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text.ghost} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: colors.text.secondary, fontSize: 11, fontFamily: fc, padding: 0,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, color: colors.text.dim, fontFamily: fc,
            }}>&#10005;</button>
          )}
          <button onClick={() => setCreating(!creating)} title={creating ? 'Cancel' : 'New template'} style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: 4, fontSize: 14,
            color: creating ? colors.status.error : colors.accent.green,
            transition: 'all 0.15s',
          }}>{creating ? '×' : '+'}</button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ padding: '10px 10px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name"
            style={{ background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 4, padding: '6px 8px', color: '#fff', fontSize: 12, fontFamily: fc, outline: 'none' }} />
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            style={{ background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 4, padding: '6px 8px', color: '#fff', fontSize: 12, fontFamily: fc, outline: 'none', cursor: 'pointer' }}>
            {[...categories, 'Custom'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Prompt text..."
            rows={3} style={{ background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 4, padding: '6px 8px', color: '#fff', fontSize: 12, fontFamily: fc, outline: 'none', resize: 'vertical' }} />
          <button onClick={saveNew} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '7px',
            borderRadius: 6, background: `linear-gradient(135deg,${colors.accent.green},${colors.accent.cyan})`, color: '#fff', fontFamily: fc,
          }}>SAVE</button>
        </div>
      )}

      {/* Template list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '24px 14px', fontSize: 11, color: colors.text.ghost, fontFamily: fc, textAlign: 'center' }}>
            {search ? 'No matching templates' : 'No templates yet'}
          </div>
        )}
        {filtered.map((t) => (
          <div key={t.id}
            onContextMenu={(e) => { e.preventDefault(); if (!t.id.match(/^tpl-\d$/)) deleteTemplate(t.id); }}
            style={{ padding: '8px 12px', cursor: 'pointer', transition: 'background .15s' }}
            onClick={() => onInsert?.(t.content)}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily: fc }}>{t.name}</span>
              <span style={{
                fontSize: 9, padding: '2px 5px', borderRadius: 3, fontFamily: fc, fontWeight: 600,
                background: colors.bg.surface, color: colors.text.ghost,
              }}>{t.category}</span>
            </div>
            <div style={{ fontSize: 11, color: colors.text.dim, fontFamily: fc, marginTop: 3, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.content}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 12px', borderTop: `1px solid ${colors.border.subtle}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: colors.text.dim, fontFamily: fc }}>
          {templates.length} template{templates.length !== 1 ? 's' : ''} {search ? `(${filtered.length} shown)` : ''}
        </span>
      </div>
    </div>
  );
}
