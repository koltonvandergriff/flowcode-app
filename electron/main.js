import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PtyManager } from './ptyManager.js';
import { SessionStore } from './sessionStore.js';
import { CostTracker } from './costTracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow;
const ptyManager = new PtyManager();
const sessionStore = new SessionStore();
const costTracker = new CostTracker();

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
    title: 'FlowCode',
    backgroundColor: '#161729',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1b32',
      symbolColor: '#6a6b85',
      height: 38,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', () => {
    sessionStore.saveWindowBounds(mainWindow.getBounds());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Terminal IPC ---

ipcMain.handle('terminal:spawn', (_, opts) => {
  const id = opts.id || `term-${Date.now()}`;
  const info = ptyManager.spawn(id, opts);

  ptyManager.onData(id, (data) => {
    mainWindow?.webContents.send('terminal:data', { id, data });
  });

  ptyManager.onExit(id, (exitCode) => {
    mainWindow?.webContents.send('terminal:exit', { id, exitCode });
  });

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

// --- Window control IPC ---

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// --- App lifecycle ---

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  ptyManager.killAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
