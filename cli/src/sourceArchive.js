import fs from 'fs';
import os from 'os';
import path from 'path';
import { simpleGit } from 'simple-git';
import { api } from './api.js';

export async function uploadCurrentSourceArchive({ projectId, projectDir, shadowRepoPath }) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dockmore-source-'));
  const archivePath = path.join(temporaryDirectory, `${projectId}.zip`);
  const git = simpleGit({ baseDir: projectDir }).env({ GIT_DIR: shadowRepoPath, GIT_WORK_TREE: projectDir });

  try {
    const projectRoot = `${path.basename(projectDir)}${path.sep}`.replace(/\\/g, '/');
    await git.raw(['archive', '--format=zip', `--prefix=${projectRoot}`, `--output=${archivePath}`, 'HEAD']);
    const { size } = fs.statSync(archivePath);
    await api.post(`/api/code-projects/${projectId}/source-archive`, fs.createReadStream(archivePath), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(size),
      },
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    return { sizeBytes: size };
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
