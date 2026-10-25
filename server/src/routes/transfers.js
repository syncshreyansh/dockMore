'use strict';

const express = require('express');
const db = require('../db/connection');
const { getProvider } = require('../providers');
const { getValidAccessToken } = require('../auth/tokenManager');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const rows = await db('transfers as t')
      .leftJoin('cloud_accounts as src', 't.source_account_id', 'src.id')
      .leftJoin('cloud_accounts as dst', 't.dest_account_id', 'dst.id')
      .where('t.user_id', req.user.id).orderBy('t.created_at', 'desc').limit(100)
      .select('t.*', 'src.provider as source_provider', 'src.account_email as source_account', 'dst.provider as destination_provider', 'dst.account_email as destination_account');
    return res.json(rows);
  } catch (err) {
    console.error('[transfers GET]', err.message);
    return res.status(500).json({ error: 'Could not load transfers', detail: err.message });
  }
});

router.post('/', async (req, res) => {
  const { sourceAccountId, sourceFileId, destinationAccountId, destinationFolderId } = req.body || {};
  if (!sourceAccountId || !sourceFileId || !destinationAccountId) {
    return res.status(400).json({ error: 'Source account, source file, and destination account are required' });
  }
  if (sourceAccountId === destinationAccountId) {
    return res.status(400).json({ error: 'Choose a different destination account' });
  }

  let transfer;
  try {
    const [source, destination] = await Promise.all([
      db('cloud_accounts').where({ id: sourceAccountId, user_id: req.user.id }).first(),
      db('cloud_accounts').where({ id: destinationAccountId, user_id: req.user.id }).first(),
    ]);
    if (!source || !destination) return res.status(404).json({ error: 'Source or destination account not found' });
    const sourceProvider = getProvider(source.provider);
    const destinationProvider = getProvider(destination.provider);
    const [sourceToken, destinationToken] = await Promise.all([
      getValidAccessToken(source.id), getValidAccessToken(destination.id),
    ]);
    const file = await sourceProvider.getFileMetadata(sourceToken, sourceFileId);
    const [row] = await db('transfers').insert({
      user_id: req.user.id,
      source_account_id: source.id,
      dest_account_id: destination.id,
      file_name: file.name,
      size_bytes: file.size || null,
      status: 'in_progress',
      progress: 0,
    }).returning('*');
    transfer = row;
    const stream = await sourceProvider.downloadFile(sourceToken, sourceFileId);
    const uploaded = await destinationProvider.uploadFile(destinationToken, stream, {
      name: file.name,
      mimeType: file.mimeType || 'application/octet-stream',
      parentId: destinationFolderId || undefined,
    });
    const [completed] = await db('transfers').where({ id: transfer.id, user_id: req.user.id }).update({
      status: 'completed', progress: 100, completed_at: new Date(),
    }).returning('*');
    return res.status(201).json({ ...completed, destination_file_id: uploaded.id });
  } catch (err) {
    if (transfer) await db('transfers').where({ id: transfer.id, user_id: req.user.id }).update({ status: 'failed' }).catch(() => {});
    console.error('[transfers POST]', err.message);
    return res.status(502).json({ error: 'Transfer failed', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('transfers').where({ id: req.params.id, user_id: req.user.id }).delete();
    if (!deleted) return res.status(404).json({ error: 'Transfer not found' });
    return res.status(204).end();
  } catch (err) {
    console.error('[transfers DELETE]', err.message);
    return res.status(500).json({ error: 'Could not remove transfer', detail: err.message });
  }
});

module.exports = router;
