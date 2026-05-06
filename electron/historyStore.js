import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';

const MAX_SESSIONS = 100;

export class HistoryStore {
  constructor() {
    this.dataDir = join(app.getPath('userData'), 'flowcode-data', 'history');
    this.ensureDir();
  }

  ensureDir() {
    if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
  }

  readJson(path) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return null;
    }
  }

  writeJson(path, data) {
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  }

  filePath(id) {
    return join(this.dataDir, `${id}.json`);
  }

  // --- Public methods ---

  save(session) {
    if (!session || !session.id) return null;

    const record = {
      id: session.id,
      workspaceId: session.workspaceId || null,
      terminalId: session.terminalId || null,
      label: session.label || 'Untitled Session',
      provider: session.provider || 'shell',
      startedAt: session.startedAt || Date.now(),
      endedAt: session.endedAt || Date.now(),
      lines: Array.isArray(session.lines) ? session.lines : [],
    };

    this.writeJson(this.filePath(record.id), record);
    this.prune();
    return record.id;
  }

  list() {
    try {
      const files = readdirSync(this.dataDir).filter((f) => f.endsWith('.json'));
      const sessions = [];

      for (const file of files) {
        const data = this.readJson(join(this.dataDir, file));
        if (data) {
          sessions.push({
            id: data.id,
            workspaceId: data.workspaceId,
            terminalId: data.terminalId,
            label: data.label,
            provider: data.provider,
            startedAt: data.startedAt,
            endedAt: data.endedAt,
            lineCount: Array.isArray(data.lines) ? data.lines.length : 0,
          });
        }
      }

      // Sort newest first
      sessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      return sessions;
    } catch {
      return [];
    }
  }

  load(id) {
    return this.readJson(this.filePath(id));
  }

  delete(id) {
    const path = this.filePath(id);
    if (existsSync(path)) {
      unlinkSync(path);
      return true;
    }
    return false;
  }

  exportAs(id, format = 'json') {
    const session = this.load(id);
    if (!session) return null;

    switch (format) {
      case 'markdown':
        return this.formatMarkdown(session);
      case 'text':
        return this.formatText(session);
      case 'json':
      default:
        return JSON.stringify(session, null, 2);
    }
  }

  // --- Export formatters ---

  formatMarkdown(session) {
    const startDate = new Date(session.startedAt).toLocaleString();
    const endDate = new Date(session.endedAt).toLocaleString();
    const duration = this.formatDuration(session.endedAt - session.startedAt);

    let md = `# ${session.label}\n\n`;
    md += `| Field | Value |\n|-------|-------|\n`;
    md += `| **Provider** | ${session.provider} |\n`;
    md += `| **Started** | ${startDate} |\n`;
    md += `| **Ended** | ${endDate} |\n`;
    md += `| **Duration** | ${duration} |\n`;
    if (session.workspaceId) md += `| **Workspace** | ${session.workspaceId} |\n`;
    if (session.terminalId) md += `| **Terminal** | ${session.terminalId} |\n`;
    md += `\n---\n\n## Transcript\n\n`;

    for (const line of session.lines) {
      const ts = new Date(line.timestamp).toLocaleTimeString();
      if (line.type === 'input') {
        md += `### \`[${ts}]\` Input\n\n\`\`\`\n${line.text}\n\`\`\`\n\n`;
      } else {
        md += `### \`[${ts}]\` Output\n\n\`\`\`\n${line.text}\n\`\`\`\n\n`;
      }
    }

    return md;
  }

  formatText(session) {
    const startDate = new Date(session.startedAt).toLocaleString();
    const endDate = new Date(session.endedAt).toLocaleString();
    const duration = this.formatDuration(session.endedAt - session.startedAt);

    let txt = `${session.label}\n`;
    txt += `${'='.repeat(session.label.length)}\n\n`;
    txt += `Provider:  ${session.provider}\n`;
    txt += `Started:   ${startDate}\n`;
    txt += `Ended:     ${endDate}\n`;
    txt += `Duration:  ${duration}\n`;
    if (session.workspaceId) txt += `Workspace: ${session.workspaceId}\n`;
    if (session.terminalId) txt += `Terminal:  ${session.terminalId}\n`;
    txt += `\n${'─'.repeat(60)}\n\n`;

    for (const line of session.lines) {
      const ts = new Date(line.timestamp).toLocaleTimeString();
      const prefix = line.type === 'input' ? '>' : ' ';
      txt += `[${ts}] ${prefix} ${line.text}\n`;
    }

    return txt;
  }

  formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // --- Pruning ---

  prune() {
    try {
      const files = readdirSync(this.dataDir).filter((f) => f.endsWith('.json'));
      if (files.length <= MAX_SESSIONS) return;

      // Load all with startedAt, sort oldest first
      const entries = [];
      for (const file of files) {
        const data = this.readJson(join(this.dataDir, file));
        if (data) entries.push({ file, startedAt: data.startedAt || 0 });
      }
      entries.sort((a, b) => a.startedAt - b.startedAt);

      const toRemove = entries.slice(0, entries.length - MAX_SESSIONS);
      for (const entry of toRemove) {
        const path = join(this.dataDir, entry.file);
        if (existsSync(path)) unlinkSync(path);
      }
    } catch {
      // Pruning failure is non-critical
    }
  }
}
