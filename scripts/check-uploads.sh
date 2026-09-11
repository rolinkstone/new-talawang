#!/bin/sh
# ============================================================
#  check-uploads.sh - diagnosa "file upload 404" pada TALAWANG KEUANGAN
#
#  Jalankan di SERVER, dari folder yang berisi docker-compose.yml:
#      sh scripts/check-uploads.sh
#      sh scripts/check-uploads.sh spd/sptjm-1784515886991-305389412.pdf
#
#  Script ini hanya MEMBACA. Tidak mengubah apa pun.
#
#  Latar belakang:
#    Ada DUA folder yang mirip tapi berbeda peran:
#      A. <project>/backend/public/uploads/   -> sumber build (tempat Anda upload)
#      B. <project>/data/backend/uploads/     -> volume, INI yang diserve URL
#    File di A baru sampai ke B lewat: build -> /seed/uploads di image
#    -> container start -> entrypoint.sh menyalinnya ke B.
#    Kalau salah satu mata rantai putus, hasilnya 404.
# ============================================================

set -u

ok()    { printf '  [OK]   %s\n' "$*"; }
bad()   { printf '  [X]    %s\n' "$*"; }
warn()  { printf '  [!]    %s\n' "$*"; }
info()  { printf '  ...    %s\n' "$*"; }
head_() { printf '\n=== %s ===\n' "$*"; }
num()   { tr -d '\r\n ' 2>/dev/null; }

FILE_TO_CHECK="${1:-}"

# ------------------------------------------------------------
if [ ! -f docker-compose.yml ] && [ ! -f compose.yml ]; then
    bad "docker-compose.yml tidak ditemukan di: $(pwd)"
    bad "Jalankan script ini dari folder project (tempat docker-compose.yml berada)."
    exit 1
fi
if [ -f docker-compose.yml ]; then COMPOSE_FILE=docker-compose.yml; else COMPOSE_FILE=compose.yml; fi

head_ "0. Lokasi"
info "pwd            = $(pwd)"
info "compose file   = $COMPOSE_FILE"

# ------------------------------------------------------------
head_ "1. Folder yang DISERVE (hasil resolve docker compose)"
VOL_SRC="$(docker compose config 2>/dev/null \
    | grep -B2 'target: /usr/src/app/public/uploads' \
    | sed -n 's/^[[:space:]]*source:[[:space:]]*//p' \
    | head -1)"

if [ -n "$VOL_SRC" ]; then
    ok "yang diserve  = $VOL_SRC"
    info "(bandingkan dengan folder tempat Anda upload file)"
else
    warn "tidak bisa membaca mapping volume dari docker compose config"
fi

# ------------------------------------------------------------
head_ "2. Folder TEMPAT ANDA UPLOAD (sumber build)"
SRC_DIR="$PWD/backend/public/uploads"
if [ -d "$SRC_DIR" ]; then
    n=$(find "$SRC_DIR" -type f 2>/dev/null | wc -l | num)
    ok "ada           = $SRC_DIR"
    info "jumlah file   = $n"
    if [ "$n" -eq 0 ]; then
        bad "KOSONG. File yang Anda lihat di file manager mungkin ada di folder lain."
    fi
else
    bad "tidak ada: $SRC_DIR"
fi

# ------------------------------------------------------------
head_ "3. Apakah container berjalan?"
RUNNING="$(docker compose ps -q backend 2>/dev/null | head -1)"
if [ -z "$RUNNING" ]; then
    bad "container 'backend' TIDAK berjalan."
    bad "Jalankan: docker compose up -d"
    RUNNING=""
else
    ok "container berjalan"
    docker compose ps 2>/dev/null | sed 's/^/  /'
fi

