import { createContext, useCallback, useState } from 'react';
import { FONTS, COLORS } from '../lib/constants';

export const ToastContext = createContext({ addToast: () => {} });

const TYPE_COLORS = {
  info: COLORS.accent.purple,
  success: COLORS.accent.green,
  warning: COLORS.status.warning,
  error: COLORS.status.error,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 60, right: 24, display: 'flex',
        flexDirection: 'column', gap: 6, zIndex: 999, pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const color = TYPE_COLORS[t.type] || TYPE_COLORS.info;
          return (
            <div key={t.id} style={{
              padding: '10px 18px', borderRadius: 10, fontFamily: FONTS.mono, fontSize: 12,
              background: COLORS.bg.raised, border: `1px solid ${color}40`,
              color, boxShadow: `0 4px 20px ${color}20`,
              animation: 'fadeSlideIn .3s ease',
            }}>{t.msg}</div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
