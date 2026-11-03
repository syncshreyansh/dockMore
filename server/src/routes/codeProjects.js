

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { pathToFileURL } = require('url');
const db = require('../db/connection');
const { handleGitpushTrigger } = require('../agents/orchestrator');
const { getProvider } = require('../providers');
const { getValidAccessToken } = require('../auth/tokenManager');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const execFileAsync = promisify(execFile);
const cliEntryPath = path.resolve(__dirname, '../../../cli/src/cli.js');
const cliConfigPath = path.resolve(__dirname, '../../../cli/src/config.js');
const gitpushReviewPath = path.resolve(__dirname, '../../../cli/src/gitpushReview.js');

async function getLocalProject(req, id) {
  const project = await db('code_projects').where({ id, user_id: req.user.id }).first();
  if (!project) return { status: 404, error: 'Project not found' };
  if (!project.local_path || !fs.existsSync(project.local_path)) {
    return { status: 409, error: 'Project directory is unavailable on the backend computer' };
  }
  if (!fs.existsSync(cliConfigPath)) {
    return { status: 409, error: 'Local CLI is unavailable on the backend computer' };
  }
  const { getProject, getToken } = await import(pathToFileURL(cliConfigPath).href);
  const linked = getProject(project.local_path);
  if (linked?.projectId !== id) return { status: 409, error: 'This project is not linked to the CLI on this computer. Run dockmore relink locally.' };
  const token = getToken({ reload: true });
  if (!token?.startsWith('dmcli_')) return { status: 409, error: 'CLI is not signed in on the backend computer' };
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const credential = await db('cli_credentials').where({ user_id: req.user.id, token_hash: tokenHash })
    .whereNull('revoked_at').where('expires_at', '>', new Date()).first('id');
  if (!credential) return { status: 403, error: 'Website and local CLI are not signed in to the same account' };
  return { project };
}


router.use(requireAuth);


const VALID_WATCH_STATUSES = ['watching', 'paused'];
const HEARTBEAT_STALE_MS = 90_000;
function withWatchHealth(project) {
  if (project.watch_status !== 'watching') return { ...project, watch_health: 'paused' };
  const lastContact = project.last_heartbeat_at ? new Date(project.last_heartbeat_at).getTime() : 0;
  const stale = !lastContact || Date.now() - lastContact > HEARTBEAT_STALE_MS;
  return { ...project, watch_status: stale ? 'stale' : 'watching', watch_health: stale ? 'stale' : 'healthy' };
}

function isValidUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function getOrCreateFolder(provider, accessToken, name, parentId) {
  const children = await provider.listFiles(accessToken, parentId || 'root');
  const existing = children.find((file) => file.isFolder && file.name === name);
  if (existing) return existing.id;
  return (await provider.createFolder(accessToken, name, parentId)).id;
}

async function ensureProjectCloudFolder(account, project) {
  const provider = getProvider(account.provider);
  if (!provider.listFiles || !provider.createFolder) throw new Error('This cloud provider does not support project source archives yet');
  const accessToken = await getValidAccessToken(account.id);
  const rootFolderId = await getOrCreateFolder(provider, accessToken, 'dockmore');
  const projectFolderName = `${project.name} (${project.id.slice(0, 8)})`;
  return getOrCreateFolder(provider, accessToken, projectFolderName, rootFolderId);
}

