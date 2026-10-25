import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getFiles as apiGetFiles, uploadFile as apiUploadFile, downloadFile as apiDownloadFile, updateCloudFile, deleteCloudFile, createCloudFolder, parseFileKey, makeFileKey } from '../api/files';
import { useAccountsContext } from './AccountsContext';
import { useTransfersContext } from './TransfersContext';
import { detectFileType, withFilePaths } from '../lib/fileModel';

const FilesContext = createContext(null);

export function FilesProvider({ children }) {
  const { accounts, authUserId, accountsReady, loading: accountsLoading } = useAccountsContext();
  const { transfers } = useTransfersContext();
  const [files, setFiles] = useState([]);
  const folders = useMemo(() => files.filter((file) => file.isFolder).map((file, index) => ({ ...file, providerName: 'Google Drive', accent: index === 0 })), [files]);
  const indexedFiles = useMemo(() => withFilePaths(files), [files]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;
  const accountSignature = useMemo(
    () => accounts.map((account) => `${account.id}:${account.status}:${account.lastSyncedAt || ''}`).sort().join('|'),
    [accounts]
  );
  const loadId = useRef(0);
  const folderLoadId = useRef(0);
  const loadedUserId = useRef(null);
  const inventoryInFlight = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFolderKey, setCurrentFolderKey] = useState(null);

  const fetchFilesAndFolders = useCallback(async () => {
    if (!authUserId) { ++loadId.current; setFiles([]); setError(null); setLoading(false); return; }
    if (!accountsReady) {
      if (accountsLoading) setLoading(true);
      else setLoading(false);
      return;
    }
    const accountSnapshot = accountsRef.current;
    if (!accountSnapshot.length) { ++loadId.current; setFiles([]); setError(null); setLoading(false); loadedUserId.current = authUserId; return; }
    if (inventoryInFlight.current?.signature === accountSignature) return inventoryInFlight.current.promise;
    const request = ++loadId.current;
    if (loadedUserId.current !== authUserId) setLoading(true);
    const promise = apiGetFiles({ accounts: accountSnapshot }).then((next) => {
      if (request !== loadId.current) return;
      setFiles(next);
      setError(next.errors?.length ? next.errors.join('; ') : null);
      loadedUserId.current = authUserId;
    }).catch((err) => {
      if (request === loadId.current) setError(err.message);
    }).finally(() => {
      if (request === loadId.current) setLoading(false);
      if (inventoryInFlight.current?.request === request) inventoryInFlight.current = null;
    });
    inventoryInFlight.current = { signature: accountSignature, request, promise };
    return promise;
  }, [accountSignature, accountsLoading, accountsReady, authUserId]);

  const openFolder = useCallback(async (folderKey) => {
    const request = ++folderLoadId.current;
    setCurrentFolderKey(folderKey || null);
    if (!folderKey || !accountsRef.current.length) return;
    const selected = filesRef.current.find((file) => file.id === folderKey);
    if (!selected?.targetId) return;
    try {
      const next = await apiGetFiles({ accounts: accountsRef.current, folder: folderKey, providerFolderId: selected.targetId });
      if (request !== folderLoadId.current) return;
      if (next.errors?.length) throw new Error(next.errors.join('; '));
      setFiles((previous) => {
        const merged = new Map(previous.map((file) => [file.id, file]));
        const fetched = new Set(next.map((file) => file.id));
        for (const file of previous) {
          if (file.parentIds?.includes(folderKey) && !fetched.has(file.id)) {
            const remaining = file.parentIds.filter((parent) => parent !== folderKey);
            if (remaining.length) merged.set(file.id, { ...file, parentIds: remaining, folderId: remaining[0] });
            else merged.delete(file.id);
          }
        }
        for (const file of next) merged.set(file.id, file);
        return [...merged.values()];
      });
      setError(null);
    } catch (err) { if (request === folderLoadId.current) { setError(err.message); throw err; } }
  }, []);

  useEffect(() => { fetchFilesAndFolders(); }, [fetchFilesAndFolders]);
  useEffect(() => {
    if (!authUserId) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchFilesAndFolders();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [authUserId, fetchFilesAndFolders]);
  useEffect(() => {
    ++loadId.current;
    ++folderLoadId.current;
    loadedUserId.current = null;
    setFiles([]);
    setCurrentFolderKey(null);
    setError(null);
  }, [authUserId]);

  const stats = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        totalUsedGB: 0,
        totalCapacityGB: 0,
        connectedAccountsCount: 0,
        totalFilesCount: 0,
        totalTransfersCount: transfers.length,
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
      if (Number.isFinite(acc.totalStorageGB)) totalCapacityGB += acc.totalStorageGB;
      if (Number.isFinite(acc.usedStorageGB)) totalUsedGB += acc.usedStorageGB;

      const provKey = acc.provider;
      if (providerMap[provKey]) {
        providerMap[provKey].used += Number.isFinite(acc.usedStorageGB) ? acc.usedStorageGB : 0;
        providerMap[provKey].accounts.push({
          name: acc.name,
          email: acc.email,
          used: Number.isFinite(acc.usedStorageGB) ? `${acc.usedStorageGB} GB` : 'Unavailable',
        });
      }
    });

    const capacityUnknown = accounts.some((account) => !Number.isFinite(account.totalStorageGB));
    const usedUnknown = accounts.some((account) => !Number.isFinite(account.usedStorageGB));
    const freeSpace = capacityUnknown || usedUnknown ? null : Math.max(0, Number((totalCapacityGB - totalUsedGB).toFixed(1)));

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
      totalUsedGB: usedUnknown ? null : Number(totalUsedGB.toFixed(1)),
      totalCapacityGB: capacityUnknown ? null : totalCapacityGB,
      connectedAccountsCount: accounts.length,
      totalFilesCount: files.filter((file) => !file.isFolder).length,
      totalTransfersCount: transfers.length,
      storageByProvider,
    };
  }, [accounts, files, transfers.length]);

  const addFile = useCallback(async (fileData) => {
    const accountId = fileData.accountId;
    const uploaded = await apiUploadFile(accountId, fileData.file, fileData.parentId);
    const ext = fileData.file.name.split('.').pop() || 'file';
    const lowerExt = ext.toLowerCase();
    const detectedType = detectFileType(fileData.file.type, fileData.file.name);

    const newFile = {
      id: makeFileKey(accountId, uploaded.id),
      providerFileId: uploaded.id,
      accountId,
      type: detectedType,
      extension: lowerExt,
      starred: false,
      modified: 'Just now',
      path: fileData.path || '/',
      folderId: fileData.folderId || null,
      parentIds: fileData.folderId ? [fileData.folderId] : [],
      mimeType: fileData.file.type,
      name: uploaded.name,
      provider: fileData.provider,
      accountEmail: fileData.accountEmail,
      sizeBytes: fileData.file.size,
      size: `${(fileData.file.size / 1048576).toFixed(1)} MB`,
      isFolder: false,
    };

    setFiles((prev) => [newFile, ...prev]);
    return newFile;
  }, []);

  const deleteFile = useCallback(async (id) => {
    const file = files.find((item) => item.id === id);
    if (file) await deleteCloudFile(file);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, [files]);

  const deleteFiles = useCallback(async (ids) => {
    const idSet = new Set(ids);
    await Promise.all(files.filter((file) => idSet.has(file.id)).map(deleteCloudFile));
    setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
  }, [files]);

  const renameFile = useCallback(async (id, newName) => {
    const file = files.find((item) => item.id === id);
    if (!file) return;
    await updateCloudFile(file, { name: newName });
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
  }, [files]);

  const moveFile = useCallback(async (id, newFolderId, newPath) => {
    const file = files.find((item) => item.id === id);
    if (!file) return;
    const destinationKey = newFolderId ? parseFileKey(newFolderId) : null;
    if (destinationKey && destinationKey.accountId !== file.accountId) throw new Error('Moving between cloud accounts is unsupported. Use the transfer action instead.');
    const destination = files.find((folder) => folder.id === newFolderId)?.targetId || destinationKey?.providerFileId || null;
    await updateCloudFile(file, { parentId: destination });
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              folderId: newFolderId || null,
              parentIds: newFolderId ? [newFolderId] : [],
              path: newPath || f.path,
            }
          : f
      )
    );
  }, [files]);

  const moveFiles = useCallback(async (ids, newFolderId, newPath) => {
    const idSet = new Set(ids);
    const destinationKey = newFolderId ? parseFileKey(newFolderId) : null;
    const selectedFiles = files.filter((file) => idSet.has(file.id));
    if (destinationKey && selectedFiles.some((file) => file.accountId !== destinationKey.accountId)) throw new Error('Moving between cloud accounts is unsupported. Use the transfer action instead.');
    const destination = files.find((folder) => folder.id === newFolderId)?.targetId || destinationKey?.providerFileId || null;
    await Promise.all(selectedFiles.map((file) => updateCloudFile(file, { parentId: destination })));
    setFiles((prev) =>
      prev.map((f) =>
        idSet.has(f.id)
          ? {
              ...f,
              folderId: newFolderId || null,
              parentIds: newFolderId ? [newFolderId] : [],
              path: newPath || f.path,
            }
          : f
      )
    );
  }, [files]);

  const toggleStar = useCallback(async (id) => {
    const file = files.find((item) => item.id === id);
    if (!file) return;
    await updateCloudFile(file, { starred: !file.starred });
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f))
    );
  }, [files]);

  const createFolder = useCallback(async (folderData) => {
    if (!folderData.accountId) throw new Error('Choose a connected cloud account');
    const parentId = folderData.parentId ? filesRef.current.find((file) => file.id === folderData.parentId)?.targetId || parseFileKey(folderData.parentId)?.providerFileId : undefined;
    const created = await createCloudFolder(folderData.accountId, folderData.name, parentId);
    const newFolder = {
      id: makeFileKey(folderData.accountId, created.id),
      providerFileId: created.id,
      accountId: folderData.accountId,
      name: created.name,
      provider: folderData.provider || 'google-drive',
      providerName: folderData.providerName || 'Google Drive',
      accountEmail: folderData.accountEmail || '',
      accent: false, isFolder: true, type: 'folder', folderId: folderData.parentId || null, parentIds: folderData.parentId ? [folderData.parentId] : [],
    };
    setFiles((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  const renameFolder = useCallback(async (id, newName) => {
    const folder = folders.find((item) => item.id === id);
    if (folder) await updateCloudFile(folder, { name: newName });
    setFiles((prev) => prev.map((file) => file.id === id ? { ...file, name: newName } : file));
  }, [folders]);

  const deleteFolder = useCallback(async (id) => {
    const folder = folders.find((item) => item.id === id);
    if (folder) await deleteCloudFile(folder);
    const removed = new Set([id]);
    let added = true;
    while (added && !folder?.targetId) {
      added = false;
      for (const file of files) if (!removed.has(file.id) && file.parentIds?.some((parent) => removed.has(parent))) { removed.add(file.id); added = true; }
    }
    setFiles((prev) => prev.filter((file) => !removed.has(file.id)));
  }, [folders, files]);

  return (
    <FilesContext.Provider
      value={{
        files: indexedFiles,
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
        openFolder,
        currentFolderKey,
        downloadFile: apiDownloadFile,
        starFile: toggleStar,
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
