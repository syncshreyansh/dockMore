import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { simpleGit } from 'simple-git';
import { api } from '../api.js';
import { setProject, getProject, removeProject } from '../config.js';
import { requireAuth } from '../utils.js';

export async function initialize() {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);

  
  const existing = getProject(projectDir);
  if (existing && existing.projectId) {
    try {
      await api.get(`/api/code-projects/${existing.projectId}`);
      if (!fs.existsSync(existing.shadowRepoPath)) throw new Error('Local shadow repository is missing; use project repair or untrack');
      console.log(chalk.yellow(`  This project is already tracked as "${projectName}".`));
      console.log(chalk.dim(`  Project ID: ${existing.projectId}`));
      return;
    } catch (err) {
      if (err.status === 404) throw new Error('Backend project was deleted. Run `dockmore untrack` to clear the local link, then initialize again.');
      throw err;
    }
  }

  const spinner = ora('Initializing dockMore tracking...').start();
  let shadowDir;
  let backendProjectId;

  try {
    const shadowId = crypto.randomBytes(8).toString('hex');
    shadowDir = path.join(os.homedir(), '.dockmore', 'shadow-repos', shadowId);

    spinner.text = 'Registering project on backend...';
    let branch = null;
    try { branch = (await simpleGit(projectDir).branch()).current || null; } catch {}
    const project = await api.post('/api/code-projects', { name: projectName, local_path: projectDir, branch });
    backendProjectId = project.id;
    if (!backendProjectId) throw new Error('Backend created a project without returning its ID');

    spinner.text = 'Creating local shadow repository...';
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
    const commitHash = (await git.revparse(['HEAD'])).trim();

    setProject(projectDir, {
      projectId: project.id,
      shadowRepoPath: shadowDir,
      watchPid: null,
      interval: 15,
    });
    try { await api.post(`/api/code-projects/${project.id}/snapshots`, { snapshotKey: commitHash, filesChangedCount: (await git.show(['--format=', '--name-only', 'HEAD'])).split('\n').filter(Boolean).length }); }
    catch (err) {
      fs.writeFileSync(path.join(shadowDir, 'pending-snapshots.json'), JSON.stringify([{ snapshotKey: commitHash, filesChangedCount: 0 }]));
      console.log(chalk.yellow(`  Initial snapshot metadata queued for retry: ${err.message}`));
    }

    spinner.succeed(chalk.green('Project initialized!'));
    console.log();
    console.log(`  ${chalk.bold('Project:')}  ${projectName}`);
    console.log(`  ${chalk.bold('ID:')}       ${project.id}`);
    console.log(`  ${chalk.bold('Shadow:')}   ${chalk.dim(shadowDir)}`);
    console.log();
    console.log(chalk.dim('  Run `dockmore watch` to start automatic snapshotting.'));
  } catch (err) {
    if (backendProjectId) removeProject(projectDir);
    if (backendProjectId) {
      try { await api.delete(`/api/code-projects/${backendProjectId}`); } catch {}
    }
    if (shadowDir && shadowDir.startsWith(path.join(os.homedir(), '.dockmore', 'shadow-repos') + path.sep)) {
      try { fs.rmSync(shadowDir, { recursive: true, force: true }); } catch {}
    }
    spinner.fail(chalk.red(`Initialization failed: ${err.message}`));
    throw err;
  }
}
