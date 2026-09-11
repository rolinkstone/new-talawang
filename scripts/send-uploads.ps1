<#
.SYNOPSIS
    Kirim folder uploads dari laptop ke server agar ikut ter-build ke image Docker.

.DESCRIPTION
    Folder backend/public/uploads sengaja TIDAK di-commit ke Git karena:
      - ukurannya bisa besar (repository membengkak permanen), dan
      - isinya dokumen keuangan sensitif (kwitansi, SPD, SPTJM, TTD).

    Script ini mengirimnya langsung ke server via scp, ke lokasi yang SAMA
    dengan checkout repo hasil `git pull`. Setelah itu `docker compose build`
    akan membawa file-file tersebut ke dalam image (sebagai seed di
    /seed/uploads), dan entrypoint.sh menyalinnya ke volume saat container
    pertama kali start.

    SEBELUM menjalankan script ini, pastikan SSH key sudah terpasang
    (ssh-copy-id) atau Anda siap mengetik password beberapa kali.

    Urutan deploy di server setelah script ini:

        cd <RemoteProjectDir>
        git pull
        docker compose build     # uploads ikut masuk image
        docker compose up -d     # entrypoint menyalin seed ke volume
        docker compose logs backend | Select-String entrypoint

    KEAMANAN DATA: seeding hanya dijalankan bila ./data/backend/uploads masih
    kosong. File yang sudah ada di server TIDAK PERNAH ditimpa atau dihapus.

.PARAMETER Server
    IP atau domain server. Contoh: 10.0.0.5 atau keuangan.contoh.id

.PARAMETER User
    User SSH. Default: root

.PARAMETER RemoteProjectDir
    Path absolut folder project di server (tempat docker-compose.yml berada).
    Default: /opt/talawang

.PARAMETER Port
    Port SSH. Default: 22

.PARAMETER DryRun
    Hanya menampilkan file yang AKAN dikirim, tanpa benar-benar mengirim.

.EXAMPLE
    .\scripts\send-uploads.ps1 -Server 10.0.0.5 -RemoteProjectDir /opt/talawang

.EXAMPLE
    .\scripts\send-uploads.ps1 -Server keuangan.contoh.id -User deploy -Port 2222 -DryRun

.NOTES
    Alternatif bila server Anda punya rsync (macOS/Linux/WSL):
        rsync -avz --info=progress2 backend/public/uploads/ \
              user@server:/opt/talawang/backend/public/uploads/
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Server,

    [string]$User = "root",

    [string]$RemoteProjectDir = "/opt/talawang",

    [string]$Port = "22",

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ---------- 1. Validasi sumber ----------
$repoRoot   = Split-Path -Parent $PSScriptRoot          # ...\keuangan
$sourceDir  = Join-Path $repoRoot "backend\public\uploads"
$sourceBase = Split-Path -Parent $sourceDir             # ...\backend\public

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Folder sumber tidak ditemukan: $sourceDir"
}

$files = @(Get-ChildItem -LiteralPath $sourceDir -Recurse -File -Force |
           Where-Object { $_.Name -ne '.gitkeep' })

if ($files.Count -eq 0) {
    Write-Warning "Tidak ada file di $sourceDir - tidak ada yang perlu dikirim."
    return
}

$sumBytes = ($files | Measure-Object -Property Length -Sum).Sum
$totalMb  = [math]::Round($sumBytes / 1MB, 1)

$target        = "$User@$Server"
$remoteBase    = "$RemoteProjectDir/backend/public"
$remoteDir     = "$remoteBase/uploads"
$sshOptions    = @("-p", $Port)

Write-Host ""
Write-Host "=== Kirim Uploads ke Server ===" -ForegroundColor Cyan
Write-Host "  Sumber   : $sourceDir"
Write-Host "  Jumlah   : $($files.Count) file ($totalMb MB)"
Write-Host "  Tujuan   : ${target}:${remoteDir}/"
Write-Host ""

