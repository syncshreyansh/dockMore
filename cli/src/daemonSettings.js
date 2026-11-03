import fs from 'fs';
import path from 'path';

export function setDaemonInterval(shadowRepoPath, minutes) {
  const settingsPath = path.join(shadowRepoPath, 'daemon-settings.json');
  const temporaryPath = `${settingsPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({ intervalMinutes: minutes }), 'utf8');
  fs.renameSync(temporaryPath, settingsPath);
}
