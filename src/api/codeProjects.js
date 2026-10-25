import { apiClient } from '../lib/apiClient';

export async function getCodeProjects() {
    const res = await apiClient.get('/api/code-projects');
    const projects = res.projects || [];

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      path: p.local_path || '~/',
      watchStatus: p.watch_status || 'paused',
      interval: p.snapshot_interval_minutes || 15,
      accountId: p.backup_account_id,
      provider: p.backup_provider || 'google-drive',
      accountEmail: p.backup_account_email || '',
      snapshotCount: p.snapshot_count || 0,
      lastSnapshot: p.last_snapshot_at
        ? new Date(p.last_snapshot_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Never',
      lastCommitMessage: p.last_commit_message || 'Initial commit',
      lastCommitTime: p.last_commit_at
        ? new Date(p.last_commit_at).toLocaleDateString()
        : 'Never',
      branch: p.branch || 'Unknown',
    }));
}

export async function getProjectById(id) {
  const p = await apiClient.get(`/api/code-projects/${id}`);
  return {
    id: p.id,
    name: p.name,
    path: p.local_path || '~/',
    watchStatus: p.watch_status || 'paused',
    interval: p.snapshot_interval_minutes || 15,
    accountId: p.backup_account_id,
    provider: p.backup_provider || 'google-drive',
    accountEmail: p.backup_account_email || '',
    snapshots: (p.snapshots || []).map(mapSnapshot),
    snapshotCount: p.snapshot_count || 0,
    lastSnapshot: p.last_snapshot_at ? new Date(p.last_snapshot_at).toLocaleString() : 'Never',
    lastCommitMessage: p.last_commit_message || '',
    lastCommitTime: p.last_commit_at ? new Date(p.last_commit_at).toLocaleString() : '',
    branch: p.branch || 'Unknown',
  };
}

export async function createCodeProject(projectData) {
  const payload = {
    name: projectData.name,
    local_path: projectData.path || projectData.local_path,
    backup_account_id: projectData.accountId || projectData.backup_account_id || null,
    snapshot_interval_minutes: projectData.interval || projectData.snapshot_interval_minutes || 15,
  };

  const p = await apiClient.post('/api/code-projects', payload);
  return {
    id: p.id,
    name: p.name,
    path: p.local_path || '~/',
    watchStatus: p.watch_status || 'paused',
    interval: p.snapshot_interval_minutes || 15,
    accountId: p.backup_account_id,
    snapshotCount: 0,
    lastSnapshot: 'Never',
    lastCommitMessage: '',
    lastCommitTime: 'Never',
    branch: p.branch || 'Unknown',
  };
}

export async function pushCodeProject(id, commitMessage) {
  const msg = commitMessage || 'Consolidated shadow snapshots';
  const res = await apiClient.post(`/api/code-projects/${id}/commit`, {
    commitMessage: msg,
  });
  return {
    success: true,
    id,
    commitMessage: res.last_commit_message || msg,
    pushedAt: res.last_commit_at || new Date().toISOString(),
  };
}

export async function toggleWatchStatus(id) {
  const project = await getProjectById(id);
  const newStatus = project.watchStatus === 'watching' ? 'paused' : 'watching';
  await apiClient.patch(`/api/code-projects/${id}`, {
    watch_status: newStatus,
  });
  return { success: true, id, status: newStatus };
}

export async function getProjectSnapshots(projectId) {
  const project = await getProjectById(projectId);
  return project.snapshots || [];
}

function mapSnapshot(snapshot) {
  return {
    id: snapshot.id,
    hash: snapshot.snapshot_key?.slice(0, 7) || '',
    summary: snapshot.snapshot_key ? `Snapshot ${snapshot.snapshot_key.slice(0, 7)}` : 'Snapshot',
    details: `${snapshot.files_changed_count ?? 0} files changed`,
    timestamp: snapshot.taken_at ? new Date(snapshot.taken_at).toLocaleString() : '',
  };
}
