import chalk from 'chalk';
import { getProject, setProject } from '../config.js';
import { api } from '../api.js';
import { stopDaemon } from '../daemonControl.js';

export async function exit() {
  const projectDir = process.cwd();
  const project = getProject(projectDir);

  if (project && project.watchPid) {
    await stopDaemon(project);
    console.log(chalk.green('✓ Watch daemon stopped.'));
    setProject(projectDir, { watchPid: null, daemonId: null });
  } else {
    console.log(chalk.dim('  No active watch daemon to stop.'));
  }

  if (project?.projectId) {
    try {
      await api.patch(`/api/code-projects/${project.projectId}`, { watch_status: 'paused' });
    } catch (err) {
      throw new Error(`Backend watch status update failed: ${err.message}`);
    }
  }

  console.log(chalk.dim('  Project tracking remains intact. Goodbye!'));
}
