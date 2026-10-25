

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





router.post('/', async (req, res) => {
  const { name, local_path, backup_account_id, snapshot_interval_minutes, branch } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '`name` is required' });
  }

  
  if (backup_account_id && !isValidUuid(backup_account_id)) {
    return res.status(400).json({ error: '`backup_account_id` must be a valid UUID' });
  }

  if (snapshot_interval_minutes !== undefined) {
    const interval = parseInt(snapshot_interval_minutes, 10);
    if (!Number.isInteger(interval) || interval < 1) {
      return res.status(400).json({ error: '`snapshot_interval_minutes` must be a positive integer' });
    }
  }

  try {
    if (backup_account_id) {
      const account = await db('cloud_accounts').where({ id: backup_account_id, user_id: req.user.id }).first();
      if (!account) return res.status(404).json({ error: `cloud_account not found or not owned by user: ${backup_account_id}` });
    }
    const [project] = await db('code_projects')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        local_path: local_path || null,
        branch: typeof branch === 'string' ? branch.slice(0, 255) : null,
        backup_account_id: backup_account_id || null,
        snapshot_interval_minutes: snapshot_interval_minutes
          ? parseInt(snapshot_interval_minutes, 10)
          : 15,
        watch_status: 'paused',
      })
      .returning('*');

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
    const interval = parseInt(snapshot_interval_minutes, 10);
    if (!Number.isInteger(interval) || interval < 1) {
      return res.status(400).json({ error: '`snapshot_interval_minutes` must be a positive integer' });
    }
  }

  if (backup_account_id !== undefined && backup_account_id !== null) {
    if (!isValidUuid(backup_account_id)) {
      return res.status(400).json({ error: '`backup_account_id` must be a valid UUID or null' });
    }
  }

  try {
    const projectExists = await db('code_projects').where({ id, user_id: req.user.id }).first('id');
    if (!projectExists) return res.status(404).json({ error: `Project not found: ${id}` });
    if (backup_account_id !== undefined && backup_account_id !== null) {
      const account = await db('cloud_accounts').where({ id: backup_account_id, user_id: req.user.id }).first('id');
      if (!account) return res.status(404).json({ error: `cloud_account not found or not owned by user: ${backup_account_id}` });
    }
    const updates = {};
    if (watch_status !== undefined) {
      updates.watch_status = watch_status;
      updates.last_heartbeat_at = watch_status === 'watching' ? new Date() : null;
    }
    if (snapshot_interval_minutes !== undefined) updates.snapshot_interval_minutes = parseInt(snapshot_interval_minutes, 10);
    if (backup_account_id !== undefined)         updates.backup_account_id = backup_account_id; 

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

router.post('/:id/local/watch', async (req, res) => {
  try {
    const local = await getLocalProject(req, req.params.id);
    if (local.error) return res.status(local.status).json({ error: local.error });
    const interval = Number(local.project.snapshot_interval_minutes) || 15;
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