# ------------------------------------------------------------
head_ "4. Versi entrypoint yang TERPASANG (yang benar = per-file merge)"
if [ -n "$RUNNING" ]; then
    if docker compose exec -T backend sh -c 'grep -q LIST_FILE /usr/src/app/entrypoint.sh' 2>/dev/null; then
        ok "versi BARU (per-file merge) - sudah benar"
        EP_NEW=1
    else
        bad "versi LAMA (syarat 'volume kosong') -> seeding selalu dilewati"
        bad "Perbaiki: git pull && docker compose build && docker compose up -d"
        EP_NEW=0
    fi
else
    warn "dilewati (container tidak berjalan)"
    EP_NEW=""
fi

# ------------------------------------------------------------
head_ "5. Seed di dalam IMAGE (hasil docker compose build)"
if [ -n "$RUNNING" ]; then
    SEED=$(docker compose exec -T backend sh -c 'find /seed/uploads -type f 2>/dev/null | wc -l' 2>/dev/null | num)
    SEED=${SEED:-0}
    if [ "$SEED" -gt 0 ]; then
        ok "seed berisi $SEED file -> build SUDAH membawa uploads"
    else
        bad "seed KOSONG -> build TIDAK membawa uploads"
        bad "Sebab tersering: backend/.dockerignore masih meng-ignore public/uploads,"
        bad "atau build dijalankan dari folder project yang berbeda."
        bad "Perbaiki: git pull && docker compose build"
    fi
else
    SEED=""
    warn "dilewati (container tidak berjalan)"
fi

# ------------------------------------------------------------
head_ "6. File di folder yang diserve, DI DALAM container"
if [ -n "$RUNNING" ]; then
    IN_CONT=$(docker compose exec -T backend sh -c 'find /usr/src/app/public/uploads -type f 2>/dev/null | wc -l' 2>/dev/null | num)
    IN_CONT=${IN_CONT:-0}
    if [ "$IN_CONT" -gt 0 ]; then
        ok "$IN_CONT file -> URL seharusnya bisa diakses"
    else
        bad "0 file -> inilah penyebab 404"
        if [ "$SEED" -gt 0 ] 2>/dev/null; then
            bad "Seed ada ($SEED file) tapi volume kosong -> entrypoint tidak jalan."
            bad "Jalankan: docker compose up -d   (build saja TIDAK recreate container)"
        fi
    fi
    if [ -n "$FILE_TO_CHECK" ]; then
        info "cek file: $FILE_TO_CHECK"
        docker compose exec -T backend sh -c "ls -la '/usr/src/app/public/uploads/$FILE_TO_CHECK'" 2>&1 | sed 's/^/    /'
    fi
else
    IN_CONT=""
    warn "dilewati (container tidak berjalan)"
fi

# ------------------------------------------------------------
head_ "7. Log entrypoint saat container start"
if [ -n "$RUNNING" ]; then
    docker compose logs backend 2>/dev/null | grep -i 'entrypoint' | tail -6 | sed 's/^/  /'
else
    warn "dilewati (container tidak berjalan)"
fi

# ------------------------------------------------------------
head_ "KESIMPULAN"
if [ -z "$RUNNING" ]; then
    warn "Container tidak berjalan -> jalankan: docker compose up -d"
elif [ "${EP_NEW:-1}" = "0" ]; then
    bad "Server masih memakai kode LAMA."
    bad "Jalankan: git pull && docker compose build && docker compose up -d"
elif [ "${SEED:-0}" -eq 0 ]; then
    bad "Build tidak membawa file upload."
    bad "Pastikan Anda upload ke $SRC_DIR lalu: docker compose build && docker compose up -d"
elif [ "${IN_CONT:-0}" -eq 0 ]; then
    bad "File ada di image tapi tidak sampai ke volume."
    bad "Jalankan: docker compose up -d   (wajib, build saja tidak cukup)"
else
    ok "Semua mata rantai utuh ($IN_CONT file tersedia)."
    info "Kalau URL masih 404, cek EJAAN/nama file pada URL."
    info "URL yang benar: /uploads/<subfolder>/<namafile>"
    info "            atau /api/uploads/<subfolder>/<namafile>"
fi

printf '\n'
