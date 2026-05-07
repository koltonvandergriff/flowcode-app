import { app } from 'electron';
import { join, basename } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, watchFile, unwatchFile } from 'fs';
import { homedir } from 'os';

const DEFAULT_RETENTION_DAYS = 30;
const POLL_INTERVAL_MS = 3000;

export class ClaudeUsageWatcher {
  constructor(costTracker, settingsStore) {
    this.costTracker = costTracker;
    this.settingsStore = settingsStore;
    this.claudeDir = join(homedir(), '.claude');
    this.dataDir = join(app.getPath('userData'), 'flowade-data');
    this.usageLogFile = join(this.dataDir, 'claude_usage.jsonl');
    this.cursorFile = join(this.dataDir, 'claude_usage_cursors.json');
    this.cursors = {};
    this.watchers = new Map();
    this.pollTimer = null;
    this.listeners = [];

    if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
    this.loadCursors();
  }

  start() {
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    for (const [path] of this.watchers) {
      unwatchFile(path);
    }
    this.watchers.clear();
  }

  onUsage(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter((l) => l !== callback); };
  }

  poll() {
    const sessionFiles = this.findActiveSessionFiles();
    for (const filePath of sessionFiles) {
      this.readNewEntries(filePath);
    }
  }

  findActiveSessionFiles() {
    const files = [];
    const projectsDir = join(this.claudeDir, 'projects');
    if (!existsSync(projectsDir)) return files;

    try {
      const projects = readdirSync(projectsDir);
      const now = Date.now();
      const recentThreshold = 24 * 60 * 60 * 1000;

      for (const project of projects) {
        const projectPath = join(projectsDir, project);
        try {
          const stat = statSync(projectPath);
          if (!stat.isDirectory()) continue;

          const entries = readdirSync(projectPath);
          for (const entry of entries) {
            if (!entry.endsWith('.jsonl')) continue;
            const filePath = join(projectPath, entry);
            try {
              const fstat = statSync(filePath);
              if (now - fstat.mtimeMs < recentThreshold) {
                files.push(filePath);
              }
            } catch {}
          }
        } catch {}
      }
    } catch {}

    return files;
  }

  readNewEntries(filePath) {
    const cursor = this.cursors[filePath] || 0;
    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    if (content.length <= cursor) return;

    const newContent = content.slice(cursor);
    const lines = newContent.split('\n').filter(Boolean);
    let newUsageCount = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const usage = this.extractUsage(entry);
        if (usage) {
          this.recordUsage(usage);
          newUsageCount++;
        }
      } catch {}
    }

    this.cursors[filePath] = content.length;
    this.saveCursors();

    if (newUsageCount > 0) {
      for (const listener of this.listeners) {
        try { listener(); } catch {}
      }
    }
  }

  extractUsage(entry) {
    if (!entry?.message?.usage) return null;
    if (entry.message.role !== 'assistant') return null;

    const u = entry.message.usage;
    const inputTokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    const outputTokens = u.output_tokens || 0;
    const model = entry.message.model || 'claude-sonnet-4-6';

    return {
      timestamp: entry.timestamp || new Date().toISOString(),
      input: inputTokens,
      output: outputTokens,
      model,
      sessionId: entry.sessionId || null,
      cwd: entry.cwd || null,
    };
  }

  recordUsage(usage) {
    this.costTracker.track({
      input: usage.input,
      output: usage.output,
      model: usage.model,
      terminalId: usage.sessionId,
    });

    const logEntry = {
      t: usage.timestamp,
      i: usage.input,
      o: usage.output,
      m: usage.model,
      s: usage.sessionId,
    };

    try {
      appendFileSync(this.usageLogFile, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch {}
  }

  getRetentionDays() {
    try {
      const val = this.settingsStore?.get('usageRetentionDays');
      return typeof val === 'number' && val > 0 ? val : DEFAULT_RETENTION_DAYS;
    } catch {
      return DEFAULT_RETENTION_DAYS;
    }
  }

  setRetentionDays(days) {
    this.settingsStore?.set('usageRetentionDays', days);
  }

  pruneOldEntries() {
    if (!existsSync(this.usageLogFile)) return { removed: 0, remaining: 0 };

    const retentionDays = this.getRetentionDays();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const lines = readFileSync(this.usageLogFile, 'utf8').split('\n').filter(Boolean);
      const kept = [];
      let removed = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.t >= cutoff) {
            kept.push(line);
          } else {
            removed++;
          }
        } catch {
          removed++;
        }
      }

      writeFileSync(this.usageLogFile, kept.join('\n') + (kept.length ? '\n' : ''), 'utf8');
      return { removed, remaining: kept.length };
    } catch {
      return { removed: 0, remaining: 0 };
    }
  }

  pruneStaleCursors() {
    const changed = {};
    for (const [path, offset] of Object.entries(this.cursors)) {
      if (existsSync(path)) {
        changed[path] = offset;
      }
    }
    this.cursors = changed;
    this.saveCursors();
  }

  getStats() {
    let entries = 0;
    let sizeBytes = 0;
    try {
      if (existsSync(this.usageLogFile)) {
        const stat = statSync(this.usageLogFile);
        sizeBytes = stat.size;
        const content = readFileSync(this.usageLogFile, 'utf8');
        entries = content.split('\n').filter(Boolean).length;
      }
    } catch {}

    return {
      entries,
      sizeBytes,
      sizeHuman: sizeBytes > 1048576 ? `${(sizeBytes / 1048576).toFixed(1)} MB` : `${(sizeBytes / 1024).toFixed(0)} KB`,
      retentionDays: this.getRetentionDays(),
      watchedFiles: this.watchers.size,
      trackedFiles: Object.keys(this.cursors).length,
    };
  }

  loadCursors() {
    try {
      if (existsSync(this.cursorFile)) {
        this.cursors = JSON.parse(readFileSync(this.cursorFile, 'utf8'));
      }
    } catch {
      this.cursors = {};
    }
  }

  saveCursors() {
    try {
      writeFileSync(this.cursorFile, JSON.stringify(this.cursors), 'utf8');
    } catch {}
  }
}
