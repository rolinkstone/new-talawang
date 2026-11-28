// services/paguRealisasiService.js
// Pengambilan data Pagu & Realisasi dari API Jendela Kinerja.
//
// Data pagu TIDAK disimpan di database: setiap halaman Pagu dibuka, backend
// mengambil data terbaru dari aplikasi sumber lalu meneruskannya ke frontend.
// Dengan begitu, bila data di sumber dikosongkan, di Talawang juga kosong.
//
// Yang tetap disimpan hanyalah TOKEN API (terenkripsi) di `pagu_sync_config`,
// karena tanpanya halaman tidak bisa mengambil data otomatis.

const axios = require('axios');
const db = require('../db');
const { encryptPaguToken, decryptPaguToken } = require('../utils/paguToken');

const SUMBER_REALISASI_URL =
    process.env.TALAWANG_REALISASI_URL || 'http://localhost:3007/api/talawang/realisasi';

const TIMEOUT_MANUAL_MS = 30000;
const TIMEOUT_HALAMAN_MS = 15000;

const galat = (message, statusCode = 500) => Object.assign(new Error(message), { statusCode });

async function tarikDariSumber(token, tahun, timeout = TIMEOUT_MANUAL_MS) {
    let jawaban;
    try {
        jawaban = await axios.get(SUMBER_REALISASI_URL, {
            params: { token, tahun },
            timeout,
            validateStatus: () => true,
            headers: { Accept: 'application/json' }
        });
    } catch (error) {
        const pesan = error.code === 'ECONNABORTED'
            ? 'Aplikasi sumber tidak merespons (timeout)'
            : `Gagal menghubungi aplikasi sumber: ${error.message}`;
        throw galat(pesan, 502);
    }

    const body = jawaban.data;
    if (jawaban.status !== 200 || !body?.success) {
        throw galat(
            body?.message || 'Gagal mengambil data dari aplikasi sumber',
            jawaban.status === 200 ? 502 : jawaban.status
        );
    }

    const sumber = body.data?.rincian_mak || body.data?.data;
    if (!Array.isArray(sumber)) {
        throw galat('Format data dari aplikasi sumber tidak dikenali', 502);
    }

    // Hasil kosong adalah jawaban SAH: sumber memang tidak punya data untuk tahun itu.
    const rows = sumber
        .map((item) => {
            const mak = String(item?.mak || '').trim();
            const pagu = Number(item?.pagu) || 0;
            const realisasi = Number(item?.realisasi) || 0;
            return { mak, pagu, realisasi, sisa: pagu - realisasi };
        })
        .filter((item) => item.mak);

    return {
        rows,
        tahun,
        total: body.data?.total || null,
        terpotong: Boolean(body.data?.terpotong),
        diambilPada: body.data?.diambil_pada || null
    };
}

async function bacaKonfigurasi() {
    const [rows] = await db.query(
        `SELECT token_enc, tahun_anggaran, last_sync_at, last_error
           FROM pagu_sync_config WHERE id = 1`
    );
    return rows[0] || null;
}

// Menyimpan token (terenkripsi) + tahun yang dipilih admin.
async function simpanKonfigurasiSetelahTarik({ token, tahun, username }) {
    await db.query(
        `INSERT INTO pagu_sync_config
            (id, token_enc, tahun_anggaran, last_sync_at, last_error, updated_by)
         VALUES (1, ?, ?, NOW(), NULL, ?)
         ON DUPLICATE KEY UPDATE
            token_enc = VALUES(token_enc),
            tahun_anggaran = VALUES(tahun_anggaran),
            last_sync_at = NOW(),
            last_error = NULL,
            updated_by = VALUES(updated_by)`,
        [encryptPaguToken(token), tahun, username || null]
    );
}

async function catatGagal(pesan) {
    try {
        await db.query('UPDATE pagu_sync_config SET last_error = ? WHERE id = 1', [String(pesan).slice(0, 500)]);
    } catch (_) {}
}

async function catatSukses() {
    try {
        await db.query('UPDATE pagu_sync_config SET last_sync_at = NOW(), last_error = NULL WHERE id = 1');
    } catch (_) {}
}

// Ambil data terbaru langsung dari aplikasi sumber (tanpa menyentuh pagu_realisasi).
async function ambilDataLive() {
    const konfig = await bacaKonfigurasi();
    if (!konfig?.token_enc) {
        throw galat('Token API belum disimpan. Gunakan tombol "Atur Token" untuk mengisi token.', 400);
    }

    const token = decryptPaguToken(konfig.token_enc);
    if (!token) {
        throw galat('Token tersimpan tidak bisa dibuka (kunci enkripsi berubah). Simpan ulang token.', 400);
    }

    const tahun = konfig.tahun_anggaran || new Date().getFullYear();

    try {
        const hasil = await tarikDariSumber(token, tahun, TIMEOUT_HALAMAN_MS);
        await catatSukses();
        return hasil;
    } catch (error) {
        await catatGagal(error.message);
        throw error;
    }
}

async function ambilStatusSinkron() {
    const konfig = await bacaKonfigurasi();
    return {
        last_sync_at: konfig?.last_sync_at || null,
        last_error: konfig?.last_error || null,
        tahun_anggaran: konfig?.tahun_anggaran || null
    };
}

module.exports = {
    tarikDariSumber,
    simpanKonfigurasiSetelahTarik,
    ambilDataLive,
    ambilStatusSinkron
};