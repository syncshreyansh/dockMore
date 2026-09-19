import { apiClient } from '../lib/apiClient';
import { getAccounts } from './accounts';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function detectType(mimeType = '', name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp'].includes(ext) || mimeType.startsWith('image/')) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mimeType.startsWith('video/')) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext) || mimeType.startsWith('audio/')) return 'audio';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md'].includes(ext) || mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text')) return 'document';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  if (['fig', 'sketch', 'ai', 'psd', 'xd'].includes(ext)) return 'design';
  return 'document';
}

function formatDate(isoString) {
  if (!isoString) return 'Recent';
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function getFiles(filters = {}) {
  try {
    const accounts = await getAccounts();
    if (!accounts || accounts.length === 0) {
      return [];
    }

    
    const accountFilesPromises = accounts.map(async (acc) => {
      try {
        const res = await apiClient.get(`/api/accounts/${acc.id}/files`);
        const providerFiles = res.files || [];

        return providerFiles.map((f) => {
          const ext = f.name.split('.').pop() || '';
          return {
            id: f.id,
            name: f.name,
            type: detectType(f.mimeType, f.name),
            extension: ext,
            size: formatBytes(f.size),
            sizeBytes: f.size || 0,
            provider: (acc.provider || 'google-drive').replace('_', '-'),
            accountEmail: acc.email,
            modified: formatDate(f.modifiedAt),
            path: '/',
            folderId: f.isFolder ? f.id : null,
            isFolder: Boolean(f.isFolder),
            starred: false,
            previewUrl: null,
          };
        });
      } catch (err) {
        console.warn(`[getFiles] Could not fetch files for account ${acc.id}:`, err.message);
        return [];
      }
    });

    const results = await Promise.all(accountFilesPromises);
    let allFiles = results.flat();

    if (filters.folder) {
      allFiles = allFiles.filter((f) => f.folderId === filters.folder);
    }
    if (filters.provider && filters.provider !== 'all') {
      allFiles = allFiles.filter((f) => f.provider === filters.provider);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      allFiles = allFiles.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.accountEmail.toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q)
      );
    }

    return allFiles;
  } catch (err) {
    console.error('[getFiles] Error loading files from backend:', err);
    return [];
  }
}

export async function getRecentFolders() {
  try {
    const files = await getFiles();
    return files
      .filter((f) => f.isFolder)
      .map((folder, index) => ({
        id: folder.id,
        name: folder.name,
        provider: folder.provider,
        providerName: folder.provider === 'google-drive' ? 'Google Drive' : folder.provider,
        accountEmail: folder.accountEmail,
        accent: index === 0,
      }));
  } catch (err) {
    console.error('[getRecentFolders] Error:', err);
    return [];
  }
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
      totalUsedGB: Number(totalUsedGB.toFixed(1)),
      totalCapacityGB: totalCapacityGB,
      connectedAccountsCount: accounts.length,
      totalFilesCount: files.length,
      totalTransfersCount: 0,
      storageByProvider,
    };
  } catch (err) {
    console.error('[getDashboardStats] Error:', err);
    return {
      totalUsedGB: 0,
      totalCapacityGB: 0,
      connectedAccountsCount: 0,
      totalFilesCount: 0,
      totalTransfersCount: 0,
      storageByProvider: [],
    };
  }
}
