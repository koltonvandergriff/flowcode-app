import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FONTS } from '../lib/constants';
import remarkWikiLinks from '../lib/remarkWikiLinks';
import MemoryCosmos from './MemoryCosmos';

const WIKI_PLUGINS = [remarkGfm, remarkWikiLinks];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Stable hue for any string. Used to assign distinct colors to categories that
// don't carry an explicit color from the AI run.
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

// Build per-category color map. Children inherit their root's hue so a project
// reads as one color family in the cosmos. Returns Map<categoryId, hexColor>.
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
    if (c.color && /^#[0-9a-f]{3,8}$/i.test(c.color)) {
      colors.set(c.id, c.color);
      continue;
    }
    const root = byId.get(rootIdFor.get(c.id));
    const seed = (root?.name || c.name || c.id);
    const hue = hashHue(seed);
    // depth-based lightness so children of same root sit near each other
    let depth = 0;
    let cur = c;
    while (cur.parentId && byId.has(cur.parentId)) { depth++; cur = byId.get(cur.parentId); }
    const light = 65 - Math.min(depth, 3) * 8;
    colors.set(c.id, `hsl(${hue}, 70%, ${light}%)`);
  }
  return colors;
}

const fc = FONTS.mono;
const fb = FONTS.body;

const TYPES = [
  { id: 'fact', label: 'Fact', icon: '📌', color: '#4af0c0' },
  { id: 'decision', label: 'Decision', icon: '⚖️', color: '#a78bfa' },
  { id: 'context', label: 'Context', icon: '📎', color: '#f59e0b' },
  { id: 'reference', label: 'Reference', icon: '🔗', color: '#34d399' },
  { id: 'note', label: 'Note', icon: '📝', color: '#94a3b8' },
];

