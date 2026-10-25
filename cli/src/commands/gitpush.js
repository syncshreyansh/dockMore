import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { api } from '../api.js';
import { getProject, setProject } from '../config.js';
import { requireAuth, requireProject } from '../utils.js';

const exec = promisify(execFile);
const secretPattern = /(-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|(?:api[_-]?key|secret|password|access[_-]?token|client[_-]?secret)\s*[:=]\s*['\"][^'\"]{8,}|(?:ghp_|github_pat_|sk_live_|AKIA)[A-Za-z0-9_]{12,})/i;

async function git(args, cwd, env = {}) {
  const { stdout } = await exec('git', args, { cwd, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  return stdout.trimEnd();
}

async function headExists(cwd) {
  try { await git(['rev-parse', '--verify', 'HEAD'], cwd); return true; }
  catch { return false; }
}

async function stagedDiff(cwd, env) {
  const args = ['diff', '--cached', '--binary', '--no-ext-diff'];
  if (await headExists(cwd)) args.push('HEAD');
  return git(args, cwd, env);
}

function scan(diff) {
  const warnings = [];
  let filename = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) filename = line.slice(6);
    if (line.startsWith('GIT binary patch') || line.startsWith('Binary files ')) warnings.push(`${filename || 'binary file'}: binary content cannot be scanned for credentials`);
    if (line.startsWith('+') && !line.startsWith('+++') && secretPattern.test(line.slice(1))) warnings.push(`${filename}: possible credential in added content`);
    if (line.startsWith('<<<<<<<') || line.startsWith('+<<<<<<<')) warnings.push(`${filename}: unresolved merge marker`);
  }
  return [...new Set(warnings)];
}

export async function retryPush() {
  requireAuth();
  const cwd = process.cwd();
  const project = requireProject(cwd);
  const pending = project.pendingPush;
  if (!pending) throw new Error('No pending push for this project');
  const head = await git(['rev-parse', 'HEAD'], cwd);
  if (head !== pending.hash) throw new Error('HEAD changed since the pending push; inspect the branch before retrying');
  if (!pending.pushed) {
    await git(['push', pending.remote, `HEAD:refs/heads/${pending.branch}`], cwd);
    setProject(cwd, { pendingPush: { ...pending, pushed: true } });
  }
  await api.post(`/api/code-projects/${project.projectId}/commit`, { commitMessage: pending.message });
  setProject(cwd, { pendingPush: null });
  console.log(chalk.green('Push and DockMore metadata sync completed.'));
}

export async function gitpush(options = {}) {
  requireAuth();
  const cwd = process.cwd();
  const project = requireProject(cwd);
  if (project.pendingPush) throw new Error('A previous push is pending. Run `dockmore gitpush-retry` first.');
  const inside = await git(['rev-parse', '--is-inside-work-tree'], cwd);
  if (inside !== 'true') throw new Error('Current directory is not a Git working tree');
  const branch = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd);
  const remotes = (await git(['remote'], cwd)).split('\n').filter(Boolean);
  const remote = options.remote || (remotes.includes('origin') ? 'origin' : remotes.length === 1 ? remotes[0] : null);
  if (!remote || !remotes.includes(remote)) throw new Error('Select a configured Git remote with --remote <name>');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dockmore-index-'));
  const tempIndex = path.join(tempDir, 'index');
  let restoreIndex = null;
  try {
    const indexPath = await git(['rev-parse', '--git-path', 'index'], cwd);
    const realIndex = path.isAbsolute(indexPath) ? indexPath : path.resolve(cwd, indexPath);
    const hadIndex = fs.existsSync(realIndex);
    if (hadIndex) fs.copyFileSync(realIndex, tempIndex);
    const originalIndex = path.join(tempDir, 'original-index');
    if (hadIndex) fs.copyFileSync(realIndex, originalIndex);
    const originalIndexHash = hadIndex ? crypto.createHash('sha256').update(fs.readFileSync(originalIndex)).digest('hex') : null;
    const env = { GIT_INDEX_FILE: tempIndex };
    await git(['add', '-A'], cwd, env);
    const reviewedDiff = await stagedDiff(cwd, env);
    if (!reviewedDiff) { console.log('No changes to commit.'); return; }
    const reviewedHash = crypto.createHash('sha256').update(reviewedDiff).digest('hex');
    const files = (await git(['diff', '--cached', '--name-only', '-z'], cwd, env)).split('\0').filter(Boolean);
    console.log(chalk.bold(`Reviewing ${files.length} changed file(s) for ${remote}/${branch}:`));
    files.forEach((file) => console.log(`  ${file}`));
    console.log('\n' + reviewedDiff + '\n');
    const warnings = scan(reviewedDiff);
    warnings.forEach((warning) => console.log(chalk.red(`  ${warning}`)));
    if (options.dryRun) { console.log('Dry run complete. No Git state changed.'); return; }
    if (warnings.length) {
      const { proceed } = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: 'Potential secrets or merge markers found. Continue?', default: false }]);
      if (!proceed) return;
    }
    const { useAi } = await inquirer.prompt([{ type: 'confirm', name: 'useAi', message: 'Send the complete diff to the configured AI provider for review and a commit message?', default: false }]);
    let message = `Update ${files.length} project file${files.length === 1 ? '' : 's'}`;
    if (useAi) {
      const result = await api.post(`/api/code-projects/${project.projectId}/generate-commit`, { diffText: reviewedDiff });
      (result.warnings || []).forEach((warning) => console.log(chalk.yellow(`  ${warning}`)));
      if (result.warnings?.length) {
        const { proceed } = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: 'Continue despite AI warnings?', default: false }]);
        if (!proceed) return;
      }
      message = result.commitMessage || message;
    }
    if (!options.auto) {
      const answer = await inquirer.prompt([{ type: 'input', name: 'message', message: 'Commit message:', default: message }]);
      message = answer.message.trim();
    }
    if (!message) throw new Error('Commit message cannot be empty');
    const { proceed } = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: `Commit and push all ${files.length} reviewed files?`, default: false }]);
    if (!proceed) return;
    // The temporary index is the exact reviewed state. Reject changes made during prompts.
    await git(['add', '-A'], cwd, env);
    const currentDiff = await stagedDiff(cwd, env);
    if (crypto.createHash('sha256').update(currentDiff).digest('hex') !== reviewedHash) throw new Error('Files changed during review. Run gitpush again.');
    const latestIndexHash = fs.existsSync(realIndex) ? crypto.createHash('sha256').update(fs.readFileSync(realIndex)).digest('hex') : null;
    if (latestIndexHash !== originalIndexHash) throw new Error('Git index changed during review. Run gitpush again.');
    restoreIndex = () => {
      if (hadIndex) fs.copyFileSync(originalIndex, realIndex);
      else fs.rmSync(realIndex, { force: true });
    };
    await git(['add', '-A'], cwd);
    if (await stagedDiff(cwd) !== reviewedDiff) {
      throw new Error('Git index changed during review. Original index restored; no commit was created.');
    }
    await git(['commit', '-m', message], cwd);
    restoreIndex = null;
    const hash = await git(['rev-parse', 'HEAD'], cwd);
    setProject(cwd, { pendingPush: { hash, branch, remote, message, pushed: false } });
    await retryPush();
  } catch (err) {
    if (restoreIndex) restoreIndex();
    throw err;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
