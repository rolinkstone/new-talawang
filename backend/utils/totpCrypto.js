// File: utils/totpCrypto.js
// Kriptografi secret TOTP (Google Authenticator) untuk membuka lokasi nominatif.
//
// Secret TOTP bersifat tetap (tidak berubah tiap 30 detik), sehingga aman dipakai
// sebagai bahan kunci. Kode 6 digit yang tampil di aplikasi authenticator HANYA
// dipakai untuk membuktikan pemilik secret — bukan sebagai kunci enkripsi.
//
// Secret disimpan terenkripsi memakai kunci master server (LOKASI_ENCRYPTION_KEY):
//   t1:<iv b64url>:<tag b64url>:<ciphertext b64url>

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { getMasterKey } = require('./lokasiCrypto');

const TOTP_PREFIX = 't1:';
const ISSUER = process.env.TOTP_ISSUER || 'Talawang';
const TOKEN_PATTERN = /^\d{6}$/;
const SECRET_BYTES = 20;

const isTotpToken = (value) => TOKEN_PATTERN.test(String(value || '').trim());

const encryptTotpSecret = (secret) => {
    if (!secret) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(secret), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${TOTP_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

// Mengembalikan null jika kunci master salah / data rusak.
const decryptTotpSecret = (payload) => {
    if (!payload || typeof payload !== 'string' || !payload.startsWith(TOTP_PREFIX)) return null;

    const parts = payload.slice(TOTP_PREFIX.length).split(':');
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

const buildTotpOtpauthUrl = (secretBase32, accountName) => speakeasy.otpauthURL({
    secret: secretBase32,
    encoding: 'base32',
    label: `${ISSUER}:${String(accountName || 'user')}`,
    issuer: ISSUER
});

const generateTotpSecret = (accountName) => {
    const secret = speakeasy.generateSecret({ length: SECRET_BYTES });

    // speakeasy.generateSecret() mengabaikan opsi issuer, jadi URL dibangun eksplisit
    // agar aplikasi authenticator menampilkan label "Talawang: <akun>".
    return {
        base32: secret.base32,
        otpauthUrl: buildTotpOtpauthUrl(secret.base32, accountName)
    };
};

const buildTotpQrDataUrl = (otpauthUrl) =>
    QRCode.toDataURL(otpauthUrl, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

// window: 2 -> toleransi ±60 detik terhadap selisih jam perangkat pengguna.
// Percobaan verifikasi dibatasi totpLimiter, sehingga toleransi ini tetap aman.
const verifyTotpToken = (secret, token, window = 2) => {
    const value = String(token || '').trim();
    if (!secret || !isTotpToken(value)) return false;

    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: value,
        window
    });
};

module.exports = {
    ISSUER,
    isTotpToken,
    encryptTotpSecret,
    decryptTotpSecret,
    generateTotpSecret,
    buildTotpOtpauthUrl,
    buildTotpQrDataUrl,
    verifyTotpToken
};