export default function MemoryPanel({ open, onToggle, embedded = false }) {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);
  const [selected, setSelected] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'note', tags: '' });
  const [opacity, setOpacity] = useState(0);
  const [status, setStatus] = useState({ state: 'idle', pending: 0, failed: 0, total: 0, tier: 'starter', cloudEnabled: false, count: 0, limit: 50 });
  const [syncing, setSyncing] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashEntries, setTrashEntries] = useState([]);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizeMsg, setCategorizeMsg] = useState('');
  const [categorizeError, setCategorizeError] = useState('');
  const [categories, setCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const overlayRef = useRef(null);
  const overlayMouseDownRef = useRef(false);

  const load = useCallback(async () => {
    const data = await window.flowade?.memory.list();
    setEntries(data || []);
    try {
      const cats = await window.flowade?.memory.categories?.list();
      setCategories(cats || []);
    } catch { /* tier may not allow */ }
  }, []);

  useEffect(() => {
    if (!open) {
      setOpacity(0);
      setSelected(null);
      setCreating(false);
      setEditingId(null);
      window.flowade?.memory.realtimeOff?.();
      return;
    }
    load();
    requestAnimationFrame(() => setOpacity(1));
    window.flowade?.memory.realtimeOn?.();
    window.flowade?.memory.getStatus?.().then((s) => { if (s) setStatus(s); });

    const offChanged = window.flowade?.memory.onChanged?.(load);
    const offStatus = window.flowade?.memory.onStatus?.(setStatus);
    return () => {
      offChanged?.();
      offStatus?.();
    };
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else if (creating || editingId) { setCreating(false); setEditingId(null); }
        else onToggle();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, selected, creating, editingId, onToggle]);

  // Cosmos input: only filter by type (changes member set rarely). Search dim
  // is applied inside MemoryCosmos via opacity, not by removing entries — this
  // avoids rerunning the 220-iter force layout on every keystroke.
  const cosmosEntries = useMemo(
    () => (filterType ? entries.filter(e => e.type === filterType) : entries),
    [entries, filterType]
  );

  const filtered = entries.filter(e => {
    if (filterType && e.type !== filterType) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return e.title?.toLowerCase().includes(q) || e.content?.toLowerCase().includes(q) || e.tags?.some(t => t && t.toLowerCase().includes(q));
    }
    return true;
  });

  const titleIndex = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (e.title) map.set(e.title.toLowerCase(), e);
    }
    return map;
  }, [entries]);

  const categoryColors = useMemo(() => buildCategoryColors(categories), [categories]);
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
  const leafCategories = useMemo(() => {
    const childCount = new Map();
    for (const c of categories) {
      if (c.parentId) childCount.set(c.parentId, (childCount.get(c.parentId) || 0) + 1);
    }
    return categories
      .filter(c => !childCount.has(c.id))
      .sort((a, b) => (categoryPaths.get(a.id) || '').localeCompare(categoryPaths.get(b.id) || ''));
  }, [categories, categoryPaths]);

  const backlinks = useMemo(() => {
    if (!selected?.title) return [];
    const re = new RegExp(`\\[\\[\\s*${escapeRegex(selected.title)}\\s*\\]\\]`, 'i');
    return entries.filter(e => e.id !== selected.id && e.content && re.test(e.content));
  }, [entries, selected]);


  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await window.flowade?.memory.create({
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setForm({ title: '', content: '', type: 'note', tags: '' });
    setCreating(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editingId || !form.title.trim()) return;
    await window.flowade?.memory.update(editingId, {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditingId(null);
    setForm({ title: '', content: '', type: 'note', tags: '' });
    setSelected(null);
    load();
  };

  const handleDelete = async (id) => {
    await window.flowade?.memory.delete(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setForm({ title: e.title, content: e.content, type: e.type, tags: (e.tags || []).join(', ') });
    setCreating(false);
  };

  const handleSelect = useCallback((memory) => {
    setSelected(memory);
    setEditingId(null);
    setCreating(false);
  }, []);

  const mdComponents = useMemo(() => ({
    a: ({ node, children, ...props }) => {
      const target = props['data-wiki-target'];
      if (target) {
        const found = titleIndex.get(target.toLowerCase());
        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (found) handleSelect(found);
            }}
            title={found ? `Open: ${found.title}` : `No memory titled "${target}"`}
            style={{
              color: found ? '#4af0c0' : '#6b7280',
              borderBottom: found
                ? '1px dotted rgba(74,240,192,0.4)'
                : '1px dotted rgba(120,120,140,0.35)',
              textDecoration: 'none',
              cursor: found ? 'pointer' : 'help',
              fontStyle: found ? 'normal' : 'italic',
            }}
          >
            {children}
          </a>
        );
      }
      return <a {...props}>{children}</a>;
    },
  }), [titleIndex, handleSelect]);

  const typeInfo = (type) => TYPES.find(t => t.id === type) || TYPES[4];

  if (!open) return null;

  const wrapperStyle = embedded
    ? {
        // Inline rendering — fills the parent flex slot, no backdrop, no
        // close-on-outside-click. Used when the panel is mounted as a main
        // view via the glasshouse sidebar.
        flex: 1, minWidth: 0, minHeight: 0,
        display: 'flex', alignItems: 'stretch', justifyContent: 'stretch',
        padding: '0 6px 6px', opacity: 1,
      }
    : {
        // Default: full-screen modal overlay.
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(2, 2, 8, 0.32)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity, transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      };

  const cardStyle = embedded
    ? {
        // Embedded: fill the page wrapper's frame. Drop the visible border
        // and rounded corners since the wrapper provides chrome already.
        flex: 1, width: '100%', height: '100%',
        background: 'transparent',
        border: 'none',
      }
    : {
        width: '72vw', height: '78vh', maxWidth: 1400, maxHeight: 1000,
        background: 'rgba(8, 8, 18, 0.55)',
        border: '1px solid rgba(255,255,255,0.08)',
      };

  return (
    <div
      ref={overlayRef}
      onMouseDown={embedded ? undefined : (e) => { overlayMouseDownRef.current = e.target === overlayRef.current; }}
      onClick={embedded ? undefined : (e) => {
        const downOnOverlay = overlayMouseDownRef.current;
        overlayMouseDownRef.current = false;
        if (downOnOverlay && e.target === overlayRef.current) onToggle();
      }}
      style={wrapperStyle}
    >
      <div style={{
        ...cardStyle,
        ...(embedded ? null : {
          borderRadius: 16,
          backdropFilter: 'blur(14px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(74,240,192,0.04)',
        }),
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: embedded ? '10px 16px' : '14px 24px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Embedded mode: the page-level header already shows the title.
              Hide the local title to keep the inner panel clean per the
              mockup's 3-column layout. Keep the count + sync pills since
              they're functional status indicators. */}
          {!embedded && (
            <>
              <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(74,240,192,0.4))' }}>🧠</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', fontFamily: fb, letterSpacing: 0.5 }}>Memory</span>
            </>
          )}
          <CountPill count={status.count ?? entries.length} limit={status.limit} tier={status.tier} />
          <SyncBadge
            status={status}
            syncing={syncing}
            onSync={async () => {
              if (syncing) return;
              setSyncing(true);
              try {
                const next = await window.flowade?.memory.syncNow?.();
                if (next) setStatus(next);
                await load();
              } finally { setSyncing(false); }
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '6px 12px 6px 30px',
                color: '#c4c9d4', fontSize: 12, fontFamily: fc,
                outline: 'none', width: 220,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(74,240,192,0.3)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          {/* Type filters */}
          <div style={{ display: 'flex', gap: 4 }}>
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setFilterType(filterType === t.id ? null : t.id)}
                title={t.label}
                style={{
                  all: 'unset', cursor: 'pointer', width: 24, height: 24, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, transition: 'all 0.15s',
                  background: filterType === t.id ? t.color + '20' : 'transparent',
                  boxShadow: filterType === t.id ? `0 0 8px ${t.color}30` : 'none',
                }}>{t.icon}</button>
            ))}
          </div>

          {/* Trash (Recently deleted) */}
          {status.cloudEnabled && (
            <button
              onClick={async () => {
                const next = !showTrash;
                setShowTrash(next);
                if (next) {
                  const data = await window.flowade?.memory.listDeleted?.();
                  setTrashEntries(data || []);
                }
              }}
              title="Recently deleted (recoverable for 72h)"
              style={{
                all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: showTrash ? '#f87171' : '#666', fontSize: 13, transition: 'all 0.15s',
                background: showTrash ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)',
              }}
            >🗑</button>
          )}

          {/* Category manager */}
          {status.cloudEnabled && categories.length > 0 && (
            <button
              onClick={() => setShowCategoryManager(v => !v)}
              title="Manage categories — rename, delete, view memory counts"
              style={{
                all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: showCategoryManager ? '#4af0c0' : '#94a3b8', fontSize: 13,
                transition: 'all 0.15s',
                background: showCategoryManager ? 'rgba(74,240,192,0.12)' : 'rgba(255,255,255,0.03)',
              }}
            >📁</button>
          )}

          {/* Backfill embeddings */}
          {status.cloudEnabled && (
            <button
              onClick={async () => {
                if (categorizing) return;
                setCategorizing(true);
                setCategorizeError('');
                setCategorizeMsg('Starting embeddings…');
                const off = window.flowade?.memory.embeddings?.onProgress?.((m) => {
                  setCategorizeMsg(m?.message || '');
                });
                try {
                  const res = await window.flowade?.memory.embeddings?.backfill();
                  setCategorizeMsg(res?.total === 0
                    ? 'All memories already have embeddings.'
                    : `Embedded ${res?.updated ?? 0}/${res?.total ?? 0} memories.`);
                  setTimeout(() => { setCategorizing(false); setCategorizeMsg(''); }, 2400);
                } catch (err) {
                  setCategorizeError(err?.message || String(err));
                  setCategorizing(false);
                  setTimeout(() => setCategorizeError(''), 5000);
                } finally {
                  off?.();
                }
              }}
              disabled={categorizing}
              title="Embed memories with OpenAI text-embedding-3-small (your API key) for semantic search"
              style={{
                all: 'unset', cursor: categorizing ? 'wait' : 'pointer',
                width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#34d399', fontSize: 13, transition: 'all 0.15s',
                background: 'rgba(52,211,153,0.1)',
                opacity: categorizing ? 0.5 : 1,
              }}
            >🧬</button>
          )}

          {/* AI Categorize */}
          {status.cloudEnabled && (
            <button
              onClick={async () => {
                if (categorizing) return;
                setCategorizing(true);
                setCategorizeError('');
                setCategorizeMsg('Starting…');
                const off = window.flowade?.memory.categories?.onProgress?.((m) => {
                  setCategorizeMsg(m?.message || '');
                });
                try {
                  const res = await window.flowade?.memory.categories?.aiCategorize({ model: 'haiku' });
                  setCategorizeMsg(`Done · ${res?.categoriesCreated ?? 0} categories, ${res?.assignmentsMade ?? 0} memories`);
                  await window.flowade?.memory.syncNow?.();
                  await load();
                  setTimeout(() => { setCategorizing(false); setCategorizeMsg(''); }, 2200);
                } catch (err) {
                  setCategorizeError(err?.message || String(err));
                  setCategorizing(false);
                  setTimeout(() => setCategorizeError(''), 5000);
                } finally {
                  off?.();
                }
              }}
              disabled={categorizing}
              title="Use Claude (your API key) to organize memories into categories"
              style={{
                all: 'unset', cursor: categorizing ? 'wait' : 'pointer',
                width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: categorizing ? '#fbbf24' : '#a78bfa', fontSize: 13,
                transition: 'all 0.15s',
                background: categorizing ? 'rgba(251,191,36,0.12)' : 'rgba(167,139,250,0.1)',
                opacity: categorizing ? 0.85 : 1,
              }}
            >{categorizing ? '⏳' : '✨'}</button>
          )}

          {/* Add button */}
          <button onClick={() => { setCreating(true); setEditingId(null); setSelected(null); setForm({ title: '', content: '', type: 'note', tags: '' }); }}
            style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              fontFamily: fc, color: '#0a0a14', background: '#4af0c0',
              boxShadow: '0 0 12px rgba(74,240,192,0.3)',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >+ New</button>

          {/* Close — hidden in embedded mode since the panel is the
              main view, not a modal. */}
          {!embedded && (
            <button onClick={onToggle} style={{
              all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#555', fontSize: 14, transition: 'all 0.15s',
              background: 'rgba(255,255,255,0.03)',
            }}
              onMouseEnter={(e) => { e.target.style.color = '#e2e8f0'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.target.style.color = '#555'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Create / Edit Form */}
      {(creating || editingId) && (
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, maxWidth: 600 }}>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Memory title..." autoFocus
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '8px 12px', color: '#e2e8f0',
                fontSize: 13, fontFamily: fc, outline: 'none',
              }} />
            <textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Content..." rows={3}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '8px 12px', color: '#c4c9d4',
                fontSize: 12, fontFamily: fc, outline: 'none', resize: 'vertical',
              }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, padding: '4px 8px', color: '#c4c9d4',
                  fontSize: 11, fontFamily: fc, outline: 'none',
                }}>
                {TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
              <input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tags (comma separated)"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, padding: '4px 8px', color: '#c4c9d4',
                  fontSize: 11, fontFamily: fc, outline: 'none',
                }} />
              <button onClick={editingId ? handleUpdate : handleCreate} style={{
                all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '5px 14px',
                borderRadius: 5, background: '#4af0c0', color: '#0a0a14', fontFamily: fc,
              }}>{editingId ? 'Update' : 'Save'}</button>
              <button onClick={() => { setCreating(false); setEditingId(null); }} style={{
                all: 'unset', cursor: 'pointer', fontSize: 11, color: '#666', fontFamily: fc,
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Recently deleted overlay */}
      {showTrash && (
        <TrashList
          entries={trashEntries}
          onRestore={async (id) => {
            await window.flowade?.memory.restore?.(id);
            const data = await window.flowade?.memory.listDeleted?.();
            setTrashEntries(data || []);
            await load();
          }}
          onClose={() => setShowTrash(false)}
        />
      )}

      {/* Category manager overlay */}
      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          paths={categoryPaths}
          colors={categoryColors}
          entries={entries}
          onRename={async (id, name) => {
            await window.flowade?.memory.categories?.update(id, { name });
            await load();
          }}
          onDelete={async (id) => {
            await window.flowade?.memory.categories?.delete(id);
            await window.flowade?.memory.syncNow?.();
            await load();
          }}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {/* Cosmos canvas */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MemoryCosmos
          entries={cosmosEntries}
          search={debouncedSearch}
          onSelect={handleSelect}
          onHover={setHoveredId}
          hoveredId={hoveredId}
          selectedId={selected?.id}
          categoryColors={categoryColors}
        />

        {/* Hover tooltip */}
        {hoveredId && !selected && (() => {
          const mem = entries.find(e => e.id === hoveredId);
          if (!mem) return null;
          const ti = typeInfo(mem.type);
          return (
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10, 10, 20, 0.9)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 16px', pointerEvents: 'none',
              backdropFilter: 'blur(12px)', maxWidth: 400, minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{ti.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: ti.color, fontFamily: fc }}>{mem.title}</span>
              </div>
              {mem.content && (
                <div style={{
                  fontSize: 11, color: '#8888aa', fontFamily: fc, lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {mem.content}
                </div>
              )}
              {mem.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {mem.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 3, fontFamily: fc,
                      background: 'rgba(74,240,192,0.08)', color: '#4af0c0',
                    }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Selected detail panel - slides in from right */}
        {selected && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 380,
            background: 'rgba(6, 6, 14, 0.92)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            animation: 'memSlideIn 0.25s ease-out',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16 }}>{typeInfo(selected.type).icon}</span>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: typeInfo(selected.type).color, fontFamily: fc,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {selected.title}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => startEdit(selected)} style={{
                  all: 'unset', cursor: 'pointer', fontSize: 10, color: '#a78bfa', fontFamily: fc, padding: '3px 8px',
                  borderRadius: 4, background: 'rgba(167,139,250,0.1)',
                }}>Edit</button>
                <button onClick={() => handleDelete(selected.id)} style={{
                  all: 'unset', cursor: 'pointer', fontSize: 10, color: '#f87171', fontFamily: fc, padding: '3px 8px',
                  borderRadius: 4, background: 'rgba(248,113,113,0.1)',
                }}>Delete</button>
                <button onClick={() => setSelected(null)} style={{
                  all: 'unset', cursor: 'pointer', fontSize: 12, color: '#555', padding: '2px 6px',
                }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{
                  fontSize: 10, padding: '3px 10px', borderRadius: 4, display: 'inline-block',
                  background: typeInfo(selected.type).color + '15',
                  color: typeInfo(selected.type).color,
                  fontFamily: fc, fontWeight: 600,
                }}>
                  {typeInfo(selected.type).label}
                </div>
                {leafCategories.length > 0 && (
                  <CategoryPicker
                    leaves={leafCategories}
                    paths={categoryPaths}
                    colors={categoryColors}
                    currentId={selected.categoryId || null}
                    onAssign={async (catId) => {
                      await window.flowade?.memory.categories?.assign(selected.id, catId);
                      // Update local immediately for responsive feedback; cloud
                      // pull will reconcile.
                      setSelected(s => s ? { ...s, categoryId: catId } : s);
                      setEntries(es => es.map(e => e.id === selected.id ? { ...e, categoryId: catId } : e));
                      await window.flowade?.memory.syncNow?.();
                      await load();
                    }}
                  />
                )}
              </div>
              <div className="memory-md" style={{
                fontSize: 13, color: '#c4c9d4', fontFamily: fc, lineHeight: 1.7,
                wordBreak: 'break-word',
              }}>
                <ReactMarkdown remarkPlugins={WIKI_PLUGINS} components={mdComponents}>
                  {selected.content || ''}
                </ReactMarkdown>
              </div>
              {selected.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 5, marginTop: 14, flexWrap: 'wrap' }}>
                  {selected.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 10, padding: '3px 9px', borderRadius: 5, fontFamily: fc,
                      background: 'rgba(74,240,192,0.08)', color: '#4af0c0',
                      border: '1px solid rgba(74,240,192,0.12)',
                    }}>{tag}</span>
                  ))}
                </div>
              )}
              {backlinks.length > 0 && (
                <div style={{
                  marginTop: 18, paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#666', fontFamily: fc,
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                  }}>
                    Linked from <span style={{ color: '#4af0c0', marginLeft: 4 }}>{backlinks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {backlinks.map(b => {
                      const ti = typeInfo(b.type);
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleSelect(b)}
                          style={{
                            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: 8, padding: '6px 10px', borderRadius: 5,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74,240,192,0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          <span style={{ fontSize: 12 }}>{ti.icon}</span>
                          <span style={{
                            fontSize: 12, color: '#c4c9d4', fontFamily: fc, fontWeight: 500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                          }}>{b.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 16, fontSize: 10, color: '#333', fontFamily: fc }}>
                {selected.createdAt && `Created ${new Date(selected.createdAt).toLocaleDateString()}`}
                {selected.updatedAt && selected.updatedAt !== selected.createdAt &&
                  ` · Updated ${new Date(selected.updatedAt).toLocaleDateString()}`}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {!selected && (
          <div style={{
            position: 'absolute', top: 12, right: 16,
            display: 'flex', flexDirection: 'column', gap: 4,
            background: 'rgba(6,6,14,0.6)', padding: '8px 12px',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)',
          }}>
            {TYPES.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.color, boxShadow: `0 0 6px ${t.color}` }} />
                <span style={{ fontSize: 9, color: '#666', fontFamily: fc }}>{t.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div style={{
          position: 'absolute', bottom: 8, right: 16,
          fontSize: 10, color: '#333', fontFamily: fc,
        }}>
          ESC to close · Shared via MCP
        </div>

        {/* Categorize toast */}
        {(categorizing || categorizeMsg || categorizeError) && (
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 10,
            background: categorizeError ? 'rgba(80, 12, 20, 0.92)' : 'rgba(8, 8, 18, 0.92)',
            border: categorizeError
              ? '1px solid rgba(248,113,113,0.4)'
              : '1px solid rgba(167,139,250,0.3)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: fc, fontSize: 12,
            color: categorizeError ? '#fca5a5' : '#c4c9d4',
            maxWidth: 480,
          }}>
            {!categorizeError && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: categorizing ? '#fbbf24' : '#4af0c0',
                boxShadow: `0 0 8px ${categorizing ? '#fbbf24' : '#4af0c0'}`,
                animation: categorizing ? 'memSyncSpin 1.5s linear infinite' : 'none',
              }} />
            )}
            {categorizeError ? <span>⚠️ {categorizeError}</span> : <span>{categorizeMsg}</span>}
          </div>
        )}
      </div>

      <style>{`
        @keyframes memSlideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes memSyncSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .memory-md p { margin: 0 0 8px 0; }
        .memory-md p:last-child { margin-bottom: 0; }
        .memory-md a { color: #4af0c0; text-decoration: none; border-bottom: 1px dotted rgba(74,240,192,0.4); }
        .memory-md a:hover { border-bottom-style: solid; }
        .memory-md code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; font-family: ${fc}; font-size: 12px; }
        .memory-md pre { background: rgba(0,0,0,0.35); padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; border: 1px solid rgba(255,255,255,0.05); }
        .memory-md pre code { background: transparent; padding: 0; font-size: 11.5px; line-height: 1.55; }
        .memory-md ul, .memory-md ol { margin: 6px 0; padding-left: 22px; }
        .memory-md li { margin: 2px 0; }
        .memory-md h1, .memory-md h2, .memory-md h3 { margin: 12px 0 6px; color: #e2e8f0; font-weight: 700; }
        .memory-md h1 { font-size: 16px; }
        .memory-md h2 { font-size: 14px; }
        .memory-md h3 { font-size: 13px; }
        .memory-md blockquote { border-left: 2px solid rgba(74,240,192,0.4); padding-left: 10px; margin: 8px 0; color: #94a3b8; }
        .memory-md hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 10px 0; }
        .memory-md table { border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        .memory-md th, .memory-md td { border: 1px solid rgba(255,255,255,0.08); padding: 4px 8px; text-align: left; }
        .memory-md th { background: rgba(255,255,255,0.04); font-weight: 600; }
      `}</style>
      </div>
    </div>
  );
}

