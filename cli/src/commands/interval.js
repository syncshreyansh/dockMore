import chalk from 'chalk';
import { api } from '../api.js';
import { getProject, setProject } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { daemonState } from '../daemonControl.js';
import { withProgress } from '../progress.js';
import { setDaemonInterval } from '../daemonSettings.js';

const INTERVAL_PRESETS = [5, 10, 15, 20, 25, 30, 60];

export async function changeInterval(minutesInput) {
  if (!requireAuth()) return;
  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;
  const minutes = Number(minutesInput);
  if (!INTERVAL_PRESETS.includes(minutes)) {
    throw new Error('Sync interval must be one of 5, 10, 15, 20, 25, 30, or 60 minutes');
  }

  await withProgress(`Setting sync interval to ${minutes} minutes`, async () => {
    await api.patch(`/api/code-projects/${project.projectId}`, { snapshot_interval_minutes: minutes });
    setDaemonInterval(project.shadowRepoPath, minutes);
    setProject(projectDir, { interval: minutes });
  }, { success: false, failure: false });

  const state = daemonState(getProject(projectDir));
  console.log(chalk.green(`Project sync interval set to every ${minutes} minutes.`));
  if (state === 'running') console.log(chalk.dim('The running watcher will use the new interval shortly.'));
}
