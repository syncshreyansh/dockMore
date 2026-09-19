

'use strict';

const { createClient } = require('@supabase/supabase-js');
const db = require('../db/connection');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[requireAuth] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables!');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function requireAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.query && req.query.token) {
      token = String(req.query.token).trim();
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization Bearer token',
      });
    }

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
