// routes/monev.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// Helper untuk mengecek role user
function getUserRoleInfo(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const normalizedRoles = roleArray.map(r => String(r).toLowerCase());
    
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

// Helper untuk cek akses Monev — hanya Admin, PPK, Kabag TU, dan Kepala Balai
function canAccessMonev(user) {
    const roleInfo = getUserRoleInfo(user);
    return roleInfo.isAdmin || roleInfo.isPPK || roleInfo.isKabagTu || roleInfo.isKabalai;
}

// Helper untuk membangun parameter IN (?) dari array — MySQL tidak bisa IN (?) dengan array
function buildInClause(arr, prefix = '') {
    if (!arr || arr.length === 0) return { clause: '1=0', params: [] };
    const placeholders = arr.map(() => '?').join(',');
    return {
        clause: prefix ? `${prefix} IN (${placeholders})` : `IN (${placeholders})`,
        params: arr
    };
}

// Helper safe parseFloat — menghindari NaN
function safeFloat(val, fallback = 0) {
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
}

// Middleware validasi akses Monev
const requireMonevAccess = (req, res, next) => {
    if (!canAccessMonev(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, PPK, Kabag TU, dan Kepala Balai yang dapat mengakses fitur ini.'
        });
    }
    next();
};

// ============ GET - Monev Perjadin (Monitoring & Evaluasi Perjalanan Dinas) ============
// Mengambil data kegiatan dengan status_2 = 'selesai'
// Setiap pegawai ditampilkan sebagai baris dengan rincian biaya
router.get('/', keycloakAuth, requireMonevAccess, async (req, res) => {
    const username = getUsername(req.user);
    console.log(`📊 ${username} mengakses monev perjadin`);

    try {
        const { tahun, bulan, search, ppk } = req.query;
        const filterTahun = tahun || new Date().getFullYear();
        if (isNaN(filterTahun) || filterTahun < 2000 || filterTahun > 2100) {
            return res.status(400).json({ success: false, message: 'Tahun tidak valid' });
        }

        let whereConditions = [`k.status = 'selesai'`, `k.status_2 = 'selesai'`];
        let params = [];

        // Filter tahun
        whereConditions.push(`(YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))`);
        params.push(filterTahun, filterTahun);

        // Filter bulan
        if (bulan && bulan !== 'all') {
            whereConditions.push(`(MONTH(k.tgl_st) = ? OR (k.tgl_st IS NULL AND MONTH(k.created_at) = ?))`);
            params.push(bulan, bulan);
        }

        // Filter PPK
        if (ppk && ppk !== 'all') {
            whereConditions.push(`k.ppk_nama = ?`);
            params.push(ppk);
        }

        // Filter search — termasuk cari di jenis UH (uang_harian_items) dan jenis transport (transportasi)
        if (search) {
            const searchParam = `%${search}%`;
            whereConditions.push(`(
                k.kegiatan LIKE ? 
                OR k.no_st LIKE ? 
                OR k.mak LIKE ? 
                OR p.nama LIKE ?
                OR EXISTS (
                    SELECT 1 FROM accounting.nominatif_biaya_kegiatan bk
                    INNER JOIN accounting.nominatif_uang_harian_items uh ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id AND uh.jenis LIKE ?
                )
                OR EXISTS (
                    SELECT 1 FROM accounting.nominatif_biaya_kegiatan bk
                    INNER JOIN accounting.nominatif_transportasi t ON t.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id AND t.trans LIKE ?
                )
            )`);
            params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const query = `
            SELECT 
                k.id as kegiatan_id,
                k.kegiatan as nama_kegiatan,
                k.mak,
                k.no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
                k.ppk_nama,
                k.ppk_nip,
                k.jenis_spm,
                k.catatan_status_2,
                k.user_id as creator_id,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as tgl_mulai,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as tgl_selesai,
                k.kota_kab_kecamatan as tempat,
                p.id as pegawai_id,
                p.nama as pegawai_nama,
                p.nip as pegawai_nip,
                p.pangkat as pegawai_pangkat,
                p.jabatan as pegawai_jabatan,
                p.total_biaya as pegawai_total_biaya,
                COALESCE((
                    SELECT SUM(t.total)
                    FROM accounting.nominatif_transportasi t
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON t.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0) as total_transport,
                COALESCE((
                    SELECT SUM(uh.total)
                    FROM accounting.nominatif_uang_harian_items uh
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0) as total_uang_harian,
                COALESCE((
                    SELECT SUM(ph.total)
                    FROM accounting.nominatif_penginapan_items ph
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON ph.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0) as total_penginapan
            FROM accounting.nominatif_kegiatan k
            INNER JOIN accounting.nominatif_pegawai p ON k.id = p.kegiatan_id
            ${whereClause}
                AND p.nip IS NOT NULL 
                AND TRIM(p.nip) != ''
                AND TRIM(p.nip) != '-'
            ORDER BY k.tgl_st DESC, k.id DESC, p.nama ASC
        `;

        console.log(`📝 Executing monev query...`);
        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Tidak ada data perjalanan dinas untuk periode yang dipilih',
                data: [],
                summary: {
                    total_kegiatan: 0,
                    total_pegawai: 0,
                    total_transport: 0,
                    total_uang_harian: 0,
                    total_penginapan: 0,
                    total_keseluruhan: 0
                }
            });
        }

        // ============ AMBIL BREAKDOWN TRANSPORT & UANG HARIAN PER PEGAWAI ============
        const pegawaiIds = rows.map(r => r.pegawai_id);
        const inPegawai = buildInClause(pegawaiIds, 'bk.pegawai_id');
        
        let transportBreakdown = [];
        let uhBreakdown = [];
        
        // Hanya query jika ada pegawaiIds (cek array kosong)
        if (pegawaiIds.length > 0) {
            // Ambil breakdown transport per jenis (trans)
            [transportBreakdown] = await db.query(`
                SELECT bk.pegawai_id, t.trans, SUM(t.total) as total
                FROM accounting.nominatif_transportasi t
                INNER JOIN accounting.nominatif_biaya_kegiatan bk ON t.biaya_id = bk.id
                WHERE ${inPegawai.clause}
                  AND t.trans IS NOT NULL AND t.trans != ''
                GROUP BY bk.pegawai_id, t.trans
                ORDER BY bk.pegawai_id, t.trans
            `, inPegawai.params);

            // Ambil breakdown uang harian per jenis
            [uhBreakdown] = await db.query(`
                SELECT bk.pegawai_id, uh.jenis, SUM(uh.total) as total
                FROM accounting.nominatif_uang_harian_items uh
                INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                WHERE ${inPegawai.clause}
                  AND uh.jenis IS NOT NULL AND uh.jenis != ''
                GROUP BY bk.pegawai_id, uh.jenis
                ORDER BY bk.pegawai_id, uh.jenis
            `, inPegawai.params);
        }

        // Group breakdown by pegawai_id
        const transportByPegawai = {};
        transportBreakdown.forEach(t => {
            if (!transportByPegawai[t.pegawai_id]) transportByPegawai[t.pegawai_id] = {};
            transportByPegawai[t.pegawai_id][t.trans] = safeFloat(t.total);
        });

        const uhByPegawai = {};
        uhBreakdown.forEach(u => {
            if (!uhByPegawai[u.pegawai_id]) uhByPegawai[u.pegawai_id] = {};
            uhByPegawai[u.pegawai_id][u.jenis] = safeFloat(u.total);
        });

        // Kelompokkan berdasarkan kegiatan untuk summary
        const kegiatanMap = {};
        rows.forEach(row => {
            if (!kegiatanMap[row.kegiatan_id]) {
                kegiatanMap[row.kegiatan_id] = {
                    id: row.kegiatan_id,
                    nama_kegiatan: row.nama_kegiatan,
                    mak: row.mak,
                    no_st: row.no_st,
                    tgl_st: row.tgl_st,
                    ppk_nama: row.ppk_nama,
                    ppk_nip: row.ppk_nip,
                    tgl_mulai: row.tgl_mulai,
                    tgl_selesai: row.tgl_selesai,
                    tempat: row.tempat,
                    total_pegawai: 0,
                    total_biaya: 0
                };
            }
            kegiatanMap[row.kegiatan_id].total_pegawai++;
            kegiatanMap[row.kegiatan_id].total_biaya += safeFloat(row.pegawai_total_biaya);
        });

        // Format response with breakdown
        const dataMonev = rows.map((row, index) => {
            const pegId = row.pegawai_id;
            const transportDetail = transportByPegawai[pegId] || {};
            const uhDetail = uhByPegawai[pegId] || {};

            return {
                no: index + 1,
                kegiatan_id: row.kegiatan_id,
                nama_kegiatan: row.nama_kegiatan,
                mak: row.mak,
                no_st: row.no_st,
                tgl_st: row.tgl_st,
                jenis_spm: row.jenis_spm,
                catatan_status_2: row.catatan_status_2,
                ppk_nama: row.ppk_nama,
                ppk_nip: row.ppk_nip,
                tgl_mulai: row.tgl_mulai,
                tgl_selesai: row.tgl_selesai,
                tempat: row.tempat,
                pegawai_id: pegId,
                pegawai_nama: row.pegawai_nama,
                pegawai_nip: row.pegawai_nip,
                pegawai_pangkat: row.pegawai_pangkat,
                pegawai_jabatan: row.pegawai_jabatan,
                pegawai_total_biaya: parseFloat(row.pegawai_total_biaya || 0),
                // Total agregat
                total_transport: parseFloat(row.total_transport || 0),
                total_uang_harian: parseFloat(row.total_uang_harian || 0),
                total_penginapan: parseFloat(row.total_penginapan || 0),
                // Breakdown detail
                transport_detail: transportDetail,
                uang_harian_detail: uhDetail
            };
        });

        // Hitung summary
        const summary = {
            total_kegiatan: Object.keys(kegiatanMap).length,
            total_pegawai: dataMonev.length,
            total_transport: dataMonev.reduce((sum, d) => sum + d.total_transport, 0),
            total_uang_harian: dataMonev.reduce((sum, d) => sum + d.total_uang_harian, 0),
            total_penginapan: dataMonev.reduce((sum, d) => sum + d.total_penginapan, 0),
            total_keseluruhan: dataMonev.reduce((sum, d) => sum + d.pegawai_total_biaya, 0),
            // Breakdown summary
            ...(() => {
                const transportAll = {};
                const uhAll = {};
                dataMonev.forEach(d => {
                    if (d.transport_detail) {
                        Object.entries(d.transport_detail).forEach(([key, val]) => {
                            transportAll[key] = (transportAll[key] || 0) + val;
                        });
                    }
                    if (d.uang_harian_detail) {
                        Object.entries(d.uang_harian_detail).forEach(([key, val]) => {
                            uhAll[key] = (uhAll[key] || 0) + val;
                        });
                    }
                });
                return {
                    transport_detail: transportAll,
                    uang_harian_detail: uhAll,
                    total_uh_biasa: uhAll['UH Biasa'] || uhAll['Uang Harian Biasa'] || 0,
                    total_uh_60: uhAll['UH 60%'] || uhAll['Uang Harian 60%'] || 0
                };
            })()
        };

        res.status(200).json({
            success: true,
            message: 'Data monev perjadin berhasil diambil',
            data: dataMonev,
            summary,
            kegiatan: Object.values(kegiatanMap)
        });

    } catch (error) {
        console.error('❌ Error fetching monev data:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});

// ============ GET Detail Monev per Pegawai ============
router.get('/pegawai/:pegawaiId', keycloakAuth, requireMonevAccess, async (req, res) => {
    const { pegawaiId } = req.params;
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} melihat detail monev pegawai ID: ${pegawaiId}`);

    try {
        // Ambil data pegawai dengan kegiatan
        const [pegawai] = await db.query(`
            SELECT 
                p.id,
                p.nama,
                p.nip,
                p.pangkat,
                p.jabatan,
                p.total_biaya,
                p.kegiatan_id,
                k.kegiatan as nama_kegiatan,
                k.mak,
                k.no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
                k.ppk_nama,
                k.ppk_nip,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as tgl_mulai,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as tgl_selesai,
                k.kota_kab_kecamatan as tempat
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE p.id = ? AND k.status = 'selesai' AND k.status_2 = 'selesai'
        `, [pegawaiId]);

        if (pegawai.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data pegawai tidak ditemukan'
            });
        }

        const pegawaiData = pegawai[0];

        // Ambil rincian biaya
        const [biayaList] = await db.query(`
            SELECT id as biaya_id FROM accounting.nominatif_biaya_kegiatan WHERE pegawai_id = ?
        `, [pegawaiId]);

        const biayaIds = biayaList.map(b => b.biaya_id);
        const inBiaya = buildInClause(biayaIds, 'biaya_id');
        let transportasi = [];
        let uangHarian = [];
        let penginapan = [];

        if (biayaIds.length > 0) {
            const [transportRows] = await db.query(
                `SELECT * FROM accounting.nominatif_transportasi WHERE ${inBiaya.clause}`,
                inBiaya.params
            );
            const [uhRows] = await db.query(
                `SELECT * FROM accounting.nominatif_uang_harian_items WHERE ${inBiaya.clause}`,
                inBiaya.params
            );
            const [penginapanRows] = await db.query(
                `SELECT * FROM accounting.nominatif_penginapan_items WHERE ${inBiaya.clause}`,
                inBiaya.params
            );

            transportasi = transportRows.map(t => ({
                id: t.id,
                trans: t.trans || '',
                harga: safeFloat(t.harga),
                total: safeFloat(t.total)
            }));

            uangHarian = uhRows.map(u => ({
                id: u.id,
                jenis: u.jenis || '',
                qty: safeFloat(u.qty),
                harga: safeFloat(u.harga),
                total: safeFloat(u.total)
            }));

            penginapan = penginapanRows.map(p => ({
                id: p.id,
                jenis: p.jenis || '',
                qty: safeFloat(p.qty),
                harga: safeFloat(p.harga),
                total: safeFloat(p.total)
            }));
        }

        const responseData = {
            ...pegawaiData,
            total_biaya: safeFloat(pegawaiData.total_biaya),
            rincian: {
                transportasi: {
                    items: transportasi,
                    subtotal: transportasi.reduce((sum, t) => sum + t.total, 0)
                },
                uang_harian: {
                    items: uangHarian,
                    subtotal: uangHarian.reduce((sum, u) => sum + u.total, 0)
                },
                penginapan: {
                    items: penginapan,
                    subtotal: penginapan.reduce((sum, p) => sum + p.total, 0)
                }
            }
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('❌ Error fetching detail monev pegawai:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});

// ============ GET - Daftar PPK untuk filter dropdown ============
router.get('/ppk-list', keycloakAuth, requireMonevAccess, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT TRIM(ppk_nama) as ppk_nama
            FROM accounting.nominatif_kegiatan
            WHERE status = 'selesai' 
              AND status_2 = 'selesai'
              AND ppk_nama IS NOT NULL 
              AND TRIM(ppk_nama) != ''
            ORDER BY ppk_nama ASC
        `);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('❌ Error fetching PPK list:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});

module.exports = router;
