// Glasshouse AI Chat page — conversation list + thread + compose. Calls
// streamAnthropic / streamChatGPT from src/lib/aiChat.js, which already
// handles user keys + streaming. Conversations persist in localStorage.

import { useState, useEffect, useRef, useCallback } from 'react';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const STORAGE_KEY = 'flowade.glass.chat';
const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-haiku-4-5',  label: 'Haiku 4.5',  provider: 'anthropic' },
  { id: 'gpt-4o',            label: 'GPT-4o',     provider: 'openai' },
];

function loadConvs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch {}
  return [{
    id: 'welcome',
    title: 'Getting started',
    messages: [
      { role: 'assistant', content: 'Welcome to FlowADE AI Chat. Pick a model below and ask me anything — your API key stays in your OS keychain. I can also pull from your memory graph.' },
    ],
    updatedAt: Date.now(),
  }];
}

function saveConvs(c) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch {}
}

export default function AIChatGlasshouse() {
  const [convs, setConvs] = useState(() => loadConvs());
  const [activeId, setActiveId] = useState(() => convs[0]?.id);
  const [composer, setComposer] = useState('');
  const [model, setModel] = useState(MODELS[0].id);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState('');
  const threadRef = useRef(null);

  useEffect(() => { saveConvs(convs); }, [convs]);
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [convs, activeId]);

  const active = convs.find(c => c.id === activeId) || convs[0];

  const newConversation = useCallback(() => {
    const id = `chat-${Date.now()}`;
    setConvs(c => [{ id, title: 'New conversation', messages: [], updatedAt: Date.now() }, ...c]);
    setActiveId(id);
  }, []);

  const send = useCallback(async () => {
    const text = composer.trim();
    if (!text || streaming) return;

    const userMsg = { role: 'user', content: text };
    const placeholderId = `m-${Date.now()}`;
    const next = convs.map(c => c.id === active.id ? {
      ...c,
      title: c.title === 'New conversation' && c.messages.length === 0 ? text.slice(0, 40) : c.title,
      messages: [...c.messages, userMsg, { role: 'assistant', content: '', _id: placeholderId, streaming: true }],
      updatedAt: Date.now(),
    } : c);
    setConvs(next);
    setComposer('');
    setStreaming(true);
    setErr('');

    try {
      const apiKeyGetter = async (key) => {
        try { return await window.flowade?.env?.get?.(key); } catch { return ''; }
      };
      const { streamAnthropic, streamChatGPT } = await import('../../lib/aiChat');
      const fn = MODELS.find(m => m.id === model)?.provider === 'openai' ? streamChatGPT : streamAnthropic;
      const messages = [...active.messages.filter(m => !m.streaming), userMsg];

      let acc = '';
      for await (const evt of fn(messages, apiKeyGetter)) {
        if (evt.type === 'text') {
          acc += evt.content;
          setConvs(prev => prev.map(c => c.id !== active.id ? c : ({
            ...c,
            messages: c.messages.map(m => m._id === placeholderId ? { ...m, content: acc } : m),
          })));
        } else if (evt.type === 'error') {
          setErr(evt.content);
        }
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setStreaming(false);
      setConvs(prev => prev.map(c => c.id !== active.id ? c : ({
        ...c,
        messages: c.messages.map(m => m._id === placeholderId ? { ...m, streaming: false } : m),
      })));
    }
  }, [composer, streaming, convs, active, model]);

  const onComposerKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={s.root}>
      <div style={s.head}>
        <h1 style={s.h1}>AI Chat</h1>
        <p style={s.sub}>{model} · keys live in your OS keychain · context can pull from memory.</p>
      </div>

      <RoadmapBanner />


      <div style={s.shell}>
        <aside style={s.list}>
          <button onClick={newConversation} style={s.newBtn}>+ New conversation</button>
          {convs.map(c => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{ ...s.conv, ...(c.id === activeId ? s.convActive : null) }}
            >
              <div style={s.convTitle}>{c.title}</div>
              {c.messages.length > 0 && (
                <div style={s.convPreview}>{c.messages[c.messages.length - 1].content.slice(0, 80)}</div>
              )}
              <div style={s.convTime}>{relative(c.updatedAt)}</div>
            </div>
          ))}
        </aside>

        <section style={s.pane}>
          <div ref={threadRef} style={s.thread}>
            {(active?.messages || []).map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} streaming={m.streaming} />
            ))}
            {err && <div style={s.errBanner}>{err}</div>}
          </div>

          <div style={s.modelRow}>
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                style={{ ...s.modelChip, ...(model === m.id ? s.modelChipActive : null) }}
              >
                <span style={{ ...s.dot, background: model === m.id ? '#4de6f0' : '#94a3b8' }} />
                {m.label}
              </button>
            ))}
          </div>

          <div style={s.compose}>
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={onComposerKey}
              placeholder={streaming ? 'Streaming…' : 'Message — type / for commands · Enter to send · Shift+Enter for newline'}
              disabled={streaming}
              rows={2}
              style={s.composeInput}
            />
            <button onClick={send} disabled={streaming || !composer.trim()} style={{ ...s.sendBtn, ...(streaming ? s.sendBtnLoading : null) }}>
              {streaming ? '…' : 'Send ⏎'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function RoadmapBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('flowade.aichat.banner.dismissed') === '1'; } catch { return false; }
  });
  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem('flowade.aichat.banner.dismissed', '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div style={banner.root}>
      <div style={banner.iconWrap}>
        <span style={banner.icon}>◈</span>
      </div>
      <div style={banner.body}>
        <div style={banner.head}>
          <span style={banner.tag}>preview</span>
          <span style={banner.title}>AI Chat is the lighter cousin of Terminal</span>
        </div>
        <p style={banner.copy}>
          Today this surface streams replies through your saved Anthropic / OpenAI key — no shell, no
          file edits, no tool use. For real coding work,{' '}
          <strong style={banner.strong}>open a Terminal</strong>{' '}
          (Claude Code w/ tools is a faster path than chatting alone).
        </p>
        <p style={{ ...banner.copy, ...banner.copyDim }}>
          Coming: <strong style={banner.strong}>mobile-first</strong> companion (this is where AI Chat lives long-term),
          <strong style={banner.strong}> memory auto-pull</strong> (top-K vector matches injected each turn), and
          <strong style={banner.strong}> multi-model fan-out</strong> (Sonnet vs Haiku vs GPT side-by-side).
        </p>
      </div>
      <button onClick={dismiss} style={banner.dismiss} title="Dismiss until reset">✕</button>
    </div>
  );
}

