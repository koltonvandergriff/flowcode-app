export const FONTS = {
  mono: "'JetBrains Mono', 'Cascadia Code', monospace",
  body: "'Outfit', sans-serif",
  display: "'Orbitron', sans-serif",
};

export const COLORS = {
  bg: {
    base: '#161729',
    surface: '#1a1b32',
    raised: '#1e1f36',
    overlay: '#262842',
  },
  border: {
    subtle: '#2e3050',
    active: '#2a6a4a',
    danger: '#E74C3C40',
    focus: '#818cf8',
  },
  accent: {
    green: '#34d399',
    purple: '#818cf8',
    amber: '#f59e0b',
    cyan: '#2dd4bf',
    pink: '#e879a8',
  },
  text: {
    primary: '#e0e2f0',
    secondary: '#c0c3d8',
    muted: '#9899b3',
    dim: '#6a6b85',
    ghost: '#4a4e68',
  },
  status: {
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3B8BD4',
    idle: '#6a6b85',
  },
};

export const TERMINAL_THEME = {
  background: COLORS.bg.surface,
  foreground: '#d0d1e0',
  cursor: COLORS.accent.green,
  cursorAccent: COLORS.bg.surface,
  selectionBackground: '#818cf830',
  black: '#1a1b32',
  red: '#E74C3C',
  green: '#2ECC71',
  yellow: '#F39C12',
  blue: '#3B8BD4',
  magenta: '#8E44AD',
  cyan: '#1ABC9C',
  white: '#c0c3d8',
  brightBlack: '#2a2e48',
  brightRed: '#E8593C',
  brightGreen: '#2ECC71',
  brightYellow: '#FFD700',
  brightBlue: '#5DADE2',
  brightMagenta: '#AF7AC5',
  brightCyan: '#48C9B0',
  brightWhite: '#e0e2f0',
};

export const PROVIDERS = [
  { id: 'claude', name: 'Claude CLI', command: 'claude', color: COLORS.accent.green },
  { id: 'shell', name: 'Shell', command: null, color: COLORS.accent.amber },
  { id: 'aider', name: 'Aider', command: 'aider', color: COLORS.accent.purple },
  { id: 'custom', name: 'Custom', command: null, color: COLORS.accent.cyan },
];

export const LAYOUTS = [
  { id: '1x1', cols: 1, max: 1, label: '1x1' },
  { id: '2x1', cols: 2, max: 2, label: '2x1' },
  { id: '3x1', cols: 3, max: 3, label: '3x1' },
  { id: '2x2', cols: 2, max: 4, label: '2x2' },
];

export const COMMAND_LIBRARY = [
  { cat: 'Navigation', cmd: '/help', desc: 'Show available commands and keyboard shortcuts' },
  { cat: 'Navigation', cmd: '/clear', desc: 'Clear the conversation history' },
  { cat: 'Navigation', cmd: '/compact', desc: 'Compress conversation to save context' },
  { cat: 'Navigation', cmd: '/config', desc: 'Open settings and configuration' },
  { cat: 'Navigation', cmd: '/status', desc: 'Show current session status' },
  { cat: 'Navigation', cmd: '/cost', desc: 'Display token usage and cost' },
  { cat: 'Project', cmd: '/init', desc: 'Initialize CLAUDE.md with codebase docs' },
  { cat: 'Project', cmd: '/review', desc: 'Review a pull request' },
  { cat: 'Project', cmd: '/simplify', desc: 'Review code for quality' },
  { cat: 'Session', cmd: '/model', desc: 'Switch Claude models' },
  { cat: 'Session', cmd: '/fast', desc: 'Toggle fast mode' },
  { cat: 'Session', cmd: '/permissions', desc: 'Manage permissions' },
  { cat: 'Session', cmd: '/memory', desc: 'Manage persistent memory' },
  { cat: 'Tools', cmd: '/doctor', desc: 'Run diagnostics' },
  { cat: 'Tools', cmd: '/vim', desc: 'Toggle vim keybinding mode' },
  { cat: 'Keyboard', cmd: 'Enter', desc: 'Send message', key: true },
  { cat: 'Keyboard', cmd: 'Shift+Enter', desc: 'New line', key: true },
  { cat: 'Keyboard', cmd: 'Escape', desc: 'Cancel / interrupt', key: true },
  { cat: 'Keyboard', cmd: 'Tab', desc: 'Accept autocomplete', key: true },
  { cat: 'Keyboard', cmd: 'Up/Down', desc: 'Scroll input history', key: true },
  { cat: 'Git', cmd: 'git status', desc: 'Working tree status', shell: true },
  { cat: 'Git', cmd: 'git diff', desc: 'Show unstaged changes', shell: true },
  { cat: 'Git', cmd: 'git log --oneline', desc: 'Compact commit history', shell: true },
  { cat: 'Tips', cmd: '! <command>', desc: 'Run shell command in session', tip: true },
  { cat: 'Tips', cmd: '@ <file>', desc: 'Reference a file for context', tip: true },
  { cat: 'Tips', cmd: 'Paste image', desc: 'Claude analyzes screenshots', tip: true },
  { cat: 'Macros', cmd: '/danger', desc: 'Skip all permission prompts', macro: true },
  { cat: 'Macros', cmd: '/safe', desc: 'Restore safe permissions', macro: true },
  { cat: 'Macros', cmd: '/focus', desc: 'Single terminal mode', macro: true },
  { cat: 'Macros', cmd: '/fleet', desc: 'Full 4-terminal grid', macro: true },
];