# Ringkasan per subfolder (membantu memastikan folder yang benar terkirim).
Get-ChildItem -LiteralPath $sourceDir -Directory | ForEach-Object {
    $n = @(Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Force).Count
    Write-Host ("    {0,-22} {1,5} file" -f $_.Name, $n) -ForegroundColor DarkGray
}
Write-Host ""

if ($totalMb -gt 50) {
    Write-Warning ("Total {0} MB. File sebesar ini akan ikut ke setiap layer image Docker." -f $totalMb)
    Write-Warning "Pertimbangkan membersihkan file yang sudah tidak dipakai sebelum build."
    Write-Host ""
}

if ($DryRun) {
    Write-Host "[DryRun] Tidak ada yang dikirim. Hapus -DryRun untuk eksekusi." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Perintah yang akan dijalankan:" -ForegroundColor Yellow
    Write-Host "  ssh $($sshOptions -join ' ') $target `"mkdir -p $remoteDir`""
    Write-Host "  scp -P $Port -r uploads/. ${target}:${remoteDir}/"
    return
}

# ---------- 2. Cek tool yang dibutuhkan ----------
foreach ($tool in @("ssh", "scp")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Perintah '$tool' tidak ditemukan. Aktifkan OpenSSH Client: Settings > Apps > Optional Features > OpenSSH Client."
    }
}

# ---------- 3. Pastikan folder tujuan ada ----------
Write-Host "[1/2] Membuat folder tujuan di server..." -ForegroundColor Cyan
& ssh @sshOptions $target "mkdir -p '$remoteDir'"
if ($LASTEXITCODE -ne 0) {
    throw "Gagal membuat folder di server. Cek koneksi SSH / kredensial untuk $target."
}

# ---------- 4. Kirim file ----------
# Catatan: dijalankan dari folder induk lalu memakai path "uploads/." supaya
# scp menyalin ISI folder. Path lokal dibuat relatif agar tidak ada karakter
# ':' dari drive Windows (D:) yang dikira pemisah host oleh scp.
Write-Host "[2/2] Mengirim file (bisa memakan waktu)..." -ForegroundColor Cyan

Push-Location -LiteralPath $sourceBase
try {
    & scp -P $Port -r "uploads/." "${target}:${remoteDir}/"
    if ($LASTEXITCODE -ne 0) {
        throw "scp gagal (exit code $LASTEXITCODE)."
    }
}
finally {
    Pop-Location
}

# ---------- 5. Verifikasi jumlah file di server ----------
Write-Host ""
Write-Host "Verifikasi di server..." -ForegroundColor Cyan
$remoteCount = (& ssh @sshOptions $target "find '$remoteDir' -type f | wc -l").Trim()

Write-Host ""
Write-Host "SELESAI." -ForegroundColor Green
Write-Host "  File di lokal : $($files.Count)"
Write-Host "  File di server: $remoteCount"
Write-Host ""

if ($remoteCount -ne "$($files.Count)") {
    Write-Warning "Jumlah file tidak sama. Bandingkan manual sebelum build:"
    Write-Warning "  ssh $($sshOptions -join ' ') $target `"ls -la $remoteDir`""
    Write-Host ""
}

Write-Host "Langkah berikutnya di SERVER:" -ForegroundColor Yellow
Write-Host "  cd $RemoteProjectDir"
Write-Host "  docker compose build"
Write-Host "  docker compose up -d"
Write-Host "  docker compose logs backend | grep entrypoint"
Write-Host ""
Write-Host "Log harus memuat salah satu dari:" -ForegroundColor DarkGray
Write-Host "  [entrypoint] Volume uploads kosong -> menyalin N file dari image..." -ForegroundColor DarkGray
Write-Host "  [entrypoint] Volume uploads sudah berisi data -> seed TIDAK disalin" -ForegroundColor DarkGray
Write-Host ""
