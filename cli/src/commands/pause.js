import chalk from 'chalk';
import { getProject, setProject } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { api } from '../api.js';
import { stopDaemon } from '../daemonControl.js';
import { withProgress } from '../progress.js';

export async function pause() {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  if (!project.watchPid) {
    await withProgress('Updating project status', () => api.patch(`/api/code-projects/${project.projectId}`, { watch_status: 'paused' }), { success: false, failure: false });
    console.log(chalk.yellow('  No watch daemon is running for this project.'));
    return;
  }

  await withProgress('Pausing watch daemon', async () => {
    await stopDaemon(project);
    setProject(projectDir, { watchPid: null, daemonId: null });
    try {
      await api.patch(`/api/code-projects/${project.projectId}`, { watch_status: 'paused' });
    } catch (err) {
      throw new Error(`Daemon stopped locally, but backend status update failed: ${err.message}`);
    }
  }, { success: 'Watch daemon paused', failure: false });

  console.log(chalk.green('✓ Watch daemon paused.'));
  console.log(chalk.dim('  The project is still tracked. Run `dockmore resume` to restart.'));
}
