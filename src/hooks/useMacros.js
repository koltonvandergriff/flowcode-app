import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'flowcode-macros';

const DEFAULT_MACROS = [
  { id: 'danger', name: '/danger', desc: 'Auto-approve all prompts', icon: '⚡', type: 'builtin',
    action: { type: 'toggleDanger', value: true } },
  { id: 'safe', name: '/safe', desc: 'Restore safe mode', icon: '🛡', type: 'builtin',
    action: { type: 'toggleDanger', value: false } },
  { id: 'focus', name: '/focus', desc: 'Single terminal', icon: '🎯', type: 'builtin',
    action: { type: 'setLayout', value: '1x1' } },
  { id: 'fleet', name: '/fleet', desc: 'Full grid', icon: '🚀', type: 'builtin',
    action: { type: 'setLayout', value: '2x2' } },
  { id: 'compact-all', name: '/compact-all', desc: 'Compact all terminals', icon: '📦', type: 'builtin',
    action: { type: 'sendAll', value: '/compact\n' } },
  { id: 'status-all', name: '/status-all', desc: 'Status check all', icon: '📊', type: 'builtin',
    action: { type: 'sendAll', value: '/status\n' } },
];

function loadMacros() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const custom = JSON.parse(stored);
      return [...DEFAULT_MACROS, ...custom];
    }
  } catch {}
  return [...DEFAULT_MACROS];
}

function saveCustomMacros(macros) {
  const custom = macros.filter((m) => m.type !== 'builtin');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function useMacros() {
  const [macros, setMacros] = useState(loadMacros);

  useEffect(() => {
    saveCustomMacros(macros);
  }, [macros]);

  const createMacro = useCallback(({ name, desc, icon, action }) => {
    const macro = {
      id: `custom-${Date.now()}`,
      name: name.startsWith('/') ? name : `/${name}`,
      desc,
      icon: icon || '⚙',
      type: 'custom',
      action,
    };
    setMacros((prev) => [...prev, macro]);
    return macro;
  }, []);

  const deleteMacro = useCallback((id) => {
    setMacros((prev) => prev.filter((m) => m.id !== id || m.type === 'builtin'));
  }, []);

  const updateMacro = useCallback((id, updates) => {
    setMacros((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m));
  }, []);

  return { macros, createMacro, deleteMacro, updateMacro };
}
