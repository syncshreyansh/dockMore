

'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const googleDrive = require('../providers/GoogleDriveProvider');
const { encrypt } = require('../auth/tokenManager');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();


router.get('/connect', requireAuth, (req, res) => {
  
  const stateData = {
    userId: req.user.id,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  const authUrl = googleDrive.getAuthUrl(state);
  return res.redirect(authUrl);
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
    
    const { accessToken, refreshToken, expiresAt, email, name } =
      await googleDrive.exchangeCode(code);

    
    let targetUserId = null;
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (parsed && parsed.userId) {
          targetUserId = parsed.userId;
        }
      } catch (stateErr) {
        console.warn('[google/callback] Failed to decode OAuth state:', stateErr.message);
      }
    }

    let user = null;
    if (targetUserId) {
      user = await db('users').where({ id: targetUserId }).first();
    }

    
    if (!user) {
      user = await db('users').where({ email }).first();
      if (!user) {
        const [inserted] = await db('users')
          .insert({ email, name: name || email })
          .returning('*');
        user = inserted;
      }
    }

    
    const existing = await db('cloud_accounts')
      .where({ user_id: user.id, provider: 'google_drive', account_email: email })
      .first();

    const accountData = {
      provider: 'google_drive',
      account_email: email,
      access_token_enc: encrypt(accessToken),
      refresh_token_enc: encrypt(refreshToken),
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
