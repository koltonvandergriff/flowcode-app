// ---------------------------------------------------------------------------
// FlowCode Palette System
// Three dark palettes + one light. Switch via ThemeContext.
// ---------------------------------------------------------------------------

// AURORA — cool ethereal. Purple-to-teal gradient signature. Premium dev feel.
const AURORA = {
  bg: {
    base: '#06080e',
    surface: '#0c101a',
    raised: '#121826',
    overlay: '#1a2030',
    elevated: '#222a3c',
    glass: 'rgba(12, 16, 26, 0.75)',
    glow: 'rgba(124, 106, 255, 0.06)',
  },
  border: {
    subtle: 'rgba(140, 160, 255, 0.06)',
    medium: 'rgba(140, 160, 255, 0.12)',
    active: '#7c6aff',
    danger: 'rgba(255, 92, 106, 0.3)',
    focus: 'rgba(124, 106, 255, 0.4)',
  },
  accent: {
    primary: '#7c6aff',
    secondary: '#4af0c0',
    green: '#4af0c0',
    purple: '#7c6aff',
    amber: '#ffb340',
    cyan: '#40d8f0',
    pink: '#ff6b8a',
    blue: '#5c9aff',
  },
  text: {
    primary: '#e8eaf4',
    secondary: '#a0a8be',
    muted: '#6e7890',
    dim: '#4a5468',
    ghost: '#2e3648',
  },
  status: {
    success: '#4af0c0',
    warning: '#ffb340',
    error: '#ff5c6a',
    info: '#5c9aff',
    idle: '#4a5468',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #7c6aff, #4af0c0)',
    surface: 'linear-gradient(180deg, rgba(124, 106, 255, 0.03) 0%, transparent 100%)',
    glow: 'radial-gradient(ellipse at 50% 0%, rgba(124, 106, 255, 0.08) 0%, transparent 70%)',
    mesh: `
      radial-gradient(ellipse 80% 50% at 20% 80%, rgba(74, 240, 192, 0.04) 0%, transparent 100%),
      radial-gradient(ellipse 60% 60% at 80% 20%, rgba(124, 106, 255, 0.06) 0%, transparent 100%),
      radial-gradient(ellipse 50% 50% at 50% 50%, rgba(92, 154, 255, 0.02) 0%, transparent 100%)
    `,
  },
};

// EMBER — warm rich. Gold-to-rose gradient signature. Cozy, unique among dev tools.
const EMBER = {
  bg: {
    base: '#0c0a0e',
    surface: '#14111a',
    raised: '#1c1824',
    overlay: '#261e2e',
    elevated: '#302638',
    glass: 'rgba(20, 17, 26, 0.75)',
    glow: 'rgba(232, 160, 84, 0.06)',
  },
  border: {
    subtle: 'rgba(200, 160, 120, 0.06)',
    medium: 'rgba(200, 160, 120, 0.12)',
    active: '#e8a054',
    danger: 'rgba(255, 92, 106, 0.3)',
    focus: 'rgba(232, 160, 84, 0.4)',
  },
  accent: {
    primary: '#e8a054',
    secondary: '#c77dff',
    green: '#5cd07a',
    purple: '#c77dff',
    amber: '#e8a054',
    cyan: '#56c8d8',
    pink: '#ff7eb3',
    blue: '#6aa0ff',
  },
  text: {
    primary: '#f0ebe4',
    secondary: '#b8a898',
    muted: '#8a7a6c',
    dim: '#5e5048',
    ghost: '#3a302a',
  },
  status: {
    success: '#5cd07a',
    warning: '#e8a054',
    error: '#ff5c6a',
    info: '#6aa0ff',
    idle: '#5e5048',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #e8a054, #ff7eb3)',
    surface: 'linear-gradient(180deg, rgba(232, 160, 84, 0.03) 0%, transparent 100%)',
    glow: 'radial-gradient(ellipse at 50% 0%, rgba(232, 160, 84, 0.08) 0%, transparent 70%)',
    mesh: `
      radial-gradient(ellipse 80% 50% at 20% 80%, rgba(255, 126, 179, 0.04) 0%, transparent 100%),
      radial-gradient(ellipse 60% 60% at 80% 20%, rgba(232, 160, 84, 0.06) 0%, transparent 100%),
      radial-gradient(ellipse 50% 50% at 50% 50%, rgba(199, 125, 255, 0.02) 0%, transparent 100%)
    `,
  },
};

