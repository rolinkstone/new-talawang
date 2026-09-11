#!/bin/sh
# ============================================================
#  migrate-uploads.sh
#  Pindahkan file upload dari desain LAMA ke desain BARU.
#
#    LAMA : ./data/backend/uploads      (volume terpisah, TIDAK diserve lagi)
#    BARU : ./backend/public/uploads    (langsung di-mount & diserve)
#
#  Jalankan SEKALI di SERVER, dari folder yang berisi docker-compose.yml:
#      sh scripts/migrate-uploads.sh --dry-run   # lihat dulu rencananya
#      sh scripts/migrate-uploads.sh             # eksekusi
#      docker compose up -d --force-recreate backend
#
#  SIFAT
#    - Hanya MENAMBAH file yang belum ada di folder baru.
#    - Tidak pernah menimpa dan tidak pernah menghapus file.
#    - Folder LAMA tidak dihapus, jadi masih bisa dipakai untuk rollback.
# ============================================================

set -u

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=1
fi

ok()    { printf '  [OK]   %s\n' "$*"; }
bad()   { printf '  [X]    %s\n' "$*"; }
info()  { printf '  ...    %s\n' "$*"; }
head_() { printf '\n=== %s ===\n' "$*"; }
num()   { tr -d '\r\n ' 2>/dev/null; }

if [ ! -f docker-compose.yml ] && [ ! -f compose.yml ]; then
    bad "docker-compose.yml tidak ditemukan di: $(pwd)"
    bad "Jalankan script ini dari folder project (tempat docker-compose.yml berada)."
    exit 1
fi

OLD_DIR="$PWD/data/backend/uploads"
NEW_DIR="$PWD/backend/public/uploads"

head_ "1. Folder"
info "LAMA : $OLD_DIR"
info "BARU : $NEW_DIR"

if [ ! -d "$OLD_DIR" ]; then
    ok "Folder LAMA tidak ada -> tidak ada yang perlu dimigrasikan."
    printf '\n'
    exit 0
fi

OLD_COUNT=$(find "$OLD_DIR" -type f 2>/dev/null | wc -l | num)
info "file di folder LAMA : $OLD_COUNT"

if [ "$OLD_COUNT" -eq 0 ]; then
    ok "Folder LAMA kosong -> tidak ada yang perlu dimigrasikan."
    printf '\n'
    exit 0
fi

mkdir -p "$NEW_DIR"

head_ "2. Salin file yang belum ada di folder BARU"
LIST="/tmp/.migrate-list.$$"
find "$OLD_DIR" -type f 2>/dev/null > "$LIST" || : > "$LIST"

ADDED=0
SKIPPED=0
while IFS= read -r SRC; do
    [ -n "$SRC" ] || continue
    REL="${SRC#"$OLD_DIR"/}"
    DEST="$NEW_DIR/$REL"

    if [ -e "$DEST" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        info "akan disalin: $REL"
    else
        DEST_SUB="${DEST%/*}"
        [ -d "$DEST_SUB" ] || mkdir -p "$DEST_SUB"
        if cp -p "$SRC" "$DEST"; then
            ADDED=$((ADDED + 1))
        else
            bad "gagal menyalin: $REL"
        fi
        continue
    fi
    ADDED=$((ADDED + 1))
done < "$LIST"
rm -f "$LIST"

head_ "3. Hasil"
if [ "$DRY_RUN" -eq 1 ]; then
    info "DRY RUN: $ADDED file AKAN disalin, $SKIPPED sudah ada (dilewati)."
    info "Jalankan tanpa --dry-run untuk benar-benar menyalin."
else
    ok "$ADDED file disalin, $SKIPPED dilewati (sudah ada)."
    NEW_COUNT=$(find "$NEW_DIR" -type f 2>/dev/null | wc -l | num)
    info "total file di folder BARU sekarang: $NEW_COUNT"
fi

head_ "4. Langkah berikutnya"
printf '  docker compose up -d --force-recreate backend\n'
printf '  docker compose logs backend | tail -20\n'
printf '\n'
printf '  Folder LAMA TIDAK dihapus: %s\n' "$OLD_DIR"
printf '  Setelah yakin semua dokumen tampil normal di aplikasi, boleh dihapus:\n'
printf '    rm -rf %s\n' "$OLD_DIR"
printf '\n'
