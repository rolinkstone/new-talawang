-- ============================================================
-- 2026-10-19-user-totp.sql
-- Tabel secret Google Authenticator (TOTP) per user.
--
-- Cara pakai (dijalankan SEKALI per database):
--   mysql -u <user> -p accounting < scripts/db/2026-10-19-user-totp.sql
--
-- Catatan:
-- - Backend juga membuat tabel ini otomatis (CREATE TABLE IF NOT EXISTS)
--   saat endpoint /api/profile/totp pertama kali dipanggil.
-- - `secret_enc` adalah secret TOTP yang dienkripsi dengan
--   LOKASI_ENCRYPTION_KEY (lihat backend/utils/totpCrypto.js).
-- - `enabled = 0` berarti proses setup belum diverifikasi.
-- - Untuk mereset authenticator user yang kehilangan HP:
--       DELETE FROM user_totp WHERE user_id = '<user_id>';
--   Setelah itu user dapat menghubungkan ulang dari halaman Profil.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_totp (
    user_id VARCHAR(64) NOT NULL PRIMARY KEY,
    username VARCHAR(191) NULL,
    secret_enc TEXT NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME NULL,
    last_used_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
