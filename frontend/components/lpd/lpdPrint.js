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
        
        // Format tanggal ke "06 Mei 2026"
        const formatTanggalIndonesia = (date) => {
            if (!date) return '-';
            
            let tahun, bulan, hari;
            const dateStr = String(date);
            
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            else if (date instanceof Date && !isNaN(date)) {
                hari = date.getDate();
                bulan = date.getMonth();
                tahun = date.getFullYear();
                return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
            }
            else {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    hari = parsedDate.getDate();
                    bulan = parsedDate.getMonth();
                    tahun = parsedDate.getFullYear();
                    return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            
            return dateStr;
        };
        
        // Format tanggal untuk rincian kegiatan
        const formatTanggalRincian = (date) => {
            if (!date) return '-';
            
            let tahun, bulan, hari;
            const dateStr = String(date);
            
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    tahun = parseInt(parts[0]);
                    bulan = parseInt(parts[1]) - 1;
                    hari = parseInt(parts[2]);
                    return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            else if (date instanceof Date && !isNaN(date)) {
                hari = date.getDate();
                bulan = date.getMonth();
                tahun = date.getFullYear();
                return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
            }
            else {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    hari = parsedDate.getDate();
                    bulan = parsedDate.getMonth();
                    tahun = parsedDate.getFullYear();
                    return `${hari.toString().padStart(2, '0')} ${namaBulan[bulan]} ${tahun}`;
                }
            }
            
            return '-';
        };
        
        // Format tanggal untuk header
        const getCurrentDate = () => {
            const now = new Date();
            const hari = now.getDate().toString().padStart(2, '0');
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
        
        // Logo SVG
        const logoSvg = `
            <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#1a56db" stroke="#1e3a8a" stroke-width="3"/>
                <circle cx="50" cy="50" r="35" fill="white"/>
                <path d="M50 25 L58 40 L75 42 L62 54 L65 71 L50 63 L35 71 L38 54 L25 42 L42 40 L50 25Z" fill="#1a56db" stroke="#1e3a8a" stroke-width="2"/>
                <text x="50" y="55" text-anchor="middle" font-size="8" fill="#1a56db" font-weight="bold">BPOM</text>
            </svg>
        `;
        
        // Generate HTML untuk semua pegawai
        const generateAllPegawaiHTML = () => {
            let html = '';
            
            pegawaiList.forEach((pegawai, index) => {
                if (index > 0) {
                    html += '<tr><td colspan="2" style="height: 8px;"></td></tr>';
                }
                
                html += `
                    <tr>
                        <td class="label-cell" style="width: 170px;">Nama</td>
                        <td class="value-cell">: ${pegawai?.nama || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell" style="width: 170px;">NIP</td>
                        <td class="value-cell">: ${pegawai?.nip || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell" style="width: 170px;">Pangkat / Golongan</td>
                        <td class="value-cell">: ${pegawai?.pangkat_golongan || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell" style="width: 170px;">Jabatan</td>
                        <td class="value-cell">: ${pegawai?.jabatan || '-'}</td>
                    </tr>
                `;
            });
            
            return html;
        };
        
        const headerHTML = `
            <table class="header-table">
                <tr>
                    <td rowspan="2" class="logo-cell">
                        ${logoSvg}
                    </td>
                    <td class="title-cell" colspan="2">
                        <strong>LAPORAN PERJALANAN DINAS (LPD)</strong>
                    </td>
                    <td class="label-cell-header">Tanggal :</td>
                    <td class="value-cell-header">${getCurrentDate()}</td>
                </tr>
                <tr>
                    <td class="subtitle-cell" colspan="2">
                        ${kegiatanData?.kegiatan || '-'}
                    </td>
                    <td class="label-cell-header">Halaman :</td>
                    <td class="value-cell-header">
                        <span class="pageNumber"></span> dari <span class="totalPages"></span>
                    </td>
                </tr>
            </table>
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
                        line-height: 1.3;
                        color: #000;
                        background: white;
                        margin: 0;
                        padding: 0;
                    }
                    
                    /* Header untuk print - muncul di setiap halaman */
                    .print-header {
                        display: none;
                    }
                    
                    /* Konten utama */
                    .container {
                        max-width: 100%;
                        margin: 0 auto;
                        padding: 20px 25px;
                    }
                    
                    /* Header Table */
                    .header-table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 1px solid #000;
                        margin-bottom: 20px;
                    }
                    
                    .header-table td {
                        border: 1px solid #000;
                        padding: 6px;
                        vertical-align: top;
                    }
                    
                    .logo-cell {
                        width: 70px;
                        text-align: center;
                        vertical-align: middle;
                    }
                    
                    .title-cell {
                        text-align: center;
                        font-weight: bold;
                        font-size: 13pt;
                    }
                    
                    .subtitle-cell {
                        text-align: center;
                        font-size: 11pt;
                    }
                    
                    .label-cell-header {
                        font-weight: bold;
                        width: 65px;
                        text-align: right;
                    }
                    
                    .value-cell-header {
                        text-align: left;
                        width: 100px;
                    }
                    
                    /* Section */
                    .section {
                        margin-bottom: 15px;
                    }
                    
                    .section-title {
                        font-weight: bold;
                        font-size: 12pt;
                        margin-bottom: 8px;
                        text-decoration: underline;
                    }
                    
                    .section-content {
                        margin-left: 0px;
                    }
                    
                    /* Info Table */
                    .info-table-inline {
                        width: 100%;
                        border: none;
                        margin: 5px 0;
                        border-collapse: collapse;
                    }
                    
                    .info-table-inline td {
                        border: none;
                        padding: 3px 0;
                        vertical-align: top;
                    }
                    
                    .info-table-inline .label-cell {
                        font-weight: bold;
                        text-align: left;
                        white-space: nowrap;
                    }
                    
                    .info-table-inline .value-cell {
                        text-align: left;
                        padding-left: 8px;
                    }
                    
                    /* Tabel Rincian */
                    .table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                    }
                    
                    .table th,
                    .table td {
                        border: 1px solid #000;
                        padding: 5px;
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
                        gap: 15px;
                        margin-top: 10px;
                    }
                    
                    .dokumentasi-item {
                        width: 170px;
                        text-align: center;
                    }
                    
                    .dokumentasi-item img {
                        width: 100%;
                        height: 120px;
                        object-fit: cover;
                        border: 1px solid #ccc;
                    }
                    
                    .dokumentasi-item .keterangan {
                        font-size: 9pt;
                        margin-top: 5px;
                    }
                    
                    .file-placeholder {
                        width: 100%;
                        height: 120px;
                        background: #f0f0f0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid #ccc;
                        font-size: 35px;
                    }
                    
                    /* Tanda Tangan */
                    .signature-wrapper {
                        margin-top: 30px;
                        display: flex;
                        justify-content: space-between;
                    }
                    
                    .signature-box {
                        width: 45%;
                        text-align: center;
                    }
                    
                    .signature-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        font-size: 11pt;
                    }
                    
                    .signature-line {
                        margin-top: 40px;
                        padding-top: 5px;
                        border-top: 1px solid #000;
                    }
                    
                    .signature-name {
                        font-weight: bold;
                        margin-top: 5px;
                    }
                    
                    .signature-nip {
                        font-size: 9pt;
                        margin-top: 3px;
                    }
                    
                    .footer {
                        margin-top: 25px;
                        text-align: center;
                        font-size: 10pt;
                    }
                    
                    .info-row {
                        margin-bottom: 6px;
                    }
                    
                    /* Print styles - header FIXED di setiap halaman */
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        
                        .container {
                            padding: 15px;
                            margin-top: 105px;
                        }
                        
                        /* Header fixed di setiap halaman */
                        .print-header {
                            display: block;
                            position: fixed;
                            top: 10px;
                            left: 15px;
                            right: 15px;
                            background: white;
                            z-index: 1000;
                        }
                        
                        .no-print {
                            display: none;
                        }
                        
                        .dokumentasi-item {
                            break-inside: avoid;
                        }
                        
                        .signature-wrapper {
                            break-inside: avoid;
                        }
                        
                        .table {
                            break-inside: auto;
                        }
                        
                        .table thead {
                            display: table-header-group;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- HEADER FIXED - muncul di setiap halaman -->
                <div class="print-header">
                    ${headerHTML}
                </div>
                
                <!-- KONTEN UTAMA -->
                <div class="container">
                    <!-- A. Dasar Pelaksanaan Kegiatan -->
                    <div class="section">
                        <div class="section-title">A. Dasar Pelaksanaan Kegiatan</div>
                        <div class="section-content">
                            <div class="info-row">
                                Surat Perintah Melaksanakan Tugas Kepala Balai Besar Pengawas Obat dan Makanan Di Palangka Raya
                            </div>
                            <table class="info-table-inline">
                                <tbody>
                                    <tr>
                                        <td class="label-cell" style="width: 65px;">Nomor</td>
                                        <td class="value-cell">: ${kegiatanData?.no_st || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell" style="width: 65px;">Tanggal</td>
                                        <td class="value-cell">: ${formatTanggalIndonesia(kegiatanData?.tgl_st)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- B. Petugas Pelaksana -->
                    <div class="section">
                        <div class="section-title">B. Petugas Pelaksana</div>
                        <div class="section-content">
                            <table class="info-table-inline">
                                <tbody>
                                    ${generateAllPegawaiHTML()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- C. Waktu dan Tempat Pelaksanaan -->
                    <div class="section">
                        <div class="section-title">C. Waktu dan Tempat Pelaksanaan</div>
                        <div class="section-content">
                            <table class="info-table-inline">
                                <tbody>
                                    <tr>
                                        <td class="label-cell" style="width: 130px;">Lama Perjalanan</td>
                                        <td class="value-cell">: ${hitungLamaPerjalanan()}</td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell" style="width: 130px;">Tanggal</td>
                                        <td class="value-cell">: ${kegiatanData?.tgl_mulai ? formatTanggalIndonesia(kegiatanData.tgl_mulai) : '-'} s/d ${kegiatanData?.tgl_selesai ? formatTanggalIndonesia(kegiatanData.tgl_selesai) : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell" style="width: 130px;">Tempat Pelaksanaan</td>
                                        <td class="value-cell">: ${kegiatanData?.tempat || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- D. Pembiayaan -->
                    <div class="section">
                        <div class="section-title">D. Pembiayaan</div>
                        <div class="section-content">
                            <div class="info-row">
                                DIPA BBPOM di Palangka Raya No.SP DIPA.63.01.2.432872/2026 Tanggal 24 Desember 2025.
                            </div>
                            <table class="info-table-inline">
                                <tbody>
                                    <tr>
                                        <td class="label-cell" style="width: 130px;">Mata Anggaran :</td>
                                        <td class="value-cell">${mak}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- E. Rincian Hasil Kegiatan -->
                    <div class="section">
                        <div class="section-title">E. Rincian Hasil Kegiatan</div>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th style="width: 5%;">No</th>
                                    <th style="width: 20%;">Tanggal</th>
                                    <th style="width: 75%;">Kegiatan</th>
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
                        <div class="section-content">
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
                    </div>
                    
                    <!-- Tanda Tangan -->
                    <div class="signature-wrapper">
                        <div class="signature-box">
                            <div class="signature-title">Mengetahui/Menyetujui,</div>
                            <div class="signature-title">Kepala Bagian Tata Usaha/Ketua Tim Kerja</div>
                            <div class="signature-line"></div>
                            <div class="signature-name">${ttdKatim || '-'}</div>
                            <div class="signature-nip">NIP. -</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-title">Menyetujui,</div>
                            <div class="signature-title">Kepala Balai Besar POM di Palangka Raya</div>
                            <div class="signature-line"></div>
                            <div class="signature-name">${ttdKabalai || '-'}</div>
                            <div class="signature-nip">NIP. -</div>
                        </div>
                    </div>
                    
                    <div class="signature-wrapper" style="margin-top: 15px;">
                        <div class="signature-box">
                            <div class="signature-title">Dibuat Oleh,</div>
                            <div class="signature-title">Petugas Pelaksana</div>
                            <div class="signature-line"></div>
                            <div class="signature-name">${firstPegawai?.nama || '-'}</div>
                            <div class="signature-nip">NIP. ${firstPegawai?.nip || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Laporan ini dibuat dengan sebenar-benarnya dan dapat dipertanggungjawabkan.</p>
                    </div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 20px; position: fixed; bottom: 20px; left: 0; right: 0;">
                    <button onclick="window.print()" style="padding: 8px 16px; margin: 8px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">🖨️ Cetak</button>
                    <button onclick="window.close()" style="padding: 8px 16px; margin: 8px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px;">❌ Tutup</button>
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
};