const banner = {
  root: {
    display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 14, alignItems: 'start',
    padding: '14px 16px',
    margin: '0 0 16px',
    border: '1px solid rgba(77,230,240,0.25)',
    background:
      'linear-gradient(135deg, rgba(77,230,240,0.08), rgba(77,230,240,0.02))',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px rgba(77,230,240,0.05)',
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(77,230,240,0.12)', border: '1px solid rgba(77,230,240,0.3)',
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },
  icon: {
    color: '#4de6f0', fontSize: 14,
    fontFamily: 'var(--gh-font-display, "Outfit", sans-serif)', fontWeight: 700,
  },
  body: { minWidth: 0 },
  head: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  tag: {
    fontFamily: 'var(--gh-font-techno, "Chakra Petch", sans-serif)',
    fontWeight: 600, fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0', padding: '3px 8px', borderRadius: 4,
    border: '1px solid rgba(77,230,240,0.35)', background: 'rgba(77,230,240,0.05)',
  },
  title: {
    fontFamily: 'var(--gh-font-display, "Outfit", sans-serif)', fontWeight: 700,
    fontSize: 14, color: '#f1f5f9', letterSpacing: '-0.01em',
  },
  copy: {
    fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55,
    margin: '0 0 4px',
    fontFamily: 'var(--gh-font-mono, "JetBrains Mono", monospace)',
  },
  copyDim: { color: '#6b7a90', marginBottom: 0 },
  strong: { color: '#4de6f0', fontWeight: 600 },
  dismiss: {
    all: 'unset', cursor: 'pointer',
    width: 24, height: 24, borderRadius: 6,
    display: 'grid', placeItems: 'center',
    color: '#4a5168', fontSize: 12,
  },
};

