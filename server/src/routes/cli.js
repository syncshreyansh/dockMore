'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const requireAuth = require('../middleware/requireAuth');
const { encrypt, decrypt } = require('../auth/tokenManager');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_TTL_MS = 5 * 60 * 1000;
const CREDENTIAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const validSessionId = (value) => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
const expired = (session) => Date.now() - new Date(session.created_at).getTime() > SESSION_TTL_MS;

router.post('/login/start', async (_req, res) => {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const [session] = await db('cli_sessions').insert({ session_token: hash(sessionToken), status: 'pending' }).returning(['id']);
    return res.status(201).json({
      sessionId: session.id,
      sessionToken,
      verificationCode: session.id.slice(0, 8).toUpperCase(),
      verificationUrl: `${FRONTEND_URL}/cli-auth?session=${session.id}`,
    });
  } catch (err) {
    console.error('[cli login/start]', err);
    return res.status(500).json({ error: 'Failed to create CLI session' });
  }
});

router.get('/login/session', async (req, res) => {
  if (!validSessionId(req.query.sessionId)) return res.status(400).json({ error: 'Invalid session ID' });
  try {
    const session = await db('cli_sessions').where({ id: req.query.sessionId }).first();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (expired(session)) return res.status(410).json({ error: 'Session expired' });
    return res.json({ verificationCode: session.id.slice(0, 8).toUpperCase(), status: session.status });
  } catch (err) {
    console.error('[cli login/session]', err);
    return res.status(500).json({ error: 'Failed to read session' });
  }
});

router.post('/login/poll', async (req, res) => {
  const { sessionId, sessionToken } = req.body || {};
  if (!validSessionId(sessionId) || typeof sessionToken !== 'string') return res.status(400).json({ error: 'Session credentials required' });
  try {
    const result = await db.transaction(async (trx) => {
      const session = await trx('cli_sessions').where({ id: sessionId }).forUpdate().first();
      if (!session) return { status: 404, body: { error: 'Session not found' } };
      const provided = Buffer.from(hash(sessionToken), 'hex');
      const stored = Buffer.from(session.session_token, 'hex');
      if (provided.length !== stored.length || !crypto.timingSafeEqual(provided, stored)) return { status: 403, body: { error: 'Invalid session secret' } };
      if (expired(session)) {
        await trx('cli_sessions').where({ id: sessionId }).update({ status: 'expired', auth_token: null });
        return { status: 410, body: { error: 'Session expired' } };
      }
      if (session.status === 'claimed' && session.auth_token) {
        const token = decrypt(session.auth_token);
        await trx('cli_sessions').where({ id: sessionId }).update({ status: 'delivered', auth_token: null });
        return { status: 200, body: { token } };
      }
      if (session.status === 'pending') return { status: 200, body: { pending: true } };
      return { status: 410, body: { error: `Session ${session.status}` } };
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[cli login/poll]', err);
    return res.status(500).json({ error: 'Failed to poll session' });
  }
});

router.post('/login/claim', requireAuth, async (req, res) => {
  const { sessionId } = req.body || {};
  if (!validSessionId(sessionId) || req.cliCredentialId) return res.status(400).json({ error: 'Browser session and valid session ID required' });
  try {
    const result = await db.transaction(async (trx) => {
      const session = await trx('cli_sessions').where({ id: sessionId }).forUpdate().first();
      if (!session) return { status: 404, body: { error: 'Session not found' } };
      if (expired(session)) return { status: 410, body: { error: 'Session expired' } };
      if (session.status === 'claimed' && session.user_id === req.user.id) return { status: 200, body: { success: true } };
      if (session.status !== 'pending') return { status: 409, body: { error: `Session ${session.status}` } };
      const token = `dmcli_${crypto.randomBytes(32).toString('hex')}`;
      await trx('cli_credentials').insert({ user_id: req.user.id, token_hash: hash(token), expires_at: new Date(Date.now() + CREDENTIAL_TTL_MS) });
      await trx('cli_sessions').where({ id: sessionId, status: 'pending' }).update({ user_id: req.user.id, status: 'claimed', auth_token: encrypt(token), claimed_at: new Date() });
      return { status: 200, body: { success: true } };
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[cli login/claim]', err);
    return res.status(500).json({ error: 'Failed to authorize CLI' });
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ id: req.user.id, email: req.user.email, name: req.user.name }));
router.post('/refresh', requireAuth, async (req, res) => {
  if (!req.cliCredentialId) return res.status(403).json({ error: 'CLI credential required' });
  try {
    const token = `dmcli_${crypto.randomBytes(32).toString('hex')}`;
    await db.transaction(async (trx) => {
      await trx('cli_credentials').where({ id: req.cliCredentialId }).update({ revoked_at: new Date() });
      await trx('cli_credentials').insert({ user_id: req.user.id, token_hash: hash(token), expires_at: new Date(Date.now() + CREDENTIAL_TTL_MS) });
    });
    return res.json({ token });
  } catch (err) {
    console.error('[cli refresh]', err);
    return res.status(500).json({ error: 'Failed to rotate CLI credential' });
  }
});
router.post('/logout', requireAuth, async (req, res) => {
  if (req.cliCredentialId) await db('cli_credentials').where({ id: req.cliCredentialId }).update({ revoked_at: new Date() });
  return res.json({ success: true });
});

module.exports = router;
