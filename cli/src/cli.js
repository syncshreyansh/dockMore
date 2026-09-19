#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { login } from './auth.js';
import { listAccounts } from './commands/accounts.js';
import { switchAccount } from './commands/switch.js';
import { initialize } from './commands/initialize.js';
import { watch } from './commands/watch.js';
import { pause } from './commands/pause.js';
import { resume } from './commands/resume.js';
import { gitpush } from './commands/gitpush.js';
import { exit as exitCmd } from './commands/exit.js';

const program = new Command();

program
  .name('dockmore')
  .description('CLI for dockMore — multi-cloud file management and code snapshotting')
  .version('1.0.0');


program
  .option('-accounts', 'List connected cloud accounts')
  .option('-switch', 'Switch active backup account')
  .option('-help', 'Show help')
  .action(async (opts) => {
    if (opts.Accounts || opts.accounts) {
      await listAccounts();
      return;
    }
    if (opts.Switch || opts.switch) {
      await switchAccount();
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
  .option('--auto', 'Auto-accept AI commit message and skip warning confirmations')
  .action(async (opts) => {
    await gitpush(opts);
  });

program
  .command('exit')
  .description('Stop watch daemon and exit cleanly')
  .action(async () => {
    await exitCmd();
  });


program.configureHelp({
  formatHelp: () => {
    const lines = [
      '',
      chalk.bold('  dockMore CLI'),
      chalk.dim('  Multi-cloud file management and code snapshotting from your terminal.'),
      '',
      chalk.bold('  Usage:'),
      `    $ dockmore ${chalk.dim('[command] [options]')}`,
      '',
      chalk.bold('  Authentication:'),
      `    ${chalk.cyan('dockmore')}               Log in via browser (or check login status)`,
      '',
      chalk.bold('  Account Management:'),
      `    ${chalk.cyan('dockmore -accounts')}     List connected cloud accounts`,
      `    ${chalk.cyan('dockmore -switch')}       Switch active backup account`,
      '',
      chalk.bold('  Project Commands:'),
      `    ${chalk.cyan('initialize')}             Initialize tracking for the current project`,
      `    ${chalk.cyan('watch')}                  Start background snapshot daemon`,
      `    ${chalk.cyan('watch --interval <N>')}   Set snapshot interval (10-30 min)`,
      `    ${chalk.cyan('pause')}                  Pause the snapshot daemon`,
      `    ${chalk.cyan('resume')}                 Resume the snapshot daemon`,
      `    ${chalk.cyan('gitpush')}                AI-assisted commit and push`,
      `    ${chalk.cyan('gitpush --auto')}         Auto-accept AI message, skip confirmations`,
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
