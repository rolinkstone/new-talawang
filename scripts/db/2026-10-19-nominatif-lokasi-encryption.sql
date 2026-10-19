-- ============================================================
-- 2026-10-19-nominatif-lokasi-encryption.sql
-- Kolom pendukung fitur enkripsi field `kota_kab_kecamatan`
-- pada modul nominatif.
--
-- Cara pakai (dijalankan SEKALI per database):
--   mysql -u <user> -p accounting < scripts/db/2026-10-19-nominatif-lokasi-encryption.sql
--
-- Sifat: HANYA MENAMBAH kolom (data lama tidak berubah).
-- Nilai `kota_kab_kecamatan_encrypted = 0` berarti masih teks biasa.
-- `kota_kab_kecamatan_key_enc` menyimpan kunci enkripsi:
--   - format lama: kode 16 karakter dienkripsi dengan LOKASI_ENCRYPTION_KEY (`k1:...`)
--   - format baru: JSON bundle v2 berisi DEK yang dibungkus secret TOTP user dan
--     kode cadangan (lihat backend/utils/lokasiCrypto.js). Tidak perlu kolom baru.
-- ============================================================

ALTER TABLE nominatif_kegiatan
    ADD COLUMN kota_kab_kecamatan_encrypted TINYINT(1) NOT NULL DEFAULT 0 AFTER kota_kab_kecamatan,
    ADD COLUMN kota_kab_kecamatan_key_enc TEXT NULL AFTER kota_kab_kecamatan_encrypted;
