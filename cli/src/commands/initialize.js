import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { simpleGit } from 'simple-git';
import inquirer from 'inquirer';
import { api } from '../api.js';
import { setProject, getProject, removeProject, getActiveAccountId, setActiveAccountId } from '../config.js';
import { requireAuth } from '../utils.js';
import { uploadCurrentSourceArchive } from '../sourceArchive.js';
import { withProgress } from '../progress.js';
import { setDaemonInterval } from '../daemonSettings.js';

async function selectBackupAccount(preferredId, spinner) {
  const accounts = spinner
    ? await api.get('/api/accounts')
    : await withProgress('Loading connected cloud accounts', () => api.get('/api/accounts'), { success: false, failure: false });
  const available = (accounts || []).filter((account) => account.provider === 'google-drive' && account.status === 'active');
  if (!available.length) throw new Error('Connect an active Google Drive account in Dockmore before initializing cloud code sync.');

  const preferred = available.find((account) => account.id === preferredId);
  if (preferred) {
    setActiveAccountId(preferred.id);
    return preferred;
  }

  const active = available.find((account) => account.id === getActiveAccountId());
  if (active) return active;
  if (available.length === 1) {
    setActiveAccountId(available[0].id);
    return available[0];
  }

  spinner?.stop();
  const { accountId } = await inquirer.prompt([{
    type: 'list',
    name: 'accountId',
    message: 'Choose the Google Drive account for this project backup:',
    choices: available.map((account) => ({ name: `${account.providerName} — ${account.email}`, value: account.id })),
  }]);
  spinner?.start();
  setActiveAccountId(accountId);
  return available.find((account) => account.id === accountId);
}

const INTERVAL_PRESETS = [5, 10, 15, 20, 25, 30, 60];

export async function initialize(options = {}) {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);

  
  const existing = getProject(projectDir);
  if (existing && existing.projectId) {
    try {
      const remote = await withProgress('Checking linked project', () => api.get(`/api/code-projects/${existing.projectId}`), { success: false, failure: false });
      if (!fs.existsSync(existing.shadowRepoPath)) throw new Error('Local shadow repository is missing; use project repair or untrack');
      const account = await selectBackupAccount(getActiveAccountId() || remote.backup_account_id || existing.backupAccountId);
      let cloudProject = remote;
      if (remote.backup_account_id !== account.id || !remote.cloud_folder_id) {
        cloudProject = await withProgress('Preparing cloud project folder', () => api.patch(`/api/code-projects/${existing.projectId}`, { backup_account_id: account.id }), { success: false, failure: false });
      }
      setProject(projectDir, { backupAccountId: account.id, cloudFolderId: cloudProject.cloud_folder_id });
      await withProgress('Syncing project source ZIP', () => uploadCurrentSourceArchive({ projectId: existing.projectId, projectDir, shadowRepoPath: existing.shadowRepoPath }), { success: 'Project source ZIP synced', failure: false });
      console.log(chalk.green(`  Project "${projectName}" is linked and its source ZIP is synced to dockmore/${projectName}.`));
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
    let interval = Number(options.interval);
    if (options.interval === undefined) {
      spinner.stop();
      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'interval',
        message: 'How often should Dockmore sync this project?',
        choices: INTERVAL_PRESETS.map((minutes) => ({ name: `Every ${minutes} minutes`, value: minutes })),
        default: 15,
      }]);
      interval = answer.interval;
      spinner.start();
    }
    if (!INTERVAL_PRESETS.includes(interval)) throw new Error('Sync interval must be one of 5, 10, 15, 20, 25, 30, or 60 minutes');
    spinner.text = 'Selecting the connected cloud account...';
    const account = await selectBackupAccount(getActiveAccountId(), spinner);

    const shadowId = crypto.randomBytes(8).toString('hex');
    shadowDir = path.join(os.homedir(), '.dockmore', 'shadow-repos', shadowId);

    spinner.text = 'Registering project on backend...';
    let branch = null;
    try { branch = (await simpleGit(projectDir).branch()).current || null; } catch {}
    const project = await api.post('/api/code-projects', {
      name: projectName,
      local_path: projectDir,
      branch,
      backup_account_id: account.id,
      snapshot_interval_minutes: interval,
    });
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
    setDaemonInterval(shadowDir, interval);

    
    await git.add('-A');
    await git.commit('dockmore: initial snapshot', { '--allow-empty': null });
    const commitHash = (await git.revparse(['HEAD'])).trim();

    setProject(projectDir, {
      projectId: project.id,
      shadowRepoPath: shadowDir,
      watchPid: null,
      interval,
      backupAccountId: account.id,
      cloudFolderId: project.cloud_folder_id,
    });
    try { await api.post(`/api/code-projects/${project.id}/snapshots`, { snapshotKey: commitHash, filesChangedCount: (await git.show(['--format=', '--name-only', 'HEAD'])).split('\n').filter(Boolean).length }); }
    catch (err) {
      fs.writeFileSync(path.join(shadowDir, 'pending-snapshots.json'), JSON.stringify([{ snapshotKey: commitHash, filesChangedCount: 0 }]));
      console.log(chalk.yellow(`  Initial snapshot metadata queued for retry: ${err.message}`));
    }

    spinner.text = 'Uploading the initial source ZIP to cloud storage...';
    await uploadCurrentSourceArchive({ projectId: project.id, projectDir, shadowRepoPath: shadowDir });

    spinner.succeed(chalk.green('Project initialized!'));
    console.log();
    console.log(`  ${chalk.bold('Project:')}  ${projectName}`);
    console.log(`  ${chalk.bold('ID:')}       ${project.id}`);
    console.log(`  ${chalk.bold('Shadow:')}   ${chalk.dim(shadowDir)}`);
    console.log(`  ${chalk.bold('Cloud:')}    ${account.email} / dockmore / ${project.name} (${project.id.slice(0, 8)})`);
    console.log();
    console.log(chalk.dim(`  Sync interval: every ${interval} minutes. Change it with \`dockmore interval <minutes>\`.`));
    console.log(chalk.dim('  Run `dockmore watch` to start scheduled snapshots and cloud source syncing.'));
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
