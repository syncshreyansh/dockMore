

'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const googleDrive = require('../providers/GoogleDriveProvider');
const { encrypt, decrypt } = require('../auth/tokenManager');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const STATE_TTL_MS = 10 * 60 * 1000;

function stateSignature(payload) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('TOKEN_ENCRYPTION_KEY must be configured before Google OAuth can be used');
  return crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(payload).digest('base64url');
}

function validateState(state) {
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature) return null;
  const expected = stateSignature(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!data.userId || !data.expiresAt || data.expiresAt < Date.now()) return null;
  return data;
}


router.post('/url', requireAuth, async (req, res) => {
  
  const payload = Buffer.from(JSON.stringify({
    userId: req.user.id,
    nonce: crypto.randomBytes(24).toString('hex'),
    expiresAt: Date.now() + STATE_TTL_MS,
  })).toString('base64url');
  const state = `${payload}.${stateSignature(payload)}`;

  try {
    const stateData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    await db('google_oauth_states').insert({ nonce: stateData.nonce, user_id: stateData.userId, expires_at: new Date(stateData.expiresAt) });
    await db('google_oauth_states').where('expires_at', '<', new Date()).del();
    const authUrl = googleDrive.getAuthUrl(state);
    return res.json({ url: authUrl });
  } catch (err) {
    return res.status(503).json({ error: 'Google OAuth is not configured', detail: err.message });
  }
});


router.get('/callback', async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    console.error('[google/callback] OAuth error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accounts?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    
    const stateData = validateState(state);
    if (!stateData) return res.status(400).json({ error: 'Invalid or expired OAuth state' });
    const claimedState = await db('google_oauth_states')
      .where({ nonce: stateData.nonce, user_id: stateData.userId })
      .where('expires_at', '>', new Date()).del();
    if (!claimedState) return res.status(400).json({ error: 'OAuth state was already used or expired' });
    const user = await db('users').where({ id: stateData.userId }).first();
    if (!user) return res.status(400).json({ error: 'OAuth account owner no longer exists' });
    const { accessToken, refreshToken, expiresAt, email, name } = await googleDrive.exchangeCode(code);

    
    const existing = await db('cloud_accounts')
      .where({ user_id: user.id, provider: 'google_drive', account_email: email })
      .first();

    const encryptedRefreshToken = refreshToken
      ? encrypt(refreshToken)
      : existing?.refresh_token_enc;
    if (!encryptedRefreshToken) return res.status(502).json({ error: 'Google did not return a refresh token. Revoke DockMore access in Google and reconnect.' });

    const accountData = {
      provider: 'google_drive',
      account_email: email,
      access_token_enc: encrypt(accessToken),
      refresh_token_enc: encryptedRefreshToken,
      expires_at: expiresAt,
      scopes: db.raw("ARRAY['drive','userinfo.email','userinfo.profile']"),
      status: 'active',
      last_synced_at: new Date(),
    };

    let accountId;
    if (existing) {
      
      await db('cloud_accounts').where({ id: existing.id }).update(accountData);
      accountId = existing.id;
      console.log(`[google/callback] Re-authenticated account ${accountId} (${email}) for user ${user.id}`);
    } else {
      const [newAccount] = await db('cloud_accounts')
        .insert({ user_id: user.id, ...accountData })
        .returning('id');
      accountId = newAccount.id;
      console.log(`[google/callback] New account created: ${accountId} (${email}) for user ${user.id}`);
    }

    
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accounts?connected=${accountId}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('[google/callback] Error during OAuth exchange:', err);
    return res.status(500).json({ error: 'OAuth callback failed', detail: err.message });
  }
});

module.exports = router;
