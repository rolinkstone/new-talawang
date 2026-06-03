// routes/laporan.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// ========== HELPER FUNCTIONS ==========

// Cek apakah user memiliki role Kepala Balai
const hasKepalaBalaiRole = (user) => {
    if (user.isKabalai) return true;
    
    const roles = user.extractedRoles || user.role || [];
    if (Array.isArray(roles)) {
        return roles.some(r => r.toLowerCase().includes('kabalai') || r.toLowerCase().includes('kepala balai'));
    }
    if (typeof roles === 'string') {
        const roleLower = roles.toLowerCase();
        return roleLower.includes('kabalai') || roleLower.includes('kepala balai');
    }
    return false;
};

// Cek apakah user memiliki role Admin
const hasAdminRole = (user) => {
    if (user.isAdmin) return true;
    
    const roles = user.extractedRoles || user.role || [];
    if (Array.isArray(roles)) {
        return roles.some(r => r.toLowerCase().includes('admin'));
    }
    if (typeof roles === 'string') {
        return roles.toLowerCase().includes('admin');
    }
    return false;
};

// Helper untuk mengecek apakah NIP valid (bukan -, --, ---, null, empty)
const isValidNip = (nip) => {
    if (!nip) return false;
    const nipStr = String(nip).trim();
    if (nipStr === '') return false;
    if (nipStr === '-') return false;
    if (nipStr === '--') return false;
    if (nipStr === '---') return false;
    if (nipStr.match(/^[-]+$/)) return false; // hanya karakter -
    return true;
};

// ========== TEST ROUTE ==========
router.get('/test', keycloakAuth, async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Laporan API is working',
        user: {
            username: getUsername(req.user),
            isKabalai: hasKepalaBalaiRole(req.user),
            isAdmin: hasAdminRole(req.user)
        }
    });
});

