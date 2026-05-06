import { DARK_COLORS, LIGHT_COLORS, DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME } from './themes';

export const FONTS = {
  mono: "'JetBrains Mono', 'Cascadia Code', monospace",
  body: "'Outfit', sans-serif",
  display: "'Orbitron', sans-serif",
};

// Re-export both palettes for theme-aware components
export { DARK_COLORS, LIGHT_COLORS, DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME };

// Default COLORS remains dark for backwards compatibility
// Components not yet migrated to ThemeContext will continue using these
export const COLORS = DARK_COLORS;

export const TERMINAL_THEME = DARK_TERMINAL_THEME;

export const PROVIDERS = [
  { id: 'claude', name: 'Claude CLI', command: 'claude', color: COLORS.accent.green },
  { id: 'claude-api', name: 'Claude API', command: null, color: '#d4a27f', apiProvider: true },
  { id: 'shell', name: 'Shell', command: null, color: COLORS.accent.amber },
  { id: 'aider', name: 'Aider', command: 'aider', color: COLORS.accent.purple },
  { id: 'chatgpt', name: 'ChatGPT', command: null, color: '#10a37f', apiProvider: true },
  { id: 'openclaw', name: 'OpenClaw', command: null, color: '#ff6b35', apiProvider: true },
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
