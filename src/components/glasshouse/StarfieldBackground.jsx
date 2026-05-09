import { useEffect, useRef } from 'react';

// Slow-twinkle starfield used behind the login + wizard hero. Roughly 120
// dim cyan dots whose alpha breathes asynchronously. Pure canvas — no React
// re-renders during the animation loop.
export default function StarfieldBackground({ density = 120, color = '77,230,240' }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: density }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.6 + 0.2,
      s: (Math.random() - 0.5) * 0.05,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      const dpr = window.devicePixelRatio || 1;
      for (const s of stars) {
        s.a += s.s * 0.02;
        if (s.a < 0.1) s.s = Math.abs(s.s);
        if (s.a > 0.9) s.s = -Math.abs(s.s);
        ctx.fillStyle = `rgba(${color}, ${s.a * 0.3})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density, color]);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}
