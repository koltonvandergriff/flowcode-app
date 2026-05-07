import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { FONTS } from '../lib/constants';

function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette({ open, onClose, actions }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef({});

  // Filter actions by fuzzy match on label and category
  const filtered = useMemo(() => {
    if (!query.trim()) return actions || [];
    return (actions || []).filter(
      (a) => fuzzyMatch(a.label, query) || fuzzyMatch(a.category, query)
    );
  }, [actions, query]);

  // Group filtered results by category
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((action) => {
      const cat = action.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(action);
    });
    return map;
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    const items = [];
    grouped.forEach((list) => {
      list.forEach((action) => items.push(action));
    });
    return items;
  }, [grouped]);

  // Reset state when opened/closed
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Auto-focus input on next frame
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Keep selected index in bounds when results change
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, flatList.length - 1)));
  }, [flatList.length]);

  // Scroll selected item into view
  useEffect(() => {
    const selected = flatList[selectedIndex];
    if (selected && itemRefs.current[selected.id]) {
      itemRefs.current[selected.id].scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatList]);

  const executeAction = useCallback(
    (action) => {
      if (action?.onAction) {
        action.onAction();
      }
      onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatList[selectedIndex]) {
            executeAction(flatList[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [flatList, selectedIndex, executeAction, onClose]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '20vh',
        animation: 'fc-palette-fadein 0.15s ease',
      }}
      onClick={onClose}
    >
      {/* Keyframe injection */}
      <style>{`
        @keyframes fc-palette-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fc-palette-slidein {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fc-command-palette-list::-webkit-scrollbar {
          width: 4px;
        }
        .fc-command-palette-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .fc-command-palette-list::-webkit-scrollbar-thumb {
          background: ${colors.border.subtle};
          border-radius: 2px;
        }
      `}</style>

      <div
        className="fc-glass"
        style={{
          width: '100%',
          maxWidth: 560,
          background: colors.bg.glass,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.05)',
          animation: 'fc-palette-slidein 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${colors.border.subtle}`,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text.primary,
              fontSize: 16,
              fontFamily: FONTS.body,
              lineHeight: '24px',
              caretColor: colors.accent.primary,
            }}
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="fc-command-palette-list"
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: flatList.length > 0 ? '4px 0' : 0,
          }}
        >
          {flatList.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: colors.text.dim,
                fontFamily: FONTS.body,
                fontSize: 13,
              }}
            >
              No results
            </div>
          )}

          {flatList.length > 0 &&
            (() => {
              const elements = [];
              let itemIndex = 0;

              grouped.forEach((items, category) => {
                // Category header
                elements.push(
                  <div
                    key={`cat-${category}`}
                    style={{
                      padding: '8px 16px 4px',
                      fontSize: 9,
                      fontFamily: FONTS.body,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: colors.text.dim,
                      userSelect: 'none',
                    }}
                  >
                    {category}
                  </div>
                );

                // Items in this category
                items.forEach((action) => {
                  const currentItemIndex = itemIndex;
                  const isSelected = currentItemIndex === selectedIndex;

                  elements.push(
                    <div
                      key={action.id}
                      ref={(el) => {
                        itemRefs.current[action.id] = el;
                      }}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => executeAction(action)}
                      onMouseEnter={() => setSelectedIndex(currentItemIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 16px',
                        margin: '0 6px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        background: isSelected
                          ? `${colors.accent.primary}26`
                          : 'transparent',
                      }}
                    >
                      {/* Icon */}
                      {action.icon && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 18,
                            height: 18,
                            flexShrink: 0,
                            color: isSelected
                              ? colors.accent.primary
                              : colors.text.muted,
                            transition: 'color 0.15s ease',
                          }}
                        >
                          {action.icon}
                        </span>
                      )}

                      {/* Label */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontFamily: FONTS.body,
                          color: isSelected
                            ? colors.text.primary
                            : colors.text.secondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {action.label}
                      </span>

                      {/* Category tag */}
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: FONTS.body,
                          fontWeight: 500,
                          color: colors.text.ghost,
                          background: colors.bg.surface,
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          flexShrink: 0,
                        }}
                      >
                        {action.category}
                      </span>

                      {/* Shortcut badge */}
                      {action.shortcut && (
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: FONTS.mono,
                            fontWeight: 500,
                            color: colors.text.muted,
                            background: colors.bg.raised,
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: `1px solid ${colors.border.subtle}`,
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {action.shortcut}
                        </span>
                      )}
                    </div>
                  );

                  itemIndex++;
                });
              });

              return elements;
            })()}
        </div>

        {/* Footer hint */}
        {flatList.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              borderTop: `1px solid ${colors.border.subtle}`,
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
            }}
          >
            {[
              { keys: '↑↓', desc: 'navigate' },
              { keys: '↵', desc: 'execute' },
              { keys: 'esc', desc: 'close' },
            ].map((hint) => (
              <span
                key={hint.desc}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 9,
                  fontFamily: FONTS.mono,
                  color: colors.text.ghost,
                }}
              >
                <span
                  style={{
                    background: colors.bg.raised,
                    padding: '1px 5px',
                    borderRadius: 3,
                    border: `1px solid ${colors.border.subtle}`,
                  }}
                >
                  {hint.keys}
                </span>
                <span style={{ fontFamily: FONTS.body }}>{hint.desc}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
