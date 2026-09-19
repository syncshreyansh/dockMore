

const express = require('express');
const db = require('../db/connection');

const router = express.Router();


router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


router.get('/db', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[health/db] DB connection failed:', err.message);
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
    });
  }
});

module.exports = router;
