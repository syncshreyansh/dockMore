import Conf from 'conf';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnSync } from 'child_process';

const config = new Conf({
  projectName: 'dockmore',
  cwd: path.join(os.homedir(), '.dockmore'),
  schema: {
    authToken: { type: 'string', default: '' },
    authTokenProtected: { type: 'string', default: '' },
    activeAccountId: { type: 'string', default: '' },
    frontendOrigin: { type: 'string', default: '' },
    bridgeId: { type: 'string', default: '' },
    bridgePid: { type: 'number', default: 0 },
    projects: { type: 'object', default: {} },
  },
});

export const API_BASE = process.env.DOCKMORE_API_URL || 'http://localhost:5000';
let cachedToken;

function protect(value, decrypt = false) {
  if (process.platform !== 'win32') return value;
  const script = decrypt
    ? '$s=ConvertTo-SecureString ([Console]::In.ReadToEnd()); $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}'
    : '$s=ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force; [Console]::Out.Write((ConvertFrom-SecureString $s))';
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { input: value, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('Windows credential protection failed');
  return result.stdout;
}

export function getToken({ reload = false } = {}) {
  if (reload) cachedToken = undefined;
  if (cachedToken !== undefined) return cachedToken;
  const protectedToken = config.get('authTokenProtected');
  if (protectedToken) return (cachedToken = protect(protectedToken, true));
  const legacy = config.get('authToken');
  if (legacy) { setToken(legacy); return legacy; }
  return (cachedToken = null);
}

export function setToken(token) {
  config.set('authTokenProtected', protect(token));
  config.delete('authToken');
  cachedToken = token;
  if (process.platform !== 'win32') {
    try { fs.chmodSync(config.path, 0o600); } catch {}
  }
}

export function clearToken() {
  config.delete('authToken');
  config.delete('authTokenProtected');
  cachedToken = null;
}

export function getActiveAccountId() {
  return config.get('activeAccountId') || null;
}

export function setActiveAccountId(id) {
  config.set('activeAccountId', id);
}

export function getProject(projectPath) {
  const projects = config.get('projects') || {};
  return projects[projectPath] || null;
}

export function setProject(projectPath, data) {
  const projects = config.get('projects') || {};
  projects[projectPath] = { ...projects[projectPath], ...data };
  config.set('projects', projects);
}

export function removeProject(projectPath) {
  const projects = config.get('projects') || {};
  delete projects[projectPath];
  config.set('projects', projects);
}

export function getAllProjects() {
  return config.get('projects') || {};
}

export function getFrontendOrigin() {
  return config.get('frontendOrigin') || 'http://localhost:5173';
}

export function setFrontendOrigin(origin) {
  config.set('frontendOrigin', origin);
}

export function getBridge() {
  return { id: config.get('bridgeId') || '', pid: config.get('bridgePid') || 0 };
}

export function setBridge(id, pid) {
  config.set('bridgeId', id || '');
  config.set('bridgePid', pid || 0);
}

export default config;
