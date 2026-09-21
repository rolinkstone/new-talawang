-- ============================================================
-- 2026-09-21-index-tuning.sql
-- Penambahan index berdasarkan hasil EXPLAIN query aplikasi keuangan.
--
-- Cara pakai (dijalankan SEKALI per database):
--   mysql -u <user> -p <database> < scripts/db/2026-09-21-index-tuning.sql
--   atau impor lewat phpMyAdmin/HeidiSQL.
--
-- Sifat: HANYA MENAMBAH index (tidak mengubah/menghapus data).
-- Kalau dijalankan dua kali, error "Duplicate key name" aman diabaikan.
-- Pembuatan index di MySQL 8 berjalan online (tidak mengunci tabel untuk tulis).
--
-- Ringkasan temuan EXPLAIN sebelum index ini (database development):
--   * `WHERE no_st = ?`                     -> type=ALL, possible_keys=NULL  (tidak ada index)
--   * `WHERE ppk_nip = ?`                   -> type=ALL, possible_keys=NULL  (tidak ada index)
--   * daftar pagu (ORDER BY tahun,mak)      -> type=ALL + Using filesort     (~20 ms, query terlambat)
--   * LPD/kwitansi/notifikasi pakai cutoff  -> hanya `status,status_2` terpakai, created_at tidak
--   * `WHERE nip = ?` (tanpa kegiatan_id)   -> type=index (scan seluruh index, 618 baris)
--
-- Catatan: query dengan LIKE '%kata%' (fitur pencarian) TIDAK akan pernah memakai
-- index biasa — itu memang sifat leading wildcard. Kalau perlu cepat, pakai FULLTEXT
-- (perubahan terpisah, menyentuh kode).
-- ============================================================

-- 1) Cari kegiatan berdasarkan nomor Surat Tugas.
--    Dipakai subquery EXISTS di GET /api/kwitansi/need-kwitansi dan
--    GET /api/lpd/daftar-kegiatan (mencocokkan kegiatan dengan no_st sama).
CREATE INDEX idx_kegiatan_no_st ON nominatif_kegiatan (no_st);

-- 2) Cari kegiatan berdasarkan NIP PPK (mode PPK di need-kwitansi).
CREATE INDEX idx_kegiatan_ppk_nip ON nominatif_kegiatan (ppk_nip);

-- 3) Daftar LPD / kwitansi / notifikasi selalu memfilter
--    status + status_2 dan membatasi created_at (cutoff tanggal LPD).
--    Index ini menggabungkan ketiganya sehingga rentang tanggal ikut terbaca dari index.
--    (Setelah index ini ada, `idx_kegiatan_status (status,status_2)` menjadi
--     prefix yang redundan dan boleh dihapus untuk menghemat biaya tulis:
--       DROP INDEX idx_kegiatan_status ON nominatif_kegiatan; )
CREATE INDEX idx_kegiatan_status_created ON nominatif_kegiatan (status, status_2, created_at);

-- 4) Daftar pagu: SELECT tanpa WHERE + ORDER BY tahun_anggaran DESC, mak ASC.
--    Tanpa index ini MySQL memindai seluruh tabel lalu mengurutkan (filesort).
CREATE INDEX idx_pagu_tahun_mak ON pagu_realisasi (tahun_anggaran, mak);

-- 5) Pencarian pegawai berdasarkan NIP saja (mis. /api/profile/ttd-by-nip/:nip).
--    Index lama (kegiatan_id, nip) tidak bisa dipakai kalau kegiatan_id tidak difilter,
--    sehingga MySQL melakukan scan seluruh index (618 baris).
CREATE INDEX idx_pegawai_nip ON nominatif_pegawai (nip);

-- ============================================================
-- OPSIONAL (butuh perubahan kode dulu, jangan dijalankan sendirian):
--
-- a) Kolom turunan untuk NIP tanpa spasi. Kode memakai
--    REPLACE(p.nip, ' ', '') dan TRIM(...) sehingga index pada `nip` tidak terpakai.
--    Setelah kolom ini ada, ganti perbandingan kesamaan di kode menjadi
--    `p.nip_clean = ?` (bagian LIKE '%...%' tetap seperti sekarang).
--
--    ALTER TABLE nominatif_pegawai
--      ADD COLUMN nip_clean VARCHAR(50) GENERATED ALWAYS AS (REPLACE(nip,' ','')) STORED,
--      ADD INDEX idx_pegawai_nip_clean (nip_clean);
--
-- b) status_2 kolomnya varchar(150) dengan collation utf8mb4_0900_ai_ci
--    (case-insensitive). Jadi `UPPER(n.status_2) = 'SELESAI'` di
--    backend/routes/kwitansi.js sebenarnya tidak perlu UPPER() dan UPPER()
--    itu justru mematikan index. Cukup `n.status_2 = 'selesai'`.
-- ============================================================
