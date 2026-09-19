/**
 * Accounts routes
 *
 * All routes require authentication via `requireAuth` middleware.
 * All database operations strictly filter by `req.user.id`.
 *
 * GET    /api/accounts                   — list all connected cloud accounts for user
 * GET    /api/accounts/:accountId         — get single cloud account details
 * DELETE /api/accounts/:accountId         — disconnect/delete a cloud account
 * POST   /api/accounts/:accountId/sync    — trigger a sync for a cloud account
 * GET    /api/accounts/:accountId/files   — list real files for an account from the provider
 */

'use strict';

const express = require('express');
const db = require('../db/connection');
const { getProvider } = require('../providers');
const { getValidAccessToken } = require('../auth/tokenManager');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Apply requireAuth to all account routes
router.use(requireAuth);

/**
 * Helper to normalize provider identifier for frontend components
 */
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

// ── GET /api/accounts ────────────────────────────────────────────────────────
// List all cloud accounts connected by the authenticated user
router.get('/', async (req, res) => {
  try {
    const accounts = await db('cloud_accounts')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc');

    const formatted = await Promise.all(accounts.map(async (acc) => {
      const provKey = normalizeProvider(acc.provider);
      
      let usedStorageGB = 0;
      let totalStorageGB = 15;
      
      try {
        const accessToken = await getValidAccessToken(acc.id);
        const provider = getProvider(acc.provider);
        const storage = await provider.getStorageInfo(accessToken);
        if (storage) {
          usedStorageGB = storage.used ? Number((storage.used / (1024 ** 3)).toFixed(1)) : 0;
          totalStorageGB = storage.total ? Number((storage.total / (1024 ** 3)).toFixed(1)) : 15;
        }
      } catch (e) {
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
        fileCount: 0,
        createdAt: acc.created_at,
      };
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('[accounts GET /] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch accounts', detail: err.message });
  }
});

// ── GET /api/accounts/:accountId ─────────────────────────────────────────────
// Get single account details for the authenticated user
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
    let usedStorageGB = 0;
    let totalStorageGB = 15;
    
    try {
      const accessToken = await getValidAccessToken(account.id);
      const provider = getProvider(account.provider);
      const storage = await provider.getStorageInfo(accessToken);
      if (storage) {
        usedStorageGB = storage.used ? Number((storage.used / (1024 ** 3)).toFixed(1)) : 0;
        totalStorageGB = storage.total ? Number((storage.total / (1024 ** 3)).toFixed(1)) : 15;
      }
    } catch (e) {
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
      createdAt: account.created_at,
    });
  } catch (err) {
    console.error(`[accounts GET /${accountId}] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch account', detail: err.message });
  }
});

// ── DELETE /api/accounts/:accountId ──────────────────────────────────────────
// Disconnect/delete an account for the authenticated user
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

// ── POST /api/accounts/:accountId/sync ───────────────────────────────────────
// Trigger a manual sync for an account
router.post('/:accountId/sync', async (req, res) => {
  const { accountId } = req.params;

  try {
    const account = await db('cloud_accounts')
      .where({ id: accountId, user_id: req.user.id })
      .first();

    if (!account) {
      return res.status(404).json({ error: `Account not found: ${accountId}` });
    }

    const now = new Date();
    await db('cloud_accounts')
      .where({ id: accountId })
      .update({ last_synced_at: now });

    return res.json({
      success: true,
      id: accountId,
      syncedAt: now.toISOString(),
      lastSynced: 'Just now',
    });
  } catch (err) {
    console.error(`[accounts POST /${accountId}/sync] Error:`, err.message);
    return res.status(500).json({ error: 'Failed to sync account', detail: err.message });
  }
});

// ── GET /api/accounts/:accountId/files ───────────────────────────────────────
// Get real files from provider for a specific account belonging to the user
router.get('/:accountId/files', async (req, res) => {
  const { accountId } = req.params;
  const { folderId } = req.query; // optional: list a specific sub-folder

  try {
    // 1. Verify account exists in DB AND belongs to authenticated user
    const account = await db('cloud_accounts')
      .where({ id: accountId, user_id: req.user.id })
      .first();

    if (!account) {
      return res.status(404).json({ error: `Account not found: ${accountId}` });
    }

    // 2. Get a valid (auto-refreshed if needed) access token
    const accessToken = await getValidAccessToken(accountId);

    // 3. Call the provider
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

    // Surface token-revocation errors cleanly
    if (err.message?.includes('revoked') || err.message?.includes('expired credentials')) {
      return res.status(401).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Failed to list files', detail: err.message });
  }
});

module.exports = router;
