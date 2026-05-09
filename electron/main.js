import { app, BrowserWindow, ipcMain, screen, dialog, Tray, Menu, nativeImage, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PtyManager } from './ptyManager.js';
import { SessionStore } from './sessionStore.js';
import { CostTracker } from './costTracker.js';
import { SettingsStore } from './settingsStore.js';
import { EnvStore } from './envStore.js';
import { HistoryStore } from './historyStore.js';
import { CrashReporter } from './crashReporter.js';
import { initAutoUpdater } from './autoUpdater.js';
import { PluginManager } from './pluginManager.js';
import { ClaudeUsageWatcher } from './claudeUsageWatcher.js';
import { MemoryStore } from './memoryStore.js';
import { TerminalNotifier } from './terminalNotifier.js';
import { setAuthSession, getAuthUser, clearAuthSession, supabase } from './supabaseClient.js';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

let mainWindow;
let splashWindow;
let tray = null;
let forceQuit = false;
const childWindows = new Map();
const ptyManager = new PtyManager();
const sessionStore = new SessionStore();
const settingsStore = new SettingsStore();
const costTracker = new CostTracker(settingsStore);
const envStore = new EnvStore();
const historyStore = new HistoryStore();
const crashReporter = new CrashReporter();
crashReporter.init();
const pluginManager = new PluginManager(settingsStore);
const claudeUsageWatcher = new ClaudeUsageWatcher(costTracker, settingsStore);
const memoryStore = new MemoryStore();
memoryStore.setOnChange(() => {
  mainWindow?.webContents.send('memory:changed');
  for (const [, win] of childWindows) {
    if (!win.isDestroyed()) win.webContents.send('memory:changed');
  }
});
memoryStore.setOnStatusChange((status) => {
  mainWindow?.webContents.send('memory:status', status);
  for (const [, win] of childWindows) {
    if (!win.isDestroyed()) win.webContents.send('memory:status', status);
  }
});
const terminalNotifier = new TerminalNotifier(envStore, (event) => {
  mainWindow?.webContents.send('notify:event', event);
});

