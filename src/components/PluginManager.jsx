import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;

function CapabilityBadge({ capability, colors }) {
  const CAPABILITY_COLORS = {
    provider: colors.accent.green,
    macro: colors.accent.amber,
    command: colors.accent.purple,
  };
  const color = CAPABILITY_COLORS[capability] || colors.text.muted;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
      fontFamily: fc, letterSpacing: 0.5,
      background: color + '18',
      color: color,
      border: `1px solid ${color}30`,
    }}>
      {capability.toUpperCase()}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, colors }) {
  return (
    <button
      onClick={onChange}
      style={{
        all: 'unset', cursor: 'pointer',
        width: 36, height: 20, borderRadius: 10,
        background: checked ? colors.accent.green : colors.bg.surface,
        border: `1px solid ${checked ? colors.accent.green : colors.border.subtle}`,
        position: 'relative', transition: 'all .2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff',
        position: 'absolute', top: 2,
        left: checked ? 19 : 2,
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

export default function PluginManagerPanel({ open, onClose }) {
  const { colors } = useTheme();
  const [plugins, setPlugins] = useState([]);
  const [pluginsPath, setPluginsPath] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPlugins = useCallback(async () => {
    if (!window.flowade?.plugins) return;
    setLoading(true);
    try {
      const [list, path] = await Promise.all([
        window.flowade.plugins.list(),
        window.flowade.plugins.getPath(),
      ]);
      setPlugins(list);
      setPluginsPath(path);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadPlugins();
  }, [open, loadPlugins]);

  const handleToggle = useCallback(async (plugin) => {
    if (!window.flowade?.plugins) return;
    if (plugin.enabled) {
      await window.flowade.plugins.disable(plugin.folderName);
    } else {
      await window.flowade.plugins.enable(plugin.folderName);
    }
    loadPlugins();
  }, [loadPlugins]);

  const openFolder = useCallback(() => {
    if (window.flowade?.plugins) {
      window.flowade.plugins.openFolder();
    }
  }, []);

  if (!open) return null;

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
          borderRadius: 16, width: 580, maxHeight: '85vh',
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
              Plugins
            </h2>
            <p style={{
              fontSize: 10, color: colors.text.dim, fontFamily: fc,
              letterSpacing: 0.5, margin: '4px 0 0',
            }}>
              Extend FlowADE with community plugins
            </p>
          </div>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim, padding: '0 4px',
          }}>&#10005;</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px 8px' }}>
          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 40, color: colors.text.dim, fontSize: 12, fontFamily: fc,
            }}>
              Loading plugins...
            </div>
          ) : plugins.length === 0 ? (
            /* Empty state */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '40px 20px', textAlign: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.text.ghost} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M12 12h.01" />
                <path d="M17 12h.01" />
                <path d="M7 12h.01" />
              </svg>
              <p style={{
                fontSize: 14, fontWeight: 600, color: colors.text.secondary,
                fontFamily: FONTS.body, margin: '0 0 8px',
              }}>
                No plugins installed
              </p>
              <p style={{
                fontSize: 11, color: colors.text.dim, fontFamily: fc,
                lineHeight: 1.6, maxWidth: 360,
              }}>
                Place plugin folders in
                <br />
                <code style={{
                  background: colors.bg.surface, padding: '2px 8px', borderRadius: 4,
                  fontSize: 10, color: colors.accent.cyan, display: 'inline-block', marginTop: 4,
                }}>
                  {pluginsPath || '...'}
                </code>
                <br />
                to get started. Each plugin needs a <code style={{
                  background: colors.bg.surface, padding: '1px 5px', borderRadius: 3,
                  fontSize: 10, color: colors.accent.purple,
                }}>plugin.json</code> manifest.
              </p>
            </div>
          ) : (
            /* Plugin list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plugins.map((plugin) => (
                <div
                  key={plugin.folderName}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: colors.bg.surface,
                    border: `1px solid ${plugin.enabled ? colors.border.subtle : colors.border.subtle + '60'}`,
                    opacity: plugin.enabled ? 1 : 0.7,
                    transition: 'all .2s',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 600, color: colors.text.primary,
                          fontFamily: FONTS.body,
                        }}>
                          {plugin.name}
                        </span>
                        <span style={{
                          fontSize: 9, color: colors.text.ghost, fontFamily: fc,
                        }}>
                          v{plugin.version}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 11, color: colors.text.muted, fontFamily: fc,
                        margin: 0, lineHeight: 1.5,
                      }}>
                        {plugin.description}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={plugin.enabled}
                      onChange={() => handleToggle(plugin)}
                      colors={colors}
                    />
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {plugin.capabilities.map((cap) => (
                        <CapabilityBadge key={cap} capability={cap} colors={colors} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 9, color: colors.text.ghost, fontFamily: fc,
                    }}>
                      by {plugin.author}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 28px 20px', flexShrink: 0,
          borderTop: `1px solid ${colors.border.subtle}`,
        }}>
          <button onClick={openFolder} style={{
            all: 'unset', cursor: 'pointer', padding: '8px 16px',
            borderRadius: 8, fontSize: 11, fontWeight: 700,
            fontFamily: fc, color: colors.text.dim,
            background: colors.bg.surface,
            border: `1px solid ${colors.border.subtle}`,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.focus; e.currentTarget.style.color = colors.text.secondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            OPEN PLUGINS FOLDER
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 10, color: colors.text.ghost, fontFamily: fc,
            }}>
              {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} installed
            </span>
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
      </div>
    </div>
  );
}
