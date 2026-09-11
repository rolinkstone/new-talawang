// backend/utils/rateLimiter.js
// Rate limiting untuk mencegah brute-force login dan spam submission form.
// Dependency: express-rate-limit (sudah ada di package.json).
//
// Catatan: pastikan aplikasi memanggil app.set('trust proxy', 1) ketika berjalan
// di belakang reverse proxy (nginx) agar keyGenerator berbasis IP memakai IP klien
// asli, bukan IP proxy.

const rateLimit = require('express-rate-limit');

const DEFAULT_MESSAGE = 'Terlalu banyak permintaan. Silakan coba lagi nanti.';

// Membuat instance limiter dengan pesan + format response yang konsisten.
function makeLimiter({ windowMs, limit, message, keyGenerator }) {
    return rateLimit({
        windowMs,
        limit, // express-rate-limit v7+ memakai properti `limit`
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        // Matikan untuk development lokal bila benar-benar dibutuhkan
        // (jangan nonaktifkan di production).
        skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
        handler: (req, res, _next, options) => {
            const retryAfterHeader = res.getHeader('Retry-After');
            const retryAfter = retryAfterHeader
                ? Number(retryAfterHeader)
                : Math.ceil(options.windowMs / 1000);
            res.status(429).json({
                success: false,
                error: 'RATE_LIMITED',
                message: message || DEFAULT_MESSAGE,
                retryAfter
            });
        }
    });
}

// Key default express-rate-limit = req.ip (sudah memperhitungkan trust proxy).
// Untuk form transaksi, pakai identitas user (NIP/user_id) bila sudah
// terautentikasi, sehingga NAT kantor (banyak user 1 IP) tidak saling menghambat.
function writeKeyGenerator(req) {
    const user = req.user || {};
    const identity = user.nip || user.user_id || user.id;
    return identity ? `user:${identity}` : `ip:${req.ip}`;
}

module.exports = {
    // Endpoint login password-grant: ketat (anti brute-force)
    loginLimiter: makeLimiter({
        windowMs: 15 * 60 * 1000, // 15 menit
        limit: 10,
        message: 'Terlalu banyak percobaan login. Tunggu beberapa saat sebelum mencoba lagi.'
    }),

    // Refresh/validasi token
    authLimiter: makeLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        message: 'Terlalu banyak permintaan autentikasi. Silakan coba lagi nanti.'
    }),

    // Endpoint mutasi (POST/PUT/DELETE) — mencegah spam submission form transaksi
    writeLimiter: makeLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 120,
        keyGenerator: writeKeyGenerator,
        message: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.'
    })
};
