// routes/kwitansi.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
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
    let clean = filePath.replace(/^\/api/, '').replace(/^\/public/, '');
    if (!clean.startsWith('/uploads')) {
        clean = `/uploads/kwitansi/${clean.split('/').pop()}`;
    }
    return clean;
}

// Helper normalisasi NIP
const normalizeNip = (nip) => {
    if (!nip) return '';
    return String(nip).replace(/\s/g, '');
};

// Perbaiki helper getUserRoleInfo
function getUserRoleInfo(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    // Normalisasi role name (lowercase)
    const normalizedRoles = roleArray.map(r => String(r).toLowerCase());
    
    console.log('🔍 Normalized roles:', normalizedRoles);
    
    return {
        isAdmin: normalizedRoles.includes('admin'),
        isPPK: normalizedRoles.includes('ppk'),
        isBendahara: normalizedRoles.includes('bendahara'),
        isKabalai: normalizedRoles.some(r => r.includes('kabalai')),
        isRegularUser: !normalizedRoles.includes('admin') && !normalizedRoles.includes('ppk') && !normalizedRoles.includes('bendahara')
    };
}

// Perbaiki endpoint need-kwitansi - tambahkan data ppk_nip dan bendahara_nip
router.get('/need-kwitansi', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log('👤 User info for need-kwitansi:', {
            nip: normalizedUserNip,
            isAdmin: roleInfo.isAdmin,
            isPPK: roleInfo.isPPK,
            isBendahara: roleInfo.isBendahara
        });
        
        let kegiatanQuery = `
            SELECT DISTINCT 
                n.id, n.kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st, n.tgl_st,
                n.status, 
                n.ppk_nama, n.ppk_id, n.ppk_nip,
                n.bendahara_nama, n.bendahara_nip, n.bendahara_id,
                n.diketahui_oleh, n.diketahui_oleh_id, n.created_at
            FROM nominatif_kegiatan n
            JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
            WHERE n.status = 'selesai'
        `;
        
        let queryParams = [];
        
        // Filter berdasarkan role
        if (!roleInfo.isAdmin && !roleInfo.isPPK && !roleInfo.isBendahara && normalizedUserNip) {
            kegiatanQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
            queryParams.push(normalizedUserNip);
        }
        // Jika PPK, tampilkan semua kegiatan (tidak difilter)
        // Jika Bendahara, tampilkan semua kegiatan (tidak difilter)
        
        kegiatanQuery += ` ORDER BY n.created_at DESC`;
        
        const [kegiatanList] = await db.query(kegiatanQuery, queryParams);
        const result = [];

        for (const kegiatan of kegiatanList) {
            let pegawaiQuery = `
                SELECT 
                    p.id, p.nama, p.nip, p.jabatan, p.total_biaya,
                    k.id as kwitansi_id, k.no_lpd, k.tgl_kwitansi, k.upload_kwitansi,
                    COALESCE(k.status_pegawai, 'belum') as status_pegawai,
                    COALESCE(k.status_bendahara, 'belum') as status_bendahara,
                    COALESCE(k.status_ppk, 'belum') as status_ppk,
                    k.tgl_ttd_pegawai, k.tgl_ttd_bendahara, k.tgl_ttd_ppk,
                    k.catatan_pegawai, k.catatan_bendahara, k.catatan_ppk,
                    CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status
                FROM nominatif_pegawai p
                LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
                WHERE p.kegiatan_id = ?
            `;
            
            const pegawaiParams = [kegiatan.id];
            
            if (!roleInfo.isAdmin && !roleInfo.isPPK && !roleInfo.isBendahara && normalizedUserNip) {
                pegawaiQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
                pegawaiParams.push(normalizedUserNip);
            }
            
            pegawaiQuery += ` ORDER BY p.id ASC`;
            
            const [pegawaiList] = await db.query(pegawaiQuery, pegawaiParams);
            
            if (pegawaiList.length === 0) continue;
            
            // Hitung progress approval
            let semuaPegawaiApprove = true;
            let semuaBendaharaApprove = true;
            let semuaPpkApprove = true;
            
            pegawaiList.forEach(p => {
                if (p.kwitansi_status === 'belum') semuaPegawaiApprove = false;
                if (p.status_pegawai !== 'sudah') semuaPegawaiApprove = false;
                if (p.status_bendahara !== 'sudah') semuaBendaharaApprove = false;
                if (p.status_ppk !== 'sudah') semuaPpkApprove = false;
            });
            
            result.push({
                ...kegiatan,
                total_pegawai: pegawaiList.length,
                sudah_input: pegawaiList.filter(p => p.kwitansi_status === 'sudah').length,
                semua_pegawai_approve: semuaPegawaiApprove,
                semua_bendahara_approve: semuaBendaharaApprove,
                semua_ppk_approve: semuaPpkApprove,
                pegawai: pegawaiList,
                tgl_st_formatted: kegiatan.tgl_st ? new Date(kegiatan.tgl_st).toLocaleDateString('id-ID') : '-'
            });
        }
        
        console.log(`✅ Sending ${result.length} kegiatan to frontend`);
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error in need-kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ambil TTD dari profile berdasarkan user_id
async function getTtdByUserId(userId) {
    try {
        const [profile] = await db.query(`
            SELECT ttd_path FROM user_profiles WHERE user_id = ?
        `, [userId]);
        return profile.length > 0 ? profile[0].ttd_path : null;
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
        return profile.length > 0 ? profile[0].ttd_path : null;
    } catch (error) {
        console.error('Error getting TTD by NIP:', error);
        return null;
    }
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'kwitansi-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        cb(null, mimetype && extname);
    }
});

