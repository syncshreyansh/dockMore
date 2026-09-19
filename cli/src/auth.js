import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { request } from './api.js';
import { setToken, getToken } from './config.js';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000; 

export async function login() {
  
  const existing = getToken();
  if (existing) {
    console.log(chalk.green('✓ You are already logged in.'));
    console.log(chalk.dim('  Run any command to get started, or re-run to re-authenticate.'));
    return;
  }

  const spinner = ora('Starting login session...').start();

  try {
    
    const { sessionId, verificationUrl } = await request('/api/cli/login/start', {
      method: 'POST',
    });

    spinner.stop();
    console.log();
    console.log(chalk.bold('  🔐 dockMore CLI Login'));
    console.log();
    console.log('  Opening your browser to complete sign-in...');
    console.log();
    console.log(chalk.dim(`  If it doesn't open automatically, visit:`));
    console.log(chalk.cyan(`  ${verificationUrl}`));
    console.log();

    
    await open(verificationUrl);

    
    const pollSpinner = ora('Waiting for browser sign-in...').start();
    const startTime = Date.now();

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);

      try {
        const result = await request(`/api/cli/login/poll?sessionId=${sessionId}`, {
          method: 'GET',
        });

        if (result.token) {
          setToken(result.token);
          pollSpinner.succeed(chalk.green('Logged in successfully!'));
          console.log();
          console.log(chalk.dim('  Your session token has been saved locally.'));
          console.log(chalk.dim('  Run `dockmore -help` to see available commands.'));
          return;
        }
        
      } catch (err) {
        
        if (err.status && err.status >= 400) {
          pollSpinner.fail(chalk.red(`Login failed: ${err.message}`));
          return;
        }
      }
    }

    pollSpinner.fail(chalk.red('Login timed out after 2 minutes.'));
    console.log(chalk.dim('  Please try again with `dockmore`.'));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to start login: ${err.message}`));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
