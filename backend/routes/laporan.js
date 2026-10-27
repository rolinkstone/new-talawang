// routes/laporan.js
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');
const { maskLokasi } = require('../utils/lokasiCrypto');

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

// Helper untuk mengecek apakah MAK termasuk transport lokal (524113 / 524119)
const isMakTransportLokal = (mak) => {
    if (!mak) return false;
    return mak.includes('524113') || mak.includes('524119');
};

// ========== HELPER LAPORAN NOMINATIF PERJADIN ==========

// Gelar akademik yang biasa menempel di depan nama
const GELAR_DEPAN = ['prof', 'dr', 'drg', 'drs', 'dra', 'ir', 'apt', 'h', 'hj', 'kh'];

// Buang gelar akademik dari nama pegawai (mis. "Aline, S.Farm., Apt" -> "Aline")
const stripGelar = (nama) => {
    if (!nama) return '';
    
    let hasil = String(nama).replace(/\([^)]*\)/g, ' ');
    
    const koma = hasil.indexOf(',');
    if (koma !== -1) {
        hasil = hasil.slice(0, koma);
    }
    
    const kata = hasil.trim().split(/\s+/).filter(Boolean);
    while (kata.length > 1 && GELAR_DEPAN.includes(kata[0].toLowerCase().replace(/\.$/, ''))) {
        kata.shift();
    }
    
    return kata.join(' ').replace(/\s+/g, ' ').trim();
};

// Format DATE/DATETIME MySQL ke YYYY-MM-DD tanpa pergeseran timezone
const toDateStr = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val.slice(0, 10);
    
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const num = (val) => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : 0;
};

// Bersihkan nilai free text: "-" atau string kosong dianggap tidak ada
const bersihkanNilai = (val) => {
    if (val === null || val === undefined) return null;
    const teks = String(val).trim();
    return teks === '' || /^-+$/.test(teks) ? null : teks;
};

// Pastikan tabel rincian perjadin tersedia (sekali per proses)
let perjadinSchemaReady = null;

