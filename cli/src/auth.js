import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { request } from './api.js';
import { setToken, getToken, clearToken, setFrontendOrigin } from './config.js';
import { startBridge, stopBridge } from './bridgeControl.js';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000; 

export async function login({ force = false } = {}) {
  
  const existing = getToken();
  if (existing && force) {
    try { await request('/api/cli/logout', { method: 'POST' }); }
    catch (err) { if (err.status !== 401) console.log(chalk.yellow(`  Could not revoke previous credential: ${err.message}`)); }
    clearToken();
  }
  if (existing && !force) {
    try {
      const user = await request('/api/cli/me');
      console.log(chalk.green(`✓ Logged in as ${user.email}.`));
      try { await startBridge(); } catch (err) { console.log(chalk.yellow(`  Website controls unavailable: ${err.message}`)); }
      return;
    } catch (err) {
      if (err.status !== 401) throw err;
      clearToken();
      console.log(chalk.yellow('  Saved login expired. Starting a new login.'));
    }
  }

  const spinner = ora('Starting login session...').start();

  try {
    
    const { sessionId, sessionToken, verificationCode, verificationUrl } = await request('/api/cli/login/start', {
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
    console.log(chalk.bold(`  Confirmation code: ${verificationCode}`));
    console.log();

    
    try { await open(verificationUrl); }
    catch { console.log(chalk.yellow('  Browser could not open. Use the URL above.')); }

    
    const pollSpinner = ora('Waiting for browser sign-in...').start();
    const startTime = Date.now();

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);

      try {
        const result = await request('/api/cli/login/poll', {
          method: 'POST', body: JSON.stringify({ sessionId, sessionToken }),
        });

        if (result.token) {
          setToken(result.token);
          setFrontendOrigin(new URL(verificationUrl).origin);
          try { await startBridge(); } catch (err) { console.log(chalk.yellow(`  Website controls unavailable: ${err.message}`)); }
          pollSpinner.succeed(chalk.green('Logged in successfully!'));
          console.log();
          console.log(chalk.dim('  Your session token has been saved locally.'));
          console.log(chalk.dim('  Run `dockmore -help` to see available commands.'));
          return result;
        }
        
      } catch (err) {
        
        if (err.status && err.status >= 400) {
          pollSpinner.fail(chalk.red(`Login failed: ${err.message}`));
          throw err;
        }
      }
    }

    pollSpinner.fail(chalk.red('Login timed out after 2 minutes.'));
    console.log(chalk.dim('  Please try again with `dockmore`.'));
    throw new Error('Login timed out');
  } catch (err) {
    spinner.fail(chalk.red(`Failed to start login: ${err.message}`));
    throw err;
  }
}

export async function logout() {
  if (!getToken()) return;
  await stopBridge();
  try { await request('/api/cli/logout', { method: 'POST' }); }
  catch (err) { if (err.status !== 401) throw err; }
  finally { clearToken(); }
  console.log(chalk.green('✓ CLI credential revoked locally and on the server.'));
}

export async function status() {
  if (!getToken()) throw new Error('Not logged in. Run `dockmore login`.');
  try {
    const user = await request('/api/cli/me');
    console.log(chalk.green(`✓ Logged in as ${user.email}.`));
    try { await startBridge(); } catch (err) { console.log(chalk.yellow(`  Website controls unavailable: ${err.message}`)); }
  } catch (err) {
    if (err.status === 401) clearToken();
    throw err;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
