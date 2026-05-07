import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

export class EnvStore {
  constructor() {
    const dataDir = join(app.getPath('userData'), 'flowade-data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    this.filePath = join(dataDir, '.env');
    this.cache = this._load();
  }

  _load() {
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const vars = {};
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        vars[key] = val;
      }
      return vars;
    } catch {
      return {};
    }
  }

  _save() {
    const lines = ['# FlowADE local credentials — stored on this machine only', ''];
    const sections = {
      'AI Providers': ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENCLAW_API_KEY'],
      'GitHub': ['GITHUB_PAT', 'GITHUB_DEFAULT_ORG', 'GITHUB_DEFAULT_REPO'],
    };

    const written = new Set();
    for (const [heading, keys] of Object.entries(sections)) {
      const sectionKeys = keys.filter((k) => this.cache[k] !== undefined && this.cache[k] !== '');
      if (sectionKeys.length === 0) continue;
      lines.push(`# ${heading}`);
      for (const key of sectionKeys) {
        lines.push(`${key}="${this.cache[key]}"`);
        written.add(key);
      }
      lines.push('');
    }

    const remaining = Object.keys(this.cache).filter((k) => !written.has(k) && this.cache[k] !== '');
    if (remaining.length > 0) {
      lines.push('# Other');
      for (const key of remaining) {
        lines.push(`${key}="${this.cache[key]}"`);
      }
      lines.push('');
    }

    writeFileSync(this.filePath, lines.join('\n'), 'utf8');
  }

  getAll() {
    return { ...this.cache };
  }

  get(key) {
    return this.cache[key] || '';
  }

  set(key, value) {
    if (value === '' || value == null) {
      delete this.cache[key];
    } else {
      this.cache[key] = value;
    }
    this._save();
  }

  setMany(pairs) {
    for (const [key, value] of Object.entries(pairs)) {
      if (value === '' || value == null) {
        delete this.cache[key];
      } else {
        this.cache[key] = value;
      }
    }
    this._save();
  }

  has(key) {
    return !!this.cache[key];
  }
}
