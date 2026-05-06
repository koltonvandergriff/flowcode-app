import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import {
  getKeybindings,
  saveKeybinding,
  resetKeybindings,
  detectConflicts,
} from '../lib/keybindings';

const fc = FONTS.mono;

function formatKeyEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  const key = e.key;
  // Skip bare modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null;

  if (key === 'Tab') parts.push('Tab');
  else if (key === ' ') parts.push('Space');
  else if (key === ',') parts.push(',');
  else if (key.length === 1) parts.push(key.toUpperCase());
  else parts.push(key);

  return parts.join('+');
}

export default function KeybindingsPanel({ open, onClose }) {
  const { colors } = useTheme();
  const [bindings, setBindings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [dirty, setDirty] = useState({});

  const CATEGORY_COLORS = {
    Terminal: colors.accent.green,
    Layout: colors.accent.purple,
    Mode: colors.accent.amber,
    Navigation: colors.accent.cyan,
  };

  const reload = useCallback(() => {
    setBindings(getKeybindings());
    setEditingId(null);
    setPendingKey(null);
    setConflict(null);
    setDirty({});
  }, []);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  // Listen for key combos while recording
  useEffect(() => {
    if (!editingId) return;

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const combo = formatKeyEvent(e);
      if (!combo) return; // bare modifier

      const conflicting = detectConflicts(editingId, combo);
      setConflict(conflicting);
      setPendingKey(combo);
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [editingId]);

  const confirmBinding = useCallback(() => {
    if (!editingId || !pendingKey) return;
    saveKeybinding(editingId, pendingKey);
    setDirty((prev) => ({ ...prev, [editingId]: true }));
    setEditingId(null);
    setPendingKey(null);
    setConflict(null);
    setBindings(getKeybindings());
  }, [editingId, pendingKey]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setPendingKey(null);
    setConflict(null);
  }, []);

  const handleReset = useCallback(() => {
    resetKeybindings();
    reload();
  }, [reload]);

  if (!open) return null;

  // Group by category
  const categories = [...new Set(bindings.map((b) => b.category))];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
          borderRadius: 16, width: 600, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 28px 16px', flexShrink: 0,
          borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          <div>
            <h2 style={{
              fontSize: 18, fontWeight: 700, fontFamily: FONTS.display,
              letterSpacing: 1, color: '#fff', margin: 0,
            }}>
              Keyboard Shortcuts
            </h2>
            <p style={{
              fontSize: 10, color: colors.text.dim, fontFamily: fc,
              letterSpacing: 0.5, margin: '4px 0 0',
            }}>
              Click edit to record a new key combination
            </p>
          </div>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim, padding: '0 4px',
          }}>&#10005;</button>
        </div>

        {/* Bindings table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px 8px' }}>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: CATEGORY_COLORS[cat] || colors.text.muted,
                fontFamily: fc, letterSpacing: 1.5, marginBottom: 8,
                paddingBottom: 6, borderBottom: `1px solid ${colors.border.subtle}`,
              }}>
                {cat.toUpperCase()}
              </div>

              {bindings
                .filter((b) => b.category === cat)
                .map((b) => {
                  const isEditing = editingId === b.id;
                  const isCustom = b.key !== b.defaultKey;

                  return (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                        background: isEditing ? colors.accent.purple + '12' : 'transparent',
                        border: `1px solid ${isEditing ? colors.border.focus : 'transparent'}`,
                        transition: 'all .15s',
                      }}
                    >
                      {/* Action label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: colors.text.primary,
                          fontFamily: FONTS.body,
                        }}>
                          {b.label}
                        </span>
                      </div>

                      {/* Key display */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isEditing ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <div style={{
                              padding: '4px 12px', borderRadius: 6, fontSize: 12,
                              fontFamily: fc, fontWeight: 600, minWidth: 80, textAlign: 'center',
                              background: pendingKey ? colors.bg.surface : colors.bg.overlay,
                              border: `1px solid ${conflict ? colors.accent.amber : colors.border.focus}`,
                              color: pendingKey ? '#fff' : colors.text.dim,
                              animation: pendingKey ? 'none' : 'pulse 1.5s infinite',
                            }}>
                              {pendingKey || 'Press keys...'}
                            </div>
                            {pendingKey && (
                              <>
                                <button onClick={confirmBinding} style={{
                                  all: 'unset', cursor: 'pointer', padding: '4px 10px',
                                  borderRadius: 6, fontSize: 10, fontWeight: 700,
                                  fontFamily: fc, color: '#fff',
                                  background: colors.accent.green,
                                }}>OK</button>
                                <button onClick={cancelEdit} style={{
                                  all: 'unset', cursor: 'pointer', padding: '4px 10px',
                                  borderRadius: 6, fontSize: 10, fontWeight: 700,
                                  fontFamily: fc, color: colors.text.dim,
                                  background: colors.bg.surface,
                                  border: `1px solid ${colors.border.subtle}`,
                                }}>ESC</button>
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            <kbd style={{
                              padding: '3px 10px', borderRadius: 5, fontSize: 11,
                              fontFamily: fc, fontWeight: 600,
                              background: colors.bg.surface,
                              border: `1px solid ${colors.border.subtle}`,
                              color: isCustom ? colors.accent.cyan : colors.accent.purple,
                              minWidth: 60, textAlign: 'center',
                            }}>
                              {b.key}
                            </kbd>
                            {isCustom && (
                              <span style={{
                                fontSize: 9, color: colors.text.ghost, fontFamily: fc,
                              }} title={`Default: ${b.defaultKey}`}>
                                *
                              </span>
                            )}
                            <button
                              onClick={() => { setEditingId(b.id); setPendingKey(null); setConflict(null); }}
                              style={{
                                all: 'unset', cursor: 'pointer', padding: '4px 10px',
                                borderRadius: 6, fontSize: 10, fontWeight: 700,
                                fontFamily: fc, color: colors.text.dim,
                                background: colors.bg.surface,
                                border: `1px solid ${colors.border.subtle}`,
                                transition: 'all .15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.focus; e.currentTarget.style.color = colors.accent.purple; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
                            >
                              EDIT
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}

          {/* Conflict warning */}
          {conflict && editingId && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: colors.accent.amber + '15',
              border: `1px solid ${colors.accent.amber}30`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: 11, color: colors.accent.amber, fontFamily: fc }}>
                Conflicts with "{conflict.label}" ({conflict.key})
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 28px 20px', flexShrink: 0,
          borderTop: `1px solid ${colors.border.subtle}`,
        }}>
          <button onClick={handleReset} style={{
            all: 'unset', cursor: 'pointer', padding: '8px 16px',
            borderRadius: 8, fontSize: 11, fontWeight: 700,
            fontFamily: fc, color: colors.text.dim,
            background: colors.bg.surface,
            border: `1px solid ${colors.border.subtle}`,
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.amber; e.currentTarget.style.color = colors.accent.amber; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
          >
            RESET TO DEFAULTS
          </button>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', padding: '8px 20px',
            borderRadius: 8, fontSize: 11, fontWeight: 700,
            fontFamily: fc, color: '#fff',
            background: colors.accent.purple,
            boxShadow: `0 2px 8px ${colors.accent.purple}30`,
          }}>
            DONE
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