(async () => {
  // Wait for the keychain to populate the in-memory secret cache so that
  // envStore.get() returns real values everywhere it's called synchronously.
  try { await envStore.whenReady(); } catch {}
  try {
    const user = await getAuthUser();
    if (user) {
      memoryStore.setUserId(user.id);
      console.log('[Auth] Restored session for user:', user.id);
    }
  } catch {}
})();

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const bounds = sessionStore.getWindowBounds() || {
    width: Math.min(1600, width),
    height: Math.min(1000, height),
  };

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    title: 'FlowADE',
    icon: join(__dirname, '..', 'public', 'icon.png'),
    backgroundColor: '#161729',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1b32',
      symbolColor: '#6a6b85',
      height: 38,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  const savedBounds = sessionStore.getWindowBounds();
  if (!savedBounds) mainWindow.maximize();

  const freshMode = process.argv.includes('--fresh') || process.env.FLOWADE_FRESH === '1';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173' + (freshMode ? '?fresh=1' : ''));
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'), freshMode ? { query: { fresh: '1' } } : {});
  }

  // When main window is ready, fade out splash then show main window
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      // Trigger CSS fade-out animation
      splashWindow.webContents.executeJavaScript('window.fadeOut && window.fadeOut()').catch(() => {});
      // Wait for the fade animation (400ms) then close splash and show main
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
        mainWindow.show();
      }, 450);
    } else {
      mainWindow.show();
    }

    // Initialize auto-updater after the window is visible
    initAutoUpdater(mainWindow);
  });

  mainWindow.on('close', (e) => {
    sessionStore.saveWindowBounds(mainWindow.getBounds());
    if (!forceQuit) {
      e.preventDefault();
      mainWindow?.webContents.send('app:beforeClose');
      mainWindow?.hide();
      return;
    }
    // Close all child popout windows
    for (const [id, win] of childWindows) {
      if (!win.isDestroyed()) win.close();
    }
    childWindows.clear();
    ptyManager.killAll();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // On focus, re-check tier (catches upgrades) and drain — cheap event-driven
  // catch-up instead of a recurring timer. fetchTier respects 5min TTL.
  mainWindow.on('focus', async () => {
    try {
      await memoryStore.fetchTier();
      await memoryStore.drain();
    } catch {}
  });
}

// --- MCP Config ---

function ensureMcpConfig(cwd) {
  try {
    const mcpPath = join(cwd, '.mcp.json');
    const mcpServerScript = join(__dirname, '..', 'mcp-server', 'index.js').replace(/\\/g, '/');

    let config = {};
    if (existsSync(mcpPath)) {
      try { config = JSON.parse(readFileSync(mcpPath, 'utf8')); } catch {}
    }

    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers.flowade = {
      command: 'node',
      args: [mcpServerScript],
    };

    writeFileSync(mcpPath, JSON.stringify(config, null, 2), 'utf8');

    // Auto-allow FlowADE MCP tools so Claude doesn't prompt each time
    const claudeDir = join(cwd, '.claude');
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, 'settings.json');

    let settings = {};
    if (existsSync(settingsPath)) {
      try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch {}
    }

    if (!settings.permissions) settings.permissions = {};
    if (!Array.isArray(settings.permissions.allow)) settings.permissions.allow = [];

    const mcpPattern = 'mcp__flowade__*';
    if (!settings.permissions.allow.includes(mcpPattern)) {
      settings.permissions.allow.push(mcpPattern);
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[MCP] Failed to write MCP config:', err.message);
  }
}

// --- Terminal IPC ---

ipcMain.handle('terminal:spawn', (_, opts) => {
  const id = opts.id || `term-${Date.now()}`;

  if (opts.provider === 'claude' || opts.provider === 'aider') {
    const spawnCwd = opts.cwd || join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'Claude');
    ensureMcpConfig(spawnCwd);
  }

  const info = ptyManager.spawn(id, opts);

  if (!info.existing) {
    terminalNotifier.registerTerminal(id, { label: opts.label || id, workspace: opts.workspace || 'Default' });

    ptyManager.onData(id, (data) => {
      mainWindow?.webContents.send('terminal:data', { id, data });
      for (const [, win] of childWindows) {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:data', { id, data });
        }
      }
      terminalNotifier.processOutput(id, data);
    });

    ptyManager.onExit(id, (exitCode) => {
      mainWindow?.webContents.send('terminal:exit', { id, exitCode });
      for (const [, win] of childWindows) {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:exit', { id, exitCode });
        }
      }
      terminalNotifier.processExit(id, exitCode);
    });
  }

  info.scrollback = info.existing ? ptyManager.getScrollback(id) : '';
  return info;
});

ipcMain.on('terminal:write', (_, { id, data }) => {
  ptyManager.write(id, data);
});

ipcMain.on('terminal:resize', (_, { id, cols, rows }) => {
  ptyManager.resize(id, cols, rows);
});

ipcMain.on('terminal:kill', (_, { id }) => {
  ptyManager.kill(id);
});

ipcMain.handle('terminal:list', () => {
  return ptyManager.list();
});

// --- Notification IPC ---

ipcMain.handle('notify:registerToken', (_, token) => {
  terminalNotifier.registerPushToken(token);
});
ipcMain.handle('notify:removeToken', (_, token) => {
  terminalNotifier.removePushToken(token);
});
ipcMain.handle('notify:getTokens', () => {
  return terminalNotifier.getPushTokens();
});
ipcMain.handle('notify:setEnabled', (_, enabled) => {
  terminalNotifier.setEnabled(enabled);
});
ipcMain.handle('notify:updateTerminalMeta', (_, { id, label, workspace }) => {
  terminalNotifier.updateTerminalMeta(id, { label, workspace });
});

// --- Workspace IPC ---

ipcMain.handle('workspace:list', () => sessionStore.listWorkspaces());
ipcMain.handle('workspace:create', (_, name) => sessionStore.createWorkspace(name));
ipcMain.handle('workspace:load', (_, id) => sessionStore.loadWorkspace(id));
ipcMain.handle('workspace:save', (_, { id, data }) => sessionStore.saveWorkspace(id, data));
ipcMain.handle('workspace:delete', (_, id) => sessionStore.deleteWorkspace(id));
ipcMain.handle('workspace:setActive', (_, id) => sessionStore.setActiveWorkspace(id));
ipcMain.handle('workspace:getActive', () => sessionStore.getActiveWorkspace());

