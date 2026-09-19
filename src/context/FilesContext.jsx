import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getFiles as apiGetFiles, getRecentFolders as apiGetRecentFolders } from '../api/files';
import { useAccountsContext } from './AccountsContext';

const FilesContext = createContext(null);

export function FilesProvider({ children }) {
  const { accounts } = useAccountsContext();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFilesAndFolders = useCallback(async () => {
    if (!accounts || accounts.length === 0) {
      setFiles([]);
      setFolders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [fetchedFiles, fetchedFolders] = await Promise.all([
        apiGetFiles(),
        apiGetRecentFolders(),
      ]);
      setFiles(fetchedFiles);
      setFolders(fetchedFolders);
    } catch (err) {
      console.error('[FilesProvider] Failed to load real files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accounts]);

  useEffect(() => {
    fetchFilesAndFolders();
  }, [fetchFilesAndFolders]);

  
  const stats = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        totalUsedGB: 0,
        totalCapacityGB: 0,
        connectedAccountsCount: 0,
        totalFilesCount: 0,
        totalTransfersCount: 0,
        storageByProvider: [],
      };
    }

    let totalCapacityGB = 0;
    let totalUsedGB = 0;

    const providerMap = {
      'google-drive': { name: 'Google Drive', color: '#00AC47', used: 0, accounts: [] },
      mega: { name: 'MEGA', color: '#D9272E', used: 0, accounts: [] },
      onedrive: { name: 'OneDrive', color: '#0078D4', used: 0, accounts: [] },
      dropbox: { name: 'Dropbox', color: '#0061FF', used: 0, accounts: [] },
    };

    accounts.forEach((acc) => {
      totalCapacityGB += acc.totalStorageGB || 15;
      totalUsedGB += acc.usedStorageGB || 0;

      const provKey = acc.provider;
      if (providerMap[provKey]) {
        providerMap[provKey].used += acc.usedStorageGB || 0;
        providerMap[provKey].accounts.push({
          name: acc.name,
          email: acc.email,
          used: `${acc.usedStorageGB} GB`,
        });
      }
    });

    const freeSpace = Math.max(0, Number((totalCapacityGB - totalUsedGB).toFixed(1)));

    const storageByProvider = Object.keys(providerMap)
      .map((key) => ({
        name: providerMap[key].name,
        provider: key,
        used: Number(providerMap[key].used.toFixed(1)),
        color: providerMap[key].color,
        accounts: providerMap[key].accounts,
      }))
      .filter((p) => p.used > 0 || p.accounts.length > 0);

    if (freeSpace > 0) {
      storageByProvider.push({
        name: 'Free Space',
        provider: 'free',
        used: freeSpace,
        color: '#D9D8D6',
        accounts: [],
      });
    }

    return {
      totalUsedGB: Number(totalUsedGB.toFixed(1)),
      totalCapacityGB,
      connectedAccountsCount: accounts.length,
      totalFilesCount: files.length,
      totalTransfersCount: 0,
      storageByProvider,
    };
  }, [accounts, files]);

  const addFile = useCallback((fileData) => {
    const ext = fileData.name.split('.').pop() || 'file';
    let detectedType = 'document';
    const lowerExt = ext.toLowerCase();
    if (['fig', 'sketch', 'ai', 'psd'].includes(lowerExt)) detectedType = 'design';
    else if (['mp4', 'mov', 'avi', 'mkv'].includes(lowerExt)) detectedType = 'video';
    else if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(lowerExt)) detectedType = 'image';
    else if (['zip', 'tar', 'tar.gz', 'rar', '7z'].includes(lowerExt)) detectedType = 'archive';
    else if (['xls', 'xlsx', 'csv'].includes(lowerExt)) detectedType = 'spreadsheet';

    const newFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: detectedType,
      extension: lowerExt,
      starred: false,
      modified: 'Just now',
      path: fileData.path || '/',
      folderId: fileData.folderId || null,
      ...fileData,
    };

    setFiles((prev) => [newFile, ...prev]);
    return newFile;
  }, []);

  const deleteFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const deleteFiles = useCallback((ids) => {
    const idSet = new Set(ids);
    setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
  }, []);

  const renameFile = useCallback((id, newName) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const ext = newName.split('.').pop() || f.extension;
          return {
            ...f,
            name: newName,
            extension: ext.toLowerCase(),
          };
        }
        return f;
      })
    );
  }, []);

  const moveFile = useCallback((id, newFolderId, newPath) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              folderId: newFolderId || null,
              path: newPath || f.path,
            }
          : f
      )
    );
  }, []);

  const moveFiles = useCallback((ids, newFolderId, newPath) => {
    const idSet = new Set(ids);
    setFiles((prev) =>
      prev.map((f) =>
        idSet.has(f.id)
          ? {
              ...f,
              folderId: newFolderId || null,
              path: newPath || f.path,
            }
          : f
      )
    );
  }, []);

  const toggleStar = useCallback((id) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f))
    );
  }, []);

  const createFolder = useCallback((folderData) => {
    const newFolder = {
      id: `fold-${Date.now()}`,
      name: (folderData.name || 'NEW FOLDER').toUpperCase(),
      provider: folderData.provider || 'google-drive',
      providerName: folderData.providerName || 'Google Drive',
      accountEmail: folderData.accountEmail || '',
      accent: false,
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  const renameFolder = useCallback((id, newName) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, name: newName.toUpperCase() } : f
      )
    );
  }, []);

  const deleteFolder = useCallback((id) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setFiles((prev) =>
      prev.map((f) => (f.folderId === id ? { ...f, folderId: null, path: '/' } : f))
    );
  }, []);

  return (
    <FilesContext.Provider
      value={{
        files,
        folders,
        stats,
        loading,
        error,
        addFile,
        deleteFile,
        deleteFiles,
        renameFile,
        moveFile,
        moveFiles,
        toggleStar,
        createFolder,
        renameFolder,
        deleteFolder,
        refetch: fetchFilesAndFolders,
      }}
    >
      {children}
    </FilesContext.Provider>
  );
}

export function useFilesContext() {
  const context = useContext(FilesContext);
  if (!context) {
    throw new Error('useFilesContext must be used within a FilesProvider');
  }
  return context;
}