function CountPill({ count, limit, tier }) {
  const ratio = limit ? count / limit : 0;
  const near = ratio >= 0.85;
  const full = ratio >= 1;
  const color = full ? '#f87171' : near ? '#fbbf24' : '#4af0c0';
  const bg = full ? 'rgba(248,113,113,0.12)' : near ? 'rgba(251,191,36,0.12)' : 'rgba(74,240,192,0.1)';
  return (
    <span
      title={`${count} of ${limit} memories used (${tier} tier)`}
      style={{
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
        background: bg, color, fontFamily: fc,
      }}
    >{count}{limit ? `/${limit}` : ''}</span>
  );
}

function TrashList({ entries, onRestore, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 56, right: 16, width: 360, maxHeight: '70%',
      background: 'rgba(8, 8, 18, 0.96)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, zIndex: 50, display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', fontFamily: fc }}>
          Recently deleted
          <span style={{ color: '#666', fontWeight: 400, marginLeft: 6 }}>· 72h recovery</span>
        </div>
        <button onClick={onClose} style={{
          all: 'unset', cursor: 'pointer', color: '#666', fontSize: 12, padding: '0 4px',
        }}>✕</button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: 6 }}>
        {entries.length === 0 && (
          <div style={{ padding: 20, fontSize: 11, color: '#555', textAlign: 'center', fontFamily: fc }}>
            No deleted memories.
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} style={{
            padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: 6, gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, color: '#c4c9d4', fontFamily: fc, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{e.title}</div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: fc }}>
                Deleted {new Date(e.deletedAt).toLocaleString()}
              </div>
            </div>
            <button onClick={() => onRestore(e.id)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, color: '#4af0c0',
              fontFamily: fc, padding: '4px 10px', borderRadius: 4,
              background: 'rgba(74,240,192,0.1)',
            }}>Restore</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncBadge({ status, syncing, onSync }) {
  if (!status?.cloudEnabled) {
    const pending = status?.pending || 0;
    const label = pending > 0 ? `Local · ${pending} pending` : 'Local';
    const tip = pending > 0
      ? `Local only — ${status?.tier || 'starter'} tier. ${pending} memories will sync once you upgrade.`
      : `Local only — ${status?.tier || 'starter'} tier. Upgrade to sync across devices.`;
    return (
      <button
        onClick={onSync}
        title={tip}
        style={{
          all: 'unset', cursor: 'pointer',
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
          background: 'rgba(148,163,184,0.12)', color: '#94a3b8', fontFamily: fc,
        }}
      >{label}</button>
    );
  }
  const { state, pending, failed } = status;
  let label, color, bg, dot;
  if (syncing || state === 'pending') {
    label = `Syncing${pending ? ` (${pending})` : ''}`;
    color = '#fbbf24'; bg = 'rgba(251,191,36,0.12)'; dot = '#fbbf24';
  } else if (state === 'error') {
    label = `Sync paused${failed ? ` (${failed})` : ''}`;
    color = '#f87171'; bg = 'rgba(248,113,113,0.12)'; dot = '#f87171';
  } else {
    label = 'Synced';
    color = '#4af0c0'; bg = 'rgba(74,240,192,0.1)'; dot = '#4af0c0';
  }
  return (
    <button
      onClick={onSync}
      title={`Click to sync now. Tier: ${status.tier}`}
      style={{
        all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
        background: bg, color, fontFamily: fc,
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: dot,
        boxShadow: `0 0 6px ${dot}`,
        animation: syncing || state === 'pending' ? 'memSyncSpin 1.5s linear infinite' : 'none',
      }} />
      {label}
    </button>
  );
}

