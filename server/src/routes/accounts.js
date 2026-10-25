

'use strict';

const express = require('express');
const db = require('../db/connection');
const { getProvider } = require('../providers');
const { getValidAccessToken } = require('../auth/tokenManager');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();


router.use(requireAuth);


function normalizeProvider(provider) {
  if (provider === 'google_drive') return 'google-drive';
  return provider;
}

function getProviderDisplayName(provider) {
  if (provider === 'google_drive' || provider === 'google-drive') return 'Google Drive';
  if (provider === 'onedrive') return 'OneDrive';
  if (provider === 'dropbox') return 'Dropbox';
  if (provider === 'mega') return 'MEGA';
  return provider;
}



router.get('/', async (req, res) => {
  try {
    const accounts = await db('cloud_accounts')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc');
    const counts = accounts.length ? await db('files_cache')
      .select('cloud_account_id')
      .count({ file_count: 'id' })
      .whereIn('cloud_account_id', accounts.map((account) => account.id))
      .whereNot('mime_type', 'application/vnd.google-apps.folder')
      .groupBy('cloud_account_id') : [];
    const countByAccount = new Map(counts.map((row) => [row.cloud_account_id, Number(row.file_count)]));

    const formatted = await Promise.all(accounts.map(async (acc) => {
      const provKey = normalizeProvider(acc.provider);
      
      let usedStorageGB = null;
      let totalStorageGB = null;
      
      try {
        const accessToken = await getValidAccessToken(acc.id);
        const provider = getProvider(acc.provider);
        const storage = await provider.getStorageInfo(accessToken);
        if (storage) {
          usedStorageGB = Number(((storage.used || 0) / (1024 ** 3)).toFixed(1));
          totalStorageGB = storage.total == null ? null : Number((storage.total / (1024 ** 3)).toFixed(1));
        }
      } catch (e) {
        usedStorageGB = null;
        totalStorageGB = null;
        console.error(`[accounts GET /] Failed to fetch storage for account ${acc.id}:`, e.message);
      }

      return {
        id: acc.id,
        provider: provKey,
        providerName: getProviderDisplayName(provKey),
        name: `${getProviderDisplayName(provKey)} (${acc.account_email})`,
        email: acc.account_email,
        usedStorageGB,
        totalStorageGB,
        status: acc.status || 'active',
        lastSynced: acc.last_synced_at
          ? new Date(acc.last_synced_at).toLocaleString()
          : 'Never',
        lastSyncedAt: acc.last_synced_at ? new Date(acc.last_synced_at).toISOString() : null,
        fileCount: countByAccount.get(acc.id) || 0,
        createdAt: acc.created_at,
      };
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('[accounts GET /] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch accounts', detail: err.message });
  }
});



router.get('/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const account = await db('cloud_accounts')
      .where({ id: accountId, user_id: req.user.id })
      .first();

    if (!account) {
      return res.status(404).json({ error: `Account not found: ${accountId}` });
    }

    const provKey = normalizeProvider(account.provider);
    let usedStorageGB = null;
    let totalStorageGB = null;
    
    try {
      const accessToken = await getValidAccessToken(account.id);
      const provider = getProvider(account.provider);
      const storage = await provider.getStorageInfo(accessToken);
      if (storage) {
        usedStorageGB = Number(((storage.used || 0) / (1024 ** 3)).toFixed(1));
        totalStorageGB = storage.total == null ? null : Number((storage.total / (1024 ** 3)).toFixed(1));
      }
    } catch (e) {
      usedStorageGB = null;
      totalStorageGB = null;
      console.error(`[accounts GET /${accountId}] Failed to fetch storage:`, e.message);
    }

    return res.json({
      id: account.id,
      provider: provKey,
      providerName: getProviderDisplayName(provKey),
      name: `${getProviderDisplayName(provKey)} (${account.account_email})`,
      email: account.account_email,
      usedStorageGB,
      totalStorageGB,
      status: account.status || 'active',
      lastSynced: account.last_synced_at
        ? new Date(account.last_synced_at).toLocaleString()
        : 'Never',
      lastSyncedAt: account.last_synced_at ? new Date(account.last_synced_at).toISOString() : null,
      createdAt: account.created_at,
    });
  } catch (err) {
    console.error(`[accounts GET /${accountId}] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch account', detail: err.message });
  }
});



router.delete('/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const deleted = await db('cloud_accounts')
      .where({ id: accountId, user_id: req.user.id })
      .delete();

    if (!deleted) {
      return res.status(404).json({ error: `Account not found: ${accountId}` });
    }

    return res.json({ success: true, id: accountId });
  } catch (err) {
    console.error(`[accounts DELETE /${accountId}] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to disconnect account', detail: err.message });
  }
});



router.post('/:accountId/sync', async (req, res) => {
  const { accountId } = req.params;

  try {
    const account = await db('cloud_accounts')
      .where({ id: accountId, user_id: req.user.id })
      .first();

    if (!account) {
      return res.status(404).json({ error: `Account not found: ${accountId}` });
    }

    const accessToken = await getValidAccessToken(accountId);
    const provider = getProvider(account.provider);
    const files = await provider.listFiles(accessToken, '*');
    const now = new Date();
    await db.transaction(async (trx) => {
      const rows = files.map((file) => ({
          cloud_account_id: accountId,
          provider_file_id: file.id,
          name: file.name,
          path: (file.parents || []).join('/'),
          size_bytes: file.size || null,
          mime_type: file.mimeType,
          modified_at: file.modifiedAt || null,
          synced_at: now,
        }));
      for (let offset = 0; offset < rows.length; offset += 500) {
        await trx('files_cache').insert(rows.slice(offset, offset + 500)).onConflict(['cloud_account_id', 'provider_file_id']).merge();
      }
      await trx('files_cache').where({ cloud_account_id: accountId })
        .where((query) => query.where('synced_at', '<', now).orWhereNull('synced_at')).del();
    });
    await db('cloud_accounts')
      .where({ id: accountId })
      .update({ last_synced_at: now });

    return res.json({
      success: true,
      id: accountId,
      syncedAt: now.toISOString(),
      fileCount: files.filter((file) => !file.isFolder).length,
      lastSynced: 'Just now',
    });
  } catch (err) {
    console.error(`[accounts POST /${accountId}/sync] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to sync account', detail: err.message });
  }
});

router.post('/:accountId/folders', async (req, res) => {
  const { accountId } = req.params;
  const { name, parentId } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const result = await getProvider(account.provider).createFolder(await getValidAccessToken(accountId), name.trim(), parentId || undefined);
    return res.status(201).json(result);
  } catch (err) {
    console.error(`[accounts/${accountId}/folders POST]`, err.message);
    return res.status(502).json({ error: 'Folder creation failed', detail: err.message });
  }
});



router.get('/:accountId/files', async (req, res) => {
  const { accountId } = req.params;
  const { folderId } = req.query; 

  try {
    
    const account = await db('cloud_accounts')
      .where({ id: accountId, user_id: req.user.id })
      .first();

    if (!account) {
      return res.status(404).json({ error: `Account not found: ${accountId}` });
    }

    
    const accessToken = await getValidAccessToken(accountId);

    
    const provider = getProvider(account.provider);
    const rawFiles = await provider.listFiles(accessToken, folderId || 'root');

    const provKey = normalizeProvider(account.provider);

    return res.json({
      accountId,
      provider: provKey,
      email: account.account_email,
      folderId: folderId || 'root',
      count: rawFiles.length,
      files: rawFiles,
    });
  } catch (err) {
    console.error(`[accounts/${accountId}/files] Error:`, err.message);

    
    if (err.message?.includes('revoked') || err.message?.includes('expired credentials')) {
      return res.status(401).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Failed to list files', detail: err.message });
  }
});

router.post('/:accountId/files', async (req, res) => {
  const { accountId } = req.params;
  const name = String(req.query.name || '').trim();
  const parentId = req.query.folderId ? String(req.query.folderId) : undefined;
  if (!name || !Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'A file name and binary request body are required' });
  }
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const provider = getProvider(account.provider);
    const stream = require('stream').Readable.from(req.body);
    const uploaded = await provider.uploadFile(await getValidAccessToken(accountId), stream, {
      name,
      mimeType: req.get('content-type') || 'application/octet-stream',
      parentId,
    });
    return res.status(201).json(uploaded);
  } catch (err) {
    console.error(`[accounts/${accountId}/files POST]`, err.message);
    return res.status(502).json({ error: 'Upload failed', detail: err.message });
  }
});

router.get('/:accountId/files/:fileId/content', async (req, res) => {
  const { accountId, fileId } = req.params;
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const stream = await getProvider(account.provider).downloadFile(await getValidAccessToken(accountId), fileId);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(req.query.name || fileId)}`);
    stream.on('error', (err) => {
      console.error('[file download stream]', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Download failed' });
      else res.destroy(err);
    });
    stream.pipe(res);
  } catch (err) {
    console.error(`[accounts/${accountId}/files/${fileId} GET]`, err.message);
    return res.status(502).json({ error: 'Download failed', detail: err.message });
  }
});

router.patch('/:accountId/files/:fileId', async (req, res) => {
  const { accountId, fileId } = req.params;
  const { name, parentId, starred } = req.body || {};
  if (name === undefined && parentId === undefined && starred === undefined) {
    return res.status(400).json({ error: 'Provide a name, parentId, or starred value' });
  }
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) return res.status(400).json({ error: 'name must be a non-empty string' });
    if (starred !== undefined && typeof starred !== 'boolean') return res.status(400).json({ error: 'starred must be boolean' });
    const data = await getProvider(account.provider).updateFile(await getValidAccessToken(accountId), fileId, {
      ...(name !== undefined ? { name: name.trim() } : {}), parentId, starred,
    });
    return res.json(data);
  } catch (err) {
    console.error(`[accounts/${accountId}/files/${fileId} PATCH]`, err.message);
    return res.status(502).json({ error: 'File update failed', detail: err.message });
  }
});

router.delete('/:accountId/files/:fileId', async (req, res) => {
  const { accountId, fileId } = req.params;
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    await getProvider(account.provider).deleteFile(await getValidAccessToken(accountId), fileId);
    return res.status(204).end();
  } catch (err) {
    console.error(`[accounts/${accountId}/files/${fileId} DELETE]`, err.message);
    return res.status(502).json({ error: 'File deletion failed', detail: err.message });
  }
});

router.post('/:accountId/files/:fileId/share', async (req, res) => {
  const { accountId, fileId } = req.params;
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const link = await getProvider(account.provider).createPublicReadPermission(await getValidAccessToken(accountId), fileId);
    return res.json({ url: link });
  } catch (err) {
    console.error(`[accounts/${accountId}/files/${fileId}/share]`, err.message);
    return res.status(502).json({ error: 'Could not create share link', detail: err.message });
  }
});

module.exports = router;
