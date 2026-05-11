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

// Helper function untuk mendapatkan informasi user lengkap
const getUserInfo = (user) => {
    const userId = getUserId(user);
    const username = getUsername(user);
    const userNip = user?.nip || user?.preferred_username || username;
    const userRole = getUserRole(user);
    
    return { userId, username, userNip, userRole };
};

// GET - Search endpoint dengan filter berdasarkan role
router.get('/search', keycloakAuth, async (req, res) => {
    try {
        const { q: searchTerm, limit = 100 } = req.query;
        const userId = getUserId(req.user);
        const username = getUsername(req.user);
        const userRole = getUserRole(req.user);

        console.log(`🔍 User ${username} (user_id: ${userId}, Role: ${userRole}) searching for: "${searchTerm}"`);

        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Kata kunci pencarian tidak boleh kosong'
            });
        }

        const searchPattern = `%${searchTerm.trim()}%`;
        let query = '';
        let params = [];

        if (userRole === 'admin') {
            // ADMIN: Bisa melihat SEMUA kegiatan (tanpa filter ppk_id)
            query = `
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
                    nk.updated_at,
                    (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = nk.id) as jumlah_pegawai,
                    (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = nk.id) as total_biaya
                FROM accounting.nominatif_kegiatan nk
                WHERE nk.status != 'diajukan' 
                AND nk.status != 'selesai' 
                AND nk.status != 'dikembalikan'
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
            params = [
                searchPattern, searchPattern, searchPattern, searchPattern,
                searchPattern, searchPattern, searchPattern,
                parseInt(limit)
            ];
            console.log('👑 Admin mode: mencari semua kegiatan');
        } else if (userRole === 'ppk') {
            // PPK: Hanya bisa melihat kegiatan yang menjadi tanggung jawabnya
            query = `
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
                    nk.updated_at,
                    (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = nk.id) as jumlah_pegawai,
                    (SELECT COALESCE(SUM(total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = nk.id) as total_biaya
                FROM accounting.nominatif_kegiatan nk
                WHERE (nk.ppk_id = ? OR nk.ppk_nama = ? OR nk.ppk_nip = ?)
                AND nk.status != 'diajukan' 
                AND nk.status != 'selesai' 
                AND nk.status != 'dikembalikan'
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
            params = [
                userId, username, userId,  // ppk_id, ppk_nama, ppk_nip
                searchPattern, searchPattern, searchPattern, searchPattern,
                searchPattern, searchPattern, searchPattern,
                parseInt(limit)
            ];
            console.log(`📋 PPK mode: mencari kegiatan untuk PPK ID: ${userId}, Nama: ${username}`);
        } else {
            // Role lain tidak diizinkan
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke fitur ini. Hanya Admin dan PPK yang dapat mengakses.'
            });
        }

        console.log('📝 Query:', query);
        console.log('📝 Query params:', params);

        const [rows] = await db.query(query, params);

        console.log(`✅ Found ${rows.length} results for ${userRole}`);

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

        res.json({
            success: true,
            data: results,
            meta: {
                count: results.length,
                limit: parseInt(limit),
                searchTerm: searchTerm.trim(),
                userRole: userRole,
                filter_type: userRole === 'admin' ? 'admin_all' : 'ppk_filtered',
                status_filter: 'excluding_diajukan_selesai_dikembalikan',
                message: results.length > 0 
                    ? `Ditemukan ${results.length} data untuk ${userRole === 'admin' ? 'Admin' : `PPK: ${username}`}`
                    : `Tidak ada data yang ditemukan`
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
        const username = getUsername(req.user);
        const userRole = getUserRole(req.user);

        let query = '';
        let params = [];

        if (userRole === 'admin') {
            // Admin: statistik semua kegiatan
            query = `
                SELECT 
                    COUNT(*) as total_kegiatan,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as total_draft,
                    SUM(CASE WHEN status = 'diajukan' THEN 1 ELSE 0 END) as total_diajukan,
                    SUM(CASE WHEN status = 'disetujui' THEN 1 ELSE 0 END) as total_disetujui,
                    SUM(CASE WHEN status = 'diketahui' THEN 1 ELSE 0 END) as total_diketahui,
                    SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as total_selesai,
                    SUM(CASE WHEN status = 'dibatalkan' THEN 1 ELSE 0 END) as total_dibatalkan,
                    SUM(CASE WHEN no_st IS NOT NULL AND tgl_st IS NOT NULL THEN 1 ELSE 0 END) as total_selesai_st,
                    COUNT(DISTINCT status) as status_count,
                    COALESCE(SUM(total_biaya), 0) as total_anggaran
                FROM accounting.nominatif_kegiatan
            `;
        } else if (userRole === 'ppk') {
            // PPK: statistik hanya untuk kegiatannya
            query = `
                SELECT 
                    COUNT(*) as total_kegiatan,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as total_draft,
                    SUM(CASE WHEN status = 'diajukan' THEN 1 ELSE 0 END) as total_diajukan,
                    SUM(CASE WHEN status = 'disetujui' THEN 1 ELSE 0 END) as total_disetujui,
                    SUM(CASE WHEN status = 'diketahui' THEN 1 ELSE 0 END) as total_diketahui,
                    SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as total_selesai,
                    SUM(CASE WHEN status = 'dibatalkan' THEN 1 ELSE 0 END) as total_dibatalkan,
                    SUM(CASE WHEN no_st IS NOT NULL AND tgl_st IS NOT NULL THEN 1 ELSE 0 END) as total_selesai_st,
                    COUNT(DISTINCT status) as status_count,
                    COALESCE(SUM(total_biaya), 0) as total_anggaran
                FROM accounting.nominatif_kegiatan
                WHERE ppk_id = ? OR ppk_nama = ? OR ppk_nip = ?
            `;
            params = [userId, username, userId];
        } else {
            return res.status(403).json({
                success: false,
                message: 'Hanya Admin dan PPK yang dapat mengakses statistik'
            });
        }

        const [rows] = await db.query(query, params);
        const stats = rows[0] || {};

        res.json({
            success: true,
            data: {
                total_kegiatan: stats.total_kegiatan || 0,
                total_draft: stats.total_draft || 0,
                total_diajukan: stats.total_diajukan || 0,
                total_disetujui: stats.total_disetujui || 0,
                total_diketahui: stats.total_diketahui || 0,
                total_selesai: stats.total_selesai || 0,
                total_dibatalkan: stats.total_dibatalkan || 0,
                total_selesai_st: stats.total_selesai_st || 0,
                status_count: stats.status_count || 0,
                total_anggaran: stats.total_anggaran || 0
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

// Cancel kegiatan - Admin bisa semua, PPK hanya kegiatannya sendiri
router.put('/:id/cancel', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const { alasan_pembatalan } = req.body;
    
    const { userId, username, userNip, userRole } = getUserInfo(req.user);
    
    console.log(`❌ User ${username} (Role: ${userRole}, ID: ${userId}) mencoba membatalkan kegiatan ID ${id}`);
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kegiatan tidak valid'
        });
    }
    
    try {
        const checkQuery = `
            SELECT 
                id,
                kegiatan,
                status,
                no_st,
                tgl_st,
                ppk_id,
                ppk_nama,
                ppk_nip,
                user_id
            FROM accounting.nominatif_kegiatan 
            WHERE id = ?
        `;
        
        const [checkRows] = await db.query(checkQuery, [id]);
        
        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }
        
        const kegiatan = checkRows[0];
        
        // Cek otorisasi berdasarkan role
        let isAuthorized = false;
        let authorizedReason = '';
        
        if (userRole === 'admin') {
            // ADMIN: Bisa membatalkan SEMUA kegiatan tanpa pengecualian
            isAuthorized = true;
            authorizedReason = 'Admin memiliki wewenang penuh';
            console.log(`✅ Admin ${username} authorized to cancel any kegiatan`);
        } else if (userRole === 'ppk') {
            // PPK: Hanya bisa membatalkan kegiatan yang menjadi tanggung jawabnya
            const isMatchById = kegiatan.ppk_id === userId;
            const isMatchByNip = kegiatan.ppk_nip === userNip;
            const isMatchByName = kegiatan.ppk_nama === username;
            
            if (isMatchById || isMatchByNip || isMatchByName) {
                isAuthorized = true;
                authorizedReason = `PPK match (id:${isMatchById}, nip:${isMatchByNip}, name:${isMatchByName})`;
                console.log(`✅ PPK ${username} authorized to cancel kegiatan ${id}`);
            } else {
                console.log(`❌ PPK ${username} NOT authorized. Kegiatan ppk_id: ${kegiatan.ppk_id}, ppk_nama: ${kegiatan.ppk_nama}`);
            }
        } else {
            console.log(`❌ User role ${userRole} not authorized to cancel`);
        }
        
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki wewenang untuk membatalkan kegiatan ini. Hanya Admin atau PPK yang bersangkutan yang dapat membatalkan.'
            });
        }
        
        // Cek apakah sudah dibatalkan
        if (kegiatan.status === 'dibatalkan') {
            return res.status(400).json({
                success: false,
                message: 'Kegiatan sudah dalam status dibatalkan'
            });
        }
        
        const previousStatus = kegiatan.status;
        const hasNoST = !kegiatan.no_st || !kegiatan.tgl_st;
        const cancelReason = alasan_pembatalan || `Dibatalkan oleh ${userRole === 'admin' ? 'Administrator' : 'PPK'} (${username})`;
        
        // Update status menjadi 'dibatalkan'
        const updateQuery = `
            UPDATE accounting.nominatif_kegiatan 
            SET 
                status = 'dibatalkan',
                tanggal_dikembalikan = NOW(),
                updated_at = NOW(),
                catatan = CONCAT(
                    IFNULL(catatan, ''),
                    '\n[${new Date().toISOString()}] DIBATALKAN oleh ${username} (${userRole})',
                    '\nAlasan: ${cancelReason.replace(/'/g, "''")}'
                )
            WHERE id = ?
        `;
        
        const [updateResult] = await db.query(updateQuery, [id]);
        
        if (updateResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengupdate status kegiatan'
            });
        }
        
        // Catat ke history status
        const historyQuery = `
            INSERT INTO accounting.nominatif_status_history 
            (kegiatan_id, status, catatan, user_id, user_nama, user_role, tanggal_status)
            VALUES (?, 'dibatalkan', ?, ?, ?, ?, NOW())
        `;
        
        const historyNote = `Dibatalkan oleh ${username} (${userRole}). Status sebelumnya: ${previousStatus}. Alasan: ${cancelReason}`;
        
        await db.query(historyQuery, [id, historyNote, userId, username, userRole]);
        
        console.log(`✅ Kegiatan ID ${id} berhasil dibatalkan oleh ${username} (${userRole})`);
        console.log(`   Status sebelumnya: ${previousStatus}`);
        console.log(`   Alasan: ${cancelReason}`);
        
        // Ambil data terbaru
        const getUpdatedQuery = `
            SELECT 
                *,
                DATE_FORMAT(tanggal_dikembalikan, '%Y-%m-%d %H:%i:%s') as tanggal_dibatalakan_format,
                DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_format
            FROM accounting.nominatif_kegiatan 
            WHERE id = ?
        `;
        
        const [updatedRows] = await db.query(getUpdatedQuery, [id]);
        const updatedKegiatan = updatedRows[0];
        
        res.status(200).json({
            success: true,
            message: 'Kegiatan berhasil dibatalkan',
            data: {
                id: updatedKegiatan.id,
                kegiatan: updatedKegiatan.kegiatan,
                status: updatedKegiatan.status,
                status_sebelumnya: previousStatus,
                tanggal_dibatalkan: updatedKegiatan.tanggal_dibatalakan_format,
                dibatalkan_oleh: {
                    username: username,
                    user_id: userId,
                    role: userRole,
                    nip: userNip
                },
                alasan_pembatalan: cancelReason,
                memiliki_no_st: hasNoST ? 'Tidak' : `Ya (${kegiatan.no_st})`,
                dibatalkan_pada: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error cancel kegiatan:', error);
        
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