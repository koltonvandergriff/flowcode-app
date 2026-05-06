import { useState, useEffect } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { useGitStatus } from '../hooks/useGitStatus';
import DiffViewer from './DiffViewer';

const fc = FONTS.mono;

const STATUS_LABELS = {
  'M': 'Modified',
  'A': 'Added',
  'D': 'Deleted',
  '??': 'Untracked',
  'R': 'Renamed',
  'U': 'Conflict',
};

const PANEL_WIDTH = 260;
const COLLAPSED_WIDTH = 36;
const LS_KEY = 'flowcode_git_panel_open';

export default function FileActivity({ cwd, open, onToggle }) {
  const { colors } = useTheme();
  const { files, branch, error, refresh } = useGitStatus(cwd);
  const [diffFile, setDiffFile] = useState(null);
  const [diffContent, setDiffContent] = useState('');

  // Persist open/collapsed state to localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved !== null) {
      const shouldBeOpen = saved === 'true';
      if (shouldBeOpen !== open) {
        onToggle();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    const newState = !open;
    localStorage.setItem(LS_KEY, String(newState));
    onToggle();
  };

  const STATUS_COLORS = {
    'M': colors.status.warning,
    'A': colors.status.success,
    'D': colors.status.error,
    '??': colors.accent.cyan,
    'R': colors.accent.purple,
    'U': colors.status.error,
  };

  const openDiff = async (file) => {
    if (!cwd) return;
    const result = await window.flowcode?.git.diff(cwd, file);
    setDiffContent(result?.diff || '(no diff available)');
    setDiffFile(file);
  };

  const badge = files.length > 0 ? files.length : null;

  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        flexShrink: 0,
        width: open ? PANEL_WIDTH : COLLAPSED_WIDTH,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        {/* Collapsed icon strip */}
        <div style={{
          width: COLLAPSED_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 8,
          gap: 4,
          background: colors.bg.surface,
          borderRight: `1px solid ${colors.border.subtle}`,
          borderRadius: open ? '8px 0 0 8px' : 8,
        }}>
          <button onClick={handleToggle} title="Git Files" style={{
            all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            width: 28, height: 28, borderRadius: 6,
            background: open ? colors.accent.amber + '18' : 'transparent',
            color: open ? colors.accent.amber : colors.text.dim,
            transition: 'all 0.2s',
            position: 'relative',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="3" x2="12" y2="9" />
              <line x1="12" y1="15" x2="12" y2="21" />
              <path d="M5.6 5.6l4.3 4.3" />
              <path d="M14.1 14.1l4.3 4.3" />
            </svg>
            {badge && !open && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 6,
                background: colors.accent.amber, color: '#000', fontFamily: fc,
                lineHeight: '12px', minWidth: 10, textAlign: 'center',
              }}>{badge}</span>
            )}
          </button>
        </div>

        {/* Expanded panel content */}
        <div style={{
          width: PANEL_WIDTH - COLLAPSED_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: colors.bg.raised,
          borderRight: `1px solid ${colors.border.subtle}`,
          borderRadius: '0 8px 8px 0',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.2s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${colors.border.subtle}`,
            flexShrink: 0,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: colors.accent.amber,
                fontFamily: fc, letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                GIT
                {badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
                    background: colors.accent.amber + '20', color: colors.accent.amber,
                    fontFamily: fc,
                  }}>{badge}</span>
                )}
              </div>
              {branch && (
                <div style={{
                  fontSize: 10, color: colors.text.dim, fontFamily: fc, marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  <span style={{ color: colors.accent.purple }}>&#9741;</span> {branch}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={refresh} title="Refresh" style={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 4, fontSize: 13, color: colors.text.dim,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; e.currentTarget.style.color = colors.text.secondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.dim; }}
              >&#8635;</button>
              <button onClick={handleToggle} title="Collapse panel" style={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 4, fontSize: 12, color: colors.text.dim,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; e.currentTarget.style.color = colors.text.secondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.dim; }}
              >&#9664;</button>
            </div>
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {error && !files.length && (
              <div style={{ padding: '24px 14px', fontSize: 11, color: colors.text.ghost, fontFamily: fc, textAlign: 'center' }}>
                {error.includes('not a git') ? 'Not a git repo' : 'Git unavailable'}
              </div>
            )}
            {!error && files.length === 0 && (
              <div style={{ padding: '24px 14px', fontSize: 11, color: colors.text.ghost, fontFamily: fc, textAlign: 'center' }}>
                Working tree clean
              </div>
            )}
            {files.map((f, i) => {
              const color = STATUS_COLORS[f.status] || colors.text.dim;
              const fileName = f.file.split('/').pop();
              const dir = f.file.includes('/') ? f.file.substring(0, f.file.lastIndexOf('/')) : '';
              return (
                <button key={i} onClick={() => openDiff(f.file)} style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 12px', width: '100%', boxSizing: 'border-box',
                  fontSize: 12, fontFamily: fc, transition: 'background .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                title={`${STATUS_LABELS[f.status] || f.status}: ${f.file}`}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {fileName}
                  </span>
                  {dir && <span style={{ color: colors.text.ghost, fontSize: 10, flexShrink: 0 }}>{dir}</span>}
                </button>
              );
            })}
          </div>

          {/* Footer status */}
          <div style={{
            padding: '6px 12px', borderTop: `1px solid ${colors.border.subtle}`,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, color: colors.text.dim, fontFamily: fc }}>
              {files.length} change{files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {diffFile && <DiffViewer file={diffFile} diff={diffContent} onClose={() => setDiffFile(null)} />}
    </>
  );
}
