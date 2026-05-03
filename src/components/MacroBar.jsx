import { useState } from 'react';
import { FONTS, COLORS } from '../lib/constants';

const fc = FONTS.mono;

export default function MacroBar({ macros, onExecute, onDelete }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAction, setNewAction] = useState('');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
      background: COLORS.bg.raised, borderRadius: 10, border: `1px solid ${COLORS.border.subtle}`,
      overflowX: 'auto', flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.text.dim, fontFamily: fc, letterSpacing: 1, flexShrink: 0 }}>
        MACROS
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
            background: COLORS.bg.surface, color: COLORS.text.secondary,
            border: `1px solid ${COLORS.border.subtle}`,
            transition: 'all .15s ease', flexShrink: 0, whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.accent.purple; e.currentTarget.style.color = COLORS.accent.purple; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border.subtle; e.currentTarget.style.color = COLORS.text.secondary; }}
        >
          <span>{m.icon}</span>
          <span>{m.name}</span>
        </button>
      ))}

      {showCreate ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input placeholder="name" value={newName} onChange={(e) => setNewName(e.target.value)}
            style={{ width: 80, background: COLORS.bg.surface, border: `1px solid ${COLORS.border.subtle}`, borderRadius: 4, padding: '3px 6px', color: COLORS.text.secondary, fontSize: 10, fontFamily: fc, outline: 'none' }} />
          <input placeholder="desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            style={{ width: 100, background: COLORS.bg.surface, border: `1px solid ${COLORS.border.subtle}`, borderRadius: 4, padding: '3px 6px', color: COLORS.text.secondary, fontSize: 10, fontFamily: fc, outline: 'none' }} />
          <input placeholder="send text" value={newAction} onChange={(e) => setNewAction(e.target.value)}
            style={{ width: 100, background: COLORS.bg.surface, border: `1px solid ${COLORS.border.subtle}`, borderRadius: 4, padding: '3px 6px', color: COLORS.text.secondary, fontSize: 10, fontFamily: fc, outline: 'none' }} />
          <button onClick={() => {
            if (newName.trim()) {
              onExecute?.({ type: 'create', name: newName, desc: newDesc, action: { type: 'sendActive', value: newAction + '\n' } });
              setNewName(''); setNewDesc(''); setNewAction(''); setShowCreate(false);
            }
          }} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 8px',
            borderRadius: 4, background: COLORS.accent.green, color: '#fff', fontFamily: fc,
          }}>Save</button>
          <button onClick={() => setShowCreate(false)} style={{
            all: 'unset', cursor: 'pointer', fontSize: 10, color: COLORS.text.dim, fontFamily: fc,
          }}>&#10005;</button>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} style={{
          all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 8px',
          borderRadius: 6, background: 'transparent', color: COLORS.text.dim, fontFamily: fc,
          border: `1px dashed ${COLORS.border.subtle}`, flexShrink: 0,
        }}>+ NEW</button>
      )}
    </div>
  );
}
