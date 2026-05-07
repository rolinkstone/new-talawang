// routes/kwitansi.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// IMPORT MIDDLEWARE KEYCLOAK AUTH
const { keycloakAuth, getUsername, getUserId } = require('../middleware/keycloakAuth');

// Setup upload directory
const uploadDir = path.join(__dirname, '../public/uploads/kwitansi');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Upload directory created:', uploadDir);
}

// Fungsi untuk membersihkan path file
function cleanFilePath(filePath) {
    if (!filePath) return null;
    
    let clean = filePath.replace(/^\/api/, '');
    clean = clean.replace(/^\/public/, '');
    if (!clean.startsWith('/uploads')) {
        if (!clean.includes('/')) {
            clean = `/uploads/kwitansi/${clean}`;
        } else {
            clean = `/uploads/kwitansi/${clean.split('/').pop()}`;
        }
    }
    return clean;
}

// Helper normalisasi NIP
const normalizeNip = (nip) => {
    if (!nip) return '';
    return String(nip).replace(/\s/g, '');
};

// Helper untuk mengecek role user
function getUserRoleInfo(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    return {
        isAdmin: roleArray.some(r => r.toLowerCase() === 'admin'),
        isPPK: roleArray.some(r => r.toLowerCase() === 'ppk'),
        isKabalai: roleArray.some(r => r.toLowerCase().includes('kabalai')),
        isRegularUser: !roleArray.some(r => ['admin', 'ppk'].includes(r.toLowerCase())) && !roleArray.some(r => r.toLowerCase().includes('kabalai'))
    };
}

// ============ HELPER FUNGSI UNTUK MENGAMBIL TTD DARI PROFILE ============

// Ambil TTD dari profile berdasarkan user_id
async function getTtdByUserId(userId) {
    try {
        const [profile] = await db.query(`
            SELECT ttd_path FROM user_profiles WHERE user_id = ?
        `, [userId]);
        
        if (profile.length > 0 && profile[0].ttd_path) {
            return profile[0].ttd_path;
        }
        return null;
    } catch (error) {
        console.error('Error getting TTD by user_id:', error);
        return null;
    }
}

// Ambil TTD dari profile berdasarkan NIP
async function getTtdByNip(nip) {
    try {
        if (!nip) return null;
        const cleanNip = normalizeNip(nip);
        
        const [profile] = await db.query(`
            SELECT ttd_path FROM user_profiles 
            WHERE REPLACE(nip, ' ', '') = ? OR nip = ?
        `, [cleanNip, nip]);
        
        if (profile.length > 0 && profile[0].ttd_path) {
            return profile[0].ttd_path;
        }
        return null;
    } catch (error) {
        console.error('Error getting TTD by NIP:', error);
        return null;
    }
}

// Ambil TTD PPK dari kegiatan
async function getPpkTtd(kegiatanId) {
    try {
        const [kegiatan] = await db.query(`
            SELECT ppk_id, ppk_nama, ppk_nip FROM nominatif_kegiatan WHERE id = ?
        `, [kegiatanId]);
        
        if (kegiatan.length > 0 && kegiatan[0].ppk_id) {
            // Coba cari berdasarkan user_id dulu
            let ttdPath = await getTtdByUserId(kegiatan[0].ppk_id);
            if (!ttdPath && kegiatan[0].ppk_nip) {
                ttdPath = await getTtdByNip(kegiatan[0].ppk_nip);
            }
            return ttdPath;
        }
        return null;
    } catch (error) {
        console.error('Error getting PPK TTD:', error);
        return null;
    }
}

// Ambil TTD Bendahara dari kegiatan
async function getBendaharaTtd(kegiatanId) {
    try {
        const [kegiatan] = await db.query(`
            SELECT bendahara_id, bendahara_nama, bendahara_nip FROM nominatif_kegiatan WHERE id = ?
        `, [kegiatanId]);
        
        if (kegiatan.length > 0 && kegiatan[0].bendahara_id) {
            // Coba cari berdasarkan user_id dulu
            let ttdPath = await getTtdByUserId(kegiatan[0].bendahara_id);
            if (!ttdPath && kegiatan[0].bendahara_nip) {
                ttdPath = await getTtdByNip(kegiatan[0].bendahara_nip);
            }
            return ttdPath;
        }
        return null;
    } catch (error) {
        console.error('Error getting Bendahara TTD:', error);
        return null;
    }
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'kwitansi-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📁 Saving file:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (jpeg, jpg, png) dan PDF yang diperbolehkan'));
        }
    }
});

// ============ ROUTES ============