function safeArchiveName(name) {
  const safe = String(name || 'project').replace(/[\\/:*?"<>|\r\n]/g, '-').trim();
  return `${safe || 'project'}.zip`;
}





router.post('/', async (req, res) => {
  const { name, local_path, backup_account_id, snapshot_interval_minutes, branch } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '`name` is required' });
  }

  
  if (backup_account_id && !isValidUuid(backup_account_id)) {
    return res.status(400).json({ error: '`backup_account_id` must be a valid UUID' });
  }

  if (snapshot_interval_minutes !== undefined) {
    const interval = Number(snapshot_interval_minutes);
    if (![5, 10, 15, 20, 25, 30, 60].includes(interval)) {
      return res.status(400).json({ error: '`snapshot_interval_minutes` must be one of 5, 10, 15, 20, 25, 30, or 60' });
    }
  }

  try {
    let backupAccount = null;
    if (backup_account_id) {
      backupAccount = await db('cloud_accounts').where({ id: backup_account_id, user_id: req.user.id }).first();
      if (!backupAccount) return res.status(404).json({ error: `cloud_account not found or not owned by user: ${backup_account_id}` });
    }
    let [project] = await db('code_projects')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        local_path: local_path || null,
        branch: typeof branch === 'string' ? branch.slice(0, 255) : null,
        backup_account_id: backup_account_id || null,
        snapshot_interval_minutes: snapshot_interval_minutes
          ? Number(snapshot_interval_minutes)
          : 15,
        watch_status: 'paused',
      })
      .returning('*');

    if (backupAccount) {
      try {
        const cloudFolderId = await ensureProjectCloudFolder(backupAccount, project);
        [project] = await db('code_projects').where({ id: project.id, user_id: req.user.id })
          .update({ cloud_folder_id: cloudFolderId }).returning('*');
      } catch (err) {
        await db('code_projects').where({ id: project.id, user_id: req.user.id }).delete();
        throw err;
      }
    }

    return res.status(201).json(project);
  } catch (err) {
    console.error('[code-projects POST] Error:', err.message);
    return res.status(500).json({ error: 'Failed to create project', detail: err.message });
  }
});





router.get('/', async (req, res) => {
  try {
    const projects = await db('code_projects as cp')
      .leftJoin('cloud_accounts as ca', 'cp.backup_account_id', 'ca.id')
      .where('cp.user_id', req.user.id)
      .orderBy('cp.created_at', 'desc')
      .select(
        'cp.id',
        'cp.name',
        'cp.local_path',
        'cp.branch',
        'cp.snapshot_interval_minutes',
        'cp.watch_status',
        'cp.last_heartbeat_at',
        'cp.last_snapshot_at',
        'cp.last_commit_message',
        'cp.last_commit_at',
        'cp.cloud_folder_id',
        'cp.source_archive_file_id',
        'cp.source_archive_updated_at',
        'cp.source_archive_size_bytes',
        'cp.created_at',
        'ca.id        as backup_account_id',
        'ca.provider  as backup_provider',
        'ca.account_email as backup_account_email'
      );

    const counts = await db('snapshots').whereIn('project_id', projects.map((p) => p.id)).groupBy('project_id').select('project_id').count('* as count');
    const countMap = new Map(counts.map((row) => [row.project_id, Number(row.count)]));
    return res.json({ count: projects.length, projects: projects.map((p) => withWatchHealth({ ...p, snapshot_count: countMap.get(p.id) || 0 })) });
  } catch (err) {
    console.error('[code-projects GET /] Error:', err.message);
    return res.status(500).json({ error: 'Failed to list projects', detail: err.message });
  }
});





