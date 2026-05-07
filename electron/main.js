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
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';

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
const terminalNotifier = new TerminalNotifier(envStore, (event) => {
  mainWindow?.webContents.send('notify:event', event);
});

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
}

// --- Terminal IPC ---

ipcMain.handle('terminal:spawn', (_, opts) => {
  const id = opts.id || `term-${Date.now()}`;
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

ipcMain.handle('env:getAll', () => envStore.getAll());
ipcMain.handle('env:get', (_, key) => envStore.get(key));
ipcMain.handle('env:set', (_, { key, value }) => envStore.set(key, value));
ipcMain.handle('env:setMany', (_, pairs) => envStore.setMany(pairs));
ipcMain.handle('env:has', (_, key) => envStore.has(key));

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
ipcMain.handle('memory:create', (_, entry) => memoryStore.create(entry));
ipcMain.handle('memory:update', (_, { id, updates }) => memoryStore.update(id, updates));
ipcMain.handle('memory:delete', (_, id) => memoryStore.delete(id));
ipcMain.handle('memory:search', (_, query) => memoryStore.search(query));

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
  const icon = nativeImage.createEmpty();
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
