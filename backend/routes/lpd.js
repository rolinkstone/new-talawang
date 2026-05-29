// routes/lpd.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { keycloakAuth, getUsername, getUserId } = require('../middleware/keycloakAuth');

// Setup upload directory untuk dokumentasi LPD
const lpdUploadDir = path.join(__dirname, '../public/uploads/lpd-dokumentasi');
if (!fs.existsSync(lpdUploadDir)) {
    fs.mkdirSync(lpdUploadDir, { recursive: true });
    console.log('✅ LPD dokumentasi upload directory created:', lpdUploadDir);
}

// Konfigurasi multer untuk upload file dokumentasi LPD
const lpdStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, lpdUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'lpd-dokumentasi-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

const uploadLpd = multer({
    storage: lpdStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (jpeg, jpg, png), PDF, atau Word yang diperbolehkan'));
        }
    }
});

// Fungsi untuk membersihkan path file - PASTIKAN TIDAK ADA /api
function cleanFilePath(filePath) {
    if (!filePath) return null;
    // Hapus /api dan /public dari awal path
    let clean = filePath.replace(/^\/api/, '').replace(/^\/public/, '');
    // Pastikan dimulai dengan /
    if (!clean.startsWith('/')) {
        clean = '/' + clean;
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

// ============ GET daftar kegiatan untuk LPD ============
router.get('/daftar-kegiatan', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        
        console.log('👤 User info for daftar-kegiatan:', {
            userId: userId,
            isAdmin: roleInfo.isAdmin,
            isRegularUser: roleInfo.isRegularUser
        });
        
        let query = `
            SELECT 
                n.id,
                n.kegiatan,
                n.no_st,
                n.tgl_st,
                n.mak,
                n.kota_kab_kecamatan as tempat,
                n.status_2,
                n.user_id,
                n.rencana_tanggal_pelaksanaan as tgl_mulai,
                n.rencana_tanggal_pelaksanaan_akhir as tgl_selesai,
                n.created_at,
                n.ppk_nama,
                n.ppk_nip,
                n.bendahara_nama,
                n.bendahara_nip
            FROM nominatif_kegiatan n
            WHERE n.status = 'selesai'
        `;
        
        const params = [];
        
        query += ` ORDER BY n.created_at DESC`;
        
        console.log('📝 Query:', query);
        console.log('📝 Params:', params);
        
        const [kegiatanList] = await db.query(query, params);
        console.log(`📊 Found ${kegiatanList.length} kegiatan from query`);
        
        const result = [];
        
        for (const kegiatan of kegiatanList) {
            // Cek apakah ada rincian kegiatan
            const [rincianCheck] = await db.query(
                'SELECT COUNT(*) as count FROM lpd_rincian_kegiatan WHERE kegiatan_id = ?',
                [kegiatan.id]
            );
            
            // Cek apakah ada dokumentasi
            const [dokumentasiCheck] = await db.query(
                'SELECT COUNT(*) as count FROM lpd_dokumentasi WHERE kegiatan_id = ?',
                [kegiatan.id]
            );
            
            result.push({
                id: kegiatan.id,
                kegiatan: kegiatan.kegiatan,
                no_st: kegiatan.no_st,
                tgl_st: kegiatan.tgl_st,
                mak: kegiatan.mak,
                tempat: kegiatan.tempat,
                tgl_mulai: kegiatan.tgl_mulai,
                tgl_selesai: kegiatan.tgl_selesai,
                status: kegiatan.status_2,
                has_rincian: (rincianCheck[0]?.count || 0) > 0,
                has_dokumentasi: (dokumentasiCheck[0]?.count || 0) > 0,
                created_by_me: kegiatan.user_id === userId,
                created_at: kegiatan.created_at,
                ppk_nama: kegiatan.ppk_nama,
                ppk_nip: kegiatan.ppk_nip,
                bendahara_nama: kegiatan.bendahara_nama,
                bendahara_nip: kegiatan.bendahara_nip
            });
        }
        
        console.log(`✅ Sending ${result.length} kegiatan to frontend`);
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error in daftar-kegiatan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ GET detail LPD berdasarkan kegiatan_id ============
router.get('/kegiatan/:kegiatanId', keycloakAuth, async (req, res) => {
    try {
        const { kegiatanId } = req.params;
        const user = req.user;
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        
        console.log('👤 User info for kegiatan detail:', {
            kegiatanId,
            userId,
            isAdmin: roleInfo.isAdmin
        });
        
        // Ambil data kegiatan
        const [kegiatan] = await db.query(`
            SELECT 
                n.*,
                n.no_st,
                n.tgl_st,
                n.kegiatan as nama_kegiatan,
                n.mak,
                n.kota_kab_kecamatan as tempat_pelaksanaan,
                n.rencana_tanggal_pelaksanaan as tgl_mulai,
                n.rencana_tanggal_pelaksanaan_akhir as tgl_selesai,
                DATEDIFF(n.rencana_tanggal_pelaksanaan_akhir, n.rencana_tanggal_pelaksanaan) + 1 as lama_perjalanan,
                n.ppk_nama,
                n.ppk_nip,
                n.bendahara_nama,
                n.bendahara_nip
            FROM nominatif_kegiatan n
            WHERE n.id = ?
        `, [kegiatanId]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
        }
        
        const kegiatanData = kegiatan[0];
        
        // Izinkan semua user yang login untuk melihat detail LPD
        let hasAccess = true;
        
        console.log('✅ Access granted for user:', userId);
        
        // Ambil data pegawai (petugas pelaksana)
        const [pegawaiList] = await db.query(`
            SELECT 
                p.id,
                p.nama,
                p.nip,
                p.pangkat,
                p.jabatan
            FROM nominatif_pegawai p
            WHERE p.kegiatan_id = ?
            ORDER BY p.id ASC
        `, [kegiatanId]);
        
        // Ambil data rincian kegiatan (LPD items)
        const [rincianKegiatan] = await db.query(`
            SELECT 
                id,
                tanggal,
                kegiatan,
                urutan
            FROM lpd_rincian_kegiatan
            WHERE kegiatan_id = ?
            ORDER BY urutan ASC, tanggal ASC
        `, [kegiatanId]);
        
        // Ambil data dokumentasi - LANGSUNG return file_path tanpa modifikasi berlebihan
        const [dokumentasi] = await db.query(`
            SELECT 
                id,
                file_path,
                file_name,
                file_type,
                file_size,
                keterangan,
                created_at
            FROM lpd_dokumentasi
            WHERE kegiatan_id = ?
            ORDER BY created_at ASC
        `, [kegiatanId]);
        
        // Format tanggal helper
        const formatTanggal = (date) => {
            if (!date) return null;
            const d = new Date(date);
            const tgl = d.getDate().toString().padStart(2, '0');
            const bln = (d.getMonth() + 1).toString().padStart(2, '0');
            const thn = d.getFullYear();
            return `${tgl}-${bln}-${thn}`;
        };
        
        // Hitung lama perjalanan jika belum ada
        let lamaPerjalanan = kegiatanData.lama_perjalanan;
        if (!lamaPerjalanan || lamaPerjalanan <= 0) {
            if (kegiatanData.tgl_mulai && kegiatanData.tgl_selesai) {
                const start = new Date(kegiatanData.tgl_mulai);
                const end = new Date(kegiatanData.tgl_selesai);
                lamaPerjalanan = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            } else {
                lamaPerjalanan = 1;
            }
        }
        
        // Data response sesuai template
        const responseData = {
            kegiatan_id: parseInt(kegiatanId),
            nama_kegiatan: kegiatanData.nama_kegiatan,
            dasar_pelaksanaan: {
                nomor_st: kegiatanData.no_st || '',
                tanggal_st: formatTanggal(kegiatanData.tgl_st)
            },
            petugas_pelaksana: pegawaiList.map(p => ({
                nama: p.nama,
                nip: p.nip,
                pangkat_golongan: p.pangkat || '',
                jabatan: p.jabatan
            })),
            waktu_tempat: {
                lama_perjalanan: `${lamaPerjalanan} (hari)`,
                tanggal_mulai: formatTanggal(kegiatanData.tgl_mulai),
                tanggal_selesai: formatTanggal(kegiatanData.tgl_selesai),
                tempat_pelaksanaan: kegiatanData.tempat_pelaksanaan || ''
            },
            pembiayaan: {
                mak: kegiatanData.mak || ''
            },
            rincian_kegiatan: rincianKegiatan.map((rk, index) => ({
                id: rk.id,
                no: index + 1,
                tanggal: formatTanggal(rk.tanggal),
                kegiatan: rk.kegiatan,
                urutan: rk.urutan
            })),
            dokumentasi: dokumentasi.map(doc => ({
                id: doc.id,
                file_path: doc.file_path, // LANGSUNG, tanpa cleanFilePath
                file_name: doc.file_name,
                file_type: doc.file_type,
                file_size: doc.file_size,
                keterangan: doc.keterangan,
                created_at: doc.created_at
            })),
            status: kegiatanData.status_2 || 'draft',
            can_edit: kegiatanData.user_id === userId || roleInfo.isAdmin,
            ppk_nama: kegiatanData.ppk_nama,
            ppk_nip: kegiatanData.ppk_nip,
            bendahara_nama: kegiatanData.bendahara_nama,
            bendahara_nip: kegiatanData.bendahara_nip
        };
        
        console.log(`✅ Sending LPD data for kegiatan ${kegiatanId}`);
        
        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error('❌ Error in kegiatan detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ POST create/update rincian kegiatan LPD ============
router.post('/rincian', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        const { kegiatan_id, rincian_list } = req.body;
        
        console.log('📝 Saving rincian kegiatan with data:', {
            kegiatan_id,
            rincian_count: rincian_list?.length || 0,
            userId,
            roleInfo
        });
        
        if (!kegiatan_id) {
            return res.status(400).json({ success: false, message: 'Kegiatan ID tidak boleh kosong' });
        }
        
        const [kegiatan] = await db.query(`
            SELECT user_id FROM nominatif_kegiatan WHERE id = ?
        `, [kegiatan_id]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
        }
        
        let hasAccess = false;
        if (roleInfo.isAdmin) {
            hasAccess = true;
            console.log('👑 Admin access granted');
        } else if (roleInfo.isRegularUser && kegiatan[0].user_id === userId) {
            hasAccess = true;
            console.log('✅ Access granted: User is the kegiatan creator');
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses untuk mengubah rincian kegiatan ini. Hanya pembuat kegiatan yang dapat mengedit.' 
            });
        }
        
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            await connection.query('DELETE FROM lpd_rincian_kegiatan WHERE kegiatan_id = ?', [kegiatan_id]);
            
            if (rincian_list && Array.isArray(rincian_list) && rincian_list.length > 0) {
                for (let i = 0; i < rincian_list.length; i++) {
                    const item = rincian_list[i];
                    await connection.query(`
                        INSERT INTO lpd_rincian_kegiatan (kegiatan_id, tanggal, kegiatan, urutan)
                        VALUES (?, ?, ?, ?)
                    `, [kegiatan_id, item.tanggal, item.kegiatan, i + 1]);
                }
                console.log(`✅ Inserted ${rincian_list.length} rincian items`);
            }
            
            await connection.commit();
            console.log(`✅ Rincian kegiatan saved for kegiatan_id: ${kegiatan_id}`);
            
            res.status(200).json({ 
                success: true, 
                message: 'Rincian kegiatan berhasil disimpan'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error saving rincian kegiatan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ POST upload dokumentasi LPD ============
router.post('/dokumentasi/:kegiatanId', keycloakAuth, (req, res) => {
    uploadLpd.array('files', 20)(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { kegiatanId } = req.params;
            const { keterangan_list } = req.body;
            const user = req.user;
            const userId = getUserId(user);
            const roleInfo = getUserRoleInfo(user);
            
            console.log('📝 Uploading dokumentasi for kegiatan:', {
                kegiatanId,
                filesCount: req.files?.length || 0,
                userId,
                roleInfo
            });
            
            const [kegiatan] = await db.query(`
                SELECT user_id FROM nominatif_kegiatan WHERE id = ?
            `, [kegiatanId]);
            
            if (kegiatan.length === 0) {
                return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
            }
            
            let hasAccess = false;
            if (roleInfo.isAdmin) {
                hasAccess = true;
                console.log('👑 Admin access granted');
            } else if (roleInfo.isRegularUser && kegiatan[0].user_id === userId) {
                hasAccess = true;
                console.log('✅ Access granted: User is the kegiatan creator');
            }
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Tidak memiliki akses untuk upload dokumentasi. Hanya pembuat kegiatan yang dapat upload.' 
                });
            }
            
            let keteranganList = [];
            if (keterangan_list) {
                try {
                    keteranganList = JSON.parse(keterangan_list);
                    console.log('📝 Parsed keterangan list:', keteranganList);
                } catch (e) {
                    console.error('Error parsing keterangan_list:', e);
                    keteranganList = [];
                }
            }
            
            const savedFiles = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    // PERBAIKAN: Simpan path dengan format yang benar (tanpa /api)
                    const filePath = `/uploads/lpd-dokumentasi/${file.filename}`;
                    let keterangan = '';
                    
                    if (keteranganList[i]) {
                        if (typeof keteranganList[i] === 'object') {
                            keterangan = keteranganList[i].keterangan || '';
                        } else {
                            keterangan = keteranganList[i];
                        }
                    }
                    
                    const [result] = await db.query(`
                        INSERT INTO lpd_dokumentasi 
                        (kegiatan_id, file_path, file_name, file_type, file_size, keterangan)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [kegiatanId, filePath, file.originalname, file.mimetype, file.size, keterangan]);
                    
                    savedFiles.push({
                        id: result.insertId,
                        file_path: filePath, // Kembalikan path yang benar
                        file_name: file.originalname,
                        file_type: file.mimetype,
                        file_size: file.size,
                        keterangan: keterangan
                    });
                    
                    console.log(`✅ File saved: ${file.originalname} -> ${filePath}`);
                }
            }
            
            console.log(`✅ Uploaded ${savedFiles.length} dokumentasi for kegiatan_id: ${kegiatanId}`);
            
            res.status(200).json({ 
                success: true, 
                message: 'Dokumentasi berhasil diupload',
                data: savedFiles
            });
            
        } catch (error) {
            console.error('❌ Error uploading dokumentasi:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// ============ DELETE dokumentasi LPD ============
router.delete('/dokumentasi/:dokumentasiId', keycloakAuth, async (req, res) => {
    try {
        const { dokumentasiId } = req.params;
        const user = req.user;
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        
        console.log('🗑️ Deleting dokumentasi:', {
            dokumentasiId,
            userId,
            roleInfo
        });
        
        const [dokumentasi] = await db.query(`
            SELECT d.*, k.user_id 
            FROM lpd_dokumentasi d
            JOIN nominatif_kegiatan k ON d.kegiatan_id = k.id
            WHERE d.id = ?
        `, [dokumentasiId]);
        
        if (dokumentasi.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumentasi tidak ditemukan' });
        }
        
        let hasAccess = false;
        if (roleInfo.isAdmin) {
            hasAccess = true;
            console.log('👑 Admin access granted');
        } else if (roleInfo.isRegularUser && dokumentasi[0].user_id === userId) {
            hasAccess = true;
            console.log('✅ Access granted: User is the kegiatan creator');
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses untuk menghapus dokumentasi' 
            });
        }
        
        const filePath = path.join(__dirname, '../public', dokumentasi[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
        }
        
        await db.query('DELETE FROM lpd_dokumentasi WHERE id = ?', [dokumentasiId]);
        
        console.log(`✅ Dokumentasi ${dokumentasiId} deleted`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Dokumentasi berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting dokumentasi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ DOWNLOAD file dokumentasi LPD ============
router.get('/dokumentasi/:dokumentasiId/download', keycloakAuth, async (req, res) => {
    try {
        const { dokumentasiId } = req.params;
        
        const [dokumentasi] = await db.query(`
            SELECT file_path, file_name FROM lpd_dokumentasi WHERE id = ?
        `, [dokumentasiId]);
        
        if (dokumentasi.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumentasi tidak ditemukan' });
        }
        
        const filePath = path.join(__dirname, '../public', dokumentasi[0].file_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File fisik tidak ditemukan' });
        }
        
        console.log(`📥 Downloading file: ${dokumentasi[0].file_name}`);
        res.download(filePath, dokumentasi[0].file_name);
        
    } catch (error) {
        console.error('❌ Error downloading dokumentasi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;