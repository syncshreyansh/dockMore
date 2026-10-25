import chalk from 'chalk';
import ora from 'ora';
import { api } from '../api.js';
import { requireAuth } from '../utils.js';

export async function listAccounts() {
  if (!requireAuth()) return;

  const spinner = ora('Fetching accounts...').start();

  try {
    const accounts = await api.get('/api/accounts');
    spinner.stop();

    if (!accounts || accounts.length === 0) {
      console.log(chalk.yellow('  No cloud accounts connected.'));
      console.log(chalk.dim('  Connect one at the dockMore dashboard.'));
      return accounts || [];
    }

    console.log();
    console.log(chalk.bold('  ☁️  Connected Accounts'));
    console.log();

    accounts.forEach((acc, i) => {
      const used = acc.usedStorageGB ?? 0;
      const total = acc.totalStorageGB ?? 15;
      const bar = buildBar(used, total);

      console.log(`  ${chalk.white.bold(`${i + 1}.`)} ${chalk.cyan(acc.providerName)}  ${chalk.dim(acc.email)}`);
      console.log(`     ${bar}  ${used} / ${total} GB`);
      console.log(`     ${chalk.dim(`Status: ${acc.status}  •  Last synced: ${acc.lastSynced}`)}`);
      console.log();
    });

    return accounts;
  } catch (err) {
    spinner.fail(chalk.red(`Failed to fetch accounts: ${err.message}`));
    throw err;
  }
}

function buildBar(used, total) {
  const width = 20;
  const ratio = Number.isFinite(Number(used)) && Number.isFinite(Number(total)) && Number(total) > 0
    ? Math.max(0, Math.min(1, Number(used) / Number(total))) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}
