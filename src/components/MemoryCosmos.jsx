import { useRef, useEffect, useCallback } from 'react';

const DEFAULT_TYPE_COLORS = {
  fact: '#4af0c0',
  decision: '#a78bfa',
  context: '#f59e0b',
  reference: '#34d399',
  note: '#94a3b8',
};

const MAX_LINES = 1500;
const LABEL_ZOOM_THRESHOLD = 1.6;

function hashPosition(str, seed = 0) {
  let h = seed;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function colorForMemory(memory, categoryColors, typeColors) {
  if (memory.categoryId && categoryColors?.has(memory.categoryId)) {
    return categoryColors.get(memory.categoryId);
  }
  const palette = typeColors || DEFAULT_TYPE_COLORS;
  return palette[memory.type] || palette.note;
}

function createStar(memory, index, total, categoryColors, typeColors) {
  const angle = (index / Math.max(1, total)) * Math.PI * 2 + hashPosition(memory.id, 7) * 0.5;
  const radius = 0.32 + hashPosition(memory.id, 11) * 0.06;
  const age = (Date.now() - (memory.updatedAt || memory.createdAt || Date.now())) / (1000 * 60 * 60 * 24);
  const recency = Math.max(0.45, 1 - age / 90);
  return {
    x: 0.5 + Math.cos(angle) * radius,
    y: 0.5 + Math.sin(angle) * radius,
    vx: 0, vy: 0,
    fixed: false, // true while user is dragging this node
    degree: 0,
    baseRadius: 2.6 + recency * 3.4,
    color: colorForMemory(memory, categoryColors, typeColors),
    opacity: 1,
    targetOpacity: 1,
    memory,
  };
}

// ----------------------------------------------------------------------------
// Tag-index based co-occurrence — O(N + Σ|bucket|²), capped to MAX_LINES.
// ----------------------------------------------------------------------------
function findSharedTags(stars) {
  const tagToStars = new Map();
  for (let i = 0; i < stars.length; i++) {
    const tags = stars[i].memory.tags || [];
    for (const t of tags) {
      let bucket = tagToStars.get(t);
      if (!bucket) { bucket = []; tagToStars.set(t, bucket); }
      bucket.push(i);
    }
  }
  const strengths = new Map();
  for (const bucket of tagToStars.values()) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i], b = bucket[j];
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        strengths.set(k, (strengths.get(k) || 0) + 1);
      }
    }
  }
  const lines = [];
  for (const [k, strength] of strengths) {
    const [a, b] = k.split('|').map(Number);
    lines.push({ a, b, strength });
  }
  if (lines.length > MAX_LINES) {
    lines.sort((x, y) => y.strength - x.strength);
    lines.length = MAX_LINES;
  }
  return lines;
}

// ----------------------------------------------------------------------------
// Force constants — both for the warm-up batch (laid out before first paint)
// and the continuous live tick (one iteration per frame).
// ----------------------------------------------------------------------------
const FORCE = {
  REPEL: 0.0009,
  ATTRACT: 0.018,
  IDEAL: 0.06,
  CENTER: 0.0035,
  DAMP: 0.86,
};

const LIVE_FORCE = {
  REPEL: 0.00045,
  ATTRACT: 0.012,
  IDEAL: 0.06,
  CENTER: 0.0018,
  DAMP: 0.78,
};

