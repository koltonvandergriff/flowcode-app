import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { detectSecrets } from './secretScrub.js';

const MAX_LOG_SIZE = 5 * 1024 * 1024;
const MAX_LOG_FILES = 10;

export class CrashReporter {
  constructor() {
    const dataDir = join(app.getPath('userData'), 'flowade-data', 'logs');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    this.logDir = dataDir;
    this.logPath = join(dataDir, 'flowade.log');
    this._pruneOldLogs();
  }

  _pruneOldLogs() {
    try {
      const files = readdirSync(this.logDir).filter((f) => f.endsWith('.log')).sort();
      while (files.length > MAX_LOG_FILES) {
        unlinkSync(join(this.logDir, files.shift()));
      }
    } catch {}
  }

  _rotateIfNeeded() {
    try {
      if (!existsSync(this.logPath)) return;
      const stat = statSync(this.logPath);
      if (stat.size > MAX_LOG_SIZE) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const rotated = join(this.logDir, `flowade-${ts}.log`);
        writeFileSync(rotated, readFileSync(this.logPath));
        writeFileSync(this.logPath, '');
        this._pruneOldLogs();
      }
    } catch {}
  }

  log(level, message, meta) {
    this._rotateIfNeeded();
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...(meta ? { meta } : {}),
    };
    appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }

  captureException(error) {
    this.error(error.message || String(error), {
      stack: error.stack,
      name: error.name,
    });
  }

  getRecentLogs(count = 50) {
    try {
      const raw = readFileSync(this.logPath, 'utf8');
      const lines = raw.trim().split('\n').filter(Boolean);
      return lines.slice(-count).map((l) => {
        try { return JSON.parse(l); } catch { return { ts: '', level: 'raw', message: l }; }
      });
    } catch {
      return [];
    }
  }

  /**
   * Build a JSON crash report for export to the support team.
   *
   * Every log line and the user's description run through the secret
   * scrubber before serialization — pasted API keys, JWTs, and PEM
   * blocks become `[REDACTED:<kind>]` so a user submitting a report
   * doesn't leak credentials in the process. The report also includes
   * a top-level `secretRedactions` count so the support team can see
   * that scrubbing happened.
   */
  generateReport(userDescription) {
    const logs = this.getRecentLogs(100);
    let redactionCount = 0;

    const scrubText = (s) => {
      if (typeof s !== 'string' || !s) return s;
      const { scrubbed, hits } = detectSecrets(s);
      redactionCount += hits.length;
      return scrubbed;
    };

    const safeLogs = logs.map(entry => ({
      ...entry,
      message: scrubText(entry.message),
      meta: entry.meta ? JSON.parse(scrubText(JSON.stringify(entry.meta))) : entry.meta,
    }));

    const safeUserDescription = scrubText(userDescription || '');

    const report = {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      timestamp: new Date().toISOString(),
      userDescription: safeUserDescription,
      secretRedactions: redactionCount,
      recentLogs: safeLogs,
    };
    return JSON.stringify(report, null, 2);
  }

  init() {
    process.on('uncaughtException', (err) => {
      this.captureException(err);
    });
    process.on('unhandledRejection', (reason) => {
      this.error('Unhandled rejection', { reason: String(reason) });
    });
    this.info('FlowADE started', { version: app.getVersion(), platform: process.platform });
  }
}
