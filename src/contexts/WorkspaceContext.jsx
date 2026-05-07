import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ToastContext } from './ToastContext';
import { syncWorkspaceDebounced, deleteWorkspaceSync, setActiveWorkspaceSync } from '../lib/syncService';

export const WorkspaceContext = createContext(null);

const api = typeof window !== 'undefined' && window.flowcode?.workspace;

function makeDefaultWorkspace(name = 'Default') {
  return {
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: Date.now(),
    terminals: [],
    layout: '2x1',
    macros: [],
  };
}

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeData, setActiveData] = useState(null);
  const { addToast } = useContext(ToastContext);

  const refresh = useCallback(async () => {
    if (!api) return;
    const list = await api.list();
    setWorkspaces(list);
  }, []);

  useEffect(() => {
    if (!api) {
      const ws = makeDefaultWorkspace();
      setActiveId(ws.id);
      setActiveData(ws);
      setWorkspaces([{ id: ws.id, name: ws.name, createdAt: ws.createdAt, terminalCount: 0 }]);
      return;
    }
    (async () => {
      await refresh();
      const savedId = await api.getActive();
      if (savedId) {
        const data = await api.load(savedId);
        if (data) {
          setActiveId(savedId);
          setActiveData(data);
          return;
        }
      }
      const ws = await api.create('Default');
      setActiveId(ws.id);
      setActiveData(ws);
      await api.setActive(ws.id);
      await refresh();
    })();
  }, [refresh]);

  const createWorkspace = useCallback(async (name) => {
    if (!api) return;
    const ws = await api.create(name);
    await refresh();
    syncWorkspaceDebounced(ws);
    addToast(`Workspace "${name}" created`, 'success');
    return ws;
  }, [refresh, addToast]);

  const switchWorkspace = useCallback(async (id) => {
    if (!api || id === activeId) return;
    if (activeId && activeData) {
      await api.save(activeId, activeData);
    }
    const data = await api.load(id);
    if (data) {
      setActiveId(id);
      setActiveData(data);
      await api.setActive(id);
      setActiveWorkspaceSync(id);
    }
  }, [activeId, activeData]);

  const updateWorkspace = useCallback((updater) => {
    setActiveData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (api && activeId) api.save(activeId, next).catch(() => {});
      syncWorkspaceDebounced({ ...next, isActive: true });
      return next;
    });
  }, [activeId]);

  const deleteWorkspace = useCallback(async (id) => {
    if (!api) return;
    await api.delete(id);
    deleteWorkspaceSync(id);
    await refresh();
    if (id === activeId) {
      const list = await api.list();
      if (list.length > 0) {
        await switchWorkspace(list[0].id);
      } else {
        const ws = await api.create('Default');
        setActiveId(ws.id);
        setActiveData(ws);
        await api.setActive(ws.id);
        await refresh();
      }
    }
    addToast('Workspace deleted', 'info');
  }, [activeId, refresh, switchWorkspace, addToast]);

  const renameWorkspace = useCallback(async (id, name) => {
    if (!api) return;
    const data = await api.load(id);
    if (data) {
      await api.save(id, { ...data, name });
      if (id === activeId) setActiveData((prev) => ({ ...prev, name }));
      await refresh();
    }
  }, [activeId, refresh]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, activeId, activeData,
      createWorkspace, switchWorkspace, updateWorkspace,
      deleteWorkspace, renameWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
