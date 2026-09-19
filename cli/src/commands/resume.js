import chalk from 'chalk';
import { getProject } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { watch } from './watch.js';

export async function resume() {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  
  if (project.watchPid) {
    try {
      process.kill(project.watchPid, 0);
      console.log(chalk.yellow(`  Watch daemon is already running (PID: ${project.watchPid}).`));
      return;
    } catch {
      
    }
  }

  console.log(chalk.dim('  Resuming watch daemon...'));
  await watch({ interval: project.interval || 15 });
}