router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    
    const project = await db('code_projects as cp')
      .leftJoin('cloud_accounts as ca', 'cp.backup_account_id', 'ca.id')
      .where({ 'cp.id': id, 'cp.user_id': req.user.id })
      .select(
        'cp.*',
        'ca.provider  as backup_provider',
        'ca.account_email as backup_account_email'
      )
      .first();

    if (!project) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    
    const snapshots = await db('snapshots')
      .where({ project_id: id })
      .orderBy('taken_at', 'desc')
      .limit(20)
      .select('id', 'files_changed_count', 'taken_at', 'snapshot_key');

    const countRow = await db('snapshots').where({ project_id: id }).count('* as count').first();
    return res.json(withWatchHealth({ ...project, snapshot_count: Number(countRow.count), snapshots }));
  } catch (err) {
    console.error(`[code-projects GET /${req.params.id}] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch project', detail: err.message });
  }
});





router.get('/:id/source-archive', async (req, res) => {
  try {
    const project = await db('code_projects').where({ id: req.params.id, user_id: req.user.id }).first();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.backup_account_id || !project.source_archive_file_id) {
      return res.status(404).json({ error: 'No cloud source archive is available yet. Initialize the project and start Watch to sync it.' });
    }
    const account = await db('cloud_accounts').where({ id: project.backup_account_id, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Backup cloud account is no longer connected' });
    const provider = getProvider(account.provider);
    const stream = await provider.downloadFile(await getValidAccessToken(account.id), project.source_archive_file_id);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeArchiveName(project.name))}`,
      'Cache-Control': 'no-store',
    });
    stream.on('error', (err) => {
      console.error('[project source archive download]', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Cloud source archive download failed' });
      else res.destroy(err);
    });
    stream.pipe(res);
  } catch (err) {
    console.error(`[code-projects GET /${req.params.id}/source-archive]`, err.message);
    if (!res.headersSent) return res.status(502).json({ error: 'Cloud source archive download failed', detail: err.message });
    return res.destroy(err);
  }
});

router.post('/:id/source-archive', async (req, res) => {
  try {
    const project = await db('code_projects').where({ id: req.params.id, user_id: req.user.id }).first();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.backup_account_id || !project.cloud_folder_id) {
      return res.status(409).json({ error: 'Choose a connected backup account before syncing project source.' });
    }
    if (!req.is('application/zip')) return res.status(415).json({ error: 'Project source must be uploaded as a ZIP archive' });
    const contentLength = Number(req.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024 * 1024) {
      return res.status(413).json({ error: 'Project ZIP exceeds the 5 GB upload limit' });
    }
    const account = await db('cloud_accounts').where({ id: project.backup_account_id, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Backup cloud account is no longer connected' });
    const provider = getProvider(account.provider);
    const uploaded = await provider.uploadFile(await getValidAccessToken(account.id), req, {
      fileId: project.source_archive_file_id || undefined,
      name: safeArchiveName(project.name),
      mimeType: 'application/zip',
      parentId: project.cloud_folder_id,
    });
    const updatedAt = new Date();
    const [updated] = await db('code_projects').where({ id: project.id, user_id: req.user.id }).update({
      source_archive_file_id: uploaded.id,
      source_archive_updated_at: updatedAt,
      source_archive_size_bytes: Number.isFinite(contentLength) ? contentLength : null,
    }).returning('id');
    if (!updated) return res.status(404).json({ error: 'Project was removed during cloud upload' });
    return res.status(201).json({ success: true, fileId: uploaded.id, updatedAt: updatedAt.toISOString(), sizeBytes: contentLength || null });
  } catch (err) {
    console.error(`[code-projects POST /${req.params.id}/source-archive]`, err.message);
    return res.status(502).json({ error: 'Cloud source archive upload failed', detail: err.message });
  }
});


router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { watch_status, snapshot_interval_minutes, backup_account_id } = req.body;

  
  if (watch_status === undefined && snapshot_interval_minutes === undefined && backup_account_id === undefined) {
    return res.status(400).json({
      error: 'Provide at least one field to update: watch_status, snapshot_interval_minutes, backup_account_id',
    });
  }

  
  if (watch_status !== undefined && !VALID_WATCH_STATUSES.includes(watch_status)) {
    return res.status(400).json({
      error: `watch_status must be one of: ${VALID_WATCH_STATUSES.join(', ')}`,
    });
  }

  if (snapshot_interval_minutes !== undefined) {
    const interval = Number(snapshot_interval_minutes);
    if (![5, 10, 15, 20, 25, 30, 60].includes(interval)) {
      return res.status(400).json({ error: '`snapshot_interval_minutes` must be one of 5, 10, 15, 20, 25, 30, or 60' });
    }
  }

  if (backup_account_id !== undefined && backup_account_id !== null) {
    if (!isValidUuid(backup_account_id)) {
      return res.status(400).json({ error: '`backup_account_id` must be a valid UUID or null' });
    }
  }

  try {
    const projectExists = await db('code_projects').where({ id, user_id: req.user.id }).first();
    if (!projectExists) return res.status(404).json({ error: `Project not found: ${id}` });
    let backupAccount = null;
    if (backup_account_id !== undefined && backup_account_id !== null) {
      backupAccount = await db('cloud_accounts').where({ id: backup_account_id, user_id: req.user.id }).first();
      if (!backupAccount) return res.status(404).json({ error: `cloud_account not found or not owned by user: ${backup_account_id}` });
    }
    const updates = {};
    if (watch_status !== undefined) {
      updates.watch_status = watch_status;
      updates.last_heartbeat_at = watch_status === 'watching' ? new Date() : null;
    }
    if (snapshot_interval_minutes !== undefined) updates.snapshot_interval_minutes = Number(snapshot_interval_minutes);
    if (backup_account_id !== undefined) {
      updates.backup_account_id = backup_account_id;
      if (!backup_account_id) {
        updates.cloud_folder_id = null;
        updates.source_archive_file_id = null;
        updates.source_archive_updated_at = null;
        updates.source_archive_size_bytes = null;
      } else if (backup_account_id !== projectExists.backup_account_id || !projectExists.cloud_folder_id) {
        updates.cloud_folder_id = await ensureProjectCloudFolder(backupAccount, projectExists);
        updates.source_archive_file_id = null;
        updates.source_archive_updated_at = null;
        updates.source_archive_size_bytes = null;
      }
    }

    const [updated] = await db('code_projects')
      .where({ id, user_id: req.user.id })
      .update(updates)
      .returning('*');

    if (!updated) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    return res.json(updated);
  } catch (err) {
    console.error(`[code-projects PATCH /${req.params.id}] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to update project', detail: err.message });
  }
});

router.post('/:id/heartbeat', async (req, res) => {
  try {
    const updated = await db('code_projects').where({ id: req.params.id, user_id: req.user.id, watch_status: 'watching' })
      .update({ last_heartbeat_at: new Date() });
    if (!updated) return res.status(404).json({ error: 'Watching project not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[code-project heartbeat]', err);
    return res.status(500).json({ error: 'Failed to record heartbeat' });
  }
});





router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await db('code_projects')
      .where({ id, user_id: req.user.id })
      .delete();

    if (!deleted) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    return res.json({ success: true, deleted: id });
  } catch (err) {
    console.error(`[code-projects DELETE /${req.params.id}] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to delete project', detail: err.message });
  }
});






