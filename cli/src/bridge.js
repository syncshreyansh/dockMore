#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { API_BASE, getAllProjects, getFrontendOrigin, getToken } from './config.js';

const bridgeId = process.env.DOCKMORE_BRIDGE_ID;
const port = Number(process.env.DOCKMORE_BRIDGE_PORT || 45771);
const commandPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'localCommand.js');
if (!bridgeId || !Number.isInteger(port) || port < 1024 || port > 65535) process.exit(1);

function allowedOrigin(origin) {
  return origin === getFrontendOrigin() || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173';
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function identity(token) {
  const response = await fetch(`${API_BASE}/api/cli/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Authentication expired or backend unavailable');
  return response.json();
}

function runCommand(cwd, action, projectId, body) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [commandPath, action, projectId], {
      cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => child.kill(), action === 'push' || action === 'push-retry' ? 130000 : action === 'watch' ? 70000 : 20000);
    child.stdout.on('data', (chunk) => { stdout += chunk; if (stdout.length > 6 * 1024 * 1024) child.kill(); });
    child.stderr.on('data', (chunk) => { stderr += chunk; if (stderr.length > 1024 * 1024) child.kill(); });
    child.on('error', (err) => { clearTimeout(timeout); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(stderr.trim() || stdout.trim() || `CLI exited with code ${code}`));
      if (action === 'push-review' || action === 'push') {
        try { return resolve(JSON.parse(stdout)); }
        catch { return reject(new Error('CLI returned an invalid response')); }
      }
      return resolve({ success: true, status: action === 'watch' ? 'watching' : action === 'pause' ? 'paused' : 'pushed' });
    });
    child.stdin.end(JSON.stringify(body || {}));
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { bridgeId, pid: process.pid });
  if (!origin || !allowedOrigin(origin)) return send(res, 403, { error: 'Website origin is not allowed' });
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const match = /^\/projects\/([a-f0-9-]{36})\/(watch|pause|push-review|push|push-retry)$/.exec(req.url || '');
  if (req.method !== 'POST' || !match) return send(res, 404, { error: 'Not found' });
  try {
    const browserToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const cliToken = getToken({ reload: true });
    if (!browserToken || !cliToken) return send(res, 401, { error: 'Sign in to both the website and local CLI' });
    const [browserUser, cliUser] = await Promise.all([identity(browserToken), identity(cliToken)]);
    if (browserUser.id !== cliUser.id) return send(res, 403, { error: 'Website and local CLI use different accounts' });
    const projectId = match[1];
    const entry = Object.entries(getAllProjects()).find(([, project]) => project.projectId === projectId);
    if (!entry || !fs.existsSync(entry[0])) return send(res, 404, { error: 'Project is not linked on this computer. Run dockmore initialize or relink.' });
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 64 * 1024) return send(res, 413, { error: 'Request is too large' });
    }
    const body = raw ? JSON.parse(raw) : {};
    const result = await runCommand(entry[0], match[2], projectId, body);
    return send(res, 200, result);
  } catch (err) {
    return send(res, 409, { error: err.message });
  }
});

server.on('error', (err) => {
  if (process.send) process.send({ type: 'error', error: err.message });
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  if (process.send) process.send({ type: 'ready', port });
});
