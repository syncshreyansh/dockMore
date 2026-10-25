import chalk from 'chalk';
import inquirer from 'inquirer';
import { listAccounts } from './accounts.js';
import { setActiveAccountId, getActiveAccountId } from '../config.js';
import { requireAuth } from '../utils.js';

export async function switchAccount() {
  if (!requireAuth()) return;

  const accounts = await listAccounts();
  if (!accounts || accounts.length === 0) return;

  const currentId = getActiveAccountId();

  const choices = accounts.map((acc) => ({
    name: `${acc.providerName}  —  ${acc.email}${acc.id === currentId ? chalk.green(' (active)') : ''}`,
    value: acc.id,
  }));

  const { accountId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'accountId',
      message: 'Select your preferred cloud account (local snapshots are unaffected):',
      choices,
      default: currentId,
    },
  ]);

  setActiveAccountId(accountId);
  const selected = accounts.find((a) => a.id === accountId);
  console.log();
  console.log(chalk.green(`✓ Active account set to ${selected.providerName} (${selected.email})`));
}
