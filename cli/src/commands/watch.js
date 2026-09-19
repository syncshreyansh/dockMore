import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProject, setProject, getToken, API_BASE } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';
import { api } from '../api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function watch(options) {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  
  if (project.watchPid) {
    try {
      process.kill(project.watchPid, 0); 
      console.log(chalk.yellow(`  Watch daemon is already running (PID: ${project.watchPid}).`));
      console.log(chalk.dim('  Run `dockmore pause` to stop it first.'));
      return;
    } catch {
      
      setProject(projectDir, { watchPid: null });
    }
  }

  
  let interval = parseInt(options.interval || project.interval || 15, 10);
  if (isNaN(interval)) interval = 15;
  interval = Math.max(10, Math.min(30, interval));

  const spinner = ora('Starting watch daemon...').start();

  try {
    
    const daemonPath = path.resolve(__dirname, '..', 'daemon.js');

    const child = spawn('node', [daemonPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        DOCKMORE_PROJECT_DIR: projectDir,
        DOCKMORE_SHADOW_DIR: project.shadowRepoPath,
        DOCKMORE_PROJECT_ID: project.projectId,
        DOCKMORE_INTERVAL: String(interval),
        DOCKMORE_TOKEN: getToken(),
        DOCKMORE_API_URL: API_BASE,
      },
    });

    child.unref();

    
    setProject(projectDir, { watchPid: child.pid, interval });

    
    await api.patch(`/api/code-projects/${project.projectId}`, {
      watch_status: 'watching',
      snapshot_interval_minutes: interval,
    });

    spinner.succeed(chalk.green(`Watch daemon started!`));
    console.log();
    console.log(`  ${chalk.bold('PID:')}       ${child.pid}`);
    console.log(`  ${chalk.bold('Interval:')}  ${interval} minutes`);
    console.log(`  ${chalk.bold('Project:')}   ${path.basename(projectDir)}`);
    console.log();
    console.log(chalk.dim('  The daemon runs in the background. Use `dockmore pause` to stop.'));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to start watch daemon: ${err.message}`));
  }
}
