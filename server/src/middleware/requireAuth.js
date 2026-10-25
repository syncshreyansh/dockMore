

'use strict';

const { createClient } = require('@supabase/supabase-js');
const db = require('../db/connection');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

async function requireAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization Bearer token',
      });
    }

    if (token.startsWith('dmcli_')) {
      const cliPath = req.originalUrl.split('?')[0];
      const allowed = cliPath.startsWith('/api/cli/') ||
        cliPath.startsWith('/api/code-projects') ||
        (req.method === 'GET' && cliPath === '/api/accounts');
      if (!allowed) return res.status(403).json({ error: 'CLI credential is not permitted for this endpoint' });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const credential = await db('cli_credentials as cc')
        .join('users as u', 'cc.user_id', 'u.id')
        .where('cc.token_hash', tokenHash)
        .whereNull('cc.revoked_at')
        .where('cc.expires_at', '>', new Date())
        .select('cc.id as credential_id', 'u.id', 'u.email', 'u.name')
        .first();
      if (!credential) return res.status(401).json({ error: 'CLI credential expired or revoked' });
      req.user = { id: credential.id, email: credential.email, name: credential.name };
      req.cliCredentialId = credential.credential_id;
      return next();
    }

    if (!supabaseAdmin) return res.status(503).json({ error: 'Authentication service is not configured' });

    const { data: { user: sbUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !sbUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authError?.message || 'Invalid or expired token',
      });
    }

    if (!sbUser.email) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User email not found in token',
      });
    }

    
    let localUser = await db('users').where({ email: sbUser.email }).first();

    if (!localUser) {
      const displayName =
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.name ||
        sbUser.email.split('@')[0];

      const [inserted] = await db('users')
        .insert({
          email: sbUser.email,
          name: displayName,
        })
        .returning('*');
      localUser = inserted;
      console.log(`[requireAuth] Created local user record for ${sbUser.email} (${localUser.id})`);
    }

    req.user = {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name,
      supabaseId: sbUser.id,
    };

    return next();
  } catch (err) {
    console.error('[requireAuth] Unexpected error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication verification failed',
    });
  }
}

module.exports = requireAuth;
