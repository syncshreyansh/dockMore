

'use strict';

const { google } = require('googleapis');
const CloudProvider = require('./CloudProvider');

class GoogleDriveProvider extends CloudProvider {
  constructor() {
    super('google_drive');

    
    
    this._oauth2Config = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
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

    const query = folderId === 'root'
      ? `'root' in parents and trashed = false`
      : `'${folderId}' in parents and trashed = false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, modifiedTime, parents)',
      pageSize: 100,
      orderBy: 'name',
    });

    return (response.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : null,
      modifiedAt: f.modifiedTime,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      parents: f.parents || [],
    }));
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
    });

    return { id: response.data.id, name: response.data.name };
  }

  
  async downloadFile(accessToken, fileId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return response.data; 
  }

  
  async deleteFile(accessToken, fileId) {
    const auth = this._getClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId });
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
    });

    return { id: response.data.id, name: response.data.name };
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
