import { apiClient } from '../lib/apiClient';

function formatBytes(bytes) {
  if (!Number.isFinite(Number(bytes))) return 'Unknown size';
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function mapTransfer(item) {
  return {
    id: item.id, filename: item.file_name, size: formatBytes(item.size_bytes),
    sourceProvider: (item.source_provider || '').replace('_', '-'),
    sourceAccount: item.source_account || '',
    destinationProvider: (item.destination_provider || '').replace('_', '-'),
    destinationAccount: item.destination_account || '', status: item.status,
    progress: item.status === 'completed' ? 100 : null, timestamp: item.completed_at || item.created_at,
    eta: null, speed: null,
  };
}

export async function getTransfers() {
  return (await apiClient.get('/api/transfers')).map(mapTransfer);
}

export async function createTransfer(data) {
  return mapTransfer(await apiClient.post('/api/transfers', data));
}

export async function deleteTransfer(id) {
  return apiClient.delete(`/api/transfers/${id}`);
}