router.post('/:id/snapshots', async (req, res) => {
  const { id } = req.params;
  const { filesChangedCount, snapshotKey } = req.body;

  const count = parseInt(filesChangedCount ?? 0, 10);
  if (!Number.isInteger(count) || count < 0) {
    return res.status(400).json({ error: '`filesChangedCount` must be a non-negative integer' });
  }
  if (snapshotKey !== undefined && (typeof snapshotKey !== 'string' || !/^[a-f0-9]{40,64}$/i.test(snapshotKey))) {
    return res.status(400).json({ error: '`snapshotKey` must be a Git commit hash' });
  }

  try {
    
    const project = await db('code_projects').where({ id, user_id: req.user.id }).first();
    if (!project) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    const now = new Date();

    
    let [snapshot] = await db('snapshots')
      .insert({
        project_id: id,
        files_changed_count: count,
        taken_at: now,
        snapshot_key: snapshotKey || null,
      })
      .modify((query) => { if (snapshotKey) query.onConflict(['project_id', 'snapshot_key']).ignore(); })
      .returning('*');

    if (!snapshot && snapshotKey) {
      snapshot = await db('snapshots').where({ project_id: id, snapshot_key: snapshotKey }).first();
    }

    
    await db('code_projects')
      .where({ id })
      .update({ last_snapshot_at: now });

    return res.status(201).json(snapshot);
  } catch (err) {
    console.error(`[code-projects POST /${req.params.id}/snapshots] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to log snapshot', detail: err.message });
  }
});







router.post('/:id/commit', async (req, res) => {
  const { id } = req.params;
  const { commitMessage } = req.body;

  if (!commitMessage || typeof commitMessage !== 'string' || !commitMessage.trim()) {
    return res.status(400).json({ error: '`commitMessage` is required' });
  }

  try {
    const [updated] = await db('code_projects')
      .where({ id, user_id: req.user.id })
      .update({
        last_commit_message: commitMessage.trim(),
        last_commit_at: new Date(),
      })
      .returning('*');

    if (!updated) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    return res.json({
      success: true,
      project_id: id,
      last_commit_message: updated.last_commit_message,
      last_commit_at: updated.last_commit_at,
    });
  } catch (err) {
    console.error(`[code-projects POST /${req.params.id}/commit] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to record commit', detail: err.message });
  }
});







router.post('/:id/generate-commit', async (req, res) => {
  const { id } = req.params;
  const { diffText } = req.body;

  if (!diffText || typeof diffText !== 'string' || !diffText.trim()) {
    return res.status(400).json({ error: '`diffText` is required and must be a string' });
  }

  try {
    
    const project = await db('code_projects').where({ id, user_id: req.user.id }).first();
    if (!project) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    const result = await handleGitpushTrigger(diffText);
    return res.json(result);
  } catch (err) {
    console.error(`[code-projects POST /${req.params.id}/generate-commit] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to generate commit', detail: err.message });
  }
});

router.post('/:id/local/interval', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    await execFileAsync(process.execPath, [cliEntryPath, 'interval', String(req.body?.minutes ?? '')], {
      cwd: local.project.local_path, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
    });
    return res.json({ interval: Number(req.body.minutes) });
  } catch (err) {
    return res.status(400).json({ error: 'Could not update local sync interval', detail: err.stderr?.trim() || err.message });
  }
});

router.post('/:id/local/watch', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    const requestedInterval = Number(local.project.snapshot_interval_minutes) || 15;
    const interval = [5, 10, 15, 20, 25, 30, 60].includes(requestedInterval) ? requestedInterval : 15;
    await execFileAsync(process.execPath, [cliEntryPath, 'watch', '--interval', String(interval)], {
      cwd: local.project.local_path, windowsHide: true, timeout: 70000, maxBuffer: 1024 * 1024,
    });
    return res.json({ status: 'watching' });
  } catch (err) {
    console.error('[code-projects local watch]', err);
    return res.status(500).json({ error: 'Could not start local watcher', detail: err.stderr?.trim() || err.message });
  }
});

router.post('/:id/local/pause', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    await execFileAsync(process.execPath, [cliEntryPath, 'pause'], {
      cwd: local.project.local_path, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
    });
    return res.json({ status: 'paused' });
  } catch (err) {
    console.error('[code-projects local pause]', err);
    return res.status(500).json({ error: 'Could not pause local watcher', detail: err.stderr?.trim() || err.message });
  }
});

router.post('/:id/local/push-review', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    const { inspectGitPush } = await import(pathToFileURL(gitpushReviewPath).href);
    const review = await inspectGitPush(local.project.local_path, req.body?.remote);
    return res.json(review);
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }
});

router.post('/:id/local/push', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    const { executeGitPush } = await import(pathToFileURL(gitpushReviewPath).href);
    const result = await executeGitPush(local.project.local_path, req.body || {});
    return res.json(result);
  } catch (err) {
    console.error('[code-projects local push]', err);
    return res.status(409).json({ error: err.message });
  }
});

router.post('/:id/local/push-retry', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    const { stdout } = await execFileAsync(process.execPath, [cliEntryPath, 'gitpush-retry'], {
      cwd: local.project.local_path, windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024,
    });
    return res.json({ success: true, output: stdout.trim() });
  } catch (err) {
    return res.status(409).json({ error: err.stderr?.trim() || err.message });
  }
});

module.exports = router;
