// routes/kwitansi.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

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

// GET kegiatan with pegawai that need kwitansi input (support admin)
router.get('/need-kwitansi', async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRoles = req.user?.roles || [];
        const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');
        
        console.log('🔍 Need Kwitansi Request:');
        console.log('User ID:', userId);
        console.log('Is Admin:', isAdmin);
        console.log('User Roles:', userRoles);
        
        let kondisiUser = '';
        let params = [];
        
        // Jika bukan admin, filter berdasarkan user_id
        if (!isAdmin && userId) {
            kondisiUser = ' AND n.user_id = ?';
            params.push(userId);
            console.log('Filtering for user:', userId);
        } else if (isAdmin) {
            console.log('Admin mode: showing all data');
        }
        
        const kegiatanQuery = `
            SELECT n.*, 
                   COUNT(DISTINCT p.id) as total_pegawai,
                   COUNT(DISTINCT k.id) as sudah_input
            FROM nominatif_kegiatan n
            LEFT JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
            LEFT JOIN kwitansi_perjadin k ON n.id = k.kegiatan_id AND p.id = k.pegawai_id
            WHERE n.status = 'selesai' ${kondisiUser}
            GROUP BY n.id
            ORDER BY n.created_at DESC
        `;
        
        console.log('Executing query...');
        const [kegiatanResults] = await db.query(kegiatanQuery, params);
        console.log(`Found ${kegiatanResults.length} kegiatan with status 'selesai'`);
        
        // For each kegiatan, get pegawai list with status
        for (let kegiatan of kegiatanResults) {
         const pegawaiQuery = `
                SELECT p.*, 
                    k.id as kwitansi_id,
                    k.no_lpd,
                    k.tgl_kwitansi,
                    k.upload_kwitansi,
                    k.status_input,
                    k.status_ttd,
                    k.tgl_ttd,
                    k.catatan_ttd,
                    p.nip,
                    CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status
                FROM nominatif_pegawai p
                LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
                WHERE p.kegiatan_id = ?
            `;
            const [pegawaiResults] = await db.query(pegawaiQuery, [kegiatan.id]);
            console.log(`Kegiatan ${kegiatan.id} has ${pegawaiResults.length} pegawai`);
            
            // Fix file path for each pegawai
            const fixedPegawai = pegawaiResults.map(pegawai => {
                if (pegawai.upload_kwitansi) {
                    pegawai.upload_kwitansi = cleanFilePath(pegawai.upload_kwitansi);
                }
                return pegawai;
            });
            
            kegiatan.pegawai = fixedPegawai;
            kegiatan.sudah_input = kegiatan.sudah_input || 0;
            kegiatan.total_pegawai = kegiatan.total_pegawai || 0;
        }
        
        res.status(200).json({ success: true, data: kegiatanResults });
    } catch (error) {
        console.error('❌ Error fetching need kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET all kwitansi (support admin)
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRoles = req.user?.roles || [];
        const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');
        
        let kondisiUser = '';
        let params = [];
        
        if (!isAdmin && userId) {
            kondisiUser = ' AND n.user_id = ?';
            params.push(userId);
        }
        
        const query = `
            SELECT k.*, 
                   n.kegiatan as nama_kegiatan, 
                   n.mak, 
                   n.kota_kab_kecamatan,
                   n.no_st,
                   n.user_id as kegiatan_user_id,
                   p.nama as nama_pegawai,
                   p.nip,
                   p.total_biaya,
                   p.id as pegawai_id
            FROM kwitansi_perjadin k
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            LEFT JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            WHERE 1=1 ${kondisiUser}
            ORDER BY k.created_at DESC
        `;
        
        const [results] = await db.query(query, params);
        
        const fixedResults = results.map(item => {
            if (item.upload_kwitansi) {
                item.upload_kwitansi = cleanFilePath(item.upload_kwitansi);
            }
            return item;
        });
        
        res.status(200).json({ success: true, data: fixedResults });
    } catch (error) {
        console.error('Error fetching kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single kwitansi by id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
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
        console.error('Error fetching kwitansi by id:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create new kwitansi
router.post('/', (req, res) => {
    upload.single('upload_kwitansi')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi } = req.body;
            const upload_kwitansi = req.file ? `/uploads/kwitansi/${req.file.filename}` : null;
            
            console.log('📝 Saving kwitansi:', {
                kegiatan_id,
                pegawai_id,
                no_lpd,
                tgl_kwitansi,
                upload_kwitansi
            });
            
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
            
            console.log('✅ Kwitansi saved with ID:', result.insertId);
            
            res.status(201).json({ 
                success: true, 
                data: { id: result.insertId, upload_kwitansi: cleanFilePath(upload_kwitansi) },
                message: 'Kwitansi berhasil disimpan'
            });
        } catch (error) {
            console.error('Error creating kwitansi:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// UPDATE kwitansi
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { no_lpd, tgl_kwitansi } = req.body;
        
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
        console.error('Error updating kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE kwitansi
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.query('SELECT upload_kwitansi FROM kwitansi_perjadin WHERE id = ?', [id]);
        
        if (rows.length > 0 && rows[0].upload_kwitansi) {
            let filename = rows[0].upload_kwitansi.split('/').pop();
            const fullPath = path.join(uploadDir, filename);
            
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('🗑️ File deleted:', fullPath);
            } else {
                console.log('⚠️ File not found:', fullPath);
            }
        }
        
        await db.query('DELETE FROM kwitansi_perjadin WHERE id = ?', [id]);
        
        res.status(200).json({ success: true, message: 'Kwitansi berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// routes/kwitansi.js - tambahkan endpoint ini

// POST untuk persetujuan tanda tangan
router.post('/approve-ttd/:kwitansiId', async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const userNip = req.user?.nip; // Gunakan NIP dari token
        const { status_ttd, catatan_ttd } = req.body;
        
        console.log('=== APPROVE TTD ===');
        console.log('Kwitansi ID:', kwitansiId);
        console.log('User NIP:', userNip);
        console.log('Status:', status_ttd);
        
        // Validasi input
        if (!userNip) {
            return res.status(401).json({ 
                success: false, 
                message: 'User tidak terautentikasi atau NIP tidak ditemukan' 
            });
        }
        
        if (!['sudah', 'ditolak'].includes(status_ttd)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status tidak valid' 
            });
        }
        
        // Fungsi normalisasi NIP (hilangkan spasi)
        const normalizeNip = (nip) => {
            if (!nip) return '';
            return String(nip).replace(/\s/g, '');
        };
        
        const userNipNormalized = normalizeNip(userNip);
        
        // Cek kwitansi dan data pegawai terkait (tanpa p.user_id)
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
        
        console.log('Pegawai NIP (normalized):', pegawaiNipNormalized);
        console.log('User NIP (normalized):', userNipNormalized);
        console.log('NIP Match:', pegawaiNipNormalized === userNipNormalized);
        
        // Hanya pegawai yang bersangkutan yang bisa approve (berdasarkan NIP)
        if (pegawaiNipNormalized !== userNipNormalized) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses. Hanya pegawai yang bersangkutan yang dapat menyetujui kwitansi ini.' 
            });
        }
        
        // Cek apakah sudah disetujui sebelumnya
        if (kwitansiData.status_ttd === 'sudah') {
            return res.status(400).json({ 
                success: false, 
                message: 'Kwitansi sudah disetujui sebelumnya' 
            });
        }
        
        // Update status kwitansi
        const query = `
            UPDATE kwitansi_perjadin 
            SET status_ttd = ?, 
                tgl_ttd = ?,
                catatan_ttd = ?
            WHERE id = ?
        `;
        
        const tgl_ttd = status_ttd === 'sudah' ? new Date() : null;
        
        await db.query(query, [status_ttd, tgl_ttd, catatan_ttd || null, kwitansiId]);
        
        console.log('Kwitansi berhasil diupdate, status:', status_ttd);
        
        res.status(200).json({ 
            success: true, 
            message: status_ttd === 'sudah' ? 'Kwitansi telah disetujui' : 'Kwitansi ditolak'
        });
        
    } catch (error) {
        console.error('Error approving TTD:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server: ' + error.message 
        });
    }
});

// GET cek status persetujuan
router.get('/status-ttd/:kwitansiId', async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const [rows] = await db.query(`
            SELECT status_ttd, tgl_ttd, catatan_ttd 
            FROM kwitansi_perjadin 
            WHERE id = ?
        `, [kwitansiId]);
        
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching status TTD:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;