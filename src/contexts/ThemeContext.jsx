import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DARK_COLORS, LIGHT_COLORS, PALETTES, PALETTE_TERMINALS, LIGHT_TERMINAL_THEME } from '../lib/themes';
import { SettingsContext } from './SettingsContext';

export const ThemeContext = createContext({
  theme: DARK_COLORS,
  terminalTheme: PALETTE_TERMINALS.flowcode,
  themeName: 'dark',
  paletteName: 'flowcode',
  toggleTheme: () => {},
  setPalette: () => {},
});

export function ThemeProvider({ children }) {
  const { settings, updateSetting } = useContext(SettingsContext);
  const [themeName, setThemeName] = useState('dark');
  const [paletteName, setPaletteName] = useState('flowcode');

  useEffect(() => {
    if (settings?.theme && (settings.theme === 'dark' || settings.theme === 'light')) {
      setThemeName(settings.theme);
    }
    if (settings?.palette && PALETTES[settings.palette]) {
      setPaletteName(settings.palette);
    }
  }, [settings?.theme, settings?.palette]);

  const toggleTheme = useCallback(() => {
    const next = themeName === 'dark' ? 'light' : 'dark';
    setThemeName(next);
    updateSetting('theme', next);
  }, [themeName, updateSetting]);

  const changePalette = useCallback((name) => {
    if (PALETTES[name]) {
      setPaletteName(name);
      updateSetting('palette', name);
    }
  }, [updateSetting]);

  const darkPalette = PALETTES[paletteName] || DARK_COLORS;
  const theme = themeName === 'dark' ? darkPalette : {
    ...LIGHT_COLORS,
    accent: darkPalette.accent,
    gradient: { ...LIGHT_COLORS.gradient, primary: darkPalette.gradient.primary },
    border: { ...LIGHT_COLORS.border, active: darkPalette.accent.primary, focus: darkPalette.accent.primary + '40' },
  };
  const terminalTheme = themeName === 'dark' ? (PALETTE_TERMINALS[paletteName] || PALETTE_TERMINALS.flowcode) : LIGHT_TERMINAL_THEME;

  return (
    <ThemeContext.Provider value={{ theme, terminalTheme, themeName, paletteName, toggleTheme, setPalette: changePalette }}>
      {children}
    </ThemeContext.Provider>
  );
}
