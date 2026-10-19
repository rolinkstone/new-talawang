// File: utils/totpStore.js
// Akses tabel `user_totp` (secret Google Authenticator per user).
// DDL dijalankan sekali per proses, bukan di setiap request.

const db = require('../db');
const { decryptTotpSecret } = require('./totpCrypto');

const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS user_totp (
        user_id VARCHAR(64) NOT NULL PRIMARY KEY,
        username VARCHAR(191) NULL,
        secret_enc TEXT NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME NULL,
        last_used_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

let ensurePromise = null;

// Aman dipanggil berkali-kali: pekerjaan hanya dijalankan sekali per proses.
function ensureUserTotpTable() {
    if (!ensurePromise) {
        ensurePromise = db.query(CREATE_TABLE_SQL)
            .then(() => {
                console.log('🔐 user_totp siap (dibuat/diverifikasi sekali, bukan per request)');
            })
            .catch((err) => {
                ensurePromise = null;
                throw err;
            });
    }
    return ensurePromise;
}

async function getTotpRecord(userId) {
    await ensureUserTotpTable();
    const [rows] = await db.query(
        'SELECT user_id, username, secret_enc, enabled, created_at, verified_at, last_used_at FROM user_totp WHERE user_id = ?',
        [userId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        user_id: row.user_id,
        username: row.username,
        secret_enc: row.secret_enc,
        enabled: Number(row.enabled) === 1,
        created_at: row.created_at,
        verified_at: row.verified_at,
        last_used_at: row.last_used_at
    };
}

async function getTotpStatus(userId) {
    const record = await getTotpRecord(userId);
    if (!record) {
        return { enabled: false, verified_at: null, last_used_at: null };
    }

    return {
        enabled: record.enabled,
        verified_at: record.verified_at,
        last_used_at: record.last_used_at
    };
}

// Menyimpan secret baru sebagai "pending" (enabled = 0) sampai kode 6 digit diverifikasi.
async function savePendingSecret(userId, username, secretEnc) {
    await ensureUserTotpTable();
    await db.query(
        `INSERT INTO user_totp (user_id, username, secret_enc, enabled, verified_at)
         VALUES (?, ?, ?, 0, NULL)
         ON DUPLICATE KEY UPDATE
             username = VALUES(username),
             secret_enc = VALUES(secret_enc),
             enabled = 0,
             verified_at = NULL`,
        [userId, username, secretEnc]
    );
}

async function enableTotp(userId) {
    await ensureUserTotpTable();
    await db.query(
        'UPDATE user_totp SET enabled = 1, verified_at = NOW() WHERE user_id = ?',
        [userId]
    );
}

async function deleteTotp(userId) {
    await ensureUserTotpTable();
    await db.query('DELETE FROM user_totp WHERE user_id = ?', [userId]);
}

async function markTotpUsed(userId) {
    await ensureUserTotpTable();
    await db.query('UPDATE user_totp SET last_used_at = NOW() WHERE user_id = ?', [userId]);
}

// Mengembalikan secret siap pakai hanya jika authenticator sudah diaktifkan.
async function getEnabledTotpSecret(userId) {
    const record = await getTotpRecord(userId);
    if (!record || !record.enabled) return null;

    return decryptTotpSecret(record.secret_enc);
}

module.exports = {
    ensureUserTotpTable,
    getTotpRecord,
    getTotpStatus,
    savePendingSecret,
    enableTotp,
    deleteTotp,
    markTotpUsed,
    getEnabledTotpSecret
};
