'use strict';

const crypto = require('crypto');

const ALG = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getEncryptionKey() {
  const secret = process.env.AI_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'change-this-in-production';
  return crypto.scryptSync(secret, 'ai-key-salt', KEY_LEN);
}

/**
 * Encrypt a plaintext API key for storage. Returns hex string (iv:tag:ciphertext).
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc;
}

/**
 * Decrypt stored API key. Input format: iv:tag:ciphertext (hex).
 */
function decrypt(encrypted) {
  if (!encrypted || typeof encrypted !== 'string') return null;
  const parts = encrypted.split(':');
  if (parts.length !== 3) return null;
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const enc = parts[2];
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
  } catch (e) {
    return null;
  }
}

/**
 * Mask API key for logs and admin display (e.g. sk-...xyz4).
 */
function maskKey(key) {
  if (!key || typeof key !== 'string') return null;
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };
