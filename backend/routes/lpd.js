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

// Fungsi untuk membersihkan path file
function cleanFilePath(filePath) {
    if (!filePath) return null;
    let clean = filePath.replace(/^\/api/, '').replace(/^\/public/, '');
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
        isKabagTu: normalizedRoles.some(r => r.includes('kabag_tu')),
        isKatim: normalizedRoles.some(r => r.includes('katim')),
        isRegularUser: !normalizedRoles.includes('admin') && 
                       !normalizedRoles.includes('ppk') && 
                       !normalizedRoles.includes('bendahara') && 
                       !normalizedRoles.some(r => r.includes('katim')) &&
                       !normalizedRoles.some(r => r.includes('kabag_tu')) &&
                       !normalizedRoles.some(r => r.includes('kabalai'))
    };
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

// Ambil TTD dari profile berdasarkan user_id
async function getTtdByUserId(userId) {
    try {
        if (!userId) return null;
        const [profile] = await db.query(`
            SELECT ttd_path FROM user_profiles WHERE user_id = ?
        `, [userId]);
        return profile.length > 0 ? profile[0].ttd_path : null;
    } catch (error) {
        console.error('Error getting TTD by user_id:', error);
        return null;
    }
}

// Ambil TTD dari user (gabungan dari user_id dan NIP)
async function getTtdByUser(user) {
    try {
        const userId = getUserId(user);
        const userNip = user?.nip || '';
        
        let ttdPath = await getTtdByUserId(userId);
        if (ttdPath) {
            console.log(`✅ TTD ditemukan untuk user_id: ${userId}`);
            return ttdPath;
        }
        
        ttdPath = await getTtdByNip(userNip);
        if (ttdPath) {
            console.log(`✅ TTD ditemukan untuk NIP: ${userNip}`);
            return ttdPath;
        }
        
        console.log(`⚠️ TTD tidak ditemukan untuk user: ${getUsername(user)}`);
        return null;
    } catch (error) {
        console.error('Error getting TTD by user:', error);
        return null;
    }
}

// Helper untuk cek apakah user adalah pegawai dalam kegiatan
async function isUserInKegiatan(kegiatanId, userId, userNip) {
    try {
        const cleanNip = normalizeNip(userNip);
        console.log(`🔍 Checking if user ${userId} (NIP: ${cleanNip}) is in kegiatan ${kegiatanId}`);
        
        const [result] = await db.query(`
            SELECT p.id 
            FROM nominatif_pegawai p
            JOIN nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE p.kegiatan_id = ? 
            AND (
                REPLACE(p.nip, ' ', '') = ? 
                OR p.user_id = ?
            )
            LIMIT 1
        `, [kegiatanId, cleanNip, userId]);
        
        const isPegawai = result.length > 0;
        console.log(`✅ User is in kegiatan: ${isPegawai}`);
        return isPegawai;
    } catch (error) {
        console.error('Error checking user in kegiatan:', error);
        return false;
    }
}