// ========== LAPORAN REKAP PEGAWAI PERJADIN ==========
router.get('/rekap-pegawai', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses laporan rekap pegawai perjadin`);
    
    // Validasi role: hanya Kepala Balai atau Admin
    if (!hasKepalaBalaiRole(req.user) && !hasAdminRole(req.user)) {
        console.log(`❌ Akses ditolak untuk ${username}: bukan Kepala Balai atau Admin`);
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Kepala Balai dan Admin yang dapat mengakses laporan ini.'
        });
    }
    
    try {
        const { bulan, tahun, pegawai_nip, status_2 = 'selesai', jenis_spm = 'LS' } = req.query;
        
        // Filter tahun (default tahun berjalan)
        const filterTahun = tahun || new Date().getFullYear();
        
        // Build WHERE clause
        let whereConditions = [];
        let params = [];
        
        // Filter jenis_spm (default 'LS')
        if (jenis_spm && jenis_spm !== 'all') {
            whereConditions.push(`k.jenis_spm = ?`);
            params.push(jenis_spm);
        }
        
        // Filter status_2 (default 'selesai')
        if (status_2 && status_2 !== 'all') {
            whereConditions.push(`k.status_2 = ?`);
            params.push(status_2);
        }
        
        // Filter status utama harus 'selesai' (sudah ada surat tugas)
        whereConditions.push(`k.status = 'selesai'`);
        
        // Filter tahun (dari tgl_st atau created_at)
        whereConditions.push(`(YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))`);
        params.push(filterTahun, filterTahun);
        
        // Filter bulan (opsional)
        if (bulan && bulan !== 'all') {
            whereConditions.push(`(MONTH(k.tgl_st) = ? OR (k.tgl_st IS NULL AND MONTH(k.created_at) = ?))`);
            params.push(bulan, bulan);
        }
        
        // Filter pegawai spesifik berdasarkan NIP (opsional)
        if (pegawai_nip && pegawai_nip !== 'all') {
            whereConditions.push(`REPLACE(p.nip, ' ', '') = ?`);
            params.push(pegawai_nip.replace(/\s/g, ''));
        }
        
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';
        
        // Query dengan filter NIP valid (bukan -, --, ---, null, empty)
        const query = `
            SELECT 
                REPLACE(p.nip, ' ', '') as pegawai_nip_normalized,
                MAX(p.nip) as pegawai_nip,
                MAX(p.nama) as pegawai_nama,
                MAX(p.pangkat) as pegawai_pangkat,
                MAX(p.jabatan) as pegawai_jabatan,
                COUNT(DISTINCT k.id) as jumlah_perjalanan,
                SUM(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as total_hari_dinas,
                SUM(COALESCE((
                    SELECT SUM(uh.total)
                    FROM accounting.nominatif_uang_harian_items uh
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0)) as total_uang_harian
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            ${whereClause}
                AND p.nip IS NOT NULL 
                AND TRIM(p.nip) != ''
                AND TRIM(p.nip) != '-'
                AND TRIM(p.nip) != '--'
                AND TRIM(p.nip) != '---'
                AND TRIM(p.nip) NOT REGEXP '^-+$'
            GROUP BY REPLACE(p.nip, ' ', '')
            HAVING pegawai_nip_normalized IS NOT NULL 
                AND pegawai_nip_normalized != ''
                AND pegawai_nip_normalized NOT REGEXP '^-+$'
            ORDER BY total_uang_harian DESC, pegawai_nama ASC
        `;
        
        console.log(`📝 Executing query with params:`, params);
        const [rows] = await db.query(query, params);
        
        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Tidak ada data perjalanan dinas untuk periode yang dipilih',
                data: [],
                summary: {
                    total_pegawai: 0,
                    total_perjalanan: 0,
                    total_hari_dinas: 0,
                    total_uang_harian: 0
                }
            });
        }
        
        // Format data
        const dataRekap = rows.map((row, index) => ({
            no: index + 1,
            pegawai_id: row.pegawai_nip_normalized,
            pegawai_nama: row.pegawai_nama,
            pegawai_nip: row.pegawai_nip,
            pegawai_pangkat: row.pegawai_pangkat,
            pegawai_jabatan: row.pegawai_jabatan,
            jumlah_perjalanan: parseInt(row.jumlah_perjalanan) || 0,
            total_hari_dinas: parseInt(row.total_hari_dinas) || 0,
            total_uang_harian: parseFloat(row.total_uang_harian) || 0,
            rata_rata_uang_harian_per_hari: row.total_hari_dinas > 0 
                ? Math.round((parseFloat(row.total_uang_harian) || 0) / (parseInt(row.total_hari_dinas) || 1)) 
                : 0,
            rata_rata_uang_harian_per_perjalanan: row.jumlah_perjalanan > 0 
                ? Math.round((parseFloat(row.total_uang_harian) || 0) / (parseInt(row.jumlah_perjalanan) || 1)) 
                : 0
        }));
        
        const summary = {
            total_pegawai: dataRekap.length,
            total_perjalanan: dataRekap.reduce((sum, item) => sum + item.jumlah_perjalanan, 0),
            total_hari_dinas: dataRekap.reduce((sum, item) => sum + item.total_hari_dinas, 0),
            total_uang_harian: dataRekap.reduce((sum, item) => sum + item.total_uang_harian, 0)
        };
        
        console.log(`✅ Laporan rekap berhasil dihasilkan: ${dataRekap.length} pegawai`);
        
        res.status(200).json({
            success: true,
            message: 'Laporan rekap pegawai perjadin berhasil diambil',
            data: dataRekap,
            summary: summary
        });
        
    } catch (error) {
        console.error('❌ Error generating laporan rekap:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data laporan',
            error: error.message
        });
    }
});

// ========== GET DROPDOWN OPTIONS ==========
router.get('/options', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📋 ${username} mengakses options laporan`);
    
    if (!hasKepalaBalaiRole(req.user) && !hasAdminRole(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak'
        });
    }
    
    try {
        // Daftar pegawai unik berdasarkan NIP (filter NIP valid)
        const pegawaiQuery = `
            SELECT DISTINCT 
                REPLACE(p.nip, ' ', '') as id,
                MAX(p.nama) as nama,
                MAX(p.nip) as nip,
                MAX(p.pangkat) as pangkat,
                MAX(p.jabatan) as jabatan
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE k.status = 'selesai'
                AND p.nip IS NOT NULL 
                AND TRIM(p.nip) != ''
                AND TRIM(p.nip) != '-'
                AND TRIM(p.nip) != '--'
                AND TRIM(p.nip) != '---'
                AND TRIM(p.nip) NOT REGEXP '^-+$'
            GROUP BY REPLACE(p.nip, ' ', '')
            ORDER BY MAX(p.nama) ASC
        `;
        
        // Daftar tahun yang tersedia
        const tahunQuery = `
            SELECT DISTINCT YEAR(tgl_st) as tahun
            FROM accounting.nominatif_kegiatan
            WHERE status = 'selesai' AND tgl_st IS NOT NULL
            UNION
            SELECT DISTINCT YEAR(created_at) as tahun
            FROM accounting.nominatif_kegiatan
            WHERE status = 'selesai'
            ORDER BY tahun DESC
        `;
        
        // Daftar status_2 yang tersedia
        const status2Query = `
            SELECT DISTINCT status_2
            FROM accounting.nominatif_kegiatan
            WHERE status = 'selesai' AND status_2 IS NOT NULL AND status_2 != ''
            ORDER BY status_2 ASC
        `;
        
        // Daftar jenis_spm yang tersedia
        const jenisSpmQuery = `
            SELECT DISTINCT jenis_spm
            FROM accounting.nominatif_kegiatan
            WHERE status = 'selesai' AND jenis_spm IS NOT NULL AND jenis_spm != ''
            ORDER BY jenis_spm ASC
        `;
        
        const [pegawaiRows] = await db.query(pegawaiQuery);
        const [tahunRows] = await db.query(tahunQuery);
        const [status2Rows] = await db.query(status2Query);
        const [jenisSpmRows] = await db.query(jenisSpmQuery);
        
        console.log(`✅ Options loaded: ${pegawaiRows.length} pegawai, ${tahunRows.length} tahun, ${status2Rows.length} status, ${jenisSpmRows.length} jenis_spm`);
        
        res.status(200).json({
            success: true,
            data: {
                pegawai: pegawaiRows,
                tahun: tahunRows.map(row => row.tahun),
                status_2: status2Rows.map(row => row.status_2),
                jenis_spm: jenisSpmRows.map(row => row.jenis_spm)
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching options:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data opsi filter',
            error: error.message
        });
    }
});

