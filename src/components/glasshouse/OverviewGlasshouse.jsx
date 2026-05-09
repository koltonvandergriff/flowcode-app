// Glasshouse Overview — main view, not an overlay. Renders inline beside the
// sidebar where the terminal grid would otherwise sit. The greeting + stat
// row + activity feed + quick actions are the post-login landing page.

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

export default function OverviewGlasshouse({ userName = 'there', onJump }) {
  const greeting = greetingFor(new Date().getHours());

  return (
    <div style={s.root}>
      <div
        style={{
          flex: 1, minHeight: 0, minWidth: 0,
          background: 'rgba(8, 8, 18, 0.55)',
          border: '1px solid rgba(77,230,240,0.07)',
          borderRadius: 12,
          backdropFilter: 'blur(16px) saturate(1.15)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(77,230,240,0.04)',
          color: '#f1f5f9',
          fontFamily: FONT_MONO,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Top bar */}
        <div style={s.topbar}>
          <div style={s.crumbs}>
            <span>Workspace</span>
            <span style={{ color: '#4a5168' }}>›</span>
            <span style={{ color: '#f1f5f9' }}>Overview</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ ...s.pill, ...s.pillCy }}>
              <span style={{ ...s.pillDot, background: '#4de6f0' }} /> Trial · 6 days left
            </span>
            <span style={s.pill}>
              <span style={{ ...s.pillDot, background: '#4de6f0' }} /> Synced · 405
            </span>
          </div>
        </div>

        {/* Scroll body */}
        <div style={s.body}>
          <h1 style={s.title}>
            {greeting}, <span style={{ color: '#4de6f0' }}>{userName}</span>.
          </h1>
          <p style={s.sub}>Three terminals running, eight tasks active, one PR awaiting review.</p>

          {/* Stat row */}
          <div style={s.stats}>
            <Stat label="Memory" value="405" delta="+12 this week" tone="cy" />
            <Stat label="Categories" value="37" delta="organized via AI" tone="silver" />
            <Stat label="Active tasks" value="8" delta="3 awaiting review" />
            <Stat label="Spend (mo.)" value="$4.21" delta="on your keys" />
          </div>

          {/* 2-column: activity left, quick actions + workspaces right */}
          <div style={s.grid2}>
            <Panel title="Recent activity" right={<span style={s.tinyPill}>last 24h</span>}>
              <div style={s.activity}>
                <Act ic="✦" title={<>Categorized 12 memories from <em>FlowADE / Development</em></>} meta="via Haiku 4.5 · auto-on-create" ts="2m" />
                <Act ic="◈" title={<>Sonnet 4.6 finished refactor of <code style={s.code}>memoryStore.js</code></>} meta="applied diff · 142 + / 89 −" ts="14m" tone="silver" />
                <Act ic="▶" title={<>Build passed in <code style={s.code}>flowADE-app</code></>} meta="CI #284 · 2.7s" ts="1h" tone="white" />
                <Act ic="☰" title="Moved task &quot;Wire keytar postinstall&quot; to Done" meta="closed by Claude Code" ts="3h" tone="orange" />
                <Act ic="✦" title="Embedded 405 memories" meta="text-embedding-3-small · $0.0009" ts="5h" />
              </div>
            </Panel>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Panel title="Quick actions">
                <div style={s.quick}>
                  <Quick ic="▶" label="Open terminal" sub="⌘ T" onClick={() => onJump?.('code')} />
                  <Quick ic="◈" label="Ask AI"        sub="⌘ K" onClick={() => onJump?.('chat')} />
                  <Quick ic="✦" label="Search memory" sub="⌘ M" onClick={() => onJump?.('memory')} />
                  <Quick ic="☰" label="New task"      sub="⌘ N" onClick={() => onJump?.('tasks')} />
                </div>
              </Panel>

              <Panel title="Workspaces" right={<span style={s.tinyPill}>3 active</span>}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Workspace name="flowADE-app"          meta="main · 4 terminals"      live />
                  <Workspace name="flowline-oms"         meta="feat/api · 2 terminals"  live />
                  <Workspace name="claude-code-skills"   meta="main · idle" />
                </div>
              </Panel>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ovFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  );
}

