

'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_TTL_MS = 5 * 60 * 1000; 



router.post('/login/start', async (req, res) => {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const [session] = await db('cli_sessions')
      .insert({
        session_token: sessionToken,
        status: 'pending',
      })
      .returning('*');

    const verificationUrl = `${FRONTEND_URL}/cli-auth?session=${session.id}`;

    return res.status(201).json({
      sessionId: session.id,
      verificationUrl,
    });
  } catch (err) {
    console.error('[cli POST /login/start] Error:', err.message);
    return res.status(500).json({ error: 'Failed to create CLI session', detail: err.message });
  }
});




router.get('/login/poll', async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId query parameter is required' });
  }

  try {
    const session = await db('cli_sessions').where({ id: sessionId }).first();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    
    const age = Date.now() - new Date(session.created_at).getTime();
    if (age > SESSION_TTL_MS) {
      await db('cli_sessions').where({ id: sessionId }).update({ status: 'expired' });
      return res.status(410).json({ error: 'Session expired' });
    }

    if (session.status === 'claimed' && session.auth_token) {
      return res.json({ token: session.auth_token });
    }

    return res.json({ pending: true });
  } catch (err) {
    console.error('[cli GET /login/poll] Error:', err.message);
    return res.status(500).json({ error: 'Failed to poll session', detail: err.message });
  }
});




router.post('/login/claim', requireAuth, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const session = await db('cli_sessions').where({ id: sessionId }).first();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'pending') {
      return res.status(409).json({ error: `Session already ${session.status}` });
    }

    
    const age = Date.now() - new Date(session.created_at).getTime();
    if (age > SESSION_TTL_MS) {
      await db('cli_sessions').where({ id: sessionId }).update({ status: 'expired' });
      return res.status(410).json({ error: 'Session expired' });
    }

    
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!token) {
      return res.status(400).json({ error: 'Could not extract auth token' });
    }

    await db('cli_sessions').where({ id: sessionId }).update({
      user_id: req.user.id,
      status: 'claimed',
      auth_token: token,
      claimed_at: new Date(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[cli POST /login/claim] Error:', err.message);
    return res.status(500).json({ error: 'Failed to claim session', detail: err.message });
  }
});

module.exports = router;
