const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// Helper function untuk check user role
const getUserRole = (user) => {
    const roles = user.extractedRoles || [];
    if (roles.some(r => r.toLowerCase() === 'admin')) return 'admin';
    if (roles.some(r => r.toLowerCase() === 'ppk')) return 'ppk';
    if (roles.some(r => r.toLowerCase().includes('kabalai'))) return 'kabalai';
    return 'regular';
};

// Helper function untuk build search query
const buildSearchQuery = (searchTerm, userId, userRole, limit) => {
    const searchQuery = `%${searchTerm}%`;
    let query = '';
    let params = [];

    // Base query dengan semua field yang dibutuhkan
    const baseQuery = `
        SELECT 
            k.id,
            k.kegiatan,
            k.mak,
            k.no_st,
            DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
            k.status,
            k.kota_kab_kecamatan,
            DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
            k.ppk_nama,
            DATE_FORMAT(k.tanggal_disetujui, '%Y-%m-%d %H:%i:%s') as tanggal_disetujui,
            k.diketahui_oleh,
            DATE_FORMAT(k.tanggal_diketahui, '%Y-%m-%d %H:%i:%s') as tanggal_diketahui,
            DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
            DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
            (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as jumlah_pegawai,
            (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
        FROM accounting.nominatif_kegiatan k
        WHERE 
    `;

    // Filter berdasarkan role
    if (userRole === 'regular') {
        query = baseQuery + `
            k.user_id = ? AND (
                k.kegiatan LIKE ? OR
                k.mak LIKE ? OR
                k.no_st LIKE ? OR
                k.kota_kab_kecamatan LIKE ? OR
                k.ppk_nama LIKE ? OR
                k.diketahui_oleh LIKE ?
            )
        `;
        params = [userId, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery];
    } else {
        // Admin, PPK, Kabalai bisa melihat semua
        query = baseQuery + `
            k.kegiatan LIKE ? OR
            k.mak LIKE ? OR
            k.no_st LIKE ? OR
            k.kota_kab_kecamatan LIKE ? OR
            k.ppk_nama LIKE ? OR
            k.diketahui_oleh LIKE ?
        `;
        params = [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery];
    }

    // Add order and limit
    query += ` ORDER BY k.updated_at DESC LIMIT ?`;
    params.push(limit);

    return { query, params };
};

