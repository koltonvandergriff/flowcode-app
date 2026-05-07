import { useState, useEffect, useCallback, useRef } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  const dayMs = 86400000;

  if (diff < dayMs) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < dayMs * 7) {
    const days = Math.floor(diff / dayMs);
    return `${days}d ago`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function providerColor(provider, colors) {
  switch (provider) {
    case 'claude': return colors.accent.green;
    case 'aider': return colors.accent.purple;
    case 'shell': return colors.accent.amber;
    default: return colors.accent.cyan;
  }
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Sub-components ---

function SearchBar({ value, onChange, colors }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={colors.text.ghost} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search sessions..."
        style={{
          width: '100%', boxSizing: 'border-box',
          background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
          borderRadius: 8, padding: '9px 12px 9px 36px',
          color: colors.text.primary, fontSize: 12, fontFamily: fc,
          outline: 'none',
        }}
      />
    </div>
  );
}

function SessionListItem({ session, isSelected, onClick, onDelete, colors }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const color = providerColor(session.provider, colors);
  const duration = formatDuration((session.endedAt || 0) - (session.startedAt || 0));

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
        background: isSelected ? colors.bg.overlay : 'transparent',
        border: `1px solid ${isSelected ? colors.border.focus : 'transparent'}`,
        transition: 'all .15s ease',
      }}
    >
      {/* Provider dot */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: color,
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily: fc,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {session.label}
        </div>
        <div style={{
          display: 'flex', gap: 8, marginTop: 2,
          fontSize: 10, color: colors.text.dim, fontFamily: fc,
        }}>
          <span style={{ color }}>{session.provider}</span>
          <span>{formatDate(session.startedAt)}</span>
          <span>{duration}</span>
          <span>{session.lineCount} lines</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirmDelete) {
            onDelete(session.id);
            setConfirmDelete(false);
          } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
          }
        }}
        style={{
          all: 'unset', cursor: 'pointer', flexShrink: 0,
          padding: '4px 8px', borderRadius: 4,
          fontSize: 9, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
          color: confirmDelete ? '#fff' : colors.text.ghost,
          background: confirmDelete ? colors.status.error : 'transparent',
          border: `1px solid ${confirmDelete ? colors.status.error : 'transparent'}`,
          transition: 'all .15s ease',
        }}
        title={confirmDelete ? 'Click again to confirm' : 'Delete session'}
      >
        {confirmDelete ? 'CONFIRM' : 'DEL'}
      </button>
    </div>
  );
}

function TranscriptViewer({ session, colors }) {
  const scrollRef = useRef(null);

  if (!session) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colors.text.ghost, fontFamily: fc, fontSize: 12,
      }}>
        Select a session to view its transcript
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Session header */}
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${colors.border.subtle}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: colors.text.primary,
            fontFamily: FONTS.display, letterSpacing: 0.5,
          }}>
            {session.label}
          </div>
          <div style={{
            fontSize: 10, color: colors.text.dim, fontFamily: fc, marginTop: 3,
            display: 'flex', gap: 12,
          }}>
            <span style={{ color: providerColor(session.provider, colors) }}>{session.provider}</span>
            <span>{new Date(session.startedAt).toLocaleString()}</span>
            <span>{formatDuration((session.endedAt || 0) - (session.startedAt || 0))}</span>
            <span>{session.lines?.length || 0} lines</span>
          </div>
        </div>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'MD', format: 'markdown', ext: 'md' },
            { label: 'TXT', format: 'text', ext: 'txt' },
            { label: 'JSON', format: 'json', ext: 'json' },
          ].map(({ label, format, ext }) => (
            <button
              key={format}
              onClick={async () => {
                try {
                  const content = await window.flowade.history.export(session.id, format);
                  if (content) {
                    const safeLabel = session.label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
                    triggerDownload(content, `${safeLabel}.${ext}`);
                  }
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }}
              style={{
                all: 'unset', cursor: 'pointer',
                padding: '5px 10px', borderRadius: 5,
                fontSize: 9, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
                color: colors.accent.cyan, background: colors.bg.surface,
                border: `1px solid ${colors.border.subtle}`,
                transition: 'all .15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript lines */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', padding: '12px 18px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {(!session.lines || session.lines.length === 0) ? (
          <div style={{
            color: colors.text.ghost, fontFamily: fc, fontSize: 11,
            textAlign: 'center', padding: 40,
          }}>
            No transcript lines recorded
          </div>
        ) : (
          session.lines.map((line, i) => {
            const isInput = line.type === 'input';
            const ts = new Date(line.timestamp).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

            return (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '4px 8px', borderRadius: 4,
                background: isInput ? `${colors.accent.green}08` : 'transparent',
                borderLeft: `2px solid ${isInput ? colors.accent.green : colors.border.subtle}`,
              }}>
                <span style={{
                  fontSize: 9, color: colors.text.ghost, fontFamily: fc,
                  flexShrink: 0, minWidth: 62, paddingTop: 2,
                }}>
                  {ts}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: fc, flexShrink: 0,
                  color: isInput ? colors.accent.green : colors.text.dim,
                  minWidth: 18, paddingTop: 2,
                }}>
                  {isInput ? '>' : ' '}
                </span>
                <pre style={{
                  margin: 0, fontSize: 11, fontFamily: fc, lineHeight: 1.5,
                  color: isInput ? colors.text.primary : colors.text.secondary,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1,
                }}>
                  {line.text}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- Main component ---

export default function SessionHistory({ open, onClose }) {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.flowade?.history) return;
    try {
      const list = await window.flowade.history.list();
      setSessions(list || []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      setSelectedId(null);
      setActiveSession(null);
      setSearch('');
    }
  }, [open, refresh]);

  const loadSession = useCallback(async (id) => {
    if (!window.flowade?.history) return;
    setLoading(true);
    try {
      const data = await window.flowade.history.load(id);
      setSelectedId(id);
      setActiveSession(data);
    } catch {
      setActiveSession(null);
    }
    setLoading(false);
  }, []);

  const deleteSession = useCallback(async (id) => {
    if (!window.flowade?.history) return;
    try {
      await window.flowade.history.delete(id);
      if (selectedId === id) {
        setSelectedId(null);
        setActiveSession(null);
      }
      refresh();
    } catch {}
  }, [selectedId, refresh]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const filteredSessions = search
    ? sessions.filter((s) => {
        const q = search.toLowerCase();
        return (
          (s.label || '').toLowerCase().includes(q) ||
          (s.provider || '').toLowerCase().includes(q)
        );
      })
    : sessions;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, width: 900, maxWidth: '90vw', height: '80vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: `1px solid ${colors.border.subtle}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={colors.accent.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12 8 12 12 14 14" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <h2 style={{
              fontSize: 16, fontWeight: 700, fontFamily: FONTS.display,
              letterSpacing: 1, color: '#fff', margin: 0,
            }}>
              Session History
            </h2>
            <span style={{
              fontSize: 10, color: colors.text.ghost, fontFamily: fc,
              background: colors.bg.surface, padding: '2px 8px', borderRadius: 10,
            }}>
              {sessions.length} sessions
            </span>
          </div>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', fontSize: 18,
            color: colors.text.dim, padding: '0 4px',
          }}>
            {'✕'}
          </button>
        </div>

        {/* Body: sidebar + transcript */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Left sidebar: search + session list */}
          <div style={{
            width: 300, minWidth: 260, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderRight: `1px solid ${colors.border.subtle}`,
          }}>
            {/* Search */}
            <div style={{ padding: '12px 14px', flexShrink: 0 }}>
              <SearchBar value={search} onChange={setSearch} colors={colors} />
            </div>

            {/* Session list */}
            <div style={{
              flex: 1, overflow: 'auto', padding: '0 8px 12px',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {filteredSessions.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: 32,
                  color: colors.text.ghost, fontFamily: fc, fontSize: 11,
                }}>
                  {search ? 'No sessions match your search' : 'No sessions recorded yet'}
                </div>
              ) : (
                filteredSessions.map((s) => (
                  <SessionListItem
                    key={s.id}
                    session={s}
                    isSelected={selectedId === s.id}
                    onClick={() => loadSession(s.id)}
                    onDelete={deleteSession}
                    colors={colors}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: transcript viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {loading ? (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: colors.text.dim, fontFamily: fc, fontSize: 12,
              }}>
                Loading...
              </div>
            ) : (
              <TranscriptViewer session={activeSession} colors={colors} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
