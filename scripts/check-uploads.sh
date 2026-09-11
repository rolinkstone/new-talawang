#!/bin/sh
# ============================================================
#  check-uploads.sh - diagnosa "file upload 404" pada TALAWANG KEUANGAN
#
#  MODEL YANG BERLAKU SEKARANG:
#
#      <project>/backend/public/uploads/<subfolder>/<namafile>
#          |  bind mount
#          v
#      /usr/src/app/public/uploads/<subfolder>/<namafile>
#          |
#          v
#      https://<domain>/uploads/<subfolder>/<namafile>
#      https://<domain>/api/uploads/<subfolder>/<namafile>
#
#  Jadi: folder yang Anda buka di FILE MANAGER = folder yang DISERVE aplikasi.
#  File yang ditaruh di sana langsung bisa diakses, tanpa build / restart.
#
#  Jalankan di SERVER, dari folder yang berisi docker-compose.yml:
#      sh scripts/check-uploads.sh
#      sh scripts/check-uploads.sh sptjm-transport/sptjm-1784515886991-305389412.pdf
#
#  Script ini hanya MEMBACA. Tidak mengubah apa pun.
# ============================================================

set -u

ok()    { printf '  [OK]   %s\n' "$*"; }
bad()   { printf '  [X]    %s\n' "$*"; }
warn()  { printf '  [!]    %s\n' "$*"; }
info()  { printf '  ...    %s\n' "$*"; }
head_() { printf '\n=== %s ===\n' "$*"; }
num()   { tr -d '\r\n ' 2>/dev/null; }

FILE_TO_CHECK="${1:-}"

if [ ! -f docker-compose.yml ] && [ ! -f compose.yml ]; then
    bad "docker-compose.yml tidak ditemukan di: $(pwd)"
    bad "Jalankan script ini dari folder project (tempat docker-compose.yml berada)."
    exit 1
fi
if [ -f docker-compose.yml ]; then COMPOSE_FILE=docker-compose.yml; else COMPOSE_FILE=compose.yml; fi

# ------------------------------------------------------------
head_ "0. Lokasi"
info "pwd          = $(pwd)"
info "compose file = $COMPOSE_FILE"

# ------------------------------------------------------------
head_ "1. Folder yang DISERVE (hasil resolve docker compose)"
VOL_SRC="$(docker compose config 2>/dev/null \
    | grep -B2 'target: /usr/src/app/public/uploads' \
    | sed -n 's/^[[:space:]]*source:[[:space:]]*//p' \
    | head -1)"

EXPECTED="$PWD/backend/public/uploads"
if [ -n "$VOL_SRC" ]; then
    ok "yang diserve = $VOL_SRC"
    # Bandingkan AKHIRAN path, bukan path absolut penuh, supaya tidak salah
    # alarm saat format path berbeda (mis. diuji di Windows/git-bash).
    case "$VOL_SRC" in
        */backend/public/uploads|*\\backend\\public\\uploads)
            ok "sesuai desain (backend/public/uploads)"
            ;;
        *)
            warn "BEDA dari yang diharapkan: $EXPECTED"
            warn "Lakukan salah satu:"
            warn "  a) taruh file Anda di $VOL_SRC, atau"
            warn "  b) ubah mapping volume di $COMPOSE_FILE ke ./backend/public/uploads"
            ;;
    esac
else
    warn "tidak bisa membaca mapping volume dari docker compose config"
fi