// ========== LAPORAN DETAIL PER PEGAWAI ==========
router.get('/pegawai/:nip', keycloakAuth, async (req, res) => {
    const { nip } = req.params;
    const username = getUsername(req.user);
    
    if (!hasKepalaBalaiRole(req.user) && !hasAdminRole(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Kepala Balai dan Admin yang dapat mengakses laporan ini.'
        });
    }
    
    if (!nip) {
        return res.status(400).json({
            success: false,
            message: 'NIP pegawai tidak valid'
        });
    }
    
    try {
        const { tahun, status_2 = 'selesai', jenis_spm = 'LS' } = req.query;
        const filterTahun = tahun || new Date().getFullYear();
        const normalizedNip = nip.replace(/\s/g, '');
        
        // Query untuk mendapatkan data pegawai
        const pegawaiQuery = `
            SELECT 
                MAX(p.nama) as nama,
                MAX(p.nip) as nip,
                MAX(p.pangkat) as pangkat,
                MAX(p.jabatan) as jabatan,
                COUNT(DISTINCT k.id) as total_perjalanan,
                SUM(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as total_hari_dinas,
                SUM(COALESCE((
                    SELECT SUM(uh.total)
                    FROM accounting.nominatif_uang_harian_items uh
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0)) as total_uang_harian
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE REPLACE(p.nip, ' ', '') = ?
                AND k.status = 'selesai'
                AND k.status_2 = ?
                AND k.jenis_spm = ?
                AND (YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))
            GROUP BY REPLACE(p.nip, ' ', '')
        `;
        
        const [pegawaiRows] = await db.query(pegawaiQuery, [normalizedNip, status_2, jenis_spm, filterTahun, filterTahun]);
        
        if (pegawaiRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pegawai tidak ditemukan atau tidak memiliki perjalanan dinas'
            });
        }
        
        const pegawai = pegawaiRows[0];
        
        // Query untuk detail perjalanan pegawai
        const detailQuery = `
            SELECT 
                k.id as kegiatan_id,
                k.kegiatan as kegiatan_nama,
                k.mak,
                k.no_st,
                k.jenis_spm,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as tgl_mulai,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as tgl_selesai,
                DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1 as jumlah_hari,
                k.kota_kab_kecamatan as lokasi,
                COALESCE((
                    SELECT SUM(uh.total)
                    FROM accounting.nominatif_uang_harian_items uh
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0) as uang_harian,
                k.status,
                k.status_2,
                k.catatan_status_2
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE REPLACE(p.nip, ' ', '') = ?
                AND k.status = 'selesai'
                AND k.status_2 = ?
                AND k.jenis_spm = ?
                AND (YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))
            ORDER BY k.tgl_st DESC, k.created_at DESC
        `;
        
        const [detailRows] = await db.query(detailQuery, [normalizedNip, status_2, jenis_spm, filterTahun, filterTahun]);
        
        res.status(200).json({
            success: true,
            message: 'Detail laporan pegawai berhasil diambil',
            data: {
                pegawai: {
                    id: normalizedNip,
                    nama: pegawai.nama,
                    nip: pegawai.nip,
                    pangkat: pegawai.pangkat,
                    jabatan: pegawai.jabatan
                },
                ringkasan: {
                    total_perjalanan: parseInt(pegawai.total_perjalanan) || 0,
                    total_hari_dinas: parseInt(pegawai.total_hari_dinas) || 0,
                    total_uang_harian: parseFloat(pegawai.total_uang_harian) || 0,
                    rata_rata_uang_harian_per_hari: pegawai.total_hari_dinas > 0 
                        ? Math.round((parseFloat(pegawai.total_uang_harian) || 0) / (parseInt(pegawai.total_hari_dinas) || 1)) 
                        : 0
                },
                detail_perjalanan: detailRows.map(row => ({
                    kegiatan_id: row.kegiatan_id,
                    kegiatan_nama: row.kegiatan_nama,
                    mak: row.mak,
                    no_st: row.no_st,
                    jenis_spm: row.jenis_spm,
                    tgl_st: row.tgl_st,
                    tgl_mulai: row.tgl_mulai,
                    tgl_selesai: row.tgl_selesai,
                    jumlah_hari: parseInt(row.jumlah_hari) || 0,
                    lokasi: row.lokasi,
                    uang_harian: parseFloat(row.uang_harian) || 0,
                    status: row.status,
                    status_2: row.status_2,
                    catatan_status_2: row.catatan_status_2
                }))
            }
        });
        
    } catch (error) {
        console.error('❌ Error generating laporan pegawai detail:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data laporan pegawai',
            error: error.message
        });
    }
});

