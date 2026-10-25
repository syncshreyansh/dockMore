import chalk from 'chalk';
import { getProject } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { watch } from './watch.js';
import { daemonState } from '../daemonControl.js';

export async function resume() {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  
  if (project.watchPid) {
    const state = daemonState(project);
    if (state === 'running') {
      console.log(chalk.yellow(`  Watch daemon is already running (PID: ${project.watchPid}).`));
      return;
    }
    if (state !== 'stopped') throw new Error(`Watcher is ${state}; run doctor or repair before resuming`);
  }

  console.log(chalk.dim('  Resuming watch daemon...'));
  await watch({ interval: project.interval || 15 });
}
