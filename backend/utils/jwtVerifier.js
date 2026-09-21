// utils/jwtVerifier.js
//
// Verifikasi token akses Keycloak (RS256) memakai JWKS realm.
// Sebelumnya backend hanya `jwt.decode()` (tanpa cek tanda tangan), sehingga
// token palsu yang ditandatangani dengan secret sembarang diterima.
//
// Konfigurasi lewat env (opsional):
//   KEYCLOAK_SERVER_URL, KEYCLOAK_REALM   -> dipakai membentuk issuer/JWKS
//   KEYCLOAK_ISSUER                       -> override issuer (kalau beda dgn server/realm)
//   KEYCLOAK_AUDIENCES                    -> daftar audience dipisah koma (opsional).
//                                            Kalau KOSONG, audience tidak divalidasi
//                                            supaya token existing tetap lolos.
//   JWT_CLOCK_TOLERANCE                   -> detik toleransi skew (default 30)
//
// Catatan: config dibaca LAZY (saat verifikasi pertama), karena di server.js
// `dotenv.config()` dijalankan setelah baris require.

const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

let cached = null;

function getConfig() {
    if (cached) return cached;

    const keycloakUrl = (process.env.KEYCLOAK_SERVER_URL || 'https://auth.bbpompky.id')
        .trim()
        .replace(/\/+$/, '');
    const realm = (process.env.KEYCLOAK_REALM || 'master').trim();
    const issuer = (process.env.KEYCLOAK_ISSUER || `${keycloakUrl}/realms/${realm}`)
        .trim()
        .replace(/\/+$/, '');

    const audiences = String(process.env.KEYCLOAK_AUDIENCES || '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

    const clockTolerance = Number(process.env.JWT_CLOCK_TOLERANCE || 30);

    const client = jwksRsa({
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
        cache: true,
        cacheMaxEntries: 10,
        cacheMaxAge: 10 * 60 * 1000, // 10 menit
        rateLimit: true,
        jwksRequestsPerMinute: 20,
        timeout: 10000,
    });

    cached = { issuer, audiences, clockTolerance, client };
    return cached;
}

// Ambil public key sesuai `kid` di header token
function getSigningKey(client, header) {
    return new Promise((resolve, reject) => {
        if (!header || !header.kid) {
            return reject(new Error('Token tidak punya header "kid"'));
        }
        client.getSigningKey(header.kid, (err, key) => {
            if (err) return reject(err);
            try {
                resolve(key.getPublicKey());
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Verifikasi token akses Keycloak.
 * @param {string} token - JWT mentah (tanpa prefiks "Bearer ")
 * @returns {Promise<object>} payload token yang sudah terverifikasi
 * @throws {Error} kalau token tidak valid / tanda tangan tidak sah / kedaluwarsa
 */
async function verifyAccessToken(token) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
        throw new Error('Token kosong');
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
        throw new Error('Format token tidak valid');
    }

    // Kunci hanya algoritma RS256 — mencegah "alg: none"/HS256 confusion
    if (decoded.header.alg !== 'RS256') {
        throw new Error(`Algoritma token tidak diizinkan: ${decoded.header.alg}`);
    }

    const { issuer, audiences, clockTolerance, client } = getConfig();
    const publicKey = await getSigningKey(client, decoded.header);

    const verifyOptions = {
        algorithms: ['RS256'],
        issuer,
        clockTolerance,
    };
    if (audiences.length > 0) {
        verifyOptions.audience = audiences;
    }

    // jwt.verify juga memvalidasi exp/nbf
    return jwt.verify(token, publicKey, verifyOptions);
}

module.exports = { verifyAccessToken, getConfig };
