

'use strict';


require('dotenv').config();

const express = require('express');
const cors = require('cors');

const healthRouter        = require('./routes/health');
const googleAuthRouter    = require('./routes/auth.google');
const accountsRouter      = require('./routes/accounts');
const codeProjectsRouter  = require('./routes/codeProjects');
const cliRouter           = require('./routes/cli');
const transfersRouter     = require('./routes/transfers');
const mediaRouter         = require('./routes/media');


const app = express();


app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);


app.use('/api/accounts/:accountId/files', (req, res, next) => {
  if (req.method !== 'POST' || req.is('application/json')) return next();
  return express.raw({ type: '*/*', limit: '100mb' })(req, res, next);
});
app.use(express.json({ limit: '1mb' }));


app.use('/api/health',        healthRouter);
app.use('/api/auth/google',   googleAuthRouter);   
app.use('/api/accounts',      accountsRouter);     
app.use('/api/code-projects', codeProjectsRouter); 
app.use('/api/cli',           cliRouter);            
app.use('/api/transfers',     transfersRouter);
app.use('/api/media',         mediaRouter);


app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});



app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[dockmore-server] Running on http://localhost:${PORT}`);
  console.log(`[dockmore-server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[dockmore-server] Routes: /api/health | /api/auth/google | /api/accounts | /api/code-projects | /api/cli | /api/transfers`);
});

module.exports = app;
