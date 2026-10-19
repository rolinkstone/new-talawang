// routes/profileTotp.js
// Pengelolaan Google Authenticator (TOTP) per user.
// Dipasang di /api/profile/totp (lihat routes/profile.js).

const express = require('express');
const router = express.Router();
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');
const { totpLimiter } = require('../utils/rateLimiter');
const {
    isTotpToken,
    encryptTotpSecret,
    decryptTotpSecret,
    generateTotpSecret,
    buildTotpOtpauthUrl,
    buildTotpQrDataUrl,
    verifyTotpToken
} = require('../utils/totpCrypto');
const {
    getTotpRecord,
    getTotpStatus,
    savePendingSecret,
    enableTotp,
    deleteTotp
} = require('../utils/totpStore');

const WRONG_TOKEN_MESSAGE = 'Kode authenticator salah atau sudah kedaluwarsa';

// GET /api/profile/totp — status authenticator user
router.get('/', keycloakAuth, async (req, res) => {
    try {
        const userId = getUserId(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User tidak dikenali' });
        }

        const status = await getTotpStatus(userId);
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('❌ Error fetching TOTP status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/profile/totp/setup — buat secret baru + QR code
router.post('/setup', keycloakAuth, totpLimiter, async (req, res) => {
    try {
        const userId = getUserId(req.user);
        const username = getUsername(req.user) || 'user';
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User tidak dikenali' });
        }

        const current = await getTotpRecord(userId);
        if (current && current.enabled) {
            return res.status(409).json({
                success: false,
                message: 'Authenticator sudah aktif. Nonaktifkan terlebih dahulu untuk menghubungkan ulang.'
            });
        }

        // Pakai ulang secret yang masih pending agar QR yang sudah dipindai tetap
        // valid (mis. user me-refresh halaman atau membuka profil di tab lain).
        const regenerate = req.body?.regenerate === true;
        if (current && !regenerate) {
            const existingSecret = decryptTotpSecret(current.secret_enc);
            if (existingSecret) {
                const otpauthUrl = buildTotpOtpauthUrl(existingSecret, current.username || username);
                const qrDataUrl = await buildTotpQrDataUrl(otpauthUrl);

                return res.json({
                    success: true,
                    reused: true,
                    message: 'QR yang sama masih berlaku. Pindai QR ini lalu masukkan 6 digit kode untuk mengaktifkan.',
                    data: {
                        secret: existingSecret,
                        otpauth_url: otpauthUrl,
                        qr_data_url: qrDataUrl
                    }
                });
            }
        }

        const { base32, otpauthUrl } = generateTotpSecret(username);
        const qrDataUrl = await buildTotpQrDataUrl(otpauthUrl);
        const secretEnc = encryptTotpSecret(base32);

        if (!secretEnc) {
            return res.status(500).json({ success: false, message: 'Gagal menyimpan secret authenticator' });
        }

        await savePendingSecret(userId, username, secretEnc);

        res.json({
            success: true,
            message: 'Pindai QR code dengan Google Authenticator, lalu masukkan 6 digit kode untuk mengaktifkan.',
            data: {
                secret: base32,
                otpauth_url: otpauthUrl,
                qr_data_url: qrDataUrl
            }
        });
    } catch (error) {
        console.error('❌ Error setup TOTP:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/profile/totp/verify — verifikasi 6 digit lalu aktifkan
router.post('/verify', keycloakAuth, totpLimiter, async (req, res) => {
    const { token } = req.body || {};

    if (!isTotpToken(token)) {
        return res.status(400).json({ success: false, message: 'Masukkan 6 digit kode dari aplikasi authenticator' });
    }

    try {
        const userId = getUserId(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User tidak dikenali' });
        }

        const record = await getTotpRecord(userId);
        if (!record) {
            return res.status(400).json({
                success: false,
                message: 'Belum ada proses setup authenticator. Muat ulang halaman profil.'
            });
        }

        const secret = decryptTotpSecret(record.secret_enc);
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: 'Secret authenticator tidak dapat dibuka. Periksa LOKASI_ENCRYPTION_KEY di server.'
            });
        }

        if (!verifyTotpToken(secret, token)) {
            const now = new Date();
            console.warn(
                `⚠️ Verifikasi TOTP gagal — user: ${userId}, waktu server: ${now.toISOString()}, ` +
                `step: ${Math.floor(now.getTime() / 30000)}. Periksa jam perangkat pengguna.`
            );
            return res.status(400).json({ success: false, message: WRONG_TOKEN_MESSAGE });
        }

        await enableTotp(userId);
        res.json({ success: true, message: 'Google Authenticator berhasil diaktifkan' });
    } catch (error) {
        console.error('❌ Error verify TOTP:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/profile/totp — nonaktifkan (wajib konfirmasi kode 6 digit)
router.delete('/', keycloakAuth, totpLimiter, async (req, res) => {
    const { token } = req.body || {};

    try {
        const userId = getUserId(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User tidak dikenali' });
        }

        const record = await getTotpRecord(userId);
        if (!record) {
            return res.json({ success: true, message: 'Authenticator tidak aktif' });
        }

        // Setup yang belum diverifikasi boleh dibatalkan tanpa kode.
        if (record.enabled) {
            if (!isTotpToken(token)) {
                return res.status(400).json({
                    success: false,
                    message: 'Masukkan 6 digit kode authenticator untuk menonaktifkan'
                });
            }

            const secret = decryptTotpSecret(record.secret_enc);
            if (!secret || !verifyTotpToken(secret, token)) {
                return res.status(400).json({ success: false, message: WRONG_TOKEN_MESSAGE });
            }
        }

        await deleteTotp(userId);
        res.json({ success: true, message: 'Google Authenticator dinonaktifkan' });
    } catch (error) {
        console.error('❌ Error disable TOTP:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
