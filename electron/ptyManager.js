import pty from 'node-pty';
import { platform, homedir } from 'os';
import { join, basename } from 'path';

// Only these shell binaries may be spawned. Renderer-supplied opts.shell
// is whitelisted against this list (matched by basename, case-insensitive)
// so a compromised renderer can't trick us into running e.g.
// `node -e 'process.exit(1)'` or an attacker-controlled .exe.
const ALLOWED_SHELLS = new Set([
  'powershell.exe',
  'pwsh.exe',
  'pwsh',
  'cmd.exe',
  'bash',
  'bash.exe',
  'zsh',
  'fish',
  'sh',
  'git-bash.exe',
]);

// Secrets that live in main process env should NOT be inherited by the
// child PTY. The agent running inside a pane shouldn't be able to read
// the user's ANTHROPIC_API_KEY etc. just by echoing $ANTHROPIC_API_KEY.
// We allowlist PATH + locale and drop anything matching these patterns.
const ENV_KEY_BLOCKLIST_PATTERNS = [
  /^.*_API_KEY$/i,
  /^.*_TOKEN$/i,
  /^.*_SECRET$/i,
  /^.*_PASSWORD$/i,
  /^.*_PWD$/i,
  /^OPENAI_/i,
  /^ANTHROPIC_/i,
  /^STRIPE_/i,
  /^SUPABASE_/i,
  /^GITHUB_PAT$/i,
  /^AWS_(SECRET|ACCESS)/i,
  /^GH_TOKEN$/i,
];

function buildChildEnv() {
  const out = { TERM: 'xterm-256color' };
  for (const [k, v] of Object.entries(process.env)) {
    if (ENV_KEY_BLOCKLIST_PATTERNS.some(rx => rx.test(k))) continue;
    out[k] = v;
  }
  return out;
}

function resolveShell(requested) {
  const fallback = platform() === 'win32' ? 'powershell.exe' : 'bash';
  if (!requested) return fallback;
  const leaf = basename(String(requested));
  if (ALLOWED_SHELLS.has(leaf.toLowerCase())) return requested;
  return fallback;
}

export class PtyManager {
  constructor() {
    this.terminals = new Map();
  }

  spawn(id, opts = {}) {
    if (this.terminals.has(id)) {
      return { id, pid: this.terminals.get(id).pty.pid, existing: true };
    }

    const shell = resolveShell(opts.shell);
    const term = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: opts.cols || 120,
      rows: opts.rows || 30,
      cwd: opts.cwd || join(homedir(), 'Desktop', 'Claude'),
      env: buildChildEnv(),
    });

    const entry = {
      pty: term,
      dataCallbacks: [],
      exitCallbacks: [],
      scrollback: '',
    };

    term.onData((data) => {
      entry.scrollback += data;
      if (entry.scrollback.length > 50000) entry.scrollback = entry.scrollback.slice(-40000);
      entry.dataCallbacks.forEach((cb) => cb(data));
    });

    term.onExit(({ exitCode }) => {
      entry.exitCallbacks.forEach((cb) => cb(exitCode));
      this.terminals.delete(id);
    });

    this.terminals.set(id, entry);
    return { id, pid: term.pid, existing: false };
  }

  write(id, data) {
    this.terminals.get(id)?.pty.write(data);
  }

  resize(id, cols, rows) {
    try {
      this.terminals.get(id)?.pty.resize(cols, rows);
    } catch {}
  }

  kill(id) {
    const entry = this.terminals.get(id);
    if (entry) {
      entry.pty.kill();
      this.terminals.delete(id);
    }
  }

  killAll() {
    for (const [id] of this.terminals) {
      this.kill(id);
    }
  }

  getScrollback(id) {
    return this.terminals.get(id)?.scrollback || '';
  }

  onData(id, callback) {
    this.terminals.get(id)?.dataCallbacks.push(callback);
  }

  onExit(id, callback) {
    this.terminals.get(id)?.exitCallbacks.push(callback);
  }

  list() {
    return Array.from(this.terminals.entries()).map(([id, entry]) => ({
      id,
      pid: entry.pty.pid,
    }));
  }
}
