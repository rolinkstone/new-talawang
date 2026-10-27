-- ============================================================
-- 2026-10-27-nominatif-rincian-perjadin.sql
-- Tabel rincian tiket pesawat & hotel per pegawai untuk laporan
-- Rekap Perjalanan Dinas (SPJ) / export XLSX.
--
-- Cara pakai (dijalankan SEKALI per database):
--   mysql -u <user> -p accounting < scripts/db/2026-10-27-nominatif-rincian-perjadin.sql
--
-- Catatan:
-- - Backend juga membuat tabel ini otomatis (CREATE TABLE IF NOT EXISTS)
--   saat endpoint /api/laporan/nominatif-perjadin pertama kali dipanggil.
-- - No. SPM tidak perlu kolom baru: nilainya diambil dari
--   `nominatif_kegiatan.catatan_status_2` (mis. "SPM No 323").
-- - Uang harian, uang representasi, transport lokal, dan BBM tetap diambil
--   dari tabel nominatif yang sudah ada (nominatif_uang_harian_items,
--   nominatif_transportasi).
-- ============================================================

-- 1) Rincian tiket pesawat (pergi/pulang) per pegawai
CREATE TABLE IF NOT EXISTS nominatif_rincian_transport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    biaya_id INT NOT NULL COMMENT 'FK nominatif_biaya_kegiatan.id',
    arah ENUM('PERGI', 'PULANG') NOT NULL DEFAULT 'PERGI',
    jenis VARCHAR(50) NOT NULL DEFAULT 'PESAWAT' COMMENT 'PESAWAT / KERETA / LAINNYA',
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 2) Rincian hotel per pegawai
CREATE TABLE IF NOT EXISTS nominatif_rincian_hotel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    biaya_id INT NOT NULL COMMENT 'FK nominatif_biaya_kegiatan.id',
    nama_hotel VARCHAR(255) NULL,
    alamat_hotel TEXT NULL,
    no_telpon_hotel VARCHAR(50) NULL,
    tgl_check_in DATE NULL,
    tgl_check_out DATE NULL,
    total_bill DECIMAL(20, 2) NULL COMMENT 'Total bill hotel yang dibayarkan',
    no_kamar VARCHAR(50) NULL,
    no_invoice VARCHAR(100) NULL,
    biaya_ditanggung DECIMAL(20, 2) NULL COMMENT 'Total biaya hotel yang menjadi beban anggaran (mis. 30% dari total bill)',
    keterangan VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_rincian_hotel_biaya (biaya_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
