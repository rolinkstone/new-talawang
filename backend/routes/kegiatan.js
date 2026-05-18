const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// ========== HELPER FUNCTIONS UNTUK QUERY FILTER BERDASARKAN ROLE ==========

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
    
    if (user.isAdmin) {
        console.log('👑 Admin: can view all data');
        return { where: '', params: [] };
    }
    
    if (user.isPPK) {
        console.log('📋 PPK: can only view data with matching ppk_id');
        return { 
            where: 'WHERE ppk_id = ?', 
            params: [userId] 
        };
    }
    
    if (user.isKabalai) {
        console.log('👔 Kabalai: can only view data with status "disetujui" or "diketahui" or "selesai"');
        return { 
            where: 'WHERE status IN ("disetujui", "diketahui", "selesai")', 
            params: [] 
        };
    }
    
    console.log('👤 Regular User: can only view own data');
    return { 
        where: 'WHERE user_id = ?', 
        params: [userId] 
    };
}

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
    
    if (user.isAdmin) {
        console.log('👑 Admin: can access all data');
        return { 
            where: `WHERE ${columnName} = ?`, 
            params: [itemId]
        };
    }
    
    if (user.isPPK) {
        console.log('📋 PPK: can only access if ppk_id matches');
        return { 
            where: `WHERE ${columnName} = ? AND ppk_id = ?`, 
            params: [itemId, userId] 
        };
    }
    
    if (user.isKabalai) {
        console.log('👔 Kabalai: can only access data with status "disetujui" or "diketahui"');
        return { 
            where: `WHERE ${columnName} = ? AND status IN ("disetujui", "diketahui", "selesai")`, 
            params: [itemId]
        };
    }
    
    console.log('👤 Regular User: can only access own data');
    return { 
        where: `WHERE ${columnName} = ? AND user_id = ?`, 
        params: [itemId, userId] 
    };
}

// ========== ROUTES UTAMA KEGIATAN ==========

