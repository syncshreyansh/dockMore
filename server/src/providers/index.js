

'use strict';

const googleDriveProvider = require('./GoogleDriveProvider');

const PROVIDERS = {
  google_drive: googleDriveProvider,
  
  
};


function getProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(
      `Unknown provider: "${providerName}". Supported: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }
  return provider;
}

module.exports = { getProvider };
