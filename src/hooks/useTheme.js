import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return {
    colors: ctx.theme,
    terminalTheme: ctx.terminalTheme,
    themeName: ctx.themeName,
    toggleTheme: ctx.toggleTheme,
  };
}
