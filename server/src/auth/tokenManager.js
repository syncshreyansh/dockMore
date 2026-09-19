'use strict';

const crypto = require('crypto');
const db = require('../db/connection');
const { getProvider } = require('../providers');



const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex'); 
}




function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); 
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}


function decrypt(encoded) {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}



const EXPIRY_BUFFER_MS = 5 * 60 * 1000; 


async function getValidAccessToken(accountId) {
  const account = await db('cloud_accounts').where({ id: accountId }).first();
  if (!account) throw new Error(`Account not found: ${accountId}`);

  if (account.status === 'expired') {
    throw new Error(
      `Cloud account ${accountId} has expired/revoked credentials. ` +
      'User must reconnect.'
    );
  }

  
  const now = Date.now();
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;

  if (expiresAt - now > EXPIRY_BUFFER_MS) {
    
    return decrypt(account.access_token_enc);
  }

  
  console.log(`[tokenManager] Refreshing token for account ${accountId}`);

  const provider = getProvider(account.provider);

  try {
    const storedRefreshToken = decrypt(account.refresh_token_enc);
    const { accessToken, expiresAt: newExpiry } = await provider.refreshToken(storedRefreshToken);

    
    await db('cloud_accounts').where({ id: accountId }).update({
      access_token_enc: encrypt(accessToken),
      expires_at: newExpiry,
      last_synced_at: new Date(),
    });

    return accessToken;
  } catch (err) {
    
    const isRevoked =
      err.message?.includes('invalid_grant') ||
      err.message?.includes('Token has been expired or revoked') ||
      err.status === 401;

    if (isRevoked) {
      console.error(`[tokenManager] Token revoked for account ${accountId}. Marking expired.`);
      await db('cloud_accounts').where({ id: accountId }).update({ status: 'expired' });
      throw new Error(
        `Cloud account ${accountId} credentials were revoked. User must reconnect.`
      );
    }

    throw err; 
  }
}

module.exports = { encrypt, decrypt, getValidAccessToken };
