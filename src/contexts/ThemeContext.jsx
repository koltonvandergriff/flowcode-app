import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DARK_COLORS, LIGHT_COLORS, DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME } from '../lib/themes';
import { SettingsContext } from './SettingsContext';

export const ThemeContext = createContext({
  theme: DARK_COLORS,
  terminalTheme: DARK_TERMINAL_THEME,
  themeName: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const { settings, updateSetting } = useContext(SettingsContext);
  const [themeName, setThemeName] = useState('dark');

  // Sync from persisted settings once loaded
  useEffect(() => {
    if (settings?.theme && (settings.theme === 'dark' || settings.theme === 'light')) {
      setThemeName(settings.theme);
    }
  }, [settings?.theme]);

  const toggleTheme = useCallback(() => {
    const next = themeName === 'dark' ? 'light' : 'dark';
    setThemeName(next);
    updateSetting('theme', next);
  }, [themeName, updateSetting]);

  const theme = themeName === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const terminalTheme = themeName === 'dark' ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME;

  return (
    <ThemeContext.Provider value={{ theme, terminalTheme, themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
