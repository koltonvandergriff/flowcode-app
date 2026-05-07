import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;
const fb = FONTS.body;

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function GitHubPanel({ open, onToggle }) {
  const { colors } = useTheme();
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('repos');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoData, setRepoData] = useState({ prs: [], issues: [], files: [], branches: [] });
  const [filePath, setFilePath] = useState('');
  const [repoTab, setRepoTab] = useState('files');

  const loadUser = useCallback(async () => {
    const data = await window.flowade?.github.user();
    if (data?.error) { setError(data.error); return; }
    setUser(data);
    setError(null);
  }, []);

  const loadRepos = useCallback(async () => {
    setLoading(true);
    const data = await window.flowade?.github.repos({});
    setLoading(false);
    if (data?.error) { setError(data.error); return; }
    setRepos(Array.isArray(data) ? data : []);
  }, []);

  const openRepo = useCallback(async (r) => {
    const owner = r.owner?.login || r.full_name?.split('/')[0];
    const name = r.name;
    setSelectedRepo({ owner, name, full_name: r.full_name || `${owner}/${name}`, description: r.description, language: r.language, stars: r.stargazers_count, default_branch: r.default_branch });
    setView('repo');
    setRepoTab('files');
    setFilePath('');
    setLoading(true);

    const [files, prs, issues] = await Promise.all([
      window.flowade?.github.contents({ owner, repo: name, path: '' }),
      window.flowade?.github.prs({ owner, repo: name }),
      window.flowade?.github.issues({ owner, repo: name }),
    ]);

    setRepoData({
      files: Array.isArray(files) ? files.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      }) : [],
      prs: Array.isArray(prs) ? prs : [],
      issues: Array.isArray(issues) ? issues : [],
    });
    setLoading(false);
  }, []);

  const navigateFiles = useCallback(async (path) => {
    if (!selectedRepo) return;
    setFilePath(path);
    setLoading(true);
    const files = await window.flowade?.github.contents({ owner: selectedRepo.owner, repo: selectedRepo.name, path });
    setRepoData(prev => ({
      ...prev,
      files: Array.isArray(files) ? files.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      }) : [],
    }));
    setLoading(false);
  }, [selectedRepo]);

  const goBack = () => {
    if (filePath) {
      const parent = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
      navigateFiles(parent);
    } else {
      setView('repos');
      setSelectedRepo(null);
    }
  };

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => { if (user && view === 'repos') loadRepos(); }, [user, view, loadRepos]);

  const sectionHeader = (label, count) => (
    <div style={{
      fontSize: 11, fontWeight: 700, color: colors.text.secondary, fontFamily: fb,
      padding: '10px 12px 6px', letterSpacing: 0.3,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
          background: (colors.accent.primary || colors.accent.purple) + '15',
          color: colors.accent.primary || colors.accent.purple, fontFamily: fc,
        }}>{count}</span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: `1px solid ${colors.border.subtle}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {view === 'repo' && (
            <button onClick={goBack} style={{
              all: 'unset', cursor: 'pointer', fontSize: 14, color: colors.text.dim,
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}>←</button>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.text.primary} style={{ flexShrink: 0 }}>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary, fontFamily: fb, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {view === 'repo' && selectedRepo ? selectedRepo.name : 'GitHub'}
          </span>
          {user && view === 'repos' && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 8,
              background: (colors.accent.secondary || colors.accent.green) + '15',
              color: colors.accent.secondary || colors.accent.green, fontFamily: fc, fontWeight: 600, flexShrink: 0,
            }}>{user.login}</span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !user && (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: colors.status.error, fontFamily: fc, marginBottom: 10 }}>Not connected</div>
          <div style={{ fontSize: 12, color: colors.text.dim, fontFamily: fb, lineHeight: 1.5 }}>
            Add your GitHub PAT in<br />Settings → GitHub
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: colors.text.ghost, fontSize: 12, fontFamily: fc }}>
          Loading...
        </div>
      )}

      {/* === REPOS LIST === */}
      {!loading && view === 'repos' && user && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {sectionHeader('Repositories', repos.length)}
          {repos.map(r => (
            <div key={r.id} onClick={() => openRepo(r)}
              style={{
                padding: '10px 12px', margin: '0 8px 4px', borderRadius: 8, cursor: 'pointer',
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent.primary || colors.accent.purple; e.currentTarget.style.background = colors.bg.overlay || colors.bg.surface; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.background = colors.bg.surface; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary, fontFamily: fc }}>
                  {r.name}
                </span>
                {r.private && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: colors.accent.amber + '15', color: colors.accent.amber, fontFamily: fc, fontWeight: 600 }}>private</span>
                )}
              </div>
              {r.description && (
                <div style={{ fontSize: 11, color: colors.text.secondary, fontFamily: fb, marginBottom: 4, lineHeight: 1.4 }}>
                  {r.description.length > 80 ? r.description.slice(0, 80) + '...' : r.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: colors.text.dim, fontFamily: fc }}>
                {r.language && <span style={{ color: colors.accent.cyan }}>{r.language}</span>}
                <span>⭐ {r.stargazers_count}</span>
                <span>{timeAgo(r.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === REPO DETAIL === */}
      {!loading && view === 'repo' && selectedRepo && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Repo info */}
          {selectedRepo.description && (
            <div style={{ padding: '8px 12px', fontSize: 11, color: colors.text.secondary, fontFamily: fb, lineHeight: 1.4, borderBottom: `1px solid ${colors.border.subtle}` }}>
              {selectedRepo.description}
            </div>
          )}
          <div style={{ padding: '6px 12px', display: 'flex', gap: 12, fontSize: 10, color: colors.text.dim, fontFamily: fc, borderBottom: `1px solid ${colors.border.subtle}`, flexShrink: 0 }}>
            {selectedRepo.language && <span style={{ color: colors.accent.cyan }}>{selectedRepo.language}</span>}
            <span>⭐ {selectedRepo.stars}</span>
            <span>{selectedRepo.default_branch}</span>
          </div>

          {/* Repo tabs */}
          <div style={{ display: 'flex', padding: '6px 8px', gap: 2, flexShrink: 0 }}>
            {[
              { id: 'files', label: 'Files', count: repoData.files.length },
              { id: 'prs', label: 'PRs', count: repoData.prs.length },
              { id: 'issues', label: 'Issues', count: repoData.issues.length },
            ].map(t => (
              <button key={t.id} onClick={() => setRepoTab(t.id)} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                fontSize: 11, fontWeight: 600, padding: '7px 0', borderRadius: 6, fontFamily: fc,
                background: repoTab === t.id ? (colors.accent.primary || colors.accent.purple) + '15' : 'transparent',
                color: repoTab === t.id ? (colors.accent.primary || colors.accent.purple) : colors.text.dim,
                transition: 'all .15s',
              }}>
                {t.label} {t.count > 0 && <span style={{ fontSize: 9, opacity: 0.7 }}>({t.count})</span>}
              </button>
            ))}
          </div>

          {/* File path breadcrumb */}
          {repoTab === 'files' && filePath && (
            <div style={{ padding: '4px 12px 6px', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
              <button onClick={() => navigateFiles('')} style={{
                all: 'unset', cursor: 'pointer', fontSize: 11, color: colors.accent.primary || colors.accent.cyan, fontFamily: fc,
              }}>root</button>
              {filePath.split('/').map((part, i, arr) => {
                const path = arr.slice(0, i + 1).join('/');
                return (
                  <span key={path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: colors.text.ghost, fontSize: 10 }}>/</span>
                    <button onClick={() => navigateFiles(path)} style={{
                      all: 'unset', cursor: 'pointer', fontSize: 11, fontFamily: fc,
                      color: i === arr.length - 1 ? colors.text.primary : (colors.accent.primary || colors.accent.cyan),
                    }}>{part}</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }}>
            {/* FILES */}
            {repoTab === 'files' && repoData.files.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: colors.text.ghost, fontSize: 12, fontFamily: fb }}>
                Empty directory
              </div>
            )}
            {repoTab === 'files' && repoData.files.map(f => (
              <button key={f.name}
                onClick={() => f.type === 'dir' ? navigateFiles(f.path) : null}
                style={{
                  all: 'unset', cursor: f.type === 'dir' ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 12px', width: '100%', boxSizing: 'border-box',
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => { if (f.type === 'dir') e.currentTarget.style.background = colors.bg.overlay || colors.bg.surface; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13, flexShrink: 0, width: 18, textAlign: 'center' }}>
                  {f.type === 'dir' ? '📁' : '📄'}
                </span>
                <span style={{ fontSize: 12, color: f.type === 'dir' ? (colors.accent.primary || colors.accent.cyan) : colors.text.primary, fontFamily: fc, fontWeight: f.type === 'dir' ? 600 : 400 }}>
                  {f.name}
                </span>
                {f.size > 0 && f.type !== 'dir' && (
                  <span style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc, marginLeft: 'auto' }}>
                    {f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}
                  </span>
                )}
              </button>
            ))}

            {/* PRS */}
            {repoTab === 'prs' && repoData.prs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: colors.text.ghost, fontSize: 12, fontFamily: fb }}>
                No open pull requests
              </div>
            )}
            {repoTab === 'prs' && repoData.prs.map(pr => (
              <div key={pr.id} style={{
                padding: '10px 12px', margin: '0 8px 4px', borderRadius: 8,
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: pr.draft ? colors.text.ghost + '20' : (colors.accent.secondary || colors.accent.green) + '15',
                    color: pr.draft ? colors.text.ghost : (colors.accent.secondary || colors.accent.green),
                    fontFamily: fc, flexShrink: 0, marginTop: 2,
                  }}>{pr.draft ? 'draft' : 'open'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily: fc, lineHeight: 1.4 }}>
                      {pr.title}
                    </div>
                    <div style={{ fontSize: 10, color: colors.text.dim, fontFamily: fc, marginTop: 4 }}>
                      #{pr.number} by {pr.user?.login} · {timeAgo(pr.updated_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ISSUES */}
            {repoTab === 'issues' && repoData.issues.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: colors.text.ghost, fontSize: 12, fontFamily: fb }}>
                No open issues
              </div>
            )}
            {repoTab === 'issues' && repoData.issues.map(issue => (
              <div key={issue.id} style={{
                padding: '10px 12px', margin: '0 8px 4px', borderRadius: 8,
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>
                    {issue.state === 'open' ? '🟢' : '🟣'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily: fc, lineHeight: 1.4 }}>
                      {issue.title}
                    </div>
                    <div style={{ fontSize: 10, color: colors.text.dim, fontFamily: fc, marginTop: 4 }}>
                      #{issue.number} · {timeAgo(issue.updated_at)}
                      {issue.comments > 0 && ` · 💬 ${issue.comments}`}
                      {issue.assignee && ` · ${issue.assignee.login}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
