const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// ========== HELPER FUNCTIONS UNTUK QUERY FILTER BERDASARKAN ROLE ==========

/**
 * Build WHERE clause berdasarkan role user
 * PERUBAHAN: 
 * - Untuk PPK hanya melihat data yang ppk_id nya sesuai dengan user_id mereka
 * - Untuk Kabalai hanya melihat data yang statusnya "disetujui" atau "diketahui"
 */
function buildUserWhereClause(user) {
    const userId = getUserId(user);
    
    console.log(`🔧 Building WHERE clause for user:`, {
        user: getUsername(user),
        roles: user.extractedRoles || user.role,
        userId: userId,
        isAdmin: user.isAdmin,
        isPPK: user.isPPK,
        isKabalai: user.isKabalai,
        isRegularUser: user.isRegularUser
    });
    
    // 1. Admin: bisa melihat semua data
    if (user.isAdmin) {
        console.log('👑 Admin: can view all data');
        return { where: '', params: [] };
    }
    
    // 2. PPK: hanya bisa melihat data yang ppk_id nya sesuai dengan user_id mereka
    if (user.isPPK) {
        console.log('📋 PPK: can only view data with matching ppk_id');
        return { 
            where: 'WHERE ppk_id = ?', 
            params: [userId] 
        };
    }
    
    // 3. Kabalai: hanya melihat data yang statusnya "disetujui" atau "diketahui"
    if (user.isKabalai) {
        console.log('👔 Kabalai: can only view data with status "disetujui" or "diketahui" or "selesai"');
        return { 
            where: 'WHERE status IN ("disetujui", "diketahui", "selesai")', 
            params: [] 
        };
    }
    
    // 4. Regular User: hanya bisa melihat data yang mereka buat (user_id)
    console.log('👤 Regular User: can only view own data');
    return { 
        where: 'WHERE user_id = ?', 
        params: [userId] 
    };
}

/**
 * Build WHERE clause untuk query single item berdasarkan role user
 * PERUBAHAN: 
 * - Untuk PPK hanya bisa mengakses jika ppk_id sesuai
 * - Untuk Kabalai hanya bisa mengakses jika status "disetujui" atau "diketahui"
 */
function buildSingleItemWhereClause(user, itemId, columnName = 'id') {
    const userId = getUserId(user);
    
    console.log(`🔧 Building single item WHERE clause for user:`, {
        user: getUsername(user),
        roles: user.extractedRoles || user.role,
        userId: userId,
        isAdmin: user.isAdmin,
        isPPK: user.isPPK,
        isKabalai: user.isKabalai,
        itemId: itemId
    });
    
    // 1. Admin: bisa mengakses semua data
    if (user.isAdmin) {
        console.log('👑 Admin: can access all data');
        return { 
            where: `WHERE ${columnName} = ?`, 
            params: [itemId]
        };
    }
    
    // 2. PPK: hanya bisa mengakses jika ppk_id sesuai
    if (user.isPPK) {
        console.log('📋 PPK: can only access if ppk_id matches');
        return { 
            where: `WHERE ${columnName} = ? AND ppk_id = ?`, 
            params: [itemId, userId] 
        };
    }
    
    // 3. Kabalai: hanya bisa mengakses data dengan status "disetujui" atau "diketahui"
    if (user.isKabalai) {
        console.log('👔 Kabalai: can only access data with status "disetujui" or "diketahui"');
        return { 
            where: `WHERE ${columnName} = ? AND status IN ("disetujui", "diketahui", "selesai")`, 
            params: [itemId]
        };
    }
    
    // 4. Regular User: hanya bisa mengakses data yang mereka buat
    console.log('👤 Regular User: can only access own data');
    return { 
        where: `WHERE ${columnName} = ? AND user_id = ?`, 
        params: [itemId, userId] 
    };
}

