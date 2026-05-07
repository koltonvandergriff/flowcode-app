import { useEffect } from 'react';
import { getKeybindings, matchesKeybinding } from '../lib/keybindings';

export function useKeyboardShortcuts(actions) {
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      const bindings = getKeybindings();

      for (const binding of bindings) {
        if (!matchesKeybinding(e, binding.key)) continue;

        // Skip closeTerminal when in an input field
        if (binding.id === 'closeTerminal' && inInput) continue;

        e.preventDefault();

        switch (binding.id) {
          case 'addTerminal':
            actions.addTerminal?.();
            break;
          case 'closeTerminal':
            actions.closeTerminal?.();
            break;
          case 'layout1x1':
            actions.setLayout?.('1x1');
            break;
          case 'layout2x1':
            actions.setLayout?.('2x1');
            break;
          case 'layout3x1':
            actions.setLayout?.('3x1');
            break;
          case 'layout2x2':
            actions.setLayout?.('2x2');
            break;
          case 'toggleDanger':
            actions.toggleDanger?.();
            break;
          case 'cycleFocus':
            actions.cycleFocus?.();
            break;
          case 'openSettings':
            actions.openSettings?.();
            break;
          case 'commandPalette':
            actions.commandPalette?.();
            break;
          case 'toggleSidebar':
            actions.toggleSidebar?.();
            break;
          case 'toggleBrowser':
            actions.toggleBrowser?.();
            break;
          case 'toggleCode':
            actions.toggleCode?.();
            break;
        }

        return; // Only one match per event
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
