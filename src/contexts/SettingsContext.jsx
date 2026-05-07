import { createContext, useCallback, useEffect, useState } from 'react';
import { syncPreferencesDebounced } from '../lib/syncService';

export const SettingsContext = createContext(null);

const api = typeof window !== 'undefined' && window.flowade?.settings;

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    defaultProvider: 'claude',
    defaultCwd: null,
    fontSize: 14,
  });

  useEffect(() => {
    if (!api) return;
    api.getAll().then((s) => { if (s) setSettings((prev) => ({ ...prev, ...s })); });
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      syncPreferencesDebounced(next);
      return next;
    });
    await api?.set(key, value);
  }, []);

  const updateSettings = useCallback(async (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    if (api) {
      for (const [key, value] of Object.entries(updates)) {
        await api.set(key, value);
      }
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
