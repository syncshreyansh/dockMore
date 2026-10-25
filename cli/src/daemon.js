#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { simpleGit } from 'simple-git';
import fetch from 'node-fetch';
import { getToken, setToken } from './config.js';


const PROJECT_DIR  = process.env.DOCKMORE_PROJECT_DIR;
const SHADOW_DIR   = process.env.DOCKMORE_SHADOW_DIR;
const PROJECT_ID   = process.env.DOCKMORE_PROJECT_ID;
const INTERVAL_MIN = parseInt(process.env.DOCKMORE_INTERVAL || '15', 10);
let TOKEN          = process.env.DOCKMORE_TOKEN;
const API_BASE     = process.env.DOCKMORE_API_URL || 'http://localhost:5000';
const DAEMON_ID    = process.env.DOCKMORE_DAEMON_ID;

if (!PROJECT_DIR || !SHADOW_DIR || !PROJECT_ID || !TOKEN || !DAEMON_ID) {
  process.exit(1);
}


const git = simpleGit({
  baseDir: PROJECT_DIR,
}).env({
  GIT_DIR: SHADOW_DIR,
  GIT_WORK_TREE: PROJECT_DIR,
});
const heartbeatPath = path.join(SHADOW_DIR, 'daemon-heartbeat.json');
function heartbeat() {
  fs.writeFileSync(heartbeatPath, JSON.stringify({ pid: process.pid, daemonId: DAEMON_ID, projectId: PROJECT_ID, timestamp: Date.now() }));
}
async function remoteHeartbeat() {
  try {
    const response = await fetch(`${API_BASE}/api/code-projects/${PROJECT_ID}/heartbeat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const latest = getToken({ reload: true });
        if (latest && latest !== TOKEN) TOKEN = latest;
      }
      throw new Error(`Heartbeat API returned ${response.status}`);
    }
  } catch (err) {
    fs.appendFileSync(path.join(SHADOW_DIR, 'daemon-error.log'), `[${new Date().toISOString()}] heartbeat: ${err.message}\n`);
  }
}
async function refreshCredential() {
  try {
    const latest = getToken({ reload: true });
    if (latest && latest !== TOKEN) { TOKEN = latest; return; }
    if (!latest) return;
    const response = await fetch(`${API_BASE}/api/cli/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Credential refresh returned ${response.status}`);
    const body = await response.json();
    if (!body.token?.startsWith('dmcli_')) throw new Error('Credential refresh returned an invalid token');
    setToken(body.token);
    TOKEN = body.token;
  } catch (err) {
    fs.appendFileSync(path.join(SHADOW_DIR, 'daemon-error.log'), `[${new Date().toISOString()}] credential refresh: ${err.message}\n`);
  }
}
heartbeat();

try {
  await git.status();
} catch (err) {
  const logPath = path.join(SHADOW_DIR, 'daemon-error.log');
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] startup: ${err.message}\n`);
  process.exit(1);
}


async function snapshot() {
  let localSnapshotSucceeded = false;
  try {
    const status = await git.status();
    const changedCount = status.files.length;

    if (changedCount === 0) { localSnapshotSucceeded = true; await flushPendingSnapshots(); return true; }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await git.add('-A');
    await git.commit(`snapshot: ${timestamp} (${changedCount} files changed)`);
    localSnapshotSucceeded = true;
    const commitHash = (await git.revparse(['HEAD'])).trim();
    try {
      const outbox = readOutbox();
      outbox.push({ snapshotKey: commitHash, filesChangedCount: changedCount });
      writeOutbox(outbox);
    } catch (err) {
      fs.appendFileSync(path.join(SHADOW_DIR, 'outbox-recovery.jsonl'), JSON.stringify({ snapshotKey: commitHash, filesChangedCount: changedCount }) + '\n');
      throw err;
    }
    await flushPendingSnapshots();
    return true;
  } catch (err) {
    
    const logPath = path.join(SHADOW_DIR, 'daemon-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${err.message}\n`);
    return localSnapshotSucceeded;
  }
}

const outboxPath = path.join(SHADOW_DIR, 'pending-snapshots.json');
function readOutbox() {
  if (!fs.existsSync(outboxPath)) return [];
  const items = JSON.parse(fs.readFileSync(outboxPath, 'utf8'));
  if (!Array.isArray(items) || items.some((item) => !/^[a-f0-9]{40,64}$/i.test(item?.snapshotKey) || !Number.isInteger(item?.filesChangedCount))) {
    throw new Error(`Invalid snapshot outbox: ${outboxPath}. Preserved for repair.`);
  }
  return items;
}
function writeOutbox(items) {
  const temporary = `${outboxPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(items), 'utf8');
  fs.renameSync(temporary, outboxPath);
}
async function flushPendingSnapshots() {
  let pending = readOutbox();
  if (!pending.length) return;
  for (const item of [...pending]) {
    try {
      const response = await fetch(`${API_BASE}/api/code-projects/${PROJECT_ID}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error(`Snapshot API returned ${response.status}`);
      pending = pending.filter((candidate) => candidate.snapshotKey !== item.snapshotKey);
      writeOutbox(pending);
    } catch (err) {
      const logPath = path.join(SHADOW_DIR, 'daemon-error.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] metadata retry ${item.snapshotKey}: ${err.message}\n`);
      if (/returned 4(00|04|09|10|22)/.test(err.message)) {
        fs.appendFileSync(path.join(SHADOW_DIR, 'outbox-rejected.jsonl'), JSON.stringify({ ...item, error: err.message }) + '\n');
        pending = pending.filter((candidate) => candidate.snapshotKey !== item.snapshotKey);
        writeOutbox(pending);
        continue;
      }
      break;
    }
  }
}


if (!(await snapshot())) process.exit(1);
if (process.send) process.send({ type: 'ready' });


const intervalMs = INTERVAL_MIN * 60 * 1000;
let running = false;
setInterval(async () => {
  if (running) return;
  running = true;
  try { heartbeat(); await snapshot(); } finally { running = false; }
}, intervalMs);
setInterval(() => { heartbeat(); void remoteHeartbeat(); }, 30_000);
setTimeout(() => { void refreshCredential(); }, 60_000);
setInterval(() => { void refreshCredential(); }, 12 * 60 * 60 * 1000);


process.on('SIGTERM', () => {
  try { fs.unlinkSync(heartbeatPath); } catch {}
  process.exit(0);
});

process.on('SIGINT', () => {
  try { fs.unlinkSync(heartbeatPath); } catch {}
  process.exit(0);
});