// ABYSS — deep focused. Blue-to-emerald signature. Calm, oceanic, focused.
const ABYSS = {
  bg: {
    base: '#060a14',
    surface: '#0a1222',
    raised: '#10192e',
    overlay: '#182440',
    elevated: '#1e2c4a',
    glass: 'rgba(10, 18, 34, 0.75)',
    glow: 'rgba(60, 138, 255, 0.06)',
  },
  border: {
    subtle: 'rgba(60, 140, 255, 0.06)',
    medium: 'rgba(60, 140, 255, 0.12)',
    active: '#3c8aff',
    danger: 'rgba(255, 76, 92, 0.3)',
    focus: 'rgba(60, 138, 255, 0.4)',
  },
  accent: {
    primary: '#3c8aff',
    secondary: '#00d4aa',
    green: '#00d4aa',
    purple: '#8a7cff',
    amber: '#ffa63c',
    cyan: '#00c8e0',
    pink: '#ff6b9d',
    blue: '#3c8aff',
  },
  text: {
    primary: '#e4eaf4',
    secondary: '#94a4be',
    muted: '#607088',
    dim: '#405068',
    ghost: '#283448',
  },
  status: {
    success: '#00d4aa',
    warning: '#ffa63c',
    error: '#ff4c5c',
    info: '#3c8aff',
    idle: '#405068',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #3c8aff, #00d4aa)',
    surface: 'linear-gradient(180deg, rgba(60, 138, 255, 0.03) 0%, transparent 100%)',
    glow: 'radial-gradient(ellipse at 50% 0%, rgba(60, 138, 255, 0.08) 0%, transparent 70%)',
    mesh: `
      radial-gradient(ellipse 80% 50% at 20% 80%, rgba(0, 212, 170, 0.04) 0%, transparent 100%),
      radial-gradient(ellipse 60% 60% at 80% 20%, rgba(60, 138, 255, 0.06) 0%, transparent 100%),
      radial-gradient(ellipse 50% 50% at 50% 50%, rgba(138, 124, 255, 0.02) 0%, transparent 100%)
    `,
  },
};

