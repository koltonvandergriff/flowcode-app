import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { getCurrentPlan } from '../lib/subscriptionService';

const fc = FONTS.mono;

function UsageBar({ label, value, max, color, sub, colors, warn }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isHigh = pct >= 80;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: colors.text.dim, fontFamily: fc, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: isHigh && warn ? colors.status.warning : color, fontFamily: fc }}>
          {typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          {sub && <span style={{ fontSize: 9, color: colors.text.dim, marginLeft: 4 }}>{sub}</span>}
        </span>
      </div>
      {max > 0 && (
        <div style={{ height: 4, background: colors.bg.surface, borderRadius: 2 }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 2,
            background: isHigh && warn ? colors.status.warning : color,
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

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function UsagePanel() {
  const { colors } = useTheme();
  const [usage, setUsage] = useState(null);
  const [plan, setPlan] = useState(null);
  const [collapsed, setCollapsed] = useState(true);

  const refresh = useCallback(async () => {
    if (!window.flowade?.cost) return;
    try {
      const data = await window.flowade.cost.getUsage();
      setUsage(data);
    } catch {}
    try {
      setPlan(getCurrentPlan());
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 10000);
    const unsub = window.flowade?.cost?.onUpdated?.(refresh);
    return () => {
      clearInterval(iv);
      unsub?.();
    };
  }, [refresh]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('fc-usage', next ? 'collapsed' : 'open');
  };

  if (!usage) return null;

  const sessionCost = ((usage.session.input / 1_000_000) * 3 + (usage.session.output / 1_000_000) * 15).toFixed(4);
  const monthlyLimit = plan?.limits?.tokensPerMonth || Infinity;
  const costLimit = plan?.limits?.costPerMonth || Infinity;
  const monthPct = monthlyLimit < Infinity ? ((usage.monthly.total / monthlyLimit) * 100).toFixed(0) : null;
  const costPct = costLimit < Infinity ? ((usage.monthly.cost / costLimit) * 100).toFixed(0) : null;

  return (
    <div className="fc-glass" style={{
      background: colors.bg.glass || colors.bg.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: 8,
      overflow: 'hidden', flexShrink: 0,
    }}>
      <button onClick={toggle} style={{
        all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '5px 14px', boxSizing: 'border-box',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {plan && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              background: colors.accent.purple + '15', color: colors.accent.purple, fontFamily: fc,
            }}>
              {plan.name.toUpperCase()}
            </span>
          )}
          <span style={{ fontSize: 10, color: colors.text.dim, fontFamily: fc }}>
            {formatUptime(usage.session.uptime)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent.green, fontFamily: fc }}>
            ${sessionCost}
          </span>
          <span style={{ fontSize: 10, color: colors.text.dim, fontFamily: fc }}>
            {formatTokens(usage.session.total)} tok
          </span>
          {monthPct && parseInt(monthPct) >= 80 && (
            <span style={{ fontSize: 9, fontWeight: 700, color: colors.status.warning, fontFamily: fc }}>
              {monthPct}%
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.text.ghost} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .2s ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
          padding: '0 16px 12px', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 10,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: colors.text.ghost, fontFamily: fc, letterSpacing: 1 }}>SESSION</span>
            <UsageBar label="INPUT" value={usage.session.input} max={500000} color={colors.accent.cyan} colors={colors} />
            <UsageBar label="OUTPUT" value={usage.session.output} max={200000} color={colors.accent.green} colors={colors} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: colors.text.ghost, fontFamily: fc, letterSpacing: 1 }}>TODAY</span>
            <UsageBar label="TOKENS" value={usage.daily.total} max={monthlyLimit < Infinity ? monthlyLimit / 30 : 2000000} color={colors.accent.amber} colors={colors} warn />
            <UsageBar label="COST" value={`$${usage.daily.cost.toFixed(2)}`} max={0} color={colors.status.warning} colors={colors} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: colors.text.ghost, fontFamily: fc, letterSpacing: 1 }}>
              MONTH {monthPct ? `(${monthPct}%)` : ''}
            </span>
            <UsageBar label="TOKENS" value={usage.monthly.total} max={monthlyLimit < Infinity ? monthlyLimit : 0}
              color={colors.accent.pink} colors={colors} warn
              sub={monthlyLimit < Infinity ? `/ ${formatTokens(monthlyLimit)}` : undefined} />
            <UsageBar label="COST" value={`$${usage.monthly.cost.toFixed(2)}`}
              max={costLimit < Infinity ? costLimit : 0} color={colors.accent.purple} colors={colors} warn
              sub={costLimit < Infinity ? `/ $${costLimit}` : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}