// ========== EXPORT LAPORAN (CSV) ==========
router.get('/export/csv', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    if (!hasKepalaBalaiRole(req.user) && !hasAdminRole(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak'
        });
    }
    
    try {
        const { bulan, tahun, status_2 = 'selesai', jenis_spm = 'LS' } = req.query;
        const filterTahun = tahun || new Date().getFullYear();
        
        let whereConditions = [
            `k.status = 'selesai'`,
            `k.status_2 = ?`,
            `k.jenis_spm = ?`
        ];
        let params = [status_2, jenis_spm];
        
        if (bulan && bulan !== 'all') {
            whereConditions.push(`(MONTH(k.tgl_st) = ? OR (k.tgl_st IS NULL AND MONTH(k.created_at) = ?))`);
            params.push(bulan, bulan);
        }
        
        whereConditions.push(`(YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))`);
        params.push(filterTahun, filterTahun);
        
        // Query dengan filter NIP valid
        const query = `
            SELECT 
                MAX(p.nama) as Nama_Pegawai,
                MAX(p.nip) as NIP,
                MAX(p.pangkat) as Pangkat,
                MAX(p.jabatan) as Jabatan,
                COUNT(DISTINCT k.id) as Jumlah_Perjalanan,
                SUM(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as Total_Hari_Dinas,
                SUM(COALESCE((
                    SELECT SUM(uh.total)
                    FROM accounting.nominatif_uang_harian_items uh
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0)) as Total_Uang_Harian
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE ${whereConditions.join(' AND ')}
                AND p.nip IS NOT NULL 
                AND TRIM(p.nip) != ''
                AND TRIM(p.nip) != '-'
                AND TRIM(p.nip) != '--'
                AND TRIM(p.nip) != '---'
                AND TRIM(p.nip) NOT REGEXP '^-+$'
            GROUP BY REPLACE(p.nip, ' ', '')
            ORDER BY MAX(p.nama) ASC
        `;
        
        const [rows] = await db.query(query, params);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=laporan_perjadin_${filterTahun}_${bulan || 'semua'}_${jenis_spm}.csv`);
        
        if (rows.length === 0) {
            return res.send('Tidak ada data untuk periode yang dipilih');
        }
        
        const headers = ['No', 'Nama Pegawai', 'NIP', 'Pangkat', 'Jabatan', 'Jumlah Perjalanan', 'Total Hari Dinas', 'Total Uang Harian'];
        let csv = headers.join(',') + '\n';
        
        rows.forEach((row, idx) => {
            const values = [
                idx + 1,
                `"${(row.Nama_Pegawai || '').replace(/"/g, '""')}"`,
                `"${(row.NIP || '').replace(/"/g, '""')}"`,
                `"${(row.Pangkat || '').replace(/"/g, '""')}"`,
                `"${(row.Jabatan || '').replace(/"/g, '""')}"`,
                row.Jumlah_Perjalanan || 0,
                row.Total_Hari_Dinas || 0,
                row.Total_Uang_Harian || 0
            ];
            csv += values.join(',') + '\n';
        });
        
        res.send(csv);
        
    } catch (error) {
        console.error('❌ Error exporting CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengexport data',
            error: error.message
        });
    }
});

module.exports = router;