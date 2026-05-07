/**
 * Terminal Event Detector + Push Notification Sender
 *
 * Watches terminal output for significant events and sends push notifications
 * via Expo Push API. No sensitive data leaves the machine — only event summaries.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const EVENT_PATTERNS = [
  { type: 'build_success', patterns: [/built in \d/i, /compiled successfully/i, /webpack \d+\.\d+.* compiled/i, /✓ built in/i, /Build complete/i], title: 'Build Complete', icon: '✅' },
  { type: 'build_error', patterns: [/ERROR in/i, /Build failed/i, /ELIFECYCLE/, /failed to compile/i, /Module build failed/i], title: 'Build Failed', icon: '❌' },
  { type: 'test_pass', patterns: [/Tests:.*passed/i, /test suites:.*passed/i, /All tests passed/i], title: 'Tests Passed', icon: '✅' },
  { type: 'test_fail', patterns: [/Tests:.*failed/i, /FAIL\s/, /test suites:.*failed/i], title: 'Tests Failed', icon: '❌' },
  { type: 'server_start', patterns: [/localhost:\d+/i, /listening on port/i, /ready on http/i, /Server running/i], title: 'Server Started', icon: '🚀' },
  { type: 'deploy_done', patterns: [/deployed to/i, /deployment complete/i, /Published/i], title: 'Deploy Complete', icon: '🚢' },
  { type: 'install_done', patterns: [/added \d+ packages/i, /packages installed/i, /up to date/i], title: 'Install Complete', icon: '📦' },
  { type: 'crash', patterns: [/SIGKILL/, /SIGTERM/, /heap out of memory/i, /fatal error/i, /segmentation fault/i], title: 'Process Crashed', icon: '💥' },
];

export class TerminalNotifier {
  constructor(envStore, onLocalEvent) {
    this.envStore = envStore;
    this.onLocalEvent = onLocalEvent;
    this.terminals = new Map(); // id -> { label, workspace, lastEvent, startTime }
    this.enabled = true;
    this.cooldowns = new Map(); // "id:type" -> timestamp (prevent spam)
    this.cooldownMs = 30000; // 30s between same event type per terminal
  }

  registerTerminal(id, { label, workspace } = {}) {
    this.terminals.set(id, {
      label: label || id,
      workspace: workspace || 'Default',
      lastEvent: null,
      startTime: Date.now(),
    });
  }

  updateTerminalMeta(id, meta) {
    const entry = this.terminals.get(id);
    if (entry) {
      if (meta.label) entry.label = meta.label;
      if (meta.workspace) entry.workspace = meta.workspace;
    }
  }

  unregisterTerminal(id) {
    this.terminals.delete(id);
  }

  processOutput(id, data) {
    if (!this.enabled) return;
    const entry = this.terminals.get(id);
    if (!entry) return;

    const text = stripAnsi(data);

    for (const evt of EVENT_PATTERNS) {
      for (const pattern of evt.patterns) {
        if (pattern.test(text)) {
          const cooldownKey = `${id}:${evt.type}`;
          const lastFired = this.cooldowns.get(cooldownKey) || 0;
          if (Date.now() - lastFired < this.cooldownMs) return;

          this.cooldowns.set(cooldownKey, Date.now());
          entry.lastEvent = evt.type;

          const snippet = text.trim().slice(0, 100);
          this.sendNotification({
            title: `${evt.icon} ${evt.title}`,
            body: `Terminal: "${entry.label}" · Workspace: "${entry.workspace}"`,
            data: { type: evt.type, terminalId: id, snippet },
          });
          return;
        }
      }
    }
  }

  processExit(id, exitCode) {
    if (!this.enabled) return;
    const entry = this.terminals.get(id);
    if (!entry) return;

    const runtime = Math.round((Date.now() - entry.startTime) / 1000);

    if (runtime > 30) {
      const icon = exitCode === 0 ? '✅' : '❌';
      const status = exitCode === 0 ? 'finished' : `failed (code ${exitCode})`;
      this.sendNotification({
        title: `${icon} Command ${status}`,
        body: `Terminal: "${entry.label}" · Workspace: "${entry.workspace}" · ${runtime}s`,
        data: { type: 'exit', terminalId: id, exitCode, runtime },
      });
    }

    this.unregisterTerminal(id);
  }

  async sendNotification({ title, body, data }) {
    const termEntry = this.terminals.get(data.terminalId);
    if (this.onLocalEvent) {
      this.onLocalEvent({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        body,
        type: data.type,
        terminal: termEntry?.label || data.terminalId,
        workspace: termEntry?.workspace || 'Default',
        snippet: data.snippet || '',
        timestamp: Date.now(),
      });
    }

    const pushTokens = this.getPushTokens();
    if (pushTokens.length === 0) return;

    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      channelId: 'terminal-events',
    }));

    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch {}
  }

  getPushTokens() {
    try {
      const raw = this.envStore.get('EXPO_PUSH_TOKENS');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch { return []; }
  }

  registerPushToken(token) {
    const tokens = this.getPushTokens();
    if (!tokens.includes(token)) {
      tokens.push(token);
      this.envStore.set('EXPO_PUSH_TOKENS', JSON.stringify(tokens));
    }
  }

  removePushToken(token) {
    const tokens = this.getPushTokens().filter(t => t !== token);
    this.envStore.set('EXPO_PUSH_TOKENS', JSON.stringify(tokens));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}