function greetingFor(hour) {
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Burning the midnight oil';
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------
function Stat({ label, value, delta, tone }) {
  const valueColor =
    tone === 'cy'     ? '#4de6f0' :
    tone === 'silver' ? '#98a4b8' :
                        '#f1f5f9';
  const valueShadow = tone === 'cy' ? '0 0 18px rgba(77,230,240,0.35)' : 'none';
  return (
    <div style={s.stat}>
      <div style={s.statLabel}>{label}</div>
      <div style={{ ...s.statValue, color: valueColor, textShadow: valueShadow }}>{value}</div>
      <div style={s.statDelta}>{delta}</div>
    </div>
  );
}

function Panel({ title, right, children }) {
  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <span style={s.panelTitle}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function Act({ ic, title, meta, ts, tone }) {
  const icBg =
    tone === 'silver' ? 'rgba(152,164,184,0.1)' :
    tone === 'white'  ? 'rgba(255,255,255,0.05)' :
    tone === 'orange' ? 'rgba(255,184,107,0.08)' :
                        'rgba(77,230,240,0.1)';
  const icColor =
    tone === 'silver' ? '#98a4b8' :
    tone === 'white'  ? '#f1f5f9' :
    tone === 'orange' ? '#ffb86b' :
                        '#4de6f0';
  return (
    <div style={s.act}>
      <div style={{ ...s.actIc, background: icBg, color: icColor }}>{ic}</div>
      <div style={{ minWidth: 0 }}>
        <div style={s.actTitle}>{title}</div>
        <div style={s.actMeta}>{meta}</div>
      </div>
      <div style={s.actTs}>{ts}</div>
    </div>
  );
}

function Quick({ ic, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={s.quickBtn}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(77,230,240,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={s.quickIc}>{ic}</span>
      <span style={s.quickLb}>{label}</span>
      <span style={s.quickSb}>{sub}</span>
    </button>
  );
}

function Workspace({ name, meta, live }) {
  return (
    <div style={s.act}>
      <div style={{ ...s.actIc, background: 'rgba(77,230,240,0.06)', color: '#94a3b8' }}>▣</div>
      <div style={{ minWidth: 0 }}>
        <div style={s.actTitle}>{name}</div>
        <div style={s.actMeta}>{meta}</div>
      </div>
      <div style={{ ...s.actTs, color: live ? '#58e0a8' : '#4a5168', fontSize: 12 }}>{live ? '●' : '○'}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = {
  root: {
    flex: 1, minWidth: 0, minHeight: 0, padding: '0 6px 6px',
    display: 'flex', flexDirection: 'column',
  },
  topbar: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(8,8,18,0.4)',
    flexShrink: 0,
  },
  crumbs: {
    fontFamily: FONT_MONO, fontSize: 11, color: '#94a3b8',
    display: 'flex', gap: 8, alignItems: 'center',
  },
  pill: {
    fontSize: 10, padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.11)', color: '#94a3b8',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: FONT_MONO,
  },
  pillCy: {
    color: '#4de6f0',
    border: '1px solid rgba(77,230,240,0.3)',
    background: 'rgba(77,230,240,0.06)',
  },
  pillDot: { width: 6, height: 6, borderRadius: '50%', boxShadow: '0 0 6px currentColor' },
  iconBtn: {
    all: 'unset', cursor: 'pointer',
    width: 28, height: 28, borderRadius: 6,
    display: 'grid', placeItems: 'center',
    color: '#4a5168', fontSize: 14,
    background: 'rgba(255,255,255,0.03)',
  },
  body: {
    flex: 1, padding: '28px 32px', overflowY: 'auto', minHeight: 0,
    animation: 'ovFadeUp 0.35s ease-out',
  },
  title: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 36, letterSpacing: '-0.03em',
    margin: '0 0 6px',
  },
  sub: {
    fontSize: 13, color: '#94a3b8',
    margin: '0 0 28px', fontFamily: FONT_MONO,
  },
  stats: {
    display: 'grid', gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    marginBottom: 22,
  },
  stat: {
    background: 'rgba(10, 14, 24, 0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 18,
    backdropFilter: 'blur(14px)',
  },
  statLabel: {
    fontFamily: FONT_TECH, fontSize: 9,
    letterSpacing: '0.28em', textTransform: 'uppercase',
    color: '#94a3b8', marginBottom: 8,
  },
  statValue: {
    fontFamily: FONT_DISP, fontWeight: 800, fontSize: 30,
    letterSpacing: '-0.03em', lineHeight: 1,
  },
  statDelta: {
    fontFamily: FONT_MONO, fontSize: 11, marginTop: 6, color: '#58e0a8',
  },

  grid2: {
    display: 'grid', gap: 18,
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
    alignItems: 'start',
  },

  panel: {
    position: 'relative',
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: 14, padding: 20,
    backdropFilter: 'blur(16px) saturate(1.15)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 0 1px rgba(77,230,240,0.04)',
  },
  panelHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  panelTitle: {
    fontFamily: FONT_TECH, fontSize: 11,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: '#94a3b8',
  },
  tinyPill: {
    fontFamily: FONT_MONO, fontSize: 9,
    padding: '3px 8px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.11)',
    color: '#94a3b8', letterSpacing: '0.05em',
  },

  activity: { display: 'flex', flexDirection: 'column' },
  act: {
    display: 'grid', gridTemplateColumns: '36px 1fr auto',
    gap: 12, padding: 10, borderRadius: 10,
    transition: 'background 0.15s',
    alignItems: 'center',
  },
  actIc: {
    width: 32, height: 32, borderRadius: 8,
    display: 'grid', placeItems: 'center',
    fontSize: 14,
  },
  actTitle: { fontSize: 13, color: '#f1f5f9', fontFamily: FONT_MONO },
  actMeta: {
    fontSize: 11, color: '#94a3b8', marginTop: 2,
    fontFamily: FONT_MONO,
  },
  actTs: {
    fontSize: 10, color: '#4a5168',
    alignSelf: 'center', fontFamily: FONT_MONO,
  },
  code: {
    background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3,
    fontFamily: FONT_MONO, fontSize: 11.5,
  },

  quick: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  quickBtn: {
    all: 'unset', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: 14, borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.15s',
  },
  quickIc: { fontSize: 18, color: '#4de6f0' },
  quickLb: { fontSize: 12, color: '#f1f5f9', fontFamily: FONT_MONO },
  quickSb: { fontSize: 10, color: '#94a3b8', fontFamily: FONT_MONO },

  footHint: {
    position: 'absolute', bottom: 8, right: 16,
    fontSize: 10, color: '#4a5168', fontFamily: FONT_MONO,
  },
};
