import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireProject } from '../utils.js';

const exec = promisify(execFile);
async function shadowGit(project, cwd, args) {
  const { stdout } = await exec('git', args, {
    cwd,
    env: { ...process.env, GIT_DIR: project.shadowRepoPath, GIT_WORK_TREE: cwd },
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout.trimEnd();
}

export async function snapshots(action = 'list', hash, output) {
  const cwd = process.cwd();
  const project = requireProject(cwd);
  if (action === 'list') {
    console.log(await shadowGit(project, cwd, ['log', '--format=%h %ci %s', '-30']));
    return;
  }
  if (!hash || !/^[a-f0-9]{7,64}$/i.test(hash)) throw new Error('Provide a Git snapshot hash');
  const fullHash = await shadowGit(project, cwd, ['rev-parse', '--verify', `${hash}^{commit}`]);
  if (action === 'inspect') {
    console.log(await shadowGit(project, cwd, ['show', '--stat', '--format=fuller', fullHash]));
    return;
  }
  if (action === 'restore') {
    if (!output) throw new Error('Provide --output <empty-directory>');
    const destination = path.resolve(output);
    if (destination === cwd || cwd.startsWith(destination + path.sep) || destination.startsWith(cwd + path.sep)) throw new Error('Restore destination must be outside the current project');
    if (fs.existsSync(destination) && fs.readdirSync(destination).length) throw new Error('Restore destination must be empty');
    fs.mkdirSync(destination, { recursive: true });
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dockmore-restore-'));
    try {
      const env = { ...process.env, GIT_DIR: project.shadowRepoPath, GIT_WORK_TREE: cwd, GIT_INDEX_FILE: path.join(temporary, 'index') };
      await exec('git', ['read-tree', fullHash], { cwd, env });
      await exec('git', ['checkout-index', '-a', `--prefix=${destination}${path.sep}`], { cwd, env });
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
    console.log(`Restored snapshot ${fullHash.slice(0, 7)} to ${destination}`);
    return;
  }
  if (action !== 'export') throw new Error('Unknown snapshot action');
  if (!output) throw new Error('Provide --output <archive.tar>');
  const destination = path.resolve(output);
  if (fs.existsSync(destination)) throw new Error(`Output already exists: ${destination}`);
  await shadowGit(project, cwd, ['archive', '--format=tar', `--output=${destination}`, fullHash]);
  console.log(`Exported snapshot ${fullHash.slice(0, 7)} to ${destination}`);
}
