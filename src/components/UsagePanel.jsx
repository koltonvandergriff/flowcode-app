import { useState, useEffect, useCallback } from 'react';
import { FONTS, COLORS } from '../lib/constants';

const fc = FONTS.mono;

function UsageBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.text.dim, fontFamily: fc, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: fc }}>
          {typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          {sub && <span style={{ fontSize: 9, color: COLORS.text.dim, marginLeft: 4 }}>{sub}</span>}
        </span>
      </div>
      {max > 0 && (
        <div style={{ height: 4, background: COLORS.bg.surface, borderRadius: 2 }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 2, background: color,
            transition: 'width .5s ease',
          }} />
        </div>
      )}
    </div>
  );
}

function formatUptime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function UsagePanel() {
  const [usage, setUsage] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fc-usage') === 'collapsed');

  const refresh = useCallback(async () => {
    if (!window.flowcode?.cost) return;
    try {
      const data = await window.flowcode.cost.getUsage();
      setUsage(data);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 10000);
    return () => clearInterval(iv);
  }, [refresh]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('fc-usage', next ? 'collapsed' : 'open');
  };

  if (!usage) return null;

  const sessionCost = ((usage.session.input / 1_000_000) * 3 + (usage.session.output / 1_000_000) * 15).toFixed(4);

  return (
    <div style={{
      background: COLORS.bg.raised, border: `1px solid ${COLORS.border.subtle}`, borderRadius: 12,
      overflow: 'hidden', flexShrink: 0,
    }}>
      <button onClick={toggle} style={{
        all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '10px 16px', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent.purple, letterSpacing: 1.5, fontFamily: fc }}>
            USAGE
          </span>
          <span style={{ fontSize: 10, color: COLORS.text.dim, fontFamily: fc }}>
            {formatUptime(usage.session.uptime)} uptime
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent.green, fontFamily: fc }}>
            ${sessionCost}
          </span>
          <span style={{ fontSize: 10, color: COLORS.text.dim, fontFamily: fc }}>
            {(usage.session.total / 1000).toFixed(1)}k tokens
          </span>
          <span style={{
            fontSize: 8, color: COLORS.text.ghost, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform .2s ease',
          }}>&#9660;</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
          padding: '0 16px 14px', borderTop: `1px solid ${COLORS.border.subtle}`, paddingTop: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.text.ghost, fontFamily: fc, letterSpacing: 1 }}>SESSION</span>
            <UsageBar label="INPUT" value={usage.session.input} max={500000} color={COLORS.accent.cyan} />
            <UsageBar label="OUTPUT" value={usage.session.output} max={200000} color={COLORS.accent.green} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.text.ghost, fontFamily: fc, letterSpacing: 1 }}>TODAY</span>
            <UsageBar label="TOKENS" value={usage.daily.total} max={2000000} color={COLORS.accent.amber} />
            <UsageBar label="COST" value={`$${usage.daily.cost.toFixed(2)}`} max={0} color={COLORS.status.warning} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.text.ghost, fontFamily: fc, letterSpacing: 1 }}>MONTH</span>
            <UsageBar label="TOKENS" value={usage.monthly.total} max={50000000} color={COLORS.accent.pink} />
            <UsageBar label="COST" value={`$${usage.monthly.cost.toFixed(2)}`} max={0} color={COLORS.accent.purple} />
          </div>
        </div>
      )}
    </div>
  );
}
