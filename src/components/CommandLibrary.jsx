import { useState, useMemo } from 'react';
import { FONTS, COLORS, COMMAND_LIBRARY } from '../lib/constants';

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
  const [open, setOpen] = useState(() => localStorage.getItem('fc-cmdlib') !== 'false');
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem('fc-cmdlib', String(next));
  };

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
    <div style={{ display: 'flex', alignSelf: 'stretch', transition: 'width .25s ease' }}>
      <button onClick={toggle} style={{
        all: 'unset', cursor: 'pointer', writingMode: 'vertical-rl', textOrientation: 'mixed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 5px', background: COLORS.bg.overlay, border: `1px solid ${COLORS.border.subtle}`,
        borderRadius: open ? '8px 0 0 8px' : 8, fontSize: 10, fontWeight: 700,
        color: COLORS.accent.amber, letterSpacing: 1.5, fontFamily: fc, minWidth: 22,
      }}>
        <span style={{ fontSize: 10, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s ease' }}>&#9664;</span>
        COMMANDS
      </button>

      {open && (
        <div style={{
          width: 260, minWidth: 260, background: COLORS.bg.raised, border: `1px solid ${COLORS.border.subtle}`,
          borderLeft: 'none', borderRadius: '0 14px 14px 0', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.3)',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${COLORS.border.subtle}`, background: COLORS.bg.overlay,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent.amber, letterSpacing: 1.5, fontFamily: fc }}>
              COMMAND LIBRARY
            </span>
          </div>

          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${COLORS.border.subtle}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, background: COLORS.bg.surface,
              border: `1px solid ${COLORS.border.subtle}`, borderRadius: 8, padding: '7px 10px',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.text.ghost} strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: COLORS.text.secondary, fontSize: 11, fontFamily: fc, padding: 0,
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  all: 'unset', cursor: 'pointer', fontSize: 10, color: COLORS.text.dim, fontFamily: fc,
                }}>&#10005;</button>
              )}
            </div>
          </div>

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
                    }}
                  >
                    <span style={{
                      fontSize: 8, color: COLORS.text.ghost, fontFamily: fc,
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s',
                    }}>&#9654;</span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    <span style={{
                      fontSize: 9, fontWeight: 700, color, letterSpacing: 1, fontFamily: fc,
                      textTransform: 'uppercase', flex: 1,
                    }}>{cat}</span>
                    <span style={{ fontSize: 9, color: COLORS.text.ghost, fontFamily: fc }}>{items.length}</span>
                  </button>

                  {isOpen && items.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      padding: '4px 12px 4px 28px', borderLeft: `2px solid ${color}15`, marginLeft: 12,
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, fontFamily: fc,
                        color: c.key ? '#E8593C' : c.shell ? '#1ABC9C' : c.tip ? '#FFD700' : COLORS.text.secondary,
                      }}>{c.cmd}</span>
                      <span style={{ fontSize: 9, color: COLORS.text.ghost, fontFamily: fc, lineHeight: 1.4 }}>
                        {c.desc}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{
            padding: '8px 14px', borderTop: `1px solid ${COLORS.border.subtle}`, background: COLORS.bg.surface,
          }}>
            <span style={{ fontSize: 9, color: COLORS.text.dim, fontFamily: fc }}>
              {COMMAND_LIBRARY.length} commands indexed
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
