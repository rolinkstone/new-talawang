// routes/kwitansi.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { keycloakAuth, getUsername, getUserId } = require('../middleware/keycloakAuth');

// Setup upload directory untuk SPTJM Transport
const sptjmUploadDir = path.join(__dirname, '../public/uploads/sptjm-transport');
if (!fs.existsSync(sptjmUploadDir)) {
    fs.mkdirSync(sptjmUploadDir, { recursive: true });
    console.log('✅ SPTJM Transport upload directory created:', sptjmUploadDir);
}

// Konfigurasi multer untuk upload file SPTJM Transport
const sptjmStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, sptjmUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'sptjm-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

const uploadSptjm = multer({
    storage: sptjmStorage,
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

// Setup upload directory untuk SPTJM Penginapan
const sptjmPenginapanUploadDir = path.join(__dirname, '../public/uploads/sptjm-penginapan');
if (!fs.existsSync(sptjmPenginapanUploadDir)) {
    fs.mkdirSync(sptjmPenginapanUploadDir, { recursive: true });
    console.log('✅ SPTJM Penginapan upload directory created:', sptjmPenginapanUploadDir);
}

// Konfigurasi multer untuk upload file SPTJM Penginapan
const sptjmPenginapanStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, sptjmPenginapanUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'sptjm-penginapan-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

const uploadSptjmPenginapan = multer({
    storage: sptjmPenginapanStorage,
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

router.get('/need-kwitansi', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log('👤 User info for need-kwitansi:', {
            nip: normalizedUserNip,
            userId: userId,
            isAdmin: roleInfo.isAdmin,
            isPPK: roleInfo.isPPK,
            isBendahara: roleInfo.isBendahara
        });
        
        let kegiatanQuery = '';
        let queryParams = [];
        
        if (roleInfo.isAdmin) {
            kegiatanQuery = `
                SELECT DISTINCT 
                    n.id, n.kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st, n.tgl_st,
                    n.status, 
                    n.ppk_nama, n.ppk_id, n.ppk_nip,
                    n.bendahara_nama, n.bendahara_nip, n.bendahara_id,
                    n.diketahui_oleh, n.diketahui_oleh_id, n.created_at,
                    n.status_2, n.catatan_status_2,
                    n.user_id,
                    n.rencana_tanggal_pelaksanaan,
                    n.rencana_tanggal_pelaksanaan_akhir,
                    COALESCE(l.lpd_status, 'belum_ada') as lpd_status
                FROM nominatif_kegiatan n
                JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
                LEFT JOIN lpd_status l ON n.id = l.kegiatan_id
                ORDER BY n.created_at DESC
            `;
            queryParams = [];
            console.log('👑 Admin mode');
        } 
        else {
            // ============ PERBAIKAN UNTUK USER BIASA ============
            kegiatanQuery = `
                SELECT DISTINCT 
                    n.id, n.kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st, n.tgl_st,
                    n.status, 
                    n.ppk_nama, n.ppk_id, n.ppk_nip,
                    n.bendahara_nama, n.bendahara_nip, n.bendahara_id,
                    n.diketahui_oleh, n.diketahui_oleh_id, n.created_at,
                    n.status_2, n.catatan_status_2,
                    n.user_id,
                    n.rencana_tanggal_pelaksanaan,
                    n.rencana_tanggal_pelaksanaan_akhir,
                    COALESCE(l.lpd_status, 'belum_ada') as lpd_status
                FROM nominatif_kegiatan n
                JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
                LEFT JOIN lpd_status l ON n.id = l.kegiatan_id
                WHERE n.status = 'selesai'
                AND UPPER(n.status_2) = 'SELESAI'
                AND (
                    -- KONDISI 1: User adalah CREATOR
                    n.user_id = ?
                    OR
                    -- KONDISI 2: User adalah PESERTA PERJADIN (perlu LPD selesai)
                    (
                        l.lpd_status = 'selesai'
                        AND REPLACE(p.nip, ' ', '') = ?
                    )
                    OR
                    -- KONDISI 3: User adalah PEJABAT PPK
                    (
                        l.lpd_status = 'selesai'
                        AND (n.ppk_id = ? OR REPLACE(n.ppk_nip, ' ', '') = ?)
                    )
                    OR
                    -- KONDISI 4: User adalah PEJABAT BENDAHARA
                    -- Bisa melihat kegiatan yang sudah LPD selesai ATAU yang status_kwitansi sudah di-approve PPK
                    (
                        n.bendahara_id = ? OR REPLACE(n.bendahara_nip, ' ', '') = ?
                    )
                )
                ORDER BY n.created_at DESC
            `;
            queryParams = [userId, normalizedUserNip, userId, normalizedUserNip, userId, normalizedUserNip];
            console.log('👤 User mode (Bendahara bisa melihat kegiatan yang terdaftar)');
        }
        
        console.log('📝 Query:', kegiatanQuery);
        console.log('📝 Params:', queryParams);
        
        const [kegiatanList] = await db.query(kegiatanQuery, queryParams);
        console.log(`📊 Found ${kegiatanList.length} kegiatan from query`);
        
        const result = [];

        for (const kegiatan of kegiatanList) {
            const pegawaiQuery = `
                SELECT 
                    p.id, p.nama, p.nip, p.jabatan, p.total_biaya,
                    k.id as kwitansi_id, k.no_lpd, k.tgl_kwitansi, k.tgl_spd,
                    COALESCE(k.status_pegawai, 'belum') as status_pegawai,
                    COALESCE(k.status_ppk, 'belum') as status_ppk,
                    COALESCE(k.status_bendahara, 'belum') as status_bendahara,
                    k.tgl_ttd_pegawai, k.tgl_ttd_ppk, k.tgl_ttd_bendahara,
                    k.catatan_pegawai, k.catatan_ppk, k.catatan_bendahara,
                    CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status
                FROM nominatif_pegawai p
                LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
                WHERE p.kegiatan_id = ?
                ORDER BY p.id ASC
            `;
            
            const [pegawaiList] = await db.query(pegawaiQuery, [kegiatan.id]);
            
            if (pegawaiList.length === 0) continue;
            
            // Ambil data biaya untuk setiap pegawai
            for (const pegawai of pegawaiList) {
                const [biayaList] = await db.query(`
                    SELECT id as biaya_id 
                    FROM nominatif_biaya_kegiatan 
                    WHERE pegawai_id = ?
                `, [pegawai.id]);
                
                let transportasi = [], uangHarian = [], penginapan = [];
                
                if (biayaList.length > 0) {
                    const biayaIds = biayaList.map(b => b.biaya_id);
                    
                    [transportasi] = await db.query(`
                        SELECT id, trans as jenis, harga, total, biaya_id
                        FROM nominatif_transportasi WHERE biaya_id IN (?)
                    `, [biayaIds]);
                    
                    [uangHarian] = await db.query(`
                        SELECT id, jenis, qty, harga, total, biaya_id
                        FROM nominatif_uang_harian_items WHERE biaya_id IN (?)
                    `, [biayaIds]);
                    
                    for (const uh of uangHarian) {
                        uh.rencana_tanggal_pelaksanaan = kegiatan.rencana_tanggal_pelaksanaan || null;
                        uh.rencana_tanggal_pelaksanaan_akhir = kegiatan.rencana_tanggal_pelaksanaan_akhir || null;
                    }
                    
                    [penginapan] = await db.query(`
                        SELECT id, jenis, qty, harga, total, biaya_id
                        FROM nominatif_penginapan_items WHERE biaya_id IN (?)
                    `, [biayaIds]);
                }
                
                pegawai.total_biaya_detail = 
                    transportasi.reduce((s, t) => s + (Number(t.total) || 0), 0) +
                    uangHarian.reduce((s, u) => s + (Number(u.total) || 0), 0) +
                    penginapan.reduce((s, p) => s + (Number(p.total) || 0), 0);
                
                pegawai.biaya_list = [{
                    transportasi: transportasi.map(t => ({
                        jenis: t.jenis,
                        harga_satuan: t.harga,
                        total: t.total
                    })),
                    uang_harian: uangHarian.map(u => ({
                        jenis: u.jenis,
                        qty: u.qty,
                        harga_satuan: u.harga,
                        total: u.total,
                        rencana_tanggal_pelaksanaan: u.rencana_tanggal_pelaksanaan,
                        rencana_tanggal_pelaksanaan_akhir: u.rencana_tanggal_pelaksanaan_akhir
                    })),
                    penginapan: penginapan.map(p => ({
                        jenis: p.jenis,
                        qty: p.qty,
                        harga_satuan: p.harga,
                        total: p.total
                    }))
                }];
            }
            
            const isLpdSelesai = kegiatan.lpd_status === 'selesai';
            
            // ============ CEK PERAN USER ============
            const currentUserPegawai = pegawaiList.find(p => 
                normalizeNip(p.nip) === normalizedUserNip
            );
            const isPesertaPerjadin = !!currentUserPegawai;
            const isCreator = kegiatan.user_id === userId;
            const isPejabatPPK = kegiatan.ppk_id === userId || 
                                 (kegiatan.ppk_nip && normalizeNip(kegiatan.ppk_nip) === normalizedUserNip);
            const isPejabatBendahara = kegiatan.bendahara_id === userId || 
                                       (kegiatan.bendahara_nip && normalizeNip(kegiatan.bendahara_nip) === normalizedUserNip);
            
            console.log(`🔍 PERAN USER dalam kegiatan ${kegiatan.id}:`, {
                isCreator,
                isPesertaPerjadin,
                isPejabatPPK,
                isPejabatBendahara,
                isLpdSelesai
            });
            
            // ============ FILTER PEGAWAI YANG DITAMPILKAN ============
            let filteredPegawaiList = [];
            let canInputKwitansi = false;
            let canApprove = false;
            let approveRole = null;
            let approveMessage = '';
            
            // KASUS 1: User adalah CREATOR - bisa lihat SEMUA pegawai
            if (isCreator) {
                filteredPegawaiList = pegawaiList;
                if (isLpdSelesai) {
                    canInputKwitansi = filteredPegawaiList.some(p => p.kwitansi_status === 'belum');
                }
                console.log(`👑 Creator mode: ${filteredPegawaiList.length} pegawai, canInput=${canInputKwitansi}`);
            }
            // KASUS 2: User adalah PESERTA PERJADIN - hanya lihat dirinya sendiri
            else if (isPesertaPerjadin && isLpdSelesai) {
                filteredPegawaiList = pegawaiList.filter(p => 
                    normalizeNip(p.nip) === normalizedUserNip
                );
                
                if (filteredPegawaiList.length > 0) {
                    const userData = filteredPegawaiList[0];
                    canInputKwitansi = userData.kwitansi_status === 'belum';
                    
                    if (userData.status_pegawai === 'belum' && userData.kwitansi_status === 'sudah') {
                        canApprove = true;
                        approveRole = 'pegawai';
                        approveMessage = 'Menunggu persetujuan Anda sebagai Pegawai';
                    }
                }
                console.log(`👤 Peserta mode: ${filteredPegawaiList.length} pegawai`);
            }
            // KASUS 3: User adalah PEJABAT PPK - lihat pegawai yang butuh approve PPK
            else if (isPejabatPPK && isLpdSelesai) {
                filteredPegawaiList = pegawaiList.filter(p => 
                    p.status_pegawai === 'sudah' && p.status_ppk === 'belum'
                );
                if (filteredPegawaiList.length > 0) {
                    canApprove = true;
                    approveRole = 'ppk';
                    approveMessage = 'Menunggu persetujuan Anda sebagai PPK Kegiatan';
                }
                console.log(`📋 PPK mode: ${filteredPegawaiList.length} pegawai butuh approve PPK`);
            }
            // KASUS 4: User adalah PEJABAT BENDAHARA
            else if (isPejabatBendahara) {
                // ============ PERBAIKAN UNTUK BENDAHARA ============
                // Bendahara bisa melihat:
                // 1. Pegawai yang sudah di-approve PPK dan menunggu approve Bendahara (status_bendahara = 'belum')
                // 2. Pegawai yang sudah di-approve Bendahara (status_bendahara = 'sudah') - untuk riwayat
                // 3. Pegawai yang sudah input kwitansi (kwitansi_status = 'sudah') - untuk dilihat
                
                const waitingBendahara = pegawaiList.filter(p => 
                    p.status_pegawai === 'sudah' && 
                    p.status_ppk === 'sudah' && 
                    p.status_bendahara === 'belum' &&
                    p.kwitansi_status === 'sudah'
                );
                
                const alreadyApproved = pegawaiList.filter(p => 
                    p.status_bendahara === 'sudah' &&
                    p.kwitansi_status === 'sudah'
                );
                
                // Tampilkan kedua jenis: yang menunggu dan yang sudah
                filteredPegawaiList = [...waitingBendahara, ...alreadyApproved];
                
                if (waitingBendahara.length > 0) {
                    canApprove = true;
                    approveRole = 'bendahara';
                    approveMessage = 'Menunggu persetujuan Anda sebagai Bendahara';
                }
                
                console.log(`💰 Bendahara mode: ${waitingBendahara.length} menunggu, ${alreadyApproved.length} sudah approve`);
            }
            
            // Jika tidak ada pegawai yang terfilter, cek apakah user adalah creator (tampilkan semua) atau peserta (tampilkan dirinya)
            if (filteredPegawaiList.length === 0) {
                if (isCreator) {
                    filteredPegawaiList = pegawaiList;
                    console.log(`👑 Creator fallback: menampilkan semua ${pegawaiList.length} pegawai`);
                } else if (currentUserPegawai && !isPejabatBendahara) {
                    filteredPegawaiList = [currentUserPegawai];
                    console.log(`👤 Fallback: menampilkan user sendiri`);
                } else if (isPejabatBendahara && pegawaiList.length > 0) {
                    // Untuk Bendahara, tampilkan semua pegawai yang sudah input kwitansi
                    filteredPegawaiList = pegawaiList.filter(p => p.kwitansi_status === 'sudah');
                    console.log(`💰 Bendahara fallback: menampilkan ${filteredPegawaiList.length} pegawai yang sudah input kwitansi`);
                }
            }
            
            if (filteredPegawaiList.length === 0) {
                console.log(`⚠️ Tidak ada pegawai yang ditampilkan untuk kegiatan ${kegiatan.id}`);
                continue;
            }
            
            // ============ HITUNG STATUS APPROVAL KESELURUHAN ============
            const semuaPegawaiApprove = pegawaiList.every(p => p.status_pegawai === 'sudah');
            const semuaPpkApprove = pegawaiList.every(p => p.status_ppk === 'sudah');
            const semuaBendaharaApprove = pegawaiList.every(p => p.status_bendahara === 'sudah');
            
            result.push({
                ...kegiatan,
                total_pegawai: pegawaiList.length,
                sudah_input: pegawaiList.filter(p => p.kwitansi_status === 'sudah').length,
                pegawai: filteredPegawaiList,
                lpd_status: kegiatan.lpd_status,
                is_lpd_selesai: isLpdSelesai,
                can_input_kwitansi: canInputKwitansi,
                can_approve: canApprove,
                approve_role: approveRole,
                approve_message: approveMessage,
                is_creator: isCreator,
                is_peserta_perjadin: isPesertaPerjadin,
                is_pejabat_ppk: isPejabatPPK,
                is_pejabat_bendahara: isPejabatBendahara,
                semua_pegawai_approve: semuaPegawaiApprove,
                semua_ppk_approve: semuaPpkApprove,
                semua_bendahara_approve: semuaBendaharaApprove,
                pegawai_id: currentUserPegawai?.id || null,
                user_kwitansi_status: currentUserPegawai ? {
                    hasKwitansi: currentUserPegawai.kwitansi_status === 'sudah',
                    status_pegawai: currentUserPegawai.status_pegawai,
                    status_ppk: currentUserPegawai.status_ppk,
                    status_bendahara: currentUserPegawai.status_bendahara,
                    kwitansi_id: currentUserPegawai.kwitansi_id,
                    no_lpd: currentUserPegawai.no_lpd,
                    tgl_kwitansi: currentUserPegawai.tgl_kwitansi,
                    tgl_spd: currentUserPegawai.tgl_spd
                } : null
            });
        }
        
        console.log(`✅ Sending ${result.length} kegiatan to frontend`);
        console.log(`📊 can_input_kwitansi=true: ${result.filter(r => r.can_input_kwitansi).length}`);
        console.log(`📊 can_approve=true: ${result.filter(r => r.can_approve).length}`);
        console.log(`📊 is_pejabat_ppk=true: ${result.filter(r => r.is_pejabat_ppk).length}`);
        console.log(`📊 is_pejabat_bendahara=true: ${result.filter(r => r.is_pejabat_bendahara).length}`);
        
        res.status(200).json({ success: true, data: result });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ GET kegiatan untuk riwayat PPK (sudah disetujui) ============
router.get('/need-kwitansi-ppk-history', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log('👤 User info for need-kwitansi-ppk-history:', {
            nip: normalizedUserNip,
            userId: userId,
            isAdmin: roleInfo.isAdmin,
            isPPK: roleInfo.isPPK,
            isBendahara: roleInfo.isBendahara
        });
        
        if (!roleInfo.isPPK && !roleInfo.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya PPK atau Admin yang dapat mengakses riwayat ini' 
            });
        }
        
        let kegiatanQuery = '';
        let queryParams = [];
        
        if (roleInfo.isAdmin) {
            kegiatanQuery = `
                SELECT DISTINCT 
                    n.id, n.kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st, n.tgl_st,
                    n.status, 
                    n.ppk_nama, n.ppk_id, n.ppk_nip,
                    n.bendahara_nama, n.bendahara_nip, n.bendahara_id,
                    n.diketahui_oleh, n.diketahui_oleh_id, n.created_at,
                    n.status_2, n.catatan_status_2,
                    n.rencana_tanggal_pelaksanaan,
                    n.rencana_tanggal_pelaksanaan_akhir
                FROM nominatif_kegiatan n
                JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
                JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND n.id = k.kegiatan_id
                WHERE n.status = 'selesai'
                AND k.status_ppk = 'sudah'
                AND UPPER(n.status_2) = 'SELESAI'
                ORDER BY n.created_at DESC
            `;
            queryParams = [];
            console.log('👑 Admin mode: melihat semua riwayat PPK');
        } else {
            kegiatanQuery = `
                SELECT DISTINCT 
                    n.id, n.kegiatan, n.mak, n.kota_kab_kecamatan, n.no_st, n.tgl_st,
                    n.status, 
                    n.ppk_nama, n.ppk_id, n.ppk_nip,
                    n.bendahara_nama, n.bendahara_nip, n.bendahara_id,
                    n.diketahui_oleh, n.diketahui_oleh_id, n.created_at,
                    n.status_2, n.catatan_status_2,
                    n.rencana_tanggal_pelaksanaan,
                    n.rencana_tanggal_pelaksanaan_akhir
                FROM nominatif_kegiatan n
                JOIN nominatif_pegawai p ON n.id = p.kegiatan_id
                JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND n.id = k.kegiatan_id
                WHERE n.status = 'selesai'
                AND (n.ppk_id = ? OR n.ppk_nip = ? OR n.ppk_nama = ?)
                AND k.status_ppk = 'sudah'
                AND UPPER(n.status_2) = 'SELESAI'
                ORDER BY n.created_at DESC
            `;
            queryParams = [user?.id || '', normalizedUserNip, getUsername(user)];
            console.log('📋 PPK mode: melihat riwayat PPK (sudah disetujui)');
        }
        
        console.log('📝 Query:', kegiatanQuery);
        console.log('📝 Params:', queryParams);
        
        const [kegiatanList] = await db.query(kegiatanQuery, queryParams);
        console.log(`📊 Found ${kegiatanList.length} kegiatan from query`);
        
        const result = [];

        for (const kegiatan of kegiatanList) {
            let pegawaiQuery = `
                SELECT 
                    p.id, p.nama, p.nip, p.jabatan, p.total_biaya,
                    k.id as kwitansi_id, k.no_lpd, k.tgl_kwitansi, k.tgl_spd,
                    COALESCE(k.status_pegawai, 'belum') as status_pegawai,
                    COALESCE(k.status_ppk, 'belum') as status_ppk,
                    COALESCE(k.status_bendahara, 'belum') as status_bendahara,
                    k.tgl_ttd_pegawai, k.tgl_ttd_ppk, k.tgl_ttd_bendahara,
                    k.catatan_pegawai, k.catatan_ppk, k.catatan_bendahara,
                    CASE WHEN k.id IS NOT NULL THEN 'sudah' ELSE 'belum' END as kwitansi_status
                FROM nominatif_pegawai p
                LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
                WHERE p.kegiatan_id = ?
            `;
            
            const pegawaiParams = [kegiatan.id];
            
            pegawaiQuery += ` ORDER BY p.id ASC`;
            
            console.log(`📝 Pegawai Query for kegiatan ${kegiatan.id}:`, pegawaiQuery);
            console.log(`📝 Pegawai Params:`, pegawaiParams);
            
            const [pegawaiList] = await db.query(pegawaiQuery, pegawaiParams);
            
            if (pegawaiList.length === 0) continue;
            
            for (const pegawai of pegawaiList) {
                const [biayaList] = await db.query(`
                    SELECT id as biaya_id 
                    FROM nominatif_biaya_kegiatan 
                    WHERE pegawai_id = ?
                `, [pegawai.id]);
                
                let transportasi = [];
                let uangHarian = [];
                let penginapan = [];
                
                if (biayaList.length > 0) {
                    const biayaIds = biayaList.map(b => b.biaya_id);
                    
                    [transportasi] = await db.query(`
                        SELECT id, trans as jenis, harga, total, biaya_id
                        FROM nominatif_transportasi
                        WHERE biaya_id IN (?)
                    `, [biayaIds]);
                    
                    [uangHarian] = await db.query(`
                        SELECT id, jenis, qty, harga, total, biaya_id
                        FROM nominatif_uang_harian_items
                        WHERE biaya_id IN (?)
                    `, [biayaIds]);
                    
                    [penginapan] = await db.query(`
                        SELECT id, jenis, qty, harga, total, biaya_id
                        FROM nominatif_penginapan_items
                        WHERE biaya_id IN (?)
                    `, [biayaIds]);
                }
                
                const totalTransport = transportasi.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
                const totalUangHarian = uangHarian.reduce((sum, u) => sum + (Number(u.total) || 0), 0);
                const totalPenginapan = penginapan.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
                const totalBiaya = totalTransport + totalUangHarian + totalPenginapan;
                
                pegawai.biaya_list = [{
                    transportasi: transportasi.map(t => ({
                        jenis: t.jenis,
                        harga_satuan: t.harga,
                        total: t.total
                    })),
                    uang_harian: uangHarian.map(u => ({
                        jenis: u.jenis,
                        qty: u.qty,
                        harga_satuan: u.harga,
                        total: u.total
                    })),
                    penginapan: penginapan.map(p => ({
                        jenis: p.jenis,
                        qty: p.qty,
                        harga_satuan: p.harga,
                        total: p.total
                    }))
                }];
                
                pegawai.total_biaya_detail = totalBiaya;
            }
            
            let semuaPegawaiApprove = true;
            let semuaPpkApprove = true;
            let semuaBendaharaApprove = true;
            
            pegawaiList.forEach(p => {
                if (p.kwitansi_status === 'belum') semuaPegawaiApprove = false;
                if (p.status_pegawai !== 'sudah') semuaPegawaiApprove = false;
                if (p.status_ppk !== 'sudah') semuaPpkApprove = false;
                if (p.status_bendahara !== 'sudah') semuaBendaharaApprove = false;
            });
            
            result.push({
                ...kegiatan,
                total_pegawai: pegawaiList.length,
                sudah_input: pegawaiList.filter(p => p.kwitansi_status === 'sudah').length,
                semua_pegawai_approve: semuaPegawaiApprove,
                semua_ppk_approve: semuaPpkApprove,
                semua_bendahara_approve: semuaBendaharaApprove,
                pegawai: pegawaiList,
                tgl_st_formatted: kegiatan.tgl_st ? new Date(kegiatan.tgl_st).toLocaleDateString('id-ID') : '-'
            });
        }
        
        console.log(`✅ Sending ${result.length} kegiatan to frontend`);
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error in need-kwitansi-ppk-history:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ POST create new kwitansi ============
router.post('/', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userNip = user?.nip || '';
        const userId = getUserId(user);
        const roleInfo = getUserRoleInfo(user);
        const { kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, tgl_spd } = req.body;
        
        console.log('📝 Creating kwitansi with data:', {
            kegiatan_id,
            pegawai_id,
            no_lpd,
            tgl_kwitansi,
            tgl_spd,
            userId,
            userNip: normalizeNip(userNip),
            roleInfo
        });
        
        if (!kegiatan_id || !pegawai_id || !no_lpd?.trim()) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }
        
        // Ambil data pegawai dan kegiatan untuk validasi
        const [accessCheck] = await db.query(`
            SELECT 
                p.id as pegawai_id,
                p.nip as pegawai_nip,
                n.user_id as kegiatan_creator_id
            FROM nominatif_pegawai p
            JOIN nominatif_kegiatan n ON p.kegiatan_id = n.id
            WHERE p.id = ? AND p.kegiatan_id = ?
        `, [pegawai_id, kegiatan_id]);
        
        if (accessCheck.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data pegawai atau kegiatan tidak ditemukan' 
            });
        }
        
        let hasAccess = false;
        const pegawaiNip = normalizeNip(accessCheck[0].pegawai_nip);
        const kegiatanCreatorId = accessCheck[0].kegiatan_creator_id;
        const normalizedUserNip = normalizeNip(userNip);
        
        console.log('🔍 Access check:', {
            pegawaiNip,
            normalizedUserNip,
            kegiatanCreatorId,
            userId,
            isAdmin: roleInfo.isAdmin,
            isPPK: roleInfo.isPPK,
            isBendahara: roleInfo.isBendahara
        });
        
        // ============ PERBAIKAN: Hapus blok yang memblokir PPK/Bendahara ============
        // 1. Admin: bisa input semua
        // 2. User adalah pegawai yang bersangkutan: bisa input (TERMASUK PPK dan Bendahara)
        // 3. User adalah creator kegiatan: bisa input
        
        if (roleInfo.isAdmin) {
            hasAccess = true;
            console.log('👑 Admin access granted');
        } 
        else if (pegawaiNip === normalizedUserNip) {
            // INI YANG PENTING: PPK dan Bendahara akan masuk ke sini
            // karena mereka adalah pegawai yang bersangkutan
            hasAccess = true;
            console.log('✅ Access granted: User is the pegawai (termasuk PPK/Bendahara)');
        } 
        else if (kegiatanCreatorId === userId) {
            hasAccess = true;
            console.log('✅ Access granted: User is the kegiatan creator');
        }
        else {
            console.log('❌ Access denied: User is not authorized');
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses untuk menginput kwitansi ini. Hanya pegawai yang bersangkutan atau pembuat kegiatan yang dapat menginput kwitansi.' 
            });
        }
        
        // Cek apakah sudah ada kwitansi
        const [existingCheck] = await db.query(`
            SELECT id, status_pegawai, status_ppk, status_bendahara 
            FROM kwitansi_perjadin 
            WHERE kegiatan_id = ? AND pegawai_id = ?
        `, [kegiatan_id, pegawai_id]);
        
        if (existingCheck.length > 0) {
            const existing = existingCheck[0];
            // Jika kwitansi sudah ada dan statusnya ditolak, izinkan edit/upload ulang
            if (existing.status_pegawai === 'ditolak' || existing.status_ppk === 'ditolak' || existing.status_bendahara === 'ditolak') {
                // Update kwitansi yang ditolak
                const updateQuery = `
                    UPDATE kwitansi_perjadin 
                    SET no_lpd = ?,
                        tgl_kwitansi = ?,
                        tgl_spd = ?,
                        status_pegawai = 'belum',
                        status_ppk = 'belum',
                        status_bendahara = 'belum',
                        catatan_pegawai = NULL,
                        catatan_ppk = NULL,
                        catatan_bendahara = NULL,
                        updated_at = NOW()
                    WHERE kegiatan_id = ? AND pegawai_id = ?
                `;
                
                await db.query(updateQuery, [no_lpd, tgl_kwitansi, tgl_spd || tgl_kwitansi, kegiatan_id, pegawai_id]);
                
                console.log(`✅ Kwitansi updated (re-upload after rejection) for pegawai_id: ${pegawai_id}`);
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Kwitansi berhasil diperbarui setelah ditolak',
                    is_reupload: true
                });
            }
            
            return res.status(400).json({ 
                success: false, 
                message: 'Kwitansi sudah ada untuk pegawai ini. Silakan edit jika perlu.' 
            });
        }
        
        // Insert kwitansi baru
        const query = `
            INSERT INTO kwitansi_perjadin 
            (kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, tgl_spd, status_input,
             status_pegawai, status_ppk, status_bendahara)
            VALUES (?, ?, ?, ?, ?, 'sudah', 'belum', 'belum', 'belum')
        `;
        
        const [result] = await db.query(query, [
            kegiatan_id, pegawai_id, no_lpd, tgl_kwitansi, tgl_spd || tgl_kwitansi
        ]);
        
        console.log(`✅ Kwitansi saved with ID: ${result.insertId}`);
        
        res.status(201).json({ 
            success: true, 
            data: { id: result.insertId },
            message: 'Kwitansi berhasil disimpan'
        });
        
    } catch (error) {
        console.error('❌ Error creating kwitansi:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ POST untuk approval berjenjang ============
router.post('/approve/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        const user = req.user;
        const userNip = normalizeNip(user?.nip || '');
        const userId = getUserId(user);
        const { status, catatan } = req.body;
        
        // Ambil data kwitansi lengkap dengan informasi PPK dari nominatif
        const [kwitansi] = await db.query(`
            SELECT 
                k.*, 
                p.nip as pegawai_nip, 
                p.nama as pegawai_nama,
                n.ppk_nip, 
                n.ppk_id,
                n.ppk_nama,
                n.bendahara_nip,
                n.bendahara_id,
                n.bendahara_nama,
                n.status as kegiatan_status,
                n.status_2 as kegiatan_status_2,
                COALESCE(l.lpd_status, 'belum_ada') as lpd_status
            FROM kwitansi_perjadin k
            JOIN nominatif_pegawai p ON k.pegawai_id = p.id
            JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
            LEFT JOIN lpd_status l ON n.id = l.kegiatan_id
            WHERE k.id = ?
        `, [kwitansiId]);
        
        if (kwitansi.length === 0) {
            return res.status(404).json({ success: false, message: 'Kwitansi tidak ditemukan' });
        }
        
        const kwitansiData = kwitansi[0];
        const roleInfo = getUserRoleInfo(user);
        
        // Validasi LPD
        const isLpdSelesai = kwitansiData.lpd_status === 'selesai';
        
        if (!isLpdSelesai && !roleInfo.isAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: `Persetujuan kwitansi hanya dapat dilakukan setelah LPD selesai. Status LPD saat ini: ${kwitansiData.lpd_status}` 
            });
        }
        
        const normalizedUserNip = normalizeNip(userNip);
        const normalizedPegawaiNip = normalizeNip(kwitansiData.pegawai_nip);
        const normalizedPpkNip = normalizeNip(kwitansiData.ppk_nip);
        const normalizedBendaharaNip = normalizeNip(kwitansiData.bendahara_nip);
        
        const isPegawai = normalizedUserNip === normalizedPegawaiNip;
        // PERBAIKAN: PPK diambil dari data nominatif kegiatan (berdasarkan ppk_id ATAU ppk_nip)
        const isPPKFromNominatif = kwitansiData.ppk_id === userId || normalizedUserNip === normalizedPpkNip;
        // Bendahara diambil dari data nominatif kegiatan (berdasarkan bendahara_id ATAU bendahara_nip)
        const isBendaharaFromNominatif = kwitansiData.bendahara_id === userId || normalizedUserNip === normalizedBendaharaNip;
        
        console.log('🔍 Approval check:', {
            isPegawai,
            isPPKFromNominatif,
            isBendaharaFromNominatif,
            ppk_id_kegiatan: kwitansiData.ppk_id,
            bendahara_id_kegiatan: kwitansiData.bendahara_id,
            userId: userId,
            currentStatus: {
                pegawai: kwitansiData.status_pegawai,
                ppk: kwitansiData.status_ppk,
                bendahara: kwitansiData.status_bendahara
            }
        });
        
        let roleToApprove = null;
        
        // KASUS 1: Pegawai yang bersangkutan - approve untuk dirinya sendiri
        if (isPegawai && kwitansiData.status_pegawai === 'belum') {
            roleToApprove = 'pegawai';
            console.log('✅ Approve sebagai PEGAWAI (peserta perjadin)');
        }
        // KASUS 2: PPK yang terdaftar di nominatif kegiatan - approve untuk pegawai lain
        else if (isPPKFromNominatif && kwitansiData.status_pegawai === 'sudah' && kwitansiData.status_ppk === 'belum') {
            roleToApprove = 'ppk';
            console.log('✅ Approve sebagai PPK (dari nominatif kegiatan)');
        }
        // KASUS 3: Bendahara yang terdaftar di nominatif kegiatan
        else if (isBendaharaFromNominatif && kwitansiData.status_pegawai === 'sudah' && kwitansiData.status_ppk === 'sudah' && kwitansiData.status_bendahara === 'belum') {
            roleToApprove = 'bendahara';
            console.log('✅ Approve sebagai BENDAHARA (dari nominatif kegiatan)');
        }
        // KASUS 4: Admin (bisa override)
        else if (roleInfo.isAdmin) {
            roleToApprove = 'admin';
            console.log('✅ Approve sebagai ADMIN');
        }
        
        if (!roleToApprove) {
            return res.status(400).json({ 
                success: false, 
                message: `Tidak dapat approve. Status saat ini: Pegawai=${kwitansiData.status_pegawai}, PPK=${kwitansiData.status_ppk}, Bendahara=${kwitansiData.status_bendahara}`
            });
        }
        
        // Proses approval
        let updateField = '', tglField = '', catatanField = '', ttdField = '', nipForTtd = '';
        
        if (roleToApprove === 'pegawai') {
            updateField = 'status_pegawai';
            tglField = 'tgl_ttd_pegawai';
            catatanField = 'catatan_pegawai';
            ttdField = 'ttd_pegawai_path';
            nipForTtd = kwitansiData.pegawai_nip;
        } else if (roleToApprove === 'ppk') {
            updateField = 'status_ppk';
            tglField = 'tgl_ttd_ppk';
            catatanField = 'catatan_ppk';
            ttdField = 'ttd_ppk_path';
            nipForTtd = kwitansiData.ppk_nip;
        } else if (roleToApprove === 'bendahara') {
            updateField = 'status_bendahara';
            tglField = 'tgl_ttd_bendahara';
            catatanField = 'catatan_bendahara';
            ttdField = 'ttd_bendahara_path';
            nipForTtd = kwitansiData.bendahara_nip;
        } else if (roleToApprove === 'admin') {
            await db.query(`
                UPDATE kwitansi_perjadin 
                SET status_pegawai = CASE WHEN ? = 'sudah' AND status_pegawai = 'belum' THEN 'sudah' ELSE status_pegawai END,
                    status_ppk = CASE WHEN ? = 'sudah' AND status_ppk = 'belum' THEN 'sudah' ELSE status_ppk END,
                    status_bendahara = CASE WHEN ? = 'sudah' AND status_bendahara = 'belum' THEN 'sudah' ELSE status_bendahara END,
                    updated_at = NOW()
                WHERE id = ?
            `, [status, status, status, kwitansiId]);
            
            const [updated] = await db.query(`
                SELECT status_pegawai, status_ppk, status_bendahara FROM kwitansi_perjadin WHERE id = ?
            `, [kwitansiId]);
            
            return res.json({
                success: true,
                message: `Admin ${status === 'sudah' ? 'menyetujui' : 'menolak'} kwitansi`,
                data: updated[0],
                role_approved: 'admin'
            });
        }
        
        let ttdPath = null;
        if (status === 'sudah') {
            ttdPath = await getTtdByNip(nipForTtd);
        }
        
        await db.query(`
            UPDATE kwitansi_perjadin 
            SET ${updateField} = ?, 
                ${tglField} = ?, 
                ${catatanField} = ?, 
                ${ttdField} = ?
            WHERE id = ?
        `, [status, status === 'sudah' ? new Date() : null, catatan || null, ttdPath, kwitansiId]);
        
        const [updated] = await db.query(`
            SELECT status_pegawai, status_ppk, status_bendahara FROM kwitansi_perjadin WHERE id = ?
        `, [kwitansiId]);
        
        const roleName = roleToApprove === 'pegawai' ? 'Pegawai' : roleToApprove === 'ppk' ? 'PPK' : 'Bendahara';
        const message = status === 'sudah' 
            ? `Berhasil menyetujui sebagai ${roleName}`
            : `Menolak sebagai ${roleName}`;
        
        console.log(`✅ Approve success: ${message}`);
        
        res.json({ 
            success: true, 
            message,
            data: updated[0],
            role_approved: roleToApprove
        });
        
    } catch (error) {
        console.error('Error approving kwitansi:', error);
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
                COALESCE(k.status_ppk, 'belum') as status_ppk,
                COALESCE(k.status_bendahara, 'belum') as status_bendahara
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
                COALESCE(k.status_ppk, 'belum') as status_ppk,
                COALESCE(k.status_bendahara, 'belum') as status_bendahara
            FROM nominatif_pegawai p
            LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND k.kegiatan_id = p.kegiatan_id
            WHERE p.kegiatan_id = ?
        `, [kegiatanId]);
        
        const semuaPegawai = results.every(r => r.status_pegawai === 'sudah');
        const semuaPpk = results.every(r => r.status_ppk === 'sudah');
        const semuaBendahara = results.every(r => r.status_bendahara === 'sudah');
        
        res.status(200).json({
            success: true,
            data: {
                pegawai_list: results,
                semua_pegawai_approve: semuaPegawai,
                semua_ppk_approve: semuaPpk,
                semua_bendahara_approve: semuaBendahara,
                total_pegawai: results.length,
                sudah_approve_pegawai: results.filter(r => r.status_pegawai === 'sudah').length,
                sudah_approve_ppk: results.filter(r => r.status_ppk === 'sudah').length,
                sudah_approve_bendahara: results.filter(r => r.status_bendahara === 'sudah').length
            }
        });
        
    } catch (error) {
        console.error('Error getting approval status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ PUT update kwitansi ============
router.put('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const userNip = user?.nip || '';
        const roleInfo = getUserRoleInfo(user);
        const { no_lpd, tgl_kwitansi, tgl_spd } = req.body;
        
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
        
        const canUpdate = roleInfo.isAdmin || normalizedUserNip === normalizedPegawaiNip;
        
        if (!canUpdate) {
            return res.status(403).json({ success: false, message: 'Tidak memiliki akses untuk mengubah kwitansi ini' });
        }
        
        const isRejected = kwitansi.status_pegawai === 'ditolak' || 
                          kwitansi.status_ppk === 'ditolak' || 
                          kwitansi.status_bendahara === 'ditolak';
        
        if (!isRejected && !roleInfo.isAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kwitansi tidak dapat diubah karena sudah dalam proses approval' 
            });
        }
        
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
        
        if (tgl_spd) {
            updateFields.push('tgl_spd = ?');
            updateValues.push(tgl_spd);
        }
        
        updateFields.push('status_pegawai = ?');
        updateValues.push('belum');
        updateFields.push('status_ppk = ?');
        updateValues.push('belum');
        updateFields.push('status_bendahara = ?');
        updateValues.push('belum');
        
        updateFields.push('tgl_ttd_pegawai = ?');
        updateValues.push(null);
        updateFields.push('tgl_ttd_ppk = ?');
        updateValues.push(null);
        updateFields.push('tgl_ttd_bendahara = ?');
        updateValues.push(null);
        updateFields.push('catatan_pegawai = ?');
        updateValues.push(null);
        updateFields.push('catatan_ppk = ?');
        updateValues.push(null);
        updateFields.push('catatan_bendahara = ?');
        updateValues.push(null);
        
        updateFields.push('updated_at = NOW()');
        
        updateValues.push(id);
        
        const query = `UPDATE kwitansi_perjadin SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.query(query, updateValues);
        
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

// ============ GET detail pegawai dengan semua biayanya ============
router.get('/pegawai/:pegawaiId/biaya', keycloakAuth, async (req, res) => {
    try {
        const { pegawaiId } = req.params;
        
        console.log(`🔍 Fetching biaya for pegawai ID: ${pegawaiId}`);
        
        const [pegawai] = await db.query(`
            SELECT p.*, n.kegiatan as nama_kegiatan, n.no_st, n.mak,
                   n.ppk_nama, n.ppk_nip, n.bendahara_nama, n.bendahara_nip,
                   n.rencana_tanggal_pelaksanaan,
                   n.rencana_tanggal_pelaksanaan_akhir
            FROM nominatif_pegawai p
            JOIN nominatif_kegiatan n ON p.kegiatan_id = n.id
            WHERE p.id = ?
        `, [pegawaiId]);
        
        if (pegawai.length === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
        }
        
        const kegiatan = pegawai[0];
        
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
            
            [transportasi] = await db.query(`
                SELECT id, trans as transport, harga as total, biaya_id
                FROM nominatif_transportasi
                WHERE biaya_id IN (?)
            `, [biayaIds]);
            
            // Query uang harian tanpa field tanggal
            [uangHarian] = await db.query(`
                SELECT 
                    id, 
                    qty, 
                    harga as tarif, 
                    total, 
                    biaya_id
                FROM nominatif_uang_harian_items
                WHERE biaya_id IN (?)
            `, [biayaIds]);
            
            // Tambahkan tanggal dari kegiatan ke setiap uang harian
            for (const uh of uangHarian) {
                uh.rencana_tanggal_pelaksanaan = kegiatan.rencana_tanggal_pelaksanaan || null;
                uh.rencana_tanggal_pelaksanaan_akhir = kegiatan.rencana_tanggal_pelaksanaan_akhir || null;
            }
            
            [penginapan] = await db.query(`
                SELECT id, jenis as hotel, qty, harga as tarif, total, biaya_id
                FROM nominatif_penginapan_items
                WHERE biaya_id IN (?)
            `, [biayaIds]);
        }
        
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

// ============ SPTJM TRANSPORT ENDPOINTS ============

// GET data SPTJM Transport berdasarkan kwitansi_id
router.get('/sptjm-transport/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        
        const [tableCheck] = await db.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'sptjm_transport'
        `);
        
        if (tableCheck[0].count === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Tabel SPTJM Transport belum tersedia'
            });
        }
        
        const [sptjmList] = await db.query(`
            SELECT 
                id,
                kwitansi_id,
                kegiatan_id,
                pegawai_id,
                jenis_transport,
                nama_maskapai,
                kode_penerbangan,
                nomor_kursi,
                created_at,
                updated_at
            FROM sptjm_transport
            WHERE kwitansi_id = ?
            ORDER BY id ASC
        `, [kwitansiId]);
        
        const [files] = await db.query(`
            SELECT 
                id,
                sptjm_transport_id,
                kwitansi_id,
                file_path,
                file_name,
                file_type,
                file_size,
                created_at
            FROM sptjm_transport_files
            WHERE kwitansi_id = ?
            ORDER BY id ASC
        `, [kwitansiId]);
        
        const filesBySptjm = {};
        files.forEach(file => {
            if (!filesBySptjm[file.sptjm_transport_id]) {
                filesBySptjm[file.sptjm_transport_id] = [];
            }
            filesBySptjm[file.sptjm_transport_id].push({
                id: file.id,
                file_path: cleanFilePath(file.file_path),
                file_name: file.file_name,
                file_type: file.file_type,
                file_size: file.file_size,
                created_at: file.created_at
            });
        });
        
        const result = sptjmList.map(sptjm => ({
            ...sptjm,
            files: filesBySptjm[sptjm.id] || []
        }));
        
        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error fetching SPTJM transport:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Tabel SPTJM Transport belum tersedia'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create/update SPTJM Transport dengan upload file
router.post('/sptjm-transport/:kwitansiId', keycloakAuth, (req, res) => {
    uploadSptjm.array('files', 10)(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { kwitansiId } = req.params;
            const { sptjm_list, kegiatan_id, pegawai_id } = req.body;
            
            console.log(`📝 Saving SPTJM Transport for kwitansi ID: ${kwitansiId}`);
            
            const sptjmListData = sptjm_list ? JSON.parse(sptjm_list) : [];
            
            if (!sptjmListData || !Array.isArray(sptjmListData)) {
                return res.status(400).json({ success: false, message: 'Data SPTJM transport tidak valid' });
            }
            
            const [tableCheck] = await db.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'sptjm_transport'
            `);
            
            if (tableCheck[0].count === 0) {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS sptjm_transport (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        kwitansi_id INT NOT NULL,
                        kegiatan_id INT NOT NULL,
                        pegawai_id INT NOT NULL,
                        jenis_transport VARCHAR(50) DEFAULT NULL,
                        nama_maskapai VARCHAR(100) DEFAULT NULL,
                        kode_penerbangan VARCHAR(50) DEFAULT NULL,
                        nomor_kursi VARCHAR(20) DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_kwitansi_id (kwitansi_id),
                        INDEX idx_kegiatan_id (kegiatan_id),
                        INDEX idx_pegawai_id (pegawai_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                console.log('✅ Created sptjm_transport table');
            }
            
            const [filesTableCheck] = await db.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'sptjm_transport_files'
            `);
            
            if (filesTableCheck[0].count === 0) {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS sptjm_transport_files (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        sptjm_transport_id INT NOT NULL,
                        kwitansi_id INT NOT NULL,
                        file_path VARCHAR(500) NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_type VARCHAR(50) DEFAULT NULL,
                        file_size INT DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_sptjm_transport_id (sptjm_transport_id),
                        INDEX idx_kwitansi_id (kwitansi_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                console.log('✅ Created sptjm_transport_files table');
            }
            
            const connection = await db.getConnection();
            await connection.beginTransaction();
            
            try {
                const [oldFiles] = await connection.query(
                    'SELECT file_path FROM sptjm_transport_files WHERE kwitansi_id = ?',
                    [kwitansiId]
                );
                
                for (const file of oldFiles) {
                    const filePath = path.join(__dirname, '../public', file.file_path);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Deleted old file: ${filePath}`);
                    }
                }
                
                await connection.query('DELETE FROM sptjm_transport_files WHERE kwitansi_id = ?', [kwitansiId]);
                await connection.query('DELETE FROM sptjm_transport WHERE kwitansi_id = ?', [kwitansiId]);
                
                console.log(`🗑️ Deleted old records for kwitansi_id: ${kwitansiId}`);
                
                const insertedIds = [];
                let fileIndex = 0;
                
                for (let i = 0; i < sptjmListData.length; i++) {
                    const item = sptjmListData[i];
                    
                    const [insertResult] = await connection.query(`
                        INSERT INTO sptjm_transport 
                        (kwitansi_id, kegiatan_id, pegawai_id, jenis_transport, nama_maskapai, kode_penerbangan, nomor_kursi)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        parseInt(kwitansiId),
                        parseInt(kegiatan_id),
                        parseInt(pegawai_id),
                        item.jenis_transport || null,
                        item.nama_maskapai || null,
                        item.kode_penerbangan || null,
                        item.nomor_kursi || null
                    ]);
                    
                    insertedIds.push({
                        index: i,
                        id: insertResult.insertId
                    });
                    
                    if (item.files && item.files.length > 0 && req.files) {
                        for (let f = 0; f < item.files.length && fileIndex < req.files.length; f++) {
                            const fileInfo = item.files[f];
                            const uploadedFile = req.files[fileIndex];
                            
                            const filePath = `/uploads/sptjm-transport/${uploadedFile.filename}`;
                            
                            await connection.query(`
                                INSERT INTO sptjm_transport_files 
                                (sptjm_transport_id, kwitansi_id, file_path, file_name, file_type, file_size)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `, [
                                insertResult.insertId,
                                parseInt(kwitansiId),
                                filePath,
                                fileInfo.file_name || uploadedFile.originalname,
                                uploadedFile.mimetype,
                                uploadedFile.size
                            ]);
                            
                            fileIndex++;
                        }
                    }
                }
                
                await connection.commit();
                
                console.log(`✅ SPTJM Transport saved for kwitansi ID: ${kwitansiId}, total: ${sptjmListData.length} items`);
                
                res.status(200).json({
                    success: true,
                    message: 'Data SPTJM Transport berhasil disimpan',
                    data: { total_saved: sptjmListData.length }
                });
                
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('❌ Error saving SPTJM transport:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            });
        }
    });
});

// DELETE file SPTJM Transport
router.delete('/sptjm-transport-file/:fileId', keycloakAuth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const [files] = await db.query(`
            SELECT file_path FROM sptjm_transport_files WHERE id = ?
        `, [fileId]);
        
        if (files.length === 0) {
            return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
        }
        
        const filePath = path.join(__dirname, '../public', files[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
        }
        
        await db.query('DELETE FROM sptjm_transport_files WHERE id = ?', [fileId]);
        
        res.status(200).json({
            success: true,
            message: 'File berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting SPTJM transport file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Download file SPTJM Transport
router.get('/sptjm-transport-file/:fileId/download', keycloakAuth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const [files] = await db.query(`
            SELECT file_path, file_name FROM sptjm_transport_files WHERE id = ?
        `, [fileId]);
        
        if (files.length === 0) {
            return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
        }
        
        const filePath = path.join(__dirname, '../public', files[0].file_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File fisik tidak ditemukan' });
        }
        
        res.download(filePath, files[0].file_name);
        
    } catch (error) {
        console.error('❌ Error downloading SPTJM transport file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ SPTJM PENGINAPAN ENDPOINTS ============

// GET data SPTJM Penginapan berdasarkan kwitansi_id
router.get('/sptjm-penginapan/:kwitansiId', keycloakAuth, async (req, res) => {
    try {
        const { kwitansiId } = req.params;
        
        const [tableCheck] = await db.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'sptjm_penginapan'
        `);
        
        if (tableCheck[0].count === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Tabel SPTJM Penginapan belum tersedia'
            });
        }
        
        const [penginapanList] = await db.query(`
            SELECT 
                id,
                kwitansi_id,
                kegiatan_id,
                pegawai_id,
                nama_penginapan,
                alamat_penginapan,
                nomor_kamar,
                tarif_hotel,
                tgl_menginap,
                created_at,
                updated_at
            FROM sptjm_penginapan
            WHERE kwitansi_id = ?
            ORDER BY id ASC
        `, [kwitansiId]);
        
        const [files] = await db.query(`
            SELECT 
                id,
                sptjm_penginapan_id,
                kwitansi_id,
                file_path,
                file_name,
                file_type,
                file_size,
                created_at
            FROM sptjm_penginapan_files
            WHERE kwitansi_id = ?
            ORDER BY id ASC
        `, [kwitansiId]);
        
        const filesByPenginapan = {};
        files.forEach(file => {
            if (!filesByPenginapan[file.sptjm_penginapan_id]) {
                filesByPenginapan[file.sptjm_penginapan_id] = [];
            }
            filesByPenginapan[file.sptjm_penginapan_id].push({
                id: file.id,
                file_path: cleanFilePath(file.file_path),
                file_name: file.file_name,
                file_type: file.file_type,
                file_size: file.file_size,
                created_at: file.created_at
            });
        });
        
        const result = penginapanList.map(penginapan => ({
            ...penginapan,
            files: filesByPenginapan[penginapan.id] || []
        }));
        
        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error fetching SPTJM penginapan:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Tabel SPTJM Penginapan belum tersedia'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create/update SPTJM Penginapan dengan upload file
router.post('/sptjm-penginapan/:kwitansiId', keycloakAuth, (req, res) => {
    uploadSptjmPenginapan.array('files', 10)(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { kwitansiId } = req.params;
            const { penginapan_list, kegiatan_id, pegawai_id } = req.body;
            
            console.log(`📝 Saving SPTJM Penginapan for kwitansi ID: ${kwitansiId}`);
            
            const penginapanListData = penginapan_list ? JSON.parse(penginapan_list) : [];
            
            if (!penginapanListData || !Array.isArray(penginapanListData)) {
                return res.status(400).json({ success: false, message: 'Data SPTJM penginapan tidak valid' });
            }
            
            const [tableCheck] = await db.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'sptjm_penginapan'
            `);
            
            if (tableCheck[0].count === 0) {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS sptjm_penginapan (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        kwitansi_id INT NOT NULL,
                        kegiatan_id INT NOT NULL,
                        pegawai_id INT NOT NULL,
                        nama_penginapan VARCHAR(255) DEFAULT NULL,
                        alamat_penginapan TEXT DEFAULT NULL,
                        nomor_kamar VARCHAR(50) DEFAULT NULL,
                        tarif_hotel DECIMAL(20,2) DEFAULT NULL,
                        tgl_menginap DATE DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_kwitansi_id (kwitansi_id),
                        INDEX idx_kegiatan_id (kegiatan_id),
                        INDEX idx_pegawai_id (pegawai_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                console.log('✅ Created sptjm_penginapan table');
            }
            
            const [filesTableCheck] = await db.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'sptjm_penginapan_files'
            `);
            
            if (filesTableCheck[0].count === 0) {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS sptjm_penginapan_files (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        sptjm_penginapan_id INT NOT NULL,
                        kwitansi_id INT NOT NULL,
                        file_path VARCHAR(500) NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_type VARCHAR(50) DEFAULT NULL,
                        file_size INT DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_sptjm_penginapan_id (sptjm_penginapan_id),
                        INDEX idx_kwitansi_id (kwitansi_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                console.log('✅ Created sptjm_penginapan_files table');
            }
            
            const connection = await db.getConnection();
            await connection.beginTransaction();
            
            try {
                const [oldFiles] = await connection.query(
                    'SELECT file_path FROM sptjm_penginapan_files WHERE kwitansi_id = ?',
                    [kwitansiId]
                );
                
                for (const file of oldFiles) {
                    const filePath = path.join(__dirname, '../public', file.file_path);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Deleted old file: ${filePath}`);
                    }
                }
                
                await connection.query('DELETE FROM sptjm_penginapan_files WHERE kwitansi_id = ?', [kwitansiId]);
                await connection.query('DELETE FROM sptjm_penginapan WHERE kwitansi_id = ?', [kwitansiId]);
                
                console.log(`🗑️ Deleted old records for kwitansi_id: ${kwitansiId}`);
                
                const insertedIds = [];
                let fileIndex = 0;
                
                for (let i = 0; i < penginapanListData.length; i++) {
                    const item = penginapanListData[i];
                    
                    const [insertResult] = await connection.query(`
                        INSERT INTO sptjm_penginapan 
                        (kwitansi_id, kegiatan_id, pegawai_id, nama_penginapan, alamat_penginapan, nomor_kamar, tarif_hotel, tgl_menginap)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        parseInt(kwitansiId),
                        parseInt(kegiatan_id),
                        parseInt(pegawai_id),
                        item.nama_penginapan || null,
                        item.alamat_penginapan || null,
                        item.nomor_kamar || null,
                        item.tarif_hotel || null,
                        item.tgl_menginap || null
                    ]);
                    
                    insertedIds.push({
                        index: i,
                        id: insertResult.insertId
                    });
                    
                    if (item.files && item.files.length > 0 && req.files) {
                        for (let f = 0; f < item.files.length && fileIndex < req.files.length; f++) {
                            const fileInfo = item.files[f];
                            const uploadedFile = req.files[fileIndex];
                            
                            const filePath = `/uploads/sptjm-penginapan/${uploadedFile.filename}`;
                            
                            await connection.query(`
                                INSERT INTO sptjm_penginapan_files 
                                (sptjm_penginapan_id, kwitansi_id, file_path, file_name, file_type, file_size)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `, [
                                insertResult.insertId,
                                parseInt(kwitansiId),
                                filePath,
                                fileInfo.file_name || uploadedFile.originalname,
                                uploadedFile.mimetype,
                                uploadedFile.size
                            ]);
                            
                            fileIndex++;
                        }
                    }
                }
                
                await connection.commit();
                
                console.log(`✅ SPTJM Penginapan saved for kwitansi ID: ${kwitansiId}, total: ${penginapanListData.length} items`);
                
                res.status(200).json({
                    success: true,
                    message: 'Data SPTJM Penginapan berhasil disimpan',
                    data: { total_saved: penginapanListData.length }
                });
                
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('❌ Error saving SPTJM penginapan:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            });
        }
    });
});

// DELETE file SPTJM Penginapan
router.delete('/sptjm-penginapan-file/:fileId', keycloakAuth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const [files] = await db.query(`
            SELECT file_path FROM sptjm_penginapan_files WHERE id = ?
        `, [fileId]);
        
        if (files.length === 0) {
            return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
        }
        
        const filePath = path.join(__dirname, '../public', files[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
        }
        
        await db.query('DELETE FROM sptjm_penginapan_files WHERE id = ?', [fileId]);
        
        res.status(200).json({
            success: true,
            message: 'File berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting SPTJM penginapan file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Download file SPTJM Penginapan
router.get('/sptjm-penginapan-file/:fileId/download', keycloakAuth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const [files] = await db.query(`
            SELECT file_path, file_name FROM sptjm_penginapan_files WHERE id = ?
        `, [fileId]);
        
        if (files.length === 0) {
            return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
        }
        
        const filePath = path.join(__dirname, '../public', files[0].file_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File fisik tidak ditemukan' });
        }
        
        res.download(filePath, files[0].file_name);
        
    } catch (error) {
        console.error('❌ Error downloading SPTJM penginapan file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;