// Helper function untuk menjalankan query
function runQuery(query, params) {
    return new Promise((resolve, reject) => {
        console.log('📝 Executing query:', query.substring(0, 100) + '...');
        db.query(query, params, (err, results) => {
            if (err) {
                console.error('❌ Query error:', err);
                reject(err);
            } else {
                console.log('✅ Query success, rows:', results.length);
                resolve(results);
            }
        });
    });
}
// GET - Daftar kegiatan untuk Kabalai dengan filter status
// GET - Daftar kegiatan untuk Kabalai dengan filter status termasuk selesai
router.get('/kabalai/kegiatan', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`👔 ${username} mengakses daftar kegiatan sebagai Kabalai`);
    
    // Cek apakah user adalah Kabalai
    if (!req.user.isKabalai) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat mengakses daftar kegiatan ini'
        });
    }
    
    try {
        const { 
            status = 'all', // Default semua status yang bisa dilihat Kabalai
            search, 
            page = 1, 
            limit = 20 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build WHERE clause - Kabalai bisa melihat data dengan status "disetujui", "diketahui", dan "selesai"
        let whereClause = 'WHERE status IN ("disetujui", "diketahui", "selesai")';
        let params = [];
        
        // Filter berdasarkan status tertentu jika bukan 'all'
        if (status && status !== 'all') {
            if (['disetujui', 'diketahui', 'selesai'].includes(status)) {
                whereClause = `WHERE status = ?`;
                params.push(status);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Status tidak valid untuk Kabalai',
                    valid_statuses: ['disetujui', 'diketahui', 'selesai', 'all']
                });
            }
        }
        
        // Filter search
        if (search) {
            if (params.length > 0) {
                whereClause += ' AND';
            } else {
                whereClause = 'WHERE';
            }
            whereClause += ' (kegiatan LIKE ? OR ppk_nama LIKE ? OR no_st LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }
        
        // Query untuk menghitung total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM accounting.nominatif_kegiatan
            ${whereClause}
        `;
        
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;
        
        // Query untuk data dengan pagination - TAMBAHKAN no_st dan tgl_st
        const dataQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.mak,
                k.status,
                k.ppk_nama,
                k.catatan_kabalai,
                k.no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui,
                k.diketahui_oleh,
                k.nama_kabalai,
                
                -- Hitung total pegawai dan biaya
                (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_pegawai,
                (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
                
            FROM accounting.nominatif_kegiatan k
            ${whereClause}
            ORDER BY 
                CASE 
                    WHEN k.status = 'disetujui' THEN 1
                    WHEN k.status = 'diketahui' THEN 2
                    WHEN k.status = 'selesai' THEN 3
                    ELSE 4 
                END,
                k.tanggal_diketahui DESC,
                k.tanggal_disetujui DESC,
                k.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const dataParams = [...params, parseInt(limit), parseInt(offset)];
        const [rows] = await db.query(dataQuery, dataParams);
        
        console.log(`✅ Ditemukan ${rows.length} kegiatan untuk Kabalai ${username} (status: ${status})`);
        
        // Format response data untuk memudahkan frontend
        const formattedData = rows.map(item => ({
            ...item,
            // Tambahkan flag untuk frontend
            is_selesai: item.status === 'selesai',
            has_st: item.no_st && item.no_st.trim() !== '',
            st_info: item.status === 'selesai' ? {
                no_st: item.no_st,
                tgl_st: item.tgl_st,
                is_complete: item.no_st && item.tgl_st
            } : null
        }));
        
        res.status(200).json({
            success: true,
            message: 'Daftar kegiatan untuk Kabalai berhasil diambil',
            data: formattedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                status: status,
                search: search || ''
            },
            metadata: {
                for_role: 'Kabalai',
                accessible_statuses: ['disetujui', 'diketahui', 'selesai'],
                note: 'Kabalai dapat melihat kegiatan yang sudah disetujui, diketahui, dan selesai (sudah terbit ST)',
                total_by_status: {
                    disetujui: rows.filter(r => r.status === 'disetujui').length,
                    diketahui: rows.filter(r => r.status === 'diketahui').length,
                    selesai: rows.filter(r => r.status === 'selesai').length
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching kegiatan untuk Kabalai:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar kegiatan',
            error: error.message
        });
    }
});
// ========== ROUTES UTAMA KEGIATAN ==========

// GET semua kegiatan dengan filter berdasarkan role user
router.get('/', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses daftar kegiatan`);
    console.log('👤 User access info:', {
        username: username,
        roles: req.user.extractedRoles || req.user.role,
        userId: getUserId(req.user),
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        isRegularUser: req.user.isRegularUser
    });
    
    try {
        // Build WHERE clause berdasarkan role user
        const { where, params } = buildUserWhereClause(req.user);
        
        // Tambahkan filter tambahan untuk status jika ada query parameter
        let finalWhere = where;
        let finalParams = [...params];
        
        const { status, search } = req.query;
        
        // Handle query parameter untuk filter status
        if (status && status !== 'all') {
            if (finalWhere) {
                finalWhere += ` AND status = ?`;
            } else {
                finalWhere = `WHERE status = ?`;
            }
            finalParams.push(status);
        }
        
        // Handle query parameter untuk search
        if (search) {
            const searchParam = `%${search}%`;
            if (finalWhere) {
                finalWhere += ` AND (kegiatan LIKE ? OR ppk_nama LIKE ?)`;
            } else {
                finalWhere = `WHERE (kegiatan LIKE ? OR ppk_nama LIKE ?)`;
            }
            finalParams.push(searchParam, searchParam, searchParam);
        }
        
        const query = `
            SELECT 
                id,
                kegiatan,
                mak,
                realisasi_anggaran_sebelumnya,
                target_output_tahun,
                realisasi_output_sebelumnya,
                target_output_yg_akan_dicapai,
                kota_kab_kecamatan,
                DATE_FORMAT(rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                user_id,
                status,
                ppk_id,
                ppk_nama,
                catatan_kabalai,
                no_st,  
                tgl_st, 
                status_2, 
                catatan_status_2,
                DATE_FORMAT(tgl_st, '%Y-%m-%d') as tgl_st_format,  
                DATE_FORMAT(tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui,
                DATE_FORMAT(tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                catatan,
                diketahui_oleh,
                diketahui_oleh,
                diketahui_oleh_id,
                jenis_spm,
                
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM accounting.nominatif_kegiatan
            ${finalWhere}
            ORDER BY 
                CASE 
                    WHEN status = 'diketahui' THEN 1
                    WHEN status = 'disetujui' THEN 2
                    WHEN status = 'selesai' THEN 3
                    ELSE 4 
                END,
                created_at DESC
        `;

        console.log('📝 Executing query:', query);
        console.log('📝 With params:', finalParams);

        const [rows] = await db.query(query, finalParams);

        console.log(`✅ Data berhasil diambil: ${rows.length} kegiatan`);
        
        // Tambahkan informasi status summary untuk response
        const statusSummary = {
            total: rows.length,
            disetujui: rows.filter(r => r.status === 'disetujui').length,
            diketahui: rows.filter(r => r.status === 'diketahui').length,
            diajukan: rows.filter(r => r.status === 'diajukan').length,
            draft: rows.filter(r => r.status === 'draft').length
        };
        
        if (rows.length > 0) {
            console.log('📊 Contoh data pertama:', {
                id: rows[0].id,
                kegiatan: rows[0].kegiatan,
                status: rows[0].status,
                ppk_nama: rows[0].ppk_nama,
                user_id: rows[0].user_id,
                ppk_id: rows[0].ppk_id
            });
        }

        res.status(200).json({
            success: true,
            message: req.user.isPPK 
                ? 'Daftar pengajuan untuk PPK berhasil diambil' 
                : req.user.isKabalai
                ? 'Daftar kegiatan yang disetujui berhasil diambil'
                : req.user.isAdmin
                ? 'Daftar semua kegiatan berhasil diambil'
                : 'Daftar kegiatan Anda berhasil diambil',
            data: rows,
            user: username,
            role: req.user.extractedRoles || req.user.role,
            user_type: {
                isAdmin: req.user.isAdmin,
                isPPK: req.user.isPPK,
                isKabalai: req.user.isKabalai,
                isRegularUser: req.user.isRegularUser
            },
            count: rows.length,
            status_summary: statusSummary,
            filters: {
                status: status || 'all',
                search: search || ''
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching kegiatan:', error);
        res.status(500).json({ 
            success: false,
            message: 'Terjadi kesalahan server', 
            error: error.message 
        });
    }
});

// GET detail kegiatan by ID dengan validasi berdasarkan role user
router.get('/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    
    console.log(`📋 ${username} mengakses detail kegiatan ID: ${id}`);
    console.log('🔍 Access check:', {
        role: req.user.extractedRoles || req.user.role,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        userId: getUserId(req.user)
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    try {
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const query = `
            SELECT 
                id,
                kegiatan,
                mak,
                realisasi_anggaran_sebelumnya,
                target_output_tahun,
                realisasi_output_sebelumnya,
                target_output_yg_akan_dicapai,
                kota_kab_kecamatan,
                DATE_FORMAT(rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                user_id,
                status,
                ppk_id,
                ppk_nama,
                DATE_FORMAT(tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                catatan,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM accounting.nominatif_kegiatan 
            ${where}
        `;

        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk user ${username}`);
            
            let errorMessage = 'Kegiatan tidak ditemukan';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            } else if (req.user.isRegularUser) {
                errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }

        console.log(`✅ Berhasil mengambil detail kegiatan ID: ${id}`);
        
        res.status(200).json({
            success: true,
            message: 'Detail kegiatan berhasil diambil',
            data: rows[0],
            user: username,
            role: req.user.extractedRoles || req.user.role,
            user_type: {
                isAdmin: req.user.isAdmin,
                isPPK: req.user.isPPK,
                isKabalai: req.user.isKabalai,
                isRegularUser: req.user.isRegularUser
            },
            is_owner: req.user.isAdmin || req.user.isKabalai || 
                     rows[0].user_id === getUserId(req.user) || 
                     (req.user.isPPK && rows[0].ppk_id === getUserId(req.user))
        });
    } catch (error) {
        console.error('❌ Error fetching kegiatan detail:', error);
        res.status(500).json({ 
            success: false,
            error: 'Database error',
            message: error.message
        });
    }
});

// GET DETAIL KEGIATAN UNTUK EDIT dengan validasi berdasarkan role user
router.get('/:id/edit', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);

    console.log(`📋 ${username} mengakses data edit kegiatan ID: ${id}`);
    console.log('🔍 Access check:', {
        role: req.user.extractedRoles || req.user.role,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai
    });

    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }

    try {
        // Build WHERE clause berdasarkan role
        const { where, params } = buildSingleItemWhereClause(req.user, id, 'k.id');

        // 1. Ambil data kegiatan utama
        const kegiatanQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.mak,
                k.realisasi_anggaran_sebelumnya,
                k.target_output_tahun,
                k.realisasi_output_sebelumnya,
                k.target_output_yg_akan_dicapai,
                k.kota_kab_kecamatan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                k.user_id,
                k.status,
                k.ppk_id,
                k.ppk_nama,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui,
                k.catatan,
                
                k.no_st,
                k.tgl_st,  
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format,
                k.catatan_kabalai,
            
                k.diketahui_oleh,
                k.diketahui_oleh_id,
                
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM accounting.nominatif_kegiatan k
            ${where}
        `;
        
        console.log('📝 Kegiatan query:', kegiatanQuery);
        console.log('📝 Kegiatan params:', params);
        
        const [kegiatanRows] = await db.query(kegiatanQuery, params);

        if (kegiatanRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk edit`);
            
            let errorMessage = 'Kegiatan tidak ditemukan';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            } else if (req.user.isRegularUser) {
                errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }

        const kegiatanData = kegiatanRows[0];

        // Validasi: hanya bisa edit jika status draft
        if (kegiatanData.status !== 'draft' && kegiatanData.status !== 'dikembalikan' && req.user.isRegularUser) {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${kegiatanData.status} tidak dapat diubah. Hanya kegiatan dengan status draft yang dapat diubah.`
            });
        }

        // 2. Ambil data pegawai untuk kegiatan ini
        const pegawaiQuery = `
            SELECT 
                p.id,
                p.nama,
                p.nip,
                p.jabatan,
                p.total_biaya
            FROM accounting.nominatif_pegawai p
            WHERE p.kegiatan_id = ?
            ORDER BY p.id ASC
        `;

        const [pegawaiRows] = await db.query(pegawaiQuery, [id]);

        // 3. Untuk setiap pegawai, ambil data biaya
        if (pegawaiRows.length > 0) {
            const pegawaiIds = pegawaiRows.map(p => p.id);
            
            const biayaQuery = `
                SELECT 
                    b.id as biaya_id,
                    b.pegawai_id
                FROM accounting.nominatif_biaya_kegiatan b
                WHERE b.pegawai_id IN (?)
                ORDER BY b.id ASC
            `;

            const [biayaRows] = await db.query(biayaQuery, [pegawaiIds]);

            const biayaIds = biayaRows.map(b => b.biaya_id);
            
            if (biayaIds.length > 0) {
                const [transportasiRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_transportasi WHERE biaya_id IN (?)`, 
                    [biayaIds]
                );
                
                const [uangHarianRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (?)`, 
                    [biayaIds]
                );
                
                const [penginapanRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (?)`, 
                    [biayaIds]
                );

                const transportasiByBiaya = {};
                const uangHarianByBiaya = {};
                const penginapanByBiaya = {};

                transportasiRows.forEach(t => {
                    if (!transportasiByBiaya[t.biaya_id]) {
                        transportasiByBiaya[t.biaya_id] = [];
                    }
                    transportasiByBiaya[t.biaya_id].push({
                        id: t.id,
                        trans: t.trans || '',
                        harga: Number(t.harga) || 0,
                        total: Number(t.total) || 0
                    });
                });

                uangHarianRows.forEach(uh => {
                    if (!uangHarianByBiaya[uh.biaya_id]) {
                        uangHarianByBiaya[uh.biaya_id] = [];
                    }
                    uangHarianByBiaya[uh.biaya_id].push({
                        id: uh.id,
                        jenis: uh.jenis || '',
                        qty: Number(uh.qty) || 0,
                        harga: Number(uh.harga) || 0,
                        total: Number(uh.total) || 0
                    });
                });

                penginapanRows.forEach(ph => {
                    if (!penginapanByBiaya[ph.biaya_id]) {
                        penginapanByBiaya[ph.biaya_id] = [];
                    }
                    penginapanByBiaya[ph.biaya_id].push({
                        id: ph.id,
                        jenis: ph.jenis || '',
                        qty: Number(ph.qty) || 0,
                        harga: Number(ph.harga) || 0,
                        total: Number(ph.total) || 0
                    });
                });

                pegawaiRows.forEach(pegawai => {
                    const biayaPegawai = biayaRows.filter(b => b.pegawai_id === pegawai.id);
                    
                    pegawai.biaya = biayaPegawai.map(b => {
                        return {
                            transportasi: transportasiByBiaya[b.biaya_id] || [],
                            uang_harian_items: uangHarianByBiaya[b.biaya_id] || [],
                            penginapan_items: penginapanByBiaya[b.biaya_id] || []
                        };
                    });
                });
            } else {
                pegawaiRows.forEach(pegawai => {
                    pegawai.biaya = [{
                        transportasi: [],
                        uang_harian_items: [],
                        penginapan_items: []
                    }];
                });
            }
        }

        const responseData = {
            ...kegiatanData,
            pegawai: pegawaiRows || []
        };

        console.log(`✅ Berhasil mengambil data edit untuk kegiatan ID: ${id}`);
        
        res.status(200).json({
            success: true,
            message: 'Data untuk edit berhasil diambil',
            data: responseData,
            user: username,
            role: req.user.extractedRoles || req.user.role,
            user_type: {
                isAdmin: req.user.isAdmin,
                isPPK: req.user.isPPK,
                isKabalai: req.user.isKabalai,
                isRegularUser: req.user.isRegularUser
            },
            is_owner: req.user.isAdmin || req.user.isKabalai || 
                     responseData.user_id === getUserId(req.user) || 
                     (req.user.isPPK && responseData.ppk_id === getUserId(req.user))
        });

    } catch (error) {
        console.error('❌ Error fetching data for edit:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});

// GET DETAIL KEGIATAN + PEGAWAI + BIAYA dengan validasi berdasarkan role user
router.get('/:id/detail', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);

    console.log(`📋 ${username} mengakses detail lengkap kegiatan ID: ${id}`);
    console.log('🔍 Access check:', {
        role: req.user.extractedRoles || req.user.role,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai
    });

    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }

    try {
        const { where, params } = buildSingleItemWhereClause(req.user, id, 'k.id');

        const kegiatanQuery = `
        SELECT 
            k.id,
            k.kegiatan,
            k.mak,
            k.realisasi_anggaran_sebelumnya,
            k.target_output_tahun,
            k.realisasi_output_sebelumnya,
            k.target_output_yg_akan_dicapai,
            k.kota_kab_kecamatan,
            DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
            DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
            k.user_id,
            k.status,
            k.ppk_id,
            k.ppk_nama,
            DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
            DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
            DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui,
            k.catatan,
            
            
            k.no_st,
            k.tgl_st,  
            DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format,
            k.catatan_kabalai,
            k.diketahui_oleh,
            
            DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
            DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
        FROM accounting.nominatif_kegiatan k
        ${where}
    `;
        
        const [kegiatanRows] = await db.query(kegiatanQuery, params);

        if (kegiatanRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk detail`);
            
            let errorMessage = 'Kegiatan tidak ditemukan';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            } else if (req.user.isRegularUser) {
                errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }

        const kegiatanData = kegiatanRows[0];

        const pegawaiQuery = `
            SELECT 
                p.id,
                p.nama,
                p.nip,
                p.jabatan,
                p.total_biaya
            FROM accounting.nominatif_pegawai p
            WHERE p.kegiatan_id = ?
            ORDER BY p.id ASC
        `;

        const [pegawaiRows] = await db.query(pegawaiQuery, [id]);

        if (pegawaiRows.length > 0) {
            const pegawaiIds = pegawaiRows.map(p => p.id);
            
            const biayaQuery = `
                SELECT 
                    b.id as biaya_id,
                    b.pegawai_id
                FROM accounting.nominatif_biaya_kegiatan b
                WHERE b.pegawai_id IN (?)
                ORDER BY b.id ASC
            `;

            const [biayaRows] = await db.query(biayaQuery, [pegawaiIds]);

            const biayaByPegawai = {};
            biayaRows.forEach(b => {
                if (!biayaByPegawai[b.pegawai_id]) {
                    biayaByPegawai[b.pegawai_id] = [];
                }
                biayaByPegawai[b.pegawai_id].push(b);
            });

            const biayaIds = biayaRows.map(b => b.biaya_id);
            
            if (biayaIds.length > 0) {
                const [transportasiRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_transportasi WHERE biaya_id IN (?)`, 
                    [biayaIds]
                );
                
                const [uangHarianRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (?)`, 
                    [biayaIds]
                );
                
                const [penginapanRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (?)`, 
                    [biayaIds]
                );

                const transportasiByBiaya = {};
                const uangHarianByBiaya = {};
                const penginapanByBiaya = {};

                transportasiRows.forEach(t => {
                    if (!transportasiByBiaya[t.biaya_id]) {
                        transportasiByBiaya[t.biaya_id] = [];
                    }
                    transportasiByBiaya[t.biaya_id].push({
                        id: t.id,
                        trans: t.trans,
                        harga: parseFloat(t.harga) || 0,
                        total: parseFloat(t.total) || 0
                    });
                });

                uangHarianRows.forEach(uh => {
                    if (!uangHarianByBiaya[uh.biaya_id]) {
                        uangHarianByBiaya[uh.biaya_id] = [];
                    }
                    uangHarianByBiaya[uh.biaya_id].push({
                        id: uh.id,
                        jenis: uh.jenis,
                        qty: parseFloat(uh.qty) || 0,
                        harga: parseFloat(uh.harga) || 0,
                        total: parseFloat(uh.total) || 0
                    });
                });

                penginapanRows.forEach(ph => {
                    if (!penginapanByBiaya[ph.biaya_id]) {
                        penginapanByBiaya[ph.biaya_id] = [];
                    }
                    penginapanByBiaya[ph.biaya_id].push({
                        id: ph.id,
                        jenis: ph.jenis,
                        qty: parseFloat(ph.qty) || 0,
                        harga: parseFloat(ph.harga) || 0,
                        total: parseFloat(ph.total) || 0
                    });
                });

                pegawaiRows.forEach(pegawai => {
                    pegawai.biaya_list = [];
                    
                    if (biayaByPegawai[pegawai.id]) {
                        biayaByPegawai[pegawai.id].forEach(biaya => {
                            const biayaDetail = {
                                biaya_id: biaya.biaya_id,
                                transportasi: transportasiByBiaya[biaya.biaya_id] || [],
                                uang_harian: uangHarianByBiaya[biaya.biaya_id] || [],
                                penginapan: penginapanByBiaya[biaya.biaya_id] || []
                            };
                            
                            const subtotalTransport = biayaDetail.transportasi.reduce((sum, t) => sum + t.total, 0);
                            const subtotalUangHarian = biayaDetail.uang_harian.reduce((sum, uh) => sum + uh.total, 0);
                            const subtotalPenginapan = biayaDetail.penginapan.reduce((sum, ph) => sum + ph.total, 0);
                            biayaDetail.subtotal = subtotalTransport + subtotalUangHarian + subtotalPenginapan;
                            
                            pegawai.biaya_list.push(biayaDetail);
                        });
                    }
                });
            }
        }

        const responseData = {
            ...kegiatanData,
            pegawai: pegawaiRows,
            total_pegawai: pegawaiRows.length,
            total_biaya: pegawaiRows.reduce((sum, p) => sum + (parseFloat(p.total_biaya) || 0), 0)
        };

        console.log(`✅ Berhasil mengambil detail lengkap kegiatan ID: ${id}`);
        
        res.status(200).json({
            success: true,
            message: 'Detail lengkap kegiatan berhasil diambil',
            data: responseData,
            user: username,
            role: req.user.extractedRoles || req.user.role,
            user_type: {
                isAdmin: req.user.isAdmin,
                isPPK: req.user.isPPK,
                isKabalai: req.user.isKabalai,
                isRegularUser: req.user.isRegularUser
            },
            is_owner: req.user.isAdmin || req.user.isKabalai || 
                     responseData.user_id === getUserId(req.user) || 
                     (req.user.isPPK && responseData.ppk_id === getUserId(req.user))
        });

    } catch (error) {
        console.error('❌ Error fetching full detail:', error);
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                success: false,
                message: 'Struktur database tidak sesuai. Kolom yang diminta tidak ditemukan.',
                error: error.sqlMessage,
                suggestion: 'Periksa struktur tabel pegawai dan pastikan kolom yang dibutuhkan ada.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});

// POST - Insert kegiatan dengan semua data (kegiatan + pegawai + biaya)
router.post('/', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log('=== MENERIMA REQUEST CREATE KEGIATAN ===');
    console.log(`👤 User: ${username} (ID: ${userId})`);
    console.log('👥 Roles:', req.user.extractedRoles || req.user.role);
    console.log('🔍 User type:', {
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        isRegularUser: req.user.isRegularUser
    });
    
    // Hanya regular user yang bisa membuat kegiatan baru
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat membuat kegiatan baru. Admin, PPK, dan Kabalai tidak dapat membuat kegiatan.'
        });
    }
    
    // Debug: tampilkan seluruh request body
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    
    // DESTRUCTURING DENGAN DEFAULT VALUES
    const {
        kegiatan: kegiatanNama,
        mak,
        realisasi_anggaran_sebelumnya = 0,
        target_output_tahun = 0,
        realisasi_output_sebelumnya = 0,
        target_output_yg_akan_dicapai = '',
        kota_kab_kecamatan = '',
        rencana_tanggal_pelaksanaan,
        rencana_tanggal_pelaksanaan_akhir,
        no_st = '',
        tgl_st = null,
        status_2,
        catatan_status_2,
        jenis_spm,
        pegawai = []
    } = req.body;

    // Validasi minimal
    if (!kegiatanNama || !mak) {
        return res.status(400).json({ 
            success: false,
            message: 'Kegiatan dan MAK wajib diisi' 
        });
    }

    console.log(`📝 Creating kegiatan: ${kegiatanNama}`);
    console.log(`👥 Jumlah pegawai: ${pegawai.length}`);

    let connection;
    try {
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Insert data kegiatan utama
        const kegiatanQuery = `
           INSERT INTO accounting.nominatif_kegiatan
            (
            kegiatan,
            mak,
            realisasi_anggaran_sebelumnya,
            target_output_tahun,
            realisasi_output_sebelumnya,
            target_output_yg_akan_dicapai,
            kota_kab_kecamatan,
            rencana_tanggal_pelaksanaan,
            rencana_tanggal_pelaksanaan_akhir,
            user_id,
            status,
            created_at,
            no_st,
            tgl_st,
            status_2,
            catatan_status_2,
            jenis_spm
            )
            VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW(), ?, ?, ?, ?, ?
            )`;

        // PERBAIKAN: Gunakan variable yang benar dari destructuring
        const kegiatanValues = [
            kegiatanNama,                      // 1. kegiatan (dari kegiatanNama)
            mak,                              // 2. mak
            parseFloat(realisasi_anggaran_sebelumnya) || 0, // 3. realisasi_anggaran_sebelumnya
            parseInt(target_output_tahun) || 0, // 4. target_output_tahun
            parseInt(realisasi_output_sebelumnya) || 0, // 5. realisasi_output_sebelumnya
            target_output_yg_akan_dicapai, // 6. target_output_yg_akan_dicapai
            kota_kab_kecamatan,                // 7. kota_kab_kecamatan
            rencana_tanggal_pelaksanaan || null, // 8. rencana_tanggal_pelaksanaan
            rencana_tanggal_pelaksanaan_akhir || null, // 8. rencana_tanggal_pelaksanaan
            userId,                           // 9. user_id
            no_st,                            // 10. no_st
            tgl_st,                            // 11. tgl_st
            status_2 || null,      
            catatan_status_2 || null,                     // 11. tgl_st
            jenis_spm                      // 11. tgl_st

        ];

        console.log('🔢 Values for kegiatan insert:', kegiatanValues);
        console.log('📝 SQL Query:', kegiatanQuery);

        const [kegiatanResult] = await connection.execute(kegiatanQuery, kegiatanValues);
        const kegiatanId = kegiatanResult.insertId;
        console.log('✅ Kegiatan inserted, ID:', kegiatanId);

        let totalPegawai = 0;
        let totalBiaya = 0;

        // 2. Insert data pegawai (jika ada)
        if (pegawai && pegawai.length > 0) {
            for (const p of pegawai) {
                if (!p.nama) {
                    console.warn('⚠️ Pegawai tanpa nama, dilewati');
                    continue;
                }

                // Insert pegawai
                const pegawaiQuery = `
                    INSERT INTO accounting.nominatif_pegawai 
                    (kegiatan_id, nama, nip, jabatan, total_biaya) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const pegawaiValues = [
                    kegiatanId,
                    p.nama,
                    p.nip || null,
                    p.jabatan || null,
                    parseFloat(p.total_biaya) || 0
                ];

                const [pegawaiResult] = await connection.execute(pegawaiQuery, pegawaiValues);
                const pegawaiId = pegawaiResult.insertId;
                totalPegawai++;
                totalBiaya += parseFloat(p.total_biaya) || 0;

                console.log(`✅ Pegawai inserted: ${p.nama}, ID: ${pegawaiId}`);

                // 3. Insert data biaya jika ada
                if (p.biaya && p.biaya.length > 0) {
                    for (const biayaData of p.biaya) {
                        // Insert entri biaya DENGAN kegiatan_id
                        const biayaQuery = `
                            INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) 
                            VALUES (?, ?)
                        `;
                        
                        const [biayaResult] = await connection.execute(biayaQuery, [kegiatanId, pegawaiId]);
                        const biayaId = biayaResult.insertId;
                        console.log(`✅ Biaya entry created, ID: ${biayaId}`);

                        // 4. Insert transportasi
                        if (biayaData.transportasi && biayaData.transportasi.length > 0) {
                            for (const transport of biayaData.transportasi) {
                                if (!transport.trans) continue;
                                
                                const transportQuery = `
                                    INSERT INTO accounting.nominatif_transportasi 
                                    (biaya_id, trans, harga) 
                                    VALUES (?, ?, ?)
                                `;
                                
                                await connection.execute(transportQuery, [
                                    biayaId,
                                    transport.trans || '',
                                    parseFloat(transport.harga) || 0
                                ]);
                            }
                            console.log(`✅ Transportasi inserted for pegawai: ${p.nama}`);
                        }

                        // 5. Insert uang harian
                        if (biayaData.uang_harian_items && biayaData.uang_harian_items.length > 0) {
                            for (const uangHarian of biayaData.uang_harian_items) {
                                if (!uangHarian.jenis) continue;
                                
                                const uangHarianQuery = `
                                    INSERT INTO accounting.nominatif_uang_harian_items 
                                    (biaya_id, jenis, qty, harga) 
                                    VALUES (?, ?, ?, ?)
                                `;
                                
                                await connection.execute(uangHarianQuery, [
                                    biayaId,
                                    uangHarian.jenis || '',
                                    parseInt(uangHarian.qty) || 0,
                                    parseFloat(uangHarian.harga) || 0
                                ]);
                            }
                            console.log(`✅ Uang harian inserted for pegawai: ${p.nama}`);
                        }

                        // 6. Insert penginapan
                        if (biayaData.penginapan_items && biayaData.penginapan_items.length > 0) {
                            for (const penginapan of biayaData.penginapan_items) {
                                if (!penginapan.jenis) continue;
                                
                                const penginapanQuery = `
                                    INSERT INTO accounting.nominatif_penginapan_items 
                                    (biaya_id, jenis, qty, harga) 
                                    VALUES (?, ?, ?, ?)
                                `;
                                
                                await connection.execute(penginapanQuery, [
                                    biayaId,
                                    penginapan.jenis || '',
                                    parseInt(penginapan.qty) || 0,
                                    parseFloat(penginapan.harga) || 0
                                ]);
                            }
                            console.log(`✅ Penginapan inserted for pegawai: ${p.nama}`);
                        }
                    }
                } else {
                    console.log(`ℹ️ Pegawai ${p.nama} tidak memiliki data biaya`);
                    
                    // Buat biaya entry kosong
                    const biayaQuery = `
                        INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) 
                        VALUES (?, ?)
                    `;
                    await connection.execute(biayaQuery, [kegiatanId, pegawaiId]);
                }
            }
        }

        // Commit transaction
        await connection.commit();
        connection.release();

        console.log('✅ Transaction committed successfully');
        console.log(`📊 Summary: ${totalPegawai} pegawai, total biaya: ${totalBiaya}`);
        
        res.status(201).json({
            success: true,
            message: 'Kegiatan berhasil disimpan dengan semua data',
            data: {
                id: kegiatanId,
                kegiatan: kegiatanNama,
                status: 'draft',
                total_pegawai: totalPegawai,
                total_biaya: totalBiaya,
                user_id: userId,
                created_by: username,
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error creating kegiatan:', error);
        console.error('SQL Error Details:', error.sql);
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        
        // Rollback jika ada error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }

        let errorMessage = 'Gagal menyimpan data';
        let suggestion = 'Periksa struktur data yang dikirim dan coba lagi.';
        
        if (error.code === 'ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN') {
            errorMessage = 'Kolom terhitung tidak boleh diisi manual';
            suggestion = 'Kolom "total" adalah kolom terhitung otomatis. Hapus total dari data yang dikirim.';
        } else if (error.code === 'ER_NO_DEFAULT_FOR_FIELD') {
            errorMessage = 'Kolom wajib tidak diisi';
            suggestion = `Kolom wajib belum diisi. Periksa log untuk detail.`;
        } else if (error.code === 'ER_MALFORMED_PACKET') {
            errorMessage = 'Gagal mengirim data ke database';
            suggestion = 'Periksa jumlah parameter dan tipe data yang dikirim. Pastikan jumlah placeholder "?" sesuai dengan jumlah nilai.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            sql_error: error.sql,
            suggestion: suggestion,
            error_code: error.code
        });
    }
});

// DELETE - Hapus kegiatan beserta semua data terkait dengan validasi berdasarkan role
router.delete('/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`🗑️ ${username} mencoba menghapus kegiatan ID: ${id}`);
    console.log('🔍 Access check:', {
        role: req.user.extractedRoles || req.user.role,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        userId: userId
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    let connection;
    try {
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const checkQuery = `
            SELECT kegiatan, user_id, status, ppk_id 
            FROM accounting.nominatif_kegiatan 
            ${where}
        `;
        
        const [kegiatanRows] = await db.query(checkQuery, params);
        
        if (kegiatanRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk dihapus`);
            
            let errorMessage = 'Kegiatan tidak ditemukan';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            } else if (req.user.isRegularUser) {
                errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }
        
        const kegiatanInfo = kegiatanRows[0];
        
        // Validasi: hanya boleh hapus jika status draft (untuk regular user)
        // PPK bisa hapus pengajuan yang ditujukan ke mereka (status diajukan)
        if (req.user.isRegularUser && kegiatanInfo.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${kegiatanInfo.status} tidak dapat dihapus. Hanya kegiatan dengan status draft yang dapat dihapus.`
            });
        }
        
        // Validasi untuk PPK: hanya bisa hapus pengajuan yang ditujukan ke mereka
        if (req.user.isPPK && kegiatanInfo.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `PPK hanya dapat menghapus pengajuan dengan status "diajukan". Status saat ini: ${kegiatanInfo.status}`
            });
        }
        
        console.log(`🗑️ Menghapus kegiatan: ${kegiatanInfo.kegiatan}`);
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        console.log(`📊 Mengumpulkan data terkait untuk dihapus...`);
        
        // Ambil semua pegawai ID untuk kegiatan ini
        const pegawaiQuery = `
            SELECT id FROM accounting.nominatif_pegawai 
            WHERE kegiatan_id = ?
        `;
        
        const [pegawaiRows] = await connection.query(pegawaiQuery, [id]);
        const pegawaiIds = pegawaiRows.map(p => p.id);
        
        console.log(`👥 Ditemukan ${pegawaiIds.length} pegawai untuk dihapus`);
        
        // Jika ada pegawai, ambil semua biaya ID
        let biayaIds = [];
        if (pegawaiIds.length > 0) {
            const placeholders = pegawaiIds.map(() => '?').join(',');
            
            const biayaQuery = `
                SELECT id FROM accounting.nominatif_biaya_kegiatan 
                WHERE pegawai_id IN (${placeholders})
            `;
            
            const [biayaRows] = await connection.query(biayaQuery, pegawaiIds);
            biayaIds = biayaRows.map(b => b.id);
            
            console.log(`💰 Ditemukan ${biayaIds.length} entri biaya untuk dihapus`);
        }
        
        // HAPUS SEMUA DATA DALAM URUTAN YANG BENAR
        let deletedCounts = {
            transportasi: 0,
            uang_harian: 0,
            penginapan: 0,
            biaya: 0,
            pegawai: 0,
            kegiatan: 0
        };
        
        // Hapus transportasi jika ada biaya
        if (biayaIds.length > 0) {
            const transportPlaceholders = biayaIds.map(() => '?').join(',');
            const deleteTransportQuery = `
                DELETE FROM accounting.nominatif_transportasi 
                WHERE biaya_id IN (${transportPlaceholders})
            `;
            
            const [transportResult] = await connection.query(deleteTransportQuery, biayaIds);
            deletedCounts.transportasi = transportResult.affectedRows;
            console.log(`✅ Menghapus ${deletedCounts.transportasi} data transportasi`);
        }
        
        // Hapus uang harian jika ada biaya
        if (biayaIds.length > 0) {
            const uangHarianPlaceholders = biayaIds.map(() => '?').join(',');
            const deleteUangHarianQuery = `
                DELETE FROM accounting.nominatif_uang_harian_items 
                WHERE biaya_id IN (${uangHarianPlaceholders})
            `;
            
            const [uangHarianResult] = await connection.query(deleteUangHarianQuery, biayaIds);
            deletedCounts.uang_harian = uangHarianResult.affectedRows;
            console.log(`✅ Menghapus ${deletedCounts.uang_harian} data uang harian`);
        }
        
        // Hapus penginapan jika ada biaya
        if (biayaIds.length > 0) {
            const penginapanPlaceholders = biayaIds.map(() => '?').join(',');
            const deletePenginapanQuery = `
                DELETE FROM accounting.nominatif_penginapan_items 
                WHERE biaya_id IN (${penginapanPlaceholders})
            `;
            
            const [penginapanResult] = await connection.query(deletePenginapanQuery, biayaIds);
            deletedCounts.penginapan = penginapanResult.affectedRows;
            console.log(`✅ Menghapus ${deletedCounts.penginapan} data penginapan`);
        }
        
        // Hapus biaya_kegiatan jika ada pegawai
        if (biayaIds.length > 0) {
            const biayaPlaceholders = biayaIds.map(() => '?').join(',');
            const deleteBiayaQuery = `
                DELETE FROM accounting.nominatif_biaya_kegiatan 
                WHERE id IN (${biayaPlaceholders})
            `;
            
            const [biayaResult] = await connection.query(deleteBiayaQuery, biayaIds);
            deletedCounts.biaya = biayaResult.affectedRows;
            console.log(`✅ Menghapus ${deletedCounts.biaya} data biaya`);
        }
        
        // Hapus pegawai
        if (pegawaiIds.length > 0) {
            const pegawaiPlaceholders = pegawaiIds.map(() => '?').join(',');
            const deletePegawaiQuery = `
                DELETE FROM accounting.nominatif_pegawai 
                WHERE id IN (${pegawaiPlaceholders})
            `;
            
            const [pegawaiResult] = await connection.query(deletePegawaiQuery, pegawaiIds);
            deletedCounts.pegawai = pegawaiResult.affectedRows;
            console.log(`✅ Menghapus ${deletedCounts.pegawai} data pegawai`);
        }
        
        // Hapus kegiatan utama
        const deleteKegiatanQuery = `
            DELETE FROM accounting.nominatif_kegiatan 
            WHERE id = ?
        `;
        
        const [kegiatanResult] = await connection.query(deleteKegiatanQuery, [id]);
        deletedCounts.kegiatan = kegiatanResult.affectedRows;
        
        if (deletedCounts.kegiatan === 0) {
            throw new Error('Gagal menghapus data kegiatan utama');
        }
        
        console.log(`✅ Menghapus data kegiatan utama`);
        
        // Commit transaction
        await connection.commit();
        connection.release();
        
        console.log(`🎉 Berhasil menghapus kegiatan ${kegiatanInfo.kegiatan} beserta semua data terkait`);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dihapus beserta semua data terkait',
            data: {
                kegiatan_id: parseInt(id),
                kegiatan_nama: kegiatanInfo.kegiatan,
                user_id: kegiatanInfo.user_id,
                status: kegiatanInfo.status,
                deleted_counts: deletedCounts,
                total_deleted: Object.values(deletedCounts).reduce((a, b) => a + b, 0),
                deleted_by: username,
                deleted_at: new Date().toISOString(),
                deleted_by_role: req.user.extractedRoles || req.user.role,
                user_type: {
                    isAdmin: req.user.isAdmin,
                    isPPK: req.user.isPPK,
                    isKabalai: req.user.isKabalai,
                    isRegularUser: req.user.isRegularUser
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error deleting kegiatan:', error);
        
        // Rollback jika ada error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        
        let errorMessage = 'Gagal menghapus data kegiatan';
        let suggestion = 'Coba lagi beberapa saat atau hubungi administrator.';
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Tidak dapat menghapus karena ada data yang terkait';
            suggestion = 'Pastikan tidak ada data lain yang masih terkait dengan kegiatan ini.';
        } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
            errorMessage = 'Timeout menghapus data';
            suggestion = 'Data sedang digunakan. Coba lagi beberapa saat.';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            suggestion: suggestion,
            error_code: error.code
        });
    }
});