router.get('/daftar-kegiatan', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const cleanUserNip = normalizeNip(userNip);
        
        console.log('👤 User info for daftar-kegiatan:', {
            userId: userId,
            userNip: userNip,
            cleanUserNip: cleanUserNip,
            isAdmin: roleInfo.isAdmin,
            isKatim: roleInfo.isKatim,
            isKabagTu: roleInfo.isKabagTu,
            isKabalai: roleInfo.isKabalai,
            roles: user.extractedRoles || user.role || []
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
                n.bendahara_nip,
                COALESCE(l.lpd_status, 'draft') as lpd_status,
                l.katim_id,
                l.katim_nama,
                l.katim_nip,
                l.katim_tgl_ttd,
                l.katim_ttd_path,
                l.kabalai_id,
                l.kabalai_nama,
                l.kabalai_nip,
                l.kabalai_tgl_ttd,
                l.kabalai_ttd_path,
                l.submitted_at
            FROM nominatif_kegiatan n
            LEFT JOIN lpd_status l ON n.id = l.kegiatan_id
            WHERE n.status = 'selesai'
        `;
        
        const params = [];
        
        // ============ PERBAIKAN: Filter berdasarkan role ============
        if (roleInfo.isAdmin) {
            // Admin melihat semua kegiatan
            console.log('👑 Admin mode: melihat semua kegiatan');
            query += ` ORDER BY n.created_at DESC`;
        } 
        else if (roleInfo.isKatim || roleInfo.isKabagTu) {
            // ============ PERBAIKAN UNTUK KATIM/KABAG TU ============
            // Katim/Kabag TU bisa melihat:
            // 1. Kegiatan yang menunggu persetujuan mereka (status 'menunggu_katim')
            // 2. Kegiatan yang sudah mereka setujui (status 'menunggu_kabalai' atau 'selesai')
            // 3. Kegiatan yang sudah ditolak (status 'ditolak_katim')
            query += ` AND (
                COALESCE(l.lpd_status, 'draft') = 'menunggu_katim'
                OR (l.lpd_status = 'menunggu_kabalai' AND l.katim_id = ?)
                OR (l.lpd_status = 'selesai' AND l.katim_id = ?)
                OR (l.lpd_status = 'ditolak_katim' AND l.katim_id = ?)
            )`;
            params.push(userId, userId, userId);
            query += ` ORDER BY 
                CASE 
                    WHEN COALESCE(l.lpd_status, 'draft') = 'menunggu_katim' THEN 1
                    WHEN COALESCE(l.lpd_status, 'draft') = 'ditolak_katim' THEN 2
                    WHEN COALESCE(l.lpd_status, 'draft') = 'menunggu_kabalai' THEN 3
                    WHEN COALESCE(l.lpd_status, 'draft') = 'selesai' THEN 4
                    ELSE 5
                END,
                n.created_at DESC`;
            console.log('📋 Katim/Kabag TU mode: melihat kegiatan menunggu persetujuan, sudah disetujui, dan ditolak');
        } 
        else if (roleInfo.isKabalai) {
            // Kabalai bisa melihat:
            // 1. Kegiatan yang menunggu persetujuan mereka (status 'menunggu_kabalai')
            // 2. Kegiatan yang sudah disetujui mereka (status 'selesai') - untuk riwayat
            // 3. Kegiatan di mana mereka terdaftar sebagai pegawai (untuk mengisi LPD)
            query += ` AND (
                COALESCE(l.lpd_status, 'draft') = 'menunggu_kabalai'
                OR (l.lpd_status = 'selesai' AND l.kabalai_id = ?)
                OR EXISTS (
                    SELECT 1 FROM nominatif_pegawai p 
                    WHERE p.kegiatan_id = n.id 
                    AND REPLACE(p.nip, ' ', '') = ?
                )
            )`;
            params.push(userId, cleanUserNip);
            query += ` ORDER BY 
                CASE 
                    WHEN COALESCE(l.lpd_status, 'draft') = 'menunggu_kabalai' THEN 1
                    WHEN COALESCE(l.lpd_status, 'draft') = 'selesai' THEN 2
                    ELSE 3
                END,
                n.created_at DESC`;
            console.log('👔 Kabalai mode: melihat kegiatan menunggu persetujuan, riwayat, DAN kegiatan sebagai peserta');
        } 
        else {
            // User biasa (pegawai/creator): hanya melihat kegiatan yang:
            // 1. Mereka buat (creator)
            // 2. ATAU NIP mereka terdaftar sebagai pegawai
            query += ` AND (
                n.user_id = ? 
                OR EXISTS (
                    SELECT 1 FROM nominatif_pegawai p 
                    WHERE p.kegiatan_id = n.id 
                    AND REPLACE(p.nip, ' ', '') = ?
                )
            )`;
            params.push(userId, cleanUserNip);
            query += ` ORDER BY n.created_at DESC`;
            console.log('👤 Regular user mode: melihat kegiatan yang dibuat atau NIP terdaftar sebagai pegawai');
        }
        
        console.log('📝 Final Query:', query);
        console.log('📝 Params:', params);
        
        const [kegiatanList] = await db.query(query, params);
        console.log(`📊 Found ${kegiatanList.length} kegiatan from query`);
        
        // Debug status distribution
        const statusCount = {};
        kegiatanList.forEach(k => {
            statusCount[k.lpd_status] = (statusCount[k.lpd_status] || 0) + 1;
        });
        console.log('📊 Status distribution:', statusCount);
        
        const result = [];
        
        for (const kegiatan of kegiatanList) {
            // Cek apakah user terdaftar sebagai pegawai dalam kegiatan ini
            const [pegawaiCheck] = await db.query(`
                SELECT p.id FROM nominatif_pegawai p 
                WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
            `, [kegiatan.id, cleanUserNip]);
            
            const isPegawaiInKegiatan = pegawaiCheck.length > 0;
            
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
            
            const isSubmitted = kegiatan.lpd_status && kegiatan.lpd_status !== 'draft' && kegiatan.lpd_status !== null;
            
            // Tentukan apakah user bisa mengedit LPD (hanya jika status draft dan user adalah pegawai atau creator)
            const canEditLpd = (kegiatan.lpd_status === 'draft' || kegiatan.lpd_status === null) && 
                               (kegiatan.user_id === userId || isPegawaiInKegiatan);
            
            // Cek apakah user adalah Katim/Kabag TU yang sudah approve kegiatan ini
            const isApprovedByMe = (roleInfo.isKatim || roleInfo.isKabagTu) && 
                                   kegiatan.lpd_status === 'menunggu_kabalai' && 
                                   kegiatan.katim_id === userId;
            
            // Cek apakah user adalah Katim/Kabag TU yang menolak kegiatan ini
            const isRejectedByMe = (roleInfo.isKatim || roleInfo.isKabagTu) && 
                                   kegiatan.lpd_status === 'ditolak_katim' && 
                                   kegiatan.katim_id === userId;
            
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
                is_pegawai_in_kegiatan: isPegawaiInKegiatan,
                is_submitted: isSubmitted,
                lpd_status: kegiatan.lpd_status || 'draft',
                can_edit_lpd: canEditLpd,
                // Untuk Katim/Kabag TU
                is_approved_by_me: isApprovedByMe,
                is_rejected_by_me: isRejectedByMe,
                katim_nama: kegiatan.katim_nama,
                katim_tgl_ttd: kegiatan.katim_tgl_ttd,
                katim_ttd_path: kegiatan.katim_ttd_path,
                kabalai_nama: kegiatan.kabalai_nama,
                kabalai_tgl_ttd: kegiatan.kabalai_tgl_ttd,
                kabalai_ttd_path: kegiatan.kabalai_ttd_path,
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
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const cleanUserNip = normalizeNip(userNip);
        
        console.log('👤 User info for kegiatan detail:', {
            kegiatanId,
            userId,
            userNip,
            cleanUserNip,
            isAdmin: roleInfo.isAdmin,
            isKatim: roleInfo.isKatim,
            isKabagTu: roleInfo.isKabagTu,
            isKabalai: roleInfo.isKabalai
        });
        
        // 🔥 Cek akses
        let hasAccess = false;
        
        if (roleInfo.isAdmin) {
            hasAccess = true;
            console.log('👑 Admin access granted');
        } else if (roleInfo.isKatim || roleInfo.isKabagTu) {
            hasAccess = true;
            console.log('📋 Katim/Kabag TU access granted');
        } else if (roleInfo.isKabalai) {
            hasAccess = true;
            console.log('👔 Kabalai access granted');
        } else {
            const [creatorCheck] = await db.query(
                'SELECT id FROM nominatif_kegiatan WHERE id = ? AND user_id = ?',
                [kegiatanId, userId]
            );
            const isCreator = creatorCheck.length > 0;
            
            const [pegawaiCheck] = await db.query(`
                SELECT p.id FROM nominatif_pegawai p 
                WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
            `, [kegiatanId, cleanUserNip]);
            const isPegawaiInKegiatan = pegawaiCheck.length > 0;
            
            hasAccess = isCreator || isPegawaiInKegiatan;
            console.log(`🔍 Regular user access: isCreator=${isCreator}, isPegawai=${isPegawaiInKegiatan}, hasAccess=${hasAccess}`);
        }
        
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke LPD ini.'
            });
        }
        
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
                n.bendahara_nip,
                n.user_id as kegiatan_creator_id,
                l.lpd_status,
                l.katim_id,
                l.katim_nama,
                l.katim_nip,
                l.katim_tgl_ttd,
                l.katim_ttd_path,
                l.kabalai_id,
                l.kabalai_nama,
                l.kabalai_nip,
                l.kabalai_tgl_ttd,
                l.kabalai_ttd_path,
                l.catatan_katim,
                l.catatan_kabalai,
                l.submitted_at
            FROM nominatif_kegiatan n
            LEFT JOIN lpd_status l ON n.id = l.kegiatan_id
            WHERE n.id = ?
        `, [kegiatanId]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
        }
        
        const kegiatanData = kegiatan[0];
        
        const [pegawaiCheck] = await db.query(`
            SELECT p.id FROM nominatif_pegawai p 
            WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
        `, [kegiatanId, cleanUserNip]);
        
        const isPegawaiInKegiatan = pegawaiCheck.length > 0;
        const lpdStatus = kegiatanData.lpd_status || 'draft';
        
        // 🔥 PERBAIKAN: canEdit hanya jika status 'draft' atau null, dan user adalah creator/pegawai
        const canEdit = (lpdStatus === 'draft' || lpdStatus === null) && 
                        (roleInfo.isAdmin || kegiatanData.kegiatan_creator_id === userId || isPegawaiInKegiatan);
        
        // 🔥 PERBAIKAN: canApproveKatim hanya untuk role yang sesuai
        const canApproveKatim = (roleInfo.isKatim || roleInfo.isKabagTu) && 
                                 lpdStatus === 'menunggu_katim' && 
                                 kegiatanData.katim_id === userId;
        
        const canApproveKabalai = roleInfo.isKabalai && lpdStatus === 'menunggu_kabalai';
        
        console.log(`✅ Access: canEdit=${canEdit}, canApproveKatim=${canApproveKatim}, canApproveKabalai=${canApproveKabalai}, lpdStatus=${lpdStatus}`);
        
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
        
        const formatTanggal = (date) => {
            if (!date) return null;
            const d = new Date(date);
            const tgl = d.getDate().toString().padStart(2, '0');
            const bln = (d.getMonth() + 1).toString().padStart(2, '0');
            const thn = d.getFullYear();
            return `${tgl}-${bln}-${thn}`;
        };
        
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
        
        const responseData = {
            kegiatan_id: parseInt(kegiatanId),
            nama_kegiatan: kegiatanData.nama_kegiatan,
            dasar_pelaksanaan: {
                nomor_st: kegiatanData.no_st || '',
                tanggal_st: formatTanggal(kegiatanData.tgl_st)
            },
            petugas_pelaksana: pegawaiList.map(p => ({
                id: p.id,
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
                file_path: doc.file_path,
                file_name: doc.file_name,
                file_type: doc.file_type,
                file_size: doc.file_size,
                keterangan: doc.keterangan,
                created_at: doc.created_at
            })),
            status: kegiatanData.status_2 || 'draft',
            lpd_status: lpdStatus,
            can_edit: canEdit,
            can_approve_katim: canApproveKatim,
            can_approve_kabalai: canApproveKabalai,
            ppk_nama: kegiatanData.ppk_nama,
            ppk_nip: kegiatanData.ppk_nip,
            bendahara_nama: kegiatanData.bendahara_nama,
            bendahara_nip: kegiatanData.bendahara_nip,
            katim: {
                id: kegiatanData.katim_id,
                nama: kegiatanData.katim_nama,
                nip: kegiatanData.katim_nip,
                tgl_ttd: kegiatanData.katim_tgl_ttd,
                ttd_path: kegiatanData.katim_ttd_path,
                catatan: kegiatanData.catatan_katim
            },
            kabalai: {
                id: kegiatanData.kabalai_id,
                nama: kegiatanData.kabalai_nama,
                nip: kegiatanData.kabalai_nip,
                tgl_ttd: kegiatanData.kabalai_tgl_ttd,
                ttd_path: kegiatanData.kabalai_ttd_path,
                catatan: kegiatanData.catatan_kabalai
            },
            submitted_at: kegiatanData.submitted_at
        };
        
        console.log(`✅ Sending LPD data for kegiatan ${kegiatanId}, lpd_status: ${lpdStatus}, can_edit: ${canEdit}`);
        
        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error('❌ Error in kegiatan detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ POST create/update rincian kegiatan LPD ============
// routes/lpd.js - Perbaiki endpoint /rincian dan /dokumentasi/:kegiatanId

// ============ POST create/update rincian kegiatan LPD ============
router.post('/rincian', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const { kegiatan_id, rincian_list } = req.body;
        
        console.log('📝 Saving rincian kegiatan with data:', {
            kegiatan_id,
            rincian_count: rincian_list?.length || 0
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
        
        // 🔥 PERBAIKAN: Cek status LPD - boleh edit jika draft ATAU ditolak_katim ATAU ditolak_kabalai
        const [statusCheck] = await db.query(`
            SELECT lpd_status FROM lpd_status WHERE kegiatan_id = ?
        `, [kegiatan_id]);
        
        const currentStatus = statusCheck.length > 0 ? statusCheck[0].lpd_status : 'draft';
        
        // Status yang boleh diedit: draft, ditolak_katim, ditolak_kabalai
        const allowedStatuses = ['draft', null, 'ditolak_katim', 'ditolak_kabalai'];
        
        if (!allowedStatuses.includes(currentStatus)) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat mengedit rincian karena LPD sudah dalam status "${currentStatus}". Hanya dapat diedit saat status Draft atau Ditolak.`
            });
        }
        
        // Cek akses user
        let hasAccess = false;
        if (roleInfo.isAdmin) {
            hasAccess = true;
        } else if (kegiatan[0].user_id === userId) {
            hasAccess = true;
        } else {
            const cleanUserNip = normalizeNip(userNip);
            const [pegawaiCheck] = await db.query(`
                SELECT p.id FROM nominatif_pegawai p 
                WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
            `, [kegiatan_id, cleanUserNip]);
            if (pegawaiCheck.length > 0) {
                hasAccess = true;
            }
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses untuk mengubah rincian kegiatan ini.' 
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
// routes/lpd.js - Perbaiki endpoint upload dokumentasi

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
            const userNip = user?.nip || '';
            const roleInfo = getUserRoleInfo(user);
            
            console.log('📝 Uploading dokumentasi for kegiatan:', {
                kegiatanId,
                filesCount: req.files?.length || 0,
                userId,
                userNip,
                roleInfo
            });
            
            const [kegiatan] = await db.query(`
                SELECT user_id FROM nominatif_kegiatan WHERE id = ?
            `, [kegiatanId]);
            
            if (kegiatan.length === 0) {
                return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
            }
            
            // 🔥 Cek status LPD terlebih dahulu
            const [statusCheck] = await db.query(`
                SELECT lpd_status FROM lpd_status WHERE kegiatan_id = ?
            `, [kegiatanId]);
            
            const currentStatus = statusCheck.length > 0 ? statusCheck[0].lpd_status : 'draft';
            
            // 🔥 Status yang boleh upload dokumentasi: draft, ditolak_katim, ditolak_kabalai
            const allowedStatuses = ['draft', null, 'ditolak_katim', 'ditolak_kabalai'];
            
            if (!allowedStatuses.includes(currentStatus)) {
                return res.status(403).json({
                    success: false,
                    message: `Tidak dapat upload dokumentasi karena LPD sudah dalam status "${currentStatus}". Hanya dapat diupload saat status Draft atau Ditolak.`
                });
            }
            
            // 🔥 PERBAIKAN: Cek akses - siapa saja yang bisa upload
            let hasAccess = false;
            
            // Admin bisa upload
            if (roleInfo.isAdmin) {
                hasAccess = true;
                console.log('👑 Admin access granted for upload');
            }
            // Creator kegiatan bisa upload
            else if (kegiatan[0].user_id === userId) {
                hasAccess = true;
                console.log('✅ Access granted: User is kegiatan creator');
            }
            // Pegawai yang terdaftar dalam kegiatan bisa upload (jika status draft atau ditolak)
            else {
                const cleanUserNip = normalizeNip(userNip);
                const [pegawaiCheck] = await db.query(`
                    SELECT p.id FROM nominatif_pegawai p 
                    WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
                `, [kegiatanId, cleanUserNip]);
                
                if (pegawaiCheck.length > 0) {
                    hasAccess = true;
                    console.log('✅ Access granted: User is a pegawai in this kegiatan');
                }
            }
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Tidak memiliki akses untuk upload dokumentasi. Hanya pegawai yang terdaftar, pembuat kegiatan, atau admin yang dapat upload.' 
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
                        file_path: filePath,
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
// routes/lpd.js - Perbaiki endpoint DELETE dokumentasi

// ============ DELETE dokumentasi LPD ============
router.delete('/dokumentasi/:dokumentasiId', keycloakAuth, async (req, res) => {
    try {
        const { dokumentasiId } = req.params;
        const user = req.user;
        const userId = getUserId(user);
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        
        console.log('🗑️ Deleting dokumentasi:', {
            dokumentasiId,
            userId,
            userNip,
            roleInfo
        });
        
        const [dokumentasi] = await db.query(`
            SELECT d.*, k.user_id as kegiatan_creator_id, k.id as kegiatan_id
            FROM lpd_dokumentasi d
            JOIN nominatif_kegiatan k ON d.kegiatan_id = k.id
            WHERE d.id = ?
        `, [dokumentasiId]);
        
        if (dokumentasi.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumentasi tidak ditemukan' });
        }
        
        // 🔥 Cek status LPD terlebih dahulu
        const [statusCheck] = await db.query(`
            SELECT lpd_status FROM lpd_status WHERE kegiatan_id = ?
        `, [dokumentasi[0].kegiatan_id]);
        
        const currentStatus = statusCheck.length > 0 ? statusCheck[0].lpd_status : 'draft';
        
        // 🔥 PERBAIKAN: Status yang boleh menghapus dokumentasi: draft, ditolak_katim, ditolak_kabalai
        const allowedStatuses = ['draft', null, 'ditolak_katim', 'ditolak_kabalai'];
        
        if (!allowedStatuses.includes(currentStatus)) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat menghapus dokumentasi karena LPD sudah dalam status "${currentStatus}". Hanya dapat dihapus saat status Draft atau Ditolak.`
            });
        }
        
        // 🔥 PERBAIKAN: Cek akses - siapa saja yang bisa menghapus
        let hasAccess = false;
        
        // Admin bisa menghapus semua
        if (roleInfo.isAdmin) {
            hasAccess = true;
            console.log('👑 Admin access granted for delete');
        } 
        // Creator kegiatan bisa menghapus
        else if (dokumentasi[0].kegiatan_creator_id === userId) {
            hasAccess = true;
            console.log('✅ Access granted: User is kegiatan creator');
        }
        // Pegawai yang terdaftar dalam kegiatan bisa menghapus (jika status draft atau ditolak)
        else {
            const cleanUserNip = normalizeNip(userNip);
            const [pegawaiCheck] = await db.query(`
                SELECT p.id FROM nominatif_pegawai p 
                WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
            `, [dokumentasi[0].kegiatan_id, cleanUserNip]);
            
            if (pegawaiCheck.length > 0) {
                hasAccess = true;
                console.log('✅ Access granted: User is a pegawai in this kegiatan');
            }
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses untuk menghapus dokumentasi. Hanya pegawai yang terdaftar, pembuat kegiatan, atau admin yang dapat menghapus.' 
            });
        }
        
        // Hapus file fisik
        const filePath = path.join(__dirname, '../public', dokumentasi[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
        }
        
        // Hapus record dari database
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
        
        res.download(filePath, dokumentasi[0].file_name);
        
    } catch (error) {
        console.error('❌ Error downloading dokumentasi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ KIRIM LPD ke Katim/Kabag TU ============
router.post('/kirim-ke-katim/:kegiatanId', keycloakAuth, async (req, res) => {
    const { kegiatanId } = req.params;
    const user = req.user;
    const userId = getUserId(user);
    const userNip = user?.nip || '';
    const roleInfo = getUserRoleInfo(user);
    const { katim_id, katim_nama, katim_nip, catatan } = req.body;
    
    console.log('📤 Mengirim LPD ke Katim:', { kegiatanId, userId, katim_nama });
    
    if (!kegiatanId || isNaN(kegiatanId)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }
    
    if (!katim_id || !katim_nama) {
        return res.status(400).json({ success: false, message: 'Katim/Kabag TU harus dipilih' });
    }
    
    let connection;
    try {
        const cleanUserNip = normalizeNip(userNip);
        
        // ============ PERBAIKAN: Cek apakah user adalah pegawai ATAU creator kegiatan ============
        const [pegawaiCheck] = await db.query(`
            SELECT p.id FROM nominatif_pegawai p 
            WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
        `, [kegiatanId, cleanUserNip]);
        
        const [creatorCheck] = await db.query(`
            SELECT id FROM nominatif_kegiatan 
            WHERE id = ? AND user_id = ?
        `, [kegiatanId, userId]);
        
        const isPegawai = pegawaiCheck.length > 0;
        const isCreator = creatorCheck.length > 0;
        const isAdmin = roleInfo.isAdmin;
        
        // Yang boleh mengirim LPD: pegawai yang terdaftar, creator kegiatan, atau admin
        const canSendLpd = isPegawai || isCreator || isAdmin;
        
        console.log(`🔍 Hak akses kirim LPD: isPegawai=${isPegawai}, isCreator=${isCreator}, isAdmin=${isAdmin}, canSend=${canSendLpd}`);
        
        if (!canSendLpd) {
            return res.status(403).json({
                success: false,
                message: 'Hanya pegawai yang terdaftar dalam kegiatan, pembuat kegiatan, atau admin yang dapat mengirim LPD'
            });
        }
        
        // Cek kelengkapan LPD
        const [rincianCheck] = await db.query(
            'SELECT COUNT(*) as count FROM lpd_rincian_kegiatan WHERE kegiatan_id = ?',
            [kegiatanId]
        );
        
        const [dokumentasiCheck] = await db.query(
            'SELECT COUNT(*) as count FROM lpd_dokumentasi WHERE kegiatan_id = ?',
            [kegiatanId]
        );
        
        const hasRincian = (rincianCheck[0]?.count || 0) > 0;
        const hasDokumentasi = (dokumentasiCheck[0]?.count || 0) > 0;
        
        if (!hasRincian || !hasDokumentasi) {
            return res.status(400).json({
                success: false,
                message: 'LPD belum lengkap. Harus mengisi rincian kegiatan dan upload dokumentasi terlebih dahulu.'
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [existingStatus] = await connection.query(
            'SELECT id FROM lpd_status WHERE kegiatan_id = ?',
            [kegiatanId]
        );
        
        if (existingStatus.length > 0) {
            await connection.query(`
                UPDATE lpd_status 
                SET 
                    lpd_status = 'menunggu_katim',
                    katim_id = ?,
                    katim_nama = ?,
                    katim_nip = ?,
                    catatan_katim = ?,
                    submitted_at = NOW(),
                    updated_at = NOW()
                WHERE kegiatan_id = ?
            `, [katim_id, katim_nama, katim_nip, catatan || null, kegiatanId]);
        } else {
            await connection.query(`
                INSERT INTO lpd_status 
                (kegiatan_id, lpd_status, katim_id, katim_nama, katim_nip, catatan_katim, submitted_at, created_at, updated_at)
                VALUES (?, 'menunggu_katim', ?, ?, ?, ?, NOW(), NOW(), NOW())
            `, [kegiatanId, katim_id, katim_nama, katim_nip, catatan || null]);
        }
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ LPD kegiatan ${kegiatanId} dikirim ke Katim: ${katim_nama} oleh ${getUsername(user)}`);
        
        res.status(200).json({
            success: true,
            message: `LPD berhasil dikirim ke ${katim_nama} untuk persetujuan`
        });
        
    } catch (error) {
        console.error('❌ Error mengirim LPD ke Katim:', error);
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ KATIM/KABAG TU APPROVE LPD ============
router.post('/approve-katim/:kegiatanId', keycloakAuth, async (req, res) => {
    const { kegiatanId } = req.params;
    const user = req.user;
    const userId = getUserId(user);
    const username = getUsername(user);
    const roleInfo = getUserRoleInfo(user);
    const { catatan } = req.body;
    
    console.log('✅ Katim/Kabag TU approve LPD:', { kegiatanId, userId, username });
    
    if (!kegiatanId || isNaN(kegiatanId)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }
    
    if (!roleInfo.isKatim && !roleInfo.isKabagTu && !roleInfo.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Katim/Kabag TU yang dapat menyetujui LPD'
        });
    }
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [statusCheck] = await connection.query(`
            SELECT lpd_status, katim_id FROM lpd_status WHERE kegiatan_id = ?
        `, [kegiatanId]);
        
        if (statusCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'LPD tidak ditemukan'
            });
        }
        
        if (statusCheck[0].lpd_status !== 'menunggu_katim') {
            return res.status(400).json({
                success: false,
                message: `LPD sudah dalam status ${statusCheck[0].lpd_status}, tidak dapat disetujui`
            });
        }
        
        const ttdPath = await getTtdByUser(user);
        console.log(`📝 TTD untuk ${username}: ${ttdPath || 'Tidak ditemukan'}`);
        
        await connection.query(`
            UPDATE lpd_status 
            SET 
                lpd_status = 'menunggu_kabalai',
                katim_tgl_ttd = NOW(),
                katim_ttd_path = ?,
                catatan_katim = COALESCE(?, catatan_katim),
                updated_at = NOW()
            WHERE kegiatan_id = ?
        `, [ttdPath || null, catatan || null, kegiatanId]);
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ LPD kegiatan ${kegiatanId} disetujui oleh ${username}`);
        
        res.status(200).json({
            success: true,
            message: 'LPD berhasil disetujui oleh Kabag TU/Katim, selanjutnya menunggu persetujuan Kabalai'
        });
        
    } catch (error) {
        console.error('❌ Error approve Katim:', error);
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ KATIM/KABAG TU REJECT LPD ============
router.post('/reject-katim/:kegiatanId', keycloakAuth, async (req, res) => {
    const { kegiatanId } = req.params;
    const user = req.user;
    const userId = getUserId(user);
    const username = getUsername(user);
    const roleInfo = getUserRoleInfo(user);
    const { catatan } = req.body;
    
    console.log('❌ Katim/Kabag TU reject LPD:', { kegiatanId, userId, username });
    
    if (!kegiatanId || isNaN(kegiatanId)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }
    
    if (!catatan || catatan.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Catatan alasan penolakan wajib diisi' });
    }
    
    if (!roleInfo.isKatim && !roleInfo.isKabagTu && !roleInfo.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Katim/Kabag TU yang dapat menolak LPD'
        });
    }
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [statusCheck] = await connection.query(`
            SELECT lpd_status FROM lpd_status WHERE kegiatan_id = ?
        `, [kegiatanId]);
        
        if (statusCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'LPD tidak ditemukan'
            });
        }
        
        if (statusCheck[0].lpd_status !== 'menunggu_katim') {
            return res.status(400).json({
                success: false,
                message: `LPD sudah dalam status ${statusCheck[0].lpd_status}, tidak dapat ditolak`
            });
        }
        
        await connection.query(`
            UPDATE lpd_status 
            SET 
                lpd_status = 'ditolak_katim',
                catatan_katim = ?,
                updated_at = NOW()
            WHERE kegiatan_id = ?
        `, [catatan, kegiatanId]);
        
        await connection.commit();
        connection.release();
        
        console.log(`❌ LPD kegiatan ${kegiatanId} ditolak oleh ${username}`);
        
        res.status(200).json({
            success: true,
            message: 'LPD ditolak oleh Katim/Kabag TU'
        });
        
    } catch (error) {
        console.error('❌ Error reject Katim:', error);
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ KABALAI APPROVE LPD ============
// ============ KABALAI APPROVE LPD ============
router.post('/approve-kabalai/:kegiatanId', keycloakAuth, async (req, res) => {
    const { kegiatanId } = req.params;
    const user = req.user;
    const userId = getUserId(user);
    const username = getUsername(user);
    const roleInfo = getUserRoleInfo(user);
    const { catatan, nama_kabalai, nip_kabalai } = req.body;
    
    console.log('✅ Kabalai approve LPD:', { 
        kegiatanId, 
        userId, 
        username,
        nama_kabalai_from_body: nama_kabalai,
        nip_kabalai_from_body: nip_kabalai
    });
    
    if (!kegiatanId || isNaN(kegiatanId)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }
    
    if (!roleInfo.isKabalai && !roleInfo.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat menyetujui LPD'
        });
    }
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [statusCheck] = await connection.query(`
            SELECT lpd_status FROM lpd_status WHERE kegiatan_id = ?
        `, [kegiatanId]);
        
        if (statusCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'LPD tidak ditemukan'
            });
        }
        
        if (statusCheck[0].lpd_status !== 'menunggu_kabalai') {
            return res.status(400).json({
                success: false,
                message: `LPD sudah dalam status ${statusCheck[0].lpd_status}, tidak dapat disetujui`
            });
        }
        
        // 🔥 PERBAIKAN: Gunakan nama_kabalai dari request body jika ada, jika tidak coba ambil dari user_profiles
        let kabalaiNama = nama_kabalai || username;
        let kabalaiNip = nip_kabalai || user?.nip || '';
        
        // Jika nama_kabalai tidak dikirim dari frontend, coba ambil dari user_profiles
        if (!nama_kabalai) {
            try {
                // 🔥 PERBAIKAN: Gunakan kolom yang benar di tabel user_profiles
                // Coba beberapa kemungkinan nama kolom: name, full_name, nama_lengkap, display_name
                const [userProfile] = await connection.query(`
                    SELECT 
                        COALESCE(name, full_name, nama_lengkap, display_name, username) as nama,
                        nip 
                    FROM user_profiles 
                    WHERE user_id = ? OR REPLACE(nip, ' ', '') = ?
                    LIMIT 1
                `, [userId, kabalaiNip]);
                
                if (userProfile.length > 0 && userProfile[0].nama) {
                    kabalaiNama = userProfile[0].nama;
                    kabalaiNip = userProfile[0].nip || kabalaiNip;
                    console.log(`📝 Data Kabalai dari user_profiles: nama=${kabalaiNama}, nip=${kabalaiNip}`);
                } else {
                    console.log(`⚠️ User profile tidak ditemukan untuk user_id: ${userId}, menggunakan username: ${username}`);
                }
            } catch (profileError) {
                console.error('Error fetching user profile:', profileError);
                // Jika query profile gagal, lanjutkan dengan data dari request
            }
        } else {
            console.log(`📝 Menggunakan nama Kabalai dari request: ${kabalaiNama}`);
        }
        
        const ttdPath = await getTtdByUser(user);
        console.log(`📝 TTD untuk Kabalai ${kabalaiNama}: ${ttdPath || 'Tidak ditemukan'}`);
        
        await connection.query(`
            UPDATE lpd_status 
            SET 
                lpd_status = 'selesai',
                kabalai_id = ?,
                kabalai_nama = ?,
                kabalai_nip = ?,
                kabalai_tgl_ttd = NOW(),
                kabalai_ttd_path = ?,
                catatan_kabalai = COALESCE(?, catatan_kabalai),
                updated_at = NOW()
            WHERE kegiatan_id = ?
        `, [userId, kabalaiNama, kabalaiNip, ttdPath || null, catatan || null, kegiatanId]);
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ LPD kegiatan ${kegiatanId} disetujui oleh Kabalai ${kabalaiNama} (NIP: ${kabalaiNip})`);
        
        res.status(200).json({
            success: true,
            message: 'LPD berhasil disetujui oleh Kabalai dan selesai'
        });
        
    } catch (error) {
        console.error('❌ Error approve Kabalai:', error);
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ KABALAI REJECT LPD ============
router.post('/reject-kabalai/:kegiatanId', keycloakAuth, async (req, res) => {
    const { kegiatanId } = req.params;
    const user = req.user;
    const userId = getUserId(user);
    const username = getUsername(user);
    const roleInfo = getUserRoleInfo(user);
    const { catatan, nama_kabalai } = req.body;
    
    console.log('❌ Kabalai reject LPD:', { kegiatanId, userId, username });
    
    if (!kegiatanId || isNaN(kegiatanId)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }
    
    if (!catatan || catatan.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Catatan alasan penolakan wajib diisi' });
    }
    
    if (!roleInfo.isKabalai && !roleInfo.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat menolak LPD'
        });
    }
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [statusCheck] = await connection.query(`
            SELECT lpd_status FROM lpd_status WHERE kegiatan_id = ?
        `, [kegiatanId]);
        
        if (statusCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'LPD tidak ditemukan'
            });
        }
        
        if (statusCheck[0].lpd_status !== 'menunggu_kabalai') {
            return res.status(400).json({
                success: false,
                message: `LPD sudah dalam status ${statusCheck[0].lpd_status}, tidak dapat ditolak`
            });
        }
        
        await connection.query(`
            UPDATE lpd_status 
            SET 
                lpd_status = 'ditolak_kabalai',
                catatan_kabalai = ?,
                updated_at = NOW()
            WHERE kegiatan_id = ?
        `, [catatan, kegiatanId]);
        
        await connection.commit();
        connection.release();
        
        console.log(`❌ LPD kegiatan ${kegiatanId} ditolak oleh ${username}`);
        
        res.status(200).json({
            success: true,
            message: 'LPD ditolak oleh Kabalai'
        });
        
    } catch (error) {
        console.error('❌ Error reject Kabalai:', error);
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        res.status(500).json({ success: false, message: error.message });
    }
});


// routes/lpd.js - Tambahkan endpoint ini di bagian akhir file (sebelum module.exports)

// ============ GET LPD untuk PRINT (data lengkap untuk dicetak) ============
// routes/lpd.js - Perbaiki query untuk mengambil data kabalai dari lpd_status

// routes/lpd.js - Perbaiki query untuk /print/:kegiatanId

router.get('/print/:kegiatanId', keycloakAuth, async (req, res) => {
    try {
        const { kegiatanId } = req.params;
        const user = req.user;
        const userId = getUserId(user);
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const cleanUserNip = normalizeNip(userNip);
        
        console.log(`🖨️ Print LPD request for kegiatan: ${kegiatanId}`);
        console.log(`👤 User: ${cleanUserNip}, Roles:`, roleInfo);
        
        // ============ CEK AKSES ============
        let hasAccess = false;
        
        if (roleInfo.isAdmin) {
            hasAccess = true;
            console.log('👑 Admin access granted');
        }
        else if (roleInfo.isPPK) {
            const [ppkCheck] = await db.query(`
                SELECT id FROM nominatif_kegiatan 
                WHERE id = ? AND (ppk_id = ? OR REPLACE(ppk_nip, ' ', '') = ?)
            `, [kegiatanId, userId, cleanUserNip]);
            hasAccess = ppkCheck.length > 0;
            console.log(`📋 PPK access: ${hasAccess}`);
        }
        else if (roleInfo.isBendahara) {
            const [bendaharaCheck] = await db.query(`
                SELECT id FROM nominatif_kegiatan 
                WHERE id = ? AND (bendahara_id = ? OR REPLACE(bendahara_nip, ' ', '') = ?)
            `, [kegiatanId, userId, cleanUserNip]);
            hasAccess = bendaharaCheck.length > 0;
            console.log(`💰 Bendahara access: ${hasAccess}`);
        }
        else {
            const [creatorCheck] = await db.query(`
                SELECT id FROM nominatif_kegiatan WHERE id = ? AND user_id = ?
            `, [kegiatanId, userId]);
            const isCreator = creatorCheck.length > 0;
            
            const [pesertaCheck] = await db.query(`
                SELECT p.id FROM nominatif_pegawai p 
                WHERE p.kegiatan_id = ? AND REPLACE(p.nip, ' ', '') = ?
            `, [kegiatanId, cleanUserNip]);
            const isPeserta = pesertaCheck.length > 0;
            
            hasAccess = isCreator || isPeserta;
            console.log(`👤 Regular user access: isCreator=${isCreator}, isPeserta=${isPeserta}`);
        }
        
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke LPD ini.'
            });
        }
        
        // ============ AMBIL DATA DARI NOMINATIF_KEGIATAN ============
        const [kegiatan] = await db.query(`
            SELECT 
                n.id,
                n.no_st,
                n.tgl_st,
                n.kegiatan as nama_kegiatan,
                n.mak,
                n.kota_kab_kecamatan as tempat_pelaksanaan,
                n.rencana_tanggal_pelaksanaan as tgl_mulai,
                n.rencana_tanggal_pelaksanaan_akhir as tgl_selesai,
                n.ppk_nama,
                n.ppk_nip,
                n.bendahara_nama,
                n.bendahara_nip,
                n.created_at,
                COALESCE(l.lpd_status, 'draft') as lpd_status,
                l.katim_nama,
                l.katim_nip,
                l.katim_ttd_path,
                l.kabalai_nama,
                l.kabalai_nip,
                l.kabalai_ttd_path,
                l.submitted_at,
                l.created_at as lpd_created_at
            FROM nominatif_kegiatan n
            LEFT JOIN lpd_status l ON n.id = l.kegiatan_id
            WHERE n.id = ?
        `, [kegiatanId]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
        }
        
        const kegiatanData = kegiatan[0];
        
        console.log('📊 Data dari nominatif_kegiatan:', {
            id: kegiatanData.id,
            tgl_mulai: kegiatanData.tgl_mulai,
            tgl_selesai: kegiatanData.tgl_selesai,
            tempat_pelaksanaan: kegiatanData.tempat_pelaksanaan,
            no_st: kegiatanData.no_st,
            tgl_st: kegiatanData.tgl_st,
            mak: kegiatanData.mak,
            nama_kegiatan: kegiatanData.nama_kegiatan
        });
        
        // Ambil petugas pelaksana
        const [pegawaiList] = await db.query(`
            SELECT 
                p.id,
                p.nama,
                p.nip,
                p.pangkat as pangkat_golongan,
                p.jabatan
            FROM nominatif_pegawai p
            WHERE p.kegiatan_id = ?
            ORDER BY p.id ASC
        `, [kegiatanId]);
        
        // Ambil rincian kegiatan
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
        
        // Ambil dokumentasi
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
        
        // Format tanggal
        const formatTanggal = (date) => {
            if (!date) return null;
            const d = new Date(date);
            if (isNaN(d.getTime())) return null;
            const tgl = d.getDate().toString().padStart(2, '0');
            const bln = (d.getMonth() + 1).toString().padStart(2, '0');
            const thn = d.getFullYear();
            return `${tgl}-${bln}-${thn}`;
        };
        
        // Hitung lama perjalanan
        let lamaPerjalanan = 1;
        if (kegiatanData.tgl_mulai && kegiatanData.tgl_selesai) {
            const start = new Date(kegiatanData.tgl_mulai);
            const end = new Date(kegiatanData.tgl_selesai);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                lamaPerjalanan = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            }
        }
        
        const responseData = {
            kegiatan_id: parseInt(kegiatanId),
            nama_kegiatan: kegiatanData.nama_kegiatan,
            no_st: kegiatanData.no_st,
            tgl_st: kegiatanData.tgl_st,
            mak: kegiatanData.mak,
            tgl_mulai: kegiatanData.tgl_mulai,
            tgl_selesai: kegiatanData.tgl_selesai,
            tempat_pelaksanaan: kegiatanData.tempat_pelaksanaan || '-',
            lama_perjalanan: `${lamaPerjalanan} (${lamaPerjalanan} hari)`,
            petugas_pelaksana: pegawaiList.map(p => ({
                nama: p.nama,
                nip: p.nip,
                pangkat_golongan: p.pangkat_golongan || '-',
                jabatan: p.jabatan || '-'
            })),
            rincian_kegiatan: rincianKegiatan.map(rk => ({
                tanggal: rk.tanggal,
                kegiatan: rk.kegiatan
            })),
            dokumentasi: dokumentasi.map(doc => ({
                file_path: doc.file_path,
                file_name: doc.file_name,
                file_type: doc.file_type,
                keterangan: doc.keterangan
            })),
            ttd_kabalai_path: kegiatanData.kabalai_ttd_path,
            ttd_kabalai: kegiatanData.kabalai_nama,
            kabalai_nama: kegiatanData.kabalai_nama,
            kabalai_nip: kegiatanData.kabalai_nip,
            ttd_katim_path: kegiatanData.katim_ttd_path,
            ttd_katim: kegiatanData.katim_nama,
            ppk_nama: kegiatanData.ppk_nama,
            ppk_nip: kegiatanData.ppk_nip,
            bendahara_nama: kegiatanData.bendahara_nama,
            bendahara_nip: kegiatanData.bendahara_nip,
            lpd_status: kegiatanData.lpd_status,
            created_at: kegiatanData.lpd_created_at || kegiatanData.created_at
        };
        
        console.log('📊 Response data yang akan dikirim:', {
            tgl_mulai: responseData.tgl_mulai,
            tgl_selesai: responseData.tgl_selesai,
            tempat_pelaksanaan: responseData.tempat_pelaksanaan,
            lama_perjalanan: responseData.lama_perjalanan
        });
        
        res.status(200).json({ success: true, data: responseData });
        
    } catch (error) {
        console.error('❌ Error in print LPD:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;