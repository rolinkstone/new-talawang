#!/usr/bin/env node
// ============================================================
// scripts/build-images.mjs — BUILD IMAGE TANPA `docker compose build`
//
//   node scripts/build-images.mjs            # build backend + frontend saja
//   node scripts/build-images.mjs --up       # build lalu `compose up -d --no-build`
//   node scripts/build-images.mjs --dry-run  # hanya cetak perintah yang akan jalan
//
// Kenapa ada script ini:
//   Compose versi baru memakai buildx untuk `build` dan menolak bila plugin
//   buildx di server lebih lama dari 0.17.0:
//       compose build requires buildx 0.17.0 or later
//   Script ini memakai `docker build` biasa (tidak lewat buildx-compose),
//   mengirim build-arg NEXT_PUBLIC_* dari `.env` (nilai ini di-bake saat build),
//   lalu memberi tag image persis seperti yang diharapkan compose.
// ============================================================

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, '.env');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const autoUp = args.includes('--up');

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, '').trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function run(cmd, cmdArgs, { capture = false } = {}) {
  const printable = [cmd, ...cmdArgs].join(' ');
  if (dryRun) {
    console.log(`   $ ${printable}`);
    return capture ? '' : true;
  }
  const result = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) {
    if (capture) return '';
    console.error(`❌ Gagal menjalankan: ${printable}\n   ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    if (capture) return '';
    console.error(`❌ Perintah gagal (exit ${result.status}): ${printable}`);
    return false;
  }
  return capture ? (result.stdout || '') : true;
}

// Compose bisa dipanggil sebagai plugin (`docker compose`) atau binary lama
// (`docker-compose`). Dipakai untuk menanyakan nama image yang diharapkan.
function detectCompose() {
  const attempts = [
    ['docker', ['compose', 'version']],
    ['docker-compose', ['version']],
  ];
  for (const [cmd, cmdArgs] of attempts) {
    if (run(cmd, cmdArgs, { capture: true })) {
      return cmd === 'docker' ? ['docker', ['compose']] : ['docker-compose', []];
    }
  }
  return null;
}

function defaultImageNames() {
  const project = basename(ROOT)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '');
  return { backend: `${project}-backend`, frontend: `${project}-frontend` };
}

function resolveImageNames(compose) {
  const names = defaultImageNames();
  if (!compose) return names;

  const [cmd, prefix] = compose;
  const output = run(cmd, [...prefix, 'config', '--images'], { capture: true });
  const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const backend = lines.find((l) => l.endsWith('-backend'));
  const frontend = lines.find((l) => l.endsWith('-frontend'));
  return {
    backend: backend || names.backend,
    frontend: frontend || names.frontend,
  };
}

if (!existsSync(ENV_PATH)) {
  console.error(`\n❌ File .env tidak ditemukan di ${ROOT}`);
  console.error('   Jalankan:  cp .env.example .env    lalu isi nilainya.\n');
  process.exit(1);
}

const env = parseEnvFile(readFileSync(ENV_PATH, 'utf8'));
const buildArgs = {
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL || '',
  NEXT_PUBLIC_KEYCLOAK_ISSUER: env.NEXT_PUBLIC_KEYCLOAK_ISSUER || '',
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || '',
};

const missing = Object.entries(buildArgs).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error(`\n❌ Nilai berikut kosong di .env padahal di-bake saat build: ${missing.join(', ')}`);
  console.error('   Jalankan dulu:  node scripts/check-env.mjs\n');
  process.exit(1);
}

const compose = detectCompose();
const images = resolveImageNames(compose);

console.log('\n── Build image (tanpa `compose build`) ─────────');
console.log(`   Folder     : ${ROOT}`);
console.log(`   Backend    : ${images.backend}`);
console.log(`   Frontend   : ${images.frontend}`);
console.log(`   NEXT_PUBLIC_API_URL = ${buildArgs.NEXT_PUBLIC_API_URL}`);

console.log('\n1/2 Backend...');
if (!run('docker', ['build', '-t', images.backend, './backend'])) process.exit(1);

console.log('\n2/2 Frontend... (NEXT_PUBLIC_* di-bake di langkah ini)');
if (!run('docker', [
  'build',
  '-t', images.frontend,
  '--build-arg', `NEXT_PUBLIC_API_URL=${buildArgs.NEXT_PUBLIC_API_URL}`,
  '--build-arg', `NEXT_PUBLIC_KEYCLOAK_ISSUER=${buildArgs.NEXT_PUBLIC_KEYCLOAK_ISSUER}`,
  '--build-arg', `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${buildArgs.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}`,
  './frontend',
])) process.exit(1);

console.log('\n✅ Image selesai dibangun.');

if (autoUp) {
  console.log('\nMenjalankan container tanpa build ulang...');
  if (compose) {
    const [cmd, prefix] = compose;
    if (!run(cmd, [...prefix, 'up', '-d', '--no-build'])) process.exit(1);
    console.log('\n✅ Container berjalan. Cek:  docker compose ps\n');
  } else {
    console.log('\n⚠️  Compose tidak terdeteksi. Jalankan manual:  docker compose up -d --no-build\n');
  }
} else {
  console.log('   Jalankan container:  docker compose up -d --no-build\n');
}