// --- Session state IPC ---

ipcMain.handle('session:save', (_, state) => sessionStore.saveSessionState(state));
ipcMain.handle('session:load', () => sessionStore.loadSessionState());

// --- Auth IPC ---

ipcMain.handle('auth:setSession', async (_, { accessToken, refreshToken }) => {
  try {
    await setAuthSession(accessToken, refreshToken);
    const user = await getAuthUser();
    if (user) {
      memoryStore.setUserId(user.id);
      console.log('[Auth] Session set for user:', user.id);
    }
    return { success: true, userId: user?.id };
  } catch (err) {
    console.error('[Auth] setSession failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('auth:getUser', async () => {
  return await getAuthUser();
});

ipcMain.handle('auth:getSubscription', async () => {
  const user = await getAuthUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, subscription_expires_at')
    .eq('id', user.id)
    .single();
  if (error) { console.error('[Auth] getSubscription error:', error.message); return null; }
  return data;
});

ipcMain.handle('auth:logout', async () => {
  await clearAuthSession();
  memoryStore.setUserId('dev-logged-out');
  console.log('[Auth] Session cleared');
});

// --- Cost tracking IPC ---

ipcMain.handle('cost:getUsage', () => costTracker.getUsage());
ipcMain.on('cost:track', (_, data) => costTracker.track(data));
ipcMain.handle('cost:getHistory', (_, range) => costTracker.getHistory(range));
ipcMain.handle('cost:getRawHistory', (_, range) => costTracker.getRawHistory(range));

// --- Claude Usage Watcher IPC ---

ipcMain.handle('usage:getStats', () => claudeUsageWatcher.getStats());
ipcMain.handle('usage:getRetention', () => claudeUsageWatcher.getRetentionDays());
ipcMain.handle('usage:setRetention', (_, days) => claudeUsageWatcher.setRetentionDays(days));
ipcMain.handle('usage:prune', () => claudeUsageWatcher.pruneOldEntries());
ipcMain.handle('usage:pruneCursors', () => claudeUsageWatcher.pruneStaleCursors());
ipcMain.handle('usage:getBillingResetDay', () => settingsStore.get('billingResetDay') || 1);
ipcMain.handle('usage:setBillingResetDay', (_, day) => settingsStore.set('billingResetDay', day));

// --- Settings IPC ---

ipcMain.handle('settings:getAll', () => settingsStore.getAll());
ipcMain.handle('settings:get', (_, key) => settingsStore.get(key));
ipcMain.handle('settings:set', (_, { key, value }) => settingsStore.set(key, value));

// --- Env (local credentials) IPC ---

ipcMain.handle('env:getAll', async () => { await envStore.whenReady(); return envStore.getAll(); });
ipcMain.handle('env:get', async (_, key) => { await envStore.whenReady(); return envStore.get(key); });
ipcMain.handle('env:set', async (_, { key, value }) => { await envStore.whenReady(); envStore.set(key, value); });
ipcMain.handle('env:setMany', async (_, pairs) => { await envStore.whenReady(); envStore.setMany(pairs); });
ipcMain.handle('env:has', async (_, key) => { await envStore.whenReady(); return envStore.has(key); });

// --- History IPC ---

ipcMain.handle('history:save', (_, session) => historyStore.save(session));
ipcMain.handle('history:list', () => historyStore.list());
ipcMain.handle('history:load', (_, id) => historyStore.load(id));
ipcMain.handle('history:delete', (_, id) => historyStore.delete(id));
ipcMain.handle('history:export', (_, { id, format }) => historyStore.exportAs(id, format));

// --- Crash reporting IPC ---

ipcMain.handle('crash:getLogs', (_, count) => crashReporter.getRecentLogs(count || 50));
ipcMain.handle('crash:report', (_, description) => crashReporter.generateReport(description));
ipcMain.handle('crash:log', (_, { level, message, meta }) => crashReporter.log(level, message, meta));

// --- Plugin IPC ---

ipcMain.handle('plugins:list', () => pluginManager.listPlugins());
ipcMain.handle('plugins:load', (_, name) => pluginManager.loadPlugin(name));
ipcMain.handle('plugins:manifest', (_, name) => pluginManager.getPluginManifest(name));
ipcMain.handle('plugins:enable', (_, name) => pluginManager.enablePlugin(name));
ipcMain.handle('plugins:disable', (_, name) => pluginManager.disablePlugin(name));
ipcMain.handle('plugins:getPath', () => pluginManager.getPluginsPath());
ipcMain.handle('plugins:openFolder', () => {
  shell.openPath(pluginManager.getPluginsPath());
});

// --- Memory IPC ---

ipcMain.handle('memory:list', (_, tag) => memoryStore.list(tag));
ipcMain.handle('memory:get', (_, id) => memoryStore.get(id));
ipcMain.handle('memory:create', async (_, entry) => {
  const created = await memoryStore.create(entry);
  // Fire-and-forget enrichment: auto-categorize + embed. Both use the user's
  // own API keys; failures are silent — the memory is still saved.
  (async () => {
    if (!created?.id || created?.error) return;
    const anthropicKey = envStore.get('ANTHROPIC_API_KEY');
    const openaiKey = envStore.get('OPENAI_API_KEY');
    try {
      if (anthropicKey) {
        const mod = await import('./memoryCategorizer.js');
        const result = await mod.runAutoCategorizeOne({ memory: created, apiKey: anthropicKey });
        if (result?.ok && result.categoryId) {
          memoryStore.update(created.id, { categoryId: result.categoryId });
        }
      }
    } catch (err) {
      console.warn('[Memory] auto-categorize failed:', err.message);
    }
    try {
      if (openaiKey) {
        const mod = await import('./memoryEmbeddings.js');
        const vec = await mod.embedMemory(created, openaiKey);
        if (vec) await mod.persistEmbedding(created.id, vec);
      }
    } catch (err) {
      console.warn('[Memory] embedding failed:', err.message);
    }
  })();
  return created;
});
ipcMain.handle('memory:update', async (_, { id, updates }) => {
  const updated = memoryStore.update(id, updates);
  // Re-embed when title/content/tags shift; skip for category-only updates.
  const shapeChange = updates && (updates.title !== undefined || updates.content !== undefined || updates.tags !== undefined);
  if (shapeChange && updated && !updated.error) {
    const openaiKey = envStore.get('OPENAI_API_KEY');
    if (openaiKey) {
      (async () => {
        try {
          const mod = await import('./memoryEmbeddings.js');
          const vec = await mod.embedMemory(updated, openaiKey);
          if (vec) await mod.persistEmbedding(updated.id, vec);
        } catch (err) {
          console.warn('[Memory] re-embed failed:', err.message);
        }
      })();
    }
  }
  return updated;
});
ipcMain.handle('memory:delete', (_, id) => memoryStore.delete(id));
ipcMain.handle('memory:search', (_, query) => memoryStore.search(query));
ipcMain.handle('memory:status', () => memoryStore.getStatus());
ipcMain.handle('memory:syncNow', async () => {
  await memoryStore.fetchTier(true); // force-refresh in case of upgrade/downgrade
  await memoryStore._fullSync();
  return memoryStore.getStatus();
});
ipcMain.handle('memory:realtimeOn', () => { memoryStore.touchRealtime(); });
ipcMain.handle('memory:realtimeOff', () => { memoryStore.disableRealtime(); });
ipcMain.handle('memory:listDeleted', () => memoryStore.listDeleted());
ipcMain.handle('memory:restore', (_, id) => memoryStore.restore(id));

// --- Memory Categories ---
import('./memoryCategories.js').then((cats) => {
  ipcMain.handle('memory:categories:list', () => cats.listCategories());
  ipcMain.handle('memory:categories:create', (_, body) => cats.createCategory(body));
  ipcMain.handle('memory:categories:update', (_, { id, patch }) => cats.updateCategory(id, patch));
  ipcMain.handle('memory:categories:delete', (_, id) => cats.deleteCategory(id));
  ipcMain.handle('memory:categories:assign', (_, { memoryId, categoryId }) =>
    cats.assignCategory(memoryId, categoryId));
  ipcMain.handle('memory:categories:persistTree', (_, tree) => cats.persistCategoryTree(tree));
});

import('./memoryCategorizer.js').then((mod) => {
  ipcMain.handle('memory:categories:aiCategorize', async (event, opts) => {
    const onProgress = (msg) => {
      try { event.sender.send('memory:categories:progress', msg); } catch {}
    };
    // Pull the API key server-side; the renderer never sees it.
    const apiKey = envStore.get('ANTHROPIC_API_KEY');
    return mod.runAiCategorize({ apiKey, model: opts?.model || 'haiku', onProgress });
  });
});

import('./memoryEmbeddings.js').then((mod) => {
  ipcMain.handle('memory:embeddings:backfill', async (event) => {
    const apiKey = envStore.get('OPENAI_API_KEY');
    const onProgress = (msg) => {
      try { event.sender.send('memory:embeddings:progress', msg); } catch {}
    };
    return mod.backfillEmbeddings({ apiKey, onProgress });
  });
  ipcMain.handle('memory:embeddings:search', async (_, { query, limit, threshold }) => {
    const apiKey = envStore.get('OPENAI_API_KEY');
    return mod.semanticSearch({ query, apiKey, limit, threshold });
  });
});

// --- Tasks (file-backed for MCP access) ---

const tasksFile = join(sessionStore.dataDir, 'tasks.json');
ipcMain.handle('tasks:list', () => {
  try { return JSON.parse(readFileSync(tasksFile, 'utf8')); }
  catch { return []; }
});
ipcMain.handle('tasks:save', (_, tasks) => {
  writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
});

// --- Dialog IPC ---

ipcMain.handle('dialog:pickFolder', async (_, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath || undefined,
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:pickImages', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
  });
  if (result.canceled) return [];
  const fs = await import('fs');
  const path = await import('path');
  return result.filePaths.map((fp) => {
    const ext = path.default.extname(fp).slice(1).toLowerCase();
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' }[ext] || 'image/png';
    const data = fs.default.readFileSync(fp);
    const b64 = data.toString('base64');
    return { dataUrl: `data:${mime};base64,${b64}`, name: path.default.basename(fp), filePath: fp };
  });
});

