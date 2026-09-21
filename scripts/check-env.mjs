#!/usr/bin/env node
// ============================================================
// scripts/check-env.mjs — PREFLIGHT sebelum `docker compose build`
//
//   node scripts/check-env.mjs
//
// Memastikan file `.env` (root, dipakai docker compose) sudah diisi
// nilai ASLI dan BUKAN masih menyalin placeholder dari `.env.example`.
//
// Contoh kesalahan yang ditangkap:
//   KEYCLOAK_ISSUER=https://auth.contoh.id/realms/master
//     → NextAuth error: getaddrinfo ENOTFOUND auth.contoh.id
//   NEXTAUTH_SECRET=ganti_random_kuat_4
//     → session lama gagal didekripsi (JWEDecryptionFailed)
//
// Exit code 1 bila ada masalah → jangan lanjutkan build.
// Script ini TIDAK pernah mencetak nilai rahasia (hanya nama variabel).
// ============================================================

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, '.env');

const REQUIRED = [
  // Database
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  // Keycloak
  'KEYCLOAK_SERVER_URL', 'KEYCLOAK_REALM', 'KEYCLOAK_ADMIN_USERNAME',
  'KEYCLOAK_ADMIN_PASSWORD', 'KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET',
  'KEYCLOAK_ISSUER',
  // Rahasia aplikasi
  'SESSION_SECRET', 'JWT_SECRET', 'SIGNED_URL_SECRET', 'NEXTAUTH_SECRET',
  // URL publik (dipakai browser / baked saat build)
  'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_KEYCLOAK_ISSUER',
  'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID', 'NEXTAUTH_URL', 'FRONTEND_URL',
  'CORS_ORIGIN',
  // Port
  'PORT_BACKEND', 'PORT_FRONTEND',
];

// Variabel yang nilainya TIDAK boleh localhost (dipakai browser / server publik).
const PUBLIC_URLS = [
  'NEXT_PUBLIC_API_URL', 'NEXTAUTH_URL', 'FRONTEND_URL', 'CORS_ORIGIN',
  'KEYCLOAK_ISSUER', 'KEYCLOAK_SERVER_URL', 'NEXT_PUBLIC_KEYCLOAK_ISSUER',
];

// Potongan teks penanda nilai contoh belum diganti.
const PLACEHOLDERS = [
  'contoh.', 'contoh_', 'example.com', 'ganti_', 'your_', 'changeme',
  'replace_', 'isi_', 'ubah_', 'xxxx', 'todo',
];

// Rahasia minimal 32 karakter (biar tidak ada yang pakai "secret123").
const MIN_LEN_SECRET = ['SESSION_SECRET', 'JWT_SECRET', 'SIGNED_URL_SECRET', 'NEXTAUTH_SECRET'];

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // buang komentar di akhir baris (hanya bila tidak dikutip)
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, '').trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const errors = [];
const warnings = [];

if (!existsSync(ENV_PATH)) {
  console.error('\n❌ File .env tidak ditemukan di root proyek.');
  console.error('   Jalankan:  cp .env.example .env    lalu isi nilainya.\n');
  process.exit(1);
}

const env = parseEnv(readFileSync(ENV_PATH, 'utf8'));

for (const key of REQUIRED) {
  if (!(key in env) || env[key] === '') errors.push(`MISSING  ${key} — belum diisi`);
}

// Mode proxy: NEXT_PUBLIC_API_URL berupa path (mis. "/backend") → API dipanggil
// lewat middleware Next.js (frontend/proxy.js), token tidak pernah ke browser.
const proxyMode = String(env.NEXT_PUBLIC_API_URL || '').startsWith('/');

for (const [key, value] of Object.entries(env)) {
  if (!value) continue;
  const lower = value.toLowerCase();

  const hit = PLACEHOLDERS.find((p) => lower.includes(p));
  if (hit) errors.push(`PLACEHOLDER  ${key} — masih berisi nilai contoh ("${hit}")`);

  if (PUBLIC_URLS.includes(key) && /(^|[/:])localhost(:|\/|$)|127\.0\.0\.1/.test(lower)) {
    errors.push(`LOCALHOST  ${key} — di production harus domain asli`);
  }
  if (PUBLIC_URLS.includes(key) && !/^https?:\/\//.test(lower)
    && !(key === 'NEXT_PUBLIC_API_URL' && proxyMode)) {
    warnings.push(`FORMAT  ${key} — sepertinya bukan URL (harus diawali http:// atau https://)`);
  }
  if (MIN_LEN_SECRET.includes(key) && value.length < 32) {
    errors.push(`LEMAH  ${key} — kurang dari 32 karakter (${value.length})`);
  }
}

