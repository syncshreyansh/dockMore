import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { setProject, getToken, API_BASE } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { api } from '../api.js';
import { setDaemonInterval } from '../daemonSettings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function watch(options) {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  const validIntervals = [5, 10, 15, 20, 25, 30, 60];
  const requestedInterval = options.interval !== undefined ? Number(options.interval) : Number(project.interval || 15);
  if (options.interval !== undefined && !validIntervals.includes(requestedInterval)) {
    throw new Error('Sync interval must be one of 5, 10, 15, 20, 25, 30, or 60 minutes');
  }
  const interval = validIntervals.includes(requestedInterval) ? requestedInterval : 15;

  
  if (project.watchPid) {
    try {
      process.kill(project.watchPid, 0); 
      const heartbeat = JSON.parse(fs.readFileSync(path.join(project.shadowRepoPath, 'daemon-heartbeat.json'), 'utf8'));
      if (heartbeat.pid !== project.watchPid || heartbeat.daemonId !== project.daemonId || heartbeat.projectId !== project.projectId) throw new Error('Stored daemon identity does not match');
      console.log(chalk.yellow(`  Watch daemon is already running (PID: ${project.watchPid}).`));
      setDaemonInterval(project.shadowRepoPath, interval);
      setProject(projectDir, { interval });
      await api.patch(`/api/code-projects/${project.projectId}`, {
        watch_status: 'watching', snapshot_interval_minutes: interval,
      });
      console.log(chalk.dim('  Run `dockmore pause` to stop it first.'));
      return;
    } catch (err) {
      if (err.message === 'Stored daemon identity does not match') throw err;
      
      setProject(projectDir, { watchPid: null });
    }
  }

  
  setDaemonInterval(project.shadowRepoPath, interval);

  const spinner = ora('Starting watch daemon...').start();

  try {
    const daemonId = crypto.randomUUID();
    
    const daemonPath = path.resolve(__dirname, '..', 'daemon.js');

    const child = spawn('node', [daemonPath], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: {
        ...process.env,
        DOCKMORE_PROJECT_DIR: projectDir,
        DOCKMORE_SHADOW_DIR: project.shadowRepoPath,
        DOCKMORE_PROJECT_ID: project.projectId,
        DOCKMORE_INTERVAL: String(interval),
        DOCKMORE_TOKEN: getToken(),
        DOCKMORE_API_URL: API_BASE,
        DOCKMORE_DAEMON_ID: daemonId,
      },
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Watch daemon did not finish its initial snapshot')), 60000);
      child.once('message', (message) => {
        if (message?.type !== 'ready') return;
        clearTimeout(timer);
        resolve();
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Watch daemon exited during startup (${code ?? 'unknown'})`));
      });
      child.once('error', (err) => { clearTimeout(timer); reject(err); });
    });

    try {
      process.kill(child.pid, 0);
      await api.patch(`/api/code-projects/${project.projectId}`, {
        watch_status: 'watching', snapshot_interval_minutes: interval,
      });
    } catch (err) {
      try { process.kill(child.pid, 'SIGTERM'); } catch {}
      throw err;
    }
    setProject(projectDir, { watchPid: child.pid, daemonId, interval });
    child.disconnect();
    child.unref();

    spinner.succeed(chalk.green(`Watch daemon started!`));
    console.log();
    console.log(`  ${chalk.bold('PID:')}       ${child.pid}`);
    console.log(`  ${chalk.bold('Interval:')}  ${interval} minutes`);
    console.log(`  ${chalk.bold('Project:')}   ${path.basename(projectDir)}`);
    console.log();
    console.log(chalk.dim('  The daemon runs in the background. Use `dockmore pause` to stop.'));
  } catch (err) {
    setProject(projectDir, { watchPid: null });
    spinner.fail(chalk.red(`Failed to start watch daemon: ${err.message}`));
    throw err;
  }
}
