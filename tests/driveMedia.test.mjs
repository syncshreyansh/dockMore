import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { makeFileKey, mapDriveFile, withFilePaths } from '../src/lib/fileModel.js';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { google } = require('googleapis');
const provider = require('../server/src/providers/GoogleDriveProvider.js');
const { createMediaToken, verifyMediaToken } = require('../server/src/auth/mediaTokens.js');

test('nested Drive files retain all parents and folder paths', () => {
  const account = { id: 'account-1', email: 'owner@example.com', provider: 'google_drive' };
  const raw = [
    { id: 'parent', name: 'Parent', mimeType: 'application/vnd.google-apps.folder', isFolder: true, parents: [] },
    { id: 'child', name: 'Child', mimeType: 'application/vnd.google-apps.folder', isFolder: true, parents: ['parent'] },
    { id: 'photo', name: 'photo.jpg', mimeType: 'image/jpeg', parents: ['child'], hasThumbnail: true },
  ];
  const files = withFilePaths(raw.map((file) => mapDriveFile(file, account)));
  const photo = files.find((file) => file.name === 'photo.jpg');
  assert.equal(photo.id, makeFileKey(account.id, 'photo'));
  assert.deepEqual(photo.parentIds, [makeFileKey(account.id, 'child')]);
  assert.equal(photo.path, '/Parent/Child/');
  assert.equal(photo.type, 'image');
  assert.equal(photo.hasThumbnail, true);
});

test('Drive listing paginates the user corpus and includes shared drives', async () => {
  const originalDrive = google.drive;
  const originalClient = provider._getClient;
  const calls = [];
  const ranges = [];
  provider._getClient = () => ({});
  google.drive = () => ({
    files: {
      get: async (params, options) => {
        if (params.alt === 'media') {
          ranges.push({ params, options });
          return { status: 206, data: 'stream' };
        }
        return { data: { driveId: 'shared-root' } };
      },
      list: async (params) => {
        calls.push(params);
        if (params.corpora === 'drive') return { data: { files: [{ id: 'shared-file', name: 'song.mp3', mimeType: 'audio/mpeg', parents: ['shared-root'] }] } };
        if (!params.pageToken) return { data: { files: [{ id: 'folder', name: 'Folder', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] }], nextPageToken: 'next' } };
        return { data: { files: [{ id: 'nested-file', name: 'clip.mp4', mimeType: 'video/mp4', parents: ['folder'], hasThumbnail: true }] } };
      },
    },
    drives: { list: async () => ({ data: { drives: [{ id: 'shared-root', name: 'Team Drive' }] } }) },
  });
  try {
    const files = await provider.listFiles('fake-token', '*');
    assert.equal(files.length, 4);
    assert.equal(files.find((file) => file.id === 'nested-file').parents[0], 'folder');
    assert.equal(files.find((file) => file.id === 'shared-root').isFolder, true);
    assert.equal(files.find((file) => file.id === 'shared-file').parents[0], 'shared-root');
    assert.equal(calls.filter((call) => call.corpora === 'user').length, 2);
    assert.equal(calls.find((call) => call.corpora === 'drive').supportsAllDrives, true);
    const nested = await provider.listFiles('fake-token', 'folder');
    assert.equal(nested.length, 1);
    assert.equal(calls.at(-1).driveId, 'shared-root');
    const content = await provider.getContentResponse('fake-token', 'shared-file', 'bytes=10-20');
    assert.equal(content.status, 206);
    assert.equal(ranges[0].options.headers.Range, 'bytes=10-20');
    assert.equal(ranges[0].params.supportsAllDrives, true);
  } finally {
    google.drive = originalDrive;
    provider._getClient = originalClient;
  }
});

test('media link signature rejects tampering', () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);
  try {
    const signed = createMediaToken({ userId: 'user', accountId: 'account', fileId: 'file', kind: 'content' });
    assert.equal(verifyMediaToken(signed).fileId, 'file');
    const [payload, signature] = signed.split('.');
    const altered = Buffer.from(JSON.stringify({ userId: 'user', accountId: 'account', fileId: 'other', kind: 'content', exp: Date.now() + 60000 })).toString('base64url');
    assert.equal(verifyMediaToken(`${altered}.${signature}`), null);
    assert.equal(verifyMediaToken(`${payload}.invalid`), null);
  } finally {
    if (originalKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  }
});

test('media route checks ownership and forwards byte ranges', async () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);
  const overrides = new Map();
  const stub = (path, exports) => {
    const resolved = require.resolve(path);
    overrides.set(resolved, require.cache[resolved]);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
  };
  let server;
  try {
    const rangeCalls = [];
    stub('../server/src/db/connection.js', () => ({ where: (criteria) => ({ first: async () => criteria.user_id === 'owner' && criteria.id === 'account' ? { id: 'account', provider: 'google_drive' } : null }) }));
    stub('../server/src/middleware/requireAuth.js', (req, res, next) => { req.user = { id: req.get('x-user') || 'owner' }; next(); });
    stub('../server/src/auth/tokenManager.js', { getValidAccessToken: async () => 'fake-access' });
    stub('../server/src/providers/index.js', { getProvider: () => ({
      getContentResponse: async (token, fileId, range) => {
        rangeCalls.push({ token, fileId, range });
        return { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 1-3/6', 'content-length': '3', 'accept-ranges': 'bytes' }, data: Readable.from(['bcd']) };
      },
    }) });
    const mediaPath = require.resolve('../server/src/routes/media.js');
    overrides.set(mediaPath, require.cache[mediaPath]);
    delete require.cache[mediaPath];
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use('/api/media', require('../server/src/routes/media.js'));
    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const denied = await fetch(`${base}/api/media/source`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': 'other' }, body: JSON.stringify({ accountId: 'account', fileId: 'clip' }) });
    assert.equal(denied.status, 404);
    const signed = await fetch(`${base}/api/media/source`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: 'account', fileId: 'clip' }) });
    assert.equal(signed.status, 200);
    const { url } = await signed.json();
    const content = await fetch(base + url, { headers: { Range: 'bytes=1-3' } });
    assert.equal(content.status, 206);
    assert.equal(content.headers.get('content-range'), 'bytes 1-3/6');
    assert.equal(await content.text(), 'bcd');
    assert.deepEqual(rangeCalls[0], { token: 'fake-access', fileId: 'clip', range: 'bytes=1-3' });
    const invalid = await fetch(base + url + 'x');
    assert.equal(invalid.status, 401);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const [path, entry] of overrides) {
      if (entry) require.cache[path] = entry;
      else delete require.cache[path];
    }
    if (originalKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  }
});