function tickForce(stars, lines, F) {
  const N = stars.length;
  if (N < 2) return;
  for (let i = 0; i < N; i++) {
    const si = stars[i];
    if (si.fixed) continue;
    for (let j = i + 1; j < N; j++) {
      const sj = stars[j];
      if (sj.fixed && si.fixed) continue;
      let dx = si.x - sj.x;
      let dy = si.y - sj.y;
      const d2 = dx * dx + dy * dy + 0.0001;
      const f = F.REPEL / d2;
      const fx = dx * f, fy = dy * f;
      if (!si.fixed) { si.vx += fx; si.vy += fy; }
      if (!sj.fixed) { sj.vx -= fx; sj.vy -= fy; }
    }
  }
  for (const ln of lines) {
    const a = stars[ln.a], b = stars[ln.b];
    let dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
    const stretch = dist - F.IDEAL;
    const f = F.ATTRACT * Math.log2(1 + ln.strength) * stretch;
    const nx = dx / dist, ny = dy / dist;
    const fx = nx * f, fy = ny * f;
    if (!a.fixed) { a.vx += fx; a.vy += fy; }
    if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
  }
  for (const s of stars) {
    if (s.fixed) { s.vx = 0; s.vy = 0; continue; }
    s.vx += (0.5 - s.x) * F.CENTER;
    s.vy += (0.5 - s.y) * F.CENTER;
    s.vx *= F.DAMP;
    s.vy *= F.DAMP;
    // Cap velocity so a near-zero d2 (two stars at the same point) can't
    // launch a node into NaN territory.
    if (s.vx > 0.05) s.vx = 0.05; else if (s.vx < -0.05) s.vx = -0.05;
    if (s.vy > 0.05) s.vy = 0.05; else if (s.vy < -0.05) s.vy = -0.05;
    s.x += s.vx;
    s.y += s.vy;
    if (!Number.isFinite(s.x)) s.x = 0.5;
    if (!Number.isFinite(s.y)) s.y = 0.5;
  }
}

function layoutForceGraph(stars, lines, iterations = 220) {
  for (let it = 0; it < iterations; it++) tickForce(stars, lines, FORCE);
  for (const s of stars) { s.vx = 0; s.vy = 0; }
}

function buildNeighborMap(lines) {
  const map = new Map();
  for (const ln of lines) {
    let a = map.get(ln.a); if (!a) { a = new Set(); map.set(ln.a, a); }
    let b = map.get(ln.b); if (!b) { b = new Set(); map.set(ln.b, b); }
    a.add(ln.b);
    b.add(ln.a);
  }
  return map;
}

