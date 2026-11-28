// routes/pagu.js
// Pagu & Realisasi selalu dibaca LIVE dari API Jendela Kinerja.
// Tidak ada data pagu yang disimpan di database (lihat services/paguRealisasiService.js).
const express = require('express');
const router = express.Router();
const { keycloakAuth, getUsername } = require('../middleware/keycloakAuth');
const {
    tarikDariSumber,
    simpanKonfigurasiSetelahTarik,
    ambilDataLive,
    ambilStatusSinkron
} = require('../services/paguRealisasiService');

// Helper untuk mengecek role user
function getUserRoleInfo(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const normalizedRoles = roleArray.map(r => String(r).toLowerCase());

    return {
        isAdmin: normalizedRoles.includes('admin'),
        isPPK: normalizedRoles.includes('ppk'),
        isKabalai: normalizedRoles.some(r => r.includes('kabalai')),
        isRegularUser: !normalizedRoles.includes('admin') &&
                       !normalizedRoles.includes('ppk') &&
                       !normalizedRoles.some(r => r.includes('kabalai'))
    };
}

// Middleware: hanya admin yang bisa mengubah konfigurasi token
const requireAdmin = (req, res, next) => {
    const roleInfo = getUserRoleInfo(req.user);
    if (!roleInfo.isAdmin) {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini' });
    }
    next();
};

// ============ GET - Data pagu live dari aplikasi sumber ============
router.get('/', keycloakAuth, async (req, res) => {
    try {
        const hasil = await ambilDataLive();

        const rows = hasil.rows.map((row, index) => ({
            id: index + 1,
            mak: row.mak,
            pagu: row.pagu,
            realisasi: row.realisasi,
            sisa: row.sisa,
            tahun_anggaran: hasil.tahun,
            created_at: hasil.diambilPada,
            updated_at: hasil.diambilPada
        }));

        const status = await ambilStatusSinkron().catch(() => ({}));

        console.log(`✅ ${rows.length} pagu records (live) untuk ${getUsername(req.user)}`);

        res.status(200).json({
            success: true,
            data: rows,
            meta: {
                live: true,
                tahun: hasil.tahun,
                diambil_pada: hasil.diambilPada,
                terpotong: hasil.terpotong,
                total: hasil.total,
                ...status
            }
        });
    } catch (error) {
        const status = await ambilStatusSinkron().catch(() => ({}));
        console.error('❌ Gagal memuat pagu live:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
            meta: { live: true, ...status }
        });
    }
});

// ============ POST - Simpan token & tahun (divalidasi dengan menarik data) ============
router.post('/tarik', keycloakAuth, requireAdmin, async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const tahun = parseInt(req.body?.tahun, 10);

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token API wajib diisi' });
    }
    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
        return res.status(400).json({ success: false, message: 'Tahun anggaran tidak valid' });
    }

    const username = getUsername(req.user);
    console.log(`🔄 Menyimpan token pagu tahun ${tahun} by: ${username}`);

    try {
        // Validasi token sekaligus memastikan tahun yang dipilih punya jawaban sah.
        const hasil = await tarikDariSumber(token, tahun);
        await simpanKonfigurasiSetelahTarik({ token, tahun: hasil.tahun, username });

        console.log(`✅ Token pagu tersimpan; ${hasil.rows.length} MAK tahun ${hasil.tahun}`);

        return res.status(200).json({
            success: true,
            message: `Token tersimpan. ${hasil.rows.length} data MAK tahun ${hasil.tahun} siap ditampilkan.`,
            data: {
                imported: hasil.rows.length,
                tahun: hasil.tahun,
                total: hasil.total,
                terpotong: hasil.terpotong,
                diambil_pada: hasil.diambilPada
            }
        });
    } catch (error) {
        console.error('❌ Gagal menyimpan token pagu:', error.message);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
});

module.exports = router;