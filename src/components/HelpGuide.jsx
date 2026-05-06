import { useState, useMemo } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;

function buildSections(colors) {
  return [
    {
      id: 'getting-started',
      title: 'Getting Started',
      color: colors.accent.green,
      items: [
        { q: 'Creating a terminal', a: 'Click the "+ TERMINAL" button in the toolbar, or press Ctrl+T. Each terminal can run a different provider (Claude, ChatGPT, Shell, etc.).' },
        { q: 'Switching layouts', a: 'Use the layout buttons in the toolbar (1x1, 2x1, 3x1, 2x2) or press Ctrl+1 through Ctrl+4.' },
        { q: 'Setting your working directory', a: 'Click the folder icon in any terminal header to pick a working directory, or set a default in Settings.' },
        { q: 'Configuring API keys', a: 'Open Settings (Ctrl+,) > API Keys tab. Add your OpenAI, Anthropic, or other provider keys. Keys are stored locally only.' },
      ],
    },
    {
      id: 'terminals',
      title: 'Terminals',
      color: colors.accent.cyan,
      items: [
        { q: 'Terminal providers', a: 'Claude CLI: runs the Claude Code CLI. Shell: raw terminal access. ChatGPT/OpenClaw: API-based chat. Aider: runs the Aider CLI.' },
        { q: 'Renaming terminals', a: 'Double-click the terminal name in the header to rename it.' },
        { q: 'Drag to reorder', a: 'Drag terminal headers to swap their positions in the grid.' },
        { q: 'Resizing panes', a: 'Drag the dividers between terminal panes to resize them.' },
        { q: 'Input bar', a: 'Type in the input bar at the bottom of each terminal and press Enter or click Send.' },
      ],
    },
    {
      id: 'features',
      title: 'Key Features',
      color: colors.accent.purple,
      items: [
        { q: 'Voice input', a: 'Click the microphone icon in any terminal header. Speak naturally — silence detection auto-sends when you pause. Requires an OpenAI API key for Whisper transcription.' },
        { q: 'Danger mode', a: 'Toggle the danger switch in a terminal header to auto-approve permission prompts. Use with caution. Global toggle: Ctrl+Shift+D.' },
        { q: 'Context % bar', a: 'The colored bar below each terminal header shows Claude\'s context window usage. At 70% you get a warning, at 90% consider using /compact.' },
        { q: 'Quick action buttons', a: 'When a terminal detects a Y/N prompt or numbered options, clickable buttons appear below the terminal for fast responses.' },
        { q: 'Macros', a: 'The macro bar at the bottom has preset actions. Right-click custom macros to delete. Click "+ NEW" to create your own.' },
      ],
    },
    {
      id: 'panels',
      title: 'Side Panels',
      color: colors.accent.amber,
      items: [
        { q: 'Git panel', a: 'Click the git icon on the left sidebar to see changed files, branch name, and diffs.' },
        { q: 'Prompts panel', a: 'Click the document icon on the right sidebar for reusable prompt templates. Click a template to insert it into the active terminal.' },
        { q: 'Commands panel', a: 'Click the terminal icon on the right sidebar for a searchable reference of all Claude CLI commands, shortcuts, and tips.' },
      ],
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      color: colors.accent.pink,
      items: [
        { q: 'Ctrl+T', a: 'New terminal' },
        { q: 'Ctrl+W', a: 'Close active terminal' },
        { q: 'Ctrl+1 / 2 / 3 / 4', a: 'Switch to 1x1 / 2x1 / 3x1 / 2x2 layout' },
        { q: 'Ctrl+Tab', a: 'Cycle focus between terminals' },
        { q: 'Ctrl+Shift+D', a: 'Toggle global danger mode' },
        { q: 'Ctrl+,', a: 'Open settings' },
      ],
    },
    {
      id: 'workspaces',
      title: 'Workspaces',
      color: colors.status.info,
      items: [
        { q: 'What are workspaces?', a: 'Workspaces save your terminal layout, sessions, and macros. Switch between different project setups instantly.' },
        { q: 'Creating a workspace', a: 'Click the workspace name in the header and select "New Workspace". Give it a name.' },
        { q: 'Switching workspaces', a: 'Click the workspace name in the header to see all workspaces. Click one to switch.' },
        { q: 'Import/Export', a: 'Export your workspace config as JSON to share or back up. Import on another machine to replicate your setup.' },
      ],
    },
  ];
}

export default function HelpGuide({ open, onClose }) {
  const { colors } = useTheme();
  const SECTIONS = useMemo(() => buildSections(colors), [colors]);
  const [expandedSection, setExpandedSection] = useState('getting-started');
  const [search, setSearch] = useState('');

  if (!open) return null;

  const q = search.toLowerCase();
  const filtered = q
    ? SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
      })).filter((s) => s.items.length > 0)
    : SECTIONS;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, width: 580, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', flexShrink: 0,
          borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${colors.accent.purple}, ${colors.accent.cyan})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: FONTS.display, letterSpacing: 1, color: '#fff', margin: 0 }}>
                Quick Start Guide
              </h2>
            </div>
            <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim }}>✕</button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, background: colors.bg.surface,
            border: `1px solid ${colors.border.subtle}`, borderRadius: 8, padding: '8px 12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.text.ghost} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help topics..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: colors.text.secondary, fontSize: 12, fontFamily: fc,
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {filtered.map((section) => {
            const isOpen = search || expandedSection === section.id;
            return (
              <div key={section.id}>
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  style={{
                    all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: 10, width: '100%', padding: '10px 24px', boxSizing: 'border-box',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: section.color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: section.color, fontFamily: fc, letterSpacing: 1,
                    flex: 1,
                  }}>{section.title.toUpperCase()}</span>
                  <span style={{
                    fontSize: 9, color: colors.text.ghost, fontFamily: fc,
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s',
                  }}>&#9654;</span>
                </button>

                {isOpen && section.items.map((item, i) => (
                  <div key={i} style={{
                    padding: '8px 24px 8px 44px',
                    borderLeft: `2px solid ${section.color}15`, marginLeft: 28,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, fontFamily: fc, marginBottom: 3 }}>
                      {item.q}
                    </div>
                    <div style={{ fontSize: 11, color: colors.text.dim, fontFamily: fc, lineHeight: 1.5 }}>
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 12, color: colors.text.ghost, fontFamily: fc }}>
              No results found for "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${colors.border.subtle}`,
          background: colors.bg.surface, flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc }}>
            {SECTIONS.reduce((c, s) => c + s.items.length, 0)} topics across {SECTIONS.length} sections
          </span>
          <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc }}>
            FlowCode v{window.flowcode?.version || '0.1.0'}
          </span>
        </div>
      </div>
    </div>
  );
}