// NORD — arctic calm. Muted, balanced, easy on eyes.
const NORD = {
  bg: { base: '#2e3440', surface: '#3b4252', raised: '#434c5e', overlay: '#4c566a', elevated: '#556078', glass: 'rgba(46, 52, 64, 0.8)', glow: 'rgba(136, 192, 208, 0.06)' },
  border: { subtle: 'rgba(216, 222, 233, 0.06)', medium: 'rgba(216, 222, 233, 0.12)', active: '#88c0d0', danger: 'rgba(191, 97, 106, 0.3)', focus: 'rgba(136, 192, 208, 0.4)' },
  accent: { primary: '#88c0d0', secondary: '#a3be8c', green: '#a3be8c', purple: '#b48ead', amber: '#ebcb8b', cyan: '#88c0d0', pink: '#b48ead', blue: '#81a1c1' },
  text: { primary: '#eceff4', secondary: '#d8dee9', muted: '#a0aab8', dim: '#6b7890', ghost: '#4c566a' },
  status: { success: '#a3be8c', warning: '#ebcb8b', error: '#bf616a', info: '#81a1c1', idle: '#6b7890' },
  gradient: { primary: 'linear-gradient(135deg, #88c0d0, #a3be8c)', surface: 'linear-gradient(180deg, rgba(136, 192, 208, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(136, 192, 208, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(163, 190, 140, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(136, 192, 208, 0.04) 0%, transparent 100%)` },
};

// DRACULA — iconic purple. Rich, vibrant, developer-favorite.
const DRACULA = {
  bg: { base: '#282a36', surface: '#2d2f3d', raised: '#343746', overlay: '#3c3f52', elevated: '#44475a', glass: 'rgba(40, 42, 54, 0.8)', glow: 'rgba(189, 147, 249, 0.06)' },
  border: { subtle: 'rgba(248, 248, 242, 0.06)', medium: 'rgba(248, 248, 242, 0.12)', active: '#bd93f9', danger: 'rgba(255, 85, 85, 0.3)', focus: 'rgba(189, 147, 249, 0.4)' },
  accent: { primary: '#bd93f9', secondary: '#50fa7b', green: '#50fa7b', purple: '#bd93f9', amber: '#f1fa8c', cyan: '#8be9fd', pink: '#ff79c6', blue: '#6272a4' },
  text: { primary: '#f8f8f2', secondary: '#cdd1de', muted: '#9298a8', dim: '#6272a4', ghost: '#44475a' },
  status: { success: '#50fa7b', warning: '#f1fa8c', error: '#ff5555', info: '#8be9fd', idle: '#6272a4' },
  gradient: { primary: 'linear-gradient(135deg, #bd93f9, #ff79c6)', surface: 'linear-gradient(180deg, rgba(189, 147, 249, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(189, 147, 249, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(255, 121, 198, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(189, 147, 249, 0.04) 0%, transparent 100%)` },
};

// TOKYO NIGHT — neon cityscape. Deep blues with vivid accents.
const TOKYO = {
  bg: { base: '#1a1b26', surface: '#1e1f2e', raised: '#24253a', overlay: '#2a2c42', elevated: '#32344a', glass: 'rgba(26, 27, 38, 0.8)', glow: 'rgba(122, 162, 247, 0.06)' },
  border: { subtle: 'rgba(169, 177, 214, 0.06)', medium: 'rgba(169, 177, 214, 0.12)', active: '#7aa2f7', danger: 'rgba(247, 118, 142, 0.3)', focus: 'rgba(122, 162, 247, 0.4)' },
  accent: { primary: '#7aa2f7', secondary: '#9ece6a', green: '#9ece6a', purple: '#bb9af7', amber: '#e0af68', cyan: '#7dcfff', pink: '#f7768e', blue: '#7aa2f7' },
  text: { primary: '#c0caf5', secondary: '#a9b1d6', muted: '#787c99', dim: '#565f89', ghost: '#3b3d57' },
  status: { success: '#9ece6a', warning: '#e0af68', error: '#f7768e', info: '#7dcfff', idle: '#565f89' },
  gradient: { primary: 'linear-gradient(135deg, #7aa2f7, #bb9af7)', surface: 'linear-gradient(180deg, rgba(122, 162, 247, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(122, 162, 247, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(187, 154, 247, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(122, 162, 247, 0.04) 0%, transparent 100%)` },
};

// SYNTHWAVE — retro-futuristic. Hot pink meets electric cyan.
const SYNTHWAVE = {
  bg: { base: '#1b1124', surface: '#211530', raised: '#2a1c3c', overlay: '#342448', elevated: '#3e2c54', glass: 'rgba(27, 17, 36, 0.8)', glow: 'rgba(255, 108, 180, 0.06)' },
  border: { subtle: 'rgba(255, 108, 180, 0.06)', medium: 'rgba(255, 108, 180, 0.12)', active: '#ff6cb4', danger: 'rgba(255, 85, 85, 0.3)', focus: 'rgba(255, 108, 180, 0.4)' },
  accent: { primary: '#ff6cb4', secondary: '#36f9f6', green: '#72f1b8', purple: '#c792ea', amber: '#fede5d', cyan: '#36f9f6', pink: '#ff6cb4', blue: '#6a8efc' },
  text: { primary: '#f0e8f8', secondary: '#c8b8d8', muted: '#8a7a9a', dim: '#5e4e6e', ghost: '#3e2e4e' },
  status: { success: '#72f1b8', warning: '#fede5d', error: '#fe4450', info: '#36f9f6', idle: '#5e4e6e' },
  gradient: { primary: 'linear-gradient(135deg, #ff6cb4, #36f9f6)', surface: 'linear-gradient(180deg, rgba(255, 108, 180, 0.03) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(255, 108, 180, 0.08) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(54, 249, 246, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(255, 108, 180, 0.05) 0%, transparent 100%)` },
};

// CATPPUCCIN (Mocha) — pastel warmth. Soft, cozy, modern.
const CATPPUCCIN = {
  bg: { base: '#1e1e2e', surface: '#232334', raised: '#2a2a3c', overlay: '#313244', elevated: '#3a3a4e', glass: 'rgba(30, 30, 46, 0.8)', glow: 'rgba(203, 166, 247, 0.06)' },
  border: { subtle: 'rgba(205, 214, 244, 0.06)', medium: 'rgba(205, 214, 244, 0.12)', active: '#cba6f7', danger: 'rgba(243, 139, 168, 0.3)', focus: 'rgba(203, 166, 247, 0.4)' },
  accent: { primary: '#cba6f7', secondary: '#a6e3a1', green: '#a6e3a1', purple: '#cba6f7', amber: '#f9e2af', cyan: '#89dceb', pink: '#f38ba8', blue: '#89b4fa' },
  text: { primary: '#cdd6f4', secondary: '#bac2de', muted: '#7f849c', dim: '#585b70', ghost: '#45475a' },
  status: { success: '#a6e3a1', warning: '#f9e2af', error: '#f38ba8', info: '#89b4fa', idle: '#585b70' },
  gradient: { primary: 'linear-gradient(135deg, #cba6f7, #f38ba8)', surface: 'linear-gradient(180deg, rgba(203, 166, 247, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(203, 166, 247, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(243, 139, 168, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(203, 166, 247, 0.04) 0%, transparent 100%)` },
};

// ROSE PINE — elegant muted. Refined rose meets gold.
const ROSEPINE = {
  bg: { base: '#191724', surface: '#1f1d2e', raised: '#26233a', overlay: '#2a2740', elevated: '#332f48', glass: 'rgba(25, 23, 36, 0.8)', glow: 'rgba(235, 188, 186, 0.06)' },
  border: { subtle: 'rgba(224, 222, 244, 0.06)', medium: 'rgba(224, 222, 244, 0.12)', active: '#ebbcba', danger: 'rgba(235, 111, 146, 0.3)', focus: 'rgba(235, 188, 186, 0.4)' },
  accent: { primary: '#ebbcba', secondary: '#31748f', green: '#9ccfd8', purple: '#c4a7e7', amber: '#f6c177', cyan: '#9ccfd8', pink: '#eb6f92', blue: '#31748f' },
  text: { primary: '#e0def4', secondary: '#c4c0d8', muted: '#908caa', dim: '#6e6a86', ghost: '#403d52' },
  status: { success: '#9ccfd8', warning: '#f6c177', error: '#eb6f92', info: '#31748f', idle: '#6e6a86' },
  gradient: { primary: 'linear-gradient(135deg, #ebbcba, #c4a7e7)', surface: 'linear-gradient(180deg, rgba(235, 188, 186, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(235, 188, 186, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(196, 167, 231, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(235, 188, 186, 0.04) 0%, transparent 100%)` },
};

// GRUVBOX — retro warmth. Brown, orange, earthy.
const GRUVBOX = {
  bg: { base: '#1d2021', surface: '#282828', raised: '#32302f', overlay: '#3c3836', elevated: '#504945', glass: 'rgba(29, 32, 33, 0.8)', glow: 'rgba(254, 128, 25, 0.06)' },
  border: { subtle: 'rgba(235, 219, 178, 0.06)', medium: 'rgba(235, 219, 178, 0.12)', active: '#fe8019', danger: 'rgba(251, 73, 52, 0.3)', focus: 'rgba(254, 128, 25, 0.4)' },
  accent: { primary: '#fe8019', secondary: '#b8bb26', green: '#b8bb26', purple: '#d3869b', amber: '#fabd2f', cyan: '#8ec07c', pink: '#d3869b', blue: '#83a598' },
  text: { primary: '#ebdbb2', secondary: '#d5c4a1', muted: '#a89984', dim: '#7c6f64', ghost: '#504945' },
  status: { success: '#b8bb26', warning: '#fabd2f', error: '#fb4934', info: '#83a598', idle: '#7c6f64' },
  gradient: { primary: 'linear-gradient(135deg, #fe8019, #fabd2f)', surface: 'linear-gradient(180deg, rgba(254, 128, 25, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(254, 128, 25, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(184, 187, 38, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(254, 128, 25, 0.04) 0%, transparent 100%)` },
};

// ONEDARK — balanced classic. VS Code roots, polished.
const ONEDARK = {
  bg: { base: '#21252b', surface: '#282c34', raised: '#2c313a', overlay: '#333842', elevated: '#3b4048', glass: 'rgba(33, 37, 43, 0.8)', glow: 'rgba(97, 175, 239, 0.06)' },
  border: { subtle: 'rgba(171, 178, 191, 0.06)', medium: 'rgba(171, 178, 191, 0.12)', active: '#61afef', danger: 'rgba(224, 108, 117, 0.3)', focus: 'rgba(97, 175, 239, 0.4)' },
  accent: { primary: '#61afef', secondary: '#98c379', green: '#98c379', purple: '#c678dd', amber: '#e5c07b', cyan: '#56b6c2', pink: '#c678dd', blue: '#61afef' },
  text: { primary: '#abb2bf', secondary: '#9da5b4', muted: '#7f848e', dim: '#5c6370', ghost: '#3e4452' },
  status: { success: '#98c379', warning: '#e5c07b', error: '#e06c75', info: '#61afef', idle: '#5c6370' },
  gradient: { primary: 'linear-gradient(135deg, #61afef, #56b6c2)', surface: 'linear-gradient(180deg, rgba(97, 175, 239, 0.02) 0%, transparent 100%)', glow: 'radial-gradient(ellipse at 50% 0%, rgba(97, 175, 239, 0.06) 0%, transparent 70%)', mesh: `radial-gradient(ellipse 80% 50% at 20% 80%, rgba(152, 195, 121, 0.03) 0%, transparent 100%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(97, 175, 239, 0.04) 0%, transparent 100%)` },
};

// Default dark = Aurora
export const DARK_COLORS = AURORA;

// All palettes for palette picker
export const PALETTES = {
  aurora: AURORA,
  ember: EMBER,
  abyss: ABYSS,
  nord: NORD,
  dracula: DRACULA,
  tokyo: TOKYO,
  synthwave: SYNTHWAVE,
  catppuccin: CATPPUCCIN,
  rosepine: ROSEPINE,
  gruvbox: GRUVBOX,
  onedark: ONEDARK,
};

export const LIGHT_COLORS = {
  bg: {
    base: '#f5f6f8',
    surface: '#ffffff',
    raised: '#f0f1f3',
    overlay: '#e8e9ed',
    elevated: '#dddee2',
    glass: 'rgba(255, 255, 255, 0.75)',
    glow: 'rgba(124, 58, 237, 0.04)',
  },
  border: {
    subtle: 'rgba(0, 0, 0, 0.06)',
    medium: 'rgba(0, 0, 0, 0.12)',
    active: '#7c3aed',
    danger: 'rgba(239, 68, 68, 0.3)',
    focus: 'rgba(124, 58, 237, 0.3)',
  },
  accent: {
    primary: '#7c3aed',
    secondary: '#0d9488',
    green: '#16a34a',
    purple: '#7c3aed',
    amber: '#d97706',
    cyan: '#0891b2',
    pink: '#db2777',
    blue: '#2563eb',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6b7280',
    dim: '#9ca3af',
    ghost: '#d1d5db',
  },
  status: {
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
    idle: '#9ca3af',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #7c3aed, #0d9488)',
    surface: 'linear-gradient(180deg, rgba(124, 58, 237, 0.02) 0%, transparent 100%)',
    glow: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.04) 0%, transparent 70%)',
    mesh: 'none',
  },
};

// Terminal themes matched to palettes
export const AURORA_TERMINAL = {
  background: '#0c101a',
  foreground: '#d4d8e8',
  cursor: '#7c6aff',
  cursorAccent: '#0c101a',
  selectionBackground: 'rgba(124, 106, 255, 0.2)',
  black: '#0c101a',
  red: '#ff5c6a',
  green: '#4af0c0',
  yellow: '#ffb340',
  blue: '#5c9aff',
  magenta: '#7c6aff',
  cyan: '#40d8f0',
  white: '#a0a8be',
  brightBlack: '#4a5468',
  brightRed: '#ff7a84',
  brightGreen: '#6ef4d0',
  brightYellow: '#ffc660',
  brightBlue: '#80b0ff',
  brightMagenta: '#9c8aff',
  brightCyan: '#60e0f8',
  brightWhite: '#e8eaf4',
};

export const EMBER_TERMINAL = {
  background: '#14111a',
  foreground: '#d8d0c8',
  cursor: '#e8a054',
  cursorAccent: '#14111a',
  selectionBackground: 'rgba(232, 160, 84, 0.2)',
  black: '#14111a',
  red: '#ff5c6a',
  green: '#5cd07a',
  yellow: '#e8a054',
  blue: '#6aa0ff',
  magenta: '#c77dff',
  cyan: '#56c8d8',
  white: '#b8a898',
  brightBlack: '#5e5048',
  brightRed: '#ff7a84',
  brightGreen: '#7ada94',
  brightYellow: '#f0b870',
  brightBlue: '#88b4ff',
  brightMagenta: '#d89aff',
  brightCyan: '#70d4e4',
  brightWhite: '#f0ebe4',
};

export const ABYSS_TERMINAL = {
  background: '#0a1222',
  foreground: '#c8d4e4',
  cursor: '#3c8aff',
  cursorAccent: '#0a1222',
  selectionBackground: 'rgba(60, 138, 255, 0.2)',
  black: '#0a1222',
  red: '#ff4c5c',
  green: '#00d4aa',
  yellow: '#ffa63c',
  blue: '#3c8aff',
  magenta: '#8a7cff',
  cyan: '#00c8e0',
  white: '#94a4be',
  brightBlack: '#405068',
  brightRed: '#ff6e7a',
  brightGreen: '#30e0be',
  brightYellow: '#ffba5c',
  brightBlue: '#60a0ff',
  brightMagenta: '#a898ff',
  brightCyan: '#30d4ea',
  brightWhite: '#e4eaf4',
};

// Legacy exports
export const DARK_TERMINAL_THEME = AURORA_TERMINAL;

export const LIGHT_TERMINAL_THEME = {
  background: '#ffffff',
  foreground: '#111827',
  cursor: '#7c3aed',
  cursorAccent: '#ffffff',
  selectionBackground: 'rgba(124, 58, 237, 0.2)',
  black: '#111827',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#d97706',
  blue: '#2563eb',
  magenta: '#7c3aed',
  cyan: '#0891b2',
  white: '#d1d5db',
  brightBlack: '#6b7280',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#f59e0b',
  brightBlue: '#3b82f6',
  brightMagenta: '#8b5cf6',
  brightCyan: '#06b6d4',
  brightWhite: '#111827',
};

// Helper to build terminal theme from palette colors
function termTheme(bg, fg, cursor, p) {
  return {
    background: bg, foreground: fg, cursor, cursorAccent: bg,
    selectionBackground: cursor + '30',
    black: bg, red: p.red, green: p.green, yellow: p.yellow, blue: p.blue, magenta: p.magenta, cyan: p.cyan, white: p.white,
    brightBlack: p.brightBlack, brightRed: p.brightRed, brightGreen: p.brightGreen, brightYellow: p.brightYellow,
    brightBlue: p.brightBlue, brightMagenta: p.brightMagenta, brightCyan: p.brightCyan, brightWhite: p.brightWhite,
  };
}

const NORD_TERMINAL = termTheme('#3b4252', '#d8dee9', '#88c0d0', { red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b', blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#d8dee9', brightBlack: '#4c566a', brightRed: '#d08770', brightGreen: '#a3be8c', brightYellow: '#ebcb8b', brightBlue: '#81a1c1', brightMagenta: '#b48ead', brightCyan: '#8fbcbb', brightWhite: '#eceff4' });
const DRACULA_TERMINAL = termTheme('#282a36', '#f8f8f2', '#bd93f9', { red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c', blue: '#6272a4', magenta: '#bd93f9', cyan: '#8be9fd', white: '#bfbfbf', brightBlack: '#44475a', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#f8f8f2' });
const TOKYO_TERMINAL = termTheme('#1a1b26', '#c0caf5', '#7aa2f7', { red: '#f7768e', green: '#9ece6a', yellow: '#e0af68', blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6', brightBlack: '#565f89', brightRed: '#f7768e', brightGreen: '#9ece6a', brightYellow: '#e0af68', brightBlue: '#7aa2f7', brightMagenta: '#bb9af7', brightCyan: '#7dcfff', brightWhite: '#c0caf5' });
const SYNTHWAVE_TERMINAL = termTheme('#1b1124', '#f0e8f8', '#ff6cb4', { red: '#fe4450', green: '#72f1b8', yellow: '#fede5d', blue: '#6a8efc', magenta: '#c792ea', cyan: '#36f9f6', white: '#c8b8d8', brightBlack: '#5e4e6e', brightRed: '#ff6e78', brightGreen: '#8ff4c8', brightYellow: '#feea80', brightBlue: '#8aa8ff', brightMagenta: '#d8aaff', brightCyan: '#60fcf8', brightWhite: '#f0e8f8' });
const CATPPUCCIN_TERMINAL = termTheme('#1e1e2e', '#cdd6f4', '#cba6f7', { red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af', blue: '#89b4fa', magenta: '#cba6f7', cyan: '#89dceb', white: '#bac2de', brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1', brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#cba6f7', brightCyan: '#89dceb', brightWhite: '#cdd6f4' });
const ROSEPINE_TERMINAL = termTheme('#191724', '#e0def4', '#ebbcba', { red: '#eb6f92', green: '#9ccfd8', yellow: '#f6c177', blue: '#31748f', magenta: '#c4a7e7', cyan: '#9ccfd8', white: '#c4c0d8', brightBlack: '#6e6a86', brightRed: '#eb6f92', brightGreen: '#9ccfd8', brightYellow: '#f6c177', brightBlue: '#31748f', brightMagenta: '#c4a7e7', brightCyan: '#9ccfd8', brightWhite: '#e0def4' });
const GRUVBOX_TERMINAL = termTheme('#282828', '#ebdbb2', '#fe8019', { red: '#fb4934', green: '#b8bb26', yellow: '#fabd2f', blue: '#83a598', magenta: '#d3869b', cyan: '#8ec07c', white: '#d5c4a1', brightBlack: '#504945', brightRed: '#fb4934', brightGreen: '#b8bb26', brightYellow: '#fabd2f', brightBlue: '#83a598', brightMagenta: '#d3869b', brightCyan: '#8ec07c', brightWhite: '#ebdbb2' });
const ONEDARK_TERMINAL = termTheme('#282c34', '#abb2bf', '#61afef', { red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#9da5b4', brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b', brightBlue: '#61afef', brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#abb2bf' });

// Palette-to-terminal mapping
export const PALETTE_TERMINALS = {
  aurora: AURORA_TERMINAL,
  ember: EMBER_TERMINAL,
  abyss: ABYSS_TERMINAL,
  nord: NORD_TERMINAL,
  dracula: DRACULA_TERMINAL,
  tokyo: TOKYO_TERMINAL,
  synthwave: SYNTHWAVE_TERMINAL,
  catppuccin: CATPPUCCIN_TERMINAL,
  rosepine: ROSEPINE_TERMINAL,
  gruvbox: GRUVBOX_TERMINAL,
  onedark: ONEDARK_TERMINAL,
};