function CategoryPicker({ leaves, paths, colors, currentId, onAssign }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentPath = currentId ? paths.get(currentId) : null;
  const currentColor = currentId ? colors.get(currentId) : '#94a3b8';
  const filtered = filter
    ? leaves.filter(l => (paths.get(l.id) || '').toLowerCase().includes(filter.toLowerCase()))
    : leaves;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={currentPath || 'Uncategorized — click to assign'}
        style={{
          all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10, padding: '3px 10px', borderRadius: 4,
          background: currentColor + '15', color: currentColor,
          fontFamily: FONTS.mono, fontWeight: 600,
          border: `1px solid ${currentColor}30`,
          maxWidth: 220,
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: currentColor,
          flexShrink: 0,
        }} />
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{currentPath || 'Uncategorized'}</span>
        <span style={{ fontSize: 8, opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 60,
          width: 280, maxHeight: 360, overflow: 'hidden',
          background: 'rgba(8, 8, 18, 0.96)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, backdropFilter: 'blur(14px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}>
          <input
            value={filter} onChange={(e) => setFilter(e.target.value)}
            autoFocus placeholder="Filter categories..."
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
              outline: 'none', padding: '8px 12px',
              color: '#c4c9d4', fontSize: 12, fontFamily: FONTS.mono,
            }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            <button
              onClick={() => { onAssign(null); setOpen(false); }}
              style={{
                all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
                padding: '6px 12px', fontSize: 11, fontFamily: FONTS.mono,
                color: '#666', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >✕ Remove from category</button>
            {filtered.map(leaf => {
              const color = colors.get(leaf.id) || '#94a3b8';
              const path = paths.get(leaf.id) || leaf.name;
              const isCurrent = leaf.id === currentId;
              return (
                <button
                  key={leaf.id}
                  onClick={() => { onAssign(leaf.id); setOpen(false); }}
                  style={{
                    all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '6px 12px', fontSize: 12, fontFamily: FONTS.mono,
                    color: isCurrent ? color : '#c4c9d4',
                    background: isCurrent ? color + '12' : 'transparent',
                    fontWeight: isCurrent ? 700 : 400,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isCurrent ? color + '20' : 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isCurrent ? color + '12' : 'transparent'}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {leaf.emoji ? `${leaf.emoji} ` : ''}{path}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 11, color: '#555', fontFamily: FONTS.mono, textAlign: 'center' }}>
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManager({ categories, paths, colors, entries, onRename, onDelete, onClose }) {
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const memoryCount = useMemo(() => {
    const counts = new Map();
    for (const e of entries) {
      if (e.categoryId) counts.set(e.categoryId, (counts.get(e.categoryId) || 0) + 1);
    }
    return counts;
  }, [entries]);

  // Show as flat sorted list of paths so users can scan all categories
  const sorted = useMemo(() => [...categories].sort(
    (a, b) => (paths.get(a.id) || '').localeCompare(paths.get(b.id) || '')
  ), [categories, paths]);

  return (
    <div style={{
      position: 'absolute', top: 56, right: 16, width: 420, maxHeight: '78%',
      background: 'rgba(8, 8, 18, 0.96)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, zIndex: 50, display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', fontFamily: FONTS.mono }}>
          Categories
          <span style={{ color: '#666', fontWeight: 400, marginLeft: 6 }}>· {sorted.length}</span>
        </div>
        <button onClick={onClose} style={{
          all: 'unset', cursor: 'pointer', color: '#666', fontSize: 12, padding: '0 4px',
        }}>✕</button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: 6 }}>
        {sorted.length === 0 && (
          <div style={{ padding: 20, fontSize: 11, color: '#555', textAlign: 'center', fontFamily: FONTS.mono }}>
            No categories yet. Click ✨ to run categorization.
          </div>
        )}
        {sorted.map((c) => {
          const color = colors.get(c.id) || '#94a3b8';
          const path = paths.get(c.id) || c.name;
          const count = memoryCount.get(c.id) || 0;
          const isRename = renameId === c.id;
          const isConfirm = confirmDeleteId === c.id;
          return (
            <div key={c.id} style={{
              padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
              }} />
              {isRename ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) {
                      onRename(c.id, renameValue.trim());
                      setRenameId(null);
                    } else if (e.key === 'Escape') setRenameId(null);
                  }}
                  autoFocus
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(74,240,192,0.3)',
                    borderRadius: 4, padding: '3px 8px',
                    color: '#e2e8f0', fontSize: 12, fontFamily: FONTS.mono, outline: 'none',
                  }}
                />
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, color: '#c4c9d4', fontFamily: FONTS.mono, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.emoji ? `${c.emoji} ` : ''}{path}</div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: FONTS.mono }}>
                    {count} {count === 1 ? 'memory' : 'memories'}
                  </div>
                </div>
              )}
              {!isRename && !isConfirm && (
                <>
                  <button
                    onClick={() => { setRenameId(c.id); setRenameValue(c.name); }}
                    style={{
                      all: 'unset', cursor: 'pointer', fontSize: 10, color: '#a78bfa',
                      fontFamily: FONTS.mono, padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(167,139,250,0.1)',
                    }}
                  >Rename</button>
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    style={{
                      all: 'unset', cursor: 'pointer', fontSize: 10, color: '#f87171',
                      fontFamily: FONTS.mono, padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(248,113,113,0.1)',
                    }}
                  >Delete</button>
                </>
              )}
              {isConfirm && (
                <>
                  <button
                    onClick={() => { onDelete(c.id); setConfirmDeleteId(null); }}
                    style={{
                      all: 'unset', cursor: 'pointer', fontSize: 10, color: '#fca5a5',
                      fontFamily: FONTS.mono, padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(248,113,113,0.18)', fontWeight: 700,
                    }}
                  >Confirm</button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{
                      all: 'unset', cursor: 'pointer', fontSize: 10, color: '#666',
                      fontFamily: FONTS.mono, padding: '3px 8px',
                    }}
                  >Cancel</button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
