import { apiClient } from '../lib/apiClient';
import { getAccounts } from './accounts';
import { makeFileKey, parseFileKey, mapDriveFile, withFilePaths } from '../lib/fileModel';
export { makeFileKey, parseFileKey } from '../lib/fileModel';

export async function getFiles(filters = {}) {
  const accounts = filters.accounts || await getAccounts();
  const selected = filters.folder ? parseFileKey(filters.folder) : null;
  if (filters.folder && !selected) throw new Error('This folder link is invalid. Open the folder again from All Files.');
  const relevant = accounts.filter((account) => account.status !== 'expired' && (!selected || account.id === selected.accountId));
  const results = await Promise.allSettled(relevant.map(async (account) => {
    const folderId = filters.providerFolderId || selected?.providerFileId || '*';
    const response = await apiClient.get('/api/accounts/' + account.id + '/files?folderId=' + encodeURIComponent(folderId));
    return response.files.map((file) => mapDriveFile(file, account, filters.folder, folderId));
  }));
  let files = withFilePaths(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
  if (filters.provider && filters.provider !== 'all') files = files.filter((file) => file.provider === filters.provider);
  if (filters.search) {
    const query = filters.search.toLowerCase();
    files = files.filter((file) => [file.name, file.accountEmail, file.path].some((value) => value.toLowerCase().includes(query)));
  }
  files.errors = results.flatMap((result, index) => result.status === 'rejected' ? [relevant[index].name + ': ' + result.reason.message] : []);
  return files;
}

export async function uploadFile(accountId, file, folderId) {
  const query = new URLSearchParams({ name: file.name, ...(folderId ? { folderId } : {}) });
  return apiClient.post(`/api/accounts/${accountId}/files?${query}`, file, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

export async function downloadFile(file) {
  const blob = await apiClient.download(`/api/accounts/${file.accountId}/files/${encodeURIComponent(file.targetId || file.providerFileId || file.id)}/content?name=${encodeURIComponent(file.name)}`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function updateCloudFile(file, updates) {
  return apiClient.patch(`/api/accounts/${file.accountId}/files/${encodeURIComponent(file.providerFileId || file.id)}`, updates);
}

export async function deleteCloudFile(file) {
  return apiClient.delete(`/api/accounts/${file.accountId}/files/${encodeURIComponent(file.providerFileId || file.id)}`);
}

export async function createCloudFolder(accountId, name, parentId) {
  return apiClient.post(`/api/accounts/${accountId}/folders`, { name, parentId });
}

export async function createShareLink(file) {
  return apiClient.post(`/api/accounts/${file.accountId}/files/${encodeURIComponent(file.providerFileId || file.id)}/share`);
}

export async function getRecentFolders(existingFiles) {
    const files = existingFiles || await getFiles();
    return files
      .filter((f) => f.isFolder)
      .map((folder, index) => ({
        id: folder.id,
        providerFileId: folder.providerFileId || folder.id.split('::').slice(1).join('::'),
        accountId: folder.accountId || folder.id.split('::')[0],
        name: folder.name,
        provider: folder.provider,
        providerName: folder.provider === 'google-drive' ? 'Google Drive' : folder.provider,
        accountEmail: folder.accountEmail,
        accent: index === 0,
      }));
}

export async function getDashboardStats() {
  try {
    const accounts = await getAccounts();
    const files = await getFiles();

    let totalCapacityGB = 0;
    let totalUsedGB = 0;

    const providerMap = {
      'google-drive': { name: 'Google Drive', color: '#00AC47', used: 0, accounts: [] },
      onedrive: { name: 'OneDrive', color: '#0078D4', used: 0, accounts: [] },
      dropbox: { name: 'Dropbox', color: '#0061FF', used: 0, accounts: [] },
      mega: { name: 'MEGA', color: '#D9272E', used: 0, accounts: [] },
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

    const storageByProvider = Object.keys(providerMap)
      .map((key) => ({
        name: providerMap[key].name,
        provider: key,
        used: Number(providerMap[key].used.toFixed(1)),
        color: providerMap[key].color,
        accounts: providerMap[key].accounts,
      }))
      .filter((p) => p.accounts.length > 0);

    return {
      totalUsedGB: accounts.some((acc) => !Number.isFinite(acc.usedStorageGB)) ? null : Number(totalUsedGB.toFixed(1)),
      totalCapacityGB: accounts.some((acc) => !Number.isFinite(acc.totalStorageGB)) ? null : totalCapacityGB,
      connectedAccountsCount: accounts.length,
      totalFilesCount: files.length,
      totalTransfersCount: 0,
      storageByProvider,
    };
  } catch (err) {
    console.error('[getDashboardStats] Error:', err);
    throw err;
  }
}
