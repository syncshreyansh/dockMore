'use strict';
const crypto = require('crypto');

function signature(payload) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('Media signing key is not configured');
  return crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(`media:${payload}`).digest('base64url');
}

function createMediaToken(claims) {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: Date.now() + 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

function verifyMediaToken(token) {
  try {
    const [payload, supplied, extra] = String(token).split('.');
    if (!payload || !supplied || extra) return null;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.userId || !claims.accountId || !claims.fileId || !Number.isFinite(claims.exp) || claims.exp <= Date.now()) return null;
    if (!['content', 'thumbnail'].includes(claims.kind)) return null;
    return claims;
  } catch { return null; }
}

module.exports = { createMediaToken, verifyMediaToken };
