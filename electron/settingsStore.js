import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const DEFAULTS = {
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
  defaultProvider: 'claude',
  defaultCwd: '',
  fontSize: 13,
  theme: 'dark',
  promptTemplates: [
    { id: 'tpl-1', name: 'Code Review', category: 'Review', content: 'Review this code for bugs, security issues, and best practices. Suggest improvements.' },
    { id: 'tpl-2', name: 'Explain Code', category: 'Understanding', content: 'Explain what this code does step by step.' },
    { id: 'tpl-3', name: 'Write Tests', category: 'Testing', content: 'Write comprehensive unit tests for this code including edge cases.' },
    { id: 'tpl-4', name: 'Refactor', category: 'Improvement', content: 'Refactor this code to be more readable, maintainable, and efficient.' },
    { id: 'tpl-5', name: 'Fix Bug', category: 'Debug', content: 'There is a bug in this code. Help me find and fix it. Explain what went wrong.' },
    { id: 'tpl-6', name: 'Add Feature', category: 'Build', content: 'I want to add a new feature. Here is what it should do:' },
    { id: 'tpl-7', name: 'Optimize', category: 'Improvement', content: 'Optimize this code for performance. Identify bottlenecks and suggest faster alternatives.' },
    { id: 'tpl-8', name: 'Document', category: 'Docs', content: 'Add clear documentation and comments to this code. Include usage examples.' },
  ],
};

export class SettingsStore {
  constructor() {
    const dataDir = join(app.getPath('userData'), 'flowcode-data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    this.filePath = join(dataDir, 'settings.json');
    this.cache = this._load();
  }

  _load() {
    try {
      const data = JSON.parse(readFileSync(this.filePath, 'utf8'));
      return { ...DEFAULTS, ...data };
    } catch {
      return { ...DEFAULTS };
    }
  }

  _save() {
    writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  getAll() {
    return { ...this.cache };
  }

  get(key) {
    return this.cache[key] ?? DEFAULTS[key];
  }

  set(key, value) {
    this.cache[key] = value;
    this._save();
  }
}