// GET - Simple search endpoint
router.get('/search', keycloakAuth, async (req, res) => {
    try {
        const { q: searchTerm, limit = 50 } = req.query;
        const userId = getUserId(req.user); // Keycloak user ID
        const username = getUsername(req.user);
        const userRole = getUserRole(req.user);

        console.log(`🔍 User ${username} (ppk_id: ${userId}, Role: ${userRole}) searching for: "${searchTerm}"`);

        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Kata kunci pencarian tidak boleh kosong'
            });
        }

        const searchPattern = `%${searchTerm.trim()}%`;
        
        // Query yang hanya menampilkan data untuk PPK dengan ppk_id yang sesuai
        // DAN status != 'diajukan' (tidak menampilkan data dengan status diajukan)
        const query = `
            SELECT 
                nk.id,
                nk.kegiatan,
                nk.mak,
                nk.no_st,
                nk.tgl_st,
                nk.status,
                nk.kota_kab_kecamatan,
                nk.rencana_tanggal_pelaksanaan,
                nk.ppk_nama,
                nk.ppk_id,
                nk.tanggal_disetujui,
                nk.diketahui_oleh,
                nk.tanggal_diketahui,
                nk.created_at,
                nk.updated_at
              
               
            FROM accounting.nominatif_kegiatan nk
            WHERE nk.ppk_id = ?  -- Filter berdasarkan ppk_id
            AND nk.status != 'diajukan' AND nk.status != 'selesai' AND nk.status != 'dikembalikan' 
            AND (
                nk.kegiatan LIKE ? OR
                nk.mak LIKE ? OR
                nk.no_st LIKE ? OR
                nk.status LIKE ? OR
                nk.kota_kab_kecamatan LIKE ? OR
                nk.ppk_nama LIKE ? OR
                nk.diketahui_oleh LIKE ?
            )
            ORDER BY nk.updated_at DESC
            LIMIT ?
        `;

        const params = [
            userId,           // nk.ppk_id = ? (Keycloak user ID)
            searchPattern,    // nk.kegiatan LIKE ?
            searchPattern,    // nk.mak LIKE ?
            searchPattern,    // nk.no_st LIKE ?
            searchPattern,    // nk.status LIKE ?
            searchPattern,    // nk.kota_kab_kecamatan LIKE ?
            searchPattern,    // nk.ppk_nama LIKE ?
            searchPattern,    // nk.diketahui_oleh LIKE ?
            parseInt(limit)   // LIMIT ?
        ];

        console.log('📝 Query with ppk_id filter (excluding status=diajukan):', query);
        console.log('📝 Query params:', params);

        // Execute query
        const [rows] = await db.query(query, params);

        console.log(`✅ Found ${rows.length} results for ppk_id: ${userId} (excluding 'diajukan' status)`);

        // Format response
        const results = rows.map(row => ({
            id: row.id,
            kegiatan: row.kegiatan,
            mak: row.mak,
            no_st: row.no_st,
            tgl_st: row.tgl_st,
            status: row.status,
            kota_kab_kecamatan: row.kota_kab_kecamatan,
            rencana_tanggal_pelaksanaan: row.rencana_tanggal_pelaksanaan,
            ppk_nama: row.ppk_nama,
            ppk_id: row.ppk_id,
            tanggal_disetujui: row.tanggal_disetujui,
            diketahui_oleh: row.diketahui_oleh,
            tanggal_diketahui: row.tanggal_diketahui,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            jumlah_pegawai: row.jumlah_pegawai,
            total_biaya: row.total_biaya
        }));

        // Jika tidak ada hasil dengan ppk_id, coba dengan ppk_nama sebagai fallback (tapi tetap exclude diajukan)
        if (results.length === 0) {
            console.log(`⚠️ No data found with ppk_id: ${userId}. Trying fallback with ppk_nama (excluding diajukan)...`);
            
            const fallbackQuery = `
                SELECT 
                    nk.id,
                    nk.kegiatan,
                    nk.mak,
                    nk.no_st,
                    nk.tgl_st,
                    nk.status,
                    nk.kota_kab_kecamatan,
                    nk.rencana_tanggal_pelaksanaan,
                    nk.ppk_nama,
                    nk.ppk_id,
                    nk.tanggal_disetujui,
                    nk.diketahui_oleh,
                    nk.tanggal_diketahui,
                    nk.created_at,
                    nk.updated_at
                    
                FROM accounting.nominatif_kegiatan nk
                WHERE nk.ppk_nama = ?
                AND nk.status != 'diajukan'  -- Juga exclude diajukan di fallback
                AND (
                    nk.kegiatan LIKE ? OR
                    nk.mak LIKE ? OR
                    nk.no_st LIKE ? OR
                    nk.status LIKE ? OR
                    nk.kota_kab_kecamatan LIKE ? OR
                    nk.ppk_nama LIKE ? OR
                    nk.diketahui_oleh LIKE ?
                )
                ORDER BY nk.updated_at DESC
                LIMIT ?
            `;
            
            const fallbackParams = [
                username,
                searchPattern, searchPattern, searchPattern, searchPattern,
                searchPattern, searchPattern, searchPattern,
                parseInt(limit)
            ];
            
            const [fallbackRows] = await db.query(fallbackQuery, fallbackParams);
            
            if (fallbackRows.length > 0) {
                console.log(`✅ Found ${fallbackRows.length} results with ppk_nama fallback for: ${username} (excluding diajukan)`);
                
                const fallbackResults = fallbackRows.map(row => ({
                    id: row.id,
                    kegiatan: row.kegiatan,
                    mak: row.mak,
                    no_st: row.no_st,
                    tgl_st: row.tgl_st,
                    status: row.status,
                    kota_kab_kecamatan: row.kota_kab_kecamatan,
                    rencana_tanggal_pelaksanaan: row.rencana_tanggal_pelaksanaan,
                    ppk_nama: row.ppk_nama,
                    ppk_id: row.ppk_id,
                    tanggal_disetujui: row.tanggal_disetujui,
                    diketahui_oleh: row.diketahui_oleh,
                    tanggal_diketahui: row.tanggal_diketahui,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    jumlah_pegawai: row.jumlah_pegawai,
                    total_biaya: row.total_biaya
                }));
                
                return res.json({
                    success: true,
                    data: fallbackResults,
                    meta: {
                        count: fallbackResults.length,
                        limit: parseInt(limit),
                        searchTerm: searchTerm.trim(),
                        ppk_nama: username,
                        ppk_id: userId,
                        userRole,
                        filter_type: 'ppk_nama_fallback',
                        status_filter: 'excluding_diajukan',
                        message: `Data ditemukan berdasarkan nama PPK: ${username} (kecuali status diajukan)`
                    }
                });
            }
        }

        res.json({
            success: true,
            data: results,
            meta: {
                count: results.length,
                limit: parseInt(limit),
                searchTerm: searchTerm.trim(),
                ppk_nama: username,
                ppk_id: userId,
                userRole,
                filter_type: 'ppk_id',
                status_filter: 'excluding_diajukan',
                message: results.length > 0 
                    ? `Data ditemukan untuk PPK: ${username} (kecuali status diajukan)` 
                    : `Tidak ada data yang ditemukan untuk PPK: ${username} (kecuali status diajukan)`
            }
        });

    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat melakukan pencarian',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            } : undefined
        });
    }
});


