import { useState, useEffect, useCallback, useMemo } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const fc = FONTS.mono;

// ---------------------------------------------------------------------------
// Shared chart tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label, formatter, colors }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: colors.bg.overlay,
      border: `1px solid ${colors.border.subtle}`,
      borderRadius: 8,
      padding: '8px 12px',
      fontFamily: fc,
      fontSize: 11,
      color: colors.text.primary,
      boxShadow: '0 4px 16px rgba(0,0,0,.4)',
    }}>
      {label && <div style={{ color: colors.text.dim, marginBottom: 4, fontSize: 10 }}>{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ color: colors.text.dim }}>{entry.name}:</span>
          <span style={{ fontWeight: 700, color: entry.color }}>
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------
function SummaryCard({ label, value, trend, color, colors }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 120,
      background: colors.bg.surface,
      border: `1px solid ${colors.border.subtle}`,
      borderRadius: 10,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, color: colors.text.ghost, fontFamily: fc,
        letterSpacing: 1.5, textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontSize: 22, fontWeight: 700, color: color || colors.text.primary, fontFamily: fc,
        lineHeight: 1.1,
      }}>{value}</span>
      {trend != null && (
        <span style={{
          fontSize: 10, fontFamily: fc, fontWeight: 600,
          color: trend > 0 ? colors.status.error : trend < 0 ? colors.accent.green : colors.text.ghost,
        }}>
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs prev
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions table
// ---------------------------------------------------------------------------
function SessionsTable({ entries, colors }) {
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy.slice(0, 100);
  }, [entries, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const cols = [
    { key: 'timestamp', label: 'DATE', w: '22%', fmt: (v) => new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'model', label: 'MODEL', w: '22%', fmt: (v) => v || 'unknown' },
    { key: 'input', label: 'INPUT', w: '16%', fmt: (v) => v > 1000 ? `${(v / 1000).toFixed(1)}k` : v },
    { key: 'output', label: 'OUTPUT', w: '16%', fmt: (v) => v > 1000 ? `${(v / 1000).toFixed(1)}k` : v },
    { key: 'cost', label: 'COST', w: '14%', fmt: (v) => `$${v.toFixed(4)}` },
  ];

  const headerStyle = (key) => ({
    fontSize: 9, fontWeight: 700, color: sortKey === key ? colors.accent.purple : colors.text.ghost,
    fontFamily: fc, letterSpacing: 1, cursor: 'pointer', userSelect: 'none',
    padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${colors.border.subtle}`,
  });

  return (
    <div style={{
      maxHeight: 280, overflowY: 'auto', borderRadius: 8,
      border: `1px solid ${colors.border.subtle}`,
      scrollbarWidth: 'thin', scrollbarColor: `${colors.border.subtle} transparent`,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fc }}>
        <thead style={{ position: 'sticky', top: 0, background: colors.bg.overlay, zIndex: 1 }}>
          <tr>
            {cols.map((c) => (
              <th key={c.key} onClick={() => handleSort(c.key)} style={{ ...headerStyle(c.key), width: c.w }}>
                {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{
              background: i % 2 === 0 ? 'transparent' : `${colors.bg.surface}60`,
            }}>
              {cols.map((c) => (
                <td key={c.key} style={{
                  fontSize: 11, color: c.key === 'cost' ? colors.accent.green : colors.text.secondary,
                  fontFamily: fc, padding: '6px 10px', borderBottom: `1px solid ${colors.border.subtle}20`,
                }}>
                  {c.fmt(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{
                textAlign: 'center', padding: 24, color: colors.text.ghost,
                fontSize: 12, fontFamily: fc,
              }}>
                No data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ===========================================================================
// Main AnalyticsDashboard component
// ===========================================================================

export default function AnalyticsDashboard({ open, onClose }) {
  const { colors } = useTheme();
  const [dailyData, setDailyData] = useState([]);
  const [rawEntries, setRawEntries] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const CHART_COLORS = {
    cost: colors.accent.green,
    input: colors.accent.cyan,
    output: colors.accent.purple,
    grid: '#2e3050',
    tooltip: colors.bg.overlay,
  };

  const PIE_PALETTE = [
    colors.accent.green,
    colors.accent.purple,
    colors.accent.amber,
    colors.accent.cyan,
    colors.accent.pink,
    colors.status.info,
  ];

  const loadData = useCallback(async () => {
    if (!window.flowcode?.cost) return;
    setLoading(true);
    try {
      const [history, raw, usageData] = await Promise.all([
        window.flowcode.cost.getHistory('month'),
        window.flowcode.cost.getRawHistory('month'),
        window.flowcode.cost.getUsage(),
      ]);
      setDailyData(history || []);
      setRawEntries(raw || []);
      setUsage(usageData);
    } catch {
      // Silently handle -- data will be empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const totalSpend = useMemo(() => {
    return rawEntries.reduce((s, e) => s + (e.cost || 0), 0);
  }, [rawEntries]);

  const monthSpend = useMemo(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return rawEntries.filter((e) => new Date(e.timestamp) >= start).reduce((s, e) => s + (e.cost || 0), 0);
  }, [rawEntries]);

  const todaySpend = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return rawEntries.filter((e) => new Date(e.timestamp) >= start).reduce((s, e) => s + (e.cost || 0), 0);
  }, [rawEntries]);

  const avgDaily = useMemo(() => {
    if (dailyData.length === 0) return 0;
    const total = dailyData.reduce((s, d) => s + d.cost, 0);
    return total / dailyData.length;
  }, [dailyData]);

  // Trend: compare last 7 days to previous 7 days
  const spendTrend = useMemo(() => {
    if (dailyData.length < 2) return null;
    const n = Math.min(7, Math.floor(dailyData.length / 2));
    const recent = dailyData.slice(-n).reduce((s, d) => s + d.cost, 0);
    const prev = dailyData.slice(-(n * 2), -n).reduce((s, d) => s + d.cost, 0);
    if (prev === 0) return null;
    return ((recent - prev) / prev) * 100;
  }, [dailyData]);

  // Token usage over time (input vs output per day)
  const tokenTimeData = useMemo(() => {
    const byDay = {};
    for (const e of rawEntries) {
      const key = new Date(e.timestamp).toISOString().slice(0, 10);
      if (!byDay[key]) byDay[key] = { date: key, input: 0, output: 0 };
      byDay[key].input += e.input || 0;
      byDay[key].output += e.output || 0;
    }
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [rawEntries]);

  // Provider breakdown
  const providerData = useMemo(() => {
    const byModel = {};
    for (const e of rawEntries) {
      const m = e.model || 'unknown';
      if (!byModel[m]) byModel[m] = { name: m, value: 0 };
      byModel[m].value += e.cost || 0;
    }
    return Object.values(byModel).sort((a, b) => b.value - a.value);
  }, [rawEntries]);

  if (!open) return null;

  const fmtCost = (v) => v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
  const fmtTokens = (v) => v > 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v > 1000 ? `${(v / 1000).toFixed(1)}k` : v;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, width: 780, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 28px 16px', flexShrink: 0,
          borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h2 style={{
              fontSize: 18, fontWeight: 700, fontFamily: FONTS.display,
              letterSpacing: 1, color: '#fff', margin: 0,
            }}>
              Analytics
            </h2>
            <span style={{
              fontSize: 9, fontWeight: 600, color: colors.text.ghost, fontFamily: fc,
              padding: '2px 8px', background: colors.bg.surface, borderRadius: 4,
              border: `1px solid ${colors.border.subtle}`,
            }}>
              LAST 30 DAYS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={loadData} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              padding: '5px 12px', borderRadius: 6, fontFamily: fc,
              color: colors.text.dim, background: colors.bg.surface,
              border: `1px solid ${colors.border.subtle}`,
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.purple; e.currentTarget.style.color = colors.accent.purple; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.color = colors.text.dim; }}
            >REFRESH</button>
            <button onClick={onClose} style={{
              all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim, padding: '0 4px',
            }}>&#10005;</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 28px 28px',
          display: 'flex', flexDirection: 'column', gap: 24,
          scrollbarWidth: 'thin', scrollbarColor: `${colors.border.subtle} transparent`,
        }}>
          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 60, color: colors.text.dim, fontFamily: fc, fontSize: 13,
            }}>
              Loading analytics...
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <SummaryCard label="Total Spend" value={fmtCost(totalSpend)} color={colors.accent.green} trend={spendTrend} colors={colors} />
                <SummaryCard label="This Month" value={fmtCost(monthSpend)} color={colors.accent.purple} colors={colors} />
                <SummaryCard label="Today" value={fmtCost(todaySpend)} color={colors.accent.amber} colors={colors} />
                <SummaryCard label="Avg Daily" value={fmtCost(avgDaily)} color={colors.accent.cyan} colors={colors} />
              </div>

              {/* Daily cost bar chart */}
              <div>
                <h3 style={{
                  fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc,
                  letterSpacing: 1.5, margin: '0 0 12px',
                }}>DAILY COST</h3>
                <div style={{
                  background: colors.bg.surface, borderRadius: 10,
                  border: `1px solid ${colors.border.subtle}`, padding: '16px 8px 8px',
                }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: colors.text.ghost, fontFamily: fc }}
                        tickFormatter={(d) => d.slice(5)}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: colors.text.ghost, fontFamily: fc }}
                        tickFormatter={(v) => `$${v.toFixed(2)}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip formatter={(v) => `$${v.toFixed(4)}`} colors={colors} />} />
                      <Bar dataKey="cost" name="Cost" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Token usage line chart */}
              <div>
                <h3 style={{
                  fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc,
                  letterSpacing: 1.5, margin: '0 0 12px',
                }}>TOKEN USAGE (INPUT VS OUTPUT)</h3>
                <div style={{
                  background: colors.bg.surface, borderRadius: 10,
                  border: `1px solid ${colors.border.subtle}`, padding: '16px 8px 8px',
                }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={tokenTimeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: colors.text.ghost, fontFamily: fc }}
                        tickFormatter={(d) => d.slice(5)}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: colors.text.ghost, fontFamily: fc }}
                        tickFormatter={(v) => fmtTokens(v)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip formatter={(v, name) => `${fmtTokens(v)} ${name}`} colors={colors} />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, fontFamily: fc, color: colors.text.dim, paddingTop: 8 }}
                      />
                      <Line
                        type="monotone" dataKey="input" name="Input"
                        stroke={CHART_COLORS.input} strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLORS.input }} activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone" dataKey="output" name="Output"
                        stroke={CHART_COLORS.output} strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLORS.output }} activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Provider breakdown pie chart */}
              {providerData.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc,
                    letterSpacing: 1.5, margin: '0 0 12px',
                  }}>SPEND BY MODEL</h3>
                  <div style={{
                    background: colors.bg.surface, borderRadius: 10,
                    border: `1px solid ${colors.border.subtle}`, padding: 16,
                    display: 'flex', alignItems: 'center', gap: 24,
                  }}>
                    <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={providerData}
                            cx="50%" cy="50%"
                            innerRadius={45} outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {providerData.map((_, i) => (
                              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip formatter={(v) => `$${v.toFixed(4)}`} colors={colors} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {providerData.map((item, i) => {
                        const pct = totalSpend > 0 ? ((item.value / totalSpend) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={item.name} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '6px 10px', borderRadius: 6,
                            background: `${PIE_PALETTE[i % PIE_PALETTE.length]}08`,
                          }}>
                            <span style={{
                              width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                              background: PIE_PALETTE[i % PIE_PALETTE.length],
                            }} />
                            <span style={{
                              flex: 1, fontSize: 11, fontFamily: fc, color: colors.text.secondary,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: fc, fontWeight: 700, color: PIE_PALETTE[i % PIE_PALETTE.length] }}>
                              ${item.value.toFixed(4)}
                            </span>
                            <span style={{ fontSize: 9, fontFamily: fc, color: colors.text.ghost, minWidth: 36, textAlign: 'right' }}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent sessions table */}
              <div>
                <h3 style={{
                  fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc,
                  letterSpacing: 1.5, margin: '0 0 12px',
                }}>RECENT SESSIONS</h3>
                <SessionsTable entries={rawEntries} colors={colors} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