// PUT - Update lengkap kegiatan beserta semua data dengan validasi berdasarkan role
router.put('/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`✏️ ${username} mengupdate kegiatan ID: ${id}`);
    console.log('🔍 Access check:', {
        role: req.user.extractedRoles || req.user.role,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        userId: userId
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    const {
        kegiatan: kegiatanNama,
        mak,
        realisasi_anggaran_sebelumnya,
        target_output_tahun,
        realisasi_output_sebelumnya,
        target_output_yg_akan_dicapai,
        kota_kab_kecamatan,
        rencana_tanggal_pelaksanaan,
        rencana_tanggal_pelaksanaan_akhir,
        pegawai = []
    } = req.body;
    
    // Validasi minimal
    if (!kegiatanNama || !mak) {
        return res.status(400).json({ 
            success: false,
            message: 'No Surat Tugas, Tanggal ST, Kegiatan dan MAK wajib diisi' 
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada DAN user memiliki akses
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const checkQuery = `
            SELECT id, kegiatan, user_id, status, ppk_id 
            FROM accounting.nominatif_kegiatan 
            ${where}
        `;
        
        const [checkRows] = await db.query(checkQuery, params);
        
        if (checkRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk update`);
            
            let errorMessage = 'Kegiatan tidak ditemukan';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            } else if (req.user.isRegularUser) {
                errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }
        
        const existingKegiatan = checkRows[0];
        
        // Validasi: hanya boleh edit jika status draft (untuk regular user)
        // PPK bisa edit jika status diajukan
        if (req.user.isRegularUser && existingKegiatan.status !== 'draft' && existingKegiatan.status !== 'dikembalikan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${existingKegiatan.status} tidak dapat diubah. Hanya kegiatan dengan status draft & dikembalikan yang dapat diubah.`
            });
        }
        
        if (req.user.isPPK && existingKegiatan.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `PPK hanya dapat mengubah pengajuan dengan status "diajukan". Status saat ini: ${existingKegiatan.status}`
            });
        }
        
        console.log(`✏️ Mengupdate kegiatan: ${existingKegiatan.kegiatan}`);
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Update data kegiatan utama
        let statusToSet = existingKegiatan.status;
        
        const updateKegiatanQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                kegiatan = ?,
                mak = ?,
                realisasi_anggaran_sebelumnya = ?,
                target_output_tahun = ?,
                realisasi_output_sebelumnya = ?,
                target_output_yg_akan_dicapai = ?,
                kota_kab_kecamatan = ?,
                rencana_tanggal_pelaksanaan = ?,
                rencana_tanggal_pelaksanaan_akhir = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const kegiatanValues = [
            kegiatanNama,
            mak,
            realisasi_anggaran_sebelumnya || null,
            target_output_tahun || null,
            realisasi_output_sebelumnya || null,
            target_output_yg_akan_dicapai || null,
            kota_kab_kecamatan || null,
            rencana_tanggal_pelaksanaan || null,
            rencana_tanggal_pelaksanaan_akhir || null,
            id
        ];
        
        const [kegiatanResult] = await connection.execute(updateKegiatanQuery, kegiatanValues);
        
        if (kegiatanResult.affectedRows === 0) {
            throw new Error('Gagal mengupdate data kegiatan');
        }
        
        console.log('✅ Data kegiatan utama berhasil diupdate');
        
        // HAPUS SEMUA DATA LAMA untuk mulai fresh
        console.log('🗑️ Menghapus data lama untuk diisi dengan data baru...');
        
        // Ambil semua pegawai ID lama
        const [oldPegawaiRows] = await connection.query(
            'SELECT id FROM accounting.nominatif_pegawai WHERE kegiatan_id = ?',
            [id]
        );
        
        const oldPegawaiIds = oldPegawaiRows.map(p => p.id);
        
        if (oldPegawaiIds.length > 0) {
            // Ambil semua biaya ID lama
            const placeholders = oldPegawaiIds.map(() => '?').join(',');
            const [oldBiayaRows] = await connection.query(
                `SELECT id FROM accounting.nominatif_biaya_kegiatan WHERE pegawai_id IN (${placeholders})`,
                oldPegawaiIds
            );
            
            const oldBiayaIds = oldBiayaRows.map(b => b.id);
            
            // Hapus data lama dalam urutan yang benar
            if (oldBiayaIds.length > 0) {
                const biayaPlaceholders = oldBiayaIds.map(() => '?').join(',');
                
                // Hapus transportasi
                await connection.query(
                    `DELETE FROM accounting.nominatif_transportasi WHERE biaya_id IN (${biayaPlaceholders})`,
                    oldBiayaIds
                );
                
                // Hapus uang harian
                await connection.query(
                    `DELETE FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (${biayaPlaceholders})`,
                    oldBiayaIds
                );
                
                // Hapus penginapan
                await connection.query(
                    `DELETE FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (${biayaPlaceholders})`,
                    oldBiayaIds
                );
                
                // Hapus biaya
                await connection.query(
                    `DELETE FROM accounting.nominatif_biaya_kegiatan WHERE id IN (${biayaPlaceholders})`,
                    oldBiayaIds
                );
            }
            
            // Hapus pegawai
            await connection.query(
                `DELETE FROM accounting.nominatif_pegawai WHERE id IN (${placeholders})`,
                oldPegawaiIds
            );
            
            console.log(`🗑️ Menghapus ${oldPegawaiIds.length} pegawai lama dan data terkait`);
        }
        
        // INSERT DATA BARU (pegawai dan biaya)
        let totalPegawai = 0;
        let totalBiaya = 0;
        
        if (pegawai && pegawai.length > 0) {
            console.log(`👥 Menambahkan ${pegawai.length} pegawai baru...`);
            
            for (const p of pegawai) {
                if (!p.nama) {
                    console.warn('⚠️ Pegawai tanpa nama, dilewati');
                    continue;
                }
                
                // Insert pegawai baru
                const insertPegawaiQuery = `
                    INSERT INTO accounting.nominatif_pegawai 
                    (kegiatan_id, nama, nip, jabatan, total_biaya) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const pegawaiValues = [
                    id,
                    p.nama,
                    p.nip || null,
                    p.jabatan || null,
                    p.total_biaya || 0
                ];
                
                const [pegawaiResult] = await connection.execute(insertPegawaiQuery, pegawaiValues);
                const pegawaiId = pegawaiResult.insertId;
                totalPegawai++;
                totalBiaya += parseFloat(p.total_biaya) || 0;
                
                console.log(`✅ Pegawai ditambahkan: ${p.nama}, ID: ${pegawaiId}`);
                
                // Insert data biaya jika ada
                if (p.biaya && p.biaya.length > 0) {
                    for (const biayaData of p.biaya) {
                        // Insert entri biaya
                        const biayaQuery = `
                            INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) 
                            VALUES (?, ?)
                        `;
                        
                        const [biayaResult] = await connection.execute(biayaQuery, [id, pegawaiId]);
                        const biayaId = biayaResult.insertId;
                        
                        // Insert transportasi
                        if (biayaData.transportasi && biayaData.transportasi.length > 0) {
                            for (const transport of biayaData.transportasi) {
                                if (!transport.trans) continue;
                                
                                const transportQuery = `
                                    INSERT INTO accounting.nominatif_transportasi 
                                    (biaya_id, trans, harga) 
                                    VALUES (?, ?, ?)
                                `;
                                
                                await connection.execute(transportQuery, [
                                    biayaId,
                                    transport.trans || '',
                                    transport.harga || 0
                                ]);
                            }
                        }
                        
                        // Insert uang harian
                        if (biayaData.uang_harian_items && biayaData.uang_harian_items.length > 0) {
                            for (const uangHarian of biayaData.uang_harian_items) {
                                if (!uangHarian.jenis) continue;
                                
                                const uangHarianQuery = `
                                    INSERT INTO accounting.nominatif_uang_harian_items 
                                    (biaya_id, jenis, qty, harga) 
                                    VALUES (?, ?, ?, ?)
                                `;
                                
                                await connection.execute(uangHarianQuery, [
                                    biayaId,
                                    uangHarian.jenis || '',
                                    uangHarian.qty || 0,
                                    uangHarian.harga || 0
                                ]);
                            }
                        }
                        
                        // Insert penginapan
                        if (biayaData.penginapan_items && biayaData.penginapan_items.length > 0) {
                            for (const penginapan of biayaData.penginapan_items) {
                                if (!penginapan.jenis) continue;
                                
                                const penginapanQuery = `
                                    INSERT INTO accounting.nominatif_penginapan_items 
                                    (biaya_id, jenis, qty, harga) 
                                    VALUES (?, ?, ?, ?)
                                `;
                                
                                await connection.execute(penginapanQuery, [
                                    biayaId,
                                    penginapan.jenis || '',
                                    penginapan.qty || 0,
                                    penginapan.harga || 0
                                ]);
                            }
                        }
                    }
                } else {
                    // Buat biaya entry kosong
                    const biayaQuery = `
                        INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) 
                        VALUES (?, ?)
                    `;
                    await connection.execute(biayaQuery, [id, pegawaiId]);
                }
            }
        }
        
        // Commit transaction
        await connection.commit();
        connection.release();
        
        console.log('✅ Update berhasil!');
        console.log(`📊 Summary: ${totalPegawai} pegawai, total biaya: ${totalBiaya}`);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil diperbarui',
            data: {
                id: parseInt(id),
                kegiatan: kegiatanNama,
                status: statusToSet,
                user_id: existingKegiatan.user_id,
                ppk_id: existingKegiatan.ppk_id,
                total_pegawai: totalPegawai,
                total_biaya: totalBiaya,
                updated_by: username,
                updated_by_role: req.user.extractedRoles || req.user.role,
                user_type: {
                    isAdmin: req.user.isAdmin,
                    isPPK: req.user.isPPK,
                    isKabalai: req.user.isKabalai,
                    isRegularUser: req.user.isRegularUser
                },
                updated_at: new Date().toISOString(),
                changes: {
                    kegiatan_updated: true,
                    pegawai_replaced: oldPegawaiIds.length,
                    pegawai_added: totalPegawai
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error updating kegiatan:', error);
        
        // Rollback jika ada error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        
        let errorMessage = 'Gagal mengupdate data kegiatan';
        let suggestion = 'Periksa data yang dikirim dan coba lagi.';
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'No Surat Tugas sudah terdaftar';
            suggestion = 'Gunakan No Surat Tugas yang berbeda.';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Data referensi tidak ditemukan';
            suggestion = 'Pastikan semua data referensi valid.';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            suggestion: suggestion,
            error_code: error.code
        });
    }
});

// PATCH - Update sebagian data kegiatan (tidak termasuk pegawai) dengan validasi berdasarkan role
router.patch('/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`✏️ ${username} mengupdate sebagian data kegiatan ID: ${id}`);
    console.log('🔍 Access check:', {
        role: req.user.extractedRoles || req.user.role,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        userId: userId
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    const {
        kegiatan: kegiatanNama,
        mak,
        realisasi_anggaran_sebelumnya,
        target_output_tahun,
        realisasi_output_sebelumnya,
        target_output_yg_akan_dicapai,
        kota_kab_kecamatan,
        rencana_tanggal_pelaksanaan,
        rencana_tanggal_pelaksanaan_akhir
    } = req.body;
    
    // Cek minimal ada satu field yang diupdate
    const hasUpdateData = Object.keys(req.body).some(key => 
        key !== 'pegawai' && req.body[key] !== undefined
    );
    
    if (!hasUpdateData) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada data yang diupdate'
        });
    }
    
    try {
        // Cek apakah kegiatan ada DAN user memiliki akses
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const checkQuery = `
            SELECT id, kegiatan, user_id, status, ppk_id 
            FROM accounting.nominatif_kegiatan 
            ${where}
        `;
        
        const [checkRows] = await db.query(checkQuery, params);
        
        if (checkRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk patch`);
            
            let errorMessage = 'Kegiatan tidak ditemukan';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            } else if (req.user.isRegularUser) {
                errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }
        
        const existingKegiatan = checkRows[0];
        
        // Validasi: hanya boleh edit jika status draft (untuk regular user)
        // PPK bisa edit jika status diajukan
        if (req.user.isRegularUser && existingKegiatan.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${existingKegiatan.status} tidak dapat diubah. Hanya kegiatan dengan status draft yang dapat diubah.`
            });
        }
        
        if (req.user.isPPK && existingKegiatan.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `PPK hanya dapat mengubah pengajuan dengan status "diajukan". Status saat ini: ${existingKegiatan.status}`
            });
        }
        
        // Bangun query update dinamis
        const updateFields = [];
        const updateValues = [];
        if (kegiatanNama !== undefined) {
            updateFields.push('kegiatan = ?');
            updateValues.push(kegiatanNama);
        }
        if (mak !== undefined) {
            updateFields.push('mak = ?');
            updateValues.push(mak);
        }
        if (realisasi_anggaran_sebelumnya !== undefined) {
            updateFields.push('realisasi_anggaran_sebelumnya = ?');
            updateValues.push(realisasi_anggaran_sebelumnya);
        }
        if (target_output_tahun !== undefined) {
            updateFields.push('target_output_tahun = ?');
            updateValues.push(target_output_tahun);
        }
        if (realisasi_output_sebelumnya !== undefined) {
            updateFields.push('realisasi_output_sebelumnya = ?');
            updateValues.push(realisasi_output_sebelumnya);
        }
        if (target_output_yg_akan_dicapai !== undefined) {
            updateFields.push('target_output_yg_akan_dicapai = ?');
            updateValues.push(target_output_yg_akan_dicapai);
        }
        if (kota_kab_kecamatan !== undefined) {
            updateFields.push('kota_kab_kecamatan = ?');
            updateValues.push(kota_kab_kecamatan);
        }
        if (rencana_tanggal_pelaksanaan !== undefined) {
            updateFields.push('rencana_tanggal_pelaksanaan = ?');
            updateValues.push(rencana_tanggal_pelaksanaan);
        }
        if (rencana_tanggal_pelaksanaan_akhir !== undefined) {
            updateFields.push('rencana_tanggal_pelaksanaan_akhir = ?');
            updateValues.push(rencana_tanggal_pelaksanaan_akhir);
        }
        
        // Tambahkan updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        // Tambahkan WHERE condition
        updateValues.push(id);
        
        // Bangun WHERE clause untuk update berdasarkan role
        let updateWhereClause;
        let updateWhereParams = [...updateValues];
        
        if (req.user.isAdmin || req.user.isKabalai) {
            updateWhereClause = 'WHERE id = ?';
        } else if (req.user.isPPK) {
            updateWhereClause = 'WHERE id = ? AND ppk_id = ?';
            updateWhereParams.push(userId);
        } else {
            updateWhereClause = 'WHERE id = ? AND user_id = ?';
            updateWhereParams.push(userId);
        }
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET ${updateFields.join(', ')}
            ${updateWhereClause}
        `;
        
        console.log('📝 Update query:', updateQuery);
        console.log('📝 Update values:', updateWhereParams);
        
        // Execute update
        const [result] = await db.execute(updateQuery, updateWhereParams);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau tidak ada perubahan'
            });
        }
        
        console.log(`✅ Berhasil mengupdate ${updateFields.length - 1} field untuk kegiatan ID: ${id}`);
        
        // Ambil data terbaru untuk response
        const getUpdatedQuery = `
            SELECT 
                k.*,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM accounting.nominatif_kegiatan k
            WHERE id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        
        res.status(200).json({
            success: true,
            message: 'Data kegiatan berhasil diperbarui',
            data: updatedRows[0],
            updated_fields: updateFields.filter(f => !f.includes('updated_at')),
            updated_by: username,
            updated_by_role: req.user.extractedRoles || req.user.role,
            user_type: {
                isAdmin: req.user.isAdmin,
                isPPK: req.user.isPPK,
                isKabalai: req.user.isKabalai,
                isRegularUser: req.user.isRegularUser
            },
            updated_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error patching kegiatan:', error);
        
        let errorMessage = 'Gagal mengupdate data kegiatan';
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'No Surat Tugas sudah terdaftar';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            error_code: error.code
        });
    }
});

// ========== PENGESAHAN DAN PERSETUJUAN ROUTES ==========

// POST - Kirim kegiatan ke PPK untuk persetujuan
router.post('/:id/kirim-ke-ppk', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const { ppk_id, ppk_nama, catatan } = req.body;
    
    console.log(`📤 ${username} mengirim kegiatan ID ${id} ke PPK`);
    console.log('📝 Data pengiriman:', { ppk_id, ppk_nama, catatan });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!ppk_id || !ppk_nama) {
        return res.status(400).json({
            success: false,
            message: 'PPK harus dipilih'
        });
    }
    
    // Hanya regular user yang bisa mengirim ke PPK
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat mengirim kegiatan ke PPK'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada dan user memiliki akses (hanya user biasa)
        const checkQuery = `
            SELECT id, kegiatan, user_id, status 
            FROM accounting.nominatif_kegiatan 
            WHERE id = ? AND user_id = ?
        `;
        
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan`);
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Validasi status - hanya bisa kirim jika status draft atau dikembalikan
        if (kegiatan.status !== 'draft' && kegiatan.status !== 'dikembalikan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan sudah dalam status "${kegiatan.status}". Hanya kegiatan dengan status "draft" atau "dikembalikan" yang dapat dikirim ke PPK.`
            });
        }
                
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Update status kegiatan
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'diajukan',
                ppk_id = ?,
                ppk_nama = ?,
                tanggal_diajukan = CURRENT_TIMESTAMP,
                catatan = COALESCE(?, catatan),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const [updateResult] = await connection.execute(updateQuery, [
            ppk_id,
            ppk_nama,
            catatan || null,
            id
        ]);
        
        if (updateResult.affectedRows === 0) {
            throw new Error('Gagal mengupdate status kegiatan');
        }
        
        // Simpan history status
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(historyQuery, [
            id,
            'diajukan',
            userId,
            username,
            req.user.extractedRoles ? req.user.extractedRoles.join(',') : req.user.role || 'user',
            `Diajukan ke PPK: ${ppk_nama}` + (catatan ? ` - Catatan: ${catatan}` : '')
        ]);
        
        // Commit transaction
        await connection.commit();
        connection.release();
        
        console.log(`✅ Kegiatan ${kegiatan.kegiatan} berhasil dikirim ke PPK ${ppk_nama}`);
        
        // Ambil data terbaru untuk response
        const getUpdatedQuery = `
            SELECT 
                k.*,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan_format,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dikirim ke PPK',
            data: {
                kegiatan: updatedRows[0],
                pengajuan: {
                    diajukan_oleh: username,
                    ppk_tujuan: ppk_nama,
                    tanggal_diajukan: new Date().toISOString(),
                    catatan: catatan
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error mengirim ke PPK:', error);
        
        // Rollback jika ada error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim kegiatan ke PPK',
            error: error.message
        });
    }
});



// GET - Daftar pengajuan untuk PPK
router.get('/ppk/pengajuan', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`📋 ${username} mengakses daftar pengajuan sebagai PPK`);
    
    // Cek apakah user adalah PPK
    if (!req.user.isPPK) {
        return res.status(403).json({
            success: false,
            message: 'Hanya PPK yang dapat mengakses daftar pengajuan'
        });
    }
    
    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        // Build WHERE clause - PPK hanya melihat data dengan ppk_id mereka
        let whereClause = 'WHERE k.ppk_id = ?';
        let params = [userId];
        
        if (status && status !== 'all') {
            whereClause += ' AND k.status = ?';
            params.push(status);
        } else {
            // Default: hanya tampilkan yang status diajukan
            whereClause += ' AND k.status = "diajukan"';
        }
        
        if (search) {
            whereClause += ' AND (k.kegiatan LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam);
        }
        
        // Query untuk menghitung total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM accounting.nominatif_kegiatan k
            ${whereClause}
        `;
        
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;
        
        // Query untuk data
        const dataQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.mak,
                k.realisasi_anggaran_sebelumnya,
                k.target_output_tahun,
                k.realisasi_output_sebelumnya,
                k.target_output_yg_akan_dicapai,
                k.kota_kab_kecamatan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                k.status,
                k.ppk_id,
                k.ppk_nama,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                k.catatan,
                k.user_id,
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                
                -- Hitung total pegawai dan biaya
                (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_pegawai,
                (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
                
            FROM accounting.nominatif_kegiatan k
            ${whereClause}
            ORDER BY k.tanggal_diajukan DESC
            LIMIT ? OFFSET ?
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const [rows] = await db.query(dataQuery, params);
        
        console.log(`✅ Ditemukan ${rows.length} pengajuan untuk PPK ${username}`);
        
        res.status(200).json({
            success: true,
            message: 'Daftar pengajuan berhasil diambil',
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                status: status || 'diajukan',
                search: search || ''
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching pengajuan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar pengajuan',
            error: error.message
        });
    }
});

