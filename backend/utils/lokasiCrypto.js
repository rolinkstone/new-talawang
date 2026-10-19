// File: utils/lokasiCrypto.js
// Enkripsi field `kota_kab_kecamatan` (nominatif).
//
// Format v2 (envelope encryption, dipakai untuk data baru):
//   - Nilai lokasi: enc:v2:<iv b64url>:<tag b64url>:<ciphertext b64url>
//     dienkripsi AES-256-GCM dengan DEK acak 32 byte per kegiatan.
//   - Kunci: JSON { v, user_id, totp, totp_kid, code, code_enc }
//       totp     = DEK dibungkus KEK turunan secret TOTP user (HKDF-SHA256)
//       code     = DEK dibungkus kunci turunan kode 16 karakter (PBKDF2, cadangan)
//       code_enc = kode 16 karakter dienkripsi kunci master server
//   Dengan begitu kode 6 digit Google Authenticator menjadi cara utama, sedangkan
//   kode 16 karakter tetap tersedia sebagai cadangan.
//
// Format v1 (legacy, tetap bisa dibaca):
//   - Nilai lokasi: enc:v1:<salt>:<iv>:<tag>:<ciphertext> memakai kunci PBKDF2 dari kode.
//   - Kode tersimpan: k1:<iv>:<tag>:<ciphertext> memakai kunci master server.
//
// Kode 6 digit TOTP tidak pernah dipakai sebagai kunci enkripsi karena berubah
// setiap 30 detik dan ruangnya terlalu kecil.

const crypto = require('crypto');

const LOKASI_PREFIX = 'enc:v1:';
const LOKASI_V2_PREFIX = 'enc:v2:';
const CODE_PREFIX = 'k1:';
const WRAP_CODE_PREFIX = 'c1:';
const WRAP_TOTP_PREFIX = 'w1:';
const MASKED_LOKASI = '🔒 Terenkripsi';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const DEK_BYTES = 32;
const KEK_INFO = 'talawang-lokasi-dek-v1';
const BUNDLE_VERSION = 2;

const getMasterKey = () => {
    const secret = process.env.LOKASI_ENCRYPTION_KEY
        || process.env.SESSION_SECRET
        || process.env.JWT_SECRET
        || process.env.SIGNED_URL_SECRET;

    if (!secret) {
        throw new Error('LOKASI_ENCRYPTION_KEY belum diset. Tambahkan nilai acak minimal 32 karakter di .env');
    }

    return crypto.createHash('sha256').update(String(secret)).digest();
};

const deriveKey = (code, salt) => crypto.pbkdf2Sync(String(code), salt, PBKDF2_ITERATIONS, 32, 'sha256');

const generateLokasiCode = () => {
    const bytes = crypto.randomBytes(CODE_LENGTH);
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return code;
};

const isEncryptedLokasi = (value) => typeof value === 'string'
    && (value.startsWith(LOKASI_PREFIX) || value.startsWith(LOKASI_V2_PREFIX));

