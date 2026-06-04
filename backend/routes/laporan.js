// routes/laporan.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// ========== HELPER FUNCTIONS ==========

// Helper function untuk mengekstrak pola nomor ST (7 angka terakhir)
const normalizeStNumber = (noSt) => {
    if (!noSt) return null;
    
    // Extract 7 digit terakhir dari nomor ST
    const match = noSt.match(/(\d{7})$/);
    if (match) {
        return match[1];
    }
    
    const numbers = noSt.match(/\d+/g);
    if (numbers && numbers.length > 0) {
        const lastNumbers = numbers[numbers.length - 1];
        if (lastNumbers.length >= 7) {
            return lastNumbers.slice(-7);
        }
        return lastNumbers;
    }
    
    return noSt.trim();
};

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

// ============ PERBAIKAN: TAMBAHKAN FUNGSI CEK KABAG TU ============
const hasKabagTuRole = (user) => {
    const roles = user.extractedRoles || user.role || [];
    if (Array.isArray(roles)) {
        return roles.some(r => r.toLowerCase().includes('kabag_tu'));
    }
    if (typeof roles === 'string') {
        return roles.toLowerCase().includes('kabag_tu');
    }
    return false;
};

// ============ PERBAIKAN: Fungsi untuk cek akses laporan ============
const canAccessLaporan = (user) => {
    return hasAdminRole(user) || hasKabagTuRole(user) || hasKepalaBalaiRole(user);
};

// Helper untuk mengecek apakah NIP valid
const isValidNip = (nip) => {
    if (!nip) return false;
    const nipStr = String(nip).trim();
    if (nipStr === '') return false;
    if (nipStr === '-') return false;
    if (nipStr === '--') return false;
    if (nipStr === '---') return false;
    if (nipStr.match(/^[-]+$/)) return false;
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
            isKabagTu: hasKabagTuRole(req.user),
            isAdmin: hasAdminRole(req.user),
            canAccess: canAccessLaporan(req.user)
        }
    });
});