// GET - Search stats (untuk dashboard)
router.get('/search/stats', keycloakAuth, async (req, res) => {
    try {
        const userId = getUserId(req.user);
        const userRole = getUserRole(req.user);

        let query = '';
        let params = [];

        if (userRole === 'regular') {
            query = `
                SELECT 
                    COUNT(*) as total_kegiatan,
                    SUM(CASE WHEN no_st IS NOT NULL AND tgl_st IS NOT NULL THEN 1 ELSE 0 END) as total_selesai,
                    COUNT(DISTINCT status) as status_count
                FROM accounting.nominatif_kegiatan 
                WHERE user_id = ?
            `;
            params = [userId];
        } else {
            query = `
                SELECT 
                    COUNT(*) as total_kegiatan,
                    SUM(CASE WHEN no_st IS NOT NULL AND tgl_st IS NOT NULL THEN 1 ELSE 0 END) as total_selesai,
                    COUNT(DISTINCT status) as status_count
                FROM accounting.nominatif_kegiatan
            `;
        }

        const [[stats]] = await db.query(query, params);

        res.json({
            success: true,
            data: {
                total_kegiatan: stats.total_kegiatan,
                total_selesai: stats.total_selesai,
                status_count: stats.status_count
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik'
        });
    }
});

// Cancel kegiatan dari search - SEDERHANA
router.put('/:id/cancel', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    
    // Ambil user info dari token Keycloak
    const userId = getUserId(req.user);
    const username = req.user?.preferred_username || req.user?.name || req.user?.username || 'User';
    
    console.log(`❌ User ${username} membatalkan kegiatan ID ${id}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    try {
        // Cek apakah kegiatan ada
        const checkQuery = `
            SELECT 
                id,
                kegiatan,
                status,
                no_st,
                tgl_st
            FROM accounting.nominatif_kegiatan 
            WHERE id = ?
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
            status: kegiatan.status
        });
        
        // Cek apakah sudah dibatalkan
        if (kegiatan.status === 'dibatalkan') {
            return res.status(400).json({
                success: false,
                message: 'Kegiatan sudah dalam status dibatalkan'
            });
        }
        
        // Cek apakah sudah ada No. ST (tidak bisa dibatalkan jika sudah selesai)
        if (kegiatan.no_st && kegiatan.tgl_st) {
            return res.status(400).json({
                success: false,
                message: 'Kegiatan yang sudah memiliki No. ST tidak dapat dibatalkan'
            });
        }
        
        // Update status menjadi 'dibatalkan' dan tanggal_dikembalikan
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'dibatalkan',
                tanggal_dikembalikan = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        console.log('📝 Update query:', updateQuery, [id]);
        
        const [updateResult] = await db.query(updateQuery, [id]);
        
        console.log('✅ Update result:', updateResult);
        
        if (updateResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengupdate status kegiatan'
            });
        }
        
        console.log(`✅ Status berhasil diupdate menjadi "dibatalkan" untuk kegiatan ID: ${id}`);
        console.log(`📤 Kegiatan "${kegiatan.kegiatan}" berhasil dibatalkan oleh ${username}`);
        
        // Ambil data terbaru
        const getUpdatedQuery = `
            SELECT 
                *,
                DATE_FORMAT(tanggal_dikembalikan, '%Y-%m-%d %H:%i:%s') as tanggal_dikembalikan_format
            FROM accounting.nominatif_kegiatan 
            WHERE id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        const updatedKegiatan = updatedRows[0];
        
        // Response sederhana
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dibatalkan',
            data: {
                id: updatedKegiatan.id,
                kegiatan: updatedKegiatan.kegiatan,
                status: updatedKegiatan.status,
                tanggal_dikembalikan: updatedKegiatan.tanggal_dikembalikan_format,
                cancelled_by: username,
                cancelled_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error cancel kegiatan:', error);
        
        // Berikan pesan error yang lebih spesifik
        let errorMessage = 'Gagal membatalkan kegiatan';
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


module.exports = router;