// GET semua kegiatan dengan filter berdasarkan role user
router.get('/', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses daftar kegiatan`);
    
    try {
        const { where, params } = buildUserWhereClause(req.user);
        
        let finalWhere = where;
        let finalParams = [...params];
        
        const { status, search } = req.query;
        
        if (status && status !== 'all') {
            if (finalWhere) {
                finalWhere += ` AND status = ?`;
            } else {
                finalWhere = `WHERE status = ?`;
            }
            finalParams.push(status);
        }
        
        if (search) {
            const searchParam = `%${search}%`;
            if (finalWhere) {
                finalWhere += ` AND (kegiatan LIKE ? OR mak LIKE ? OR no_st LIKE ?)`;
            } else {
                finalWhere = `WHERE (kegiatan LIKE ? OR mak LIKE ? OR no_st LIKE ?)`;
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
                ppk_nip,
                diketahui_oleh,
                diketahui_oleh_id,
                diketahui_oleh_nip,
                bendahara_nama,
                bendahara_nip,
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

        const [rows] = await db.query(query, finalParams);

        res.status(200).json({
            success: true,
            message: 'Daftar kegiatan berhasil diambil',
            data: rows,
            count: rows.length
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
                ppk_nip,
                diketahui_oleh,
                diketahui_oleh_id,
                diketahui_oleh_nip,
                bendahara_nama,
                bendahara_nip,
                DATE_FORMAT(tanggal_diajukan, '%Y-%m-%d %H:%i:%s') as tanggal_diajukan,
                DATE_FORMAT(tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
                catatan,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM accounting.nominatif_kegiatan 
            ${where}
        `;

        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Detail kegiatan berhasil diambil',
            data: rows[0]
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

// GET DETAIL KEGIATAN UNTUK EDIT
router.get('/:id/edit', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);

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
                k.ppk_nip,
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
                k.diketahui_oleh_nip,
                k.bendahara_nama,
                k.bendahara_nip,
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM accounting.nominatif_kegiatan k
            ${where}
        `;
        
        const [kegiatanRows] = await db.query(kegiatanQuery, params);

        if (kegiatanRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }

        const kegiatanData = kegiatanRows[0];

        // Ambil data pegawai untuk kegiatan ini
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

        // Untuk setiap pegawai, ambil data biaya
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
                const transportasiQuery = `
                    SELECT * FROM accounting.nominatif_transportasi WHERE biaya_id IN (?)
                `;
                const uangHarianQuery = `
                    SELECT * FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (?)
                `;
                const penginapanQuery = `
                    SELECT * FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (?)
                `;
                
                const [transportasiRows] = await db.query(transportasiQuery, [biayaIds]);
                const [uangHarianRows] = await db.query(uangHarianQuery, [biayaIds]);
                const [penginapanRows] = await db.query(penginapanQuery, [biayaIds]);

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

        res.status(200).json({
            success: true,
            message: 'Data untuk edit berhasil diambil',
            data: responseData
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

// GET DETAIL KEGIATAN + PEGAWAI + BIAYA
router.get('/:id/detail', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);

    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }

    try {
        let where = '';
        let params = [id];
        
        if (req.user.isAdmin) {
            where = `WHERE k.id = ?`;
        } 
        else if (req.user.isPPK) {
            where = `WHERE k.id = ? AND k.ppk_id = ?`;
            params.push(req.user.user_id);
        } 
        else if (req.user.isKabalai) {
            where = `WHERE k.id = ?`;
        } 
        else {
            const normalizedNip = String(req.user.nip || '').replace(/\s/g, '');
            where = `WHERE k.id = ? AND EXISTS (
                SELECT 1 FROM nominatif_pegawai p 
                WHERE p.kegiatan_id = k.id 
                AND REPLACE(p.nip, ' ', '') = ?
            )`;
            params.push(normalizedNip);
        }

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
                k.ppk_nip,
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
                k.diketahui_oleh_nip,
                k.bendahara_nama,
                k.bendahara_nip,
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM accounting.nominatif_kegiatan k
            ${where}
        `;
        
        const [kegiatanRows] = await db.query(kegiatanQuery, params);

        if (kegiatanRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau Anda tidak memiliki akses'
            });
        }

        const kegiatanData = kegiatanRows[0];

        // Ambil pegawai dengan biaya_list
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

        // Ambil biaya untuk setiap pegawai
        for (const pegawai of pegawaiRows) {
            const biayaQuery = `
                SELECT b.id as biaya_id
                FROM accounting.nominatif_biaya_kegiatan b
                WHERE b.pegawai_id = ?
            `;
            const [biayaRows] = await db.query(biayaQuery, [pegawai.id]);
            
            pegawai.biaya_list = [];
            
            for (const biaya of biayaRows) {
                const [transportasiRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_transportasi WHERE biaya_id = ?`,
                    [biaya.biaya_id]
                );
                const [uangHarianRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_uang_harian_items WHERE biaya_id = ?`,
                    [biaya.biaya_id]
                );
                const [penginapanRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_penginapan_items WHERE biaya_id = ?`,
                    [biaya.biaya_id]
                );
                
                pegawai.biaya_list.push({
                    transportasi: transportasiRows.map(t => ({
                        id: t.id,
                        trans: t.trans,
                        harga: t.harga,
                        total: t.total
                    })),
                    uang_harian: uangHarianRows.map(u => ({
                        id: u.id,
                        jenis: u.jenis,
                        qty: u.qty,
                        harga: u.harga,
                        total: u.total
                    })),
                    penginapan: penginapanRows.map(p => ({
                        id: p.id,
                        jenis: p.jenis,
                        qty: p.qty,
                        harga: p.harga,
                        total: p.total
                    }))
                });
            }
            
            // Hitung total biaya dari komponen
            let totalFromComponents = 0;
            for (const biaya of pegawai.biaya_list) {
                for (const t of biaya.transportasi) totalFromComponents += Number(t.total || 0);
                for (const u of biaya.uang_harian) totalFromComponents += Number(u.total || 0);
                for (const p of biaya.penginapan) totalFromComponents += Number(p.total || 0);
            }
            pegawai.total_biaya = totalFromComponents;
        }

        const responseData = {
            ...kegiatanData,
            pegawai: pegawaiRows,
            total_pegawai: pegawaiRows.length,
            total_biaya: pegawaiRows.reduce((sum, p) => sum + (parseFloat(p.total_biaya) || 0), 0)
        };

        res.status(200).json({
            success: true,
            message: 'Detail lengkap kegiatan berhasil diambil',
            data: responseData
        });

    } catch (error) {
        console.error('❌ Error fetching full detail:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});

// POST - Insert kegiatan

router.post('/', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    console.log('=== MENERIMA REQUEST CREATE KEGIATAN ===');
    console.log(`👤 User: ${username} (ID: ${userId})`);
    
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat membuat kegiatan baru.'
        });
    }
    
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
        bendahara_id,
        bendahara_nama,
        bendahara_nip,
        pegawai = []
    } = req.body;

    if (!kegiatanNama || !mak) {
        return res.status(400).json({ 
            success: false,
            message: 'Kegiatan dan MAK wajib diisi' 
        });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const kegiatanQuery = `
            INSERT INTO accounting.nominatif_kegiatan
            (kegiatan, mak, realisasi_anggaran_sebelumnya, target_output_tahun,
             realisasi_output_sebelumnya, target_output_yg_akan_dicapai,
             kota_kab_kecamatan, rencana_tanggal_pelaksanaan,
             rencana_tanggal_pelaksanaan_akhir, user_id, status, created_at,
             no_st, tgl_st, status_2, catatan_status_2, jenis_spm,
             bendahara_id, bendahara_nama, bendahara_nip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const kegiatanValues = [
            kegiatanNama, mak,
            parseFloat(realisasi_anggaran_sebelumnya) || 0,
            parseInt(target_output_tahun) || 0,
            parseInt(realisasi_output_sebelumnya) || 0,
            target_output_yg_akan_dicapai,
            kota_kab_kecamatan,
            rencana_tanggal_pelaksanaan || null,
            rencana_tanggal_pelaksanaan_akhir || null,
            userId,
            no_st || null,
            tgl_st || null,
            status_2 || null,
            catatan_status_2 || null,
            jenis_spm || null,
            bendahara_id || null,
            bendahara_nama || null,
            bendahara_nip || null
        ];

        const [kegiatanResult] = await connection.execute(kegiatanQuery, kegiatanValues);
        const kegiatanId = kegiatanResult.insertId;

        let totalPegawai = 0;
        let totalBiaya = 0;

        if (pegawai && pegawai.length > 0) {
            for (const p of pegawai) {
                if (!p.nama) continue;

                const pegawaiQuery = `
                    INSERT INTO accounting.nominatif_pegawai 
                    (kegiatan_id, nama, nip, jabatan, total_biaya) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const pegawaiValues = [
                    kegiatanId, p.nama, p.nip || null,
                    p.jabatan || null, parseFloat(p.total_biaya) || 0
                ];

                const [pegawaiResult] = await connection.execute(pegawaiQuery, pegawaiValues);
                const pegawaiId = pegawaiResult.insertId;
                totalPegawai++;
                totalBiaya += parseFloat(p.total_biaya) || 0;

                if (p.biaya && p.biaya.length > 0) {
                    for (const biayaData of p.biaya) {
                        const biayaQuery = `
                            INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) 
                            VALUES (?, ?)
                        `;
                        
                        const [biayaResult] = await connection.execute(biayaQuery, [kegiatanId, pegawaiId]);
                        const biayaId = biayaResult.insertId;

                        if (biayaData.transportasi && biayaData.transportasi.length > 0) {
                            for (const transport of biayaData.transportasi) {
                                if (!transport.trans) continue;
                                await connection.execute(
                                    `INSERT INTO accounting.nominatif_transportasi (biaya_id, trans, harga) VALUES (?, ?, ?)`,
                                    [biayaId, transport.trans || '', parseFloat(transport.harga) || 0]
                                );
                            }
                        }

                        if (biayaData.uang_harian_items && biayaData.uang_harian_items.length > 0) {
                            for (const uangHarian of biayaData.uang_harian_items) {
                                if (!uangHarian.jenis) continue;
                                await connection.execute(
                                    `INSERT INTO accounting.nominatif_uang_harian_items (biaya_id, jenis, qty, harga) VALUES (?, ?, ?, ?)`,
                                    [biayaId, uangHarian.jenis || '', parseInt(uangHarian.qty) || 0, parseFloat(uangHarian.harga) || 0]
                                );
                            }
                        }

                        if (biayaData.penginapan_items && biayaData.penginapan_items.length > 0) {
                            for (const penginapan of biayaData.penginapan_items) {
                                if (!penginapan.jenis) continue;
                                await connection.execute(
                                    `INSERT INTO accounting.nominatif_penginapan_items (biaya_id, jenis, qty, harga) VALUES (?, ?, ?, ?)`,
                                    [biayaId, penginapan.jenis || '', parseInt(penginapan.qty) || 0, parseFloat(penginapan.harga) || 0]
                                );
                            }
                        }
                    }
                } else {
                    await connection.execute(
                        `INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) VALUES (?, ?)`,
                        [kegiatanId, pegawaiId]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        console.log(`✅ Kegiatan berhasil disimpan dengan bendahara: ${bendahara_nama || 'Tidak ada'}`);

        res.status(201).json({
            success: true,
            message: 'Kegiatan berhasil disimpan',
            data: {
                id: kegiatanId,
                kegiatan: kegiatanNama,
                status: 'draft',
                total_pegawai: totalPegawai,
                total_biaya: totalBiaya,
                bendahara_nama: bendahara_nama || null,
                bendahara_nip: bendahara_nip || null
            }
        });

    } catch (error) {
        console.error('❌ Error creating kegiatan:', error);
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
            message: 'Gagal menyimpan data',
            error: error.message
        });
    }
});

// DELETE - Hapus kegiatan
router.delete('/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
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
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatanInfo = kegiatanRows[0];
        
        if (req.user.isRegularUser && kegiatanInfo.status !== 'draft' && kegiatanInfo.status !== 'dikembalikan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${kegiatanInfo.status} tidak dapat dihapus.`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const pegawaiQuery = `SELECT id FROM accounting.nominatif_pegawai WHERE kegiatan_id = ?`;
        const [pegawaiRows] = await connection.query(pegawaiQuery, [id]);
        const pegawaiIds = pegawaiRows.map(p => p.id);
        
        if (pegawaiIds.length > 0) {
            const placeholders = pegawaiIds.map(() => '?').join(',');
            const biayaQuery = `SELECT id FROM accounting.nominatif_biaya_kegiatan WHERE pegawai_id IN (${placeholders})`;
            const [biayaRows] = await connection.query(biayaQuery, pegawaiIds);
            const biayaIds = biayaRows.map(b => b.id);
            
            if (biayaIds.length > 0) {
                const biayaPlaceholders = biayaIds.map(() => '?').join(',');
                await connection.query(`DELETE FROM accounting.nominatif_transportasi WHERE biaya_id IN (${biayaPlaceholders})`, biayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (${biayaPlaceholders})`, biayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (${biayaPlaceholders})`, biayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_biaya_kegiatan WHERE id IN (${biayaPlaceholders})`, biayaIds);
            }
            
            await connection.query(`DELETE FROM accounting.nominatif_pegawai WHERE id IN (${placeholders})`, pegawaiIds);
        }
        
        await connection.query(`DELETE FROM accounting.nominatif_kegiatan WHERE id = ?`, [id]);
        
        await connection.commit();
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dihapus',
            data: {
                kegiatan_id: parseInt(id),
                kegiatan_nama: kegiatanInfo.kegiatan
            }
        });
        
    } catch (error) {
        console.error('❌ Error deleting kegiatan:', error);
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
            message: 'Gagal menghapus data kegiatan',
            error: error.message
        });
    }
});

// PUT - Update lengkap kegiatan
// PUT - Update lengkap kegiatan (DENGAN PENAMBAHAN BENDAHARA)
router.put('/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
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
        bendahara_id,
        bendahara_nama,
        bendahara_nip,
        pegawai = []
    } = req.body;
    
    if (!kegiatanNama || !mak) {
        return res.status(400).json({ 
            success: false,
            message: 'Kegiatan dan MAK wajib diisi' 
        });
    }
    
    let connection;
    try {
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const checkQuery = `
            SELECT id, kegiatan, user_id, status, ppk_id 
            FROM accounting.nominatif_kegiatan 
            ${where}
        `;
        
        const [checkRows] = await db.query(checkQuery, params);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const existingKegiatan = checkRows[0];
        
        if (req.user.isRegularUser && existingKegiatan.status !== 'draft' && existingKegiatan.status !== 'dikembalikan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${existingKegiatan.status} tidak dapat diubah.`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
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
                bendahara_id = ?,
                bendahara_nama = ?,
                bendahara_nip = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await connection.execute(updateKegiatanQuery, [
            kegiatanNama, mak,
            realisasi_anggaran_sebelumnya || null,
            target_output_tahun || null,
            realisasi_output_sebelumnya || null,
            target_output_yg_akan_dicapai || null,
            kota_kab_kecamatan || null,
            rencana_tanggal_pelaksanaan || null,
            rencana_tanggal_pelaksanaan_akhir || null,
            bendahara_id || null,
            bendahara_nama || null,
            bendahara_nip || null,
            id
        ]);
        
        // Hapus data lama pegawai
        const [oldPegawaiRows] = await connection.query(
            'SELECT id FROM accounting.nominatif_pegawai WHERE kegiatan_id = ?',
            [id]
        );
        
        const oldPegawaiIds = oldPegawaiRows.map(p => p.id);
        
        if (oldPegawaiIds.length > 0) {
            const placeholders = oldPegawaiIds.map(() => '?').join(',');
            const [oldBiayaRows] = await connection.query(
                `SELECT id FROM accounting.nominatif_biaya_kegiatan WHERE pegawai_id IN (${placeholders})`,
                oldPegawaiIds
            );
            
            const oldBiayaIds = oldBiayaRows.map(b => b.id);
            
            if (oldBiayaIds.length > 0) {
                const biayaPlaceholders = oldBiayaIds.map(() => '?').join(',');
                await connection.query(`DELETE FROM accounting.nominatif_transportasi WHERE biaya_id IN (${biayaPlaceholders})`, oldBiayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (${biayaPlaceholders})`, oldBiayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (${biayaPlaceholders})`, oldBiayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_biaya_kegiatan WHERE id IN (${biayaPlaceholders})`, oldBiayaIds);
            }
            
            await connection.query(`DELETE FROM accounting.nominatif_pegawai WHERE id IN (${placeholders})`, oldPegawaiIds);
        }
        
        // Insert data pegawai baru
        let totalPegawai = 0;
        
        if (pegawai && pegawai.length > 0) {
            for (const p of pegawai) {
                if (!p.nama) continue;
                
                const insertPegawaiQuery = `
                    INSERT INTO accounting.nominatif_pegawai 
                    (kegiatan_id, nama, nip, jabatan, total_biaya) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const [pegawaiResult] = await connection.execute(insertPegawaiQuery, [
                    id, p.nama, p.nip || null,
                    p.jabatan || null, p.total_biaya || 0
                ]);
                const pegawaiId = pegawaiResult.insertId;
                totalPegawai++;
                
                if (p.biaya && p.biaya.length > 0) {
                    for (const biayaData of p.biaya) {
                        const biayaQuery = `INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) VALUES (?, ?)`;
                        const [biayaResult] = await connection.execute(biayaQuery, [id, pegawaiId]);
                        const biayaId = biayaResult.insertId;
                        
                        if (biayaData.transportasi && biayaData.transportasi.length > 0) {
                            for (const transport of biayaData.transportasi) {
                                if (!transport.trans) continue;
                                await connection.execute(
                                    `INSERT INTO accounting.nominatif_transportasi (biaya_id, trans, harga) VALUES (?, ?, ?)`,
                                    [biayaId, transport.trans || '', transport.harga || 0]
                                );
                            }
                        }
                        
                        if (biayaData.uang_harian_items && biayaData.uang_harian_items.length > 0) {
                            for (const uangHarian of biayaData.uang_harian_items) {
                                if (!uangHarian.jenis) continue;
                                await connection.execute(
                                    `INSERT INTO accounting.nominatif_uang_harian_items (biaya_id, jenis, qty, harga) VALUES (?, ?, ?, ?)`,
                                    [biayaId, uangHarian.jenis || '', uangHarian.qty || 0, uangHarian.harga || 0]
                                );
                            }
                        }
                        
                        if (biayaData.penginapan_items && biayaData.penginapan_items.length > 0) {
                            for (const penginapan of biayaData.penginapan_items) {
                                if (!penginapan.jenis) continue;
                                await connection.execute(
                                    `INSERT INTO accounting.nominatif_penginapan_items (biaya_id, jenis, qty, harga) VALUES (?, ?, ?, ?)`,
                                    [biayaId, penginapan.jenis || '', penginapan.qty || 0, penginapan.harga || 0]
                                );
                            }
                        }
                    }
                } else {
                    await connection.execute(
                        `INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) VALUES (?, ?)`,
                        [id, pegawaiId]
                    );
                }
            }
        }
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ Kegiatan berhasil diperbarui dengan bendahara: ${bendahara_nama || 'Tidak ada'}`);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil diperbarui',
            data: {
                id: parseInt(id),
                kegiatan: kegiatanNama,
                total_pegawai: totalPegawai,
                bendahara_nama: bendahara_nama || null,
                bendahara_nip: bendahara_nip || null
            }
        });
        
    } catch (error) {
        console.error('❌ Error updating kegiatan:', error);
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
            message: 'Gagal mengupdate data kegiatan',
            error: error.message
        });
    }
});

// POST - Kirim kegiatan ke PPK (dengan NIP PPK)
router.post('/:id/kirim-ke-ppk', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    const { ppk_id, ppk_nama, ppk_nip, catatan } = req.body;
    
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
    
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat mengirim kegiatan ke PPK'
        });
    }
    
    let connection;
    try {
        const checkQuery = `
            SELECT id, kegiatan, user_id, status 
            FROM accounting.nominatif_kegiatan 
            WHERE id = ? AND user_id = ?
        `;
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        
        if (kegiatan.status !== 'draft' && kegiatan.status !== 'dikembalikan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan sudah dalam status "${kegiatan.status}".`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'diajukan',
                ppk_id = ?,
                ppk_nama = ?,
                ppk_nip = ?,
                tanggal_diajukan = CURRENT_TIMESTAMP,
                catatan = COALESCE(?, catatan),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await connection.execute(updateQuery, [ppk_id, ppk_nama, ppk_nip || null, catatan || null, id]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(historyQuery, [
            id, 'diajukan', userId, username,
            req.user.extractedRoles ? req.user.extractedRoles.join(',') : 'user',
            `Diajukan ke PPK: ${ppk_nama} (NIP: ${ppk_nip || '-'})`
        ]);
        
        await connection.commit();
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dikirim ke PPK'
        });
        
    } catch (error) {
        console.error('❌ Error mengirim ke PPK:', error);
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

// POST - PPK menyetujui/mengetahui pengajuan
router.post('/:id/approve', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    const { catatan, approved_by, approved_by_id } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!req.user.isPPK) {
        return res.status(403).json({
            success: false,
            message: 'Hanya PPK yang dapat menyetujui pengajuan'
        });
    }
    
    let connection;
    try {
        const checkQuery = `
            SELECT k.id, k.kegiatan, k.status, k.ppk_id
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ? AND k.ppk_id = ?
        `;
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau tidak ditugaskan ke PPK Anda'
            });
        }
        
        const kegiatan = checkRows[0];
        
        if (kegiatan.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `Hanya kegiatan dengan status "diajukan" yang dapat diketahui.`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'diketahui',
                tanggal_disetujui = CURRENT_TIMESTAMP,
                catatan = COALESCE(?, catatan),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND ppk_id = ?
        `;
        
        await connection.execute(updateQuery, [catatan || null, id, userId]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(historyQuery, [
            id, 'diketahui', userId, username || approved_by || 'PPK',
            'ppk', `Diketahui oleh PPK` + (catatan ? ` - Catatan: ${catatan}` : '')
        ]);
        
        await connection.commit();
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil diketahui'
        });
        
    } catch (error) {
        console.error('❌ Error approving kegiatan:', error);
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
            message: 'Gagal menyetujui kegiatan',
            error: error.message
        });
    }
});


// POST - PPK menolak/mengembalikan pengajuan (REJECT PPK)
router.post('/:id/reject-ppk', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    const { catatan } = req.body;
    
    console.log(`📋 PPK ${username} mengembalikan kegiatan ID: ${id}`);
    console.log(`📝 Catatan: ${catatan}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!catatan || catatan.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Catatan wajib diisi ketika mengembalikan kegiatan'
        });
    }
    
    if (!req.user.isPPK) {
        return res.status(403).json({
            success: false,
            message: 'Hanya PPK yang dapat mengembalikan pengajuan'
        });
    }
    
    let connection;
    try {
        const checkQuery = `
            SELECT k.id, k.kegiatan, k.status, k.ppk_id
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ? AND k.ppk_id = ?
        `;
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan atau tidak ditugaskan ke PPK Anda'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Status yang bisa dikembalikan adalah 'diajukan'
        if (kegiatan.status !== 'diajukan') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status "${kegiatan.status}" tidak dapat dikembalikan. Hanya kegiatan yang diajukan yang dapat dikembalikan.`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'dikembalikan',
                catatan = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND ppk_id = ? AND status = 'diajukan'
        `;
        
        await connection.execute(updateQuery, [catatan.trim(), id, userId]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(historyQuery, [
            id, 'dikembalikan', userId, username, 'ppk',
            `Dikembalikan oleh PPK: ${username} - Alasan: ${catatan}`
        ]);
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ Kegiatan "${kegiatan.kegiatan}" dikembalikan oleh PPK ${username}`);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dikembalikan ke user',
            data: {
                kegiatan_id: parseInt(id),
                status: 'dikembalikan'
            }
        });
        
    } catch (error) {
        console.error('❌ Error reject PPK:', error);
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
            message: 'Gagal mengembalikan kegiatan',
            error: error.message
        });
    }
});

// routes/kegiatan.js - Endpoint reject-kabalai

router.post('/:id/reject-kabalai', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    // PERBAIKAN: Ambil NIP dari request body
    const { 
        catatan_kabalai, 
        tanggal_kembalikan, 
        dikembalikan_oleh,
        dikembalikan_oleh_nip,  // ← NIP dengan spasi dari frontend
        dikembalikan_oleh_id 
    } = req.body;
    
    const userNip = dikembalikan_oleh_nip || req.user.nip || '';
    
    console.log(`👔 Kabalai ${username} (NIP: ${userNip}) mengembalikan kegiatan ID: ${id}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!catatan_kabalai || catatan_kabalai.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Catatan wajib diisi ketika mengembalikan kegiatan'
        });
    }
    
    if (!req.user.isKabalai) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat mengembalikan kegiatan'
        });
    }
    
    let connection;
    try {
        const checkQuery = `
            SELECT k.id, k.kegiatan, k.status
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
        
        // Status yang bisa dikembalikan adalah 'diketahui' (sudah disetujui PPK)
        if (kegiatan.status !== 'diketahui') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${kegiatan.status} tidak dapat dikembalikan. Hanya kegiatan yang sudah diketahui PPK yang dapat dikembalikan.`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'dikembalikan',
                catatan_kabalai = ?,
                tanggal_dikembalikan = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'diketahui'
        `;
        
        await connection.execute(updateQuery, [
            catatan_kabalai,
            tanggal_kembalikan || new Date().toISOString().split('T')[0],
            id
        ]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(historyQuery, [
            id, 'dikembalikan', userId, username, 'kabalai',
            `Dikembalikan oleh Kabalai: ${dikembalikan_oleh || username} (NIP: ${userNip}) - Alasan: ${catatan_kabalai}`
        ]);
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ Kegiatan "${kegiatan.kegiatan}" dikembalikan oleh Kabalai ${username} (NIP: ${userNip})`);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dikembalikan ke user',
            data: {
                kegiatan_id: parseInt(id),
                status: 'dikembalikan'
            }
        });
        
    } catch (error) {
        console.error('❌ Error mengembalikan kegiatan:', error);
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
            message: 'Gagal mengembalikan kegiatan',
            error: error.message
        });
    }
});

