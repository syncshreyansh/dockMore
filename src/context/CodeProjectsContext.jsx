import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  getCodeProjects, 
  getProjectSnapshots, 
  createCodeProject, 
  pushCodeProject, 
  toggleWatchStatus,
} from '../api/codeProjects';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const CodeProjectsContext = createContext(null);

export function CodeProjectsProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const data = await getCodeProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setProjects([]); setSnapshots({}); setLoading(false); return; }
    refetch().catch(() => {});
  }, [authLoading, user, refetch]);

  const addProject = useCallback(async (projectData) => {
    try {
      const newProject = await createCodeProject(projectData);
      await refetch();
      return newProject;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refetch]);

  const pushToGitHub = useCallback(async (id, commitMessage) => {
    try {
      const result = await pushCodeProject(id, commitMessage);
      await refetch();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refetch]);

  const toggleWatch = useCallback(async (id) => {
    try {
      await toggleWatchStatus(id);
      await refetch();
    } catch (err) {
      setError(err.message);
    }
  }, [refetch]);

  const removeProject = useCallback(async (id) => {
    try {
      await apiClient.delete(`/api/code-projects/${id}`);
      await refetch();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refetch]);

  const updateProjectBackupAccount = useCallback(async (id, { accountId, provider, accountEmail }) => {
    try {
      await apiClient.patch(`/api/code-projects/${id}`, {
        backup_account_id: accountId
      });
      await refetch();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refetch]);

  const refreshSnapshots = useCallback(async (projectId) => {
    const data = await getProjectSnapshots(projectId);
    setSnapshots((prev) => ({ ...prev, [projectId]: data }));
    return data;
  }, []);

  const getSnapshots = useCallback(
    (projectId) => snapshots[projectId] || [],
    [snapshots]
  );

  return (
    <CodeProjectsContext.Provider
      value={{
        projects,
        snapshots,
        loading,
        error,
        addProject,
        removeProject,
        pushToGitHub,
        toggleWatch,
        updateProjectBackupAccount,
        getSnapshots,
        refreshSnapshots,
        refetch,
      }}
    >
      {children}
    </CodeProjectsContext.Provider>
  );
}

export function useCodeProjectsContext() {
  const context = useContext(CodeProjectsContext);
  if (!context) {
    throw new Error('useCodeProjectsContext must be used within a CodeProjectsProvider');
  }
  return context;
}
