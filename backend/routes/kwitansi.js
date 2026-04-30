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

// GET kegiatan with pegawai that need kwitansi input (support admin)
router.get('/need-kwitansi', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const isAdmin = user?.isAdmin || false;
        
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log(`🔍 ${getUsername(user)} mengakses need-kwitansi`);
        console.log('User NIP:', normalizedUserNip);
        console.log('Is Admin:', isAdmin);
        
        let kegiatanQuery = `
            SELECT DISTINCT n.*
            FROM nominatif_kegiatan n
            JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
        `;
        
        if (!isAdmin && normalizedUserNip) {
            kegiatanQuery += ` WHERE REPLACE(p.nip, ' ', '') = ?`;
        }
        
        kegiatanQuery += ` ORDER BY n.created_at DESC`;
        
        const queryParams = (!isAdmin && normalizedUserNip) ? [normalizedUserNip] : [];
        const [kegiatanList] = await db.query(kegiatanQuery, queryParams);
        
        console.log(`Found ${kegiatanList.length} kegiatan`);
        
        const result = [];
        
        for (const kegiatan of kegiatanList) {
            let pegawaiQuery = `
                SELECT 
                    p.*,
                    k.id as kwitansi_id,
                    k.no_lpd,
                    k.tgl_kwitansi,
                    k.upload_kwitansi,
                    k.status_ttd,
                    k.tgl_ttd,
                    k.catatan_ttd,
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
            
            const [pegawaiList] = await db.query(pegawaiQuery, pegawaiParams);
            
            if (pegawaiList.length === 0) {
                continue;
            }
            
            let totalPegawaiQuery = `SELECT COUNT(*) as total FROM nominatif_pegawai WHERE kegiatan_id = ?`;
            let sudahInputQuery = `SELECT COUNT(*) as total FROM kwitansi_perjadin WHERE kegiatan_id = ?`;
            
            let totalPegawaiParams = [kegiatan.id];
            let sudahInputParams = [kegiatan.id];
            
            if (!isAdmin && normalizedUserNip) {
                totalPegawaiQuery += ` AND REPLACE(nip, ' ', '') = ?`;
                sudahInputQuery += ` AND pegawai_id IN (SELECT id FROM nominatif_pegawai WHERE REPLACE(nip, ' ', '') = ? AND kegiatan_id = ?)`;
                totalPegawaiParams.push(normalizedUserNip);
                sudahInputParams.push(normalizedUserNip, kegiatan.id);
            }
            
            const [totalPegawai] = await db.query(totalPegawaiQuery, totalPegawaiParams);
            const [sudahInput] = await db.query(sudahInputQuery, sudahInputParams);
            
            result.push({
                ...kegiatan,
                total_pegawai: totalPegawai[0].total,
                sudah_input: sudahInput[0].total,
                pegawai: pegawaiList
            });
        }
        
        console.log(`✅ ${getUsername(user)}: Returning ${result.length} kegiatan`);
        
        res.status(200).json({ 
            success: true, 
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error in need-kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET all kwitansi
router.get('/', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const isAdmin = user?.isAdmin || false;
        
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log(`📋 ${getUsername(user)} mengakses daftar kwitansi`);
        
        let query = `
            SELECT k.*, 
                   n.kegiatan as nama_kegiatan, 
                   n.mak, 
                   n.kota_kab_kecamatan,
                   n.no_st,
                   p.nama as nama_pegawai,
                   p.nip,
                   p.total_biaya,
                   p.id as pegawai_id
            FROM kwitansi_perjadin k
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            LEFT JOIN nominatif_pegawai p ON k.pegawai_id = p.id
        `;
        
        let params = [];
        
        if (!isAdmin && normalizedUserNip) {
            query += ` WHERE REPLACE(p.nip, ' ', '') = ?`;
            params.push(normalizedUserNip);
        }
        
        query += ` ORDER BY k.created_at DESC`;
        
        const [results] = await db.query(query, params);
        
        const fixedResults = results.map(item => {
            if (item.upload_kwitansi) {
                item.upload_kwitansi = cleanFilePath(item.upload_kwitansi);
            }
            return item;
        });
        
        res.status(200).json({ success: true, data: fixedResults });
    } catch (error) {
        console.error('❌ Error fetching kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single kwitansi by id
router.get('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        console.log(`📋 ${getUsername(user)} mengakses kwitansi ID: ${id}`);
        
        const query = `
            SELECT k.*, 
                   n.kegiatan as nama_kegiatan, 
                   n.mak, 
                   n.kota_kab_kecamatan,
                   n.no_st,
                   p.nama as nama_pegawai,
                   p.nip,
                   p.total_biaya
            FROM kwitansi_perjadin k
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            LEFT JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            WHERE k.id = ?
        `;
        const [results] = await db.query(query, [id]);
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        
        if (results[0].upload_kwitansi) {
            results[0].upload_kwitansi = cleanFilePath(results[0].upload_kwitansi);
        }
        
        res.status(200).json({ success: true, data: results[0] });
    } catch (error) {
        console.error('❌ Error fetching kwitansi by id:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create new kwitansi
router.post('/', keycloakAuth, (req, res) => {
    upload.single('upload_kwitansi')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const user = req.user;
            const { kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi } = req.body;
            const upload_kwitansi = req.file ? `/uploads/kwitansi/${req.file.filename}` : null;
            
            console.log(`📝 ${getUsername(user)} menyimpan kwitansi untuk pegawai ID: ${pegawai_id}`);
            
            if (!kegiatan_id) {
                return res.status(400).json({ success: false, message: 'Kegiatan harus dipilih' });
            }
            
            if (!pegawai_id) {
                return res.status(400).json({ success: false, message: 'Pegawai harus dipilih' });
            }
            
            if (!no_lpd || !no_lpd.trim()) {
                return res.status(400).json({ success: false, message: 'No LPD harus diisi' });
            }
            
            const query = `
                INSERT INTO kwitansi_perjadin (kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, upload_kwitansi, status_input)
                VALUES (?, ?, ?, ?, ?, 'sudah')
            `;
            
            const [result] = await db.query(query, [kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, upload_kwitansi]);
            
            console.log(`✅ Kwitansi saved with ID: ${result.insertId}`);
            
            res.status(201).json({ 
                success: true, 
                data: { id: result.insertId, upload_kwitansi: cleanFilePath(upload_kwitansi) },
                message: 'Kwitansi berhasil disimpan'
            });
        } catch (error) {
            console.error('❌ Error creating kwitansi:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// UPDATE kwitansi
router.put('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { no_lpd, tgl_kwitansi } = req.body;
        
        console.log(`📝 ${getUsername(user)} mengupdate kwitansi ID: ${id}`);
        
        if (!no_lpd || !no_lpd.trim()) {
            return res.status(400).json({ success: false, message: 'No LPD harus diisi' });
        }
        
        const query = `
            UPDATE kwitansi_perjadin 
            SET no_lpd = ?, tgl_kwitansi = ?
            WHERE id = ?
        `;
        
        const [result] = await db.query(query, [no_lpd, tgl_kwitansi, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        
        res.status(200).json({ success: true, message: 'Kwitansi berhasil diperbarui' });
    } catch (error) {
        console.error('❌ Error updating kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE kwitansi
router.delete('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        console.log(`🗑️ ${getUsername(user)} menghapus kwitansi ID: ${id}`);
        
        const [rows] = await db.query('SELECT upload_kwitansi FROM kwitansi_perjadin WHERE id = ?', [id]);
        
        if (rows.length > 0 && rows[0].upload_kwitansi) {
            let filename = rows[0].upload_kwitansi.split('/').pop();
            const fullPath = path.join(uploadDir, filename);
            
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('🗑️ File deleted:', fullPath);
            }
        }
        
        await db.query('DELETE FROM kwitansi_perjadin WHERE id = ?', [id]);
        
        res.status(200).json({ success: true, message: 'Kwitansi berhasil dihapus' });
    } catch (error) {
        console.error('❌ Error deleting kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST untuk persetujuan tanda tangan
router.post('/approve-ttd/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const user = req.user;
        const userNip = user?.nip || '';
        const { status_ttd, catatan_ttd } = req.body;
        
        console.log(`✍️ ${getUsername(user)} approve TTD untuk kwitansi ID: ${kwitansiId}`);
        
        if (!userNip) {
            return res.status(401).json({ 
                success: false, 
                message: 'User tidak terautentikasi' 
            });
        }
        
        if (!['sudah', 'ditolak'].includes(status_ttd)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status tidak valid' 
            });
        }
        
        const userNipNormalized = normalizeNip(userNip);
        
        const [kwitansi] = await db.query(`
            SELECT k.*, p.id as pegawai_id, p.nama as pegawai_nama, p.nip as pegawai_nip
            FROM kwitansi_perjadin k
            JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            WHERE k.id = ?
        `, [kwitansiId]);
        
        if (kwitansi.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kwitansi tidak ditemukan' 
            });
        }
        
        const kwitansiData = kwitansi[0];
        const pegawaiNipNormalized = normalizeNip(kwitansiData.pegawai_nip);
        
        if (pegawaiNipNormalized !== userNipNormalized) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses. Hanya pegawai yang bersangkutan yang dapat menyetujui.' 
            });
        }
        
        if (kwitansiData.status_ttd === 'sudah') {
            return res.status(400).json({ 
                success: false, 
                message: 'Kwitansi sudah disetujui sebelumnya' 
            });
        }
        
        const tgl_ttd = status_ttd === 'sudah' ? new Date() : null;
        
        await db.query(`
            UPDATE kwitansi_perjadin 
            SET status_ttd = ?, tgl_ttd = ?, catatan_ttd = ?
            WHERE id = ?
        `, [status_ttd, tgl_ttd, catatan_ttd || null, kwitansiId]);
        
        res.status(200).json({ 
            success: true, 
            message: status_ttd === 'sudah' ? 'Kwitansi telah disetujui' : 'Kwitansi ditolak'
        });
        
    } catch (error) {
        console.error('❌ Error approving TTD:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET cek status persetujuan
router.get('/status-ttd/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const user = req.user;
        
        const [rows] = await db.query(`
            SELECT status_ttd, tgl_ttd, catatan_ttd 
            FROM kwitansi_perjadin 
            WHERE id = ?
        `, [kwitansiId]);
        
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('❌ Error fetching status TTD:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET detail kegiatan untuk kwitansi (DIPERBAIKI dengan filter akses)
router.get('/kegiatan/:id/detail', keycloakAuth, async (req, res) => {
    try {
        const kegiatanId = req.params.id;
        const user = req.user;
        const userNip = user?.nip || '';
        const isAdmin = user?.isAdmin || false;
        
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log(`📋 ${getUsername(user)} mengakses detail kegiatan ID: ${kegiatanId}`);
        console.log('User NIP:', normalizedUserNip);
        console.log('Is Admin:', isAdmin);
        
        // Cek apakah user memiliki akses ke kegiatan ini
        let hasAccess = false;
        
        if (isAdmin) {
            hasAccess = true;
        } else {
            // Cek apakah user terdaftar sebagai pegawai di kegiatan ini
            const [accessCheck] = await db.query(`
                SELECT COUNT(*) as count FROM nominatif_pegawai 
                WHERE kegiatan_id = ? AND REPLACE(nip, ' ', '') = ?
            `, [kegiatanId, normalizedUserNip]);
            
            hasAccess = accessCheck[0].count > 0;
            console.log(`Access check for user ${normalizedUserNip}: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda tidak memiliki akses ke kegiatan ini' 
            });
        }
        
        // Ambil data kegiatan
        const [kegiatan] = await db.query(`
            SELECT *, kegiatan as nama_kegiatan 
            FROM nominatif_kegiatan 
            WHERE id = ?
        `, [kegiatanId]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
        }
        
        // Ambil pegawai - untuk admin tampilkan semua, untuk user biasa tampilkan hanya dirinya
        let pegawaiQuery = `
            SELECT p.*, 
                   k.id as kwitansi_id,
                   k.no_lpd,
                   k.tgl_kwitansi,
                   k.upload_kwitansi,
                   k.status_ttd,
                   k.tgl_ttd,
                   k.catatan_ttd,
                   CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status
            FROM nominatif_pegawai p
            LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
            WHERE p.kegiatan_id = ?
        `;
        
        const pegawaiParams = [kegiatanId];
        
        if (!isAdmin && normalizedUserNip) {
            pegawaiQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
            pegawaiParams.push(normalizedUserNip);
        }
        
        const [pegawai] = await db.query(pegawaiQuery, pegawaiParams);
        
        res.status(200).json({ 
            success: true, 
            data: {
                ...kegiatan[0],
                pegawai: pegawai
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching kegiatan detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;