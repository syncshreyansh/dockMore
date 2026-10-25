export const makeFileKey = (accountId, providerFileId) => `${accountId}::${providerFileId}`;
export function parseFileKey(value) {
  if (typeof value !== 'string') return null;
  const index = value.indexOf('::');
  return index > 0 ? { accountId: value.slice(0, index), providerFileId: value.slice(index + 2) } : null;
}

export function detectFileType(mime = '', name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (mime.startsWith('image/') || /^(png|jpe?g|gif|webp|svg|bmp|avif|heic|heif|tiff?)$/.test(ext)) return 'image';
  if (mime.startsWith('video/') || /^(mp4|m4v|mov|avi|mkv|webm|ogv|3gp|mpeg|mpg)$/.test(ext)) return 'video';
  if (mime.startsWith('audio/') || /^(mp3|m4a|wav|ogg|opus|flac|aac|aiff)$/.test(ext)) return 'audio';
  if (mime.includes('spreadsheet') || /^(xlsx?|csv|ods)$/.test(ext)) return 'spreadsheet';
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return 'archive';
  if (/^(fig|sketch|ai|psd|xd)$/.test(ext)) return 'design';
  return 'document';
}

export function mapDriveFile(f, account, selectedFolder, providerFolderId) {
  const parentIds = (f.parents || []).map((parent) => makeFileKey(account.id, parent));
  if (selectedFolder && providerFolderId && (f.parents || []).includes(providerFolderId) && !parentIds.includes(selectedFolder)) parentIds.unshift(selectedFolder);
  const size = Number(f.size || 0);
  const unit = size > 0 ? Math.min(4, Math.floor(Math.log(size) / Math.log(1024))) : 0;
  const effectiveMime = f.shortcutDetails?.targetMimeType || f.mimeType || '';
  return {
    id: makeFileKey(account.id, f.id), providerFileId: f.id, accountId: account.id,
    targetId: f.shortcutDetails?.targetId || null, mimeType: effectiveMime,
    name: f.name, type: f.isFolder ? 'folder' : detectFileType(effectiveMime, f.name),
    extension: f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : '',
    sizeBytes: size, size: f.isFolder ? 'Folder' : `${Number((size / (1024 ** unit)).toFixed(1))} ${['B', 'KB', 'MB', 'GB', 'TB'][unit]}`,
    provider: (account.provider || 'google-drive').replace('_', '-'), accountEmail: account.email,
    modified: f.modifiedAt ? new Date(f.modifiedAt).toLocaleDateString() : 'Recent', modifiedAt: f.modifiedAt || null,
    parentIds, folderId: parentIds[0] || null, path: '/',
    isFolder: Boolean(f.isFolder), starred: Boolean(f.starred),
    hasThumbnail: Boolean(f.hasThumbnail || (f.shortcutDetails?.targetId && /^(image|video)\//.test(effectiveMime))), webViewLink: f.webViewLink || null,
    durationMs: Number(f.videoMediaMetadata?.durationMillis || 0),
  };
}

export function getFolderTrail(folderKey, files, index = new Map(files.filter((f) => f.isFolder).map((f) => [f.id, f]))) {
  const trail = [];
  const seen = new Set();
  let folder = index.get(folderKey);
  while (folder && !seen.has(folder.id)) {
    seen.add(folder.id);
    trail.unshift(folder);
    folder = (folder.parentIds || [folder.folderId]).map((id) => index.get(id)).find(Boolean);
  }
  return trail;
}

export function withFilePaths(files) {
  const index = new Map(files.filter((file) => file.isFolder).map((file) => [file.id, file]));
  return files.map((file) => ({ ...file, path: `/${getFolderTrail(file.folderId, files, index).map((f) => f.name).join('/')}${file.folderId ? '/' : ''}` }));
}
