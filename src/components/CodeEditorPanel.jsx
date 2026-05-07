import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;
const fb = FONTS.body;

const MONACO_THEME_MAP = {
  aurora: 'fc-aurora',
  ember: 'fc-ember',
  abyss: 'fc-abyss',
  nord: 'fc-nord',
  dracula: 'fc-dracula',
  tokyo: 'fc-tokyo',
  synthwave: 'fc-synthwave',
  catppuccin: 'fc-catppuccin',
  rosepine: 'fc-rosepine',
  gruvbox: 'fc-gruvbox',
  onedark: 'fc-onedark',
};

function defineThemes(monaco, colors) {
  const base = {
    aurora: { bg: '#0c101a', fg: '#d4d8e8', accent: '#7c6aff', green: '#4af0c0', red: '#ff5c6a', yellow: '#ffb340', blue: '#5c9aff', cyan: '#40d8f0', line: '#121826', sel: '#7c6aff25', lineNum: '#4a5468', gutter: '#0c101a', comment: '#4a5468' },
    ember: { bg: '#14111a', fg: '#d8d0c8', accent: '#e8a054', green: '#5cd07a', red: '#ff5c6a', yellow: '#e8a054', blue: '#6aa0ff', cyan: '#56c8d8', line: '#1c1824', sel: '#e8a05425', lineNum: '#5e5048', gutter: '#14111a', comment: '#5e5048' },
    abyss: { bg: '#0a1222', fg: '#c8d4e4', accent: '#3c8aff', green: '#00d4aa', red: '#ff4c5c', yellow: '#ffa63c', blue: '#3c8aff', cyan: '#00c8e0', line: '#10192e', sel: '#3c8aff25', lineNum: '#405068', gutter: '#0a1222', comment: '#405068' },
    nord: { bg: '#3b4252', fg: '#d8dee9', accent: '#88c0d0', green: '#a3be8c', red: '#bf616a', yellow: '#ebcb8b', blue: '#81a1c1', cyan: '#88c0d0', line: '#434c5e', sel: '#88c0d025', lineNum: '#6b7890', gutter: '#3b4252', comment: '#6b7890' },
    dracula: { bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9', green: '#50fa7b', red: '#ff5555', yellow: '#f1fa8c', blue: '#6272a4', cyan: '#8be9fd', line: '#343746', sel: '#bd93f925', lineNum: '#6272a4', gutter: '#282a36', comment: '#6272a4' },
    tokyo: { bg: '#1a1b26', fg: '#c0caf5', accent: '#7aa2f7', green: '#9ece6a', red: '#f7768e', yellow: '#e0af68', blue: '#7aa2f7', cyan: '#7dcfff', line: '#24253a', sel: '#7aa2f725', lineNum: '#565f89', gutter: '#1a1b26', comment: '#565f89' },
    synthwave: { bg: '#1b1124', fg: '#f0e8f8', accent: '#ff6cb4', green: '#72f1b8', red: '#fe4450', yellow: '#fede5d', blue: '#6a8efc', cyan: '#36f9f6', line: '#211530', sel: '#ff6cb425', lineNum: '#5e4e6e', gutter: '#1b1124', comment: '#5e4e6e' },
    catppuccin: { bg: '#1e1e2e', fg: '#cdd6f4', accent: '#cba6f7', green: '#a6e3a1', red: '#f38ba8', yellow: '#f9e2af', blue: '#89b4fa', cyan: '#89dceb', line: '#232334', sel: '#cba6f725', lineNum: '#585b70', gutter: '#1e1e2e', comment: '#585b70' },
    rosepine: { bg: '#191724', fg: '#e0def4', accent: '#ebbcba', green: '#9ccfd8', red: '#eb6f92', yellow: '#f6c177', blue: '#31748f', cyan: '#9ccfd8', line: '#1f1d2e', sel: '#ebbcba25', lineNum: '#6e6a86', gutter: '#191724', comment: '#6e6a86' },
    gruvbox: { bg: '#282828', fg: '#ebdbb2', accent: '#fe8019', green: '#b8bb26', red: '#fb4934', yellow: '#fabd2f', blue: '#83a598', cyan: '#8ec07c', line: '#32302f', sel: '#fe801925', lineNum: '#7c6f64', gutter: '#282828', comment: '#7c6f64' },
    onedark: { bg: '#282c34', fg: '#abb2bf', accent: '#61afef', green: '#98c379', red: '#e06c75', yellow: '#e5c07b', blue: '#61afef', cyan: '#56b6c2', line: '#2c313a', sel: '#61afef25', lineNum: '#5c6370', gutter: '#282c34', comment: '#5c6370' },
  };

  Object.entries(base).forEach(([name, t]) => {
    monaco.editor.defineTheme(`fc-${name}`, {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: t.comment.replace('#', ''), fontStyle: 'italic' },
        { token: 'keyword', foreground: t.accent.replace('#', '') },
        { token: 'string', foreground: t.green.replace('#', '') },
        { token: 'number', foreground: t.yellow.replace('#', '') },
        { token: 'type', foreground: t.cyan.replace('#', '') },
        { token: 'function', foreground: t.blue.replace('#', '') },
        { token: 'variable', foreground: t.fg.replace('#', '') },
        { token: 'operator', foreground: t.red.replace('#', '') },
      ],
      colors: {
        'editor.background': t.bg,
        'editor.foreground': t.fg,
        'editor.lineHighlightBackground': t.line,
        'editor.selectionBackground': t.sel,
        'editorLineNumber.foreground': t.lineNum,
        'editorGutter.background': t.gutter,
        'editorCursor.foreground': t.accent,
        'editor.inactiveSelectionBackground': t.sel,
        'editorIndentGuide.background': t.lineNum + '30',
        'editorIndentGuide.activeBackground': t.lineNum + '60',
        'scrollbarSlider.background': t.lineNum + '40',
        'scrollbarSlider.hoverBackground': t.lineNum + '60',
      },
    });
  });
}

