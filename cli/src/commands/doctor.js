import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { api } from '../api.js';
import { getProject, getToken } from '../config.js';
import { daemonState } from '../daemonControl.js';

const exec = promisify(execFile);
export async function doctor(options = {}) {
  const findings = [];
  const add = (name, ok, detail) => findings.push({ name, ok, detail });
  try { const { stdout } = await exec('git', ['--version']); add('git', true, stdout.trim()); }
  catch (err) { add('git', false, err.message); }
  try { await api.get('/api/health'); add('backend', true, 'reachable'); }
  catch (err) { add('backend', false, err.message); }
  if (!getToken()) add('authentication', false, 'not logged in');
  else {
    try { const me = await api.get('/api/cli/me'); add('authentication', true, me.email); }
    catch (err) { add('authentication', false, err.message); }
  }
  const project = getProject(process.cwd());
  if (project) {
    add('shadowRepository', fs.existsSync(project.shadowRepoPath), project.shadowRepoPath);
    const state = daemonState(project);
    add('watcher', state === 'running' || state === 'stopped', state);
    try {
      const { stdout } = await exec('git', ['remote'], { cwd: process.cwd() });
      add('gitRemote', Boolean(stdout.trim()), stdout.trim() || 'none');
    } catch (err) { add('gitRemote', false, err.message); }
  }
  const ok = findings.every((finding) => finding.ok);
  if (options.json) console.log(JSON.stringify({ ok, findings }, null, 2));
  else findings.forEach((finding) => console.log(`${finding.ok ? 'OK' : 'ERROR'} ${finding.name}: ${finding.detail}`));
  if (!ok) process.exitCode = 1;
}
