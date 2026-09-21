// utils/appSettings.js
//
// Pembacaan setting aplikasi (tabel `app_settings`) tanpa DDL di jalur request.
//
// Sebelumnya setiap request di lpd.js / kwitansi.js / notifikasi.js menjalankan
//   CREATE TABLE IF NOT EXISTS app_settings (...)
// (bahkan ada INSERT IGNORE di handler GET). DDL berulang itu memakan metadata lock
// dan memperlambat request. Sekarang tabel dipastikan HANYA SEKALI per proses
// (di startup server.js, atau saat pertama kali dipakai), sedangkan nilainya tetap
// dibaca segar di setiap request supaya perubahan dari halaman Setting langsung
// terpakai (tanpa cache).

const db = require('../db');

const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`;

// Setting yang harus selalu punya nilai awal.
const DEFAULTS = {
    lpd_cutoff_date: '2026-07-01'
};

let ensurePromise = null;

/**
 * Pastikan tabel + nilai default ada. Aman dipanggil berkali-kali:
 * pekerjaan hanya dijalankan sekali per proses (promise di-memo).
 */
function ensureAppSettings() {
    if (!ensurePromise) {
        ensurePromise = (async () => {
            await db.query(CREATE_TABLE_SQL);
            for (const [key, value] of Object.entries(DEFAULTS)) {
                await db.query(
                    'INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)',
                    [key, value]
                );
            }
            console.log('⚙️ app_settings siap (dibuat/diverifikasi sekali, bukan per request)');
        })().catch((err) => {
            // Kalau gagal (mis. DB sedang down), jangan simpan promise yang gagal
            // supaya percobaan berikutnya masih bisa berhasil.
            ensurePromise = null;
            throw err;
        });
    }
    return ensurePromise;
}

/**
 * Ambil satu nilai setting. Mengembalikan `fallback` kalau gagal/tidak ada
 * (tidak pernah melempar error ke pemanggil).
 */
async function getAppSetting(key, fallback = null) {
    try {
        await ensureAppSettings();
        const [rows] = await db.query(
            'SELECT setting_value FROM app_settings WHERE setting_key = ?',
            [key]
        );
        return rows.length > 0 && rows[0].setting_value !== null
            ? rows[0].setting_value
            : fallback;
    } catch (err) {
        console.warn(`⚠️ Gagal membaca app_settings.${key}: ${err.message}`);
        return fallback;
    }
}

/**
 * Batas tanggal kegiatan yang boleh tampil di LPD/kwitansi (dipakai sebagai
 * `${cutoff} 00:00:00` di klausa SQL). Kalau tidak terbaca, memakai default.
 */
function getLpdCutoffDate() {
    return getAppSetting('lpd_cutoff_date', DEFAULTS.lpd_cutoff_date);
}

module.exports = {
    ensureAppSettings,
    getAppSetting,
    getLpdCutoffDate,
    DEFAULT_LPD_CUTOFF_DATE: DEFAULTS.lpd_cutoff_date
};
