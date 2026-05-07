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
  const [activeTab, setActiveTab] = useState('overview');
  const [cbReport, setCbReport] = useState(null);
  const [cbOptimize, setCbOptimize] = useState(null);
  const [cbPeriod, setCbPeriod] = useState('7days');
  const [cbLoading, setCbLoading] = useState(false);

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
    if (!window.flowade?.cost) return;
    setLoading(true);
    try {
      const [history, raw, usageData] = await Promise.all([
        window.flowade.cost.getHistory('month'),
        window.flowade.cost.getRawHistory('month'),
        window.flowade.cost.getUsage(),
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

  const loadCodeburn = useCallback(async (period) => {
    if (!window.flowade?.codeburn) return;
    setCbLoading(true);
    try {
      const [report, optimize] = await Promise.all([
        window.flowade.codeburn.report(period || cbPeriod),
        window.flowade.codeburn.optimize(),
      ]);
      setCbReport(report);
      setCbOptimize(optimize);
    } catch {}
    setCbLoading(false);
  }, [cbPeriod]);

  useEffect(() => {
    if (open) {
      loadData();
      loadCodeburn();
    }
  }, [open, loadData, loadCodeburn]);

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
              Reports
            </h2>
            {['overview', 'codeburn'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                padding: '4px 12px', borderRadius: 6, fontFamily: fc, letterSpacing: 0.8,
                background: activeTab === tab ? `${colors.accent.purple}20` : colors.bg.surface,
                color: activeTab === tab ? colors.accent.purple : colors.text.dim,
                border: `1px solid ${activeTab === tab ? colors.accent.purple + '40' : colors.border.subtle}`,
                transition: 'all .15s',
                textTransform: 'uppercase',
              }}>{tab === 'codeburn' ? 'CodeBurn' : 'Overview'}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => { loadData(); loadCodeburn(); }} style={{
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
          {activeTab === 'overview' && (loading ? (
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
          ))}

          {activeTab === 'codeburn' && (cbLoading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 60, color: colors.text.dim, fontFamily: fc, fontSize: 13,
            }}>
              Loading CodeBurn report...
            </div>
          ) : !cbReport ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 60, gap: 12,
            }}>
              <span style={{ fontSize: 13, color: colors.text.dim, fontFamily: fc }}>
                CodeBurn reads your Claude Code session logs to show where tokens go.
              </span>
              <button onClick={() => loadCodeburn()} style={{
                all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                padding: '8px 20px', borderRadius: 6, fontFamily: fc, color: '#fff',
                background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.purple})`,
              }}>LOAD REPORT</button>
            </div>
          ) : (
            <>
              {/* Period selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ id: 'today', label: 'Today' }, { id: '7days', label: '7 Days' }, { id: '30days', label: '30 Days' }, { id: 'month', label: 'This Month' }].map((p) => (
                  <button key={p.id} onClick={() => { setCbPeriod(p.id); loadCodeburn(p.id); }} style={{
                    all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '5px 12px',
                    borderRadius: 6, fontFamily: fc,
                    background: cbPeriod === p.id ? `${colors.accent.cyan}20` : colors.bg.surface,
                    color: cbPeriod === p.id ? colors.accent.cyan : colors.text.dim,
                    border: `1px solid ${cbPeriod === p.id ? colors.accent.cyan + '40' : colors.border.subtle}`,
                  }}>{p.label}</button>
                ))}
              </div>

              {/* Overview cards */}
              {cbReport.overview && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <SummaryCard label="Total Cost" value={fmtCost(cbReport.overview.cost || 0)} color={colors.accent.green} colors={colors} />
                  <SummaryCard label="API Calls" value={cbReport.overview.calls || 0} color={colors.accent.cyan} colors={colors} />
                  <SummaryCard label="Sessions" value={cbReport.overview.sessions || 0} color={colors.accent.purple} colors={colors} />
                  <SummaryCard label="Cache Hit" value={`${(cbReport.overview.cacheHitPercent || 0).toFixed(0)}%`} color={colors.accent.amber} colors={colors} />
                </div>
              )}

              {/* Projects breakdown */}
              {cbReport.projects?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1.5, margin: '0 0 12px' }}>PROJECTS</h3>
                  <div style={{ background: colors.bg.surface, borderRadius: 10, border: `1px solid ${colors.border.subtle}`, overflow: 'hidden' }}>
                    {cbReport.projects.slice(0, 10).map((proj, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderBottom: i < cbReport.projects.length - 1 ? `1px solid ${colors.border.subtle}20` : 'none',
                      }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 11, fontFamily: fc, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.name || proj.path?.split(/[/\\]/).pop() || 'unknown'}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.ghost }}>{proj.sessions || 0} sessions</span>
                        <span style={{ fontSize: 11, fontFamily: fc, fontWeight: 700, color: colors.accent.green }}>{fmtCost(proj.cost || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Models breakdown */}
              {cbReport.models?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1.5, margin: '0 0 12px' }}>MODELS</h3>
                  <div style={{ background: colors.bg.surface, borderRadius: 10, border: `1px solid ${colors.border.subtle}`, overflow: 'hidden' }}>
                    {cbReport.models.map((model, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderBottom: i < cbReport.models.length - 1 ? `1px solid ${colors.border.subtle}20` : 'none',
                      }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 11, fontFamily: fc, color: colors.text.secondary }}>{model.name}</span>
                        <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.ghost }}>{model.calls} calls</span>
                        <span style={{ fontSize: 10, fontFamily: fc, color: colors.accent.cyan }}>{fmtTokens(model.inputTokens || 0)} in</span>
                        <span style={{ fontSize: 10, fontFamily: fc, color: colors.accent.purple }}>{fmtTokens(model.outputTokens || 0)} out</span>
                        <span style={{ fontSize: 11, fontFamily: fc, fontWeight: 700, color: colors.accent.green }}>{fmtCost(model.cost || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities breakdown */}
              {cbReport.activities?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1.5, margin: '0 0 12px' }}>ACTIVITY BREAKDOWN</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {cbReport.activities.map((act, i) => (
                      <div key={i} style={{
                        background: colors.bg.surface, borderRadius: 8, border: `1px solid ${colors.border.subtle}`,
                        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: fc, color: colors.text.secondary }}>{act.category}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fc, color: colors.accent.green }}>{fmtCost(act.cost || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 9, fontFamily: fc, color: colors.text.ghost }}>
                          <span>{act.turns || 0} turns</span>
                          {act.oneShotRate != null && <span>1-shot: {(act.oneShotRate * 100).toFixed(0)}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools used */}
              {cbReport.tools?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1.5, margin: '0 0 12px' }}>TOP TOOLS</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cbReport.tools.slice(0, 15).map((tool, i) => (
                      <span key={i} style={{
                        fontSize: 10, fontFamily: fc, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                        background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                        color: colors.text.secondary,
                      }}>{tool.name} <span style={{ color: colors.text.ghost }}>({tool.calls})</span></span>
                    ))}
                  </div>
                </div>
              )}

              {/* Optimization tips */}
              {cbOptimize && (
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.status.warning, fontFamily: fc, letterSpacing: 1.5, margin: '0 0 12px' }}>OPTIMIZATION TIPS</h3>
                  <div style={{
                    background: `${colors.status.warning}08`, borderRadius: 10,
                    border: `1px solid ${colors.status.warning}20`, padding: 16,
                    fontFamily: fc, fontSize: 11, color: colors.text.secondary, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {typeof cbOptimize === 'string' ? cbOptimize :
                      Array.isArray(cbOptimize) ? cbOptimize.map((tip, i) => (
                        <div key={i} style={{ padding: '4px 0', borderBottom: i < cbOptimize.length - 1 ? `1px solid ${colors.border.subtle}15` : 'none' }}>
                          {typeof tip === 'string' ? tip : tip.message || tip.suggestion || JSON.stringify(tip)}
                        </div>
                      )) : <span style={{ color: colors.text.ghost }}>No optimization suggestions at this time.</span>
                    }
                  </div>
                </div>
              )}

              {/* Top sessions */}
              {cbReport.topSessions?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: colors.text.muted, fontFamily: fc, letterSpacing: 1.5, margin: '0 0 12px' }}>TOP SESSIONS BY COST</h3>
                  <div style={{ background: colors.bg.surface, borderRadius: 10, border: `1px solid ${colors.border.subtle}`, overflow: 'hidden' }}>
                    {cbReport.topSessions.slice(0, 10).map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                        borderBottom: i < cbReport.topSessions.length - 1 ? `1px solid ${colors.border.subtle}20` : 'none',
                      }}>
                        <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.ghost, minWidth: 65 }}>
                          {s.date ? new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                        <span style={{ flex: 1, fontSize: 11, fontFamily: fc, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.project || 'unknown'}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: fc, color: colors.text.ghost }}>{s.calls} calls</span>
                        <span style={{ fontSize: 11, fontFamily: fc, fontWeight: 700, color: colors.accent.green }}>{fmtCost(s.cost || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
