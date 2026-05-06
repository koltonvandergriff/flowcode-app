import { useCallback, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';

export default function ResizeHandle({ direction = 'vertical', onResize }) {
  const { colors } = useTheme();
  const dragging = useRef(false);
  const startPos = useRef(0);

  const isVertical = direction === 'vertical';

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startPos.current = isVertical ? e.clientX : e.clientY;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isVertical ? 'col-resize' : 'row-resize';

    const handleMove = (me) => {
      if (!dragging.current) return;
      const current = isVertical ? me.clientX : me.clientY;
      const delta = current - startPos.current;
      startPos.current = current;
      onResize?.(delta);
    };

    const handleUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      window.dispatchEvent(new Event('flowcode:relayout'));
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [isVertical, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: isVertical ? 6 : '100%',
        height: isVertical ? '100%' : 6,
        flexShrink: 0,
        cursor: isVertical ? 'col-resize' : 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 3,
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = colors.accent.purple + '40'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: isVertical ? 2 : 20,
        height: isVertical ? 20 : 2,
        borderRadius: 1,
        background: colors.border.subtle,
      }} />
    </div>
  );
}
