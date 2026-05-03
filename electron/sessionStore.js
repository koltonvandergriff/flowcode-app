import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';

export class SessionStore {
  constructor() {
    this.dataDir = join(app.getPath('userData'), 'flowcode-data');
    this.workspacesDir = join(this.dataDir, 'workspaces');
    this.stateFile = join(this.dataDir, 'session-state.json');
    this.windowFile = join(this.dataDir, 'window-bounds.json');
    this.ensureDirs();
  }

  ensureDirs() {
    if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
    if (!existsSync(this.workspacesDir)) mkdirSync(this.workspacesDir, { recursive: true });
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

  // --- Window bounds ---

  getWindowBounds() {
    return this.readJson(this.windowFile);
  }

  saveWindowBounds(bounds) {
    this.writeJson(this.windowFile, bounds);
  }

  // --- Workspaces ---

  listWorkspaces() {
    try {
      return readdirSync(this.workspacesDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const data = this.readJson(join(this.workspacesDir, f));
          return data ? { id: data.id, name: data.name, createdAt: data.createdAt, terminalCount: data.terminals?.length || 0 } : null;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  createWorkspace(name) {
    const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const workspace = {
      id,
      name,
      createdAt: Date.now(),
      terminals: [],
      layout: '2x1',
      macros: [],
    };
    this.writeJson(join(this.workspacesDir, `${id}.json`), workspace);
    return workspace;
  }

  loadWorkspace(id) {
    return this.readJson(join(this.workspacesDir, `${id}.json`));
  }

  saveWorkspace(id, data) {
    const existing = this.loadWorkspace(id) || {};
    this.writeJson(join(this.workspacesDir, `${id}.json`), { ...existing, ...data, id });
  }

  deleteWorkspace(id) {
    const path = join(this.workspacesDir, `${id}.json`);
    if (existsSync(path)) unlinkSync(path);
  }

  setActiveWorkspace(id) {
    const state = this.loadSessionState() || {};
    state.activeWorkspaceId = id;
    this.saveSessionState(state);
  }

  getActiveWorkspace() {
    const state = this.loadSessionState();
    return state?.activeWorkspaceId || null;
  }

  // --- Session state (app-level) ---

  saveSessionState(state) {
    this.writeJson(this.stateFile, { ...state, savedAt: Date.now() });
  }

  loadSessionState() {
    return this.readJson(this.stateFile);
  }
}
