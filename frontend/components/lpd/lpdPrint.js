// components/lpd/lpdPrint.js
import React from 'react';

const BACKEND_URL = 'http://localhost:5000';

export const printLPD = async (kegiatanId, kegiatanData, session, apiBaseUrl) => {
    try {
        // Fetch data lengkap LPD
        const response = await fetch(`${apiBaseUrl}/lpd/kegiatan/${kegiatanId}`, {
            headers: {
                'Authorization': `Bearer ${session?.accessToken}`
            }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Gagal mengambil data LPD');
        }
        
        const lpdData = result.data;
        
        // Buat iframe untuk printing
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'absolute';
        printFrame.style.width = '0px';
        printFrame.style.height = '0px';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
        
        const printDocument = printFrame.contentWindow.document;
        
        // Nama bulan dalam Bahasa Indonesia
        const namaBulan = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        // Format tanggal ke "28 Mei 2026" (menerima format YYYY/MM/DD atau YYYY-MM-DD)
        const formatTanggalIndonesia = (date) => {
            if (!date) return '-';
            
            let tahun, bulan, hari;
            
            // Konversi ke string jika perlu
            const dateStr = String(date);
            
            // Format YYYY/MM/DD
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            // Format YYYY-MM-DD
            else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            // Jika sudah dalam bentuk Date object
            else if (date instanceof Date && !isNaN(date)) {
                hari = date.getDate();
                bulan = date.getMonth();
                tahun = date.getFullYear();
                return `${hari} ${namaBulan[bulan]} ${tahun}`;
            }
            // Coba parse dengan new Date
            else {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    hari = parsedDate.getDate();
                    bulan = parsedDate.getMonth();
                    tahun = parsedDate.getFullYear();
                    return `${hari} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            
            return dateStr;
        };
        
        // Format tanggal untuk rincian kegiatan (format: 28 Mei 2026) - SAMA dengan formatTanggalIndonesia
        const formatTanggalRincian = (date) => {
            if (!date) return '-';
            
            let tahun, bulan, hari;
            
            const dateStr = String(date);
            
            // Format YYYY/MM/DD
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            // Format YYYY-MM-DD
            else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            // Jika sudah dalam bentuk Date object
            else if (date instanceof Date && !isNaN(date)) {
                hari = date.getDate();
                bulan = date.getMonth();
                tahun = date.getFullYear();
                return `${hari} ${namaBulan[bulan]} ${tahun}`;
            }
            // Coba parse dengan new Date
            else {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    hari = parsedDate.getDate();
                    bulan = parsedDate.getMonth();
                    tahun = parsedDate.getFullYear();
                    return `${hari} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            
            return '-';
        };
        
        // Format tanggal untuk header
        const getCurrentDate = () => {
            const now = new Date();
            const hari = now.getDate();
            const bulan = namaBulan[now.getMonth()];
            const tahun = now.getFullYear();
            return `${hari} ${bulan} ${tahun}`;
        };
        
        // Hitung lama perjalanan
        const hitungLamaPerjalanan = () => {
            if (!kegiatanData?.tgl_mulai || !kegiatanData?.tgl_selesai) return '-';
            
            const parseTanggal = (date) => {
                const dateStr = String(date);
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
                if (dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
                return new Date(date);
            };
            
            const start = parseTanggal(kegiatanData.tgl_mulai);
            const end = parseTanggal(kegiatanData.tgl_selesai);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
            
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return `${diffDays} (${diffDays} hari)`;
        };
        
        // Dapatkan data pegawai
        const pegawaiList = lpdData?.petugas_pelaksana || [];
        const firstPegawai = pegawaiList[0] || {};
        
        // Dapatkan MAK dari kegiatan
        const mak = kegiatanData?.mak || '-';
        
        // Dapatkan rincian kegiatan
        const rincianKegiatan = lpdData?.rincian_kegiatan || [];
        
        // Dapatkan dokumentasi
        const dokumentasi = lpdData?.dokumentasi || [];
        
        // Tanda tangan
        const ttdKatim = lpdData?.ttd_katim || '';
        const ttdKabalai = lpdData?.ttd_kabalai || '';
        
        // Logo (data URL placeholder - Anda bisa mengganti dengan base64 logo asli)
        const logoSvg = `
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#1a56db" stroke="#1e3a8a" stroke-width="3"/>
                <circle cx="50" cy="50" r="35" fill="white"/>
                <path d="M50 25 L58 40 L75 42 L62 54 L65 71 L50 63 L35 71 L38 54 L25 42 L42 40 L50 25Z" fill="#1a56db" stroke="#1e3a8a" stroke-width="2"/>
                <text x="50" y="55" text-anchor="middle" font-size="8" fill="#1a56db" font-weight="bold">BPOM</text>
            </svg>
        `;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Laporan Perjalanan Dinas - ${kegiatanData?.kegiatan || 'LPD'}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.5;
                        color: #000;
                        background: white;
                        padding: 20px 30px;
                    }
                    
                    .container {
                        max-width: 100%;
                        margin: 0 auto;
                    }
                    
                    /* Header Table */
                    .header-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        border: 1px solid #000;
                    }
                    
                    .header-table td {
                        border: 1px solid #000;
                        padding: 8px;
                        vertical-align: top;
                    }
                    
                    .logo-cell {
                        width: 100px;
                        text-align: center;
                        vertical-align: middle;
                    }
                    
                    .header-table .title-cell {
                        text-align: center;
                        font-weight: bold;
                        font-size: 14pt;
                    }
                    
                    .header-table .subtitle-cell {
                        text-align: center;
                        font-size: 11pt;
                    }
                    
                    .header-table .label-cell {
                        font-weight: bold;
                        width: 100px;
                        text-align: right;
                        vertical-align: top;
                    }
                    
                    .header-table .value-cell {
                        text-align: left;
                        vertical-align: top;
                    }
                    
                    /* Section */
                    .section {
                        margin-bottom: 20px;
                    }
                    
                    .section-title {
                        font-weight: bold;
                        font-size: 12pt;
                        margin-bottom: 10px;
                        text-decoration: underline;
                    }
                    
                    .section-content {
                        margin-left: 20px;
                    }
                    
                    /* Info Table untuk data dengan label */
                    .info-table-inline {
                        width: auto;
                        border: none;
                        margin: 5px 0;
                    }
                    
                    .info-table-inline td {
                        border: none;
                        padding: 2px 5px;
                        vertical-align: top;
                    }
                    
                    .info-table-inline .label-cell {
                        font-weight: bold;
                        text-align: left;
                        white-space: nowrap;
                    }
                    
                    .info-table-inline .value-cell {
                        text-align: left;
                    }
                    
                    /* Tabel */
                    .table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    
                    .table th,
                    .table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                        vertical-align: top;
                    }
                    
                    .table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        text-align: center;
                    }
                    
                    /* Dokumentasi */
                    .dokumentasi-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                        margin-top: 15px;
                    }
                    
                    .dokumentasi-item {
                        width: 200px;
                        text-align: center;
                    }
                    
                    .dokumentasi-item img {
                        width: 100%;
                        height: 150px;
                        object-fit: cover;
                        border: 1px solid #ddd;
                        margin-bottom: 5px;
                    }
                    
                    .dokumentasi-item .keterangan {
                        font-size: 10pt;
                        font-style: italic;
                    }
                    
                    .file-placeholder {
                        width: 100%;
                        height: 150px;
                        background: #f0f0f0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid #ddd;
                        font-size: 48px;
                    }
                    
                    /* Tanda Tangan */
                    .ttd-section {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                    }
                    
                    .ttd-box {
                        width: 45%;
                        text-align: center;
                    }
                    
                    .ttd-title {
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    
                    .ttd-line {
                        margin-top: 60px;
                        padding-top: 5px;
                        border-top: 1px solid #000;
                    }
                    
                    .ttd-name {
                        font-weight: bold;
                        margin-top: 5px;
                    }
                    
                    .ttd-date {
                        font-size: 10pt;
                        margin-top: 5px;
                    }
                    
                    /* Footer */
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 10pt;
                    }
                    
                    @media print {
                        body {
                            padding: 10px;
                        }
                        .no-print {
                            display: none;
                        }
                        .dokumentasi-item {
                            break-inside: avoid;
                        }
                        .table {
                            break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <!-- Header Table dengan Logo -->
                    <table class="header-table">
                        <tr>
                            <td rowspan="2" class="logo-cell" style="vertical-align: middle; text-align: center;">
                                ${logoSvg}
                            </td>
                            <td class="title-cell" colspan="2">
                                <strong>LAPORAN PERJALANAN DINAS (LPD)</strong>
                            </td>
                            <td class="label-cell">Tanggal :</td>
                            <td class="value-cell">${getCurrentDate()}</td>
                        </tr>
                        <tr>
                            <td class="subtitle-cell" colspan="2">
                                ${kegiatanData?.kegiatan || '-'}
                            </td>
                            <td class="label-cell">Halaman :</td>
                            <td class="value-cell">1 dari 1</td>
                        </tr>
                    </table>
                    
                    <!-- A. Dasar Pelaksanaan Kegiatan -->
                    <div class="section">
                        <div class="section-title">A. Dasar Pelaksanaan Kegiatan</div>
                        <div class="section-content">
                            <div class="info-row" style="margin-bottom: 10px;">
                                Surat Perintah Melaksanakan Tugas Kepala Balai Besar Pengawas Obat dan Makanan Di Palangka Raya
                            </div>
                            <table class="info-table-inline">
                                <tr>
                                    <td class="label-cell">Nomor</td>
                                    <td class="value-cell"> : ${kegiatanData?.no_st || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell">Tanggal</td>
                                    <td class="value-cell"> : ${formatTanggalIndonesia(kegiatanData?.tgl_st)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <!-- B. Petugas Pelaksana -->
                    <div class="section">
                        <div class="section-title">B. Petugas Pelaksana</div>
                        <div class="section-content">
                            <table class="info-table-inline">
                                <tr>
                                    <td class="label-cell">Nama</td>
                                    <td class="value-cell"> : ${firstPegawai?.nama || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell">NIP</td>
                                    <td class="value-cell"> : ${firstPegawai?.nip || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell">Pangkat / Golongan</td>
                                    <td class="value-cell"> : ${firstPegawai?.pangkat_golongan || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell">Jabatan</td>
                                    <td class="value-cell"> : ${firstPegawai?.jabatan || '-'}</td>
                                </tr>
                                ${pegawaiList.length > 1 ? `
                                <tr>
                                    <td class="label-cell">Pegawai Lainnya</td>
                                    <td class="value-cell"> : ${pegawaiList.slice(1).map(p => p.nama).join(', ')}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>
                    
                    <!-- C. Waktu dan Tempat Pelaksanaan -->
                    <div class="section">
                        <div class="section-title">C. Waktu dan Tempat Pelaksanaan</div>
                        <div class="section-content">
                            <table class="info-table-inline">
                                <tr>
                                    <td class="label-cell">Lama Perjalanan</td>
                                    <td class="value-cell"> : ${hitungLamaPerjalanan()}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell">Tanggal</td>
                                    <td class="value-cell"> : ${kegiatanData?.tgl_mulai ? formatTanggalIndonesia(kegiatanData.tgl_mulai) : '-'} s/d ${kegiatanData?.tgl_selesai ? formatTanggalIndonesia(kegiatanData.tgl_selesai) : '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell">Tempat Pelaksanaan</td>
                                    <td class="value-cell"> : ${kegiatanData?.tempat || '-'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <!-- D. Pembiayaan -->
                    <div class="section">
                        <div class="section-title">D. Pembiayaan</div>
                        <div class="section-content">
                            <div class="info-row" style="margin-bottom: 5px;">
                                DIPA BBPOM di Palangka Raya No.SP DIPA.63.01.2.432872/2026 Tanggal 24 Desember 2025.
                            </div>
                            <table class="info-table-inline">
                                <tr>
                                    <td class="label-cell">Mata Anggaran :</td>
                                    <td class="value-cell">${mak}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <!-- E. Rincian Hasil Kegiatan -->
                    <div class="section">
                        <div class="section-title">E. Rincian Hasil Kegiatan</div>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th style="width: 5%; text-align: center;">No</th>
                                    <th style="width: 20%; text-align: center;">Tanggal</th>
                                    <th style="width: 75%; text-align: center;">Kegiatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rincianKegiatan.length > 0 ? rincianKegiatan.map((item, index) => `
                                <tr>
                                    <td style="text-align: center;">${index + 1}</td>
                                    <td style="text-align: center;">${formatTanggalRincian(item.tanggal)}</td>
                                    <td>${item.kegiatan || '-'}</td>
                                </tr>
                                `).join('') : `
                                <tr>
                                    <td colspan="3" style="text-align: center;">- Tidak ada rincian kegiatan -</td>
                                </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- F. Dokumentasi Kegiatan -->
                    <div class="section">
                        <div class="section-title">F. Dokumentasi Kegiatan</div>
                        ${dokumentasi.length > 0 ? `
                            <div class="dokumentasi-grid">
                                ${dokumentasi.map(doc => {
                                    const filename = doc.file_path?.split('/').pop();
                                    const imageUrl = `${BACKEND_URL}/uploads/lpd-dokumentasi/${filename}`;
                                    const isImage = doc.file_type?.startsWith('image/');
                                    
                                    if (isImage) {
                                        return `
                                            <div class="dokumentasi-item">
                                                <img src="${imageUrl}" alt="${doc.keterangan || 'Dokumentasi'}" />
                                                <div class="keterangan">${doc.keterangan || ''}</div>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div class="dokumentasi-item">
                                                <div class="file-placeholder">
                                                    📄
                                                </div>
                                                <div class="keterangan">${doc.file_name || 'File'}</div>
                                                <div class="keterangan">${doc.keterangan || ''}</div>
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        ` : '<p>- Tidak ada dokumentasi -</p>'}
                    </div>
                    
                    <!-- Tanda Tangan -->
                    <div class="ttd-section">
                        <div class="ttd-box">
                            <div class="ttd-title">Mengetahui/Menyetujui,</div>
                            <div class="ttd-title">Kepala Bagian Tata Usaha/Ketua Tim Kerja</div>
                            <div class="ttd-line"></div>
                            <div class="ttd-name">${ttdKatim || '-'}</div>
                            <div class="ttd-date">NIP. -</div>
                        </div>
                        <div class="ttd-box">
                            <div class="ttd-title">Menyetujui,</div>
                            <div class="ttd-title">Kepala Balai Besar POM di Palangka Raya</div>
                            <div class="ttd-line"></div>
                            <div class="ttd-name">${ttdKabalai || '-'}</div>
                            <div class="ttd-date">NIP. -</div>
                        </div>
                    </div>
                    
                    <div class="ttd-section" style="margin-top: 20px;">
                        <div class="ttd-box">
                            <div class="ttd-title">Dibuat Oleh,</div>
                            <div class="ttd-title">Petugas Pelaksana</div>
                            <div class="ttd-line"></div>
                            <div class="ttd-name">${firstPegawai?.nama || '-'}</div>
                            <div class="ttd-date">NIP. ${firstPegawai?.nip || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Laporan ini dibuat dengan sebenar-benarnya dan dapat dipertanggungjawabkan.</p>
                    </div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 20px; position: fixed; bottom: 20px; left: 0; right: 0;">
                    <button onclick="window.print()" style="padding: 10px 20px; margin: 10px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">🖨️ Cetak</button>
                    <button onclick="window.close()" style="padding: 10px 20px; margin: 10px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 5px;">❌ Tutup</button>
                </div>
            </body>
            </html>
        `;
        
        printDocument.write(html);
        printDocument.close();
        
        // Auto print setelah load
        printFrame.onload = () => {
            setTimeout(() => {
                printFrame.contentWindow.print();
            }, 500);
        };
        
    } catch (error) {
        console.error('Error printing LPD:', error);
        throw error;
    }
};

export const generateLPDHtml = (lpdData, kegiatanData, session) => {
    // Fungsi ini bisa digunakan untuk generate HTML tanpa auto print
    // Sama seperti di atas tapi tanpa tombol print otomatis
};