// ============ GET kegiatan dengan pegawai ============
router.get('/need-kwitansi', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const normalizedUserNip = normalizeNip(userNip);
        
        let kegiatanQuery = `
            SELECT DISTINCT 
                n.id, n.kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st, n.tgl_st,
                n.status, n.ppk_nama, n.ppk_id, n.ppk_nip,
                n.bendahara_nama, n.bendahara_nip,
                n.diketahui_oleh, n.diketahui_oleh_id, n.created_at
            FROM nominatif_kegiatan n
            JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
            WHERE n.status = 'selesai'
        `;
        
        let queryParams = [];
        
        if (!roleInfo.isAdmin && !roleInfo.isPPK && !roleInfo.isBendahara && normalizedUserNip) {
            kegiatanQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
            queryParams.push(normalizedUserNip);
        }
        
        kegiatanQuery += ` ORDER BY n.created_at DESC`;
        
        const [kegiatanList] = await db.query(kegiatanQuery, queryParams);
        const result = [];

        for (const kegiatan of kegiatanList) {
            let pegawaiQuery = `
                SELECT 
                    p.id, p.nama, p.nip, p.jabatan, p.total_biaya,
                    k.id as kwitansi_id, k.no_lpd, k.tgl_kwitansi, k.upload_kwitansi,
                    k.status_pegawai, k.status_bendahara, k.status_ppk,
                    k.tgl_ttd_pegawai, k.tgl_ttd_bendahara, k.tgl_ttd_ppk,
                    k.catatan_pegawai, k.catatan_bendahara, k.catatan_ppk,
                    CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status,
                    COALESCE(k.status_pegawai, 'belum') as status_pegawai,
                    COALESCE(k.status_bendahara, 'belum') as status_bendahara,
                    COALESCE(k.status_ppk, 'belum') as status_ppk
                FROM nominatif_pegawai p
                LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
                WHERE p.kegiatan_id = ?
            `;
            
            const pegawaiParams = [kegiatan.id];
            
            if (!roleInfo.isAdmin && !roleInfo.isPPK && !roleInfo.isBendahara && normalizedUserNip) {
                pegawaiQuery += ` AND REPLACE(p.nip, ' ', '') = ?`;
                pegawaiParams.push(normalizedUserNip);
            }
            
            pegawaiQuery += ` ORDER BY p.id ASC`;
            
            const [pegawaiList] = await db.query(pegawaiQuery, pegawaiParams);
            
            if (pegawaiList.length === 0) continue;
            
            // Hitung progress approval
            let semuaPegawaiApprove = true;
            let semuaBendaharaApprove = true;
            let semuaPpkApprove = true;
            
            pegawaiList.forEach(p => {
                if (p.kwitansi_status === 'belum') semuaPegawaiApprove = false;
                if (p.status_pegawai !== 'sudah') semuaPegawaiApprove = false;
                if (p.status_bendahara !== 'sudah') semuaBendaharaApprove = false;
                if (p.status_ppk !== 'sudah') semuaPpkApprove = false;
            });
            
            result.push({
                ...kegiatan,
                total_pegawai: pegawaiList.length,
                sudah_input: pegawaiList.filter(p => p.kwitansi_status === 'sudah').length,
                semua_pegawai_approve: semuaPegawaiApprove,
                semua_bendahara_approve: semuaBendaharaApprove,
                semua_ppk_approve: semuaPpkApprove,
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

// ============ POST create new kwitansi ============
router.post('/', keycloakAuth, (req, res) => {
    upload.single('upload_kwitansi')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        
        try {
            const user = req.user;
            const userNip = user?.nip || '';
            const roleInfo = getUserRoleInfo(user);
            const { kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi } = req.body;
            const upload_kwitansi = req.file ? `/uploads/kwitansi/${req.file.filename}` : null;
            
            if (!kegiatan_id || !pegawai_id || !no_lpd?.trim()) {
                return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
            }
            
            // Cek akses
            if (!roleInfo.isAdmin && !roleInfo.isPPK && !roleInfo.isBendahara) {
                const [accessCheck] = await db.query(`
                    SELECT p.id FROM nominatif_pegawai p
                    WHERE p.id = ? AND p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
                `, [pegawai_id, kegiatan_id, normalizeNip(userNip)]);
                
                if (accessCheck.length === 0) {
                    return res.status(403).json({ success: false, message: 'Tidak memiliki akses' });
                }
            }
            
            // Cek existing
            const [existingCheck] = await db.query(`
                SELECT id FROM kwitansi_perjadin WHERE kegiatan_id = ? AND pegawai_id = ?
            `, [kegiatan_id, pegawai_id]);
            
            if (existingCheck.length > 0) {
                return res.status(400).json({ success: false, message: 'Kwitansi sudah ada' });
            }
            
            const query = `
                INSERT INTO kwitansi_perjadin 
                (kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, upload_kwitansi, status_input,
                 status_pegawai, status_bendahara, status_ppk)
                VALUES (?, ?, ?, ?, ?, 'sudah', 'belum', 'belum', 'belum')
            `;
            
            const [result] = await db.query(query, [
                kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, upload_kwitansi
            ]);
            
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

// ============ POST untuk approval berjenjang ============
router.post('/approve/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const user = req.user;
        const userNip = normalizeNip(user?.nip || '');
        const { status, catatan } = req.body;
        
        // Ambil data kwitansi dan kegiatan
        const [kwitansi] = await db.query(`
            SELECT k.*, p.nip as pegawai_nip, p.nama as pegawai_nama,
                   n.ppk_nip, n.bendahara_nip
            FROM kwitansi_perjadin k
            JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            WHERE k.id = ?
        `, [kwitansiId]);
        
        if (kwitansi.length === 0) {
            return res.status(404).json({ success: false, message: 'Kwitansi tidak ditemukan' });
        }
        
        const kwitansiData = kwitansi[0];
        const roleInfo = getUserRoleInfo(user);
        
        // Tentukan role user dan field yang akan diupdate
        let role = null;
        let currentStatus = null;
        
        if (roleInfo.isAdmin) {
            role = 'admin';
        } else if (roleInfo.isPPK && normalizeNip(kwitansiData.ppk_nip) === userNip) {
            role = 'ppk';
        } else if (roleInfo.isBendahara && normalizeNip(kwitansiData.bendahara_nip) === userNip) {
            role = 'bendahara';
        } else if (normalizeNip(kwitansiData.pegawai_nip) === userNip) {
            role = 'pegawai';
        }
        
        if (!role || role === 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda tidak memiliki wewenang untuk approve kwitansi ini' 
            });
        }
        
        // Validasi urutan approval
        if (role === 'pegawai' && kwitansiData.status_pegawai !== 'belum') {
            return res.status(400).json({ success: false, message: 'Anda sudah memberikan persetujuan' });
        }
        if (role === 'bendahara' && kwitansiData.status_pegawai !== 'sudah') {
            return res.status(400).json({ success: false, message: 'Menunggu persetujuan dari pegawai terlebih dahulu' });
        }
        if (role === 'bendahara' && kwitansiData.status_bendahara !== 'belum') {
            return res.status(400).json({ success: false, message: 'Anda sudah memberikan persetujuan' });
        }
        if (role === 'ppk' && kwitansiData.status_bendahara !== 'sudah') {
            return res.status(400).json({ success: false, message: 'Menunggu persetujuan dari bendahara terlebih dahulu' });
        }
        if (role === 'ppk' && kwitansiData.status_ppk !== 'belum') {
            return res.status(400).json({ success: false, message: 'Anda sudah memberikan persetujuan' });
        }
        
        // Ambil TTD dari profile
        let ttdPath = null;
        let approvalDate = status === 'sudah' ? new Date() : null;
        
        if (status === 'sudah') {
            if (role === 'pegawai') {
                ttdPath = await getTtdByNip(kwitansiData.pegawai_nip);
            } else if (role === 'bendahara') {
                ttdPath = await getTtdByNip(kwitansiData.bendahara_nip);
            } else if (role === 'ppk') {
                ttdPath = await getTtdByNip(kwitansiData.ppk_nip);
            }
        }
        
        // Update berdasarkan role
        let updateQuery = '';
        let updateParams = [];
        
        if (role === 'pegawai') {
            updateQuery = `
                UPDATE kwitansi_perjadin 
                SET status_pegawai = ?, tgl_ttd_pegawai = ?, catatan_pegawai = ?, ttd_pegawai_path = ?
                WHERE id = ?
            `;
            updateParams = [status, approvalDate, catatan || null, ttdPath, kwitansiId];
        } else if (role === 'bendahara') {
            updateQuery = `
                UPDATE kwitansi_perjadin 
                SET status_bendahara = ?, tgl_ttd_bendahara = ?, catatan_bendahara = ?, ttd_bendahara_path = ?
                WHERE id = ?
            `;
            updateParams = [status, approvalDate, catatan || null, ttdPath, kwitansiId];
        } else if (role === 'ppk') {
            updateQuery = `
                UPDATE kwitansi_perjadin 
                SET status_ppk = ?, tgl_ttd_ppk = ?, catatan_ppk = ?, ttd_ppk_path = ?
                WHERE id = ?
            `;
            updateParams = [status, approvalDate, catatan || null, ttdPath, kwitansiId];
        }
        
        await db.query(updateQuery, updateParams);
        
        // Ambil data terbaru untuk response
        const [updatedKwitansi] = await db.query(`
            SELECT status_pegawai, status_bendahara, status_ppk,
                   ttd_pegawai_path, ttd_bendahara_path, ttd_ppk_path
            FROM kwitansi_perjadin WHERE id = ?
        `, [kwitansiId]);
        
        const message = status === 'sudah' 
            ? `Kwitansi telah disetujui oleh ${role === 'pegawai' ? 'Pegawai' : role === 'bendahara' ? 'Bendahara' : 'PPK'}`
            : `Kwitansi ditolak oleh ${role === 'pegawai' ? 'Pegawai' : role === 'bendahara' ? 'Bendahara' : 'PPK'}`;
        
        res.status(200).json({ 
            success: true, 
            message,
            data: updatedKwitansi[0],
            role_approved: role,
            status_approved: status
        });
        
    } catch (error) {
        console.error('❌ Error approving kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ GET detail kwitansi ============
router.get('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const userNip = normalizeNip(user?.nip || '');
        const roleInfo = getUserRoleInfo(user);
        
        let query = `
            SELECT 
                k.*, n.kegiatan as nama_kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st,
                n.ppk_nama, n.ppk_nip, n.bendahara_nama, n.bendahara_nip,
                p.nama as nama_pegawai, p.nip as pegawai_nip, p.total_biaya,
                COALESCE(k.status_pegawai, 'belum') as status_pegawai,
                COALESCE(k.status_bendahara, 'belum') as status_bendahara,
                COALESCE(k.status_ppk, 'belum') as status_ppk
            FROM kwitansi_perjadin k
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            WHERE k.id = ?
        `;
        
        let params = [id];
        
        if (!roleInfo.isAdmin && !roleInfo.isPPK && !roleInfo.isBendahara) {
            query += ` AND REPLACE(p.nip, ' ', '') = ?`;
            params.push(userNip);
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

// ============ GET status approvals untuk satu kegiatan ============
router.get('/status/kegiatan/:kegiatanId', keycloakAuth, async (req, res) => {
    try {
        const { kegiatanId } = req.params;
        
        const [results] = await db.query(`
            SELECT 
                p.id as pegawai_id, p.nama, p.nip,
                k.id as kwitansi_id,
                COALESCE(k.status_pegawai, 'belum') as status_pegawai,
                COALESCE(k.status_bendahara, 'belum') as status_bendahara,
                COALESCE(k.status_ppk, 'belum') as status_ppk
            FROM nominatif_pegawai p
            LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
            WHERE p.kegiatan_id = ?
        `, [kegiatanId]);
        
        const semuaPegawai = results.every(r => r.status_pegawai === 'sudah');
        const semuaBendahara = results.every(r => r.status_bendahara === 'sudah');
        const semuaPpk = results.every(r => r.status_ppk === 'sudah');
        
        res.status(200).json({
            success: true,
            data: {
                pegawai_list: results,
                semua_pegawai_approve: semuaPegawai,
                semua_bendahara_approve: semuaBendahara,
                semua_ppk_approve: semuaPpk,
                total_pegawai: results.length,
                sudah_approve_pegawai: results.filter(r => r.status_pegawai === 'sudah').length,
                sudah_approve_bendahara: results.filter(r => r.status_bendahara === 'sudah').length,
                sudah_approve_ppk: results.filter(r => r.status_ppk === 'sudah').length
            }
        });
        
    } catch (error) {
        console.error('Error getting approval status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// routes/kwitansi.js - Tambahkan endpoint UPDATE

// PUT untuk update kwitansi (ketika ditolak)
router.put('/:id', keycloakAuth, (req, res) => {
    upload.single('upload_kwitansi')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { id } = req.params;
            const user = req.user;
            const userNip = user?.nip || '';
            const roleInfo = getUserRoleInfo(user);
            const { no_lpd, tgl_kwitansi } = req.body;
            const upload_kwitansi = req.file ? `/uploads/kwitansi/${req.file.filename}` : null;
            
            // Cek kwitansi existing
            const [existingKwitansi] = await db.query(`
                SELECT k.*, p.nip as pegawai_nip, p.nama as pegawai_nama,
                       n.ppk_nip, n.bendahara_nip
                FROM kwitansi_perjadin k
                JOIN nominatif_pegawai p ON k.pegawai_id = p.id
                JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
                WHERE k.id = ?
            `, [id]);
            
            if (existingKwitansi.length === 0) {
                return res.status(404).json({ success: false, message: 'Kwitansi tidak ditemukan' });
            }
            
            const kwitansi = existingKwitansi[0];
            const normalizedUserNip = normalizeNip(userNip);
            const normalizedPegawaiNip = normalizeNip(kwitansi.pegawai_nip);
            
            // Hanya pegawai yang bersangkutan atau admin yang bisa update
            const canUpdate = roleInfo.isAdmin || normalizedUserNip === normalizedPegawaiNip;
            
            if (!canUpdate) {
                return res.status(403).json({ success: false, message: 'Tidak memiliki akses untuk mengubah kwitansi ini' });
            }
            
            // Cek apakah kwitansi dalam status ditolak
            const isRejected = kwitansi.status_pegawai === 'ditolak' || 
                              kwitansi.status_bendahara === 'ditolak' || 
                              kwitansi.status_ppk === 'ditolak';
            
            if (!isRejected && !roleInfo.isAdmin) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Kwitansi tidak dapat diubah karena sudah dalam proses approval' 
                });
            }
            
            // Build update query
            let updateFields = [];
            let updateValues = [];
            
            if (no_lpd && no_lpd.trim()) {
                updateFields.push('no_lpd = ?');
                updateValues.push(no_lpd);
            }
            
            if (tgl_kwitansi) {
                updateFields.push('tgl_kwitansi = ?');
                updateValues.push(tgl_kwitansi);
            }
            
            if (upload_kwitansi) {
                // Hapus file lama jika ada
                if (kwitansi.upload_kwitansi) {
                    const oldFilePath = path.join(__dirname, '../public', kwitansi.upload_kwitansi);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                        console.log('🗑️ Old file deleted:', oldFilePath);
                    }
                }
                updateFields.push('upload_kwitansi = ?');
                updateValues.push(upload_kwitansi);
            }
            
            // Reset status approval karena diupdate ulang
            updateFields.push('status_pegawai = ?');
            updateValues.push('belum');
            updateFields.push('status_bendahara = ?');
            updateValues.push('belum');
            updateFields.push('status_ppk = ?');
            updateValues.push('belum');
            
            // Reset tanggal dan catatan
            updateFields.push('tgl_ttd_pegawai = ?');
            updateValues.push(null);
            updateFields.push('tgl_ttd_bendahara = ?');
            updateValues.push(null);
            updateFields.push('tgl_ttd_ppk = ?');
            updateValues.push(null);
            updateFields.push('catatan_pegawai = ?');
            updateValues.push(null);
            updateFields.push('catatan_bendahara = ?');
            updateValues.push(null);
            updateFields.push('catatan_ppk = ?');
            updateValues.push(null);
            
            updateFields.push('updated_at = NOW()');
            
            updateValues.push(id);
            
            const query = `UPDATE kwitansi_perjadin SET ${updateFields.join(', ')} WHERE id = ?`;
            
            await db.query(query, updateValues);
            
            // Ambil data terbaru
            const [updatedKwitansi] = await db.query(`
                SELECT * FROM kwitansi_perjadin WHERE id = ?
            `, [id]);
            
            console.log(`✅ Kwitansi ID ${id} updated by ${getUsername(user)}`);
            
            res.status(200).json({
                success: true,
                data: updatedKwitansi[0],
                message: 'Kwitansi berhasil diperbarui'
            });
            
        } catch (error) {
            console.error('❌ Error updating kwitansi:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// routes/kwitansi.js - Tambahkan endpoint untuk mengambil detail biaya pegawai

// GET detail pegawai dengan semua biayanya
// GET detail pegawai dengan semua biayanya dari tabel terpisah
// routes/kwitansi.js - Tambahkan endpoint untuk mengambil detail biaya pegawai

// GET detail pegawai dengan semua biayanya
router.get('/pegawai/:pegawaiId/biaya', keycloakAuth, async (req, res) => {
    try {
        const { pegawaiId } = req.params;
        
        console.log(`🔍 Fetching biaya for pegawai ID: ${pegawaiId}`);
        
        // Ambil data pegawai
        const [pegawai] = await db.query(`
            SELECT p.*, n.kegiatan as nama_kegiatan, n.no_st, n.mak,
                   n.ppk_nama, n.ppk_nip, n.bendahara_nama, n.bendahara_nip
            FROM nominatif_pegawai p
            JOIN nominatif_kegiatan n ON p.kegiatan_id = n.id
            WHERE p.id = ?
        `, [pegawaiId]);
        
        if (pegawai.length === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
        }
        
        // Cari biaya_id dari nominatif_biaya_kegiatan berdasarkan pegawai_id
        const [biayaList] = await db.query(`
            SELECT id as biaya_id 
            FROM nominatif_biaya_kegiatan 
            WHERE pegawai_id = ?
        `, [pegawaiId]);
        
        console.log(`📦 Biaya records ditemukan: ${biayaList.length}`);
        
        let transportasi = [];
        let uangHarian = [];
        let penginapan = [];
        
        if (biayaList.length > 0) {
            const biayaIds = biayaList.map(b => b.biaya_id);
            
            // Ambil data transportasi
            [transportasi] = await db.query(`
                SELECT id, trans as transport, harga as total, biaya_id
                FROM nominatif_transportasi
                WHERE biaya_id IN (?)
            `, [biayaIds]);
            
            // Ambil data uang harian
            [uangHarian] = await db.query(`
                SELECT id, qty, harga as tarif, total, biaya_id
                FROM nominatif_uang_harian_items
                WHERE biaya_id IN (?)
            `, [biayaIds]);
            
            // Ambil data penginapan
            [penginapan] = await db.query(`
                SELECT id, jenis as hotel, qty, harga as tarif, total, biaya_id
                FROM nominatif_penginapan_items
                WHERE biaya_id IN (?)
            `, [biayaIds]);
        }
        
        // Hitung total
        const totalTransport = transportasi.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const totalUangHarian = uangHarian.reduce((sum, u) => sum + (Number(u.total) || 0), 0);
        const totalPenginapan = penginapan.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const totalBiaya = totalTransport + totalUangHarian + totalPenginapan;
        
        console.log(`💰 Total: Transport=${totalTransport}, UH=${totalUangHarian}, Penginapan=${totalPenginapan}, Total=${totalBiaya}`);
        
        res.status(200).json({
            success: true,
            data: {
                ...pegawai[0],
                transportasi_detail: transportasi,
                uang_harian_detail: uangHarian,
                penginapan_detail: penginapan,
                transport_total: totalTransport,
                uang_harian_total: totalUangHarian,
                penginapan_total: totalPenginapan,
                total_biaya: totalBiaya > 0 ? totalBiaya : pegawai[0].total_biaya
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching pegawai biaya:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;