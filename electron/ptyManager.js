import pty from 'node-pty';
import { platform } from 'os';

export class PtyManager {
  constructor() {
    this.terminals = new Map();
  }

  spawn(id, opts = {}) {
    if (this.terminals.has(id)) {
      return { id, pid: this.terminals.get(id).pty.pid, existing: true };
    }

    const shell = opts.shell || (platform() === 'win32' ? 'powershell.exe' : 'bash');
    const term = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: opts.cols || 120,
      rows: opts.rows || 30,
      cwd: opts.cwd || process.env.HOME || process.env.USERPROFILE,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    const entry = {
      pty: term,
      dataCallbacks: [],
      exitCallbacks: [],
    };

    term.onData((data) => {
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
