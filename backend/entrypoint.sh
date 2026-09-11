#!/bin/sh
# ============================================================
#  entrypoint.sh — TALAWANG KEUANGAN (backend)
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
#    - Hanya berjalan SAAT VOLUME MASIH KOSONG.
#      Data yang sudah ada di volume TIDAK PERNAH ditimpa/dihapus.
#      Aman dijalankan berkali-kali (idempotent).
#    - Bisa dimatikan lewat environment: SEED_UPLOADS=false
#
#  CATATAN
#    File upload baru yang dibuat user di server tetap tersimpan di
#    ./data/backend/uploads (host) dan TIDAK akan hilang saat rebuild.
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

# `ls -A` = daftar isi tanpa . dan .. ; kosong berarti volume masih kosong.
if [ -n "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
    log "Volume uploads sudah berisi data -> seed TIDAK disalin (data lama aman)."
    log "  lokasi : $UPLOADS_DIR"
    exec "$@"
fi

log "Volume uploads kosong -> menyalin $SEED_COUNT file dari image..."
cp -a "$SEED_DIR"/. "$UPLOADS_DIR"/

COPIED="$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l | tr -d '[:space:]')"
log "Seeding selesai: $COPIED file tersedia di $UPLOADS_DIR"

exec "$@"