ipcMain.handle('dialog:saveImageTemp', async (_, { dataUrl, name }) => {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const tmpDir = path.default.join(os.default.tmpdir(), 'flowade-images');
  if (!fs.default.existsSync(tmpDir)) fs.default.mkdirSync(tmpDir, { recursive: true });
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1].split('/')[1];
  const filename = `${name || 'image'}-${Date.now()}.${ext}`;
  const filePath = path.default.join(tmpDir, filename);
  fs.default.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
  return filePath;
});

ipcMain.handle('dialog:takeScreenshot', async () => {
  const { desktopCapturer } = require('electron');
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    if (!sources.length) return null;
    const thumbnail = sources[0].thumbnail;
    const pngBuffer = thumbnail.toPNG();
    const tmpDir = path.default.join(os.default.tmpdir(), 'flowade-images');
    if (!fs.default.existsSync(tmpDir)) fs.default.mkdirSync(tmpDir, { recursive: true });
    const filename = `screenshot-${Date.now()}.png`;
    const filePath = path.default.join(tmpDir, filename);
    fs.default.writeFileSync(filePath, pngBuffer);
    const b64 = pngBuffer.toString('base64');
    return { dataUrl: `data:image/png;base64,${b64}`, name: filename, filePath };
  } catch (err) {
    console.error('[Screenshot]', err);
    return null;
  }
});

