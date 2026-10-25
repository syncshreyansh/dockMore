#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { login, logout, status } from './auth.js';
import { listAccounts } from './commands/accounts.js';
import { initialize } from './commands/initialize.js';
import { watch } from './commands/watch.js';
import { pause } from './commands/pause.js';
import { resume } from './commands/resume.js';
import { gitpush, retryPush } from './commands/gitpush.js';
import { exit as exitCmd } from './commands/exit.js';
import { listProjects, untrack, relink, repair } from './commands/projects.js';
import { snapshots } from './commands/snapshots.js';
import { doctor } from './commands/doctor.js';
import { startBridge } from './bridgeControl.js';

const program = new Command();

program
  .name('dockmore')
  .description('CLI for dockMore local code snapshotting')
  .version('1.0.0');


program
  .option('-accounts', 'List connected cloud accounts')
  .option('-help', 'Show help')
  .action(async (opts) => {
    if (opts.Accounts || opts.accounts) {
      await listAccounts();
      return;
    }
    if (opts.Help || opts.help) {
      program.outputHelp();
      return;
    }
    
    await login();
  });


program
  .command('initialize')
  .description('Initialize dockMore tracking for the current project')
  .action(async () => {
    await initialize();
  });

program.command('login').option('--force', 'Start a new browser login').action((opts) => login(opts));
program.command('logout').action(logout);
program.command('status').action(status);

program
  .command('watch')
  .description('Start background snapshot daemon for the current project')
  .option('--interval <minutes>', 'Snapshot interval in minutes (10-30, default 15)', '15')
  .action(async (opts) => {
    await watch(opts);
  });

program
  .command('pause')
  .description('Pause the watch daemon for the current project')
  .action(async () => {
    await pause();
  });

program
  .command('resume')
  .description('Resume the watch daemon for the current project')
  .action(async () => {
    await resume();
  });

program
  .command('gitpush')
  .description('AI-assisted git add, commit, and push for the current project')
  .option('--auto', 'Auto-accept the suggested commit message')
  .option('--dry-run', 'Review changes without committing or pushing')
  .option('--remote <name>', 'Git remote to push')
  .action(async (opts) => {
    await gitpush(opts);
  });

program
  .command('exit')
  .description('Stop watch daemon and exit cleanly')
  .action(async () => {
    await exitCmd();
  });

program.command('gitpush-retry').description('Retry a pending push and metadata sync').action(retryPush);
program.command('projects').description('List registered projects and local links').action(listProjects);
program.command('untrack').description('Remove the current local project link').action(untrack);
program.command('relink <id>').requiredOption('--shadow <path>', 'Existing shadow Git repository').action((id, opts) => relink(id, opts.shadow));
program.command('repair').description('Check and reconcile the current project link').action(repair);
program.command('snapshots [action] [hash]').option('--output <path>', 'Export archive destination').action((action, hash, opts) => snapshots(action, hash, opts.output));
program.command('doctor').description('Check CLI environment and project health').option('--json', 'Output machine-readable results').action(doctor);
program.command('bridge').description('Start local website controls for this computer').action(async () => {
  const bridge = await startBridge();
  console.log(`Website controls ready on 127.0.0.1:45771 (PID ${bridge.pid}).`);
});


program.configureHelp({
  formatHelp: () => {
    const lines = [
      '',
      chalk.bold('  dockMore CLI'),
      chalk.dim('  Local code snapshots and Git workflows from your terminal.'),
      '',
      chalk.bold('  Usage:'),
      `    $ dockmore ${chalk.dim('[command] [options]')}`,
      '',
      chalk.bold('  Authentication:'),
    `    ${chalk.cyan('dockmore login --force')}  Start a new browser login`,
    `    ${chalk.cyan('dockmore logout')}         Revoke CLI credential`,
    `    ${chalk.cyan('dockmore status')}         Check login status`,
      '',
      chalk.bold('  Account Management:'),
      `    ${chalk.cyan('dockmore -accounts')}     List connected cloud accounts`,
      '',
      chalk.bold('  Project Commands:'),
      `    ${chalk.cyan('initialize')}             Initialize tracking for the current project`,
      `    ${chalk.cyan('watch')}                  Start background snapshot daemon`,
      `    ${chalk.cyan('watch --interval <N>')}   Set snapshot interval (10-30 min)`,
      `    ${chalk.cyan('pause')}                  Pause the snapshot daemon`,
      `    ${chalk.cyan('resume')}                 Resume the snapshot daemon`,
      `    ${chalk.cyan('gitpush')}                AI-assisted commit and push`,
    `    ${chalk.cyan('gitpush --dry-run')}      Preview the proposed commit`,
    `    ${chalk.cyan('gitpush-retry')}          Retry a pending push or metadata sync`,
    `    ${chalk.cyan('snapshots list')}         List local snapshots`,
    `    ${chalk.cyan('snapshots restore <hash> --output <dir>')}  Restore into an empty directory`,
    `    ${chalk.cyan('projects')}               List linked projects`,
    `    ${chalk.cyan('repair')}                 Reconcile the local project link`,
    `    ${chalk.cyan('doctor')}                 Check CLI health`,
    `    ${chalk.cyan('bridge')}                 Start website controls on this computer`,
      `    ${chalk.cyan('exit')}                   Stop daemon and exit cleanly`,
      '',
      chalk.bold('  Options:'),
      `    ${chalk.cyan('-help')}                  Show this help message`,
      `    ${chalk.cyan('-V, --version')}          Show version number`,
      '',
    ];
    return lines.join('\n');
  },
});


async function main() {
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(chalk.red(`\n  Error: ${err.message}`));
  process.exit(1);
});
