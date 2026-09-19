import chalk from 'chalk';
import { getProject, setProject } from '../config.js';

export async function exit() {
  const projectDir = process.cwd();
  const project = getProject(projectDir);

  if (project && project.watchPid) {
    try {
      process.kill(project.watchPid, 'SIGTERM');
      console.log(chalk.green('✓ Watch daemon stopped.'));
    } catch {
      
    }
    setProject(projectDir, { watchPid: null });
  } else {
    console.log(chalk.dim('  No active watch daemon to stop.'));
  }

  console.log(chalk.dim('  Project tracking remains intact. Goodbye!'));
  process.exit(0);
}