# ------------------------------------------------------------
head_ "2. File di folder upload (HOST)"
if [ -d "$EXPECTED" ]; then
    HOST_N=$(find "$EXPECTED" -type f 2>/dev/null | wc -l | num)
    ok "ada, berisi $HOST_N file"
    info "lokasi: $EXPECTED"
    if [ "$HOST_N" -eq 0 ]; then
        bad "KOSONG. File yang Anda lihat di file manager mungkin ada di folder lain."
    fi
    printf '  -- rincian per subfolder --\n'
    for d in "$EXPECTED"/*/; do
        [ -d "$d" ] || continue
        n=$(find "$d" -type f 2>/dev/null | wc -l | num)
        printf '     %-22s %s file\n' "$(basename "$d")" "$n"
    done
else
    bad "BELUM ADA: $EXPECTED"
    bad "Buat folder ini lalu taruh file upload di sini."
fi

# ------------------------------------------------------------
head_ "3. Status container backend"
RUNNING="$(docker compose ps -q backend 2>/dev/null | head -1)"
if [ -z "$RUNNING" ]; then
    bad "container 'backend' TIDAK berjalan -> jalankan: docker compose up -d"
    RUNNING=""
else
    ok "container berjalan"
    docker compose ps 2>/dev/null | sed 's/^/  /'
fi

# ------------------------------------------------------------
head_ "4. File di folder yang diserve, DI DALAM container"
if [ -n "$RUNNING" ]; then
    CONT_N=$(docker compose exec -T backend sh -c 'find /usr/src/app/public/uploads -type f 2>/dev/null | wc -l' 2>/dev/null | num)
    CONT_N=${CONT_N:-0}
    ok "$CONT_N file"
    if [ -n "${HOST_N:-}" ] && [ "$CONT_N" = "$HOST_N" ]; then
        ok "sama dengan host -> bind mount bekerja"
    elif [ -n "${HOST_N:-}" ]; then
        warn "BERBEDA dari host ($HOST_N) -> bind mount tidak sesuai"
        warn "Cek baris 'volumes:' pada service backend di $COMPOSE_FILE,"
        warn "lalu jalankan: docker compose up -d --force-recreate backend"
    fi
else
    warn "dilewati (container tidak berjalan)"
fi

# ------------------------------------------------------------
if [ -n "$FILE_TO_CHECK" ]; then
    head_ "5. Cek file spesifik"
    info "host      : $EXPECTED/$FILE_TO_CHECK"
    ls -la "$EXPECTED/$FILE_TO_CHECK" 2>&1 | sed 's/^/    /'
    if [ -n "$RUNNING" ]; then
        info "container : /usr/src/app/public/uploads/$FILE_TO_CHECK"
        docker compose exec -T backend sh -c "ls -la '/usr/src/app/public/uploads/$FILE_TO_CHECK'" 2>&1 | sed 's/^/    /'
    fi
fi

# ------------------------------------------------------------
head_ "6. Sisa folder desain LAMA (kalau ada isinya = belum dimigrasi)"
OLD_DIR="$PWD/data/backend/uploads"
if [ -d "$OLD_DIR" ]; then
    OLD_N=$(find "$OLD_DIR" -type f 2>/dev/null | wc -l | num)
    if [ "$OLD_N" -gt 0 ]; then
        warn "data/backend/uploads masih berisi $OLD_N file"
        warn "Folder ini TIDAK diserve lagi. Kalau ada dokumen penting di sana:"
        warn "    sh scripts/migrate-uploads.sh --dry-run"
        warn "    sh scripts/migrate-uploads.sh"
    else
        ok "data/backend/uploads kosong (aman)"
    fi
else
    ok "folder lama tidak ada (aman)"
fi

# ------------------------------------------------------------
head_ "KESIMPULAN"
if [ -z "$RUNNING" ]; then
    warn "Container tidak berjalan -> jalankan: docker compose up -d"
elif [ "${HOST_N:-0}" -eq 0 ] 2>/dev/null; then
    bad "Folder upload Anda kosong. Taruh file di:"
    bad "    $EXPECTED/<subfolder>/"
elif [ -n "${CONT_N:-}" ] && [ "$CONT_N" -eq 0 ] 2>/dev/null; then
    bad "Folder terisi di host tapi kosong di container -> bind mount bermasalah."
    bad "Jalankan: docker compose up -d --force-recreate backend"
elif [ -n "${CONT_N:-}" ] && [ -n "${HOST_N:-}" ] && [ "$CONT_N" != "$HOST_N" ]; then
    warn "Jumlah file host ($HOST_N) != container ($CONT_N)."
    warn "Jalankan: docker compose up -d --force-recreate backend"
else
    ok "Semua normal ($CONT_N file tersedia di container)."
    info "Kalau URL masih 404, periksa EJAAN/nama file pada URL:"
    info "  /uploads/<subfolder>/<namafile>"
    info "  /api/uploads/<subfolder>/<namafile>"
    info "Nama file bersifat case-sensitive (huruf besar/kecil berpengaruh)."
fi

printf '\n'
