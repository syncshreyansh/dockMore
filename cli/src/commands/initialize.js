import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { simpleGit } from 'simple-git';
import { api } from '../api.js';
import { setProject, getProject } from '../config.js';
import { requireAuth } from '../utils.js';

export async function initialize() {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);

  
  const existing = getProject(projectDir);
  if (existing && existing.projectId) {
    console.log(chalk.yellow(`  This project is already tracked as "${projectName}".`));
    console.log(chalk.dim(`  Project ID: ${existing.projectId}`));
    return;
  }

  const spinner = ora('Initializing dockMore tracking...').start();

  try {
    
    const shadowId = crypto.randomBytes(8).toString('hex');
    const shadowDir = path.join(os.homedir(), '.dockmore', 'shadow-repos', shadowId);
    fs.mkdirSync(shadowDir, { recursive: true });

    
    const git = simpleGit({
      baseDir: projectDir,
    }).env({
      GIT_DIR: shadowDir,
      GIT_WORK_TREE: projectDir,
    });

    await git.init();
    await git.addConfig('user.name', 'dockMore Watcher', false);
    await git.addConfig('user.email', 'watcher@dockmore.dev', false);

    
    await git.add('-A');
    await git.commit('dockmore: initial snapshot', { '--allow-empty': null });

    spinner.text = 'Registering project on backend...';

    
    const project = await api.post('/api/code-projects', {
      name: projectName,
      local_path: projectDir,
    });

    
    setProject(projectDir, {
      projectId: project.id,
      shadowRepoPath: shadowDir,
      watchPid: null,
      interval: 15,
    });

    spinner.succeed(chalk.green('Project initialized!'));
    console.log();
    console.log(`  ${chalk.bold('Project:')}  ${projectName}`);
    console.log(`  ${chalk.bold('ID:')}       ${project.id}`);
    console.log(`  ${chalk.bold('Shadow:')}   ${chalk.dim(shadowDir)}`);
    console.log();
    console.log(chalk.dim('  Run `dockmore watch` to start automatic snapshotting.'));
  } catch (err) {
    spinner.fail(chalk.red(`Initialization failed: ${err.message}`));
  }
}
