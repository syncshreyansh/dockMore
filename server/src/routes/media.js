'use strict';
const express = require('express');
const db = require('../db/connection');
const requireAuth = require('../middleware/requireAuth');
const { getValidAccessToken } = require('../auth/tokenManager');
const { getProvider } = require('../providers');
const { createMediaToken, verifyMediaToken } = require('../auth/mediaTokens');
const router = express.Router();

router.post('/source', requireAuth, async (req, res) => {
  const { accountId, fileId, kind = 'content' } = req.body || {};
  if (typeof accountId !== 'string' || typeof fileId !== 'string' || !['content', 'thumbnail'].includes(kind)) return res.status(400).json({ error: 'A valid account, file, and media kind are required' });
  try {
    const account = await db('cloud_accounts').where({ id: accountId, user_id: req.user.id }).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const token = createMediaToken({ accountId, fileId, kind, userId: req.user.id });
    res.set('Cache-Control', 'no-store');
    return res.json({ url: `/api/media/${token}` });
  } catch (err) { return res.status(503).json({ error: 'Media is temporarily unavailable', detail: err.message }); }
});

router.get('/:token', async (req, res) => {
  const claims = verifyMediaToken(req.params.token);
  if (!claims) return res.status(401).json({ error: 'Media link expired. Open the file again.' });
  const range = req.get('range');
  if (range && !/^bytes=\d*-\d*$/.test(range)) return res.status(416).end();
  try {
    const account = await db('cloud_accounts').where({ id: claims.accountId, user_id: claims.userId }).first();
    if (!account) return res.status(404).end();
    const provider = getProvider(account.provider);
    const token = await getValidAccessToken(account.id);
    const upstream = claims.kind === 'thumbnail'
      ? await provider.getThumbnailResponse(token, claims.fileId)
      : await provider.getContentResponse(token, claims.fileId, range);
    res.status(upstream.status || 200);
    for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const value = upstream.headers.get ? upstream.headers.get(header) : upstream.headers[header];
      if (value) res.set(header, String(value));
    }
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' });
    upstream.data.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.destroy(); });
    res.on('close', () => upstream.data.destroy());
    upstream.data.pipe(res);
  } catch (err) {
    const status = Number(err.response?.status || err.status);
    return res.status([401, 403, 404, 416].includes(status) ? status : 502).json({ error: 'Could not load this media file' });
  }
});

module.exports = router;
