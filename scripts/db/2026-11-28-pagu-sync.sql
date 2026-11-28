-- ============================================================
-- 2026-11-28-pagu-sync.sql
-- Konfigurasi sinkronisasi Pagu & Realisasi dari API Jendela Kinerja.
--
-- Token API disimpan TERENKRIPSI (AES-256-GCM, kunci dari
-- LOKASI_ENCRYPTION_KEY) agar halaman Pagu bisa mengambil data langsung
-- dari aplikasi sumber setiap kali dibuka. Data pagu/realisasi TIDAK
-- disimpan di database.
--
-- Cara pakai:
--   mysql -u <user> -p <database> < scripts/db/2026-11-28-pagu-sync.sql
-- Sifat: hanya menambah tabel (tidak menyentuh pagu_realisasi).
-- ============================================================

CREATE TABLE IF NOT EXISTS pagu_sync_config (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  token_enc TEXT NULL,
  tahun_anggaran INT NULL,
  last_sync_at DATETIME NULL,
  last_attempt_at DATETIME NULL,
  last_error VARCHAR(500) NULL,
  updated_by VARCHAR(150) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
