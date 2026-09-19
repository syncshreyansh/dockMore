

'use strict';

const express = require('express');
const db = require('../db/connection');
const { handleGitpushTrigger } = require('../agents/orchestrator');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();


router.use(requireAuth);


const VALID_WATCH_STATUSES = ['watching', 'paused'];

function isValidUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}





router.post('/', async (req, res) => {
  const { name, local_path, backup_account_id, snapshot_interval_minutes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '`name` is required' });
  }

  
  if (backup_account_id) {
    if (!isValidUuid(backup_account_id)) {
      return res.status(400).json({ error: '`backup_account_id` must be a valid UUID' });
    }
    const account = await db('cloud_accounts')
      .where({ id: backup_account_id, user_id: req.user.id })
      .first();
    if (!account) {
      return res.status(404).json({ error: `cloud_account not found or not owned by user: ${backup_account_id}` });
    }
  }

  if (snapshot_interval_minutes !== undefined) {
    const interval = parseInt(snapshot_interval_minutes, 10);
    if (!Number.isInteger(interval) || interval < 1) {
      return res.status(400).json({ error: '`snapshot_interval_minutes` must be a positive integer' });
    }
  }

  try {
    const [project] = await db('code_projects')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        local_path: local_path || null,
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
        'cp.snapshot_interval_minutes',
        'cp.watch_status',
        'cp.last_snapshot_at',
        'cp.last_commit_message',
        'cp.last_commit_at',
        'cp.created_at',
        'ca.id        as backup_account_id',
        'ca.provider  as backup_provider',
        'ca.account_email as backup_account_email'
      );

    return res.json({ count: projects.length, projects });
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
      .select('id', 'files_changed_count', 'taken_at');

    return res.json({ ...project, snapshots });
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
    const account = await db('cloud_accounts')
      .where({ id: backup_account_id, user_id: req.user.id })
      .first();
    if (!account) {
      return res.status(404).json({ error: `cloud_account not found or not owned by user: ${backup_account_id}` });
    }
  }

  try {
    const updates = {};
    if (watch_status !== undefined)             updates.watch_status = watch_status;
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
  const { filesChangedCount } = req.body;

  const count = parseInt(filesChangedCount ?? 0, 10);
  if (!Number.isInteger(count) || count < 0) {
    return res.status(400).json({ error: '`filesChangedCount` must be a non-negative integer' });
  }

  try {
    
    const project = await db('code_projects').where({ id, user_id: req.user.id }).first();
    if (!project) {
      return res.status(404).json({ error: `Project not found: ${id}` });
    }

    const now = new Date();

    
    const [snapshot] = await db('snapshots')
      .insert({
        project_id: id,
        files_changed_count: count,
        taken_at: now,
      })
      .returning('*');

    
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

module.exports = router;