// POST - PPK menyetujui pengajuan
router.post('/:id/approve', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const { catatan, approved_by, approved_by_id } = req.body;
    
    console.log(`✅ PPK ${username} mengetahui kegiatan ID ${id}`);
    console.log('📝 Approval data:', { approved_by, approved_by_id, catatan });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    // Cek apakah user adalah PPK
    if (!req.user.isPPK) {
        return res.status(403).json({
            success: false,
            message: 'Hanya PPK yang dapat menyetujui pengajuan'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada dan ditugaskan ke PPK ini
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.ppk_id,
                k.ppk_nama,
                k.user_id,
                k.tanggal_diajukan,
                COUNT(p.id) as total_pegawai,
                COALESCE(SUM(p.total_biaya), 0) as total_biaya
            FROM accounting.nominatif_kegiatan k
            LEFT JOIN accounting.nominatif_pegawai p ON k.id = p.kegiatan_id
            WHERE k.id = ? AND k.ppk_id = ?
            GROUP BY k.id
        `;
        
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau tidak ditugaskan ke PPK Anda'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Validasi status - hanya bisa approve jika status diajukan
        if (kegiatan.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan sudah dalam status ${kegiatan.status}. Hanya kegiatan dengan status "diajukan" yang dapat disetujui.`
            });
        }
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Update status menjadi disetujui
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'diketahui',
                tanggal_disetujui = CURRENT_TIMESTAMP,
                catatan = COALESCE(?, catatan),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND ppk_id = ?
        `;
        
       const [updateResult] = await connection.execute(updateQuery, [
            catatan || null, // Hanya catatan saja, atau null jika tidak ada
            id,
            userId
        ]);
                
        if (updateResult.affectedRows === 0) {
            throw new Error('Gagal mengupdate status kegiatan');
        }
        
        console.log(`✅ Status berhasil diupdate untuk kegiatan ID: ${id}`);
        
        // Simpan history status
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(historyQuery, [
            id,
            'diketahui',
            userId,
            username || approved_by || 'PPK',
            'ppk',
            `Diketahui oleh PPK` + (catatan ? ` - Catatan: ${catatan}` : '')
        ]);
        
        console.log(`✅ History status berhasil disimpan`);
        
        // Commit transaction
        await connection.commit();
        connection.release();
        
        console.log(`🎉 Kegiatan "${kegiatan.kegiatan}" berhasil disetujui oleh PPK ${username}`);
        
        // Ambil data terbaru untuk response
        const getUpdatedQuery = `
            SELECT 
                k.*,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan_format,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format,
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at_format,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format,
                (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_pegawai,
                (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        
        const updatedKegiatan = updatedRows[0];
        
        const responseData = {
            success: true,
            message: 'Kegiatan berhasil diketahui',
            data: {
                kegiatan: updatedKegiatan,
                approval_details: {
                    approved_by: username || approved_by,
                    approved_by_id: userId || approved_by_id,
                    approved_at: new Date().toISOString(),
                    catatan: catatan,
                    ppk_nama: updatedKegiatan.ppk_nama,
                    total_pegawai: updatedKegiatan.total_pegawai,
                    total_biaya: updatedKegiatan.total_biaya
                },
                notification: {
                    type: 'success',
                    title: 'Persetujuan Berhasil',
                    message: `Kegiatan "${updatedKegiatan.kegiatan}" telah diketahui`
                }
            }
        };
        
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error('❌ Error approving kegiatan:', error);
        
        // Rollback jika ada error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        
        let errorMessage = 'Gagal menyetujui kegiatan';
        let suggestion = 'Silakan coba lagi atau hubungi administrator.';
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'Data duplikat ditemukan';
            suggestion = 'Periksa kembali data yang dikirim.';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Data referensi tidak valid';
            suggestion = 'Pastikan semua data referensi valid.';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            suggestion: suggestion,
            error_code: error.code,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// POST - PPK menolak/mengembalikan pengajuan
router.post('/:id/reject', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const { catatan, rejected_by, rejected_by_id } = req.body;
    
    console.log(`❌ PPK ${username} menolak/mengembalikan kegiatan ID ${id}`);
    console.log('📝 Rejection data:', { rejected_by, rejected_by_id, catatan });
    console.log('👤 User info:', { userId, username, isPPK: req.user.isPPK });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!catatan || catatan.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Catatan wajib diisi ketika menolak pengajuan'
        });
    }
    
    // Cek apakah user adalah PPK
    if (!req.user.isPPK) {
        return res.status(403).json({
            success: false,
            message: 'Hanya PPK yang dapat menolak pengajuan'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.ppk_id,
                k.ppk_nama,
                k.user_id,
                k.tanggal_diajukan
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        console.log('🔍 Mengecek kegiatan dengan query:', checkQuery, [id]);
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        console.log('📊 Data kegiatan ditemukan:', {
            id: kegiatan.id,
            kegiatan: kegiatan.kegiatan,
            status: kegiatan.status,
            ppk_id: kegiatan.ppk_id,
            current_user_id: userId
        });
        
        // Cek apakah PPK ini yang ditugaskan untuk kegiatan ini
        if (kegiatan.ppk_id && kegiatan.ppk_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menolak kegiatan ini. Kegiatan ini ditugaskan ke PPK lain.'
            });
        }
        
        // Validasi status - hanya bisa reject jika status diajukan
        if (kegiatan.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan sudah dalam status "${kegiatan.status}". Hanya kegiatan dengan status "diajukan" yang dapat dikembalikan.`
            });
        }
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update status menjadi 'dikembalikan' - HAPUS KOMENTAR DALAM SQL
            const updateQuery = `
                UPDATE accounting.nominatif_kegiatan 
                SET 
                    status = 'dikembalikan',
                    catatan = ?,
                    tanggal_dikembalikan = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const fullCatatan = `Ditolak oleh PPK: ${catatan}`;
            
            console.log('📝 Update query:', updateQuery);
            console.log('📝 Update values:', [fullCatatan, id]);
            
            const [updateResult] = await connection.execute(updateQuery, [
                fullCatatan,
                id
            ]);
            
            console.log('✅ Update result:', updateResult);
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Gagal mengupdate status kegiatan. Tidak ada baris yang terpengaruh.');
            }
            
            console.log(`✅ Status berhasil diupdate menjadi "dikembalikan" untuk kegiatan ID: ${id}`);
            
            // Simpan history status
            const historyQuery = `
                INSERT INTO accounting.nominatif_status_history 
                (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            await connection.execute(historyQuery, [
                id,
                'dikembalikan',
                userId,
                username || rejected_by || 'PPK',
                'ppk',
                `Alasan: ${catatan}`
            ]);
            
            console.log(`✅ History status berhasil disimpan`);
            
            // Commit transaction
            await connection.commit();
            console.log(`✅ Transaction berhasil di-commit`);
            
            console.log(`📤 Kegiatan "${kegiatan.kegiatan}" berhasil ditolak oleh PPK ${username}`);
            
            // Ambil data terbaru untuk response
            const getUpdatedQuery = `
                SELECT 
                    k.*,
                    DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan_format,
                    DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format,
                    DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format,
                    DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at_format,
                    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
                FROM accounting.nominatif_kegiatan k
                WHERE k.id = ?
            `;
            
            const [updatedRows] = await db.query(getUpdatedQuery, [id]);
            const updatedKegiatan = updatedRows[0];
            
            // Buat response data yang lengkap
            const responseData = {
                success: true,
                message: 'Kegiatan berhasil ditolak dengan status dikembalikan',
                data: {
                    kegiatan: updatedKegiatan,
                    rejection_details: {
                        rejected_by: username || rejected_by,
                        rejected_by_id: userId || rejected_by_id,
                        rejected_at: new Date().toISOString(),
                        catatan: catatan,
                        full_catatan: fullCatatan,
                        ppk_nama: updatedKegiatan.ppk_nama,
                        status_baru: 'dikembalikan',
                        keterangan: 'Status dikembalikan. Pengaju dapat memperbaiki dan mengirim ulang.'
                    }
                }
            };
            
            res.status(200).json(responseData);
            
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            await connection.rollback();
            throw transactionError;
        } finally {
            if (connection) {
                connection.release();
            }
        }
        
    } catch (error) {
        console.error('❌ Error rejecting kegiatan:', error);
        
        // Berikan pesan error yang lebih spesifik
        let errorMessage = 'Gagal menolak pengajuan';
        let statusCode = 500;
        
        if (error.code === 'ER_PARSE_ERROR') {
            errorMessage = 'Kesalahan sintaks SQL pada server';
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            errorMessage = 'Tabel tidak ditemukan di database';
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Field tidak ditemukan di tabel';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            sqlErrorCode: error.code,
            sqlMessage: error.sqlMessage
        });
    }
});


/**
 * @route   POST /api/kegiatan/:id/reject-kabalai
 * @desc    Kabalai menolak/mengembalikan kegiatan
 * @access  Private (Kabalai only)
 */
router.post('/:id/reject-kabalai', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const { catatan_kabalai, rejected_by, rejected_by_id } = req.body;
    
    console.log(`❌ Kabalai ${username} menolak/mengembalikan kegiatan ID ${id}`);
    console.log('📝 Rejection data:', { rejected_by, rejected_by_id, catatan_kabalai });
    console.log('👤 User info:', { userId, username, isKabalai: req.user.isKabalai });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!catatan_kabalai || catatan_kabalai.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Catatan wajib diisi ketika menolak pengajuan'
        });
    }
    
    // Cek apakah user adalah Kabalai
    if (!req.user.isKabalai) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat menolak pengajuan'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.diketahui_oleh,
                k.user_id,
                k.tanggal_disetujui
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        console.log('🔍 Mengecek kegiatan dengan query:', checkQuery, [id]);
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        console.log('📊 Data kegiatan ditemukan:', {
            id: kegiatan.id,
            kegiatan: kegiatan.kegiatan,
            status: kegiatan.status,
            diketahui_id: kegiatan.diketahui_id,
            current_user_id: userId
        });
        
        // Cek apakah Kabalai ini yang ditugaskan untuk kegiatan ini
        if (kegiatan.diketahui_id && kegiatan.diketahui_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menolak kegiatan ini. Kegiatan ini ditugaskan ke Kabalai lain.'
            });
        }
        
        // Validasi status - hanya bisa reject jika status disetujui
        if (kegiatan.status !== 'diketahui') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan sudah dalam status "${kegiatan.status}". Hanya kegiatan dengan status "diketahui" yang dapat dikembalikan oleh Kabalai.`
            });
        }
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update status menjadi 'dikembalikan' - HAPUS KOMENTAR DALAM SQL
            const updateQuery = `
                UPDATE accounting.nominatif_kegiatan 
                SET 
                    status = 'dikembalikan',
                    catatan_kabalai = ?,
                    tanggal_dikembalikan = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const fullCatatan = `${catatan_kabalai}`;
            
            console.log('📝 Update query:', updateQuery);
            console.log('📝 Update values:', [fullCatatan, id]);
            
            const [updateResult] = await connection.execute(updateQuery, [
                fullCatatan,
                id
            ]);
            
            console.log('✅ Update result:', updateResult);
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Gagal mengupdate status kegiatan. Tidak ada baris yang terpengaruh.');
            }
            
            console.log(`✅ Status berhasil diupdate menjadi "dikembalikan" untuk kegiatan ID: ${id}`);
            
            // Simpan history status
            const historyQuery = `
                INSERT INTO accounting.nominatif_status_history 
                (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            await connection.execute(historyQuery, [
                id,
                'dikembalikan',
                userId,
                username || rejected_by || 'Kabalai',
                'kabalai',
                `Alasan: ${catatan_kabalai}`
            ]);
            
            console.log(`✅ History status berhasil disimpan`);
            
            // Commit transaction
            await connection.commit();
            console.log(`✅ Transaction berhasil di-commit`);
            
            console.log(`📤 Kegiatan "${kegiatan.kegiatan}" berhasil ditolak oleh Kabalai ${username}`);
            
            // Ambil data terbaru untuk response
            const getUpdatedQuery = `
                SELECT 
                    k.*,
                    DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan_format,
                    DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format,
                    DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui_format,
                    DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at_format,
                    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
                FROM accounting.nominatif_kegiatan k
                WHERE k.id = ?
            `;
            
            const [updatedRows] = await db.query(getUpdatedQuery, [id]);
            const updatedKegiatan = updatedRows[0];
            
            // Buat response data yang lengkap
            const responseData = {
                success: true,
                message: 'Kegiatan berhasil ditolak dengan status dikembalikan',
                data: {
                    kegiatan: updatedKegiatan,
                    rejection_details: {
                        rejected_by: username || rejected_by,
                        rejected_by_id: userId || rejected_by_id,
                        rejected_at: new Date().toISOString(),
                        catatan_kabalai: catatan_kabalai,
                        full_catatan_kabalai: fullCatatan,
                        kabalai_nama: updatedKegiatan.diketahui_oleh,
                        status_baru: 'dikembalikan',
                        keterangan: 'Status dikembalikan oleh Kabalai. Pengaju dapat memperbaiki dan mengirim ulang ke PPK.'
                    }
                }
            };
            
            res.status(200).json(responseData);
            
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            await connection.rollback();
            throw transactionError;
        } finally {
            if (connection) {
                connection.release();
            }
        }
        
    } catch (error) {
        console.error('❌ Error rejecting kegiatan by Kabalai:', error);
        
        // Berikan pesan error yang lebih spesifik
        let errorMessage = 'Gagal menolak pengajuan';
        let statusCode = 500;
        
        if (error.code === 'ER_PARSE_ERROR') {
            errorMessage = 'Kesalahan sintaks SQL pada server';
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            errorMessage = 'Tabel tidak ditemukan di database';
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Field tidak ditemukan di tabel';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            sqlErrorCode: error.code,
            sqlMessage: error.sqlMessage
        });
    }
});


