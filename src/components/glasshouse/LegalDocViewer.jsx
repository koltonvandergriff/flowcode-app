// Glasshouse legal-doc viewer. Renders the markdown files from
// `legal/*.md` inside the app so users never have to leave the install
// to read what they're agreeing to. The docs are inlined as raw strings
// at build time via Vite's `?raw` import suffix, so this works offline
// the moment the app launches.
//
// API:
//   <LegalDocViewer docId="tos" onClose={...} />
//
// docId must be one of the keys in DOCS below. The viewer opens as a
// centered modal over the rest of the shell, lockable by Esc or
// backdrop click.

import { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Vite inlines these as plain strings at build time — no runtime fs
// access required. If a file is missing on disk the build will fail
// loudly rather than ship a broken link.
import tosRaw      from '../../../legal/TERMS_OF_SERVICE.md?raw';
import privacyRaw  from '../../../legal/PRIVACY_POLICY.md?raw';
import aupRaw      from '../../../legal/ACCEPTABLE_USE_POLICY.md?raw';
import aiRaw       from '../../../legal/AI_OUTPUT_DISCLAIMER.md?raw';
import cookiesRaw  from '../../../legal/COOKIE_POLICY.md?raw';
import dmcaRaw     from '../../../legal/DMCA_POLICY.md?raw';
import licenseRaw  from '../../../LICENSE?raw';

const FONT_DISP = 'var(--gh-font-display, "Outfit", sans-serif)';
const FONT_TECH = 'var(--gh-font-techno, "Chakra Petch", sans-serif)';
const FONT_MONO = 'var(--gh-font-mono, "JetBrains Mono", monospace)';

const DOCS = {
  tos:     { title: 'Terms of Service',          body: tosRaw },
  privacy: { title: 'Privacy Policy',             body: privacyRaw },
  aup:     { title: 'Acceptable Use Policy',      body: aupRaw },
  ai:      { title: 'AI Output Disclaimer',       body: aiRaw },
  cookies: { title: 'Cookie & Local Storage',     body: cookiesRaw },
  dmca:    { title: 'DMCA Policy',                body: dmcaRaw },
  license: { title: 'Software License',           body: licenseRaw },
};

const MD_PLUGINS = [remarkGfm];

export default function LegalDocViewer({ docId, onClose }) {
  const doc = DOCS[docId];

  useEffect(() => {
    if (!docId) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    // Lock scroll on the underlying app while modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [docId, onClose]);

  const components = useMemo(() => ({
    h1: ({ node, ...props }) => <h1 style={md.h1} {...props} />,
    h2: ({ node, ...props }) => <h2 style={md.h2} {...props} />,
    h3: ({ node, ...props }) => <h3 style={md.h3} {...props} />,
    p:  ({ node, ...props }) => <p  style={md.p}  {...props} />,
    a:  ({ node, ...props }) => (
      <a
        {...props}
        onClick={(e) => {
          // Route external links through shell.openExternal so they open
          // in the user's default browser, not inside the Electron view.
          if (props.href && /^https?:/i.test(props.href)) {
            e.preventDefault();
            window.flowade?.shell?.openExternal?.(props.href);
          }
        }}
        style={md.a}
      />
    ),
    ul: ({ node, ...props }) => <ul style={md.ul} {...props} />,
    ol: ({ node, ...props }) => <ol style={md.ol} {...props} />,
    li: ({ node, ...props }) => <li style={md.li} {...props} />,
    blockquote: ({ node, ...props }) => <blockquote style={md.blockquote} {...props} />,
    code: ({ inline, ...props }) =>
      inline ? <code style={md.codeInline} {...props} /> : <pre style={md.codeBlock}><code {...props} /></pre>,
    table: ({ node, ...props }) => <div style={md.tableWrap}><table style={md.table} {...props} /></div>,
    th: ({ node, ...props }) => <th style={md.th} {...props} />,
    td: ({ node, ...props }) => <td style={md.td} {...props} />,
    hr: () => <hr style={md.hr} />,
    strong: ({ node, ...props }) => <strong style={md.strong} {...props} />,
  }), []);

  if (!doc) return null;

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.shell} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={s.head}>
          <div style={s.headTextWrap}>
            <div style={s.headLabel}>LEGAL DOCUMENT</div>
            <h1 style={s.title}>{doc.title}</h1>
          </div>
          <button onClick={onClose} style={s.closeBtn} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={s.body}>
          <ReactMarkdown remarkPlugins={MD_PLUGINS} components={components}>
            {doc.body}
          </ReactMarkdown>
        </div>

        <div style={s.foot}>
          <span style={s.footHint}>Esc to close · Tab to scroll</span>
          <button onClick={onClose} style={s.footDone}>Done reading</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(10px)',
    zIndex: 9000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    animation: 'ghFadeUp 180ms ease',
  },
  shell: {
    width: 'min(820px, 100%)',
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex', flexDirection: 'column',
    background: 'rgba(12, 14, 24, 0.95)',
    border: '1px solid rgba(77,230,240,0.18)',
    borderRadius: 14,
    boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
  },
  head: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  headTextWrap: { minWidth: 0 },
  headLabel: {
    fontFamily: FONT_TECH, fontSize: 9, fontWeight: 700,
    letterSpacing: '0.32em', textTransform: 'uppercase',
    color: '#4de6f0', marginBottom: 6,
  },
  title: {
    fontFamily: FONT_DISP, fontWeight: 800,
    fontSize: 22, letterSpacing: '-0.02em', margin: 0,
    color: '#f1f5f9',
  },
  closeBtn: {
    all: 'unset', cursor: 'pointer',
    width: 30, height: 30, borderRadius: 6,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'background .15s, color .15s',
  },
  body: {
    flex: 1, minHeight: 0,
    overflowY: 'auto',
    padding: '20px 28px 28px',
    color: '#c4c9d4',
    fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.7,
  },
  foot: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  footHint: {
    fontFamily: FONT_MONO, fontSize: 10,
    color: '#6b7a90', letterSpacing: '0.04em',
  },
  footDone: {
    all: 'unset', cursor: 'pointer',
    padding: '7px 16px', borderRadius: 8,
    fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.04em',
    background: 'rgba(77,230,240,0.1)',
    border: '1px solid rgba(77,230,240,0.4)',
    color: '#4de6f0',
  },
};

const md = {
  h1: { fontFamily: FONT_DISP, fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 12px', letterSpacing: '-0.02em' },
  h2: { fontFamily: FONT_DISP, fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '24px 0 10px', letterSpacing: '-0.01em' },
  h3: { fontFamily: FONT_DISP, fontSize: 14, fontWeight: 700, color: '#4de6f0', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' },
  p:  { margin: '0 0 12px', lineHeight: 1.75 },
  a:  { color: '#4de6f0', textDecoration: 'none', borderBottom: '1px dotted rgba(77,230,240,0.5)', cursor: 'pointer' },
  ul: { margin: '0 0 12px 4px', paddingLeft: 20 },
  ol: { margin: '0 0 12px 4px', paddingLeft: 20 },
  li: { margin: '4px 0', lineHeight: 1.6 },
  blockquote: {
    margin: '14px 0',
    padding: '10px 14px',
    background: 'rgba(77,230,240,0.05)',
    borderLeft: '3px solid #4de6f0',
    borderRadius: '0 6px 6px 0',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  codeInline: {
    fontFamily: FONT_MONO, fontSize: 11,
    background: 'rgba(255,255,255,0.06)',
    padding: '1px 5px', borderRadius: 3,
    color: '#88f0d8',
  },
  codeBlock: {
    fontFamily: FONT_MONO, fontSize: 11,
    background: 'rgba(0,0,0,0.4)',
    padding: '10px 12px', borderRadius: 6,
    color: '#c4c9d4',
    overflowX: 'auto', margin: '10px 0',
  },
  tableWrap: { overflowX: 'auto', margin: '12px 0' },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 11 },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    background: 'rgba(77,230,240,0.06)',
    borderBottom: '1px solid rgba(77,230,240,0.2)',
    fontFamily: FONT_TECH, fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#4de6f0', fontWeight: 700,
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#c4c9d4',
  },
  hr: { border: 'none', height: 1, background: 'rgba(255,255,255,0.08)', margin: '18px 0' },
  strong: { color: '#f1f5f9', fontWeight: 700 },
};
