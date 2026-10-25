import crypto from 'crypto';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getBridge, setBridge } from './config.js';

const bridgePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'bridge.js');
const healthUrl = 'http://127.0.0.1:45771/health';

async function readHealth() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

export async function startBridge() {
  const current = getBridge();
  const health = await readHealth();
  if (health) {
    if (current.id && health.bridgeId === current.id && health.pid === current.pid) return health;
    throw new Error('Port 45771 is already used by another local service');
  }
  const id = crypto.randomUUID();
  const child = spawn(process.execPath, [bridgePath], {
    detached: true, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: { ...process.env, DOCKMORE_BRIDGE_ID: id },
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Local bridge did not start')), 10000);
      child.once('message', (message) => {
        clearTimeout(timer);
        if (message?.type === 'ready') resolve();
        else reject(new Error(message?.error || 'Local bridge failed'));
      });
      child.once('error', (err) => { clearTimeout(timer); reject(err); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Local bridge exited (${code})`)); });
    });
    setBridge(id, child.pid);
    child.disconnect();
    child.unref();
    return { bridgeId: id, pid: child.pid };
  } catch (err) {
    try { process.kill(child.pid, 'SIGTERM'); } catch {}
    throw err;
  }
}

export async function stopBridge() {
  const current = getBridge();
  const health = await readHealth();
  if (health && health.bridgeId === current.id && health.pid === current.pid) {
    process.kill(current.pid, 'SIGTERM');
  }
  setBridge('', 0);
}
