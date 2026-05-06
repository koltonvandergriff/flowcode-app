import { useState, useEffect, useCallback } from 'react';

const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 900;

export function useResponsiveScale() {
  const calculate = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scaleX = w / DESIGN_WIDTH;
    const scaleY = h / DESIGN_HEIGHT;
    return Math.min(scaleX, scaleY, 1.2);
  }, []);

  const [scale, setScale] = useState(calculate);

  useEffect(() => {
    const onResize = () => setScale(calculate());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [calculate]);

  return scale;
}

export { DESIGN_WIDTH, DESIGN_HEIGHT };
