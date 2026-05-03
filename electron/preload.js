import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('flowcode', {
  terminal: {
    spawn: (opts) => ipcRenderer.invoke('terminal:spawn', opts),
    write: (id, data) => ipcRenderer.send('terminal:write', { id, data }),
    resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
    kill: (id) => ipcRenderer.send('terminal:kill', { id }),
    list: () => ipcRenderer.invoke('terminal:list'),
    onData: (callback) => {
      const handler = (_, payload) => callback(payload.id, payload.data);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onExit: (callback) => {
      const handler = (_, payload) => callback(payload.id, payload.exitCode);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },

  workspace: {
    list: () => ipcRenderer.invoke('workspace:list'),
    create: (name) => ipcRenderer.invoke('workspace:create', name),
    load: (id) => ipcRenderer.invoke('workspace:load', id),
    save: (id, data) => ipcRenderer.invoke('workspace:save', { id, data }),
    delete: (id) => ipcRenderer.invoke('workspace:delete', id),
    setActive: (id) => ipcRenderer.invoke('workspace:setActive', id),
    getActive: () => ipcRenderer.invoke('workspace:getActive'),
  },

  session: {
    save: (state) => ipcRenderer.invoke('session:save', state),
    load: () => ipcRenderer.invoke('session:load'),
  },

  cost: {
    getUsage: () => ipcRenderer.invoke('cost:getUsage'),
    track: (data) => ipcRenderer.send('cost:track', data),
    getHistory: (range) => ipcRenderer.invoke('cost:getHistory', range),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  platform: process.platform,
  version: '0.1.0',
});
