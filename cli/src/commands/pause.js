import chalk from 'chalk';
import { getProject, setProject } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { api } from '../api.js';

export async function pause() {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  if (!project.watchPid) {
    console.log(chalk.yellow('  No watch daemon is running for this project.'));
    return;
  }

  try {
    process.kill(project.watchPid, 'SIGTERM');
  } catch {
    
  }

  setProject(projectDir, { watchPid: null });

  try {
    await api.patch(`/api/code-projects/${project.projectId}`, {
      watch_status: 'paused',
    });
  } catch (err) {
    console.log(chalk.dim(`  (Could not update backend status: ${err.message})`));
  }

  console.log(chalk.green('✓ Watch daemon paused.'));
  console.log(chalk.dim('  The project is still tracked. Run `dockmore resume` to restart.'));
}
