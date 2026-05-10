// Glasshouse Memory page — direct port of flowADE-mockups/refined-current
// /index.html#memory. Three-column layout: persistent categories tree
// (left), force-graph cosmos (center), selected memory detail (right).
//
// Data flows via the existing window.flowade.memory IPC, so this surface
// reads from the same memoryStore the legacy MemoryPanel uses. Heavy
// actions (categorize, embed backfill, trash, manage categories) stay
// behind the legacy MemoryPanel for now, opened via the ✦ Open editor
// button at top-right.

import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkWikiLinks from '../../lib/remarkWikiLinks';
import MemoryCosmos from '../MemoryCosmos';
import MemoryPanel from '../MemoryPanel';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const TYPE_COLORS = {
  fact:      '#4de6f0',
  decision:  '#a8a4c8',
  context:   '#f59e0b',
  reference: '#88f0d8',
  note:      '#94a3b8',
};
const TYPE_LABEL = {
  fact: 'Fact', decision: 'Decision', context: 'Context',
  reference: 'Reference', note: 'Note',
};

const WIKI_PLUGINS = [remarkGfm, remarkWikiLinks];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function buildCategoryColors(categories) {
  const byId = new Map(categories.map(c => [c.id, c]));
  const rootIdFor = new Map();
  for (const c of categories) {
    let cur = c;
    while (cur.parentId && byId.has(cur.parentId)) cur = byId.get(cur.parentId);
    rootIdFor.set(c.id, cur.id);
  }
  const colors = new Map();
  for (const c of categories) {
    if (c.color && /^#[0-9a-f]{3,8}$/i.test(c.color)) { colors.set(c.id, c.color); continue; }
    const root = byId.get(rootIdFor.get(c.id));
    const seed = root?.name || c.name || c.id;
    const hue = hashHue(seed);
    let depth = 0; let cur = c;
    while (cur.parentId && byId.has(cur.parentId)) { depth++; cur = byId.get(cur.parentId); }
    const light = 65 - Math.min(depth, 3) * 8;
    colors.set(c.id, `hsl(${hue}, 70%, ${light}%)`);
  }
  return colors;
}

export default function MemoryGlasshouse() {
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeCat, setActiveCat] = useState(null); // null = all
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    const list = await window.flowade?.memory?.list?.();
    setEntries(list || []);
    try {
      const cats = await window.flowade?.memory?.categories?.list?.();
      setCategories(cats || []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    window.flowade?.memory?.realtimeOn?.();
    const off = window.flowade?.memory?.onChanged?.(load);
    return () => { off?.(); };
  }, [load]);

  // Debounce search → 150ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  // Title index for wiki-links
  const titleIndex = useMemo(() => {
    const m = new Map();
    for (const e of entries) if (e.title) m.set(e.title.toLowerCase(), e);
    return m;
  }, [entries]);

  // Derived category structures
  const categoryById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const categoryPaths = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      const parts = [c.name];
      let cur = c;
      while (cur.parentId && categoryById.has(cur.parentId)) {
        cur = categoryById.get(cur.parentId);
        parts.unshift(cur.name);
      }
      map.set(c.id, parts.join(' / '));
    }
    return map;
  }, [categories, categoryById]);
  const categoryColors = useMemo(() => buildCategoryColors(categories), [categories]);

  // Build hierarchical tree {parentId: [children]}
  const tree = useMemo(() => {
    const roots = [];
    const childrenOf = new Map();
    for (const c of categories) {
      if (c.parentId && categoryById.has(c.parentId)) {
        const arr = childrenOf.get(c.parentId) || [];
        arr.push(c);
        childrenOf.set(c.parentId, arr);
      } else {
        roots.push(c);
      }
    }
    return { roots, childrenOf };
  }, [categories, categoryById]);

  // Memory counts per category (live + descendants)
  const countByCategory = useMemo(() => {
    const direct = new Map();
    for (const e of entries) {
      if (e.categoryId) direct.set(e.categoryId, (direct.get(e.categoryId) || 0) + 1);
    }
    // Descendant rollup
    const total = new Map(direct);
    function rollup(c) {
      const kids = tree.childrenOf.get(c.id) || [];
      let sum = direct.get(c.id) || 0;
      for (const k of kids) sum += rollup(k);
      total.set(c.id, sum);
      return sum;
    }
    for (const r of tree.roots) rollup(r);
    return total;
  }, [entries, tree]);

  // Filter entries by active category + search
  const filtered = useMemo(() => {
    let xs = entries;
    if (activeCat) {
      const allow = new Set([activeCat]);
      let added = true;
      while (added) {
        added = false;
        for (const c of categories) {
          if (c.parentId && allow.has(c.parentId) && !allow.has(c.id)) { allow.add(c.id); added = true; }
        }
      }
      xs = xs.filter(e => e.categoryId && allow.has(e.categoryId));
    }
    if (debounced) {
      const q = debounced.toLowerCase();
      xs = xs.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.content?.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t && t.toLowerCase().includes(q))
      );
    }
    return xs;
  }, [entries, debounced, activeCat, categories]);

  const selected = useMemo(() => entries.find(e => e.id === selectedId) || null, [entries, selectedId]);
  const handleSelect = useCallback((mem) => setSelectedId(mem?.id || null), []);

  // Backlinks for selected memory
  const backlinks = useMemo(() => {
    if (!selected?.title) return [];
    const re = new RegExp(`\\[\\[\\s*${escapeRegex(selected.title)}\\s*\\]\\]`, 'i');
    return entries.filter(e => e.id !== selected.id && e.content && re.test(e.content));
  }, [entries, selected]);

  const mdComponents = useMemo(() => ({
    a: ({ node, children, ...props }) => {
      const target = props['data-wiki-target'];
      if (target) {
        const found = titleIndex.get(target.toLowerCase());
        return (
          <a href="#"
            onClick={(e) => { e.preventDefault(); if (found) handleSelect(found); }}
            title={found ? `Open: ${found.title}` : `No memory titled "${target}"`}
            style={{
              color: found ? '#4de6f0' : '#6b7280',
              borderBottom: found
                ? '1px dotted rgba(77,230,240,0.4)'
                : '1px dotted rgba(120,120,140,0.35)',
              textDecoration: 'none',
              cursor: found ? 'pointer' : 'help',
              fontStyle: found ? 'normal' : 'italic',
            }}
          >{children}</a>
        );
      }
      return <a {...props}>{children}</a>;
    },
  }), [titleIndex, handleSelect]);

  return (
    <div style={s.root}>
      {/* Page header */}
      <div style={s.head}>
        <div style={s.headLeft}>
          <h1 style={s.h1}>Memory</h1>
          <p style={s.sub}>
            {entries.length} {entries.length === 1 ? 'memory' : 'memories'} ·
            {' '}{categories.length} {categories.length === 1 ? 'category' : 'categories'} ·
            {' '}embedding-search ready
          </p>
        </div>
        <div style={s.headRight}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories…"
            style={s.searchInput}
          />
          <button onClick={() => setEditorOpen(true)} style={s.editorBtn} title="Open the legacy editor (categorize, embed, trash, + New)">
            ✦ Open editor
          </button>
        </div>
      </div>

      {/* Three-column body */}
      <div style={s.shell}>
        {/* Left: categories tree */}
        <aside style={s.catCol}>
          <div style={s.catHead}>Categories</div>
          <CatRow
            label="All" count={entries.length} swatch="#4de6f0"
            active={!activeCat} onClick={() => setActiveCat(null)}
          />
          {tree.roots.map(root => (
            <CatBranch key={root.id}
              cat={root}
              tree={tree}
              activeCat={activeCat}
              setActiveCat={setActiveCat}
              colors={categoryColors}
              counts={countByCategory}
            />
          ))}
        </aside>

        {/* Center: cosmos */}
        <section style={s.cosmosCol}>
          <div style={s.cosmosBody}>
            <MemoryCosmos
              entries={filtered}
              search={debounced}
              onSelect={handleSelect}
              onHover={setHoveredId}
              hoveredId={hoveredId}
              selectedId={selectedId}
              categoryColors={categoryColors}
            />
            <div style={s.toolbar}>
              <span style={s.pillCy}>
                <span style={s.dot} /> Live
              </span>
              <span style={s.pill}>{filtered.length} nodes</span>
              {activeCat && (
                <span style={s.pill}>
                  in <em style={{ color: '#4de6f0', fontStyle: 'normal' }}>{categoryPaths.get(activeCat) || 'category'}</em>
                </span>
              )}
            </div>
            <div style={s.legend}>
              {Object.entries(TYPE_COLORS).map(([k, c]) => (
                <span key={k} style={s.legItem}>
                  <span style={{ ...s.legDot, background: c }} />
                  {TYPE_LABEL[k]}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Right: detail */}
        <aside style={s.detailCol}>
          {!selected ? (
            <div style={s.detailEmpty}>
              <div style={s.detailEmptyMark}>✦</div>
              <div style={s.detailEmptyTitle}>Pick a memory</div>
              <div style={s.detailEmptyBody}>
                Click a node in the cosmos or search above. Selected memory shows here with its tags, content, and backlinks.
              </div>
            </div>
          ) : (
            <DetailContent
              selected={selected}
              backlinks={backlinks}
              mdComponents={mdComponents}
              onClose={() => setSelectedId(null)}
              onJump={handleSelect}
              categoryPaths={categoryPaths}
            />
          )}
        </aside>
      </div>

      {/* Heavy editor — full MemoryPanel as overlay for power-user flows */}
      <MemoryPanel
        open={editorOpen}
        embedded={false}
        onToggle={() => { setEditorOpen(false); load(); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
function CatRow({ label, count, swatch, active, onClick, depth = 0, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...s.catRow,
        ...(active ? s.catRowActive : null),
        ...(depth ? { paddingLeft: 10 + depth * 12 } : null),
      }}
    >
      <span style={{ ...s.swatch, background: color || swatch || '#94a3b8' }} />
      <span style={s.catLabel}>{label}</span>
      <span style={s.catCount}>{count ?? ''}</span>
    </button>
  );
}

function CatBranch({ cat, tree, activeCat, setActiveCat, colors, counts, depth = 0 }) {
  const kids = tree.childrenOf.get(cat.id) || [];
  return (
    <>
      <CatRow
        label={cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}
        count={counts.get(cat.id) || 0}
        color={colors.get(cat.id)}
        active={activeCat === cat.id}
        onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
        depth={depth}
      />
      {kids.map(k => (
        <CatBranch key={k.id} cat={k} tree={tree} activeCat={activeCat} setActiveCat={setActiveCat} colors={colors} counts={counts} depth={depth + 1} />
      ))}
    </>
  );
}

function DetailContent({ selected, backlinks, mdComponents, onClose, onJump, categoryPaths }) {
  const typeColor = TYPE_COLORS[selected.type] || TYPE_COLORS.note;
  const path = selected.categoryId ? categoryPaths.get(selected.categoryId) : null;
  return (
    <div style={s.detail}>
      {path && <div style={s.detailCrumb}>{path.toUpperCase()}</div>}
      <div style={s.detailHeadRow}>
        <h2 style={{ ...s.detailH, color: typeColor }}>{selected.title}</h2>
        <button onClick={onClose} style={s.detailX}>✕</button>
      </div>
      <div style={s.chips}>
        <span style={{ ...s.chip, color: typeColor, background: typeColor + '15', borderColor: typeColor + '30' }}>
          {TYPE_LABEL[selected.type] || 'note'}
        </span>
        {(selected.tags || []).filter(Boolean).map(tag => (
          <span key={tag} style={s.tagChip}>{tag}</span>
        ))}
      </div>
      <div style={s.detailBody}>
        <ReactMarkdown remarkPlugins={WIKI_PLUGINS} components={mdComponents}>
          {selected.content || ''}
        </ReactMarkdown>
      </div>
      {backlinks.length > 0 && (
        <div style={s.linksBlock}>
          <div style={s.linksHead}>Linked from <span style={{ color: '#4de6f0', marginLeft: 4 }}>{backlinks.length}</span></div>
          {backlinks.map(b => (
            <button key={b.id} onClick={() => onJump(b)} style={s.linkRow}>
              <span style={{ ...s.swatch, background: TYPE_COLORS[b.type] || '#94a3b8' }} />
              <span style={s.linkRowLabel}>{b.title}</span>
            </button>
          ))}
        </div>
      )}
      {selected.createdAt && (
        <div style={s.detailFoot}>
          Created {new Date(selected.createdAt).toLocaleDateString()}
          {selected.updatedAt && selected.updatedAt !== selected.createdAt && (
            <> · Updated {new Date(selected.updatedAt).toLocaleDateString()}</>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    flex: 1, padding: '24px 24px 18px',
    display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0,
    color: '#f1f5f9',
    fontFamily: FONT_MONO,
  },
  head: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 14, marginBottom: 16,
  },
  headLeft: { minWidth: 0 },
  h1: { fontFamily: FONT_DISP, fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', margin: '0 0 4px' },
  sub: { fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: FONT_MONO },

  headRight: { display: 'flex', alignItems: 'center', gap: 10 },
  searchInput: {
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 8, padding: '7px 12px',
    color: '#f1f5f9', fontFamily: FONT_MONO, fontSize: 12,
    outline: 'none', width: 260,
  },
  editorBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid rgba(77,230,240,0.35)',
    background: 'rgba(77,230,240,0.06)', color: '#4de6f0',
    fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
  },

  shell: {
    flex: 1, minHeight: 0, display: 'grid',
    gridTemplateColumns: '260px 1fr 320px', gap: 12,
  },

  catCol: {
    background: 'rgba(8, 8, 18, 0.55)',
    border: '1px solid rgba(77,230,240,0.06)',
    borderRadius: 14, padding: 10,
    backdropFilter: 'blur(14px)',
    overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 1,
  },
  catHead: {
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 600,
    letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0', opacity: 0.65,
    padding: '8px 10px 8px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: 6,
  },
  catRow: {
    all: 'unset', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 6,
    fontSize: 12, color: '#c4c9d4', fontFamily: FONT_MONO,
    transition: 'background 0.15s, color 0.15s',
  },
  catRowActive: {
    background: 'rgba(77,230,240,0.08)',
    color: '#4de6f0',
    boxShadow: 'inset 2px 0 0 #4de6f0',
  },
  swatch: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  catLabel: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  catCount: { fontSize: 10, color: '#4a5168', fontFamily: FONT_MONO },

  cosmosCol: {
    minWidth: 0, minHeight: 0,
    background: 'rgba(8, 8, 18, 0.55)',
    border: '1px solid rgba(77,230,240,0.07)',
    borderRadius: 14,
    backdropFilter: 'blur(14px) saturate(1.15)',
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  cosmosBody: { flex: 1, position: 'relative', minHeight: 0, minWidth: 0 },
  toolbar: {
    position: 'absolute', top: 12, left: 12,
    display: 'flex', gap: 6,
  },
  pill: {
    fontFamily: FONT_MONO, fontSize: 10,
    padding: '3px 8px', borderRadius: 99,
    background: 'rgba(8,8,18,0.7)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8',
  },
  pillCy: {
    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
    padding: '3px 8px', borderRadius: 99,
    background: 'rgba(77,230,240,0.1)', color: '#4de6f0',
    border: '1px solid rgba(77,230,240,0.3)',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    letterSpacing: '0.04em',
  },
  dot: { width: 5, height: 5, borderRadius: '50%', background: '#4de6f0', boxShadow: '0 0 6px #4de6f0' },
  legend: {
    position: 'absolute', bottom: 12, left: 12,
    display: 'flex', gap: 12,
    background: 'rgba(8,8,18,0.7)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
    padding: '6px 10px',
  },
  legItem: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 9, color: '#94a3b8', fontFamily: FONT_MONO,
  },
  legDot: { width: 6, height: 6, borderRadius: '50%' },

  detailCol: {
    background: 'rgba(8, 8, 18, 0.55)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, backdropFilter: 'blur(14px)',
    overflow: 'hidden', minHeight: 0,
    display: 'flex', flexDirection: 'column',
  },
  detailEmpty: {
    flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center',
    padding: 24,
  },
  detailEmptyMark: {
    fontSize: 28, color: '#4de6f0', opacity: 0.5,
    marginBottom: 12,
  },
  detailEmptyTitle: { fontFamily: FONT_DISP, fontWeight: 700, fontSize: 14, marginBottom: 6 },
  detailEmptyBody: {
    fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55,
    fontFamily: FONT_MONO, maxWidth: 240,
  },

  detail: { padding: 18, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' },
  detailCrumb: {
    fontFamily: FONT_MONO, fontSize: 9, color: '#4a5168',
    letterSpacing: '0.18em', marginBottom: 8,
  },
  detailHeadRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
    marginBottom: 10,
  },
  detailH: {
    fontFamily: FONT_DISP, fontWeight: 800, fontSize: 18,
    letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2,
  },
  detailX: {
    all: 'unset', cursor: 'pointer',
    width: 22, height: 22, borderRadius: 4,
    display: 'grid', placeItems: 'center',
    color: '#4a5168', fontSize: 11,
    background: 'rgba(255,255,255,0.03)',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 },
  chip: {
    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
    padding: '3px 8px', borderRadius: 4,
    border: '1px solid', letterSpacing: '0.04em',
  },
  tagChip: {
    fontFamily: FONT_MONO, fontSize: 10,
    padding: '3px 8px', borderRadius: 4,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
  },
  detailBody: {
    fontSize: 12.5, color: '#c4c9d4', lineHeight: 1.7,
    fontFamily: FONT_MONO, wordBreak: 'break-word',
  },
  linksBlock: {
    marginTop: 18, paddingTop: 14,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  linksHead: {
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: '#4a5168', marginBottom: 8,
  },
  linkRow: {
    all: 'unset', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', borderRadius: 6,
    background: 'rgba(255,255,255,0.03)',
    fontFamily: FONT_MONO, fontSize: 11.5, color: '#c4c9d4',
    marginBottom: 4,
  },
  linkRowLabel: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  detailFoot: {
    marginTop: 18, fontSize: 10, color: '#4a5168', fontFamily: FONT_MONO,
  },
};