// --- Local Whisper Transcription ---
let whisperPipe = null;
let whisperLoading = false;

async function getWhisper() {
  if (whisperPipe) return whisperPipe;
  if (whisperLoading) {
    while (!whisperPipe) await new Promise(r => setTimeout(r, 500));
    return whisperPipe;
  }
  whisperLoading = true;
  console.log('[Whisper] Loading model (first time downloads ~40MB)...');
  const { pipeline } = await import('@huggingface/transformers');
  whisperPipe = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
    dtype: 'q8',
  });
  console.log('[Whisper] Model ready');
  return whisperPipe;
}

function wavToFloat32(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const headerSize = 44;
  const sampleCount = (buffer.byteLength - headerSize) / 2;
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(headerSize + i * 2, true) / 32768;
  }
  return float32;
}

ipcMain.handle('whisper:status', () => ({
  ready: !!whisperPipe,
  loading: whisperLoading && !whisperPipe,
}));

ipcMain.handle('whisper:transcribe', async (_, wavBase64) => {
  try {
    const pipe = await getWhisper();
    const buffer = Buffer.from(wavBase64, 'base64');
    const float32 = wavToFloat32(buffer);
    const result = await pipe(float32, { sampling_rate: 16000 });
    let text = result.text?.trim() || '';
    if (text && /^(.{1,4}\s*)\1{2,}$/i.test(text)) text = '';
    return { text: text || null, error: null };
  } catch (err) {
    console.error('[Whisper] Transcription error:', err.message);
    return { text: null, error: err.message };
  }
});

