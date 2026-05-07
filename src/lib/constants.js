import { DARK_COLORS, LIGHT_COLORS, DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME } from './themes';

export const FONTS = {
  mono: "'JetBrains Mono', 'Cascadia Code', monospace",
  body: "'Outfit', sans-serif",
  display: "'Orbitron', sans-serif",
};

export { DARK_COLORS, LIGHT_COLORS, DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME };

export const COLORS = DARK_COLORS;
export const TERMINAL_THEME = DARK_TERMINAL_THEME;

export const PROVIDERS = [
  { id: 'claude', name: 'Claude CLI', command: 'claude', color: '#4af0c0' },
  { id: 'claude-api', name: 'Claude API', command: null, color: '#d4a27f', apiProvider: true },
  { id: 'shell', name: 'Shell', command: null, color: '#ffb340' },
  { id: 'aider', name: 'Aider', command: 'aider', color: '#7c6aff' },
  { id: 'chatgpt', name: 'ChatGPT', command: null, color: '#10a37f', apiProvider: true },
  { id: 'openclaw', name: 'OpenClaw', command: null, color: '#ff6b35', apiProvider: true },
  { id: 'custom', name: 'Custom', command: null, color: '#40d8f0' },
];

export const LAYOUTS = [
  { id: '1x1', cols: 1, rows: 1, max: 1, label: '1' },
  { id: '2x1', cols: 2, rows: 1, max: 2, label: '2' },
  { id: '1x2', cols: 1, rows: 2, max: 2, label: '1×2' },
  { id: '3x1', cols: 3, rows: 1, max: 3, label: '3' },
  { id: '2x2', cols: 2, rows: 2, max: 4, label: '2×2' },
  { id: '3x2', cols: 3, rows: 2, max: 6, label: '3×2' },
  { id: '4x2', cols: 4, rows: 2, max: 8, label: '4×2' },
  { id: '3x3', cols: 3, rows: 3, max: 9, label: '3×3' },
  { id: '4x4', cols: 4, rows: 4, max: 16, label: '4×4' },
];

export const WORKSPACE_ROOMS = [
  {
    id: 'code',
    name: 'Code',
    desc: 'Claude + Shell side by side',
    icon: 'code',
    layout: '2x1',
    terminals: [
      { label: 'Claude', provider: 'claude' },
      { label: 'Shell', provider: 'shell' },
    ],
  },
  {
    id: 'review',
    name: 'Review',
    desc: 'Review diffs and run tests',
    icon: 'eye',
    layout: '2x1',
    terminals: [
      { label: 'Review', provider: 'claude' },
      { label: 'Tests', provider: 'shell' },
    ],
  },
  {
    id: 'fleet',
    name: 'Fleet',
    desc: '4 Claude agents in parallel',
    icon: 'grid',
    layout: '2x2',
    terminals: [
      { label: 'Agent 1', provider: 'claude' },
      { label: 'Agent 2', provider: 'claude' },
      { label: 'Agent 3', provider: 'claude' },
      { label: 'Agent 4', provider: 'claude' },
    ],
  },
  {
    id: 'swarm',
    name: 'Swarm',
    desc: '9 agents — maximum parallelism',
    icon: 'zap',
    layout: '3x3',
    terminals: [
      { label: 'Agent 1', provider: 'claude' },
      { label: 'Agent 2', provider: 'claude' },
      { label: 'Agent 3', provider: 'claude' },
      { label: 'Agent 4', provider: 'claude' },
      { label: 'Agent 5', provider: 'claude' },
      { label: 'Agent 6', provider: 'claude' },
      { label: 'Agent 7', provider: 'claude' },
      { label: 'Agent 8', provider: 'claude' },
      { label: 'Agent 9', provider: 'claude' },
    ],
  },
  {
    id: 'fullstack',
    name: 'Full Stack',
    desc: 'Frontend + Backend + DB + Tests',
    icon: 'layers',
    layout: '2x2',
    terminals: [
      { label: 'Frontend', provider: 'shell' },
      { label: 'Backend', provider: 'shell' },
      { label: 'Claude', provider: 'claude' },
      { label: 'Tests', provider: 'shell' },
    ],
  },
  {
    id: 'solo',
    name: 'Focus',
    desc: 'Single terminal, zero distractions',
    icon: 'target',
    layout: '1x1',
    terminals: [
      { label: 'Claude', provider: 'claude' },
    ],
  },
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
