// Auto-updater wrapper for FlowCode
// Wraps electron-updater with error handling and IPC integration
// Falls back to a no-op stub when electron-updater is unavailable (dev mode)

import { ipcMain } from 'electron';

let autoUpdater = null;

// Try to load electron-updater; if unavailable create a stub
try {
  const mod = await import('electron-updater');
  autoUpdater = mod.autoUpdater || mod.default?.autoUpdater || mod.default;
} catch {
  // electron-updater not installed — create a mock so the app still runs
  console.log('[AutoUpdater] electron-updater not available, using stub');
  autoUpdater = {
    _listeners: {},
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on(event, fn) {
      this._listeners[event] = fn;
    },
    checkForUpdates() {
      console.log('[AutoUpdater] Stub: checkForUpdates (no-op)');
      // Simulate "update-not-available" after a short delay
      setTimeout(() => {
        if (this._listeners['update-not-available']) {
          this._listeners['update-not-available']({});
        }
      }, 500);
      return Promise.resolve(null);
    },
    quitAndInstall() {
      console.log('[AutoUpdater] Stub: quitAndInstall (no-op)');
    },
  };
}

/**
 * Initialise the auto-updater and wire IPC events to the renderer.
 *
 * @param {Electron.BrowserWindow} mainWindow — the main application window
 *
 * IPC events sent to renderer:
 *   'update:checking'       — started checking for updates
 *   'update:available'      — { version, releaseDate, releaseNotes }
 *   'update:not-available'  — already on latest version
 *   'update:downloaded'     — { version } ready to install
 *   'update:error'          — { message }
 *   'update:progress'       — { percent, bytesPerSecond, transferred, total }
 */
export function initAutoUpdater(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // ---- Configuration ----
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Configurable update feed URL — defaults to GitHub Releases.
  // To point at a custom server, set the FLOWCODE_UPDATE_URL env var or
  // update the "publish" block in package.json.

  // ---- Updater events -> renderer IPC ----

  const send = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
    send('update:checking', {});
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info?.version);
    send('update:available', {
      version: info?.version,
      releaseDate: info?.releaseDate,
      releaseNotes: info?.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Already on latest version');
    send('update:not-available', { version: info?.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    send('update:progress', {
      percent: progress?.percent,
      bytesPerSecond: progress?.bytesPerSecond,
      transferred: progress?.transferred,
      total: progress?.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info?.version);
    send('update:downloaded', { version: info?.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err?.message || err);
    send('update:error', { message: err?.message || String(err) });
  });

  // ---- IPC handlers (renderer -> main) ----

  ipcMain.handle('update:check', () => {
    console.log('[AutoUpdater] Manual check triggered');
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('update:install', () => {
    console.log('[AutoUpdater] Quit-and-install triggered');
    autoUpdater.quitAndInstall();
  });

  // ---- Automatic check on startup (after 5-second delay) ----
  setTimeout(() => {
    console.log('[AutoUpdater] Running initial update check');
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AutoUpdater] Initial check failed:', err?.message || err);
    });
  }, 5000);
}