export default function MemoryCosmos({ entries, search, onSelect, onHover, hoveredId, selectedId, categoryColors, typeColors }) {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const linesRef = useRef([]);
  const neighborsRef = useRef(new Map());
  const idIndexRef = useRef(new Map());
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);
  const layoutKeyRef = useRef('');
  const pendingFitRef = useRef(false);
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const dragRef = useRef({
    mode: 'none',           // 'none' | 'pan' | 'node'
    star: null,             // star being dragged when mode === 'node'
    startX: 0, startY: 0,   // mousedown screen px
    originX: 0, originY: 0, // viewport offset (pan) or star world pos (node)
    moved: false,
  });

  // --------------------------------------------------------------------------
  // Build / refresh stars + lines + layout when entries change
  // --------------------------------------------------------------------------
  useEffect(() => {
    const stars = entries.map((m, i) => {
      const existing = starsRef.current.find(s => s.memory.id === m.id);
      if (existing) {
        existing.memory = m;
        // Reflect any new category assignment / color update without rebuilding
        // the star (preserves position so the layout doesn't reseed).
        existing.color = colorForMemory(m, categoryColors, typeColors);
        return existing;
      }
      return createStar(m, i, entries.length, categoryColors, typeColors);
    });
    starsRef.current = stars;

    const lines = findSharedTags(stars);
    linesRef.current = lines;
    neighborsRef.current = buildNeighborMap(lines);

    // Star degrees
    const degrees = new Array(stars.length).fill(0);
    for (const ln of lines) { degrees[ln.a]++; degrees[ln.b]++; }
    for (let i = 0; i < stars.length; i++) stars[i].degree = degrees[i];

    // id → index lookup for hover/click
    const idx = new Map();
    for (let i = 0; i < stars.length; i++) idx.set(stars[i].memory.id, i);
    idIndexRef.current = idx;

    const memberKey = stars.map(s => s.memory.id).sort().join('|');
    if (memberKey !== layoutKeyRef.current) {
      layoutForceGraph(stars, lines);
      layoutKeyRef.current = memberKey;
      // Defer auto-fit until the canvas has been sized. The animation effect
      // runs after this and calls resize(); fitToBounds reads dimensions and
      // applies a fresh viewport transform.
      pendingFitRef.current = true;
    }
  }, [entries, categoryColors, typeColors]);

  const fitToBounds = useCallback(() => {
    const canvas = canvasRef.current;
    const stars = starsRef.current;
    if (!canvas || stars.length < 2) return;
    const cw = canvas.width, ch = canvas.height;
    if (cw <= 0 || ch <= 0) return; // not sized yet — try again later
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of stars) {
      if (s.x < minX) minX = s.x; if (s.y < minY) minY = s.y;
      if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y;
    }
    const spanX = Math.max(0.01, (maxX - minX) * cw);
    const spanY = Math.max(0.01, (maxY - minY) * ch);
    const margin = 80;
    const fitScale = Math.min(
      (cw - margin * 2) / spanX,
      (ch - margin * 2) / spanY,
      2.2
    );
    const scale = Math.max(0.4, fitScale);
    const cx = (minX + maxX) / 2 * cw;
    const cy = (minY + maxY) / 2 * ch;
    viewRef.current = {
      scale,
      offsetX: cw / 2 - cx * scale,
      offsetY: ch / 2 - cy * scale,
    };
    pendingFitRef.current = false;
  }, []);

  // --------------------------------------------------------------------------
  // Hover-aware target opacities
  // --------------------------------------------------------------------------
  useEffect(() => {
    const stars = starsRef.current;
    const idx = idIndexRef.current;
    const neighbors = neighborsRef.current;
    const hoveredIdx = hoveredId ? idx.get(hoveredId) : null;
    const selectedIdx = selectedId ? idx.get(selectedId) : null;
    const focusIdx = hoveredIdx ?? selectedIdx;

    const q = (search || '').toLowerCase();

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const m = s.memory;
      let matchesSearch = true;
      if (q) {
        matchesSearch =
          (m.title || '').toLowerCase().includes(q) ||
          (m.content || '').toLowerCase().includes(q) ||
          (m.tags || []).some(t => t && t.toLowerCase().includes(q));
      }

      let target = matchesSearch ? 1 : 0.08;
      if (focusIdx != null) {
        const isFocus = i === focusIdx;
        const isNeighbor = neighbors.get(focusIdx)?.has(i);
        if (!isFocus && !isNeighbor) target = Math.min(target, 0.18);
      }
      s.targetOpacity = target;
    }
  }, [search, hoveredId, selectedId]);

  // --------------------------------------------------------------------------
  // Hit-test
  // --------------------------------------------------------------------------
  const hitTestStar = useCallback((mx, my) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = canvas.width, h = canvas.height;
    const v = viewRef.current;
    const wx = (mx - v.offsetX) / v.scale;
    const wy = (my - v.offsetY) / v.scale;
    let closest = null;
    let closestDist = 18 / v.scale;
    for (const star of starsRef.current) {
      const dx = wx - star.x * w;
      const dy = wy - star.y * h;
      const d = Math.hypot(dx, dy);
      if (d < closestDist) { closestDist = d; closest = star; }
    }
    return closest;
  }, []);

  // --------------------------------------------------------------------------
  // Pointer events: drag node vs pan canvas, wheel zoom toward cursor
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = () => window.devicePixelRatio || 1;
    const toCanvasPx = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) * dpr(), y: (e.clientY - rect.top) * dpr() };
    };

    const handleMove = (e) => {
      const p = toCanvasPx(e);
      mouseRef.current = p;
      const drag = dragRef.current;
      if (drag.mode === 'node' && drag.star) {
        const v = viewRef.current;
        const w = canvas.width, h = canvas.height;
        const wx = (p.x - v.offsetX) / v.scale;
        const wy = (p.y - v.offsetY) / v.scale;
        drag.star.x = wx / w;
        drag.star.y = wy / h;
        drag.star.vx = 0; drag.star.vy = 0;
        if (Math.abs(p.x - drag.startX) + Math.abs(p.y - drag.startY) > 4) drag.moved = true;
        return;
      }
      if (drag.mode === 'pan') {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        viewRef.current.offsetX = drag.originX + dx;
        viewRef.current.offsetY = drag.originY + dy;
        canvas.style.cursor = 'grabbing';
        return;
      }
      const star = hitTestStar(p.x, p.y);
      onHover?.(star?.memory?.id || null);
      canvas.style.cursor = star ? 'pointer' : 'grab';
    };

    const handleDown = (e) => {
      if (e.button !== 0) return;
      const p = toCanvasPx(e);
      const star = hitTestStar(p.x, p.y);
      if (star) {
        star.fixed = true;
        dragRef.current = {
          mode: 'node', star,
          startX: p.x, startY: p.y,
          originX: star.x, originY: star.y,
          moved: false,
        };
        canvas.style.cursor = 'grabbing';
      } else {
        dragRef.current = {
          mode: 'pan', star: null,
          startX: p.x, startY: p.y,
          originX: viewRef.current.offsetX,
          originY: viewRef.current.offsetY,
          moved: false,
        };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleUp = (e) => {
      const drag = dragRef.current;
      if (drag.mode === 'none') return;
      const wasMoved = drag.moved;
      if (drag.mode === 'node' && drag.star) {
        drag.star.fixed = false;
        if (!wasMoved) onSelect?.(drag.star.memory);
      }
      dragRef.current = { mode: 'none', star: null, startX: 0, startY: 0, originX: 0, originY: 0, moved: false };
      canvas.style.cursor = 'grab';
    };

    const handleLeave = () => {
      const drag = dragRef.current;
      if (drag.mode === 'node' && drag.star) drag.star.fixed = false;
      dragRef.current = { mode: 'none', star: null, startX: 0, startY: 0, originX: 0, originY: 0, moved: false };
      onHover?.(null);
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const p = toCanvasPx(e);
      const v = viewRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextScale = Math.max(0.25, Math.min(8, v.scale * factor));
      const wx = (p.x - v.offsetX) / v.scale;
      const wy = (p.y - v.offsetY) / v.scale;
      v.offsetX = p.x - wx * nextScale;
      v.offsetY = p.y - wy * nextScale;
      v.scale = nextScale;
    };

    const handleDblClick = () => {
      // Re-fit viewport to current bounds.
      const canvas2 = canvasRef.current;
      const stars = starsRef.current;
      if (!canvas2 || stars.length < 2) return;
      const cw = canvas2.width, ch = canvas2.height;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of stars) {
        if (s.x < minX) minX = s.x; if (s.y < minY) minY = s.y;
        if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y;
      }
      const spanX = Math.max(0.01, (maxX - minX) * cw);
      const spanY = Math.max(0.01, (maxY - minY) * ch);
      const margin = 80;
      const fitScale = Math.min(
        (cw - margin * 2) / spanX,
        (ch - margin * 2) / spanY,
        2.2
      );
      const scale = Math.max(0.4, fitScale);
      const cx = (minX + maxX) / 2 * cw;
      const cy = (minY + maxY) / 2 * ch;
      viewRef.current = {
        scale,
        offsetX: cw / 2 - cx * scale,
        offsetY: ch / 2 - cy * scale,
      };
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDblClick);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('dblclick', handleDblClick);
    };
  }, [hitTestStar, onHover, onSelect]);

  // --------------------------------------------------------------------------
  // Animation loop — continuous physics + paint
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (pendingFitRef.current) fitToBounds();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      // First-frame fit fallback in case ResizeObserver hasn't fired yet.
      if (pendingFitRef.current && w > 0 && h > 0) fitToBounds();

      const stars = starsRef.current;
      const lines = linesRef.current;
      const view = viewRef.current;
      // Defensive: never let a corrupt scale value propagate into canvas APIs.
      if (!Number.isFinite(view.scale) || view.scale <= 0) view.scale = 1;
      if (!Number.isFinite(view.offsetX)) view.offsetX = 0;
      if (!Number.isFinite(view.offsetY)) view.offsetY = 0;
      const invScale = 1 / view.scale;

      // Skip physics + paint when the graph is settled, no node is being
      // dragged, and no opacity transition is in flight. At N=400 each tick
      // is ~80k pair-force ops; skipping when idle frees the main thread for
      // input handling.
      const dragMode = dragRef.current?.mode;
      let kinetic = 0;
      let opacityDelta = 0;
      for (const s of stars) {
        kinetic += s.vx * s.vx + s.vy * s.vy;
        const od = s.targetOpacity - s.opacity;
        opacityDelta += od < 0 ? -od : od;
      }
      const ENERGY_GATE = 1e-7 * Math.max(1, stars.length);
      const OPACITY_GATE = 0.005 * Math.max(1, stars.length);
      const settled = dragMode !== 'node' && dragMode !== 'pan'
        && kinetic < ENERGY_GATE
        && opacityDelta < OPACITY_GATE
        && !pendingFitRef.current;

      if (settled) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Live physics tick — keeps the graph alive and reactive to drags.
      tickForce(stars, lines, LIVE_FORCE);

      // Smooth opacity transitions
      for (const s of stars) {
        s.opacity += (s.targetOpacity - s.opacity) * 0.12;
      }

      ctx.save();
      ctx.translate(view.offsetX, view.offsetY);
      ctx.scale(view.scale, view.scale);

      // Edges
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const a = stars[line.a];
        const b = stars[line.b];
        if (!a || !b) continue;
        const ax = a.x * w, ay = a.y * h;
        const bx = b.x * w, by = b.y * h;
        const baseAlpha = Math.min(a.opacity, b.opacity);
        const alpha = baseAlpha * (0.06 + Math.min(line.strength, 4) * 0.04);
        if (alpha < 0.012) continue;
        ctx.strokeStyle = a.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = (0.6 + Math.min(line.strength, 4) * 0.2) * invScale;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes
      for (const star of stars) {
        const sx = star.x * w;
        const sy = star.y * h;
        const alpha = star.opacity;
        if (alpha < 0.04) continue;
        // Skip any node whose math has gone non-finite (early-frame NaN, etc).
        if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;

        const isHovered = star.memory.id === hoveredId;
        const isSelected = star.memory.id === selectedId;
        const degreeBoost = Math.log2(1 + Math.max(0, star.degree | 0)) * 0.7;
        const radiusRaw = (star.baseRadius + degreeBoost) * (isHovered ? 1.55 : isSelected ? 1.35 : 1) * invScale;
        const radius = Number.isFinite(radiusRaw) && radiusRaw > 0 ? Math.min(radiusRaw, 200) : 3;
        const glowR = radius * 2.6;

        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        grad.addColorStop(0, star.color + '55');
        grad.addColorStop(1, star.color + '00');
        ctx.fillStyle = grad;
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight ring on hover/select
        if (isHovered || isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.85;
          ctx.lineWidth = 1.4 * invScale;
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 4 * invScale, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Labels — shown when zoomed in OR for hovered/selected node always.
      const showAllLabels = view.scale >= LABEL_ZOOM_THRESHOLD;
      const fontPx = Math.max(9, 11 * invScale);
      ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const star of stars) {
        const isHovered = star.memory.id === hoveredId;
        const isSelected = star.memory.id === selectedId;
        if (!showAllLabels && !isHovered && !isSelected) continue;
        const alpha = star.opacity;
        if (alpha < 0.15 && !isHovered && !isSelected) continue;

        const sx = star.x * w;
        const sy = star.y * h;
        const degreeBoost = Math.log2(1 + star.degree) * 0.7;
        const radius = (star.baseRadius + degreeBoost) * (isHovered ? 1.55 : isSelected ? 1.35 : 1) * invScale;

        const label = star.memory.title || '';
        // Subtle text shadow for legibility on bright nodes.
        ctx.globalAlpha = alpha * (isHovered || isSelected ? 1 : 0.75);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(label, sx + 0.5 * invScale, sy + radius + 4 * invScale + 0.5 * invScale);
        ctx.fillStyle = isHovered || isSelected ? '#ffffff' : '#c4c9d4';
        ctx.fillText(label, sx, sy + radius + 4 * invScale);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [hoveredId, selectedId, fitToBounds]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