const EXT_LANG = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell',
  ps1: 'powershell', bat: 'bat', dockerfile: 'dockerfile',
  graphql: 'graphql', svelte: 'html', vue: 'html', php: 'php',
  swift: 'swift', kt: 'kotlin', lua: 'lua', r: 'r',
};

function getLang(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const base = filename.toLowerCase();
  if (base === 'dockerfile') return 'dockerfile';
  if (base === 'makefile') return 'makefile';
  if (base === '.gitignore' || base === '.env') return 'plaintext';
  return EXT_LANG[ext] || 'plaintext';
}

function FileIcon({ name, isDir }) {
  if (isDir) return <span style={{ fontSize: 14 }}>📁</span>;
  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap = {
    js: '📜', jsx: '⚛️', ts: '🔷', tsx: '⚛️', py: '🐍', json: '📋',
    md: '📝', html: '🌐', css: '🎨', yml: '⚙️', yaml: '⚙️',
    sh: '🖥️', sql: '🗄️', rs: '🦀', go: '🔵',
  };
  return <span style={{ fontSize: 12 }}>{iconMap[ext] || '📄'}</span>;
}

export default function CodeEditorPanel({ open, onToggle }) {
  const { colors, paletteName, themeName } = useTheme();
  const [currentDir, setCurrentDir] = useState('');
  const [entries, setEntries] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [fileContents, setFileContents] = useState({});
  const [dirty, setDirty] = useState({});
  const [treeWidth, setTreeWidth] = useState(200);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [themesReady, setThemesReady] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState({});
  const [subEntries, setSubEntries] = useState({});

  useEffect(() => {
    if (open && !currentDir) {
      const fallback = 'C:\\Users\\kolto\\Desktop\\Claude';
      window.flowcode?.settings?.get('defaultCwd').then(cwd => {
        setCurrentDir(cwd || fallback);
      }).catch(() => setCurrentDir(fallback));
    }
  }, [open, currentDir]);

  useEffect(() => {
    if (!currentDir || !open) return;
    setLoading(true);
    window.flowcode?.fs?.readDir(currentDir).then(items => {
      setEntries(items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentDir, open]);

  const openFile = useCallback(async (filePath, name) => {
    const existing = openFiles.findIndex(f => f.path === filePath);
    if (existing >= 0) {
      setActiveFileIdx(existing);
      return;
    }
    try {
      const content = await window.flowcode?.fs?.readFile(filePath);
      setFileContents(prev => ({ ...prev, [filePath]: content }));
      setOpenFiles(prev => [...prev, { path: filePath, name }]);
      setActiveFileIdx(openFiles.length);
    } catch {}
  }, [openFiles]);

  const closeFile = useCallback((idx) => {
    const file = openFiles[idx];
    setOpenFiles(prev => prev.filter((_, i) => i !== idx));
    setFileContents(prev => { const n = { ...prev }; delete n[file.path]; return n; });
    setDirty(prev => { const n = { ...prev }; delete n[file.path]; return n; });
    if (activeFileIdx >= idx && activeFileIdx > 0) setActiveFileIdx(activeFileIdx - 1);
  }, [openFiles, activeFileIdx]);

  const saveFile = useCallback(async (filePath) => {
    if (!dirty[filePath]) return;
    try {
      await window.flowcode?.fs?.writeFile(filePath, fileContents[filePath]);
      setDirty(prev => ({ ...prev, [filePath]: false }));
    } catch {}
  }, [dirty, fileContents]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    defineThemes(monaco, colors);
    setThemesReady(true);
    monaco.editor.setTheme(MONACO_THEME_MAP[paletteName] || 'fc-aurora');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const active = openFiles[activeFileIdx];
      if (active) saveFile(active.path);
    });
  };

  useEffect(() => {
    if (monacoRef.current && themesReady) {
      if (themeName === 'light') {
        monacoRef.current.editor.setTheme('vs');
      } else {
        monacoRef.current.editor.setTheme(MONACO_THEME_MAP[paletteName] || 'fc-aurora');
      }
    }
  }, [paletteName, themeName, themesReady]);

  const handleEditorChange = (value) => {
    const active = openFiles[activeFileIdx];
    if (!active) return;
    setFileContents(prev => ({ ...prev, [active.path]: value }));
    setDirty(prev => ({ ...prev, [active.path]: true }));
  };

  const toggleDir = async (dirPath) => {
    if (expandedDirs[dirPath]) {
      setExpandedDirs(prev => ({ ...prev, [dirPath]: false }));
      return;
    }
    try {
      const items = await window.flowcode?.fs?.readDir(dirPath);
      setSubEntries(prev => ({ ...prev, [dirPath]: items || [] }));
      setExpandedDirs(prev => ({ ...prev, [dirPath]: true }));
    } catch {}
  };

  const navigateUp = () => {
    const parts = currentDir.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const parent = parts.join('/');
      setCurrentDir(currentDir.includes('\\') ? parent.replace(/\//g, '\\') : parent);
      setExpandedDirs({});
      setSubEntries({});
    }
  };

  const activeFile = openFiles[activeFileIdx];

  const renderEntries = (items, depth = 0) => (
    items.map(entry => (
      <div key={entry.path}>
        <div
          onClick={() => entry.isDirectory ? toggleDir(entry.path) : openFile(entry.path, entry.name)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: `3px 8px 3px ${8 + depth * 14}px`, cursor: 'pointer',
            fontSize: 12, fontFamily: fc, color: colors.text.secondary,
            background: activeFile?.path === entry.path ? (colors.accent.primary + '18') : 'transparent',
            borderLeft: activeFile?.path === entry.path ? `2px solid ${colors.accent.primary}` : '2px solid transparent',
            transition: 'all .1s',
          }}
          onMouseEnter={e => { if (activeFile?.path !== entry.path) e.currentTarget.style.background = colors.bg.overlay; }}
          onMouseLeave={e => { if (activeFile?.path !== entry.path) e.currentTarget.style.background = 'transparent'; }}
        >
          {entry.isDirectory && (
            <span style={{ fontSize: 8, color: colors.text.dim, width: 10, textAlign: 'center' }}>
              {expandedDirs[entry.path] ? '▼' : '▶'}
            </span>
          )}
          {!entry.isDirectory && <span style={{ width: 10 }} />}
          <FileIcon name={entry.name} isDir={entry.isDirectory} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          {!entry.isDirectory && entry.size > 0 && (
            <span style={{ fontSize: 9, color: colors.text.ghost, flexShrink: 0 }}>
              {entry.size < 1024 ? `${entry.size}B` : `${(entry.size / 1024).toFixed(1)}K`}
            </span>
          )}
        </div>
        {entry.isDirectory && expandedDirs[entry.path] && subEntries[entry.path] && (
          renderEntries(subEntries[entry.path], depth + 1)
        )}
      </div>
    ))
  );

  if (!open) {
    return (
      <div onClick={onToggle} style={{
        width: 36, minWidth: 36, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 0', gap: 8, cursor: 'pointer',
        background: colors.bg.glass || colors.bg.surface,
        borderLeft: `1px solid ${colors.border.subtle}`,
        borderRadius: '0 10px 10px 0',
      }} className="fc-glass">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text.dim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span style={{
          writingMode: 'vertical-rl', fontSize: 9, fontWeight: 700,
          color: colors.text.dim, fontFamily: fb, letterSpacing: 1,
        }}>EDITOR</span>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderBottom: `1px solid ${colors.border.subtle}`,
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fc, color: colors.text.secondary, letterSpacing: 0.5 }}>
          CODE EDITOR
        </span>
        <div style={{ flex: 1 }} />
        {!window.flowcode?.window?.isPopout?.() && (
          <button onClick={() => {
            window.flowcode?.window?.popoutPanel('code', { width: 900, height: 700 });
            onToggle();
          }} title="Pop out editor" style={{
            all: 'unset', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 6,
            fontSize: 11, color: colors.text.dim,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = colors.bg.overlay; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
              <path d="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" />
            </svg>
          </button>
        )}
        <button onClick={onToggle} title="Close editor" style={{
          all: 'unset', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6,
          fontSize: 11, color: colors.text.dim,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = colors.bg.overlay; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >✕</button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* File tree */}
        <div style={{
          width: treeWidth, minWidth: 140, maxWidth: 300, flexShrink: 0,
          borderRight: `1px solid ${colors.border.subtle}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Path bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 8px', borderBottom: `1px solid ${colors.border.subtle}`,
            flexShrink: 0,
          }}>
            <button onClick={navigateUp} style={{
              all: 'unset', cursor: 'pointer', fontSize: 12, color: colors.text.dim,
              width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = colors.bg.overlay; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >↑</button>
            <span style={{
              flex: 1, fontSize: 10, fontFamily: fc, color: colors.text.dim,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              direction: 'rtl', textAlign: 'left',
            }}>
              {currentDir.split(/[/\\]/).slice(-2).join('/')}
            </span>
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {loading ? (
              <div style={{ padding: 12, fontSize: 11, color: colors.text.dim, fontFamily: fc, textAlign: 'center' }}>
                Loading...
              </div>
            ) : (
              renderEntries(entries)
            )}
          </div>
        </div>

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tabs */}
          {openFiles.length > 0 && (
            <div style={{
              display: 'flex', overflow: 'auto', flexShrink: 0,
              borderBottom: `1px solid ${colors.border.subtle}`,
              background: colors.bg.surface,
            }}>
              {openFiles.map((file, idx) => (
                <div
                  key={file.path}
                  onClick={() => setActiveFileIdx(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontFamily: fc,
                    color: idx === activeFileIdx ? colors.text.primary : colors.text.dim,
                    background: idx === activeFileIdx ? colors.bg.raised : 'transparent',
                    borderRight: `1px solid ${colors.border.subtle}`,
                    borderBottom: idx === activeFileIdx ? `2px solid ${colors.accent.primary}` : '2px solid transparent',
                    transition: 'all .1s', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {dirty[file.path] && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent.amber, flexShrink: 0 }} />
                  )}
                  {file.name}
                  <span
                    onClick={(e) => { e.stopPropagation(); closeFile(idx); }}
                    style={{
                      fontSize: 10, color: colors.text.ghost, cursor: 'pointer',
                      width: 16, height: 16, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', borderRadius: 4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = colors.bg.overlay; e.currentTarget.style.color = colors.text.secondary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.ghost; }}
                  >✕</span>
                </div>
              ))}
            </div>
          )}

          {/* Monaco editor */}
          {activeFile ? (
            <div style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                language={getLang(activeFile.name)}
                value={fileContents[activeFile.path] || ''}
                theme={themeName === 'light' ? 'vs' : (MONACO_THEME_MAP[paletteName] || 'fc-aurora')}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  fontFamily: fc,
                  minimap: { enabled: true, maxColumn: 80 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  renderLineHighlight: 'all',
                  bracketPairColorization: { enabled: true },
                  padding: { top: 8 },
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
                loading={
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', color: colors.text.dim, fontSize: 12, fontFamily: fc,
                  }}>
                    Loading editor...
                  </div>
                }
              />
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: colors.text.ghost, padding: 40,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span style={{ fontSize: 12, fontFamily: fc, textAlign: 'center' }}>
                Select a file from the tree to start editing
              </span>
              <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.ghost }}>
                Ctrl+S to save
              </span>
            </div>
          )}

          {/* Status bar */}
          {activeFile && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '3px 10px', borderTop: `1px solid ${colors.border.subtle}`,
              fontSize: 10, fontFamily: fc, color: colors.text.dim, flexShrink: 0,
              background: colors.bg.surface,
            }}>
              <span>{getLang(activeFile.name).toUpperCase()}</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {dirty[activeFile.path] && (
                  <span style={{ color: colors.accent.amber }}>Modified</span>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  {activeFile.path}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
