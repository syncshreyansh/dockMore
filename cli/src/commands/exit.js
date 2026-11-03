import chalk from 'chalk';
import { getProject, setProject } from '../config.js';
import { api } from '../api.js';
import { stopDaemon } from '../daemonControl.js';
import { withProgress } from '../progress.js';

export async function exit() {
  const projectDir = process.cwd();
  const project = getProject(projectDir);

  if (project && project.watchPid) {
    await withProgress('Stopping watch daemon', () => stopDaemon(project), { success: 'Watch daemon stopped', failure: false });
    console.log(chalk.green('✓ Watch daemon stopped.'));
    setProject(projectDir, { watchPid: null, daemonId: null });
  } else {
    console.log(chalk.dim('  No active watch daemon to stop.'));
  }

  if (project?.projectId) {
    try {
      await withProgress('Updating project status', () => api.patch(`/api/code-projects/${project.projectId}`, { watch_status: 'paused' }), { success: false, failure: false });
    } catch (err) {
      throw new Error(`Backend watch status update failed: ${err.message}`);
    }
  }

  console.log(chalk.dim('  Project tracking remains intact. Goodbye!'));
}
