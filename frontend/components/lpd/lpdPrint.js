    // components/lpd/lpdPrint.js
    import React from 'react';

    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    export const printLPD = async (kegiatanId, kegiatanData, session, apiBaseUrl, tempatOverride) => {
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

            // ============ Buka lokasi terenkripsi (cek data TERBARU dari server) ============
            // Mengecek dari respons server agar tidak memakai flag lama di state frontend:
            // jika user lain sudah mendekripsi, admin tidak perlu kode lagi.
            let lokasiTerbuka = tempatOverride || '';

            if (!lokasiTerbuka && lpdData?.waktu_tempat?.tempat_pelaksanaan_terenkripsi) {
                const kode = window.prompt('Lokasi kegiatan ini terenkripsi. Masukkan kode enkripsi lokasi:');
                if (!kode || !kode.trim()) return;

                const authHeader = 'Bea' + 'rer ' + (session?.accessToken || '');
                const decryptResponse = await fetch(`${apiBaseUrl}/lpd/lokasi/decrypt`, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ kegiatan_id: kegiatanId, kode: kode.trim() })
                });

                const decryptResult = await decryptResponse.json().catch(() => ({}));
                if (!decryptResponse.ok || !decryptResult.success) {
                    throw new Error(decryptResult.message || 'Kode enkripsi salah');
                }

                lokasiTerbuka = decryptResult.data?.tempat_pelaksanaan || '';
            }

            // ============ DEBUG: Cek semua kemungkinan lokasi path ============
            console.log('========== DEBUG TANDA TANGAN LPD ==========');
            console.log('1. lpdData lengkap:', JSON.stringify(lpdData, null, 2));
            
            // Cek semua kemungkinan lokasi path tanda tangan
            const possiblePaths = [
                lpdData?.ttd_kabalai_path,
                lpdData?.ttd_kabalai,
                lpdData?.ttd_kepala_balai_path,
                lpdData?.ttd_kepala_balai,
                lpdData?.kabalai_ttd_path,
                lpdData?.kabalai_ttd,
                lpdData?.signature_kabalai_path,
                lpdData?.signature_kabalai,
                kegiatanData?.ttd_kabalai_path,
                kegiatanData?.ttd_kepala_balai_path,
                kegiatanData?.kabalai_ttd_path,
            ];
            
            console.log('2. Mencari path dari berbagai kemungkinan:');
            let foundPath = null;
            possiblePaths.forEach((path, idx) => {
                if (path) {
                    console.log(`   - Kemungkinan ${idx + 1}: ${path}`);
                    if (!foundPath) foundPath = path;
                }
            });
            
            // Cek juga apakah ada di dalam object lain
            if (lpdData?.ttd) {
                console.log('3. lpdData.ttd:', lpdData.ttd);
                if (lpdData.ttd.kabalai) foundPath = foundPath || lpdData.ttd.kabalai;
                if (lpdData.ttd.kepala_balai) foundPath = foundPath || lpdData.ttd.kepala_balai;
            }
            
            // Cek semua key yang mengandung kata "ttd" atau "kabalai"
            const allKeys = Object.keys(lpdData || {});
            const ttdKeys = allKeys.filter(key => key.toLowerCase().includes('ttd') || key.toLowerCase().includes('kabalai') || key.toLowerCase().includes('kepala'));
            console.log('4. Key yang mengandung ttd/kabalai/kepala:', ttdKeys);
            ttdKeys.forEach(key => {
                console.log(`   - ${key}: ${lpdData[key]}`);
                if (lpdData[key] && !foundPath && typeof lpdData[key] === 'string' && (lpdData[key].includes('.png') || lpdData[key].includes('.jpg') || lpdData[key].includes('.jpeg'))) {
                    foundPath = lpdData[key];
                }
            });
            
            console.log('5. Path yang ditemukan:', foundPath);
            console.log('==============================================');
            // ======================================================
            
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
            
            // Parse berbagai format tanggal (Date, ISO datetime, YYYY-MM-DD, DD-MM-YYYY)
            // menjadi Date lokal. ISO datetime dari API (mis. "2026-09-21T17:00:00.000Z")
            // harus dikonversi ke waktu lokal agar tidak bergeser satu hari.
            const parseTanggalLokal = (value) => {
                if (!value) return null;
                if (value instanceof Date) {
                    return isNaN(value.getTime()) ? null : value;
                }

                const dateStr = String(value).trim();
                if (!dateStr) return null;

                // DD-MM-YYYY atau DD/MM/YYYY
                let match = dateStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
                if (match) {
                    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                }

                // YYYY-MM-DD tanpa jam: pakai tanggal apa adanya (hindari pergeseran UTC)
                match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (match) {
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                }

                // ISO datetime / format lain yang bisa di-parse
                const parsed = new Date(dateStr);
                return isNaN(parsed.getTime()) ? null : parsed;
            };

            // Format tanggal ke "06 Mei 2026"
            const formatTanggalIndonesia = (date) => {
                const parsed = parseTanggalLokal(date);
                if (!parsed) return date ? String(date) : '-';
                const hari = parsed.getDate().toString().padStart(2, '0');
                const bulan = namaBulan[parsed.getMonth()];
                const tahun = parsed.getFullYear();
                return `${hari} ${bulan} ${tahun}`;
            };
            
            // Format tanggal untuk rincian kegiatan menjadi DD-MM-YYYY
            const formatTanggalRincian = (date) => {
                const parsed = parseTanggalLokal(date);
                if (!parsed) return '-';
                const hari = parsed.getDate().toString().padStart(2, '0');
                const bulan = (parsed.getMonth() + 1).toString().padStart(2, '0');
                const tahun = parsed.getFullYear();
                return `${hari}-${bulan}-${tahun}`;
            };
            
            // Format tanggal untuk header menggunakan created_at dari kegiatanData
            const getHeaderDate = () => {
                if (kegiatanData?.created_at) {
                    return formatTanggalIndonesia(kegiatanData.created_at);
                }
                const now = new Date();
                const hari = now.getDate().toString().padStart(2, '0');
                const bulan = namaBulan[now.getMonth()];
                const tahun = now.getFullYear();
                return `${hari} ${bulan} ${tahun}`;
            };
            
            // Hitung lama perjalanan
            const hitungLamaPerjalanan = () => {
                const start = parseTanggalLokal(kegiatanData?.tgl_mulai);
                const end = parseTanggalLokal(kegiatanData?.tgl_selesai);
                
                if (!start || !end) return '-';
                
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
            
            // ============ TANDA TANGAN KEPALA BALAI ============
            // Cari path dari berbagai kemungkinan
            let ttdKabalaiPath = foundPath || '';
            let ttdKabalaiNama = lpdData?.ttd_kabalai || kegiatanData?.kabalai_nama || '-';
            let ttdKabalaiNip = kegiatanData?.kabalai_nip || '-';
            
            console.log('6. ttdKabalaiPath final:', ttdKabalaiPath);
            console.log('7. ttdKabalaiNama:', ttdKabalaiNama);
            
            // Fungsi untuk mendapatkan URL gambar tanda tangan
            const getTtdImageUrl = (path) => {
                if (!path) return null;
                if (path.startsWith('http')) return path;
                if (path.startsWith('/uploads')) {
                    return `${BACKEND_URL}${path}`;
                }
                return `${BACKEND_URL}/uploads/ttd/${path}`;
            };
            
            const ttdKabalaiUrl = getTtdImageUrl(ttdKabalaiPath);
            const hasTtdKabalai = ttdKabalaiUrl && ttdKabalaiPath !== '';
            
            console.log('8. ttdKabalaiUrl:', ttdKabalaiUrl);
            console.log('9. hasTtdKabalai:', hasTtdKabalai);
            console.log('==============================================');
            // ======================================================
            
            // Logo dari folder frontend public/images
            const logoSrc = '/images/badan_pom.png';
            
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
            
            // Fungsi untuk membuat header table
            const createHeaderTable = (pageNum, totalPages) => `
                <table class="header-table">
                    <tr>
                        <td rowspan="2" class="logo-cell">
                            <img src="${logoSrc}" alt="Logo BBPOM" style="width: 120px; height: 120px; object-fit: contain;" />
                        </td>
                        <td class="title-cell" colspan="2">
                            <strong>LAPORAN PERJALANAN DINAS (LPD)</strong>
                        </td>
                        <td class="label-cell-header" style="width: 100px; text-align: center;">Tanggal : <br> ${getHeaderDate()}</td>
                    </tr>
                    <tr>
                        <td class="subtitle-cell" colspan="2">
                            ${kegiatanData?.kegiatan || '-'}
                        </td>
                        <td class="label-cell-header" style="width: 180px; text-align: center;">Halaman : ${pageNum} dari ${totalPages}</td>
                    </tr>
                </table>
            `;
            
            // Fungsi untuk membuat konten halaman 1
            const createPage1Content = () => `
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
                                    <td class="value-cell">: ${formatTanggalIndonesia(lpdData?.dasar_pelaksanaan?.tanggal_st || kegiatanData?.tgl_st)}</td>
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
                                    <td class="value-cell">: ${kegiatanData?.tgl_mulai || lpdData?.waktu_tempat?.tanggal_mulai ? formatTanggalIndonesia(lpdData?.waktu_tempat?.tanggal_mulai || kegiatanData?.tgl_mulai) : '-'} s/d ${kegiatanData?.tgl_selesai || lpdData?.waktu_tempat?.tanggal_selesai ? formatTanggalIndonesia(lpdData?.waktu_tempat?.tanggal_selesai || kegiatanData?.tgl_selesai) : '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell" style="width: 130px;">Tempat Pelaksanaan</td>
                                    <td class="value-cell">: ${lokasiTerbuka || lpdData?.waktu_tempat?.tempat_pelaksanaan || kegiatanData?.tempat || '-'}</td>
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
            `;
            
            // Fungsi untuk membuat konten halaman 2
            const createPage2Content = () => {
                let dokumentasiHtml = '';
                if (dokumentasi.length > 0) {
                    dokumentasiHtml = `
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
                    `;
                } else {
                    dokumentasiHtml = '<p>- Tidak ada dokumentasi -</p>';
                }
                
                return `
                    <!-- F. Dokumentasi Kegiatan -->
                    <div class="section">
                        <div class="section-title">F. Dokumentasi Kegiatan</div>
                        <div class="section-content">
                            ${dokumentasiHtml}
                        </div>
                    </div>
                    <div class="footer">
                        <p>Laporan ini telah diverifikasi Kepala Bagian Tata Usaha/Ketua Tim Kerja</p>
                    </div>
                    
                    <!-- Tanda Tangan -->
                    <div class="signature-wrapper">
                        <div class="signature-box">
                        
                            <div class="signature-title">Kepala Balai Besar POM di Palangka Raya</div>
                            ${hasTtdKabalai ? `
                                <div class="signature-ttd-image" style="margin: 10px 0;">
                                    <img src="${ttdKabalaiUrl}" alt="Tanda Tangan" style="max-height: 80px; max-width: 200px; object-fit: contain;" />
                                </div>
                            ` : '<div style="color: #999; margin: 10px 0;">(Tanda tangan belum tersedia)</div>'}
                        
                            <div class="signature-name">${ttdKabalaiNama}</div>
                        
                        </div>
                    </div>
                    
                
                `;
            };
            
            const totalPages = 2;
            
            let pagesHtml = '';
            
            pagesHtml += `
                <div class="page">
                    ${createHeaderTable(1, totalPages)}
                    ${createPage1Content()}
                </div>
            `;
            
            pagesHtml += `<div class="page-break"></div>`;
            
            pagesHtml += `
                <div class="page">
                    ${createHeaderTable(2, totalPages)}
                    ${createPage2Content()}
                </div>
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
                            padding: 20px;
                        }
                        
                        .page-break {
                            page-break-before: always;
                        }
                        
                        .page {
                            margin-bottom: 20px;
                        }
                        
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
                            text-align: center;
                            vertical-align: middle;
                            width: 70px;
                        }
                        
                        .value-cell-header {
                            text-align: center;
                            vertical-align: middle;
                        }
                        
                        .section {
                            margin-bottom: 15px;
                        }
                        
                        .section-title {
                            font-weight: bold;
                            font-size: 12pt;
                            margin-bottom: 8px;
                        }
                        
                        .section-content {
                            margin-left: 0px;
                        }
                        
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
                        
                        .signature-wrapper {
                            margin-top: 30px;
                            display: flex;
                            justify-content: flex-end;
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
                        
                        .signature-ttd-image {
                            margin: 10px 0;
                        }
                        
                        .footer {
                            margin-top: 25px;
                            text-align: center;
                            font-size: 10pt;
                        }
                        
                        .info-row {
                            margin-bottom: 6px;
                        }
                        
                        @media print {
                            body {
                                margin: 0;
                                padding: 0;
                            }
                            
                            .page-break {
                                page-break-before: always;
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
                    ${pagesHtml}
                    
                    <div class="no-print" style="text-align: center; margin-top: 20px; position: fixed; bottom: 20px; left: 0; right: 0;">
                        <button onclick="window.print()" style="padding: 8px 16px; margin: 8px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">🖨️ Cetak</button>
                        <button onclick="window.close()" style="padding: 8px 16px; margin: 8px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px;">❌ Tutup</button>
                    </div>
                </body>
                </html>
            `;
            
            printDocument.write(html);
            printDocument.close();
            
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