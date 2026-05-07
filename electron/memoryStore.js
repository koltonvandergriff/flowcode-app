import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';

export class MemoryStore {
  constructor() {
    this.memoryDir = join(app.getPath('userData'), 'flowcode-data', 'memory');
    this.ensureDir();
  }

  ensureDir() {
    if (!existsSync(this.memoryDir)) mkdirSync(this.memoryDir, { recursive: true });
  }

  readJson(path) {
    try { return JSON.parse(readFileSync(path, 'utf8')); }
    catch { return null; }
  }

  list(tag) {
    this.ensureDir();
    try {
      let entries = readdirSync(this.memoryDir)
        .filter(f => f.endsWith('.json'))
        .map(f => this.readJson(join(this.memoryDir, f)))
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      if (tag) entries = entries.filter(e => e.tags?.includes(tag));
      return entries;
    } catch { return []; }
  }

  get(id) {
    return this.readJson(join(this.memoryDir, `${id}.json`));
  }

  create({ title, content, tags = [], type = 'note' }) {
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const entry = { id, title, content, tags, type, createdAt: Date.now(), updatedAt: Date.now() };
    writeFileSync(join(this.memoryDir, `${id}.json`), JSON.stringify(entry, null, 2), 'utf8');
    return entry;
  }

  update(id, updates) {
    const path = join(this.memoryDir, `${id}.json`);
    const entry = this.readJson(path);
    if (!entry) return null;
    Object.assign(entry, updates, { updatedAt: Date.now() });
    writeFileSync(path, JSON.stringify(entry, null, 2), 'utf8');
    return entry;
  }

  delete(id) {
    const path = join(this.memoryDir, `${id}.json`);
    if (existsSync(path)) { unlinkSync(path); return true; }
    return false;
  }

  search(query) {
    const q = query.toLowerCase();
    return this.list().filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.content?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    );
  }
}
