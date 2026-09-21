#!/usr/bin/env node
// ============================================================
// scripts/generate-secrets.mjs — buat nilai acak kuat untuk rahasia aplikasi
//
//   node scripts/generate-secrets.mjs            # tulis ke ./.env (root)
//   node scripts/generate-secrets.mjs --check    # hanya laporkan status, tidak mengubah
//
// Yang diganti: SESSION_SECRET, JWT_SECRET, SIGNED_URL_SECRET, NEXTAUTH_SECRET
// Panjang: 64 karakter base64url (acak kriptografis) — jauh di atas minimum
// 32 karakter yang dicek scripts/check-env.mjs.
//
// ⚠️ Script ini TIDAK pernah mencetak nilai rahasianya. Untuk memastikan nilai
// di server = nilai di sini, bandingkan kolom "sha256[0:12]" dari hasil script
// ini dengan hasil `node scripts/generate-secrets.mjs --check` di server.
//
// ⚠️ Mengganti NEXTAUTH_SECRET membuat SEMUA sesi login yang sedang aktif
//    menjadi tidak valid → user harus login ulang (tidak ada data yang hilang).
// ============================================================

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, '.env');
const KEYS = ['SESSION_SECRET', 'JWT_SECRET', 'SIGNED_URL_SECRET', 'NEXTAUTH_SECRET'];

const CHECK_ONLY = process.argv.includes('--check');
const PLACEHOLDER = /^(ganti_|ubah_|isi_|your_|changeme|replace_)?.*(ganti_|ubah_|isi_|your_|changeme|replace_|xxxx|todo)/i;

if (!existsSync(ENV_PATH)) {
    console.error(`\n❌ Tidak menemukan ${ENV_PATH}`);
    console.error('   Jalankan dulu:  cp .env.example .env\n');
    process.exit(1);
}

let text = readFileSync(ENV_PATH, 'utf8');

function sha12(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function currentValue(key) {
    const m = new RegExp(`^${key}=(.*)$`, 'm').exec(text);
    if (!m) return null;
    return m[1].trim().replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '');
}

const missing = KEYS.filter((k) => currentValue(k) === null);
if (missing.length > 0) {
    console.error(`\n❌ Variabel ini tidak ada di .env: ${missing.join(', ')}`);
    console.error('   Tambahkan dulu (lihat .env.example), lalu jalankan ulang.\n');
    process.exit(1);
}

const rows = [];
for (const key of KEYS) {
    const oldValue = currentValue(key);
    const weak = oldValue.length < 32 || PLACEHOLDER.test(oldValue);
    let newValue = oldValue;

    if (!CHECK_ONLY) {
        // 48 byte acak → 64 karakter base64url
        newValue = randomBytes(48).toString('base64url');
        text = text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${newValue}`);
    }

    rows.push({
        variabel: key,
        sebelum: `${oldValue.length} kar.${weak ? ' (LEMAH)' : ''}`,
        sesudah: CHECK_ONLY ? '-' : `${newValue.length} kar.`,
        'sha256[0:12]': sha12(CHECK_ONLY ? oldValue : newValue)
    });
}

if (!CHECK_ONLY) {
    writeFileSync(ENV_PATH, text, 'utf8');
}

console.log(`\n${CHECK_ONLY ? '🔎 STATUS' : '✅ SELESAI'} — ${ENV_PATH}\n`);
console.table(rows);

if (CHECK_ONLY) {
    console.log('(--check: file TIDAK diubah)\n');
} else {
    console.log('Langkah lanjutan:');
    console.log('  1. node scripts/check-env.mjs         → pastikan preflight lulus');
    console.log('  2. docker compose up -d --force-recreate backend frontend');
    console.log('  3. Semua user login ulang (sesi lama tidak valid — ini normal).');
    console.log('  4. Untuk server: jalankan script ini ATAU salin file .env, lalu');
    console.log('     bandingkan kolom sha256[0:12] di kedua sisi agar identik.\n');
}
