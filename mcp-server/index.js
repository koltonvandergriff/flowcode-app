#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = process.env.FLOWADE_DATA_DIR || join(
  process.platform === 'win32'
    ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'flowade')
    : process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support', 'flowade')
      : join(homedir(), '.config', 'flowade'),
  'flowade-data'
);

const WORKSPACES_DIR = join(DATA_DIR, 'workspaces');
const MEMORY_DIR = join(DATA_DIR, 'memory');
const TASKS_FILE = join(DATA_DIR, 'tasks.json');
const STATE_FILE = join(DATA_DIR, 'session-state.json');

function ensureDirs() {
  for (const dir of [DATA_DIR, WORKSPACES_DIR, MEMORY_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

function getActiveWorkspace() {
  const state = readJson(STATE_FILE);
  if (!state?.activeWorkspaceId) return null;
  return readJson(join(WORKSPACES_DIR, `${state.activeWorkspaceId}.json`));
}

function getTasks() {
  return readJson(TASKS_FILE) || [];
}

function saveTasks(tasks) {
  writeJson(TASKS_FILE, tasks);
}

function getMemoryEntries() {
  ensureDirs();
  try {
    return readdirSync(MEMORY_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => readJson(join(MEMORY_DIR, f)))
      .filter(Boolean);
  } catch { return []; }
}

ensureDirs();

const server = new McpServer({
  name: 'flowade',
  version: '0.1.0',
});

// --- Resources ---

server.resource('workspace', 'flowade://workspace/current', async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: 'application/json',
    text: JSON.stringify(getActiveWorkspace() || { error: 'No active workspace' }, null, 2),
  }],
}));

server.resource('tasks', 'flowade://tasks', async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: 'application/json',
    text: JSON.stringify(getTasks(), null, 2),
  }],
}));

server.resource('memory', 'flowade://memory', async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: 'application/json',
    text: JSON.stringify(getMemoryEntries(), null, 2),
  }],
}));

// --- Tools ---

server.tool(
  'flowade_get_workspace',
  'Get the current active FlowADE workspace (layout, terminals, macros)',
  {},
  async () => {
    const ws = getActiveWorkspace();
    return { content: [{ type: 'text', text: JSON.stringify(ws || { error: 'No active workspace' }, null, 2) }] };
  }
);

server.tool(
  'flowade_list_workspaces',
  'List all FlowADE workspaces',
  {},
  async () => {
    try {
      const files = readdirSync(WORKSPACES_DIR).filter(f => f.endsWith('.json'));
      const workspaces = files.map(f => {
        const data = readJson(join(WORKSPACES_DIR, f));
        return data ? { id: data.id, name: data.name, terminals: data.terminals?.length || 0, layout: data.layout } : null;
      }).filter(Boolean);
      return { content: [{ type: 'text', text: JSON.stringify(workspaces, null, 2) }] };
    } catch { return { content: [{ type: 'text', text: '[]' }] }; }
  }
);

server.tool(
  'flowade_list_tasks',
  'List all tasks from the FlowADE task board',
  {},
  async () => {
    return { content: [{ type: 'text', text: JSON.stringify(getTasks(), null, 2) }] };
  }
);

server.tool(
  'flowade_create_task',
  'Create a new task on the FlowADE task board',
  { title: z.string(), column: z.enum(['todo', 'active', 'done']).default('todo') },
  async ({ title, column }) => {
    const tasks = getTasks();
    const task = { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title, column, createdAt: Date.now() };
    tasks.push(task);
    saveTasks(tasks);
    return { content: [{ type: 'text', text: `Created task: "${title}" in ${column}` }] };
  }
);

server.tool(
  'flowade_update_task',
  'Move a task to a different column or update its title',
  { id: z.string(), column: z.enum(['todo', 'active', 'done']).optional(), title: z.string().optional() },
  async ({ id, column, title }) => {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return { content: [{ type: 'text', text: `Task ${id} not found` }], isError: true };
    if (column) task.column = column;
    if (title) task.title = title;
    saveTasks(tasks);
    return { content: [{ type: 'text', text: `Updated task: "${task.title}" → ${task.column}` }] };
  }
);

server.tool(
  'flowade_delete_task',
  'Delete a task from the task board',
  { id: z.string() },
  async ({ id }) => {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    return { content: [{ type: 'text', text: `Deleted task ${id}` }] };
  }
);

server.tool(
  'flowade_read_memory',
  'Read all memory entries or filter by tag',
  { tag: z.string().optional() },
  async ({ tag }) => {
    let entries = getMemoryEntries();
    if (tag) entries = entries.filter(e => e.tags?.includes(tag));
    return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] };
  }
);

server.tool(
  'flowade_write_memory',
  'Save a memory entry (fact, decision, context) to FlowADE persistent memory',
  {
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).default([]),
    type: z.enum(['fact', 'decision', 'context', 'reference', 'note']).default('note'),
  },
  async ({ title, content, tags, type }) => {
    ensureDirs();
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const entry = { id, title, content, tags, type, createdAt: Date.now(), updatedAt: Date.now() };
    writeJson(join(MEMORY_DIR, `${id}.json`), entry);
    return { content: [{ type: 'text', text: `Saved memory: "${title}" [${type}]` }] };
  }
);

server.tool(
  'flowade_update_memory',
  'Update an existing memory entry',
  { id: z.string(), title: z.string().optional(), content: z.string().optional(), tags: z.array(z.string()).optional() },
  async ({ id, title, content, tags }) => {
    const path = join(MEMORY_DIR, `${id}.json`);
    const entry = readJson(path);
    if (!entry) return { content: [{ type: 'text', text: `Memory ${id} not found` }], isError: true };
    if (title) entry.title = title;
    if (content) entry.content = content;
    if (tags) entry.tags = tags;
    entry.updatedAt = Date.now();
    writeJson(path, entry);
    return { content: [{ type: 'text', text: `Updated memory: "${entry.title}"` }] };
  }
);

server.tool(
  'flowade_delete_memory',
  'Delete a memory entry',
  { id: z.string() },
  async ({ id }) => {
    const path = join(MEMORY_DIR, `${id}.json`);
    try { const { unlinkSync } = await import('fs'); unlinkSync(path); }
    catch { return { content: [{ type: 'text', text: `Memory ${id} not found` }], isError: true }; }
    return { content: [{ type: 'text', text: `Deleted memory ${id}` }] };
  }
);

server.tool(
  'flowade_get_project_context',
  'Get combined project context: workspace + tasks + memory (useful for onboarding a new agent)',
  {},
  async () => {
    const workspace = getActiveWorkspace();
    const tasks = getTasks();
    const memory = getMemoryEntries();
    const context = {
      workspace: workspace ? { name: workspace.name, layout: workspace.layout, terminals: workspace.terminals?.map(t => ({ label: t.label, provider: t.provider })) } : null,
      tasks: { todo: tasks.filter(t => t.column === 'todo'), active: tasks.filter(t => t.column === 'active'), done: tasks.filter(t => t.column === 'done') },
      memory: memory.map(m => ({ title: m.title, type: m.type, tags: m.tags, content: m.content })),
    };
    return { content: [{ type: 'text', text: JSON.stringify(context, null, 2) }] };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
