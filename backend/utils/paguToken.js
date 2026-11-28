// utils/paguToken.js
// Enkripsi token API Jendela Kinerja yang disimpan untuk sinkronisasi otomatis.
// Format: p1:<iv b64url>:<tag b64url>:<ciphertext b64url>
// Kunci master memakai LOKASI_ENCRYPTION_KEY (lihat utils/lokasiCrypto.js).

const crypto = require('crypto');
const { getMasterKey } = require('./lokasiCrypto');

const TOKEN_PREFIX = 'p1:';

const encryptPaguToken = (token) => {
    if (!token) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${TOKEN_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

// Mengembalikan null bila kunci master berubah / data rusak.
const decryptPaguToken = (payload) => {
    if (!payload || typeof payload !== 'string' || !payload.startsWith(TOKEN_PREFIX)) return null;

    const parts = payload.slice(TOKEN_PREFIX.length).split(':');
    if (parts.length !== 3) return null;

    try {
        const iv = Buffer.from(parts[0], 'base64url');
        const tag = Buffer.from(parts[1], 'base64url');
        const encrypted = Buffer.from(parts[2], 'base64url');

        const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch (error) {
        return null;
    }
};

module.exports = {
    encryptPaguToken,
    decryptPaguToken
};
