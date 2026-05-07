import { useState, useEffect, useRef } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { syncActivityEvent } from '../lib/syncService';

const fc = FONTS.mono;
const fb = FONTS.body;

const EVENT_ICONS = {
  build_success: '✅',
  build_error: '❌',
  test_pass: '✅',
  test_fail: '❌',
  server_start: '🚀',
  deploy_done: '🚢',
  install_done: '📦',
  crash: '💥',
  exit: '⏹️',
};

const EVENT_COLORS = {
  build_success: 'green',
  test_pass: 'green',
  deploy_done: 'green',
  install_done: 'green',
  build_error: 'pink',
  test_fail: 'pink',
  crash: 'pink',
  server_start: 'cyan',
  exit: 'amber',
};

export default function NotificationsPanel({ open, onClose }) {
  const { colors } = useTheme();
  const [events, setEvents] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [tab, setTab] = useState('events');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    loadTokens();
    loadEvents();

    const unsub = window.flowade?.notify?.onEvent((event) => {
      const updated = [event, ...eventsRef.current].slice(0, 200);
      setEvents(updated);
      eventsRef.current = updated;
      localStorage.setItem('flowade_notifications', JSON.stringify(updated));
      syncActivityEvent(event);
    });

    return () => { unsub?.(); };
  }, []);

  const loadTokens = async () => {
    const t = await window.flowade?.notify?.getTokens() || [];
    setTokens(Array.isArray(t) ? t : []);
  };

  const loadEvents = () => {
    try {
      const raw = localStorage.getItem('flowade_notifications');
      if (raw) setEvents(JSON.parse(raw));
    } catch {}
  };

  const removeToken = async (token) => {
    await window.flowade?.notify?.removeToken(token);
    loadTokens();
  };

  const toggleNotify = async () => {
    const next = !notifyEnabled;
    setNotifyEnabled(next);
    await window.flowade?.notify?.setEnabled(next);
  };

  const clearEvents = () => {
    setEvents([]);
    localStorage.removeItem('flowade_notifications');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  if (!open) return null;

  const tabs = [
    { id: 'events', label: 'EVENTS' },
    { id: 'devices', label: 'DEVICES' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, width: 520, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 0', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: FONTS.display, color: '#fff', margin: 0 }}>
              Notifications
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleNotify} style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              fontFamily: fc, color: notifyEnabled ? colors.accent.green : colors.text.dim,
              background: notifyEnabled ? colors.accent.green + '15' : colors.bg.surface,
              border: `1px solid ${notifyEnabled ? colors.accent.green + '30' : colors.border.subtle}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: notifyEnabled ? colors.accent.green : colors.text.dim }} />
              {notifyEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={onClose} style={{
              all: 'unset', cursor: 'pointer', fontSize: 16, color: colors.text.dim, padding: '0 4px',
            }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, padding: '14px 24px 0', flexShrink: 0,
          borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              fontFamily: fc, letterSpacing: 1.5, padding: '8px 16px',
              color: tab === t.id ? colors.accent.primary : colors.text.dim,
              borderBottom: `2px solid ${tab === t.id ? colors.accent.primary : 'transparent'}`,
              marginBottom: -1, transition: 'all .2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px 24px' }}>
          {tab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={clearEvents} style={{
                    all: 'unset', cursor: 'pointer', fontSize: 10, fontFamily: fc,
                    color: colors.text.dim, padding: '4px 8px', borderRadius: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = colors.text.secondary; }}
                  onMouseLeave={e => { e.currentTarget.style.color = colors.text.dim; }}
                  >Clear all</button>
                </div>
              )}

              {events.length === 0 && (
                <div style={{
                  padding: '40px 20px', textAlign: 'center',
                  color: colors.text.dim, fontSize: 12, fontFamily: fc,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔔</div>
                  No events yet. Terminal activity will show here.
                </div>
              )}

              {events.map((evt, i) => {
                const accentKey = EVENT_COLORS[evt.type] || 'primary';
                const accentColor = colors.accent[accentKey] || colors.accent.primary;
                return (
                  <div key={evt.id || i} style={{
                    display: 'flex', gap: 10, padding: '10px 12px',
                    background: colors.bg.surface, borderRadius: 8,
                    borderLeft: `3px solid ${accentColor}`,
                  }}>
                    <span style={{ fontSize: 16, lineHeight: '20px' }}>
                      {EVENT_ICONS[evt.type] || '📋'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily: fc }}>
                          {evt.title}
                        </span>
                        <span style={{ fontSize: 9, color: colors.text.ghost, fontFamily: fc }}>
                          {formatTime(evt.timestamp)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: colors.text.secondary, fontFamily: fc, marginTop: 2 }}>
                        {evt.terminal && <span>Terminal: "{evt.terminal}"</span>}
                        {evt.workspace && <span> · Workspace: "{evt.workspace}"</span>}
                      </div>
                      {evt.snippet && (
                        <div style={{
                          marginTop: 6, padding: '4px 8px', borderRadius: 4,
                          background: colors.bg.raised, fontSize: 10, fontFamily: fc,
                          color: colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>{evt.snippet}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'devices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                fontSize: 11, color: colors.text.muted, fontFamily: fc, lineHeight: 1.5,
              }}>
                Devices running the FlowADE mobile app automatically connect when you sign in
                with the same account. Notifications are pushed to all connected devices.
              </div>

              {/* Connected devices */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                  CONNECTED DEVICES ({tokens.length})
                </label>
                {tokens.length === 0 ? (
                  <div style={{
                    padding: '24px 20px', textAlign: 'center', borderRadius: 8,
                    background: colors.bg.surface, border: `1px dashed ${colors.border.subtle}`,
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.text.dim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, opacity: 0.4 }}>
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    <div style={{ fontSize: 12, color: colors.text.dim, fontFamily: fc, marginBottom: 4 }}>
                      No devices connected
                    </div>
                    <div style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc }}>
                      Sign in on the FlowADE mobile app to connect
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tokens.map((token, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, fontFamily: fc }}>
                            Mobile Device {idx + 1}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.accent.green }} />
                            <span style={{ fontSize: 9, color: colors.accent.green, fontFamily: fc }}>Connected</span>
                          </div>
                        </div>
                        <button onClick={() => removeToken(token)} title="Disconnect device" style={{
                          all: 'unset', cursor: 'pointer', fontSize: 10, color: colors.text.dim,
                          padding: '4px 8px', borderRadius: 4, fontFamily: fc, fontWeight: 600,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = colors.status.error; e.currentTarget.style.background = colors.status.error + '15'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = colors.text.dim; e.currentTarget.style.background = 'transparent'; }}
                        >DISCONNECT</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What gets sent */}
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1, marginBottom: 8 }}>
                  WHAT GETS SENT TO DEVICES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontFamily: fc }}>
                  {[
                    ['✅', 'Build success/failure'],
                    ['🧪', 'Test results'],
                    ['🚀', 'Server start'],
                    ['🚢', 'Deploy status'],
                    ['💥', 'Process crashes'],
                    ['⏹️', 'Long commands finishing (>30s)'],
                  ].map(([icon, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text.dim }}>
                      <span style={{ fontSize: 12 }}>{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: 10, paddingTop: 8, borderTop: `1px solid ${colors.border.subtle}`,
                  fontSize: 10, color: colors.accent.green, fontFamily: fc,
                }}>
                  No code, API keys, or sensitive data is ever sent to devices.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
