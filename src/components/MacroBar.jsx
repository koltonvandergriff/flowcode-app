import { useState } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;
const fb = FONTS.body;

export default function MacroBar({ macros, onExecute, onDelete }) {
  const { colors } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAction, setNewAction] = useState('');

  return (
    <div className="fc-glass" style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '3px 12px',
      background: colors.bg.glass || colors.bg.raised, borderRadius: 8,
      border: `1px solid ${colors.border.subtle}`,
      overflowX: 'auto', flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: colors.text.ghost, fontFamily: fb, letterSpacing: 0.3, flexShrink: 0 }}>
        Macros
      </span>

      {macros.map((m) => (
        <button
          key={m.id}
          onClick={() => onExecute?.(m)}
          onContextMenu={(e) => { e.preventDefault(); if (m.type !== 'builtin') onDelete?.(m.id); }}
          title={m.desc + (m.type !== 'builtin' ? ' (right-click to delete)' : '')}
          style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontFamily: fc, fontSize: 11, fontWeight: 600,
            background: colors.bg.surface, color: colors.text.secondary,
            border: `1px solid ${colors.border.subtle}`,
            transition: 'all .15s ease', flexShrink: 0, whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.purple; e.currentTarget.style.color = colors.accent.purple; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.secondary; }}
        >
          <span>{m.icon}</span>
          <span>{m.name}</span>
        </button>
      ))}

      {showCreate ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input placeholder="name" value={newName} onChange={(e) => setNewName(e.target.value)}
            style={{ width: 80, background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 4, padding: '3px 6px', color: colors.text.secondary, fontSize: 10, fontFamily: fc, outline: 'none' }} />
          <input placeholder="desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            style={{ width: 100, background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 4, padding: '3px 6px', color: colors.text.secondary, fontSize: 10, fontFamily: fc, outline: 'none' }} />
          <input placeholder="send text" value={newAction} onChange={(e) => setNewAction(e.target.value)}
            style={{ width: 100, background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 4, padding: '3px 6px', color: colors.text.secondary, fontSize: 10, fontFamily: fc, outline: 'none' }} />
          <button onClick={() => {
            if (newName.trim()) {
              onExecute?.({ type: 'create', name: newName, desc: newDesc, action: { type: 'sendActive', value: newAction + '\n' } });
              setNewName(''); setNewDesc(''); setNewAction(''); setShowCreate(false);
            }
          }} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 8px',
            borderRadius: 4, background: colors.accent.green, color: '#fff', fontFamily: fc,
          }}>Save</button>
          <button onClick={() => setShowCreate(false)} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, color: colors.text.dim, fontFamily: fc,
          }}>&#10005;</button>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} style={{
          all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 8px',
          borderRadius: 6, background: 'transparent', color: colors.text.dim, fontFamily: fc,
          border: `1px dashed ${colors.border.subtle}`, flexShrink: 0,
        }}>+ NEW</button>
      )}
    </div>
  );
}
