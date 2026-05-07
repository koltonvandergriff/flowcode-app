import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { syncAllTasks } from '../lib/syncService';

const FONT_UI = "'Outfit', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Cascadia Code', monospace";
const PANEL_WIDTH = 260;
const COLLAPSED_WIDTH = 36;
const LS_KEY = 'fc-tasks';

const COLUMNS = [
  { key: 'todo', label: 'Todo' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

const STATUS_CYCLE = { todo: 'active', active: 'done', done: null };

function loadTasks() {
  try {
    const raw = window.flowcode?.store?.get?.(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* fall through */ }
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function saveTasks(tasks) {
  const json = JSON.stringify(tasks);
  try {
    window.flowcode?.store?.set?.(LS_KEY, json);
  } catch (_) { /* ignore */ }
  try {
    localStorage.setItem(LS_KEY, json);
  } catch (_) { /* ignore */ }
  window.flowcode?.tasks?.save(tasks).catch(() => {});
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function TaskBoard({ open, onToggle }) {
  const { colors } = useTheme();
  const [tasks, setTasks] = useState(() => loadTasks());
  const [input, setInput] = useState('');
  const [dragId, setDragId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    saveTasks(tasks);
    syncAllTasks(tasks.filter(t => t.status));
  }, [tasks]);

  const addTask = useCallback(() => {
    const title = input.trim();
    if (!title) return;
    setTasks(prev => [
      { id: genId(), title, status: 'todo', createdAt: Date.now() },
      ...prev,
    ]);
    setInput('');
  }, [input]);

  const cycleStatus = useCallback((id) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const next = STATUS_CYCLE[task.status];
      if (next === null) {
        // Delete on cycle past done
        return prev.filter(t => t.id !== id);
      }
      return prev.map(t => t.id === id ? { ...t, status: next } : t);
    });
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleDragStart = useCallback((e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: targetStatus } : t));
    setDragId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  const borderColorForStatus = (status) => {
    if (status === 'active') return colors.accent.primary;
    if (status === 'done') return colors.accent.green || colors.accent.secondary;
    return colors.text.dim;
  };

  const totalCount = tasks.length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      overflow: 'hidden', minHeight: 0,
    }}>
        {/* Header */}
        <div style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid ' + colors.border.subtle,
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.accent.cyan,
            fontFamily: FONT_MONO,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            TASKS
            {totalCount > 0 && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 8,
                background: colors.accent.cyan + '20',
                color: colors.accent.cyan,
                fontFamily: FONT_MONO,
              }}>{totalCount}</span>
            )}
          </div>
          <button
            onClick={onToggle}
            title="Collapse panel"
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 4,
              fontSize: 12,
              color: colors.text.dim,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; e.currentTarget.style.color = colors.text.secondary; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.dim; }}
          >&#9664;</button>
        </div>

        {/* Add task input */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid ' + colors.border.subtle,
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTask();
              }
            }}
            placeholder="Add task..."
            style={{
              all: 'unset',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 12,
              fontFamily: FONT_MONO,
              color: colors.text.primary,
              padding: '4px 0',
              borderBottom: '1px solid ' + colors.border.subtle,
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = colors.accent.cyan; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = colors.border.subtle; }}
          />
        </div>

        {/* Columns (stacked vertically) */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '4px 0',
        }}>
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                style={{
                  padding: '6px 12px',
                  minHeight: 40,
                }}
              >
                {/* Column header */}
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: FONT_UI,
                  color: colors.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  userSelect: 'none',
                }}>
                  {col.label}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: FONT_MONO,
                    padding: '0px 4px',
                    borderRadius: 4,
                    background: colors.bg.overlay,
                    color: colors.text.dim,
                    lineHeight: '16px',
                  }}>{colTasks.length}</span>
                </div>

                {/* Task cards */}
                {colTasks.length === 0 && (
                  <div style={{
                    fontSize: 10,
                    fontFamily: FONT_MONO,
                    color: colors.text.ghost,
                    padding: '4px 0',
                    userSelect: 'none',
                  }}>No tasks</div>
                )}
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => cycleStatus(task.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      deleteTask(task.id);
                    }}
                    style={{
                      fontSize: 12,
                      fontFamily: FONT_MONO,
                      color: colors.text.primary,
                      padding: '8px 10px',
                      marginBottom: 6,
                      borderRadius: 6,
                      background: dragId === task.id ? colors.bg.elevated : colors.bg.overlay,
                      borderLeft: '2px solid ' + borderColorForStatus(task.status),
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'background 0.15s ease, opacity 0.15s ease',
                      opacity: dragId === task.id ? 0.5 : 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (dragId !== task.id) {
                        e.currentTarget.style.background = colors.bg.elevated;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dragId !== task.id) {
                        e.currentTarget.style.background = colors.bg.overlay;
                      }
                    }}
                    title={'Click to advance status / Right-click to delete'}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '6px 12px',
          borderTop: '1px solid ' + colors.border.subtle,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10,
            color: colors.text.dim,
            fontFamily: FONT_MONO,
          }}>
            {totalCount} task{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
    </div>
  );
}
