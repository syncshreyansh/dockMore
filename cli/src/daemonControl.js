import fs from 'fs';
import path from 'path';

export function daemonState(project) {
  if (!project?.watchPid) return 'stopped';
  let heartbeat;
  try { heartbeat = JSON.parse(fs.readFileSync(path.join(project.shadowRepoPath, 'daemon-heartbeat.json'), 'utf8')); }
  catch { return 'unverified'; }
  if (heartbeat.pid !== project.watchPid || heartbeat.daemonId !== project.daemonId || heartbeat.projectId !== project.projectId) return 'unverified';
  try { process.kill(project.watchPid, 0); }
  catch { return 'stopped'; }
  if (Date.now() - heartbeat.timestamp > 90_000) return 'stale';
  return 'running';
}

export async function stopDaemon(project) {
  const state = daemonState(project);
  if (state === 'unverified' || state === 'stale') throw new Error(`Daemon identity is ${state}; refusing to signal PID ${project.watchPid}`);
  if (state === 'running') {
    process.kill(project.watchPid, 'SIGTERM');
    let stopped = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try { process.kill(project.watchPid, 0); }
      catch { stopped = true; break; }
    }
    if (!stopped) throw new Error(`Watch daemon ${project.watchPid} did not stop within five seconds`);
  }
  return state;
}
