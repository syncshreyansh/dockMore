import chalk from 'chalk';
import { getToken, getProject } from './config.js';

export function requireAuth() {
  const token = getToken();
  if (!token) {
    console.log();
    console.log(chalk.red('  ✗ Not logged in.'));
    console.log(chalk.dim('  Run `dockmore` to log in first.'));
    console.log();
    throw new Error('Not logged in');
  }
  return true;
}

export function requireProject(projectDir) {
  const project = getProject(projectDir);
  if (!project || !project.projectId) {
    console.log();
    console.log(chalk.red('  ✗ This project is not initialized.'));
    console.log(chalk.dim('  Run `dockmore initialize` in your project directory first.'));
    console.log();
    throw new Error('Project is not initialized');
  }
  return project;
}
