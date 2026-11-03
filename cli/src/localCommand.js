import { getProject } from './config.js';
import { watch } from './commands/watch.js';
import { pause } from './commands/pause.js';
import { retryPush } from './commands/gitpush.js';
import { inspectGitPush, executeGitPush } from './gitpushReview.js';
import { changeInterval } from './commands/interval.js';

const [action, projectId] = process.argv.slice(2);
const cwd = process.cwd();
if (getProject(cwd)?.projectId !== projectId) {
  console.error('Project is not linked to the local CLI');
  process.exit(1);
}

let raw = '';
for await (const chunk of process.stdin) {
  raw += chunk;
  if (raw.length > 64 * 1024) throw new Error('Request is too large');
}
const body = raw ? JSON.parse(raw) : {};

try {
  if (action === 'watch') {
    await watch({});
  } else if (action === 'pause') {
    await pause();
  } else if (action === 'interval') {
    await changeInterval(body.minutes);
  } else if (action === 'push-review') {
    process.stdout.write(JSON.stringify(await inspectGitPush(cwd, body.remote)));
  } else if (action === 'push') {
    process.stdout.write(JSON.stringify(await executeGitPush(cwd, body)));
  } else if (action === 'push-retry') {
    await retryPush();
  } else {
    throw new Error('Unknown local command');
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