// POST - Kabalai mengisi form menyetujui untuk kegiatan yang sudah diketahui PPK
router.post('/:id/menyetujui', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const {
        catatan_kabalai,
        tanggal_mengetahui,
        diketahui_oleh,
        diketahui_oleh_id
    } = req.body;
    
    console.log(`👔 Kabalai ${username} mengisi form mengetahui untuk kegiatan ID ${id}`);
    console.log('📝 Data mengetahui:', {
        tanggal_mengetahui,
        catatan_kabalai
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
   
    // Cek apakah user adalah Kabalai
    if (!req.user.isKabalai) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat mengisi form Menyetujui'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada dan statusnya 'disetujui'
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.ppk_nama,
                k.tanggal_disetujui,
                DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Validasi status - hanya bisa diketahui jika status disetujui oleh PPK
        if (kegiatan.status !== 'diketahui') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${kegiatan.status} tidak dapat disetujui oleh Kabalai. Hanya kegiatan dengan status "diketahui" oleh PPK yang dapat disetujui.`
            });
        }
        
      
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Update data mengetahui pada kegiatan
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                catatan_kabalai = ?,
                tanggal_diketahui = ?,
                status = 'disetujui',
                diketahui_oleh = ?,
                diketahui_oleh_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'diketahui'
        `;
        
        // Gunakan tanggal sekarang jika tidak ada input
        const tanggalDiketahui = tanggal_mengetahui || new Date().toISOString().split('T')[0];
        
        const [updateResult] = await connection.execute(updateQuery, [
            catatan_kabalai || null,
            tanggalDiketahui,
            diketahui_oleh || username,
            diketahui_oleh_id || userId,
            id
        ]);
        
        if (updateResult.affectedRows === 0) {
            throw new Error('Gagal mengupdate data mengetahui. Pastikan status masih "diketahui".');
        }
        
        console.log(`✅ Data mengetahui berhasil disimpan untuk kegiatan ID: ${id}`);
        
        // Simpan history status
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const catatanHistory = `Disetujui oleh Kabalai: ${catatan_kabalai ? ` - Catatan: ${catatan_kabalai}` : ''}`;
        
        await connection.execute(historyQuery, [
            id,
            'disetujui',
            userId,
            username,
            'kabalai',
            catatanHistory
        ]);
        
        console.log(`✅ History status "disetujui" berhasil disimpan`);
        
        // Commit transaction
        await connection.commit();
        connection.release();
        
        console.log(`🎉 Kabalai  berhasil mengetahui kegiatan "${kegiatan.kegiatan}"`);
        
        // Ambil data terbaru untuk response
        const getUpdatedQuery = `
            SELECT 
                k.*,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_format,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir_format,
                DATE_FORMAT(k.tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan_format,
                DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format,
                DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui_format,
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at_format,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format,
                (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_pegawai,
                (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        
        const updatedKegiatan = updatedRows[0];
        
        // Buat response data yang lengkap
        const responseData = {
            success: true,
            message: 'Kegiatan berhasil diketahui oleh Kabalai',
            data: {
                kegiatan: updatedKegiatan,
                mengetahui_details: {
                    catatan_kabalai: catatan_kabalai,
                    tanggal_diketahui: tanggalDiketahui,
                    diketahui_oleh: username,
                    diketahui_oleh_id: userId,
                    status_sebelum: 'diketahui',
                    status_setelah: 'disetujui'
                },
                approval_chain: {
                    dibuat_oleh: updatedKegiatan.user_id,
                    disetujui_oleh_ppk: updatedKegiatan.ppk_nama,
                    status_akhir: 'disetujui'
                }
            },
            notification: {
                type: 'success',
                title: 'Form Mengetahui Berhasil',
                message: `Kegiatan "${updatedKegiatan.kegiatan}" telah diketahui oleh Kabalai`
            }
        };
        
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error('❌ Error dalam proses mengetahui:', error);
        
        // Rollback jika ada error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('❌ Error rollback:', rollbackError);
            }
        }
        
        let errorMessage = 'Gagal menyimpan data mengetahui';
        let suggestion = 'Silakan coba lagi atau hubungi administrator.';
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'Data duplikat ditemukan';
            suggestion = 'Periksa kembali data yang dikirim.';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Data referensi tidak valid';
            suggestion = 'Pastikan semua data referensi valid.';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            suggestion: suggestion,
            error_code: error.code,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


// PATCH - Update data mengetahui (hanya untuk kabalai yang sama)
router.patch('/:id/update-disetujui', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const {
        catatan_kabalai,
        tanggal_mengetahui
    } = req.body;
    
    console.log(`✏️ Kabalai ${username} mengupdate data mengetahui untuk kegiatan ID ${id}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    // Cek apakah user adalah Kabalai
    if (!req.user.isKabalai) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat mengupdate data mengetahui'
        });
    }
    
    // Cek minimal ada satu field yang diupdate
    const hasUpdateData = Object.keys(req.body).some(key => 
        ['catatan_kabalai', 'tanggal_mengetahui'].includes(key) && req.body[key] !== undefined
    );
    
    if (!hasUpdateData) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada data yang diupdate'
        });
    }
    
    try {
        // Cek apakah kegiatan sudah diketahui dan oleh kabalai ini
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.diketahui_oleh_id
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ? AND k.status = 'diketahui'
        `;
        
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau belum diketahui'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Validasi: hanya kabalai yang sama yang bisa mengupdate
        if (kegiatan.diketahui_oleh_id && kegiatan.diketahui_oleh_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Hanya kabalai yang mengetahui kegiatan ini yang dapat mengupdate data'
            });
        }
        
        // Bangun query update dinamis
        const updateFields = [];
        const updateValues = [];
        
        if (catatan_kabalai !== undefined) {
            updateFields.push('catatan_kabalai = ?');
            updateValues.push(catatan_kabalai);
        }
        
        if (tanggal_mengetahui !== undefined) {
            updateFields.push('tanggal_diketahui = ?');
            updateValues.push(tanggal_mengetahui);
        }
        
        // Tambahkan updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        // Tambahkan WHERE condition
        updateValues.push(id);
        
        // Execute update
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET ${updateFields.join(', ')}
            WHERE id = ? AND status = 'disetujui'
        `;
        
        console.log('📝 Update query:', updateQuery);
        console.log('📝 Update values:', [...updateValues, id]);
        
        const [updateResult] = await db.execute(updateQuery, [...updateValues, id]);
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau gagal diupdate'
            });
        }
        
        console.log(`✅ Berhasil mengupdate ${updateFields.length - 1} field untuk data mengetahui`);
        
        // Ambil data terbaru untuk response
        const getUpdatedQuery = `
            SELECT 
                k.*,
                DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui_format,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        
        res.status(200).json({
            success: true,
            message: 'Data mengetahui berhasil diperbarui',
            data: updatedRows[0],
            updated_fields: updateFields.filter(f => !f.includes('updated_at')),
            updated_by: username,
            updated_at: new Date().toISOString(),
            warning: 'Perubahan pada data mengetahui akan tercatat dalam sistem'
        });
        
    } catch (error) {
        console.error('❌ Error updating mengetahui data:', error);
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate data mengetahui',
            error: error.message
        });
    }
});

// ========== ROUTES TAMBAHAN ==========

// GET - History status kegiatan
router.get('/:id/history', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    
    console.log(`📜 ${username} mengakses history status kegiatan ID: ${id}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    try {
        // Cek akses ke kegiatan berdasarkan role
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const checkQuery = `
            SELECT id FROM accounting.nominatif_kegiatan 
            ${where}
        `;
        
        const [checkRows] = await db.query(checkQuery, params);
        
        if (checkRows.length === 0) {
            let errorMessage = 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses';
            if (req.user.isPPK) {
                errorMessage = 'Kegiatan tidak ditemukan atau bukan pengajuan untuk PPK Anda';
            }
            
            return res.status(404).json({
                success: false,
                message: errorMessage
            });
        }
        
        // Ambil history status
        const historyQuery = `
            SELECT 
                id,
                status,
                user_id,
                user_nama,
                user_role,
                catatan,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM accounting.nominatif_status_history
            WHERE kegiatan_id = ?
            ORDER BY created_at DESC
        `;
        
        const [historyRows] = await db.query(historyQuery, [id]);
        
        console.log(`✅ History ditemukan: ${historyRows.length} entri`);
        
        res.status(200).json({
            success: true,
            message: 'History status berhasil diambil',
            data: historyRows,
            count: historyRows.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil history status',
            error: error.message
        });
    }
});