const encryptLokasi = (plaintext, code) => {
    if (plaintext === null || plaintext === undefined || plaintext === '') return null;
    if (!code) throw new Error('Kode enkripsi lokasi wajib diisi');

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(code, salt), iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${LOKASI_PREFIX}${salt.toString('base64url')}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

// Mengembalikan null jika kode salah / data rusak.
const decryptLokasi = (payload, code) => {
    if (!isEncryptedLokasi(payload)) return payload;
    if (!code) return null;

    const parts = payload.slice(LOKASI_PREFIX.length).split(':');
    if (parts.length !== 4) return null;

    try {
        const salt = Buffer.from(parts[0], 'base64url');
        const iv = Buffer.from(parts[1], 'base64url');
        const tag = Buffer.from(parts[2], 'base64url');
        const encrypted = Buffer.from(parts[3], 'base64url');

        const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(code, salt), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch (error) {
        return null;
    }
};

const encryptLokasiCode = (code) => {
    if (!code) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(code), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${CODE_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

const decryptLokasiCode = (payload) => {
    if (!payload || typeof payload !== 'string' || !payload.startsWith(CODE_PREFIX)) return null;

    const parts = payload.slice(CODE_PREFIX.length).split(':');
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

const maskLokasi = (value) => (isEncryptedLokasi(value) ? MASKED_LOKASI : value);

// ==========================================================
// Envelope encryption (v2)
// ----------------------------------------------------------
// Data lokasi dienkripsi dengan DEK acak per kegiatan. DEK tidak pernah
// disimpan mentah: dibungkus (AES-256-GCM) memakai
//   - KEK turunan secret TOTP user (HKDF-SHA256), dan/atau
//   - kunci turunan kode enkripsi 16 karakter (PBKDF2, cadangan).
//
// Format nilai lokasi : enc:v2:<iv>:<tag>:<ciphertext>
// Format bundle kunci : JSON { v: 2, user_id, totp, totp_kid, code, code_enc }
//   totp     -> w1:<iv>:<tag>:<ciphertext>   (DEK dibungkus KEK TOTP)
//   code     -> c1:<salt>:<iv>:<tag>:<cipher> (DEK dibungkus kunci kode)
//   code_enc -> k1:<iv>:<tag>:<ciphertext>   (kode asli, demi kompatibilitas UI)
// ==========================================================

const isEncryptedLokasiV2 = (value) => typeof value === 'string' && value.startsWith(LOKASI_V2_PREFIX);

const sealGcm = (key, data) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

const openGcm = (key, payload) => {
    const parts = String(payload || '').split(':');
    if (parts.length !== 3) return null;

    try {
        const iv = Buffer.from(parts[0], 'base64url');
        const tag = Buffer.from(parts[1], 'base64url');
        const encrypted = Buffer.from(parts[2], 'base64url');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (error) {
        return null;
    }
};

const generateLokasiDataKey = () => crypto.randomBytes(DEK_BYTES);

const encryptLokasiV2 = (plaintext, dek) => {
    if (plaintext === null || plaintext === undefined || plaintext === '') return null;
    if (!Buffer.isBuffer(dek) || dek.length !== DEK_BYTES) throw new Error('DEK lokasi tidak valid');

    return `${LOKASI_V2_PREFIX}${sealGcm(dek, Buffer.from(String(plaintext), 'utf8'))}`;
};

const decryptLokasiV2 = (payload, dek) => {
    if (!isEncryptedLokasiV2(payload) || !Buffer.isBuffer(dek)) return null;

    const plain = openGcm(dek, payload.slice(LOKASI_V2_PREFIX.length));
    return plain ? plain.toString('utf8') : null;
};

const wrapDekWithCode = (dek, code) => {
    if (!code) return null;

    const salt = crypto.randomBytes(16);
    const key = deriveKey(code, salt);
    return `${WRAP_CODE_PREFIX}${salt.toString('base64url')}:${sealGcm(key, dek)}`;
};

const unwrapDekWithCode = (payload, code) => {
    if (!payload || typeof payload !== 'string' || !payload.startsWith(WRAP_CODE_PREFIX) || !code) {
        return null;
    }

    const rest = payload.slice(WRAP_CODE_PREFIX.length);
    const separator = rest.indexOf(':');
    if (separator === -1) return null;

    try {
        const salt = Buffer.from(rest.slice(0, separator), 'base64url');
        return openGcm(deriveKey(code, salt), rest.slice(separator + 1));
    } catch (error) {
        return null;
    }
};

const deriveKekFromTotpSecret = (totpSecret, userId) => crypto.hkdfSync(
    'sha256',
    Buffer.from(String(totpSecret), 'utf8'),
    Buffer.from(String(userId || ''), 'utf8'),
    Buffer.from(KEK_INFO, 'utf8'),
    DEK_BYTES
);

const wrapDekWithTotp = (dek, totpSecret, userId) => {
    if (!totpSecret) return null;

    return `${WRAP_TOTP_PREFIX}${sealGcm(
        Buffer.from(deriveKekFromTotpSecret(totpSecret, userId)),
        dek
    )}`;
};

const unwrapDekWithTotp = (payload, totpSecret, userId) => {
    if (!payload || typeof payload !== 'string' || !payload.startsWith(WRAP_TOTP_PREFIX) || !totpSecret) {
        return null;
    }

    return openGcm(
        Buffer.from(deriveKekFromTotpSecret(totpSecret, userId)),
        payload.slice(WRAP_TOTP_PREFIX.length)
    );
};

// Penanda secret TOTP yang dipakai saat DEK dibungkus, untuk mendeteksi
// authenticator yang sudah dihubungkan ulang dengan secret baru.
const totpKeyId = (totpSecret) => crypto
    .createHash('sha256')
    .update(String(totpSecret || ''))
    .digest('hex')
    .slice(0, 12);

const createLokasiBundle = ({ dek, code, totpSecret, userId }) => JSON.stringify({
    v: BUNDLE_VERSION,
    user_id: String(userId || ''),
    totp: totpSecret ? wrapDekWithTotp(dek, totpSecret, userId) : null,
    totp_kid: totpSecret ? totpKeyId(totpSecret) : null,
    code: wrapDekWithCode(dek, code),
    code_enc: encryptLokasiCode(code)
});

const parseLokasiBundle = (raw) => {
    if (!raw || typeof raw !== 'string' || !raw.trim().startsWith('{')) return null;

    try {
        const parsed = JSON.parse(raw);
        return parsed && parsed.v === BUNDLE_VERSION ? parsed : null;
    } catch (error) {
        return null;
    }
};

// DEK bisa dibuka dengan secret TOTP (utama) atau kode enkripsi (cadangan).
const unwrapDekFromBundle = (bundle, { code, totpSecret } = {}) => {
    if (!bundle) return null;

    if (totpSecret && bundle.totp) {
        const dek = unwrapDekWithTotp(bundle.totp, totpSecret, bundle.user_id);
        if (dek) return dek;
    }

    if (code && bundle.code) {
        return unwrapDekWithCode(bundle.code, code);
    }

    return null;
};

// Mendukung bundle v2 maupun kolom lama berisi k1:...
const getLokasiCodeFromKeyEnc = (keyEnc) => {
    const bundle = parseLokasiBundle(keyEnc);
    if (bundle) return decryptLokasiCode(bundle.code_enc);
    return decryptLokasiCode(keyEnc);
};

module.exports = {
    MASKED_LOKASI,
    getMasterKey,
    generateLokasiCode,
    isEncryptedLokasi,
    isEncryptedLokasiV2,
    encryptLokasi,
    decryptLokasi,
    generateLokasiDataKey,
    encryptLokasiV2,
    decryptLokasiV2,
    createLokasiBundle,
    parseLokasiBundle,
    unwrapDekFromBundle,
    getLokasiCodeFromKeyEnc,
    totpKeyId,
    encryptLokasiCode,
    decryptLokasiCode,
    maskLokasi
};
