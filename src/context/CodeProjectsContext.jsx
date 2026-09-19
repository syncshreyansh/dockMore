import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  getCodeProjects, 
  getProjectSnapshots, 
  createCodeProject, 
  pushCodeProject, 
  toggleWatchStatus,
} from '../api/codeProjects';
import { apiClient } from '../lib/apiClient';

const CodeProjectsContext = createContext(null);

export function CodeProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
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
    refetch();
  }, [refetch]);

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
    }
  }, [refetch]);

  const getSnapshots = useCallback(
    (projectId) => {
      // If we already fetched it recently, return it.
      // But Code.jsx calls this synchronously. 
      // It's better to fetch them and update the `snapshots` state.
      // We will trigger a fetch if it's empty, and return the current state.
      if (!snapshots[projectId]) {
        // Fire-and-forget fetch
        getProjectSnapshots(projectId).then(snaps => {
          setSnapshots(prev => ({ ...prev, [projectId]: snaps }));
        }).catch(console.error);
        return [];
      }
      return snapshots[projectId];
    },
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