// --- CodeBurn Analytics IPC ---

ipcMain.handle('codeburn:report', async (_, { period }) => {
  try {
    const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const args = ['codeburn'];
    if (period === 'today') args.push('today');
    else if (period === 'month') args.push('month');
    else args.push('report', '-p', period || '7days');
    args.push('--format', 'json');
    const { stdout } = await execFileAsync(npxPath, args, {
      timeout: 30000,
      cwd: app.getPath('home'),
    });
    return JSON.parse(stdout);
  } catch (err) {
    console.error('[CodeBurn]', err.message);
    return null;
  }
});

ipcMain.handle('codeburn:optimize', async () => {
  try {
    const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const { stdout } = await execFileAsync(npxPath, ['codeburn', 'optimize', '--format', 'json'], {
      timeout: 30000,
      cwd: app.getPath('home'),
    });
    return JSON.parse(stdout);
  } catch (err) {
    console.error('[CodeBurn optimize]', err.message);
    return null;
  }
});

// --- Git IPC ---

ipcMain.handle('git:status', async (_, { cwd }) => {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd, timeout: 10000 });
    return { files: stdout.split('\n').filter(Boolean).map(line => ({ status: line.substring(0, 2).trim(), file: line.substring(3) })) };
  } catch (err) {
    return { files: [], error: err.message };
  }
});

ipcMain.handle('git:diff', async (_, { cwd, file }) => {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--', file], { cwd, timeout: 10000 });
    return { diff: stdout };
  } catch (err) {
    return { diff: '', error: err.message };
  }
});

ipcMain.handle('git:branch', async (_, { cwd }) => {
  try {
    const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd, timeout: 5000 });
    return { branch: stdout.trim() };
  } catch {
    return { branch: null };
  }
});

// --- File System IPC ---

ipcMain.handle('fs:readDir', async (_, dirPath) => {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: join(dirPath, e.name),
      size: e.isDirectory() ? 0 : (() => { try { return statSync(join(dirPath, e.name)).size; } catch { return 0; } })(),
      ext: e.isDirectory() ? '' : extname(e.name).slice(1),
    })).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch { return []; }
});

ipcMain.handle('fs:readFile', async (_, filePath) => {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (err) { throw new Error(err.message); }
});

ipcMain.handle('fs:writeFile', async (_, { filePath, content }) => {
  try {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) { throw new Error(err.message); }
});

ipcMain.handle('fs:stat', async (_, filePath) => {
  try {
    const s = statSync(filePath);
    return { size: s.size, isDirectory: s.isDirectory(), modified: s.mtime.toISOString() };
  } catch { return null; }
});

ipcMain.handle('fs:exists', async (_, filePath) => {
  return existsSync(filePath);
});

// --- GitHub API IPC ---

async function ghFetch(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FlowADE' },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`);
  return res.json();
}