// routes/kegiatan.js - Endpoint menyetujui (DIPERBAIKI)

router.post('/:id/menyetujui', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    
    // PERBAIKAN: Ambil NIP dari request body (dikirim dari frontend dengan spasi)
    const { 
        catatan_kabalai, 
        tanggal_mengetahui, 
        diketahui_oleh,
        diketahui_oleh_nip,  // ← NIP dengan spasi dari frontend
        diketahui_oleh_id 
    } = req.body;
    
    // Gunakan NIP dari request body (sudah dengan spasi), fallback ke req.user.nip
    const userNip = diketahui_oleh_nip || req.user.nip || '';
    
    console.log(`👔 Kabalai ${username} (NIP: ${userNip}) menyetujui kegiatan ID: ${id}`);
    console.log(`📋 NIP from request body: ${diketahui_oleh_nip}`);
    console.log(`📋 NIP length: ${userNip.length}, contains spaces: ${userNip.includes(' ')}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!req.user.isKabalai) {
        return res.status(403).json({
            success: false,
            message: 'Hanya Kabalai yang dapat mengisi form menyetujui'
        });
    }
    
    let connection;
    try {
        const checkQuery = `
            SELECT k.id, k.kegiatan, k.status
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
        
        if (kegiatan.status !== 'diketahui') {
            return res.status(400).json({
                success: false,
                message: `Kegiatan dengan status ${kegiatan.status} tidak dapat disetujui.`
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const tanggalDiketahui = tanggal_mengetahui || new Date().toISOString().split('T')[0];
        
        // PERBAIKAN: Simpan NIP dari request body (dengan spasi)
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                catatan_kabalai = ?,
                tanggal_diketahui = ?,
                status = 'disetujui',
                diketahui_oleh = ?,
                diketahui_oleh_id = ?,
                diketahui_oleh_nip = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'diketahui'
        `;
        
        await connection.execute(updateQuery, [
            catatan_kabalai || null,
            tanggalDiketahui,
            diketahui_oleh || username,           // Nama Kabalai
            diketahui_oleh_id || userId,          // ID Kabalai
            userNip,                               // NIP dengan spasi dari frontend
            id
        ]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(historyQuery, [
            id, 'disetujui', userId, username, 'kabalai',
            `Disetujui oleh Kabalai: ${diketahui_oleh || username} (NIP: ${userNip})${catatan_kabalai ? ` - Catatan: ${catatan_kabalai}` : ''}`
        ]);
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ Kegiatan "${kegiatan.kegiatan}" disetujui oleh Kabalai ${username} (NIP: ${userNip})`);
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil disetujui oleh Kabalai',
            data: {
                kegiatan_id: parseInt(id),
                diketahui_oleh: diketahui_oleh || username,
                diketahui_oleh_id: diketahui_oleh_id || userId,
                diketahui_oleh_nip: userNip,
                status: 'disetujui'
            }
        });
        
    } catch (error) {
        console.error('❌ Error dalam proses menyetujui:', error);
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
            message: 'Gagal menyimpan data persetujuan',
            error: error.message
        });
    }
});

