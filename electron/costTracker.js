import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';

const COST_PER_MTK = {
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
};

export class CostTracker {
  constructor(settingsStore) {
    this.settingsStore = settingsStore;
    this.dataDir = join(app.getPath('userData'), 'flowcode-data');
    this.logFile = join(this.dataDir, 'cost_log.jsonl');
    this.sessionStart = Date.now();
    this.sessionTokens = { input: 0, output: 0 };

    if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
  }

  track({ input = 0, output = 0, model = 'claude-sonnet-4-6', terminalId, workspaceId }) {
    this.sessionTokens.input += input;
    this.sessionTokens.output += output;

    const rates = COST_PER_MTK[model] || COST_PER_MTK['claude-sonnet-4-6'];
    const cost = (input / 1_000_000) * rates.input + (output / 1_000_000) * rates.output;

    const entry = {
      timestamp: new Date().toISOString(),
      input,
      output,
      model,
      cost: +cost.toFixed(6),
      terminalId,
      workspaceId,
    };

    try {
      appendFileSync(this.logFile, JSON.stringify(entry) + '\n', 'utf8');
    } catch {}
  }

  getBillingCycleStart() {
    const resetDay = this.settingsStore?.get('billingResetDay') || 1;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    if (day >= resetDay) {
      return new Date(year, month, resetDay).getTime();
    }
    return new Date(year, month - 1, resetDay).getTime();
  }

  getUsage() {
    const now = Date.now();
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const cycleStart = this.getBillingCycleStart();

    const daily = this.aggregate(startOfDay);
    const monthly = this.aggregate(cycleStart);

    return {
      session: {
        ...this.sessionTokens,
        total: this.sessionTokens.input + this.sessionTokens.output,
        uptime: Math.floor((now - this.sessionStart) / 1000),
      },
      daily,
      monthly,
      billingCycleStart: new Date(cycleStart).toISOString(),
    };
  }

  aggregate(sinceMs) {
    try {
      if (!existsSync(this.logFile)) return { input: 0, output: 0, cost: 0, total: 0, tasks: 0 };
      const cutoff = new Date(sinceMs);
      const lines = readFileSync(this.logFile, 'utf8').split('\n').filter(Boolean);
      let input = 0, output = 0, cost = 0, tasks = 0;
      for (const line of lines) {
        try {
          const r = JSON.parse(line);
          if (new Date(r.timestamp) >= cutoff) {
            input += r.input || 0;
            output += r.output || 0;
            cost += r.cost || 0;
            tasks++;
          }
        } catch {}
      }
      return { input, output, cost: +cost.toFixed(4), total: input + output, tasks };
    } catch {
      return { input: 0, output: 0, cost: 0, total: 0, tasks: 0 };
    }
  }

  getRawHistory(range = 'month') {
    try {
      if (!existsSync(this.logFile)) return [];
      const lines = readFileSync(this.logFile, 'utf8').split('\n').filter(Boolean);
      const now = Date.now();
      const rangeMs = range === 'day' ? 86400000 : range === 'week' ? 604800000 : 2592000000;
      const cutoff = new Date(now - rangeMs);

      const entries = [];
      for (const line of lines) {
        try {
          const r = JSON.parse(line);
          if (new Date(r.timestamp) >= cutoff) {
            entries.push(r);
          }
        } catch {}
      }
      return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [];
    }
  }

  getHistory(range = 'week') {
    try {
      if (!existsSync(this.logFile)) return [];
      const lines = readFileSync(this.logFile, 'utf8').split('\n').filter(Boolean);
      const now = Date.now();
      const rangeMs = range === 'day' ? 86400000 : range === 'week' ? 604800000 : 2592000000;
      const cutoff = new Date(now - rangeMs);

      const byDay = {};
      for (const line of lines) {
        try {
          const r = JSON.parse(line);
          const d = new Date(r.timestamp);
          if (d >= cutoff) {
            const key = d.toISOString().slice(0, 10);
            if (!byDay[key]) byDay[key] = { date: key, cost: 0, tokens: 0, tasks: 0 };
            byDay[key].cost += r.cost || 0;
            byDay[key].tokens += (r.input || 0) + (r.output || 0);
            byDay[key].tasks++;
          }
        } catch {}
      }
      return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      return [];
    }
  }
}
