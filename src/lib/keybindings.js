const STORAGE_KEY = 'flowade_keybinding_overrides';

export const DEFAULT_KEYBINDINGS = [
  { id: 'addTerminal',   label: 'New Terminal',     defaultKey: 'Ctrl+T',       category: 'Terminal' },
  { id: 'closeTerminal', label: 'Close Terminal',   defaultKey: 'Ctrl+W',       category: 'Terminal' },
  { id: 'layout1x1',     label: 'Layout 1x1',       defaultKey: 'Ctrl+1',       category: 'Layout' },
  { id: 'layout2x1',     label: 'Layout 2x1',       defaultKey: 'Ctrl+2',       category: 'Layout' },
  { id: 'layout3x1',     label: 'Layout 3x1',       defaultKey: 'Ctrl+3',       category: 'Layout' },
  { id: 'layout2x2',     label: 'Layout 2x2',       defaultKey: 'Ctrl+4',       category: 'Layout' },
  { id: 'toggleDanger',  label: 'Toggle Danger',     defaultKey: 'Ctrl+Shift+D', category: 'Mode' },
  { id: 'cycleFocus',    label: 'Cycle Focus',       defaultKey: 'Ctrl+Tab',     category: 'Navigation' },
  { id: 'openSettings',  label: 'Open Settings',     defaultKey: 'Ctrl+,',       category: 'Navigation' },
  { id: 'commandPalette', label: 'Command Palette',   defaultKey: 'Ctrl+Shift+P', category: 'Navigation' },
  { id: 'toggleSidebar',  label: 'Toggle Sidebar',    defaultKey: 'Ctrl+B',       category: 'Navigation' },
  { id: 'toggleBrowser',  label: 'Toggle Browser',    defaultKey: 'Ctrl+Shift+B', category: 'Navigation' },
  { id: 'toggleCode',     label: 'Toggle Code Editor', defaultKey: 'Ctrl+Shift+E', category: 'Navigation' },
];

function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/**
 * Returns the full keybindings list with user overrides merged in.
 * Each entry has: { id, label, defaultKey, category, key }
 * where `key` is the active binding (override or default).
 */
export function getKeybindings() {
  const overrides = loadOverrides();
  return DEFAULT_KEYBINDINGS.map((binding) => ({
    ...binding,
    key: overrides[binding.id] || binding.defaultKey,
  }));
}

/**
 * Save a custom key binding for a given action id.
 */
export function saveKeybinding(id, key) {
  const overrides = loadOverrides();
  overrides[id] = key;
  saveOverrides(overrides);
}

/**
 * Clear all custom overrides, restoring defaults.
 */
export function resetKeybindings() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if a key combo is already assigned to another action.
 * Returns the conflicting binding object, or null if no conflict.
 */
export function detectConflicts(id, key) {
  const bindings = getKeybindings();
  const normalised = key.toLowerCase();
  for (const b of bindings) {
    if (b.id !== id && b.key.toLowerCase() === normalised) {
      return b;
    }
  }
  return null;
}

/**
 * Parse a keybinding string like "Ctrl+Shift+D" into a matcher
 * that can test against a KeyboardEvent.
 */
export function parseKeybinding(keyStr) {
  const parts = keyStr.split('+');
  const modifiers = { ctrl: false, shift: false, alt: false, meta: false };
  let mainKey = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl')       modifiers.ctrl = true;
    else if (lower === 'shift') modifiers.shift = true;
    else if (lower === 'alt')   modifiers.alt = true;
    else if (lower === 'meta')  modifiers.meta = true;
    else mainKey = part;
  }

  return { modifiers, mainKey };
}

/**
 * Test whether a KeyboardEvent matches a keybinding string.
 */
export function matchesKeybinding(event, keyStr) {
  const { modifiers, mainKey } = parseKeybinding(keyStr);

  // Ctrl or Meta (for mac)
  const modPressed = event.ctrlKey || event.metaKey;
  if (modifiers.ctrl && !modPressed) return false;
  if (!modifiers.ctrl && modPressed) return false;

  if (modifiers.shift !== event.shiftKey) return false;
  if (modifiers.alt !== event.altKey) return false;

  // Normalise the main key for comparison
  const eventKey = event.key === ' ' ? 'Space' : event.key;
  if (mainKey.toLowerCase() === 'tab') return eventKey === 'Tab';
  if (mainKey === ',') return eventKey === ',';

  // For single digit/letter
  return eventKey.toLowerCase() === mainKey.toLowerCase();
}
