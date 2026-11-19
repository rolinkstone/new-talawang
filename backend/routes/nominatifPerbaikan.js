// routes/nominatifPerbaikan.js
// Fitur terpisah dari modul Nominatif: PERBAIKAN NOMINATIF khusus Admin.
//
// Alur: cari nominatif (nama kegiatan / nomor surat tugas) -> buka -> perbaiki.
//
// Catatan penting: berbeda dengan PUT /api/kegiatan/:id (yang menghapus lalu
// memasukkan ulang seluruh pegawai), endpoint di sini MEMPERTAHANKAN id
// nominatif_pegawai dan id nominatif_biaya_kegiatan. Relasi kuitansi, LPD,
// dan SPTJM memakai nominatif_pegawai.id, sehingga id tidak boleh berubah
// saat data diperbaiki. Pegawai yang dihapus pun ditolak bila sudah memiliki
// kuitansi/SPTJM.

const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');
const { MASKED_LOKASI, maskLokasi } = require('../utils/lokasiCrypto');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Tabel yang menyimpan referensi ke nominatif_pegawai.id
const PEGAWAI_REFERENCE_TABLES = [
    'kwitansi_perjadin',
    'sptjm_transport',
    'sptjm_hotel',
    'sptjm_penginapan'
];

const emptyBiaya = () => ({
    transportasi: [],
    uang_harian_items: [],
    penginapan_items: []
});