// ========== LAPORAN REKAP PEGAWAI PERJADIN ==========
// ========== PERBAIKAN: Tambahkan Kabag TU ke akses ==========
router.get('/rekap-pegawai', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses laporan rekap pegawai perjadin`);
    
    // PERBAIKAN: Cek akses untuk Admin, Kabag TU, atau Kepala Balai
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengakses laporan ini.'
        });
    }
    
    try {
        const { bulan, tahun, pegawai_nip, status_2 = 'selesai', jenis_spm = 'LS' } = req.query;
        const filterTahun = tahun || new Date().getFullYear();
        
        let whereConditions = [];
        let params = [];
        
        if (jenis_spm && jenis_spm !== 'all') {
            whereConditions.push(`k.jenis_spm = ?`);
            params.push(jenis_spm);
        }
        
        if (status_2 && status_2 !== 'all') {
            whereConditions.push(`k.status_2 = ?`);
            params.push(status_2);
        }
        
        whereConditions.push(`k.status = 'selesai'`);
        whereConditions.push(`(YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))`);
        params.push(filterTahun, filterTahun);
        
        if (bulan && bulan !== 'all') {
            whereConditions.push(`(MONTH(k.tgl_st) = ? OR (k.tgl_st IS NULL AND MONTH(k.created_at) = ?))`);
            params.push(bulan, bulan);
        }
        
        if (pegawai_nip && pegawai_nip !== 'all') {
            whereConditions.push(`REPLACE(p.nip, ' ', '') = ?`);
            params.push(pegawai_nip.replace(/\s/g, ''));
        }
        
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';
        
        const query = `
            SELECT 
                pegawai_nip_normalized,
                MAX(pegawai_nip) as pegawai_nip,
                MAX(pegawai_nama) as pegawai_nama,
                MAX(pegawai_pangkat) as pegawai_pangkat,
                MAX(pegawai_jabatan) as pegawai_jabatan,
                SUM(jumlah_perjalanan) as jumlah_perjalanan,
                SUM(total_hari_dinas) as total_hari_dinas,
                SUM(total_uang_harian) as total_uang_harian
            FROM (
                SELECT 
                    REPLACE(p.nip, ' ', '') as pegawai_nip_normalized,
                    MAX(p.nip) as pegawai_nip,
                    MAX(p.nama) as pegawai_nama,
                    MAX(p.pangkat) as pegawai_pangkat,
                    MAX(p.jabatan) as pegawai_jabatan,
                    1 as jumlah_perjalanan,
                    MAX(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as total_hari_dinas,
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
                GROUP BY REPLACE(p.nip, ' ', ''), 
                    CASE 
                        WHEN k.no_st REGEXP '[0-9]{7}$' THEN RIGHT(k.no_st, 7)
                        WHEN k.no_st REGEXP '[0-9]+' THEN SUBSTRING(k.no_st, LENGTH(k.no_st) - 6, 7)
                        ELSE k.no_st
                    END
            ) as per_st
            GROUP BY pegawai_nip_normalized
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
// ========== PERBAIKAN: Tambahkan Kabag TU ke akses ==========
router.get('/options', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📋 ${username} mengakses options laporan`);
    
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengakses.'
        });
    }
    
    try {
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
        
        const status2Query = `
            SELECT DISTINCT status_2
            FROM accounting.nominatif_kegiatan
            WHERE status = 'selesai' AND status_2 IS NOT NULL AND status_2 != ''
            ORDER BY status_2 ASC
        `;
        
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
// ========== PERBAIKAN: Tambahkan Kabag TU ke akses ==========
router.get('/pegawai/:nip', keycloakAuth, async (req, res) => {
    const { nip } = req.params;
    const username = getUsername(req.user);
    
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengakses laporan ini.'
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
        
        const query = `
            SELECT 
                p.nama as pegawai_nama,
                p.nip as pegawai_nip,
                p.pangkat as pegawai_pangkat,
                p.jabatan as pegawai_jabatan,
                k.kegiatan as kegiatan_nama,
                k.mak,
                k.jenis_spm,
                k.no_st as original_no_st,
                CASE 
                    WHEN k.no_st REGEXP '[0-9]{7}$' THEN RIGHT(k.no_st, 7)
                    WHEN k.no_st REGEXP '[0-9]+' THEN SUBSTRING(k.no_st, LENGTH(k.no_st) - 6, 7)
                    ELSE k.no_st
                END as normalized_no_st,
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
                k.catatan_status_2,
                k.created_at
            FROM accounting.nominatif_pegawai p
            INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
            WHERE REPLACE(p.nip, ' ', '') = ?
                AND k.status = 'selesai'
                AND k.status_2 = ?
                AND k.jenis_spm = ?
                AND (YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))
            ORDER BY k.tgl_st DESC, k.created_at DESC
        `;
        
        const [rows] = await db.query(query, [normalizedNip, status_2, jenis_spm, filterTahun, filterTahun]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pegawai tidak ditemukan atau tidak memiliki perjalanan dinas'
            });
        }
        
        const pegawaiInfo = {
            id: normalizedNip,
            nama: rows[0].pegawai_nama,
            nip: rows[0].pegawai_nip,
            pangkat: rows[0].pegawai_pangkat,
            jabatan: rows[0].pegawai_jabatan
        };
        
        const groupedByTrip = {};
        
        for (const row of rows) {
            const tripKey = row.normalized_no_st;
            
            if (!groupedByTrip[tripKey]) {
                groupedByTrip[tripKey] = {
                    no_st: row.original_no_st,
                    normalized_no_st: row.normalized_no_st,
                    kegiatan_nama: [],
                    mak: row.mak,
                    jenis_spm: row.jenis_spm,
                    tgl_st: row.tgl_st,
                    tgl_mulai: row.tgl_mulai,
                    tgl_selesai: row.tgl_selesai,
                    jumlah_hari: parseInt(row.jumlah_hari) || 0,
                    lokasi: row.lokasi,
                    uang_harian: 0,
                    status: row.status,
                    status_2: row.status_2,
                    catatan_status_2: row.catatan_status_2
                };
            }
            
            if (!groupedByTrip[tripKey].kegiatan_nama.includes(row.kegiatan_nama)) {
                groupedByTrip[tripKey].kegiatan_nama.push(row.kegiatan_nama);
            }
            
            groupedByTrip[tripKey].uang_harian += parseFloat(row.uang_harian) || 0;
        }
        
        let totalPerjalanan = 0;
        let totalHariDinas = 0;
        let totalUangHarian = 0;
        
        const detailPerjalanan = Object.values(groupedByTrip).map(item => {
            totalPerjalanan++;
            totalHariDinas += item.jumlah_hari;
            totalUangHarian += item.uang_harian;
            
            return {
                no_st: item.no_st,
                kegiatan_nama: item.kegiatan_nama.join(' / '),
                mak: item.mak,
                jenis_spm: item.jenis_spm,
                tgl_st: item.tgl_st,
                tgl_mulai: item.tgl_mulai,
                tgl_selesai: item.tgl_selesai,
                jumlah_hari: item.jumlah_hari,
                lokasi: item.lokasi,
                uang_harian: item.uang_harian,
                status: item.status,
                status_2: item.status_2,
                catatan_status_2: item.catatan_status_2
            };
        });
        
        res.status(200).json({
            success: true,
            message: 'Detail laporan pegawai berhasil diambil',
            data: {
                pegawai: pegawaiInfo,
                ringkasan: {
                    total_perjalanan: totalPerjalanan,
                    total_hari_dinas: totalHariDinas,
                    total_uang_harian: totalUangHarian,
                    rata_rata_uang_harian_per_hari: totalHariDinas > 0 
                        ? Math.round(totalUangHarian / totalHariDinas) 
                        : 0
                },
                detail_perjalanan: detailPerjalanan
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
// ========== PERBAIKAN: Tambahkan Kabag TU ke akses ==========
router.get('/export/csv', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengexport laporan.'
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
        
        const query = `
            SELECT 
                pegawai_nip_normalized,
                MAX(pegawai_nip) as NIP,
                MAX(pegawai_nama) as Nama_Pegawai,
                MAX(pegawai_pangkat) as Pangkat,
                MAX(pegawai_jabatan) as Jabatan,
                SUM(jumlah_perjalanan) as Jumlah_Perjalanan,
                SUM(total_hari_dinas) as Total_Hari_Dinas,
                SUM(total_uang_harian) as Total_Uang_Harian
            FROM (
                SELECT 
                    REPLACE(p.nip, ' ', '') as pegawai_nip_normalized,
                    MAX(p.nip) as pegawai_nip,
                    MAX(p.nama) as pegawai_nama,
                    MAX(p.pangkat) as pegawai_pangkat,
                    MAX(p.jabatan) as pegawai_jabatan,
                    1 as jumlah_perjalanan,
                    MAX(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as total_hari_dinas,
                    SUM(COALESCE((
                        SELECT SUM(uh.total)
                        FROM accounting.nominatif_uang_harian_items uh
                        INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                        WHERE bk.pegawai_id = p.id
                    ), 0)) as total_uang_harian
                FROM accounting.nominatif_pegawai p
                INNER JOIN accounting.nominatif_kegiatan k ON p.kegiatan_id = k.id
                WHERE ${whereConditions.join(' AND ')}
                    AND p.nip IS NOT NULL 
                    AND TRIM(p.nip) != ''
                    AND TRIM(p.nip) != '-'
                    AND TRIM(p.nip) != '--'
                    AND TRIM(p.nip) != '---'
                    AND TRIM(p.nip) NOT REGEXP '^-+$'
                GROUP BY REPLACE(p.nip, ' ', ''), 
                    CASE 
                        WHEN k.no_st REGEXP '[0-9]{7}$' THEN RIGHT(k.no_st, 7)
                        WHEN k.no_st REGEXP '[0-9]+' THEN SUBSTRING(k.no_st, LENGTH(k.no_st) - 6, 7)
                        ELSE k.no_st
                    END
            ) as per_st
            GROUP BY pegawai_nip_normalized
            ORDER BY Nama_Pegawai ASC
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