ipcMain.handle('github:user', async () => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try { return await ghFetch('/user', token); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:repos', async (_, { org, page = 1, perPage = 30 }) => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try {
    const endpoint = org ? `/orgs/${org}/repos` : '/user/repos';
    return await ghFetch(`${endpoint}?sort=updated&per_page=${perPage}&page=${page}`, token);
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:prs', async (_, { owner, repo, state = 'open' }) => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try { return await ghFetch(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=20&sort=updated`, token); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:issues', async (_, { owner, repo, state = 'open' }) => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try {
    const items = await ghFetch(`/repos/${owner}/${repo}/issues?state=${state}&per_page=20&sort=updated`, token);
    return items.filter(i => !i.pull_request);
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:notifications', async () => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try { return await ghFetch('/notifications?per_page=20', token); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:repoInfo', async (_, { owner, repo }) => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try { return await ghFetch(`/repos/${owner}/${repo}`, token); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:contents', async (_, { owner, repo, path = '' }) => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try { return await ghFetch(`/repos/${owner}/${repo}/contents/${path}`, token); }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('github:branches', async (_, { owner, repo }) => {
  const token = envStore.get('GITHUB_PAT');
  if (!token) return { error: 'No GitHub PAT configured' };
  try { return await ghFetch(`/repos/${owner}/${repo}/branches?per_page=30`, token); }
  catch (err) { return { error: err.message }; }
});

// --- Window control IPC ---

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// --- Popout window IPC ---

ipcMain.handle('window:popout', (_, { terminalId, bounds }) => {
  const width = bounds?.width || 800;
  const height = bounds?.height || 600;

  const childWindow = new BrowserWindow({
    width,
    height,
    minWidth: 400,
    minHeight: 300,
    title: 'FlowADE — Terminal',
    backgroundColor: '#161729',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1b32',
      symbolColor: '#6a6b85',
      height: 38,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const queryParams = `?popout=true&terminalId=${encodeURIComponent(terminalId)}`;

  if (isDev) {
    childWindow.loadURL(`http://localhost:5173${queryParams}`);
  } else {
    childWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'), {
      search: queryParams,
    });
  }

  const winId = childWindow.id;
  childWindows.set(winId, childWindow);

  childWindow.on('closed', () => {
    childWindows.delete(winId);
  });

  return winId;
});

ipcMain.handle('window:popoutPanel', (_, { panel, bounds }) => {
  const width = bounds?.width || 900;
  const height = bounds?.height || 700;

  const childWindow = new BrowserWindow({
    width,
    height,
    minWidth: 400,
    minHeight: 300,
    title: `FlowADE — ${panel === 'code' ? 'Code Editor' : panel === 'browser' ? 'Browser' : panel}`,
    backgroundColor: '#161729',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1b32',
      symbolColor: '#6a6b85',
      height: 38,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: panel === 'browser',
    },
  });

  const queryParams = `?popout=true&panel=${encodeURIComponent(panel)}`;

  if (isDev) {
    childWindow.loadURL(`http://localhost:5173${queryParams}`);
  } else {
    childWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'), {
      search: queryParams,
    });
  }

  const winId = childWindow.id;
  childWindows.set(winId, childWindow);
  childWindow.on('closed', () => { childWindows.delete(winId); });
  return winId;
});

ipcMain.handle('window:closePopout', (_, windowId) => {
  const win = childWindows.get(windowId);
  if (win && !win.isDestroyed()) {
    win.close();
  }
  childWindows.delete(windowId);
});

// --- System Tray ---

function createTray() {
  const iconPath = join(__dirname, '..', 'public', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('FlowADE');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show FlowADE', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Settings', click: () => { mainWindow?.show(); mainWindow?.webContents.send('app:openSettings'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { forceQuit = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// --- App lifecycle ---

app.whenReady().then(() => {
  createSplashWindow();
  createTray();
  createWindow();

  claudeUsageWatcher.onUsage(() => {
    mainWindow?.webContents.send('usage:updated');
  });
  claudeUsageWatcher.start();

  // Daily prune of old usage entries (every 24h)
  setInterval(() => {
    claudeUsageWatcher.pruneOldEntries();
    claudeUsageWatcher.pruneStaleCursors();
  }, 24 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
});

app.on('before-quit', () => {
  forceQuit = true;
  claudeUsageWatcher.stop();
});

app.on('activate', () => {
  if (mainWindow) { mainWindow.show(); }
  else { createWindow(); }
});
