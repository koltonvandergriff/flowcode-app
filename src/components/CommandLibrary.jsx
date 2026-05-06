import { useState, useMemo } from 'react';
import { FONTS, COMMAND_LIBRARY } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;
const CATEGORIES = [...new Set(COMMAND_LIBRARY.map((c) => c.cat))];

const CAT_COLORS = {
  Navigation: '#3B8BD4',
  Project: '#2ECC71',
  Session: '#8E44AD',
  Tools: '#F39C12',
  Keyboard: '#E8593C',
  Git: '#1ABC9C',
  Tips: '#FFD700',
  Macros: '#E74C3C',
};

export default function CommandLibrary() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return COMMAND_LIBRARY;
    const q = search.toLowerCase();
    return COMMAND_LIBRARY.filter(
      (c) => c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.cat.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const g = {};
    for (const c of filtered) {
      if (!g[c.cat]) g[c.cat] = [];
      g[c.cat].push(c);
    }
    return g;
  }, [filtered]);

  const visibleCats = search.trim() ? Object.keys(grouped) : CATEGORIES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.subtle}`, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, background: colors.bg.surface,
          border: `1px solid ${colors.border.subtle}`, borderRadius: 6, padding: '6px 10px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text.ghost} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: colors.text.secondary, fontSize: 11, fontFamily: fc, padding: 0,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, color: colors.text.dim, fontFamily: fc,
            }}>&#10005;</button>
          )}
        </div>
      </div>

      {/* Command list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {visibleCats.map((cat) => {
          const items = grouped[cat] || [];
          if (items.length === 0) return null;
          const isOpen = search.trim() || expandedCat === cat;
          const color = CAT_COLORS[cat] || '#555';

          return (
            <div key={cat}>
              <button
                onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: 6, width: '100%', padding: '6px 12px', boxSizing: 'border-box',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  fontSize: 8, color: colors.text.ghost, fontFamily: fc,
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform .15s', display: 'inline-block',
                }}>&#9654;</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                <span style={{
                  fontSize: 9, fontWeight: 700, color, letterSpacing: 1, fontFamily: fc,
                  textTransform: 'uppercase', flex: 1,
                }}>{cat}</span>
                <span style={{ fontSize: 9, color: colors.text.ghost, fontFamily: fc }}>{items.length}</span>
              </button>

              {isOpen && items.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '4px 12px 4px 28px', borderLeft: `2px solid ${color}15`, marginLeft: 12,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, fontFamily: fc,
                    color: c.key ? '#E8593C' : c.shell ? '#1ABC9C' : c.tip ? '#FFD700' : colors.text.secondary,
                  }}>{c.cmd}</span>
                  <span style={{ fontSize: 9, color: colors.text.ghost, fontFamily: fc, lineHeight: 1.4 }}>
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 12px', borderTop: `1px solid ${colors.border.subtle}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: colors.text.dim, fontFamily: fc }}>
          {COMMAND_LIBRARY.length} commands {search ? `(${filtered.length} shown)` : ''}
        </span>
      </div>
    </div>
  );
}
