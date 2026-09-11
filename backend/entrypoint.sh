#!/bin/sh
# ============================================================
#  entrypoint.sh - TALAWANG KEUANGAN (backend)
#
#  TUGAS
#    Mengisi folder uploads di dalam container dari "seed" yang ikut
#    di-bake ke image saat `docker compose build`.
#
#  KENAPA PERLU?
#    docker-compose.yml me-mount:
#        ./data/backend/uploads  ->  /usr/src/app/public/uploads
#    Bind mount MENIMPA (mask) isi image pada path tersebut. Di server yang
#    baru pertama kali deploy, folder ./data/backend/uploads masih kosong,
#    sehingga aplikasi terlihat "tidak punya file upload" walaupun file
#    sebenarnya ada di dalam image.
#
#    Solusinya: Dockerfile menyalin folder uploads ke path DI LUAR mount
#    (/seed/uploads), lalu script ini menyalinnya ke volume.
#
#  SIFAT
#    - Menggabungkan (merge) file dari image ke volume secara PER-FILE:
#        file yang BELUM ada di volume -> disalin
#        file yang SUDAH ada          -> DILEWATI (data user tidak ditimpa)
#      Aman dijalankan berkali-kali (idempotent).
#    - Bisa dimatikan lewat environment: SEED_UPLOADS=false
#
#  CATATAN
#    - File upload baru yang dibuat user di server tetap tersimpan di
#      ./data/backend/uploads (host) dan TIDAK akan hilang saat rebuild.
#    - Karena seed hanya menambahkan file yang belum ada, file yang SENGAJA
#      dihapus di server akan muncul lagi dari image pada start berikutnya.
#      Set SEED_UPLOADS=false bila tidak menginginkan perilaku itu.
# ============================================================

set -eu

UPLOADS_DIR="${UPLOADS_DIR:-/usr/src/app/public/uploads}"
SEED_DIR="${SEED_DIR:-/seed/uploads}"

log() {
    echo "[entrypoint] $*"
}

# Pastikan folder tujuan ada (mis. saat dijalankan tanpa volume).
mkdir -p "$UPLOADS_DIR"

if [ "${SEED_UPLOADS:-true}" = "false" ]; then
    log "SEED_UPLOADS=false -> seeding dilewati."
    exec "$@"
fi

if [ ! -d "$SEED_DIR" ]; then
    log "Image tidak membawa seed ($SEED_DIR) -> seeding dilewati."
    exec "$@"
fi

# wc -l bisa memberi padding spasi di sebagian platform -> dibersihkan.
SEED_COUNT="$(find "$SEED_DIR" -type f 2>/dev/null | wc -l | tr -d '[:space:]')"
if [ "$SEED_COUNT" -eq 0 ]; then
    log "Seed kosong -> seeding dilewati."
    exec "$@"
fi

# JANGAN memakai syarat "volume harus kosong". Aplikasi ini sendiri membuat
# subfolder kosong saat start (kwitansi/, spd/, lpd-dokumentasi/, ...),
# sehingga volume terlihat "sudah berisi data" dan SELURUH seeding terlewat.
#
# JANGAN juga memakai `cp -an`: pada busybox, `-n` ikut melewati seluruh tree
# ketika direktori tujuan sudah ada, sehingga tidak ada file yang tersalin.
# Pengecekan per-file di bawah ini eksplisit dan dapat diprediksi.
log "Menggabungkan seed ke volume ($SEED_COUNT file di image)..."

LIST_FILE="/tmp/.seed-list.$$"
find "$SEED_DIR" -type f 2>/dev/null > "$LIST_FILE" || : > "$LIST_FILE"

ADDED=0
SKIPPED=0
while IFS= read -r SRC_FILE; do
    [ -n "$SRC_FILE" ] || continue
    REL="${SRC_FILE#"$SEED_DIR"/}"
    DEST_FILE="$UPLOADS_DIR/$REL"

    if [ -e "$DEST_FILE" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    DEST_DIR="$(dirname "$DEST_FILE")"
    [ -d "$DEST_DIR" ] || mkdir -p "$DEST_DIR"
    if cp -p "$SRC_FILE" "$DEST_FILE"; then
        ADDED=$((ADDED + 1))
    else
        log "PERINGATAN: gagal menyalin $REL"
    fi
done < "$LIST_FILE"

rm -f "$LIST_FILE"

if [ "$ADDED" -eq 0 ]; then
    log "Tidak ada file baru: semua $SKIPPED file sudah ada di volume."
else
    log "Selesai: $ADDED file baru ditambahkan, $SKIPPED dilewati (sudah ada)."
fi

exec "$@"
