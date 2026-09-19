

'use strict';

class CloudProvider {
  
  constructor(name) {
    this.name = name;
  }

  

  
  
  async listFiles(accessToken, folderId) {
    throw new Error(`${this.name}: listFiles() not implemented`);
  }

  
  
  async uploadFile(accessToken, fileStream, meta) {
    throw new Error(`${this.name}: uploadFile() not implemented`);
  }

  
  
  async downloadFile(accessToken, fileId) {
    throw new Error(`${this.name}: downloadFile() not implemented`);
  }

  
  
  async deleteFile(accessToken, fileId) {
    throw new Error(`${this.name}: deleteFile() not implemented`);
  }

  
  
  async createFolder(accessToken, name, parentId) {
    throw new Error(`${this.name}: createFolder() not implemented`);
  }

  

  
  
  async getStorageInfo(accessToken) {
    throw new Error(`${this.name}: getStorageInfo() not implemented`);
  }

  

  
  
  async refreshToken(refreshToken) {
    throw new Error(`${this.name}: refreshToken() not implemented`);
  }
}

module.exports = CloudProvider;
