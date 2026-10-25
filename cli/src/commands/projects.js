import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { api } from '../api.js';
import { getAllProjects, getProject, removeProject, setProject } from '../config.js';
import { requireAuth } from '../utils.js';
import { daemonState, stopDaemon } from '../daemonControl.js';

export async function listProjects() {
  requireAuth();
  const remote = (await api.get('/api/code-projects')).projects || [];
  const local = getAllProjects();
  remote.forEach((project) => {
    const match = Object.entries(local).find(([, value]) => value.projectId === project.id);
    console.log(`${project.name}  ${project.id}  ${match ? match[0] : 'No local link'}`);
  });
  if (!remote.length) console.log('No projects registered.');
}

export async function untrack() {
  const cwd = process.cwd();
  const project = getProject(cwd);
  if (!project) throw new Error('Current directory has no local DockMore link');
  if (project.watchPid) await stopDaemon(project);
  try { await api.patch(`/api/code-projects/${project.projectId}`, { watch_status: 'paused' }); }
  catch (err) { if (err.status !== 404) throw err; }
  removeProject(cwd);
  console.log(chalk.green('Local project link removed. Shadow snapshots remain at:'));
  console.log(`  ${project.shadowRepoPath}`);
}

export async function relink(id, shadowRepoPath) {
  requireAuth();
  const cwd = process.cwd();
  if (getProject(cwd)) throw new Error('Current directory is already linked; run untrack first');
  const remote = await api.get(`/api/code-projects/${id}`);
  if (!shadowRepoPath || !fs.existsSync(path.join(shadowRepoPath, 'HEAD'))) throw new Error('Provide an existing shadow Git repository with --shadow <path>');
  setProject(cwd, { projectId: remote.id, shadowRepoPath: path.resolve(shadowRepoPath), watchPid: null, daemonId: null, interval: remote.snapshot_interval_minutes || 15 });
  console.log(chalk.green(`Linked ${cwd} to ${remote.name}.`));
}

export async function repair() {
  requireAuth();
  const cwd = process.cwd();
  const project = getProject(cwd);
  if (!project) throw new Error('No local project link. Use `dockmore relink <id> --shadow <path>`.');
  if (!fs.existsSync(path.join(project.shadowRepoPath, 'HEAD'))) throw new Error(`Shadow Git repository is missing: ${project.shadowRepoPath}`);
  const recoveryPath = path.join(project.shadowRepoPath, 'outbox-recovery.jsonl');
  if (fs.existsSync(recoveryPath)) {
    const outboxPath = path.join(project.shadowRepoPath, 'pending-snapshots.json');
    const current = fs.existsSync(outboxPath) ? JSON.parse(fs.readFileSync(outboxPath, 'utf8')) : [];
    if (!Array.isArray(current)) throw new Error('Snapshot outbox is invalid; repair it manually before merging recovery records');
    const recovered = fs.readFileSync(recoveryPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
    const merged = [...current];
    for (const item of recovered) if (!merged.some((entry) => entry.snapshotKey === item.snapshotKey)) merged.push(item);
    fs.writeFileSync(outboxPath, JSON.stringify(merged));
    fs.rmSync(recoveryPath);
    console.log(chalk.green(`Recovered ${recovered.length} queued snapshot record(s).`));
  }
  const remote = await api.get(`/api/code-projects/${project.projectId}`);
  const state = daemonState(project);
  if (remote.watch_status === 'watching' && state !== 'running') {
    await api.patch(`/api/code-projects/${project.projectId}`, { watch_status: 'paused' });
  }
  if (state === 'stopped') setProject(cwd, { watchPid: null, daemonId: null });
  console.log(chalk.green(`Project link is valid. Watcher: ${state}.`));
}