const isMaskedOrEmptyLokasi = (value) => {
    const text = String(value ?? '').trim();
    return !text || text === MASKED_LOKASI;
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const requireAdmin = (req, res) => {
    if (!req.user?.isAdmin) {
        res.status(403).json({
            success: false,
            message: 'Fitur Perbaikan Nominatif hanya dapat diakses oleh Admin'
        });
        return false;
    }
    return true;
};

// ========== GET - Pencarian nominatif (nama nominatif / nomor surat tugas) ==========
router.get('/', keycloakAuth, async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const searchTerm = String(req.query.q || '').trim();

    if (!searchTerm) {
        return res.status(400).json({
            success: false,
            message: 'Masukkan nama nominatif atau nomor surat tugas yang ingin dicari'
        });
    }

    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT, 1), MAX_LIMIT);
    const pattern = `%${searchTerm}%`;

    try {
        const query = `
            SELECT
                k.id,
                k.kegiatan,
                k.mak,
                k.no_st,
                k.tgl_st,
                k.status,
                k.status_2,
                k.kota_kab_kecamatan,
                k.kota_kab_kecamatan_encrypted,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                k.ppk_nama,
                k.user_id,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
                (SELECT COUNT(*) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as jumlah_pegawai,
                (SELECT COALESCE(SUM(p.total_biaya), 0) FROM accounting.nominatif_pegawai p WHERE p.kegiatan_id = k.id) as total_biaya
            FROM accounting.nominatif_kegiatan k
            WHERE k.status != 'dibatalkan'
              AND (k.kegiatan LIKE ? OR k.no_st LIKE ?)
            ORDER BY k.updated_at DESC
            LIMIT ?
        `;

        const [rows] = await db.query(query, [pattern, pattern, limit]);

        const data = rows.map((row) => ({
            ...row,
            kota_kab_kecamatan: Number(row.kota_kab_kecamatan_encrypted) === 1
                ? MASKED_LOKASI
                : maskLokasi(row.kota_kab_kecamatan)
        }));

        console.log(`🔎 Admin ${getUsername(req.user)} mencari nominatif "${searchTerm}": ${data.length} hasil`);

        res.status(200).json({
            success: true,
            message: data.length > 0
                ? `Ditemukan ${data.length} nominatif`
                : 'Tidak ada nominatif yang cocok',
            data,
            meta: {
                count: data.length,
                limit,
                searchTerm
            }
        });
    } catch (error) {
        console.error('❌ Error searching nominatif untuk perbaikan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencari data nominatif',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ========== GET DETAIL - Data nominatif lengkap untuk diperbaiki ==========
router.get('/:id', keycloakAuth, async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }

    try {
        const [kegiatanRows] = await db.query(
            `SELECT
                k.id,
                k.kegiatan,
                k.mak,
                k.realisasi_anggaran_sebelumnya,
                k.target_output_tahun,
                k.realisasi_output_sebelumnya,
                k.target_output_yg_akan_dicapai,
                k.kota_kab_kecamatan,
                k.kota_kab_kecamatan_encrypted,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan, '%Y-%m-%d') as rencana_tanggal_pelaksanaan,
                DATE_FORMAT(k.rencana_tanggal_pelaksanaan_akhir, '%Y-%m-%d') as rencana_tanggal_pelaksanaan_akhir,
                k.jenis_spm,
                k.bendahara_id,
                k.bendahara_nama,
                k.bendahara_nip,
                k.user_id,
                k.status,
                k.status_2,
                k.no_st,
                DATE_FORMAT(k.tgl_st, '%Y-%m-%d') as tgl_st,
                k.ppk_nama,
                k.ppk_nip,
                k.diketahui_oleh,
                k.diketahui_oleh_nip,
                DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
             FROM accounting.nominatif_kegiatan k
             WHERE k.id = ?`,
            [id]
        );

        if (kegiatanRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nominatif tidak ditemukan' });
        }

        const kegiatan = kegiatanRows[0];

        const [pegawaiRows] = await db.query(
            `SELECT p.id, p.nama, p.nip, p.pangkat, p.jabatan, p.total_biaya
             FROM accounting.nominatif_pegawai p
             WHERE p.kegiatan_id = ?
             ORDER BY p.id ASC`,
            [id]
        );

        if (pegawaiRows.length > 0) {
            const pegawaiIds = pegawaiRows.map((p) => p.id);

            const [biayaRows] = await db.query(
                `SELECT id as biaya_id, pegawai_id
                 FROM accounting.nominatif_biaya_kegiatan
                 WHERE pegawai_id IN (?)
                 ORDER BY id ASC`,
                [pegawaiIds]
            );

            const biayaIds = biayaRows.map((b) => b.biaya_id);

            let transportasiRows = [];
            let uangHarianRows = [];
            let penginapanRows = [];

            if (biayaIds.length > 0) {
                [transportasiRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_transportasi WHERE biaya_id IN (?)`,
                    [biayaIds]
                );
                [uangHarianRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (?)`,
                    [biayaIds]
                );
                [penginapanRows] = await db.query(
                    `SELECT * FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (?)`,
                    [biayaIds]
                );
            }

            const groupByBiaya = (rows) => rows.reduce((acc, row) => {
                acc[row.biaya_id] = acc[row.biaya_id] || [];
                acc[row.biaya_id].push(row);
                return acc;
            }, {});

            const transportasiByBiaya = groupByBiaya(transportasiRows);
            const uangHarianByBiaya = groupByBiaya(uangHarianRows);
            const penginapanByBiaya = groupByBiaya(penginapanRows);

            pegawaiRows.forEach((pegawai) => {
                const biayaPegawai = biayaRows.filter((b) => b.pegawai_id === pegawai.id);

                pegawai.biaya = biayaPegawai.length > 0
                    ? biayaPegawai.map((b) => ({
                        id: b.biaya_id,
                        transportasi: (transportasiByBiaya[b.biaya_id] || []).map((t) => ({
                            id: t.id,
                            trans: t.trans || '',
                            harga: Number(t.harga) || 0,
                            total: Number(t.total) || 0
                        })),
                        uang_harian_items: (uangHarianByBiaya[b.biaya_id] || []).map((u) => ({
                            id: u.id,
                            jenis: u.jenis || '',
                            qty: Number(u.qty) || 0,
                            harga: Number(u.harga) || 0,
                            total: Number(u.total) || 0
                        })),
                        penginapan_items: (penginapanByBiaya[b.biaya_id] || []).map((p) => ({
                            id: p.id,
                            jenis: p.jenis || '',
                            qty: Number(p.qty) || 0,
                            harga: Number(p.harga) || 0,
                            total: Number(p.total) || 0
                        }))
                    }))
                    : [emptyBiaya()];
            });
        }

        res.status(200).json({
            success: true,
            message: 'Data nominatif berhasil diambil',
            data: {
                ...kegiatan,
                kota_kab_kecamatan: Number(kegiatan.kota_kab_kecamatan_encrypted) === 1
                    ? MASKED_LOKASI
                    : maskLokasi(kegiatan.kota_kab_kecamatan),
                lokasi_terenkripsi: Number(kegiatan.kota_kab_kecamatan_encrypted) === 1,
                pegawai: pegawaiRows
            }
        });
    } catch (error) {
        console.error('❌ Error fetching nominatif detail for perbaikan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data nominatif',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Cek apakah pegawai yang akan dihapus sudah dipakai tabel lain
async function findPegawaiYangDipakai(connection, kegiatanId, pegawaiIds) {
    if (pegawaiIds.length === 0) return [];

    const placeholders = pegawaiIds.map(() => '?').join(',');
    const dipakai = new Set();

    for (const table of PEGAWAI_REFERENCE_TABLES) {
        try {
            const [rows] = await connection.query(
                `SELECT DISTINCT pegawai_id FROM ${table} WHERE kegiatan_id = ? AND pegawai_id IN (${placeholders})`,
                [kegiatanId, ...pegawaiIds]
            );
            rows.forEach((row) => dipakai.add(Number(row.pegawai_id)));
        } catch (error) {
            // Tabel SPTJM dibuat otomatis saat dipakai; abaikan bila belum ada.
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
        }
    }

    return [...dipakai];
}

// Sinkronkan rincian biaya satu pegawai tanpa mengubah id biaya yang sudah ada
async function syncBiayaPegawai(connection, kegiatanId, pegawaiId, biayaList) {
    const list = Array.isArray(biayaList) && biayaList.length > 0 ? biayaList : [emptyBiaya()];

    const [existingRows] = await connection.query(
        `SELECT id FROM accounting.nominatif_biaya_kegiatan WHERE pegawai_id = ? ORDER BY id ASC`,
        [pegawaiId]
    );

    for (let index = 0; index < list.length; index++) {
        const biaya = list[index] || {};
        let biayaId = existingRows[index]?.id;

        if (biayaId) {
            await connection.query(`DELETE FROM accounting.nominatif_transportasi WHERE biaya_id = ?`, [biayaId]);
            await connection.query(`DELETE FROM accounting.nominatif_uang_harian_items WHERE biaya_id = ?`, [biayaId]);
            await connection.query(`DELETE FROM accounting.nominatif_penginapan_items WHERE biaya_id = ?`, [biayaId]);
        } else {
            const [insertResult] = await connection.query(
                `INSERT INTO accounting.nominatif_biaya_kegiatan (kegiatan_id, pegawai_id) VALUES (?, ?)`,
                [kegiatanId, pegawaiId]
            );
            biayaId = insertResult.insertId;
        }

        for (const transport of biaya.transportasi || []) {
            if (!transport || !String(transport.trans || '').trim()) continue;
            await connection.query(
                `INSERT INTO accounting.nominatif_transportasi (biaya_id, trans, harga) VALUES (?, ?, ?)`,
                [biayaId, transport.trans || '', Number(transport.harga) || 0]
            );
        }

        for (const uangHarian of biaya.uang_harian_items || []) {
            if (!uangHarian || !String(uangHarian.jenis || '').trim()) continue;
            await connection.query(
                `INSERT INTO accounting.nominatif_uang_harian_items (biaya_id, jenis, qty, harga) VALUES (?, ?, ?, ?)`,
                [biayaId, uangHarian.jenis || '', Number(uangHarian.qty) || 0, Number(uangHarian.harga) || 0]
            );
        }

        for (const penginapan of biaya.penginapan_items || []) {
            if (!penginapan || !String(penginapan.jenis || '').trim()) continue;
            await connection.query(
                `INSERT INTO accounting.nominatif_penginapan_items (biaya_id, jenis, qty, harga) VALUES (?, ?, ?, ?)`,
                [biayaId, penginapan.jenis || '', Number(penginapan.qty) || 0, Number(penginapan.harga) || 0]
            );
        }
    }

    // Biaya lama yang tidak lagi dipakai pada payload
    const sisaBiayaIds = existingRows.slice(list.length).map((row) => row.id);
    if (sisaBiayaIds.length > 0) {
        const placeholders = sisaBiayaIds.map(() => '?').join(',');
        await connection.query(`DELETE FROM accounting.nominatif_transportasi WHERE biaya_id IN (${placeholders})`, sisaBiayaIds);
        await connection.query(`DELETE FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (${placeholders})`, sisaBiayaIds);
        await connection.query(`DELETE FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (${placeholders})`, sisaBiayaIds);
        await connection.query(`DELETE FROM accounting.nominatif_biaya_kegiatan WHERE id IN (${placeholders})`, sisaBiayaIds);
    }
}

// ========== PUT - Simpan perbaikan nominatif ==========
router.put('/:id', keycloakAuth, async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const username = getUsername(req.user);
    const userId = getUserId(req.user);

    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
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
        jenis_spm,
        bendahara_id,
        bendahara_nama,
        bendahara_nip,
        pegawai = []
    } = req.body;

    if (!String(kegiatanNama || '').trim() || !String(mak || '').trim()) {
        return res.status(400).json({
            success: false,
            message: 'Nama nominatif (kegiatan) dan MAK wajib diisi'
        });
    }

    if (!Array.isArray(pegawai) || pegawai.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Nominatif harus memiliki minimal 1 pegawai'
        });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [kegiatanRows] = await connection.query(
            `SELECT id, kegiatan, status, kota_kab_kecamatan, kota_kab_kecamatan_encrypted,
                    kota_kab_kecamatan_key_enc
             FROM accounting.nominatif_kegiatan
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (kegiatanRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Nominatif tidak ditemukan' });
        }

        const existingKegiatan = kegiatanRows[0];

        // Lokasi terenkripsi hanya boleh diubah oleh pembuat kegiatan (di modul Nominatif).
        let lokasiTersimpan = existingKegiatan.kota_kab_kecamatan;
        const incomingLokasi = String(kota_kab_kecamatan ?? '').trim();

        if (!isMaskedOrEmptyLokasi(incomingLokasi)) {
            if (Number(existingKegiatan.kota_kab_kecamatan_encrypted) === 1) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Lokasi kegiatan ini terenkripsi dan hanya dapat diubah oleh pembuat kegiatan'
                });
            }
            lokasiTersimpan = incomingLokasi;
        }

        // Siapkan daftar pegawai yang akan dipertahankan
        const [existingPegawaiRows] = await connection.query(
            `SELECT id, nama FROM accounting.nominatif_pegawai WHERE kegiatan_id = ? ORDER BY id ASC`,
            [id]
        );
        const existingPegawaiMap = new Map(existingPegawaiRows.map((row) => [Number(row.id), row.nama]));

        const payloadPegawai = pegawai.filter((p) => p && String(p.nama || '').trim());
        if (payloadPegawai.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Nama pegawai tidak boleh kosong'
            });
        }

        const keptPegawaiIds = new Set(
            payloadPegawai
                .map((p) => Number(p.id))
                .filter((pegawaiId) => existingPegawaiMap.has(pegawaiId))
        );
        const removedPegawaiIds = existingPegawaiRows
            .map((row) => Number(row.id))
            .filter((pegawaiId) => !keptPegawaiIds.has(pegawaiId));

        if (removedPegawaiIds.length > 0) {
            const dipakai = await findPegawaiYangDipakai(connection, id, removedPegawaiIds);
            if (dipakai.length > 0) {
                await connection.rollback();
                const nama = dipakai
                    .map((pegawaiId) => existingPegawaiMap.get(pegawaiId) || `ID ${pegawaiId}`)
                    .join(', ');
                return res.status(400).json({
                    success: false,
                    message: `Pegawai berikut tidak dapat dihapus karena sudah memiliki kuitansi/SPTJM: ${nama}`
                });
            }
        }

        await connection.query(
            `UPDATE accounting.nominatif_kegiatan
             SET kegiatan = ?,
                 mak = ?,
                 realisasi_anggaran_sebelumnya = ?,
                 target_output_tahun = ?,
                 realisasi_output_sebelumnya = ?,
                 target_output_yg_akan_dicapai = ?,
                 kota_kab_kecamatan = ?,
                 rencana_tanggal_pelaksanaan = ?,
                 rencana_tanggal_pelaksanaan_akhir = ?,
                 jenis_spm = COALESCE(?, jenis_spm),
                 bendahara_id = ?,
                 bendahara_nama = ?,
                 bendahara_nip = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                String(kegiatanNama).trim(),
                String(mak).trim(),
                toNumberOrNull(realisasi_anggaran_sebelumnya),
                toNumberOrNull(target_output_tahun),
                toNumberOrNull(realisasi_output_sebelumnya),
                target_output_yg_akan_dicapai || null,
                lokasiTersimpan,
                rencana_tanggal_pelaksanaan || null,
                rencana_tanggal_pelaksanaan_akhir || null,
                jenis_spm || null,
                bendahara_id || null,
                bendahara_nama || null,
                bendahara_nip || null,
                id
            ]
        );

        for (const p of payloadPegawai) {
            const nama = String(p.nama).trim();
            const pegawaiIdInput = Number(p.id);
            let pegawaiId;

            if (existingPegawaiMap.has(pegawaiIdInput)) {
                await connection.query(
                    `UPDATE accounting.nominatif_pegawai
                     SET nama = ?, nip = ?, pangkat = ?, jabatan = ?, total_biaya = ?
                     WHERE id = ? AND kegiatan_id = ?`,
                    [
                        nama,
                        p.nip || null,
                        p.pangkat || null,
                        p.jabatan || null,
                        Number(p.total_biaya) || 0,
                        pegawaiIdInput,
                        id
                    ]
                );
                pegawaiId = pegawaiIdInput;
            } else {
                const [insertResult] = await connection.query(
                    `INSERT INTO accounting.nominatif_pegawai
                     (kegiatan_id, nama, nip, pangkat, jabatan, total_biaya)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, nama, p.nip || null, p.pangkat || null, p.jabatan || null, Number(p.total_biaya) || 0]
                );
                pegawaiId = insertResult.insertId;
            }

            await syncBiayaPegawai(connection, id, pegawaiId, p.biaya);
        }

        if (removedPegawaiIds.length > 0) {
            const placeholders = removedPegawaiIds.map(() => '?').join(',');
            const [biayaRows] = await connection.query(
                `SELECT id FROM accounting.nominatif_biaya_kegiatan WHERE pegawai_id IN (${placeholders})`,
                removedPegawaiIds
            );
            const biayaIds = biayaRows.map((row) => row.id);

            if (biayaIds.length > 0) {
                const biayaPlaceholders = biayaIds.map(() => '?').join(',');
                await connection.query(`DELETE FROM accounting.nominatif_transportasi WHERE biaya_id IN (${biayaPlaceholders})`, biayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_uang_harian_items WHERE biaya_id IN (${biayaPlaceholders})`, biayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_penginapan_items WHERE biaya_id IN (${biayaPlaceholders})`, biayaIds);
                await connection.query(`DELETE FROM accounting.nominatif_biaya_kegiatan WHERE id IN (${biayaPlaceholders})`, biayaIds);
            }

            await connection.query(
                `DELETE FROM accounting.nominatif_pegawai WHERE id IN (${placeholders})`,
                removedPegawaiIds
            );
        }

        await connection.query(
            `INSERT INTO accounting.nominatif_status_history
             (kegiatan_id, status, catatan, user_id, user_nama, user_role, tanggal_status)
             VALUES (?, ?, ?, ?, ?, 'admin', NOW())`,
            [
                id,
                existingKegiatan.status,
                `Perbaikan nominatif oleh Admin (${username})`,
                userId,
                username
            ]
        );

        await connection.commit();

        console.log(`✅ Perbaikan nominatif ID ${id} disimpan oleh Admin ${username}`);

        res.status(200).json({
            success: true,
            message: 'Perbaikan nominatif berhasil disimpan',
            data: {
                id: Number(id),
                kegiatan: String(kegiatanNama).trim(),
                total_pegawai: payloadPegawai.length,
                pegawai_dihapus: removedPegawaiIds.length
            }
        });
    } catch (error) {
        console.error('❌ Error saving perbaikan nominatif:', error);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('❌ Error rollback perbaikan nominatif:', rollbackError);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan perbaikan nominatif',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
