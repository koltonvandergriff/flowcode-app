import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ToastContext } from './ToastContext';

export const WorkspaceContext = createContext(null);

const api = typeof window !== 'undefined' && window.flowcode?.workspace;

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
    if (!api) return;
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
    }
  }, [activeId, activeData]);

  const updateWorkspace = useCallback((updater) => {
    setActiveData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (api && activeId) api.save(activeId, next).catch(() => {});
      return next;
    });
  }, [activeId]);

  const deleteWorkspace = useCallback(async (id) => {
    if (!api) return;
    await api.delete(id);
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