// POST - Rekam Surat Tugas
router.post('/:id/surat-tugas', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    const { no_st, tgl_st } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!no_st || !tgl_st) {
        return res.status(400).json({
            success: false,
            message: 'No ST dan Tanggal ST wajib diisi'
        });
    }
    
    if (!req.user.isRegularUser) {
        return res.status(403).json({
            success: false,
            message: 'Hanya user biasa yang dapat merekam surat tugas'
        });
    }
    
    let connection;
    try {
        const checkQuery = `
            SELECT k.id, k.kegiatan, k.status, k.user_id, k.no_st
            FROM accounting.nominatif_kegiatan k
            WHERE k.id = ? AND k.user_id = ?
        `;
        const [checkRows] = await db.query(checkQuery, [id, userId]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        
        if (kegiatan.status !== 'disetujui') {
            return res.status(400).json({
                success: false,
                message: `Hanya kegiatan dengan status "disetujui" yang dapat direkam surat tugas.`
            });
        }
        
        if (kegiatan.no_st) {
            return res.status(400).json({
                success: false,
                message: 'Surat Tugas sudah direkam sebelumnya'
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                no_st = ?,
                tgl_st = ?,
                status = 'selesai',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `;
        
        await connection.execute(updateQuery, [no_st.trim(), tgl_st, id, userId]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const catatanHistory = `Surat Tugas direkam: No. ${no_st}, Tgl. ${tgl_st}`;
        await connection.execute(historyQuery, [
            id, 'selesai', userId, username,
            req.user.extractedRoles ? req.user.extractedRoles.join(',') : 'user',
            catatanHistory
        ]);
        
        await connection.commit();
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Surat Tugas berhasil direkam dan status berubah menjadi Selesai'
        });
        
    } catch (error) {
        console.error('❌ Error merekam surat tugas:', error);
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
            message: 'Gagal merekam surat tugas',
            error: error.message
        });
    }
});

// GET - History status kegiatan
router.get('/:id/history', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    try {
        const { where, params } = buildSingleItemWhereClause(req.user, id);
        
        const checkQuery = `SELECT id FROM accounting.nominatif_kegiatan ${where}`;
        const [checkRows] = await db.query(checkQuery, params);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const historyQuery = `
            SELECT 
                id, status, user_id, user_nama, user_role, catatan,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM accounting.nominatif_status_history
            WHERE kegiatan_id = ?
            ORDER BY created_at DESC
        `;
        
        const [historyRows] = await db.query(historyQuery, [id]);
        
        res.status(200).json({
            success: true,
            message: 'History status berhasil diambil',
            data: historyRows
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

// PUT - Update status_2 (hanya untuk Admin)
router.put('/:id/status2', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    const { status_2, catatan_status_2 } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya admin yang dapat mengupdate status_2'
        });
    }
    
    let connection;
    try {
        const checkQuery = `SELECT id FROM accounting.nominatif_kegiatan WHERE id = ?`;
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status_2 = ?,
                catatan_status_2 = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const status2Value = status_2 && status_2 !== '' && status_2 !== null 
            ? String(status_2).trim() : null;
        const catatanValue = catatan_status_2 && catatan_status_2 !== '' && catatan_status_2 !== null
            ? String(catatan_status_2).trim() : null;
        
        await connection.execute(updateQuery, [status2Value, catatanValue, id]);
        
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, user_id, user_nama, user_role, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(historyQuery, [
            id, 'status2_updated', userId, username, 'admin',
            `Status_2 diubah menjadi: "${status2Value || '(kosong)'}"`
        ]);
        
        await connection.commit();
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Status_2 berhasil diperbarui'
        });
        
    } catch (error) {
        console.error('❌ Error updating status_2:', error);
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
            message: 'Gagal mengupdate status_2',
            error: error.message
        });
    }
});

// POST - Update data bendahara (untuk Admin)
router.put('/:id/bendahara', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);
    const { bendahara_nama, bendahara_nip } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya admin yang dapat mengupdate data bendahara'
        });
    }
    
    if (!bendahara_nama || !bendahara_nama.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Nama bendahara harus diisi'
        });
    }
    
    let connection;
    try {
        const checkQuery = `SELECT id FROM accounting.nominatif_kegiatan WHERE id = ?`;
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                bendahara_nama = ?,
                bendahara_nip = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await connection.execute(updateQuery, [bendahara_nama.trim(), bendahara_nip || null, id]);
        
        await connection.commit();
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Data bendahara berhasil diperbarui',
            data: {
                bendahara_nama: bendahara_nama,
                bendahara_nip: bendahara_nip || null
            }
        });
        
    } catch (error) {
        console.error('❌ Error updating bendahara:', error);
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
            message: 'Gagal mengupdate data bendahara',
            error: error.message
        });
    }
});



module.exports = router;