const ensurePerjadinSchema = () => {
    if (perjadinSchemaReady) return perjadinSchemaReady;
    
    perjadinSchemaReady = (async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS accounting.nominatif_rincian_transport (
                id INT AUTO_INCREMENT PRIMARY KEY,
                biaya_id INT NOT NULL,
                arah ENUM('PERGI', 'PULANG') NOT NULL DEFAULT 'PERGI',
                jenis VARCHAR(50) NOT NULL DEFAULT 'PESAWAT',
                maskapai VARCHAR(100) NULL,
                no_tiket VARCHAR(100) NULL,
                kode_booking VARCHAR(100) NULL,
                no_penerbangan VARCHAR(50) NULL,
                tempat_asal VARCHAR(255) NULL,
                tempat_tujuan VARCHAR(255) NULL,
                tanggal_terbang DATE NULL,
                harga_tiket DECIMAL(20, 2) NULL,
                keterangan VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_rincian_transport_biaya (biaya_id),
                KEY idx_rincian_transport_arah (biaya_id, arah)
            ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS accounting.nominatif_rincian_hotel (
                id INT AUTO_INCREMENT PRIMARY KEY,
                biaya_id INT NOT NULL,
                nama_hotel VARCHAR(255) NULL,
                alamat_hotel TEXT NULL,
                no_telpon_hotel VARCHAR(50) NULL,
                tgl_check_in DATE NULL,
                tgl_check_out DATE NULL,
                total_bill DECIMAL(20, 2) NULL,
                no_kamar VARCHAR(50) NULL,
                no_invoice VARCHAR(100) NULL,
                biaya_ditanggung DECIMAL(20, 2) NULL,
                keterangan VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_rincian_hotel_biaya (biaya_id)
            ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4
        `);
        
        return {};
    })().catch((error) => {
        perjadinSchemaReady = null;
        throw error;
    });
    
    return perjadinSchemaReady;
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
router.get('/rekap-pegawai', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses laporan rekap pegawai perjadin`);
    
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengakses laporan ini.'
        });
    }
    
    try {
        const { bulan, tahun, pegawai_id, status_2 = 'selesai', jenis_spm = 'LS' } = req.query;
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
        
        if (pegawai_id && pegawai_id !== 'all') {
            whereConditions.push(`REPLACE(p.nip, ' ', '') = ?`);
            params.push(pegawai_id.replace(/\s/g, ''));
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
                SUM(total_hari_transport_lokal) as total_hari_transport_lokal,
                SUM(total_uang_harian) as total_uang_harian,
                SUM(total_transport) as total_transport,
                SUM(total_uang_harian + total_transport) as total_keseluruhan
            FROM (
                SELECT 
                    REPLACE(p.nip, ' ', '') as pegawai_nip_normalized,
                    MAX(p.nip) as pegawai_nip,
                    MAX(p.nama) as pegawai_nama,
                    MAX(p.pangkat) as pegawai_pangkat,
                    MAX(p.jabatan) as pegawai_jabatan,
                    1 as jumlah_perjalanan,
                    MAX(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as total_hari_dinas,
                    SUM(CASE 
                        WHEN (k.mak LIKE '%.524113.%' OR k.mak LIKE '%.524119.%')
                        THEN (DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1)
                        ELSE 0
                    END) as total_hari_transport_lokal,
                    SUM(COALESCE((
                        SELECT SUM(uh.total)
                        FROM accounting.nominatif_uang_harian_items uh
                        INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                        WHERE bk.pegawai_id = p.id
                    ), 0)) as total_uang_harian,
                    SUM(COALESCE((
                        SELECT SUM(t.total)
                        FROM accounting.nominatif_transportasi t
                        INNER JOIN accounting.nominatif_biaya_kegiatan bk ON t.biaya_id = bk.id
                        WHERE bk.pegawai_id = p.id
                            AND (k.mak LIKE '%.524113.%' OR k.mak LIKE '%.524119.%')
                    ), 0)) as total_transport
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
            ORDER BY total_keseluruhan DESC, pegawai_nama ASC
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
                    total_hari_transport_lokal: 0,
                    total_uang_harian: 0,
                    total_transport: 0,
                    total_keseluruhan: 0
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
            total_hari_transport_lokal: parseInt(row.total_hari_transport_lokal) || 0,
            total_uang_harian: parseFloat(row.total_uang_harian) || 0,
            total_transport: parseFloat(row.total_transport) || 0,
            total_keseluruhan: parseFloat(row.total_keseluruhan) || 0,
            rata_rata_uang_harian_per_hari: row.total_hari_dinas > 0 
                ? Math.round((parseFloat(row.total_uang_harian) || 0) / (parseInt(row.total_hari_dinas) || 1)) 
                : 0,
            rata_rata_uang_harian_per_perjalanan: row.jumlah_perjalanan > 0 
                ? Math.round((parseFloat(row.total_uang_harian) || 0) / (parseInt(row.jumlah_perjalanan) || 1)) 
                : 0,
            rata_rata_transport_per_perjalanan: row.jumlah_perjalanan > 0 
                ? Math.round((parseFloat(row.total_transport) || 0) / (parseInt(row.jumlah_perjalanan) || 1)) 
                : 0,
            rata_rata_total_per_perjalanan: row.jumlah_perjalanan > 0 
                ? Math.round((parseFloat(row.total_keseluruhan) || 0) / (parseInt(row.jumlah_perjalanan) || 1)) 
                : 0
        }));
        
        const summary = {
            total_pegawai: dataRekap.length,
            total_perjalanan: dataRekap.reduce((sum, item) => sum + item.jumlah_perjalanan, 0),
            total_hari_dinas: dataRekap.reduce((sum, item) => sum + item.total_hari_dinas, 0),
            total_hari_transport_lokal: dataRekap.reduce((sum, item) => sum + item.total_hari_transport_lokal, 0),
            total_uang_harian: dataRekap.reduce((sum, item) => sum + item.total_uang_harian, 0),
            total_transport: dataRekap.reduce((sum, item) => sum + item.total_transport, 0),
            total_keseluruhan: dataRekap.reduce((sum, item) => sum + item.total_keseluruhan, 0)
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

// ========== LAPORAN DETAIL PER PEGAWAI ==========
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
                k.kota_kab_kecamatan as lokasi,
                CASE 
                    WHEN k.no_st REGEXP '[0-9]{7}$' THEN RIGHT(k.no_st, 7)
                    WHEN k.no_st REGEXP '[0-9]+' THEN SUBSTRING(k.no_st, LENGTH(k.no_st) - 6, 7)
                    ELSE k.no_st
                END as normalized_no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as tgl_mulai,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as tgl_selesai,
                DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1 as jumlah_hari,
                CASE 
                    WHEN (k.mak LIKE '%.524113.%' OR k.mak LIKE '%.524119.%')
                    THEN DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1
                    ELSE 0
                END as hari_transport_lokal,
                COALESCE((
                    SELECT SUM(uh.total)
                    FROM accounting.nominatif_uang_harian_items uh
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                ), 0) as uang_harian,
                COALESCE((
                    SELECT SUM(t.total)
                    FROM accounting.nominatif_transportasi t
                    INNER JOIN accounting.nominatif_biaya_kegiatan bk ON t.biaya_id = bk.id
                    WHERE bk.pegawai_id = p.id
                        AND (k.mak LIKE '%.524113.%' OR k.mak LIKE '%.524119.%')
                ), 0) as transport,
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

        rows.forEach(row => { row.lokasi = maskLokasi(row.lokasi); });
        
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
                    hari_transport_lokal: parseInt(row.hari_transport_lokal) || 0,
                    lokasi: row.lokasi,
                    uang_harian: 0,
                    transport: 0,
                    total: 0,
                    status: row.status,
                    status_2: row.status_2,
                    catatan_status_2: row.catatan_status_2
                };
            }
            
            if (!groupedByTrip[tripKey].kegiatan_nama.includes(row.kegiatan_nama)) {
                groupedByTrip[tripKey].kegiatan_nama.push(row.kegiatan_nama);
            }
            
            groupedByTrip[tripKey].uang_harian += parseFloat(row.uang_harian) || 0;
            groupedByTrip[tripKey].transport += parseFloat(row.transport) || 0;
            groupedByTrip[tripKey].total = groupedByTrip[tripKey].uang_harian + groupedByTrip[tripKey].transport;
        }
        
        let totalPerjalanan = 0;
        let totalHariDinas = 0;
        let totalHariTransportLokal = 0;
        let totalUangHarian = 0;
        let totalTransport = 0;
        let totalKeseluruhan = 0;
        
        const detailPerjalanan = Object.values(groupedByTrip).map(item => {
            totalPerjalanan++;
            totalHariDinas += item.jumlah_hari;
            totalHariTransportLokal += item.hari_transport_lokal;
            totalUangHarian += item.uang_harian;
            totalTransport += item.transport;
            totalKeseluruhan += item.total;
            
            return {
                no_st: item.no_st,
                kegiatan_nama: item.kegiatan_nama.join(' / '),
                mak: item.mak,
                jenis_spm: item.jenis_spm,
                tgl_st: item.tgl_st,
                tgl_mulai: item.tgl_mulai,
                tgl_selesai: item.tgl_selesai,
                jumlah_hari: item.jumlah_hari,
                hari_transport_lokal: item.hari_transport_lokal,
                lokasi: item.lokasi,
                uang_harian: item.uang_harian,
                transport: item.transport,
                total: item.total,
                is_lokal: isMakTransportLokal(item.mak),
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
                    total_hari_transport_lokal: totalHariTransportLokal,
                    total_uang_harian: totalUangHarian,
                    total_transport: totalTransport,
                    total_keseluruhan: totalKeseluruhan,
                    rata_rata_uang_harian_per_hari: totalHariDinas > 0 
                        ? Math.round(totalUangHarian / totalHariDinas) 
                        : 0,
                    rata_rata_transport_per_perjalanan: totalPerjalanan > 0
                        ? Math.round(totalTransport / totalPerjalanan)
                        : 0,
                    rata_rata_total_per_perjalanan: totalPerjalanan > 0
                        ? Math.round(totalKeseluruhan / totalPerjalanan)
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
                SUM(total_hari_transport_lokal) as Total_Hari_Transport_Lokal,
                SUM(total_uang_harian) as Total_Uang_Harian,
                SUM(total_transport) as Total_Transport,
                SUM(total_uang_harian + total_transport) as Total_Keseluruhan
            FROM (
                SELECT 
                    REPLACE(p.nip, ' ', '') as pegawai_nip_normalized,
                    MAX(p.nip) as pegawai_nip,
                    MAX(p.nama) as pegawai_nama,
                    MAX(p.pangkat) as pegawai_pangkat,
                    MAX(p.jabatan) as pegawai_jabatan,
                    1 as jumlah_perjalanan,
                    MAX(DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1) as total_hari_dinas,
                    SUM(CASE 
                        WHEN (k.mak LIKE '%.524113.%' OR k.mak LIKE '%.524119.%')
                        THEN (DATEDIFF(k.rencana_tanggal_pelaksanaan_akhir, k.rencana_tanggal_pelaksanaan) + 1)
                        ELSE 0
                    END) as total_hari_transport_lokal,
                    SUM(COALESCE((
                        SELECT SUM(uh.total)
                        FROM accounting.nominatif_uang_harian_items uh
                        INNER JOIN accounting.nominatif_biaya_kegiatan bk ON uh.biaya_id = bk.id
                        WHERE bk.pegawai_id = p.id
                    ), 0)) as total_uang_harian,
                    SUM(COALESCE((
                        SELECT SUM(t.total)
                        FROM accounting.nominatif_transportasi t
                        INNER JOIN accounting.nominatif_biaya_kegiatan bk ON t.biaya_id = bk.id
                        WHERE bk.pegawai_id = p.id
                            AND (k.mak LIKE '%.524113.%' OR k.mak LIKE '%.524119.%')
                    ), 0)) as total_transport
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
        
        const headers = ['No', 'Nama Pegawai', 'NIP', 'Pangkat', 'Jabatan', 'Jumlah Perjalanan', 'Total Hari Dinas', 'Total Hari Transport Lokal', 'Total Uang Harian', 'Total Transport (Lokal)', 'Total Keseluruhan'];
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
                row.Total_Hari_Transport_Lokal || 0,
                row.Total_Uang_Harian || 0,
                row.Total_Transport || 0,
                row.Total_Keseluruhan || 0
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

// ========== LAPORAN NOMINATIF PERJALANAN DINAS (SPJ) ==========
// Satu baris per pegawai per kegiatan, dengan rincian tiket pesawat & hotel.
const buildNominatifPerjadinData = async (filters = {}) => {
    try {
        await ensurePerjadinSchema();
        const {
            bulan,
            tahun,
            pegawai_id,
            kegiatan_id,
            status_2 = 'selesai',
            jenis_spm = 'LS'
        } = filters;
        const filterTahun = tahun || new Date().getFullYear();
        
        const whereConditions = [`k.status = 'selesai'`];
        const params = [];
        
        if (jenis_spm && jenis_spm !== 'all') {
            whereConditions.push('k.jenis_spm = ?');
            params.push(jenis_spm);
        }
        
        if (status_2 && status_2 !== 'all') {
            whereConditions.push('k.status_2 = ?');
            params.push(status_2);
        }
        
        whereConditions.push('(YEAR(k.tgl_st) = ? OR (k.tgl_st IS NULL AND YEAR(k.created_at) = ?))');
        params.push(filterTahun, filterTahun);
        
        if (bulan && bulan !== 'all') {
            whereConditions.push('(MONTH(k.tgl_st) = ? OR (k.tgl_st IS NULL AND MONTH(k.created_at) = ?))');
            params.push(bulan, bulan);
        }
        
        if (pegawai_id && pegawai_id !== 'all') {
            whereConditions.push("REPLACE(p.nip, ' ', '') = ?");
            params.push(String(pegawai_id).replace(/\s/g, ''));
        }
        
        if (kegiatan_id && kegiatan_id !== 'all') {
            whereConditions.push('k.id = ?');
            params.push(kegiatan_id);
        }
        
        // Klasifikasi trans (free text): BBM/bensin, pesawat, sisanya transport lokal/taksi
        const isPesawatExpr = "LOWER(COALESCE(trans, '')) REGEXP 'pesawat|psawat|tiket|penerbangan|terbang'";
        const isBbmExpr = "LOWER(COALESCE(trans, '')) LIKE '%bbm%' OR LOWER(COALESCE(trans, '')) LIKE '%bensin%'";
        
        const query = `
            SELECT
                b.id AS biaya_id,
                k.id AS kegiatan_id,
                p.id AS pegawai_id,
                k.kegiatan AS maksud_perjalanan_dinas,
                k.catatan_status_2 AS no_spm,
                k.kota_kab_kecamatan AS kota_tujuan,
                k.jenis_spm AS jenis_spm,
                k.no_st AS no_st,
                k.tgl_st AS tgl_st,
                p.nama AS nama_pegawai,
                p.nip AS nip,
                p.pangkat AS pangkat,
                p.jabatan AS jabatan,
                COALESCE(uh.uang_harian, 0) AS uang_harian,
                COALESCE(uh.uang_representasi, 0) AS uang_representasi,
                COALESCE(tr.transport_lokal, 0) AS transport_lokal,
                COALESCE(tr.bbm, 0) AS bbm,
                COALESCE(tr.total_pesawat, 0) AS total_pesawat,
                COALESCE(rt.total_tiket, 0) AS total_tiket,
                COALESCE(rh.total_bill, 0) AS total_bill_hotel,
                COALESCE(rh.total_ditanggung, 0) AS total_biaya_hotel
            FROM accounting.nominatif_biaya_kegiatan b
            INNER JOIN accounting.nominatif_pegawai p ON p.id = b.pegawai_id
            INNER JOIN accounting.nominatif_kegiatan k ON k.id = b.kegiatan_id
            LEFT JOIN (
                SELECT
                    biaya_id,
                    SUM(CASE WHEN LOWER(COALESCE(jenis, '')) LIKE '%representasi%' THEN 0 ELSE total END) AS uang_harian,
                    SUM(CASE WHEN LOWER(COALESCE(jenis, '')) LIKE '%representasi%' THEN total ELSE 0 END) AS uang_representasi
                FROM accounting.nominatif_uang_harian_items
                GROUP BY biaya_id
            ) uh ON uh.biaya_id = b.id
            LEFT JOIN (
                SELECT
                    biaya_id,
                    SUM(CASE WHEN ${isBbmExpr} THEN total ELSE 0 END) AS bbm,
                    SUM(CASE WHEN ${isPesawatExpr} THEN total ELSE 0 END) AS total_pesawat,
                    SUM(CASE WHEN ${isPesawatExpr} OR ${isBbmExpr} THEN 0 ELSE total END) AS transport_lokal
                FROM accounting.nominatif_transportasi
                GROUP BY biaya_id
            ) tr ON tr.biaya_id = b.id
            LEFT JOIN (
                SELECT biaya_id, SUM(COALESCE(harga_tiket, 0)) AS total_tiket
                FROM accounting.nominatif_rincian_transport
                GROUP BY biaya_id
            ) rt ON rt.biaya_id = b.id
            LEFT JOIN (
                SELECT
                    biaya_id,
                    SUM(COALESCE(total_bill, 0)) AS total_bill,
                    SUM(COALESCE(biaya_ditanggung, total_bill, 0)) AS total_ditanggung
                FROM accounting.nominatif_rincian_hotel
                GROUP BY biaya_id
            ) rh ON rh.biaya_id = b.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY k.tgl_st DESC, k.id ASC, p.nama ASC
        `;
        
        const [rows] = await db.query(query, params);
        
        const biayaIds = rows.map((row) => row.biaya_id);
        let transportMap = {};
        let hotelMap = {};
        
        if (biayaIds.length > 0) {
            const [transportRows] = await db.query(
                `SELECT * FROM accounting.nominatif_rincian_transport
                 WHERE biaya_id IN (?)
                 ORDER BY biaya_id, FIELD(arah, 'PERGI', 'PULANG'), tanggal_terbang, id`,
                [biayaIds]
            );
            
            const [hotelRows] = await db.query(
                `SELECT * FROM accounting.nominatif_rincian_hotel
                 WHERE biaya_id IN (?)
                 ORDER BY biaya_id, tgl_check_in, id`,
                [biayaIds]
            );
            
            transportMap = transportRows.reduce((acc, item) => {
                (acc[item.biaya_id] = acc[item.biaya_id] || []).push({
                    id: item.id,
                    arah: item.arah,
                    jenis: item.jenis,
                    maskapai: item.maskapai,
                    no_tiket: item.no_tiket,
                    kode_booking: item.kode_booking,
                    no_penerbangan: item.no_penerbangan,
                    tempat_asal: item.tempat_asal,
                    tempat_tujuan: item.tempat_tujuan,
                    tanggal_terbang: toDateStr(item.tanggal_terbang),
                    harga_tiket: num(item.harga_tiket),
                    keterangan: item.keterangan
                });
                return acc;
            }, {});
            
            hotelMap = hotelRows.reduce((acc, item) => {
                (acc[item.biaya_id] = acc[item.biaya_id] || []).push({
                    id: item.id,
                    nama_hotel: item.nama_hotel,
                    alamat_hotel: item.alamat_hotel,
                    no_telpon_hotel: item.no_telpon_hotel,
                    tgl_check_in: toDateStr(item.tgl_check_in),
                    tgl_check_out: toDateStr(item.tgl_check_out),
                    total_bill: item.total_bill === null ? null : num(item.total_bill),
                    no_kamar: item.no_kamar,
                    no_invoice: item.no_invoice,
                    biaya_ditanggung: item.biaya_ditanggung === null ? null : num(item.biaya_ditanggung),
                    keterangan: item.keterangan
                });
                return acc;
            }, {});
            
            // Fallback hotel dari modul SPTJM (kwitansi) untuk pegawai yang belum
            // punya rincian hotel sendiri: nama & alamat penginapan.
            const biayaDenganHotelRincian = new Set(hotelRows.map((item) => item.biaya_id));
            const pairHotelMap = new Map();
            
            rows.forEach((row) => {
                if (biayaDenganHotelRincian.has(row.biaya_id)) return;
                
                const key = `${row.kegiatan_id}:${row.pegawai_id}`;
                if (!pairHotelMap.has(key)) {
                    pairHotelMap.set(key, {
                        kegiatan_id: row.kegiatan_id,
                        pegawai_id: row.pegawai_id,
                        biayaIds: []
                    });
                }
                pairHotelMap.get(key).biayaIds.push(row.biaya_id);
            });
            
            const hotelPairs = [...pairHotelMap.values()];
            
            if (hotelPairs.length > 0) {
                try {
                    const kondisi = hotelPairs.map(() => '(kegiatan_id = ? AND pegawai_id = ?)').join(' OR ');
                    const pairParams = hotelPairs.flatMap((pair) => [pair.kegiatan_id, pair.pegawai_id]);
                    
                    const [sptjmHotelRows] = await db.query(
                        `SELECT kegiatan_id, pegawai_id, nama_penginapan, alamat_penginapan,
                                nomor_kamar, tarif_hotel, MIN(id) AS first_id
                         FROM accounting.sptjm_penginapan
                         WHERE (${kondisi})
                           AND nama_penginapan IS NOT NULL
                           AND TRIM(nama_penginapan) NOT IN ('', '-')
                         GROUP BY kegiatan_id, pegawai_id, nama_penginapan, alamat_penginapan,
                                  nomor_kamar, tarif_hotel
                         ORDER BY first_id`,
                        pairParams
                    );
                    
                    const sptjmHotelByPair = sptjmHotelRows.reduce((acc, item) => {
                        const key = `${item.kegiatan_id}:${item.pegawai_id}`;
                        (acc[key] = acc[key] || []).push(item);
                        return acc;
                    }, {});
                    
                    pairHotelMap.forEach((pair, key) => {
                        const daftar = sptjmHotelByPair[key] || [];
                        if (daftar.length === 0) return;
                        
                        pair.biayaIds.forEach((biayaId) => {
                            hotelMap[biayaId] = daftar.map((item) => ({
                                id: null,
                                nama_hotel: bersihkanNilai(item.nama_penginapan),
                                alamat_hotel: bersihkanNilai(item.alamat_penginapan),
                                no_telpon_hotel: null,
                                tgl_check_in: null,
                                tgl_check_out: null,
                                total_bill: item.tarif_hotel === null ? null : num(item.tarif_hotel),
                                no_kamar: bersihkanNilai(item.nomor_kamar),
                                no_invoice: null,
                                biaya_ditanggung: null,
                                keterangan: 'SPTJM'
                            }));
                        });
                    });
                } catch (error) {
                    console.warn('⚠️ Gagal mengambil penginapan dari sptjm_penginapan:', error.message);
                }
            }
            
            // Tiket pesawat untuk pegawai yang belum punya rincian tiket sendiri:
            // gabungkan baris pesawat dari nominatif_transportasi (harga tiket)
            // dengan entri sptjm_transport (maskapai & kode penerbangan).
            // Pasangan diambil per urutan baris (leg ke-1, ke-2, dst).
            const biayaDenganRincian = new Set(transportRows.map((item) => item.biaya_id));
            const pairMap = new Map();
            
            rows.forEach((row) => {
                if (biayaDenganRincian.has(row.biaya_id)) return;
                
                const key = `${row.kegiatan_id}:${row.pegawai_id}`;
                if (!pairMap.has(key)) {
                    pairMap.set(key, {
                        kegiatan_id: row.kegiatan_id,
                        pegawai_id: row.pegawai_id,
                        biayaIds: []
                    });
                }
                pairMap.get(key).biayaIds.push(row.biaya_id);
            });
            
            const pairs = [...pairMap.values()];
            
            if (pairs.length > 0) {
                const [tiketNominatifRows] = await db.query(
                    `SELECT id, biaya_id, trans, harga, total
                     FROM accounting.nominatif_transportasi
                     WHERE biaya_id IN (?) AND (${isPesawatExpr})
                     ORDER BY biaya_id, id`,
                    [biayaIds]
                );
                
                const tiketNominatifByBiaya = tiketNominatifRows.reduce((acc, item) => {
                    (acc[item.biaya_id] = acc[item.biaya_id] || []).push(item);
                    return acc;
                }, {});
                
                let sptjmByPair = {};
                
                try {
                    const kondisi = pairs.map(() => '(kegiatan_id = ? AND pegawai_id = ?)').join(' OR ');
                    const pairParams = pairs.flatMap((pair) => [pair.kegiatan_id, pair.pegawai_id]);
                    
                    const [sptjmRows] = await db.query(
                        `SELECT DISTINCT kegiatan_id, pegawai_id, jenis_transport, nama_maskapai, kode_penerbangan
                         FROM accounting.sptjm_transport
                         WHERE (${kondisi})
                           AND nama_maskapai IS NOT NULL
                           AND TRIM(nama_maskapai) NOT IN ('', '-')
                         ORDER BY kegiatan_id, pegawai_id, jenis_transport`,
                        pairParams
                    );
                    
                    sptjmByPair = sptjmRows.reduce((acc, item) => {
                        const key = `${item.kegiatan_id}:${item.pegawai_id}`;
                        (acc[key] = acc[key] || []).push(item);
                        return acc;
                    }, {});
                } catch (error) {
                    console.warn('⚠️ Gagal mengambil tiket dari sptjm_transport:', error.message);
                }
                
                pairMap.forEach((pair, key) => {
                    const tiketSptjm = sptjmByPair[key] || [];
                    
                    pair.biayaIds.forEach((biayaId) => {
                        const tiketNominatif = tiketNominatifByBiaya[biayaId] || [];
                        const jumlahLeg = Math.max(tiketNominatif.length, tiketSptjm.length);
                        if (jumlahLeg === 0) return;
                        
                        const legs = [];
                        
                        for (let i = 0; i < jumlahLeg; i += 1) {
                            const nominatif = tiketNominatif[i] || null;
                            const sptjm = tiketSptjm[i] || null;
                            const teksArah = `${nominatif ? nominatif.trans : ''} ${sptjm ? sptjm.jenis_transport : ''}`;
                            
                            // Arah hanya diisi kalau teksnya jelas (pergi ATAU pulang),
                            // mis. "Pesawat (Berangkat)" -> Pergi, "Pesawat Pergi dan Pulang" -> kosong.
                            const adaPulang = /pulang/i.test(teksArah);
                            const adaPergi = /pergi|berangkat/i.test(teksArah);
                            
                            let arah = null;
                            if (adaPulang && !adaPergi) arah = 'PULANG';
                            else if (adaPergi && !adaPulang) arah = 'PERGI';
                            
                            legs.push({
                                id: null,
                                arah,
                                jenis: 'PESAWAT',
                                maskapai: sptjm ? bersihkanNilai(sptjm.nama_maskapai) : null,
                                no_tiket: null,
                                kode_booking: null,
                                no_penerbangan: sptjm ? bersihkanNilai(sptjm.kode_penerbangan) : null,
                                tempat_asal: null,
                                tempat_tujuan: null,
                                tanggal_terbang: null,
                                harga_tiket: nominatif ? num(nominatif.harga) : null,
                                keterangan: nominatif && sptjm ? 'NOMINATIF+SPTJM' : (nominatif ? 'NOMINATIF' : 'SPTJM')
                            });
                        }
                        
                        transportMap[biayaId] = legs;
                    });
                });
            }
        }
        
        const data = rows.map((row, index) => {
            const uangHarian = num(row.uang_harian);
            const uangRepresentasi = num(row.uang_representasi);
            const transportLokal = num(row.transport_lokal);
            const bbm = num(row.bbm);
            const totalTiketRincian = num(row.total_tiket);
            const totalTiketNominatif = num(row.total_pesawat);
            // Rincian tiket terstruktur diutamakan; kalau kosong, pakai harga
            // tiket pesawat dari nominatif_transportasi.
            const totalTiket = totalTiketRincian > 0 ? totalTiketRincian : totalTiketNominatif;
            
            // Biaya hotel: rincian terstruktur bila ada, selain itu tarif dari SPTJM.
            const daftarHotel = hotelMap[row.biaya_id] || [];
            const totalBillHotel = daftarHotel.reduce((sum, hotel) => sum + num(hotel.total_bill), 0);
            const totalBiayaHotel = daftarHotel.reduce((sum, hotel) => (
                sum + (hotel.biaya_ditanggung !== null ? hotel.biaya_ditanggung : num(hotel.total_bill))
            ), 0);
            
            return {
                no: index + 1,
                biaya_id: row.biaya_id,
                kegiatan_id: row.kegiatan_id,
                pegawai_id: row.pegawai_id,
                maksud_perjalanan_dinas: row.maksud_perjalanan_dinas,
                no_spm: row.no_spm,
                // Asal perjalanan selalu dari Palangka Raya; tujuan dari kegiatan.
                // Nilai terenkripsi tetap disamarkan (lihat utils/lokasiCrypto).
                tempat_asal: 'Palangka Raya',
                tempat_tujuan: maskLokasi(row.kota_tujuan),
                jenis_spm: row.jenis_spm,
                no_st: row.no_st,
                tgl_st: toDateStr(row.tgl_st),
                nama_pelaksana: stripGelar(row.nama_pegawai),
                nama_pegawai: row.nama_pegawai,
                nip: row.nip,
                pangkat: row.pangkat,
                jabatan: row.jabatan,
                uang_harian: uangHarian,
                uang_representasi: uangRepresentasi,
                transport_lokal: transportLokal,
                bbm: bbm,
                total_tiket: totalTiket,
                total_bill_hotel: totalBillHotel,
                total_biaya_hotel: totalBiayaHotel,
                total_spj: uangHarian + uangRepresentasi + transportLokal + bbm + totalTiket + totalBiayaHotel,
                transport: transportMap[row.biaya_id] || [],
                hotel: hotelMap[row.biaya_id] || []
            };
        });
        
        const pegawaiUnik = new Set(data.map((item) => item.nip || item.pegawai_id));
        const summary = {
            jumlah_pegawai: pegawaiUnik.size,
            jumlah_perjalanan: data.length,
            total_uang_harian: data.reduce((sum, item) => sum + item.uang_harian, 0),
            total_uang_representasi: data.reduce((sum, item) => sum + item.uang_representasi, 0),
            total_transport_lokal: data.reduce((sum, item) => sum + item.transport_lokal, 0),
            total_bbm: data.reduce((sum, item) => sum + item.bbm, 0),
            total_tiket: data.reduce((sum, item) => sum + item.total_tiket, 0),
            total_bill_hotel: data.reduce((sum, item) => sum + item.total_bill_hotel, 0),
            total_biaya_hotel: data.reduce((sum, item) => sum + item.total_biaya_hotel, 0),
            total_spj: data.reduce((sum, item) => sum + item.total_spj, 0)
        };
        
        console.log(`✅ Laporan nominatif perjadin: ${data.length} baris`);
        
        return {
            data,
            summary,
            meta: {
                tahun: filterTahun,
                bulan: bulan || 'all',
                status_2,
                jenis_spm
            }
        };
    } catch (error) {
        console.error('❌ Error generating laporan nominatif perjadin:', error);
        throw error;
    }
};

router.get('/nominatif-perjadin', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📊 ${username} mengakses laporan nominatif perjadin`);
    
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengakses laporan ini.'
        });
    }
    
    try {
        const { data, summary, meta } = await buildNominatifPerjadinData(req.query);
        
        res.status(200).json({
            success: true,
            message: data.length === 0
                ? 'Tidak ada data perjalanan dinas untuk periode yang dipilih'
                : 'Laporan nominatif perjalanan dinas berhasil diambil',
            data,
            summary,
            meta
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil laporan nominatif perjalanan dinas',
            error: error.message
        });
    }
});

// ========== EXPORT XLSX REKAP PERJALANAN DINAS ==========
const REKAP_PERJADIN_HEADERS = [
    'Maksud Perjalanan Dinas',
    'No. SPM',
    'Nama Pelaksana Perjalanan Dinas (Tanpa Gelar Akademik)',
    'Uang Harian',
    'Uang Representasi',
    'Transportasi Lokal/Taksi',
    'BBM (Jika Jalan Darat)',
    'Maskapai',
    'Pergi/Pulang',
    'No Tiket',
    'Kode Booking',
    'No Penerbangan',
    'Tempat Asal',
    'Tempat Tujuan',
    'Tanggal Terbang',
    'Harga Tiket (Rp)',
    'Nama Hotel',
    'Alamat Hotel',
    'No. Telpon Hotel',
    'Tanggal Check In Hotel',
    'Tanggal Check Out Hotel',
    'Total Bill Hotel yang Dibayarkan',
    'No Kamar',
    'No Invoice Hotel',
    'Total Biaya Hotel (Jika 30%)',
    'Total SPJ Yang Dibayarkan Oleh Bendahara Pengeluaran'
];

// Kolom nominal (0-based) yang perlu format ribuan di Excel
const REKAP_PERJADIN_NOMINAL_COLUMNS = [3, 4, 5, 6, 15, 21, 24, 25];

// Lebar kolom (karakter) untuk file Excel
const REKAP_PERJADIN_COLUMN_WIDTHS = [
    38, 18, 30, 15, 15, 17, 17, 16, 12, 16, 16, 18,
    22, 26, 15, 17, 26, 34, 16, 14, 14, 18, 10, 16, 16, 20
];

const REKAP_PERJADIN_COLORS = {
    titleBg: 'FF1E3A8A',
    subtitleBg: 'FFE8EEF9',
    headerBg: 'FF2F5597',
    headerText: 'FFFFFFFF',
    zebra: 'FFF3F6FB',
    border: 'FFD5DEEA',
    text: 'FF1F2937',
    total: 'FF1E3A8A'
};

// Satu leg tiket = satu baris. Nominal yang berlaku per pegawai (uang harian,
// transport, total SPJ) hanya ditulis di baris pertama supaya tidak dobel saat
// kolomnya dijumlahkan di Excel.
const buildRekapPerjadinRows = (data) => {
    const rows = [];
    
    data.forEach((item) => {
        const legs = item.transport.length > 0 ? item.transport : [null];
        const rowCount = Math.max(legs.length, item.hotel.length, 1);
        
        for (let i = 0; i < rowCount; i += 1) {
            const tiket = legs[i] || null;
            const hotel = item.hotel[i] || null;
            const barisPertama = i === 0;
            
            rows.push([
                item.maksud_perjalanan_dinas || '',
                item.no_spm || '',
                item.nama_pelaksana || '',
                barisPertama ? item.uang_harian : '',
                barisPertama ? item.uang_representasi : '',
                barisPertama ? item.transport_lokal : '',
                barisPertama ? item.bbm : '',
                tiket?.maskapai || '',
                tiket ? (tiket.arah === 'PULANG' ? 'Pulang' : tiket.arah === 'PERGI' ? 'Pergi' : '') : '',
                tiket?.no_tiket || '',
                tiket?.kode_booking || '',
                tiket?.no_penerbangan || '',
                tiket?.tempat_asal || item.tempat_asal || '',
                tiket?.tempat_tujuan || item.tempat_tujuan || '',
                tiket?.tanggal_terbang || '',
                tiket?.harga_tiket ?? '',
                hotel?.nama_hotel || '',
                hotel?.alamat_hotel || '',
                hotel?.no_telpon_hotel || '',
                hotel?.tgl_check_in || '',
                hotel?.tgl_check_out || '',
                hotel?.total_bill ?? '',
                hotel?.no_kamar || '',
                hotel?.no_invoice || '',
                hotel?.biaya_ditanggung ?? '',
                barisPertama ? item.total_spj : ''
            ]);
        }
    });
    
    return rows;
};

router.get('/nominatif-perjadin/export/xlsx', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📥 ${username} mengexport rekap perjalanan dinas (xlsx)`);
    
    if (!canAccessLaporan(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya Admin, Kabag TU, dan Kepala Balai yang dapat mengexport laporan ini.'
        });
    }
    
    try {
        const { data, meta } = await buildNominatifPerjadinData(req.query);
        
        const rekapRows = buildRekapPerjadinRows(data);
        const jumlahKolom = REKAP_PERJADIN_HEADERS.length;
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Talawang - Laporan Perjalanan Dinas';
        workbook.created = new Date();
        
        const sheet = workbook.addWorksheet('Rekap Perjalanan Dinas', {
            views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
        });
        
        sheet.columns = REKAP_PERJADIN_COLUMN_WIDTHS.map((width) => ({ width }));
        
        const garisTipis = { style: 'thin', color: { argb: REKAP_PERJADIN_COLORS.border } };
        const semuaGaris = { top: garisTipis, left: garisTipis, bottom: garisTipis, right: garisTipis };
        
        // Judul
        sheet.mergeCells(1, 1, 1, jumlahKolom);
        const judul = sheet.getCell(1, 1);
        judul.value = 'REKAP PERJALANAN DINAS';
        judul.font = { bold: true, size: 15, color: { argb: REKAP_PERJADIN_COLORS.headerText } };
        judul.alignment = { horizontal: 'center', vertical: 'middle' };
        judul.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: REKAP_PERJADIN_COLORS.titleBg } };
        sheet.getRow(1).height = 30;
        
        // Info periode & filter
        const labelPeriode = meta.bulan === 'all'
            ? `Tahun ${meta.tahun}`
            : `Bulan ${meta.bulan} Tahun ${meta.tahun}`;
        const infoFilter = [
            `Periode: ${labelPeriode}`,
            `Status SPM: ${meta.status_2 === 'all' ? 'Semua' : meta.status_2}`,
            `Jenis SPM: ${meta.jenis_spm === 'all' ? 'Semua' : meta.jenis_spm}`,
            `Jumlah baris: ${rekapRows.length}`
        ].join('   |   ');
        
        sheet.mergeCells(2, 1, 2, jumlahKolom);
        const subjudul = sheet.getCell(2, 1);
        subjudul.value = infoFilter;
        subjudul.font = { italic: true, size: 10, color: { argb: 'FF334155' } };
        subjudul.alignment = { horizontal: 'center', vertical: 'middle' };
        subjudul.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: REKAP_PERJADIN_COLORS.subtitleBg } };
        sheet.getRow(2).height = 22;
        
        // Baris judul kolom
        const headerRow = sheet.getRow(3);
        REKAP_PERJADIN_HEADERS.forEach((label, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = label;
            cell.font = { bold: true, size: 10, color: { argb: REKAP_PERJADIN_COLORS.headerText } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: REKAP_PERJADIN_COLORS.headerBg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = semuaGaris;
        });
        headerRow.height = 48;
        
        // Isi data
        rekapRows.forEach((row, index) => {
            const excelRow = sheet.addRow(row);
            
            row.forEach((value, colIndex) => {
                const cell = excelRow.getCell(colIndex + 1);
                cell.border = semuaGaris;
                cell.font = { size: 10, color: { argb: REKAP_PERJADIN_COLORS.text } };
                
                if (index % 2 === 1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: REKAP_PERJADIN_COLORS.zebra } };
                }
                
                if (REKAP_PERJADIN_NOMINAL_COLUMNS.includes(colIndex)) {
                    if (typeof value === 'number') cell.numFmt = '#,##0';
                    cell.alignment = { horizontal: 'right', vertical: 'top' };
                } else if (colIndex === 8) {
                    cell.alignment = { horizontal: 'center', vertical: 'top' };
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
                }
                
                if (colIndex === jumlahKolom - 1 && typeof value === 'number') {
                    cell.font = { bold: true, size: 10, color: { argb: REKAP_PERJADIN_COLORS.total } };
                }
            });
        });
        
        // Filter otomatis pada baris judul kolom
        sheet.autoFilter = {
            from: { row: 3, column: 1 },
            to: { row: 3 + Math.max(rekapRows.length, 1), column: jumlahKolom }
        };
        
        const buffer = await workbook.xlsx.writeBuffer();
        
        const periode = `${meta.tahun}${meta.bulan !== 'all' ? `-${meta.bulan}` : ''}`;
        console.log(`✅ Export rekap perjalanan dinas: ${rekapRows.length} baris (${periode})`);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="rekap_perjalanan_dinas.xlsx"');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('❌ Error export rekap perjalanan dinas (xlsx):', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengexport rekap perjalanan dinas',
            error: error.message
        });
    }
});

module.exports = router;