// Client ID frontend & backend harus konsisten.
if (env.KEYCLOAK_CLIENT_ID && env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
  && env.KEYCLOAK_CLIENT_ID !== env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID) {
  warnings.push(`BEDA  KEYCLOAK_CLIENT_ID="${env.KEYCLOAK_CLIENT_ID}" vs NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="${env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}" — pastikan memang begitu`);
}

// KEYCLOAK_ISSUER biasanya = {KEYCLOAK_SERVER_URL}/realms/{KEYCLOAK_REALM}
if (env.KEYCLOAK_SERVER_URL && env.KEYCLOAK_REALM && env.KEYCLOAK_ISSUER) {
  const expect = `${env.KEYCLOAK_SERVER_URL.replace(/\/+$/, '')}/realms/${env.KEYCLOAK_REALM}`;
  if (env.KEYCLOAK_ISSUER.replace(/\/+$/, '') !== expect) {
    warnings.push(`ISSUER  KEYCLOAK_ISSUER != ${expect} — pastikan realm/URL benar`);
  }
}

// Mode proxy: butuh BACKEND_ORIGIN yang benar (dipanggil dari dalam container).
if (proxyMode) {
  const apiPath = env.NEXT_PUBLIC_API_URL;
  if (!/^\/[A-Za-z0-9._~\-/]*$/.test(apiPath)) {
    errors.push(`FORMAT  NEXT_PUBLIC_API_URL="${apiPath}" — path tidak valid (contoh benar: /backend)`);
  }
  if (!env.BACKEND_ORIGIN) {
    errors.push('MISSING  BACKEND_ORIGIN — wajib diisi kalau NEXT_PUBLIC_API_URL berupa path (mode proxy)');
  } else {
    const bo = env.BACKEND_ORIGIN.toLowerCase();
    if (!/^https?:\/\//.test(bo)) {
      errors.push('FORMAT  BACKEND_ORIGIN — harus diawali http:// atau https:// (tanpa akhiran /api)');
    }
    if (/(^|[/:])localhost(:|\/|$)|127\.0\.0\.1/.test(bo)) {
      errors.push('LOCALHOST  BACKEND_ORIGIN — di production harus host asli (mis. https://api-<domain>)');
    }
    if (/\/api\/?$/.test(bo)) {
      warnings.push('FORMAT  BACKEND_ORIGIN — jangan pakai akhiran /api; proxy menambahkannya sendiri');
    }
  }
}

console.log('\n── Preflight .env ─────────────────────────────');

// Ringkasan nilai NON-rahasia: untuk memastikan file .env yang terbaca
// memang file yang benar (root .env, bukan backend/.env atau frontend/.env).
const SHOW = [
  'NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL', 'BACKEND_ORIGIN', 'KEYCLOAK_ISSUER',
  'KEYCLOAK_SERVER_URL', 'KEYCLOAK_REALM', 'KEYCLOAK_CLIENT_ID',
  'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID', 'FRONTEND_URL',
  'PORT_BACKEND', 'PORT_FRONTEND',
];
console.log('\nNilai yang terbaca dari ' + ENV_PATH + ':');
for (const k of SHOW) console.log(`   ${k.padEnd(30)} = ${env[k] ?? '(tidak di-set)'}`);

if (warnings.length) {
  console.log('\n⚠️  Peringatan (tidak fatal):');
  for (const w of warnings) console.log('   • ' + w);
}

if (errors.length) {
  console.log('\n❌ Ditemukan masalah — JANGAN lanjut `docker compose build`:\n');
  for (const e of errors) console.log('   • ' + e);
  console.log('\nPerbaiki .env lalu jalankan ulang script ini.\n');
  process.exit(1);
}

console.log('\n✅ .env terlihat siap. Lanjutkan:');
console.log('     docker compose --env-file .env config | grep -E "NEXTAUTH_URL|NEXT_PUBLIC_API_URL"');
console.log('     docker compose build && docker compose up -d\n');