// GET - Statistik persetujuan untuk dashboard PPK
router.get('/ppk/statistics', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`📊 ${username} mengakses statistik persetujuan PPK`);
    
    // Cek apakah user adalah PPK
    if (!req.user.isPPK) {
        return res.status(403).json({
            success: false,
            message: 'Hanya PPK yang dapat mengakses statistik persetujuan'
        });
    }
    
    try {
        const { period = 'month' } = req.query;
        
        // Tentukan tanggal filter berdasarkan periode
        let dateFilter = '';
        let dateParams = [userId];
        
        switch (period) {
            case 'today':
                dateFilter = 'AND DATE(k.tanggal_diajukan) = CURDATE()';
                break;
            case 'week':
                dateFilter = 'AND k.tanggal_diajukan >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                break;
            case 'month':
                dateFilter = 'AND k.tanggal_diajukan >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                break;
            case 'all':
            default:
                dateFilter = '';
                break;
        }
        
        // Query untuk statistik
        const statsQuery = `
            SELECT 
                -- Total pengajuan
                COUNT(*) as total_pengajuan,
                
                -- Berdasarkan status
                SUM(CASE WHEN k.status = 'diajukan' THEN 1 ELSE 0 END) as menunggu_persetujuan,
                SUM(CASE WHEN k.status = 'disetujui' THEN 1 ELSE 0 END) as disetujui,
                SUM(CASE WHEN k.status = 'dikembalikan' THEN 1 ELSE 0 END) as dikembalikan,
                SUM(CASE WHEN k.status = 'draft' THEN 1 ELSE 0 END) as draft,
                
                -- Statistik keuangan
                COALESCE(SUM(CASE WHEN k.status = 'diajukan' THEN p.total_biaya ELSE 0 END), 0) as total_biaya_menunggu,
                COALESCE(SUM(CASE WHEN k.status = 'disetujui' THEN p.total_biaya ELSE 0 END), 0) as total_biaya_disetujui,
                COALESCE(SUM(CASE WHEN k.status = 'dikembalikan' THEN p.total_biaya ELSE 0 END), 0) as total_biaya_dikembalikan,
                
                -- Rata-rata waktu persetujuan (dalam jam)
                AVG(CASE WHEN k.status = 'disetujui' 
                    THEN TIMESTAMPDIFF(HOUR, k.tanggal_diajukan, k.tanggal_disetujui) 
                    ELSE NULL 
                END) as rata_waktu_persetujuan_jam,
                
                -- Pengajuan terbaru
                MAX(k.tanggal_diajukan) as pengajuan_terbaru
                
            FROM accounting.nominatif_kegiatan k
            LEFT JOIN (
                SELECT 
                    kegiatan_id,
                    SUM(total_biaya) as total_biaya
                FROM accounting.nominatif_pegawai
                GROUP BY kegiatan_id
            ) p ON k.id = p.kegiatan_id
            WHERE k.ppk_id = ? ${dateFilter}
        `;
        
        const [statsRows] = await db.query(statsQuery, dateParams);
        
        if (statsRows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Statistik tidak ditemukan',
                data: {
                    total_pengajuan: 0,
                    menunggu_persetujuan: 0,
                    disetujui: 0,
                    dikembalikan: 0,
                    draft: 0,
                    total_biaya_menunggu: 0,
                    total_biaya_disetujui: 0,
                    total_biaya_dikembalikan: 0,
                    rata_waktu_persetujuan_jam: 0,
                    pengajuan_terbaru: null
                },
                period: period
            });
        }
        
        const statistics = statsRows[0];
        
        // Format response
        const responseData = {
            success: true,
            message: 'Statistik persetujuan berhasil diambil',
            data: {
                overview: {
                    total_pengajuan: parseInt(statistics.total_pengajuan) || 0,
                    menunggu_persetujuan: parseInt(statistics.menunggu_persetujuan) || 0,
                    disetujui: parseInt(statistics.disetujui) || 0,
                    dikembalikan: parseInt(statistics.dikembalikan) || 0,
                    draft: parseInt(statistics.draft) || 0
                },
                financial: {
                    total_biaya_menunggu: parseFloat(statistics.total_biaya_menunggu) || 0,
                    total_biaya_disetujui: parseFloat(statistics.total_biaya_disetujui) || 0,
                    total_biaya_dikembalikan: parseFloat(statistics.total_biaya_dikembalikan) || 0,
                    total_all: parseFloat(statistics.total_biaya_menunggu || 0) + 
                              parseFloat(statistics.total_biaya_disetujui || 0) + 
                              parseFloat(statistics.total_biaya_dikembalikan || 0)
                },
                performance: {
                    rata_waktu_persetujuan_jam: parseFloat(statistics.rata_waktu_persetujuan_jam) || 0,
                    pengajuan_terbaru: statistics.pengajuan_terbaru,
                    periode: period
                },
                percentages: {
                    disetujui_pct: statistics.total_pengajuan > 0 ? 
                        (parseInt(statistics.disetujui) / parseInt(statistics.total_pengajuan) * 100).toFixed(1) : 0,
                    dikembalikan_pct: statistics.total_pengajuan > 0 ? 
                        (parseInt(statistics.dikembalikan) / parseInt(statistics.total_pengajuan) * 100).toFixed(1) : 0,
                    menunggu_pct: statistics.total_pengajuan > 0 ? 
                        (parseInt(statistics.menunggu_persetujuan) / parseInt(statistics.total_pengajuan) * 100).toFixed(1) : 0
                }
            },
            meta: {
                ppk_id: userId,
                ppk_nama: username,
                period: period,
                generated_at: new Date().toISOString()
            }
        };
        
        console.log(`✅ Statistik berhasil diambil untuk PPK ${username} (periode: ${period})`);
        
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error('❌ Error fetching statistics:', error);
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik',
            error: error.message
        });
    }
});