function Bubble({ role, content, streaming }) {
  const isUser = role === 'user';
  return (
    <div style={{ ...s.msg, ...(isUser ? s.msgUser : null) }}>
      <div style={{ ...s.av, ...(isUser ? s.avUser : null) }}>{isUser ? 'KV' : 'CL'}</div>
      <div style={{ ...s.bbl, ...(isUser ? s.bblUser : null) }}>
        {content || (streaming ? <span style={{ color: '#4a5168' }}>thinking…</span> : '')}
      </div>
    </div>
  );
}

function relative(ts) {
  const d = Date.now() - ts;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

const s = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 18px', minHeight: 0 },
  head: { marginBottom: 18 },
  h1: { fontFamily: FONT_DISP, fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', margin: '0 0 6px' },
  sub: { fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: FONT_MONO },

  shell: {
    flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18,
    minHeight: 0,
  },
  list: {
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 14, padding: 12,
    backdropFilter: 'blur(14px)',
    overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  newBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 12px', marginBottom: 6,
    borderRadius: 8,
    background: 'rgba(77,230,240,0.08)',
    border: '1px solid rgba(77,230,240,0.25)',
    color: '#4de6f0',
    fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
    textAlign: 'center',
  },
  conv: {
    padding: 10, borderRadius: 8, cursor: 'pointer',
    transition: 'background 0.15s',
  },
  convActive: { background: 'rgba(77,230,240,0.06)' },
  convTitle: { fontSize: 12, color: '#f1f5f9', fontFamily: FONT_MONO },
  convPreview: { fontSize: 10, color: '#94a3b8', marginTop: 3, lineHeight: 1.4, fontFamily: FONT_MONO,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  convTime: { fontSize: 9, color: '#4a5168', marginTop: 4, fontFamily: FONT_MONO },

  pane: {
    background: 'rgba(10, 14, 24, 0.55)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 14, backdropFilter: 'blur(14px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  thread: {
    flex: 1, padding: '18px 22px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  msg: { display: 'flex', gap: 12, maxWidth: '82%' },
  msgUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  av: {
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    display: 'grid', placeItems: 'center',
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    color: '#001014',
    fontFamily: FONT_DISP, fontWeight: 700, fontSize: 11,
    boxShadow: '0 0 12px rgba(77,230,240,0.35)',
  },
  avUser: {
    background: '#6b7a90', color: '#f1f5f9',
    border: '1px solid #98a4b8', boxShadow: 'none',
  },
  bbl: {
    padding: '12px 14px', borderRadius: 14,
    fontSize: 13, lineHeight: 1.55, color: '#e8e9f0',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    fontFamily: FONT_MONO,
  },
  bblUser: {
    background: 'rgba(107,122,144,0.06)',
    border: '1px solid rgba(152,164,184,0.15)',
  },

  modelRow: {
    display: 'flex', gap: 6, padding: '8px 18px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  modelChip: {
    all: 'unset', cursor: 'pointer',
    fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8',
    fontFamily: FONT_MONO, letterSpacing: '0.05em',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  modelChipActive: {
    color: '#4de6f0',
    border: '1px solid rgba(77,230,240,0.3)',
    background: 'rgba(77,230,240,0.06)',
  },
  dot: { width: 5, height: 5, borderRadius: '50%' },

  compose: {
    padding: '12px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', gap: 10, alignItems: 'flex-end',
  },
  composeInput: {
    flex: 1, resize: 'none', minHeight: 44,
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 10, padding: '10px 12px',
    color: '#f1f5f9',
    fontFamily: FONT_MONO, fontSize: 12.5, outline: 'none',
  },
  sendBtn: {
    all: 'unset', cursor: 'pointer',
    padding: '10px 16px', borderRadius: 9,
    background: 'linear-gradient(135deg, #4de6f0, #1aa9bc)',
    color: '#001014',
    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    boxShadow: '0 8px 24px rgba(77,230,240,0.25)',
    alignSelf: 'flex-end',
  },
  sendBtnLoading: { opacity: 0.6, cursor: 'wait' },

  errBanner: {
    padding: '10px 14px', borderRadius: 8,
    background: 'rgba(255,107,107,0.08)',
    border: '1px solid rgba(255,107,107,0.3)',
    color: '#ff6b6b', fontSize: 12,
    fontFamily: FONT_MONO,
  },
};