// GET kegiatan with pegawai that need kwitansi input
router.get('/need-kwitansi', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const isAdmin = roleInfo.isAdmin;
        
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log(`🔍 ${getUsername(user)} mengakses need-kwitansi`);
        
        let kegiatanQuery = `
            SELECT DISTINCT 
                n.id,
                n.kegiatan,
                n.mak,
                n.kota_kab_kecamatan,
                n.no_st,
                n.tgl_st,
                n.status,
                n.ppk_nama,
                n.ppk_id,
                n.ppk_nip,
                n.bendahara_nama,
                n.bendahara_nip,
                n.diketahui_oleh,
                n.diketahui_oleh_id,
                n.created_at
            FROM nominatif_kegiatan n
            JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
            WHERE n.status = 'selesai'
        `;
        
        let queryParams = [];
        
        if (!isAdmin && normalizedUserNip) {
            kegiatanQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
            queryParams.push(normalizedUserNip);
        }
        
        kegiatanQuery += ` ORDER BY n.created_at DESC`;
        
        const [kegiatanList] = await db.query(kegiatanQuery, queryParams);
        
        const result = [];
        
        for (const kegiatan of kegiatanList) {
            let pegawaiQuery = `
                SELECT 
                    p.id,
                    p.nama,
                    p.nip,
                    p.jabatan,
                    p.total_biaya,
                    k.id as kwitansi_id,
                    k.no_lpd,
                    k.tgl_kwitansi,
                    k.upload_kwitansi,
                    k.status_ttd,
                    k.tgl_ttd,
                    k.catatan_ttd,
                    k.ttd_pegawai_path,
                    k.ttd_ppk_path,
                    k.ttd_bendahara_path,
                    CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status
                FROM nominatif_pegawai p
                LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
                WHERE p.kegiatan_id = ?
            `;
            
            const pegawaiParams = [kegiatan.id];
            
            if (!isAdmin && normalizedUserNip) {
                pegawaiQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
                pegawaiParams.push(normalizedUserNip);
            }
            
            pegawaiQuery += ` ORDER BY p.id ASC`;
            
            const [pegawaiList] = await db.query(pegawaiQuery, pegawaiParams);
            
            if (pegawaiList.length === 0) {
                continue;
            }
            
            let totalPegawaiQuery = `SELECT COUNT(*) as total FROM nominatif_pegawai WHERE kegiatan_id = ?`;
            let sudahInputQuery = `
                SELECT COUNT(*) as total 
                FROM kwitansi_perjadin k
                JOIN nominatif_pegawai p ON k.pegawai_id = p.id
                WHERE k.kegiatan_id = ? AND p.kegiatan_id = ?
            `;
            
            let totalPegawaiParams = [kegiatan.id];
            let sudahInputParams = [kegiatan.id, kegiatan.id];
            
            if (!isAdmin && normalizedUserNip) {
                totalPegawaiQuery += ` AND REPLACE(nip, ' ', '') = ?`;
                sudahInputQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
                totalPegawaiParams.push(normalizedUserNip);
                sudahInputParams.push(normalizedUserNip);
            }
            
            const [totalPegawai] = await db.query(totalPegawaiQuery, totalPegawaiParams);
            const [sudahInput] = await db.query(sudahInputQuery, sudahInputParams);
            
            result.push({
                ...kegiatan,
                total_pegawai: totalPegawai[0].total,
                sudah_input: sudahInput[0].total,
                pegawai: pegawaiList,
                tgl_st_formatted: kegiatan.tgl_st ? new Date(kegiatan.tgl_st).toLocaleDateString('id-ID') : '-'
            });
        }
        
        res.status(200).json({ success: true, data: result });
        
    } catch (error) {
        console.error('❌ Error in need-kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create new kwitansi (dengan TTD dari profile)
router.post('/', keycloakAuth, (req, res) => {
    upload.single('upload_kwitansi')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const user = req.user;
            const userNip = user?.nip || '';
            const roleInfo = getUserRoleInfo(user);
            const isAdmin = roleInfo.isAdmin;
            const normalizedUserNip = normalizeNip(userNip);
            
            const { kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi } = req.body;
            const upload_kwitansi = req.file ? `/uploads/kwitansi/${req.file.filename}` : null;
            
            console.log(`📝 ${getUsername(user)} menyimpan kwitansi untuk pegawai ID: ${pegawai_id}`);
            
            if (!kegiatan_id || !pegawai_id || !no_lpd || !no_lpd.trim()) {
                return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
            }
            
            // Cek akses
            if (!isAdmin && normalizedUserNip) {
                const [accessCheck] = await db.query(`
                    SELECT p.id FROM nominatif_pegawai p
                    WHERE p.id = ? AND p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
                `, [pegawai_id, kegiatan_id, normalizedUserNip]);
                
                if (accessCheck.length === 0) {
                    return res.status(403).json({ success: false, message: 'Tidak memiliki akses' });
                }
            }
            
            // Cek apakah sudah ada kwitansi
            const [existingCheck] = await db.query(`
                SELECT id FROM kwitansi_perjadin WHERE kegiatan_id = ? AND pegawai_id = ?
            `, [kegiatan_id, pegawai_id]);
            
            if (existingCheck.length > 0) {
                return res.status(400).json({ success: false, message: 'Kwitansi sudah ada' });
            }
            
            // Ambil data pegawai untuk mendapatkan NIP
            const [pegawaiData] = await db.query(`
                SELECT nip FROM nominatif_pegawai WHERE id = ?
            `, [pegawai_id]);
            
            // Ambil TTD dari profile pegawai
            let ttdPegawaiPath = null;
            if (pegawaiData.length > 0 && pegawaiData[0].nip) {
                ttdPegawaiPath = await getTtdByNip(pegawaiData[0].nip);
            }
            
            // Ambil TTD PPK dari kegiatan
            const ttdPpkPath = await getPpkTtd(kegiatan_id);
            
            // Ambil TTD Bendahara dari kegiatan
            const ttdBendaharaPath = await getBendaharaTtd(kegiatan_id);
            
            console.log('TTD Sources:', {
                ttdPegawaiPath: ttdPegawaiPath,
                ttdPpkPath: ttdPpkPath,
                ttdBendaharaPath: ttdBendaharaPath
            });
            
            const query = `
                INSERT INTO kwitansi_perjadin 
                (kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, upload_kwitansi, status_input,
                 ttd_pegawai_path, ttd_ppk_path, ttd_bendahara_path)
                VALUES (?, ?, ?, ?, ?, 'sudah', ?, ?, ?)
            `;
            
            const [result] = await db.query(query, [
                kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, upload_kwitansi,
                ttdPegawaiPath, ttdPpkPath, ttdBendaharaPath
            ]);
            
            console.log(`✅ Kwitansi saved with ID: ${result.insertId}`);
            
            res.status(201).json({ 
                success: true, 
                data: { 
                    id: result.insertId, 
                    upload_kwitansi: cleanFilePath(upload_kwitansi),
                    ttd_pegawai_path: ttdPegawaiPath,
                    ttd_ppk_path: ttdPpkPath,
                    ttd_bendahara_path: ttdBendaharaPath
                },
                message: 'Kwitansi berhasil disimpan'
            });
            
        } catch (error) {
            console.error('❌ Error creating kwitansi:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// GET detail kwitansi by id (dengan TTD dari profile)
router.get('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const isAdmin = roleInfo.isAdmin;
        const normalizedUserNip = normalizeNip(userNip);
        
        let query = `
            SELECT 
                k.*, 
                n.kegiatan as nama_kegiatan, 
                n.mak, 
                n.kota_kab_kecamatan,
                n.no_st,
                n.ppk_nama,
                n.ppk_nip,
                n.bendahara_nama,
                n.bendahara_nip,
                p.nama as nama_pegawai,
                p.nip as pegawai_nip,
                p.total_biaya
            FROM kwitansi_perjadin k
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            LEFT JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            WHERE k.id = ?
        `;
        
        let params = [id];
        
        if (!isAdmin && normalizedUserNip) {
            query += ` AND REPLACE(p.nip, ' ', '') = ?`;
            params.push(normalizedUserNip);
        }
        
        const [results] = await db.query(query, params);
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        
        if (results[0].upload_kwitansi) {
            results[0].upload_kwitansi = cleanFilePath(results[0].upload_kwitansi);
        }
        
        res.status(200).json({ success: true, data: results[0] });
    } catch (error) {
        console.error('❌ Error fetching kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST untuk persetujuan tanda tangan pegawai
router.post('/approve-ttd/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const user = req.user;
        const userNip = user?.nip || '';
        const { status_ttd, catatan_ttd } = req.body;
        
        const userNipNormalized = normalizeNip(userNip);
        
        const [kwitansi] = await db.query(`
            SELECT k.*, p.nip as pegawai_nip
            FROM kwitansi_perjadin k
            JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            WHERE k.id = ?
        `, [kwitansiId]);
        
        if (kwitansi.length === 0) {
            return res.status(404).json({ success: false, message: 'Kwitansi tidak ditemukan' });
        }
        
        const kwitansiData = kwitansi[0];
        const pegawaiNipNormalized = normalizeNip(kwitansiData.pegawai_nip);
        
        // Hanya pegawai yang bersangkutan yang dapat menyetujui
        if (pegawaiNipNormalized !== userNipNormalized) {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya pegawai yang bersangkutan yang dapat menyetujui' 
            });
        }
        
        if (kwitansiData.status_ttd === 'sudah') {
            return res.status(400).json({ success: false, message: 'Kwitansi sudah disetujui' });
        }
        
        const tgl_ttd = status_ttd === 'sudah' ? new Date() : null;
        
        // Ambil TTD pegawai dari profile
        let ttdPegawaiPath = null;
        if (status_ttd === 'sudah') {
            ttdPegawaiPath = await getTtdByNip(pegawaiNipNormalized);
        }
        
        await db.query(`
            UPDATE kwitansi_perjadin 
            SET status_ttd = ?, tgl_ttd = ?, catatan_ttd = ?, 
                ttd_pegawai_path = ?, ttd_pegawai_used_at = ?
            WHERE id = ?
        `, [status_ttd, tgl_ttd, catatan_ttd || null, ttdPegawaiPath, tgl_ttd, kwitansiId]);
        
        res.status(200).json({ 
            success: true, 
            message: status_ttd === 'sudah' ? 'Kwitansi telah disetujui' : 'Kwitansi ditolak'
        });
        
    } catch (error) {
        console.error('❌ Error approving TTD:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;