// ========== SURAT TUGAS ROUTES ==========
// POST - Rekam Surat Tugas (hanya untuk status 'diketahui' dan user biasa)
router.post('/:id/surat-tugas', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    const { no_st, tgl_st } = req.body;
    
    console.log(`📝 ${username} merekam surat tugas untuk kegiatan ID ${id}`);
    console.log('📋 Data surat tugas:', { no_st, tgl_st });
    console.log('👤 User info:', {
        roles: req.user.extractedRoles,
        isRegularUser: req.user.isRegularUser,
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    // Validasi input
    if (!no_st || !tgl_st) {
        return res.status(400).json({
            success: false,
            message: 'No ST dan Tanggal ST wajib diisi'
        });
    }
    
    // Hanya regular user yang bisa merekam surat tugas
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat merekam surat tugas'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada dan user memiliki akses
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.user_id,
                k.no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format,
                k.ppk_nama,
                k.catatan_kabalai
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ? AND k.user_id = ?
        `;
        
        console.log('🔍 Checking kegiatan:', checkQuery, [id, userId]);
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk user ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses'
            });
        }
        
        const kegiatan = checkRows[0];
        console.log('📊 Data kegiatan ditemukan:', {
            id: kegiatan.id,
            kegiatan: kegiatan.kegiatan,
            status: kegiatan.status,
            no_st: kegiatan.no_st,
            tgl_st: kegiatan.tgl_st_format,
            user_id: kegiatan.user_id,
            ppk_nama: kegiatan.ppk_nama
        });
        
        // PERUBAHAN 1: Validasi status - bisa rekam ST jika status 'disetujui' dan belum ada ST
        if (kegiatan.status !== 'disetujui') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status "${kegiatan.status}" tidak dapat direkam surat tugas. Hanya kegiatan dengan status "disetujui" yang dapat direkam surat tugas.`
            });
        }
        
        // Cek apakah sudah ada ST
        if (kegiatan.no_st) {
            return res.status(400).json({
                success: false,
                message: 'Surat Tugas sudah direkam sebelumnya'
            });
        }
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // PERUBAHAN 2: Update data surat tugas DAN status menjadi 'selesai'
            const updateQuery = `
                UPDATE accounting.nominatif_kegiatan 
                SET 
                    no_st = ?,
                    tgl_st = ?,
                    status = 'selesai',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `;
            
            console.log('📝 Executing update:', updateQuery, [no_st.trim(), tgl_st, id, userId]);
            
            const [updateResult] = await connection.execute(updateQuery, [
                no_st.trim(),
                tgl_st,
                id,
                userId
            ]);
            
            console.log('✅ Update result:', {
                affectedRows: updateResult.affectedRows,
                changedRows: updateResult.changedRows
            });
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Gagal merekam surat tugas. Tidak ada baris yang terpengaruh.');
            }
            
            // Simpan history - PERUBAHAN 3: Simpan status 'selesai' di history
            const historyQuery = `
                INSERT INTO accounting.nominatif_status_history 
                (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const catatanHistory = `Surat Tugas direkam: No. ${no_st}, Tgl. ${tgl_st} - Status: Selesai`;
            
            await connection.execute(historyQuery, [
                id,
                'selesai',  // PERUBAHAN: Status di history juga 'selesai'
                userId,
                username,
                req.user.extractedRoles ? req.user.extractedRoles.join(',') : 'user',
                catatanHistory
            ]);
            
            console.log(`✅ History status "selesai" berhasil disimpan`);
            
            // Commit transaction
            await connection.commit();
            console.log(`✅ Transaction berhasil di-commit`);
            
            console.log(`🎉 Surat tugas berhasil direkam untuk kegiatan "${kegiatan.kegiatan}". Status berubah dari 'diketahui' menjadi 'selesai'.`);
            
            // Ambil data terbaru untuk response
            const getUpdatedQuery = `
                SELECT 
                    k.*,
                    DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format,
                    DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui_format,
                    DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui_format,
                    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format,
                    (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_pegawai,
                    (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
                FROM accounting.nominatif_kegiatan k
                WHERE k.id = ?
            `;
            
            const [updatedRows] = await db.query(getUpdatedQuery, [id]);
            
            const updatedKegiatan = updatedRows[0];
            
            const responseData = {
                success: true,
                message: 'Surat Tugas berhasil direkam dan status berubah menjadi Selesai',
                data: {
                    kegiatan: updatedKegiatan,
                    surat_tugas: {
                        no_st: no_st,
                        tgl_st: tgl_st,
                        direkam_oleh: username,
                        direkam_tanggal: new Date().toISOString(),
                        status_sebelum: 'disetujui',
                        status_setelah: 'selesai'
                    }
                },
                notification: {
                    type: 'success',
                    title: 'Surat Tugas Berhasil Direkam',
                    message: `Surat Tugas No. ${no_st} berhasil direkam untuk kegiatan "${kegiatan.kegiatan}". Status berubah menjadi Selesai.`
                }
            };
            
            res.status(200).json(responseData);
            
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            await connection.rollback();
            throw transactionError;
        } finally {
            if (connection) {
                connection.release();
            }
        }
        
    } catch (error) {
        console.error('❌ Error merekam surat tugas:', error);
        
        let errorMessage = 'Gagal merekam surat tugas';
        let statusCode = 500;
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'No ST sudah digunakan';
            statusCode = 400;
        } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.code === 'ER_WARN_DATA_TRUNCATED') {
            errorMessage = 'Format tanggal tidak valid';
            statusCode = 400;
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Field tidak ditemukan di database';
            statusCode = 500;
        } else if (error.message.includes('Tidak ada baris yang terpengaruh')) {
            errorMessage = 'Gagal mengupdate data. Pastikan status kegiatan masih "diketahui".';
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            sqlErrorCode: error.code,
            sqlMessage: error.sqlMessage
        });
    }
});

// PERBAIKAN PADA ENDPOINT PATCH SURAT TUGAS
// PATCH - Update data surat tugas (jika perlu diubah)
router.patch('/:id/surat-tugas', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    let { no_st: noStRaw, tgl_st: tglStRaw } = req.body;
    
    console.log(`✏️ ${username} mengupdate surat tugas untuk kegiatan ID ${id}`);
    console.log('📝 Data update raw:', { noStRaw, tglStRaw });
    console.log('📦 Request body full:', JSON.stringify(req.body, null, 2));
    console.log('👤 User info:', {
        roles: req.user.extractedRoles,
        isRegularUser: req.user.isRegularUser
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    // VALIDASI: Bersihkan dan validasi input
    // 1. Trim no_st jika ada
    const no_st = noStRaw !== undefined ? String(noStRaw).trim() : undefined;
    
    // 2. Handle tgl_st dengan lebih ketat
    let tgl_st = undefined;
    if (tglStRaw !== undefined) {
        const tglStStr = String(tglStRaw).trim();
        
        // Jika string kosong, set ke null
        if (tglStStr === '' || tglStStr.toLowerCase() === 'null') {
            tgl_st = null;
        } else {
            // Validasi format tanggal minimal
            if (tglStStr.length < 8) { // Minimal YYYY-MM-DD = 10 karakter
                return res.status(400).json({
                    success: false,
                    message: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD',
                    received: tglStStr,
                    expected_format: 'YYYY-MM-DD (contoh: 2024-12-25)'
                });
            }
            
            // Coba parsing tanggal untuk validasi
            try {
                const date = new Date(tglStStr);
                if (isNaN(date.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tanggal tidak valid',
                        received: tglStStr
                    });
                }
                
                // Jika valid, gunakan nilai yang sudah di-trim
                tgl_st = tglStStr;
            } catch (error) {
                console.error('Error parsing date:', error);
                return res.status(400).json({
                    success: false,
                    message: 'Gagal memproses tanggal',
                    received: tglStStr
                });
            }
        }
    }
    
    console.log('✅ Data setelah validasi:', { no_st, tgl_st });
    
    // Cek minimal ada satu field yang diupdate dengan nilai yang valid
    const hasUpdateData = (no_st !== undefined && no_st !== '') || 
                         (tgl_st !== undefined);
    
    if (!hasUpdateData) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada data yang valid untuk diupdate'
        });
    }
    
    // Hanya regular user yang bisa mengupdate surat tugas
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat mengupdate surat tugas'
        });
    }
    
    // Validasi khusus: jika mengupdate tgl_st, harus ada nilai valid
    if (tgl_st !== undefined && (tgl_st === '' || tgl_st === null)) {
        return res.status(400).json({
            success: false,
            message: 'Tanggal ST tidak boleh kosong. Harap pilih tanggal yang valid atau batalkan pengisian.'
        });
    }
    
    // Validasi khusus: jika mengupdate no_st, harus ada nilai
    if (no_st !== undefined && no_st === '') {
        return res.status(400).json({
            success: false,
            message: 'Nomor ST tidak boleh kosong'
        });
    }
    
    try {
        // Cek apakah kegiatan ada dan user memiliki akses
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.status,
                k.user_id,
                k.no_st,
                k.tgl_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ? AND k.user_id = ?
        `;
        
        console.log('🔍 Checking kegiatan untuk update:', checkQuery, [id, userId]);
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            console.log(`❌ Kegiatan ID ${id} tidak ditemukan untuk user ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // PERUBAHAN: Cek apakah kegiatan sudah selesai atau masih diketahui
        if (kegiatan.status !== 'selesai' && kegiatan.status !== 'diketahui') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status "${kegiatan.status}" tidak dapat diupdate surat tugas. Hanya kegiatan dengan status "diketahui" atau "selesai" yang dapat diupdate.`
            });
        }
        
        // Bangun query update dinamis
        const updateFields = [];
        const updateValues = [];
        
        if (no_st !== undefined) {
            updateFields.push('no_st = ?');
            updateValues.push(no_st);
        }
        
        if (tgl_st !== undefined) {
            if (tgl_st === null) {
                updateFields.push('tgl_st = NULL');
            } else {
                updateFields.push('tgl_st = ?');
                updateValues.push(tgl_st);
            }
        }
        
        // PERUBAHAN: Jika mengupdate ST dan status belum selesai, ubah status
        const currentStatus = kegiatan.status;
        let newStatus = currentStatus;
        
        // Jika ada no_st dan tgl_st yang valid, dan status belum selesai, ubah jadi selesai
        if ((no_st !== undefined || tgl_st !== undefined) && currentStatus !== 'selesai') {
            // Cek apakah kedua field akan terisi
            const willHaveNoST = no_st !== undefined ? no_st : kegiatan.no_st;
            const willHaveTglST = tgl_st !== undefined ? (tgl_st !== null ? tgl_st : null) : kegiatan.tgl_st_format;
            
            if (willHaveNoST && willHaveNoST.trim() !== '' && willHaveTglST && willHaveTglST !== null) {
                updateFields.push('status = ?');
                updateValues.push('selesai');
                newStatus = 'selesai';
            }
        }
        
        // Jika tidak ada field yang valid untuk diupdate
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada field valid untuk diupdate'
            });
        }
        
        // Tambahkan updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        // Tambahkan WHERE condition
        updateValues.push(id, userId);
        
        // Execute update
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET ${updateFields.join(', ')}
            WHERE id = ? AND user_id = ?
        `;
        
        console.log('📝 Update query:', updateQuery);
        console.log('📝 Update values:', updateValues);
        
        const [updateResult] = await db.execute(updateQuery, updateValues);
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Gagal mengupdate surat tugas. Data tidak ditemukan atau tidak ada perubahan.'
            });
        }
        
        // Simpan history jika status berubah
        if (newStatus !== currentStatus) {
            const historyQuery = `
                INSERT INTO accounting.nominatif_status_history 
                (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const catatanHistory = `Surat Tugas diupdate: No. ${no_st !== undefined ? no_st : kegiatan.no_st}, Tgl. ${tgl_st !== undefined ? tgl_st : kegiatan.tgl_st_format} - Status berubah dari ${currentStatus} menjadi ${newStatus}`;
            
            await db.execute(historyQuery, [
                id,
                newStatus,
                userId,
                username,
                req.user.extractedRoles ? req.user.extractedRoles.join(',') : 'user',
                catatanHistory
            ]);
            
            console.log(`✅ History status "${newStatus}" berhasil disimpan`);
        }
        
        console.log(`✅ Berhasil mengupdate surat tugas untuk kegiatan ID: ${id}`);
        
        // Ambil data terbaru untuk response
        const getUpdatedQuery = `
            SELECT 
                k.*,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        const updatedKegiatan = updatedRows[0];
        
        // Format response yang lebih informatif
        const responseData = {
            success: true,
            message: newStatus !== currentStatus 
                ? `Surat Tugas berhasil diperbarui dan status berubah dari ${currentStatus} menjadi ${newStatus}`
                : 'Surat Tugas berhasil diperbarui',
            data: updatedKegiatan,
            updated_fields: updateFields
                .filter(f => !f.includes('updated_at') && !f.includes('status'))
                .map(f => f.split(' = ')[0]),
            updated_by: username,
            updated_at: new Date().toISOString(),
            status_change: newStatus !== currentStatus ? {
                before: currentStatus,
                after: newStatus,
                reason: 'Surat tugas lengkap (no_st dan tgl_st terisi)'
            } : null,
            changes: {
                before: {
                    no_st: kegiatan.no_st,
                    tgl_st: kegiatan.tgl_st_format,
                    status: currentStatus
                },
                after: {
                    no_st: no_st !== undefined ? no_st : kegiatan.no_st,
                    tgl_st: tgl_st !== undefined ? 
                        (tgl_st === null ? null : tgl_st) : 
                        kegiatan.tgl_st_format,
                    status: newStatus
                }
            }
        };
        
        // Tambahkan warning jika tgl_st null
        if (tgl_st === null) {
            responseData.warning = 'Tanggal ST diubah menjadi NULL (kosong). Surat tugas tidak akan dianggap lengkap.';
            responseData.suggestion = 'Harap isi tanggal ST yang valid untuk melengkapi surat tugas.';
        }
        
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error('❌ Error updating surat tugas:', error);
        
        let errorMessage = 'Gagal mengupdate surat tugas';
        let statusCode = 500;
        let details = {};
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'No ST sudah digunakan';
            statusCode = 400;
            details = { duplicate_field: 'no_st' };
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            error_code: error.code,
            sqlMessage: error.sqlMessage,
            details: details
        });
    }
});
// PATCH - Update status_2 dan catatan_status_2 (Hanya untuk Admin)
router.patch('/:id/status2', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`✏️ ${username} mengupdate status_2 untuk kegiatan ID ${id}`);
    console.log('📝 Data status_2:', req.body);
    console.log('👤 User info:', {
        roles: req.user.extractedRoles,
        isAdmin: req.user.isAdmin,
        userId: userId
    });
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    // Validasi: Hanya admin yang bisa mengupdate status_2
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya admin yang dapat mengupdate status_2'
        });
    }
    
    const { status_2, catatan_status_2 } = req.body;
    
    // Cek minimal ada satu field yang diupdate
    const hasUpdateData = status_2 !== undefined || catatan_status_2 !== undefined;
    
    if (!hasUpdateData) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada data status_2 yang diupdate'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.mak,
                k.status_2,
                k.catatan_status_2
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        console.log('🔍 Mengecek kegiatan:', checkQuery, [id]);
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Bangun query update dinamis
            const updateFields = [];
            const updateValues = [];
            
            if (status_2 !== undefined) {
                // Jika status_2 kosong string, set ke NULL
                if (status_2 === '' || status_2 === null) {
                    updateFields.push('status_2 = NULL');
                } else {
                    updateFields.push('status_2 = ?');
                    updateValues.push(String(status_2).trim());
                }
            }
            
            if (catatan_status_2 !== undefined) {
                // Jika catatan_status_2 kosong string, set ke NULL
                if (catatan_status_2 === '' || catatan_status_2 === null) {
                    updateFields.push('catatan_status_2 = NULL');
                } else {
                    updateFields.push('catatan_status_2 = ?');
                    updateValues.push(String(catatan_status_2).trim());
                }
            }
            
            // Jika tidak ada field yang valid untuk diupdate
            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada field valid untuk diupdate'
                });
            }
            
            // Tambahkan updated_at
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            
            // Tambahkan WHERE condition
            updateValues.push(id);
            
            // Execute update
            const updateQuery = `
                UPDATE accounting.nominatif_kegiatan 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;
            
            console.log('📝 Update query:', updateQuery);
            console.log('📝 Update values:', updateValues);
            
            const [updateResult] = await connection.execute(updateQuery, updateValues);
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Gagal mengupdate status_2. Tidak ada baris yang terpengaruh.');
            }
            
            console.log(`✅ Status_2 berhasil diupdate untuk kegiatan ID: ${id}`);
            
            // Simpan history
            const historyQuery = `
                INSERT INTO accounting.nominatif_status_history 
                (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const catatanHistory = `Status_2 diubah menjadi: "${status_2 !== undefined ? status_2 : kegiatan.status_2}"` + 
                                 (catatan_status_2 ? `, Catatan: ${catatan_status_2}` : '');
            
            await connection.execute(historyQuery, [
                id,
                'status2_updated',
                userId,
                username,
                'admin',
                catatanHistory
            ]);
            
            console.log(`✅ History status_2 berhasil disimpan`);
            
            // Commit transaction
            await connection.commit();
            console.log(`✅ Transaction berhasil di-commit`);
            
            // Ambil data terbaru untuk response
            const getUpdatedQuery = `
                SELECT 
                    k.*,
                    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
                FROM accounting.nominatif_kegiatan k
                WHERE k.id = ?
            `;
            
            const [updatedRows] = await connection.query(getUpdatedQuery, [id]);
            
            const updatedKegiatan = updatedRows[0];
            
            // Buat response data yang lengkap
            const responseData = {
                success: true,
                message: 'Status_2 berhasil diperbarui',
                data: updatedKegiatan,
                update_details: {
                    updated_by: username,
                    updated_by_id: userId,
                    updated_by_role: 'admin',
                    updated_at: new Date().toISOString(),
                    changes: {
                        status_2: {
                            before: kegiatan.status_2,
                            after: status_2 !== undefined ? status_2 : kegiatan.status_2
                        },
                        catatan_status_2: {
                            before: kegiatan.catatan_status_2,
                            after: catatan_status_2 !== undefined ? catatan_status_2 : kegiatan.catatan_status_2
                        }
                    }
                }
            };
            
            res.status(200).json(responseData);
            
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            await connection.rollback();
            throw transactionError;
        } finally {
            if (connection) {
                connection.release();
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating status_2:', error);
        
        let errorMessage = 'Gagal mengupdate status_2';
        let statusCode = 500;
        
        if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.code === 'ER_WARN_DATA_TRUNCATED') {
            errorMessage = 'Format data tidak valid';
            statusCode = 400;
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Field status_2 tidak ditemukan di tabel database';
            statusCode = 500;
            console.error('⚠️ Kolom status_2 mungkin belum ada di tabel. Jalankan query berikut di database:');
            console.error(`
                ALTER TABLE accounting.nominatif_kegiatan 
                ADD COLUMN IF NOT EXISTS status_2 VARCHAR(255) DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS catatan_status_2 TEXT DEFAULT NULL;
            `);
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            sqlErrorCode: error.code,
            sqlMessage: error.sqlMessage
        });
    }
});

// PUT - Update status_2 (full update - hanya untuk Admin)
// PUT - Update status_2 (full update - hanya untuk Admin) - VERSI DIPERBAIKI
router.put('/:id/status2', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log(`✏️ ${username} mengupdate full status_2 untuk kegiatan ID ${id}`);
    console.log('📝 Data status_2 full:', req.body);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    // Validasi: Hanya admin yang bisa mengupdate status_2
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya admin yang dapat mengupdate status_2'
        });
    }
    
    const { status_2, catatan_status_2 } = req.body;
    
    // Untuk PUT, semua field harus ada
    if (status_2 === undefined && catatan_status_2 === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Data status_2 dan catatan_status_2 diperlukan untuk update full'
        });
    }
    
    let connection;
    try {
        // Cek apakah kegiatan ada
        const checkQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.mak
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ?
        `;
        
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Mulai transaction
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update status_2
            const updateQuery = `
                UPDATE accounting.nominatif_kegiatan 
                SET 
                    status_2 = ?,
                    catatan_status_2 = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const status2Value = status_2 !== undefined && status_2 !== null && status_2 !== '' 
                ? String(status_2).trim() 
                : null;
            
            const catatanValue = catatan_status_2 !== undefined && catatan_status_2 !== null && catatan_status_2 !== ''
                ? String(catatan_status_2).trim()
                : null;
            
            console.log('📝 Executing full update:', updateQuery);
            console.log('📝 Values:', [status2Value, catatanValue, id]);
            
            // GANTI: Gunakan connection.execute() bukan db.execute()
            const [updateResult] = await connection.execute(updateQuery, [
                status2Value,
                catatanValue,
                id
            ]);
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Kegiatan tidak ditemukan atau gagal diupdate');
            }
            
            console.log(`✅ Status_2 berhasil diupdate untuk kegiatan ID: ${id}`);
            
            // Simpan history
            const historyQuery = `
                INSERT INTO accounting.nominatif_status_history 
                (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const catatanHistory = `Status_2 diubah menjadi: "${status2Value || '(kosong)'}"` + 
                                 (catatanValue ? `, Catatan: ${catatanValue}` : '');
            
            await connection.execute(historyQuery, [
                id,
                'status2_updated',
                userId,
                username,
                'admin',
                catatanHistory
            ]);
            
            console.log(`✅ History status_2 berhasil disimpan`);
            
            // Commit transaction
            await connection.commit();
            
            // Ambil data terbaru
            const getUpdatedQuery = `
                SELECT 
                    k.*,
                    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
                FROM accounting.nominatif_kegiatan k
                WHERE k.id = ?
            `;
            
            const [updatedRows] = await connection.query(getUpdatedQuery, [id]);
            
            const responseData = {
                success: true,
                message: 'Status_2 berhasil diperbarui',
                data: updatedRows[0],
                update_details: {
                    updated_by: username,
                    updated_by_id: userId,
                    updated_at: new Date().toISOString(),
                    method: 'PUT (full update)',
                    changes: {
                        status_2: status2Value,
                        catatan_status_2: catatanValue
                    }
                }
            };
            
            res.status(200).json(responseData);
            
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            await connection.rollback();
            throw transactionError;
        } finally {
            if (connection) {
                connection.release();
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating status_2 full:', error);
        
        let errorMessage = 'Gagal mengupdate status_2';
        let statusCode = 500;
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Kolom status_2 atau catatan_status_2 tidak ditemukan di tabel database';
            statusCode = 500;
            console.error('⚠️ Kolom status_2/catatan_status_2 mungkin belum ada di tabel.');
            
            // Suggestion untuk admin
            errorMessage += '. Harap pastikan kolom berikut ada di tabel:';
            console.error(`
                -- Jalankan query berikut di database jika kolom belum ada:
                ALTER TABLE accounting.nominatif_kegiatan 
                ADD COLUMN IF NOT EXISTS status_2 VARCHAR(255) DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS catatan_status_2 TEXT DEFAULT NULL;
            `);
        } else if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'Data duplikat ditemukan';
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            error_code: error.code,
            sqlMessage: error.sqlMessage,
            suggestion: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET - Daftar kegiatan dengan filter status_2 (untuk admin)
router.get('/admin/status2-report', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses report status_2`);
    
    // Validasi: Hanya admin yang bisa akses report
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya admin yang dapat mengakses report status_2'
        });
    }
    
    try {
        const { status_2, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        // Build WHERE clause
        let whereClause = "WHERE status = 'selesai'";
        let params = [];
        
        if (status_2 && status_2 !== 'all') {
            if (status_2 === 'empty') {
                whereClause += ' AND (status_2 IS NULL OR status_2 = "" OR TRIM(status_2) = "")';
            } else if (status_2 === 'null') {
                whereClause += ' AND status_2 IS NULL';
            } else if (status_2 === 'empty_string') {
                whereClause += ' AND (status_2 = "" OR TRIM(status_2) = "")';
            } else {
                whereClause += ' AND status_2 = ?';
                params.push(status_2);
            }
        }
        
        // PERBAIKAN: Query untuk menghitung total dengan kondisi yang sama
        const countQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status_2 IS NOT NULL AND status_2 != '' AND TRIM(status_2) != '' THEN 1 ELSE 0 END) as with_status_2,
                SUM(CASE WHEN status_2 IS NULL OR status_2 = '' OR TRIM(status_2) = '' THEN 1 ELSE 0 END) as without_status_2
            FROM accounting.nominatif_kegiatan
            ${whereClause}
        `;
        
        const [countResult] = await db.query(countQuery, params);
        const stats = countResult[0];
        
        // PERBAIKAN: Query untuk data dengan COALESCE untuk menampilkan teks yang benar
        const dataQuery = `
            SELECT 
                k.id,
                k.kegiatan,
                k.mak,
                k.status,
                k.status_2,
                k.catatan_status_2,
                k.ppk_nama,
                k.diketahui_oleh,
                k.no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st_format,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format,
                
                -- Hitung total biaya
                (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya,
                
                -- PERBAIKAN: Tentukan apakah status_2 kosong atau tidak
                CASE 
                    WHEN k.status_2 IS NULL OR k.status_2 = '' OR TRIM(k.status_2) = '' 
                    THEN 1 
                    ELSE 0 
                END as is_status_2_empty
                
            FROM accounting.nominatif_kegiatan k
            ${whereClause}
            ORDER BY 
                is_status_2_empty, -- PERBAIKAN: Gunakan field yang sudah dihitung
                k.updated_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const dataParams = [...params, parseInt(limit), parseInt(offset)];
        const [rows] = await db.query(dataQuery, dataParams);
        
        // PERBAIKAN: Group by status_2 dengan penanganan yang benar
        const status2Summary = {};
        rows.forEach(item => {
            // PERBAIKAN: Gunakan kondisi yang sama seperti di frontend
            if (!item.status_2 || item.status_2.trim() === '') {
                const key = '(Belum diisi)';
                if (!status2Summary[key]) {
                    status2Summary[key] = {
                        count: 0,
                        total_biaya: 0
                    };
                }
                status2Summary[key].count++;
                status2Summary[key].total_biaya += parseFloat(item.total_biaya) || 0;
            } else {
                const key = item.status_2;
                if (!status2Summary[key]) {
                    status2Summary[key] = {
                        count: 0,
                        total_biaya: 0
                    };
                }
                status2Summary[key].count++;
                status2Summary[key].total_biaya += parseFloat(item.total_biaya) || 0;
            }
        });
        
        // PERBAIKAN: Format data sebelum dikirim ke frontend
        const formattedData = rows.map(item => ({
            ...item,
            // PERBAIKAN: Pastikan status_2 tidak null untuk frontend
            status_2: item.status_2 || '',
            display_status_2: !item.status_2 || item.status_2.trim() === '' 
                ? '(Belum diisi)' 
                : item.status_2
        }));
        
        // Format response
        const responseData = {
            success: true,
            message: 'Report status_2 berhasil diambil',
            data: formattedData, // PERBAIKAN: Gunakan data yang sudah diformat
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: stats.total,
                pages: Math.ceil(stats.total / limit)
            },
            statistics: {
                total: stats.total,
                with_status_2: stats.with_status_2,
                without_status_2: stats.without_status_2,
                percentage_with_status_2: stats.total > 0 ? 
                    ((stats.with_status_2 / stats.total) * 100).toFixed(1) : 0,
                status_2_summary: status2Summary
            },
            filters: {
                status_2: status_2 || 'all',
                status: 'selesai',
                note: status_2 === 'empty' ? 'Menampilkan kegiatan selesai tanpa status_2' : 'Menampilkan semua kegiatan selesai'
            },
            meta: {
                generated_by: username,
                generated_at: new Date().toISOString(),
                for_role: 'admin'
            }
        };
        
        console.log(`✅ Report status_2 berhasil diambil: ${rows.length} baris (hanya status selesai)`);
        
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error('❌ Error fetching status_2 report:', error);
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil report status_2',
            error: error.message
        });
    }
});
module.exports = router;