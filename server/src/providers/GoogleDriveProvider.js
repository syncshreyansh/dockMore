

'use strict';

const { google } = require('googleapis');
const CloudProvider = require('./CloudProvider');

class GoogleDriveProvider extends CloudProvider {
  constructor() {
    super('google_drive');

    
    
    this._oauth2Config = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    };
  }

  

  
  _getClient(accessToken) {
    const auth = new google.auth.OAuth2(
      this._oauth2Config.clientId,
      this._oauth2Config.clientSecret,
      this._oauth2Config.redirectUri
    );
    auth.setCredentials({ access_token: accessToken });
    return auth;
  }

  
  _getFreshOAuth2Client() {
    return new google.auth.OAuth2(
      this._oauth2Config.clientId,
      this._oauth2Config.clientSecret,
      this._oauth2Config.redirectUri
    );
  }

  

  
  async listFiles(accessToken, folderId = 'root') {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    const escapedFolderId = String(folderId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const query = folderId === '*'
      ? 'trashed = false'
      : folderId === 'root'
      ? `'root' in parents and trashed = false`
      : `'${escapedFolderId}' in parents and trashed = false`;

    const files = [];
    const readCorpus = async (corpus = {}) => {
      let pageToken;
      do {
      const response = await drive.files.list({
        q: query,
        fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,parents,starred,webViewLink,hasThumbnail,shortcutDetails,videoMediaMetadata)',
        pageSize: 1000,
        orderBy: 'name',
        pageToken,
        spaces: 'drive',
        corpora: 'user',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        ...corpus,
      });
      if (response.data.incompleteSearch) throw new Error('Google Drive returned an incomplete listing. Please retry the sync.');
      files.push(...(response.data.files || []));
      pageToken = response.data.nextPageToken;
      } while (pageToken);
    };
    let folderCorpus = {};
    if (folderId !== '*' && folderId !== 'root') {
      const { data: folder } = await drive.files.get({ fileId: folderId, fields: 'driveId', supportsAllDrives: true });
      if (folder.driveId) folderCorpus = { corpora: 'drive', driveId: folder.driveId };
    }
    await readCorpus(folderCorpus);
    if (folderId === '*') {
      let pageToken;
      do {
        const { data } = await drive.drives.list({ pageSize: 100, pageToken, fields: 'nextPageToken,drives(id,name)' });
        for (const sharedDrive of data.drives || []) {
          files.push({ id: sharedDrive.id, name: sharedDrive.name, mimeType: 'application/vnd.google-apps.folder', parents: [] });
          await readCorpus({ corpora: 'drive', driveId: sharedDrive.id });
        }
        pageToken = data.nextPageToken;
      } while (pageToken);
    }

    return [...new Map(files.map((file) => [file.id, file])).values()].map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : null,
      modifiedAt: f.modifiedTime,
      isFolder: (f.shortcutDetails?.targetMimeType || f.mimeType) === 'application/vnd.google-apps.folder',
      shortcutDetails: f.shortcutDetails || null,
      hasThumbnail: Boolean(f.hasThumbnail),
      videoMediaMetadata: f.videoMediaMetadata || null,
      parents: f.parents || [],
      starred: Boolean(f.starred),
      webViewLink: f.webViewLink || null,
    }));
  }

  async updateFile(accessToken, fileId, update) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    const current = update.parentId !== undefined
      ? await drive.files.get({ fileId, fields: 'parents,driveId', supportsAllDrives: true })
      : null;
    const response = await drive.files.update({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.starred !== undefined ? { starred: update.starred } : {}),
      },
      ...(update.parentId !== undefined ? {
        addParents: update.parentId || current.data.driveId || 'root',
        ...((current.data.parents || []).length ? { removeParents: current.data.parents.join(',') } : {}),
      } : {}),
      fields: 'id, name, mimeType, size, modifiedTime, parents, starred, webViewLink',
    });
    return response.data;
  }

  
  async uploadFile(accessToken, fileStream, meta) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    const requestBody = {
      name: meta.name,
      ...(meta.parentId && { parents: [meta.parentId] }),
    };

    const response = await drive.files.create({
      requestBody,
      media: { mimeType: meta.mimeType, body: fileStream },
      fields: 'id, name',
      supportsAllDrives: true,
    });

    return { id: response.data.id, name: response.data.name };
  }

  
  async downloadFile(accessToken, fileId) {
    return (await this.getContentResponse(accessToken, fileId)).data;
  }

  async getContentResponse(accessToken, fileId, range) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    return drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', ...(range ? { headers: { Range: range } } : {}) }
    );
  }

  async getThumbnailResponse(accessToken, fileId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    const { data } = await drive.files.get({ fileId, supportsAllDrives: true, fields: 'thumbnailLink' });
    if (!data.thumbnailLink) { const error = new Error('No thumbnail available'); error.status = 404; throw error; }
    const url = new URL(data.thumbnailLink);
    if (url.protocol !== 'https:' || !/(^|\.)(googleusercontent\.com|google\.com)$/.test(url.hostname)) throw new Error('Invalid thumbnail host');
    return auth.request({ url: url.href, responseType: 'stream' });
  }

  async getFileMetadata(accessToken, fileId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    const { data } = await drive.files.get({ fileId, supportsAllDrives: true, fields: 'id,name,mimeType,size,parents,shortcutDetails,capabilities(canDownload)' });
    return data;
  }

  
  async deleteFile(accessToken, fileId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId, supportsAllDrives: true });
  }

  
  async createFolder(accessToken, name, parentId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    const requestBody = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };

    const response = await drive.files.create({
      requestBody,
      fields: 'id, name',
      supportsAllDrives: true,
    });

    return { id: response.data.id, name: response.data.name };
  }

  async createPublicReadPermission(accessToken, fileId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: { type: 'anyone', role: 'reader' },
      fields: 'id',
    });
    const { data } = await drive.files.get({ fileId, fields: 'webViewLink', supportsAllDrives: true });
    return data.webViewLink;
  }

  
  async getStorageInfo(accessToken) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.about.get({
      fields: 'storageQuota',
    });

    const q = response.data.storageQuota;
    return {
      used: q.usage ? parseInt(q.usage, 10) : 0,
      total: q.limit ? parseInt(q.limit, 10) : null, 
    };
  }

  
  async refreshToken(storedRefreshToken) {
    const auth = this._getFreshOAuth2Client();
    auth.setCredentials({ refresh_token: storedRefreshToken });

    const { credentials } = await auth.refreshAccessToken();

    return {
      accessToken: credentials.access_token,
      expiresAt: new Date(credentials.expiry_date),
    };
  }

  

  
  getAuthUrl(state) {
    const auth = this._getFreshOAuth2Client();
    return auth.generateAuthUrl({
      access_type: 'offline',   
      prompt: 'consent',        
      scope: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
    });
  }

  
  async exchangeCode(code) {
    const auth = this._getFreshOAuth2Client();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const userInfo = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date),
      email: userInfo.data.email,
      name: userInfo.data.name,
    };
  }
}

module.exports = new GoogleDriveProvider(); 
