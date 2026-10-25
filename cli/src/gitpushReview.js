import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { api } from './api.js';
import { getProject, setProject } from './config.js';

const exec = promisify(execFile);
const secretPattern = /(-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|(?:api[_-]?key|secret|password|access[_-]?token|client[_-]?secret)\s*[:=]\s*['\"][^'\"]{8,}|(?:ghp_|github_pat_|sk_live_|AKIA)[A-Za-z0-9_]{12,})/i;
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function git(cwd, args, env = {}) {
  const { stdout } = await exec('git', args, {
    cwd, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
  });
  return stdout.trimEnd();
}

async function indexPath(cwd) {
  const result = await git(cwd, ['rev-parse', '--git-path', 'index']);
  return path.isAbsolute(result) ? result : path.resolve(cwd, result);
}

async function diffIndex(cwd, env = {}) {
  let hasHead = true;
  try { await git(cwd, ['rev-parse', '--verify', 'HEAD']); } catch { hasHead = false; }
  return git(cwd, ['diff', '--cached', '--binary', '--no-ext-diff', ...(hasHead ? ['HEAD'] : [])], env);
}

function scan(diff) {
  const warnings = [];
  let filename = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) filename = line.slice(6);
    if (line.startsWith('GIT binary patch') || line.startsWith('Binary files ')) warnings.push(`${filename || 'Binary file'} cannot be scanned for credentials`);
    if (line.startsWith('+') && !line.startsWith('+++') && secretPattern.test(line.slice(1))) warnings.push(`${filename}: possible credential in added content`);
    if (line.startsWith('+<<<<<<<')) warnings.push(`${filename}: unresolved merge marker`);
  }
  return [...new Set(warnings)];
}

export async function inspectGitPush(cwd, requestedRemote) {
  const project = getProject(cwd);
  if (!project?.projectId) throw new Error('Project is not linked to the local CLI');
  if (project.pendingPush) return { pendingPush: project.pendingPush };
  const inside = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') throw new Error('Project directory is not a Git repository');
  const branch = await git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const remotes = (await git(cwd, ['remote'])).split('\n').filter(Boolean);
  const remote = requestedRemote || (remotes.includes('origin') ? 'origin' : remotes[0]);
  if (!remote || !remotes.includes(remote)) throw new Error('Configure a Git remote or choose one in the CLI');
  const realIndex = await indexPath(cwd);
  const currentIndexHash = fs.existsSync(realIndex) ? digest(fs.readFileSync(realIndex)) : null;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dockmore-review-'));
  try {
    const tempIndex = path.join(temporary, 'index');
    if (fs.existsSync(realIndex)) fs.copyFileSync(realIndex, tempIndex);
    const env = { GIT_INDEX_FILE: tempIndex };
    await git(cwd, ['add', '-A'], env);
    const diff = await diffIndex(cwd, env);
    if (!diff) throw new Error('No changes to push');
    if (Buffer.byteLength(diff, 'utf8') > 5 * 1024 * 1024) throw new Error('Diff is too large for website review. Use dockmore gitpush in the CLI.');
    const files = (await git(cwd, ['diff', '--cached', '--name-only', '-z'], env)).split('\0').filter(Boolean);
    const reviewId = digest(JSON.stringify({ diff, branch, remote, currentIndexHash }));
    return { reviewId, diff, files, warnings: scan(diff), branch, remote, remotes, suggestedMessage: `Update ${files.length} project file${files.length === 1 ? '' : 's'}` };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

export async function executeGitPush(cwd, { reviewId, remote, message, warningsAcknowledged }) {
  if (typeof reviewId !== 'string' || !/^[a-f0-9]{64}$/.test(reviewId)) throw new Error('Invalid review ID');
  if (typeof message !== 'string' || !message.trim() || message.length > 500) throw new Error('Commit message must be 1–500 characters');
  const review = await inspectGitPush(cwd, remote);
  if (review.pendingPush) throw new Error('A previous push is pending; retry it first');
  if (review.reviewId !== reviewId) throw new Error('Files or Git index changed since review. Review again before pushing.');
  if (review.warnings.length && !warningsAcknowledged) throw new Error('Acknowledge the review warnings before pushing');

  const realIndex = await indexPath(cwd);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dockmore-commit-'));
  const backup = path.join(temporary, 'index');
  const hadIndex = fs.existsSync(realIndex);
  let restoreIndex = false;
  try {
    if (hadIndex) fs.copyFileSync(realIndex, backup);
    const expectedIndexHash = hadIndex ? digest(fs.readFileSync(backup)) : null;
    const latestIndexHash = fs.existsSync(realIndex) ? digest(fs.readFileSync(realIndex)) : null;
    if (expectedIndexHash !== latestIndexHash) throw new Error('Git index changed during review');
    restoreIndex = true;
    await git(cwd, ['add', '-A']);
    const actualDiff = await diffIndex(cwd);
    const actualReviewId = digest(JSON.stringify({ diff: actualDiff, branch: review.branch, remote: review.remote, currentIndexHash: expectedIndexHash }));
    if (actualReviewId !== reviewId) throw new Error('Files changed during commit preparation. Review again.');
    await git(cwd, ['commit', '-m', message.trim()]);
    restoreIndex = false;
    const hash = await git(cwd, ['rev-parse', 'HEAD']);
    const project = getProject(cwd);
    setProject(cwd, { pendingPush: { hash, branch: review.branch, remote: review.remote, message: message.trim(), pushed: false } });
    await git(cwd, ['push', review.remote, `HEAD:refs/heads/${review.branch}`]);
    setProject(cwd, { pendingPush: { hash, branch: review.branch, remote: review.remote, message: message.trim(), pushed: true } });
    await api.post(`/api/code-projects/${project.projectId}/commit`, { commitMessage: message.trim() });
    setProject(cwd, { pendingPush: null });
    return { hash, branch: review.branch, remote: review.remote };
  } catch (err) {
    if (restoreIndex) {
      if (hadIndex) fs.copyFileSync(backup, realIndex);
      else fs.rmSync(realIndex, { force: true });
    }
    throw err;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
