import React, { useState, useEffect } from 'react';
import { formatDateFn } from '../../utils/formatters';

export default function KwitansiPrint({ item, kegiatan, pegawai, onClose }) {
    const [statusTtd, setStatusTtd] = useState(item?.status_ttd || 'belum');
    const [tglTtd, setTglTtd] = useState(item?.tgl_ttd || null);
    const [catatanTtd, setCatatanTtd] = useState(item?.catatan_ttd || '');
    const [currentItem, setCurrentItem] = useState(item);
    
    // State untuk TTD images
    const [ttdPegawaiUrl, setTtdPegawaiUrl] = useState(null);
    const [ttdPpkUrl, setTtdPpkUrl] = useState(null);
    const [ttdBendaharaUrl, setTtdBendaharaUrl] = useState(null);
    const [loadingTtd, setLoadingTtd] = useState(true);

    useEffect(() => {
        console.log('=== KWITANSI PRINT DEBUG ===');
        console.log('Item status_ttd:', item?.status_ttd);
        console.log('Item tgl_ttd:', item?.tgl_ttd);
        console.log('Kegiatan ppk_nama:', kegiatan?.ppk_nama);
        console.log('Kegiatan diketahui_oleh:', kegiatan?.diketahui_oleh);
        console.log('Pegawai:', pegawai?.nama);
        console.log('Item TTD pegawai path:', item?.ttd_pegawai_path);
        console.log('Item TTD ppk path:', item?.ttd_ppk_path);
        console.log('Item TTD bendahara path:', item?.ttd_bendahara_path);
    }, [item, kegiatan, pegawai]);

    useEffect(() => {
        if (item) {
            setCurrentItem(item);
            setStatusTtd(item.status_ttd || 'belum');
            setTglTtd(item.tgl_ttd || null);
            setCatatanTtd(item.catatan_ttd || '');
            loadTtdImages();
        }
    }, [item]);

    // Fungsi untuk memuat gambar TTD
    const loadTtdImages = () => {
        setLoadingTtd(true);
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        
        const getImageUrl = (path) => {
            if (!path) return null;
            let cleanPath = path;
            if (cleanPath.startsWith('/api/')) cleanPath = cleanPath.replace('/api', '');
            if (!cleanPath.startsWith('/uploads')) cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
            return `${baseUrl}${cleanPath}`;
        };
        
        setTtdPegawaiUrl(getImageUrl(item?.ttd_pegawai_path));
        setTtdPpkUrl(getImageUrl(item?.ttd_ppk_path));
        setTtdBendaharaUrl(getImageUrl(item?.ttd_bendahara_path));
        
        setLoadingTtd(false);
    };

    const formatRupiah = (number) => {
        if (number === undefined || number === null) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const terbilang = (angka) => {
        if (!angka) return 'Nol rupiah';
        const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
        const formatRibuan = (num) => {
            if (num < 10) return satuan[num];
            if (num < 20) {
                if (num === 11) return 'sebelas';
                if (num === 10) return 'sepuluh';
                return satuan[num - 10] + ' belas';
            }
            if (num < 100) {
                const puluhan = Math.floor(num / 10);
                const sisa = num % 10;
                const puluhanNama = ['', 'sepuluh', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
                return puluhanNama[puluhan] + (sisa > 0 ? ' ' + satuan[sisa] : '');
            }
            if (num < 1000) {
                const ratusan = Math.floor(num / 100);
                const sisa = num % 100;
                let text = '';
                if (ratusan === 1) text = 'seratus';
                else text = satuan[ratusan] + ' ratus';
                if (sisa > 0) text += ' ' + formatRibuan(sisa);
                return text;
            }
            return '';
        };
        const milyar = Math.floor(angka / 1000000000);
        const milyarSisa = angka % 1000000000;
        const juta = Math.floor(milyarSisa / 1000000);
        const jutaSisa = milyarSisa % 1000000;
        const ribu = Math.floor(jutaSisa / 1000);
        const satu = jutaSisa % 1000;
        let hasil = '';
        if (milyar > 0) hasil += formatRibuan(milyar) + ' milyar ';
        if (juta > 0) hasil += formatRibuan(juta) + ' juta ';
        if (ribu > 0) {
            if (ribu === 1) hasil += 'seribu ';
            else hasil += formatRibuan(ribu) + ' ribu ';
        }
        if (satu > 0) hasil += formatRibuan(satu);
        return hasil.trim().charAt(0).toUpperCase() + hasil.trim().slice(1) + ' rupiah';
    };

    const totalBiaya = pegawai?.total_biaya || 0;
    const today = new Date();
    
    const transportDetail = pegawai?.transportasi_detail || [];
    const uangHarianDetail = pegawai?.uang_harian_detail || [];
    const penginapanDetail = pegawai?.penginapan_detail || [];

    const isApproved = statusTtd === 'sudah';
    const approvedDate = tglTtd ? formatDateFn(tglTtd) : null;
    const approvedBy = pegawai?.nama || 'Pegawai Bersangkutan';
    const catatanTtdText = catatanTtd;

    const ppkNama = kegiatan?.ppk_nama || 'PPK';
    const bendaharaNama = kegiatan?.bendahara_nama || 'Bendahara';

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        // Generate HTML untuk TTD images
        const ttdPegawaiHtml = ttdPegawaiUrl ? 
            `<img src="${ttdPegawaiUrl}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : 
            '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';
        
        const ttdPpkHtml = ttdPpkUrl ? 
            `<img src="${ttdPpkUrl}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : 
            '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';
        
        const ttdBendaharaHtml = ttdBendaharaUrl ? 
            `<img src="${ttdBendaharaUrl}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : 
            '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Kwitansi Perjalanan Dinas - ${pegawai?.nama || ''}</title>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        background: white; 
                        padding: 40px;
                        font-size: 12px;
                    }
                    .kwitansi-container {
                        max-width: 800px;
                        margin: 0 auto;
                        border: 1px solid #000;
                        padding: 20px;
                        position: relative;
                    }
                    .stamp-approve {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-25deg);
                        font-size: 48px;
                        font-weight: bold;
                        color: rgba(34, 197, 94, 0.15);
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 10;
                        font-family: Arial, sans-serif;
                    }
                    .header {
                        display: flex;
                        justify-content: flex-end;
                        margin-bottom: 20px;
                    }
                    .info-box {
                        border: 1px solid #000;
                        padding: 8px 15px;
                        text-align: right;
                        min-width: 250px;
                    }
                    .info-box div {
                        margin: 2px 0;
                        font-size: 11px;
                    }
                    .info-box .bukti-kas {
                        font-weight: bold;
                        font-size: 13px;
                        margin-top: 5px;
                        padding-top: 3px;
                        border-top: 1px dashed #000;
                    }
                    .judul-kegiatan {
                        text-align: center;
                        font-size: 13px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .lampiran {
                        text-align: left;
                        font-size: 11px;
                        margin: 10px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 11px;
                    }
                    th, td {
                        border: 1px solid black;
                        padding: 6px;
                        vertical-align: top;
                    }
                    th {
                        text-align: center;
                        font-weight: bold;
                        background-color: #f5f5f5;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .text-left {
                        text-align: left;
                    }
                    .bold {
                        font-weight: bold;
                    }
                    .jumlah-total {
                        text-align: right;
                        font-weight: bold;
                        margin-top: 10px;
                        font-size: 12px;
                    }
                    .terbilang {
                        margin-top: 15px;
                        font-size: 11px;
                    }
                    .signature {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .signature-item {
                        text-align: center;
                        width: 30%;
                        position: relative;
                    }
                    .signature-label {
                        font-size: 11px;
                        margin-bottom: 20px;
                    }
                    .signature-image {
                        margin: 10px 0;
                        min-height: 60px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .ttd-placeholder {
                        font-size: 9px;
                        color: #999;
                        font-style: italic;
                    }
                    .signature-line {
                        margin-top: 5px;
                        border-top: 1px solid black;
                        width: 100%;
                    }
                    .signature-name {
                        margin-top: 10px;
                        font-weight: bold;
                        font-size: 11px;
                    }
                    .signature-nip {
                        font-size: 9px;
                        margin-top: 5px;
                    }
                    .approval-info {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #f0fdf4;
                        border: 1px solid #22c55e;
                        border-radius: 5px;
                        font-size: 10px;
                    }
                    .approval-info p {
                        margin: 3px 0;
                    }
                    .approval-info .approved-text {
                        color: #16a34a;
                        font-weight: bold;
                        font-size: 11px;
                    }
                    .footer {
                        margin-top: 50px;
                        font-size: 10px;
                        text-align: center;
                    }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .no-print { display: none; }
                        .kwitansi-container { border: none; padding: 0; }
                        .stamp-approve {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="kwitansi-container">
                    ${isApproved ? '<div class="stamp-approve">✓ DISETUJUI</div>' : ''}
                    
                    <div class="header">
                        <div class="info-box">
                            <div>TA : ${new Date().getFullYear()}</div>
                            <div>MAK : ${kegiatan?.mak || '-'}</div>
                            <div class="bukti-kas">BUKTI KAS</div>
                        </div>
                    </div>
                    
                    <div class="judul-kegiatan">${kegiatan?.kegiatan || ''}</div>
                    
                    <div class="lampiran">
                        Lampiran SPD Nomor : ${currentItem?.no_lpd || '-'} <br/>
                        Tanggal : ${currentItem?.tgl_kwitansi ? formatDateFn(currentItem.tgl_kwitansi) : '-'}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 5%">NO</th>
                                <th style="width: 50%">PERINCIAN BIAYA</th>
                                <th style="width: 20%">JUMLAH</th>
                                <th style="width: 25%">KETERANGAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-center">1.</td>
                                <td class="text-left">Transport</td>
                                <td class="text-right">Rp ${formatRupiah(pegawai?.transport_total || 0)}</td>
                                <td class="text-left">
                                    ${transportDetail.map(t => `<div>• ${t.trans || ''}</div>`).join('')}
                                </td>
                            </tr>
                            <tr>
                                <td class="text-center">2.</td>
                                <td class="text-left">Uang Harian</td>
                                <td class="text-right">Rp ${formatRupiah(pegawai?.uang_harian_total || 0)}</td>
                                <td class="text-left">
                                    ${uangHarianDetail.map(u => `<div>• ${u.qty || 0} hari</div>`).join('')}
                                </td>
                            </tr>
                            <tr>
                                <td class="text-center">3.</td>
                                <td class="text-left">Penginapan</td>
                                <td class="text-right">Rp ${formatRupiah(pegawai?.penginapan_total || 0)}</td>
                                <td class="text-left">
                                    ${penginapanDetail.map(p => `<div>• ${p.qty || 0} hari</div>`).join('')}
                                </td>
                            </tr>
                            <tr style="font-weight: bold;">
                                <td colspan="2" class="text-right">JUMLAH</td>
                                <td class="text-right">Rp ${formatRupiah(totalBiaya)}</td>
                                <td class="text-left"></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="jumlah-total">
                        JUMLAH : Rp ${formatRupiah(totalBiaya)}
                    </div>
                    
                    <div class="terbilang">
                        Terbilang : "${terbilang(totalBiaya)}"
                    </div>
                    
                    ${isApproved ? `
                    <div class="approval-info">
                        <p class="approved-text">✓ KUITANSI INI TELAH DITANDATANGAN</p>
                        <p>Disetujui oleh : ${approvedBy}</p>
                        <p>Tanggal persetujuan : ${approvedDate || formatDateFn(today)}</p>
                        ${catatanTtdText ? `<p>Catatan : ${catatanTtdText}</p>` : ''}
                    </div>
                    ` : `
                    <div class="approval-info" style="background-color:#fef3c7; border-color:#f59e0b;">
                        <p class="approved-text" style="color:#d97706;">⏳ MENUNGGU PERSETUJUAN PEGAWAI</p>
                        <p>Kwitansi ini belum disetujui oleh pegawai yang bersangkutan.</p>
                        <p>Harap segera melakukan persetujuan melalui sistem.</p>
                    </div>
                    `}
                    
                    <div class="signature">
                        <div class="signature-item">
                            <div class="signature-label">Palangka Raya, ${formatDateFn(today)}</div>
                            <div class="signature-label">Bendahara Pengeluaran,</div>
                            <div class="signature-image">
                                ${ttdBendaharaHtml}
                            </div>
                            <div class="signature-line"></div>
                            <div class="signature-name">${bendaharaNama}</div>
                        </div>
                        <div class="signature-item">
                            <div class="signature-label">Yang Menerima,</div>
                            <div class="signature-image">
                                ${ttdPegawaiHtml}
                            </div>
                            <div class="signature-line"></div>
                            <div class="signature-name">${pegawai?.nama || ''}</div>
                            <div class="signature-nip">NIP. ${pegawai?.nip || '-'}</div>
                        </div>
                        <div class="signature-item">
                            <div class="signature-label">Pembuat Komitmen / PPK,</div>
                            <div class="signature-image">
                                ${ttdPpkHtml}
                            </div>
                            <div class="signature-line"></div>
                            <div class="signature-name">${ppkNama}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div>PERHITUNGAN SPD RAMPUNG</div>
                        <div>Ditetapkan sejumlah Rp ${formatRupiah(totalBiaya)}</div>
                    </div>
                </div>
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print();setTimeout(function(){window.close();}, 500);" style="padding: 10px 20px; margin-right: 10px; cursor: pointer;">🖨️ Cetak</button>
                    <button onclick="window.close();" style="padding: 10px 20px; cursor: pointer;">Tutup</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-20">
                        <h3 className="text-lg font-medium">Preview Kwitansi - {pegawai?.nama || ''}</h3>
                        <div className="flex gap-2">
                            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                🖨️ Cetak / Print
                            </button>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div className="border rounded-lg p-6 bg-white relative" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        {isApproved && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="transform -rotate-12 text-green-600 opacity-20 text-7xl font-bold border-8 border-green-600 px-8 py-4 rounded-lg">
                                    ✓ DISETUJUI
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-end mb-5">
                            <div className="border border-black px-4 py-2 text-right min-w-[220px]">
                                <div className="text-sm">TA : {new Date().getFullYear()}</div>
                                <div className="text-sm">MAK : {kegiatan?.mak || '-'}</div>
                                <div className="font-bold text-sm mt-1 pt-1 border-t border-dashed border-black">BUKTI KAS</div>
                            </div>
                        </div>
                        
                        <div className="text-center text-sm font-bold my-5">{kegiatan?.kegiatan || ''}</div>
                        
                        <div className="text-left text-xs my-3">
                            <div>Lampiran SPD Nomor : {currentItem?.no_lpd || '-'}</div>
                            <div>Tanggal : {currentItem?.tgl_kwitansi ? formatDateFn(currentItem.tgl_kwitansi) : '-'}</div>
                        </div>
                        
                        <table className="min-w-full border-collapse border text-sm mt-4">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 w-1/12">NO</th>
                                    <th className="border p-2 w-5/12">PERINCIAN BIAYA</th>
                                    <th className="border p-2 w-3/12">JUMLAH</th>
                                    <th className="border p-2 w-3/12">KETERANGAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border p-2 text-center">1.</td>
                                    <td className="border p-2">Transport</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(pegawai?.transport_total || 0)}</td>
                                    <td className="border p-2 text-left">
                                        {transportDetail.map((t, i) => (
                                            <div key={i}>• {t.trans || ''}</div>
                                        ))}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border p-2 text-center">2.</td>
                                    <td className="border p-2">Uang Harian</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(pegawai?.uang_harian_total || 0)}</td>
                                    <td className="border p-2 text-left">
                                        {uangHarianDetail.map((u, i) => (
                                            <div key={i}>• {u.qty || 0} hari</div>
                                        ))}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border p-2 text-center">3.</td>
                                    <td className="border p-2">Penginapan</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(pegawai?.penginapan_total || 0)}</td>
                                    <td className="border p-2 text-left">
                                        {penginapanDetail.map((p, i) => (
                                            <div key={i}>• {p.qty || 0} hari</div>
                                        ))}
                                    </td>
                                </tr>
                                <tr className="font-bold">
                                    <td colSpan="2" className="border p-2 text-right">JUMLAH</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(totalBiaya)}</td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div className="text-right font-bold mt-3">
                            JUMLAH : Rp {formatRupiah(totalBiaya)}
                        </div>
                        
                        <div className="mt-3">
                            Terbilang : "{terbilang(totalBiaya)}"
                        </div>
                        
                        {isApproved ? (
                            <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                                <p className="text-green-700 font-semibold">✓ KUITANSI TELAH DITANDATANGAN</p>
                                <p className="text-xs text-green-600 mt-1">
                                    Disetujui oleh: {approvedBy}<br/>
                                    Tanggal persetujuan: {approvedDate || formatDateFn(today)}
                                    {catatanTtdText && <><br/>Catatan: {catatanTtdText}</>}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                                <p className="text-yellow-700 font-semibold">⏳ MENUNGGU PERSETUJUAN PEGAWAI</p>
                                <p className="text-xs text-yellow-600 mt-1">
                                    Kwitansi ini belum disetujui oleh pegawai yang bersangkutan.
                                    Harap segera melakukan persetujuan melalui sistem.
                                </p>
                            </div>
                        )}
                        
                        <div className="flex justify-between mt-20 items-end">
                            <div className="text-center w-1/3">
                                <div className="mb-4">Palangka Raya, {formatDateFn(today)}</div>
                                <div className="mb-12">Bendahara Pengeluaran,</div>
                                {loadingTtd ? (
                                    <div className="text-gray-400 text-xs">Memuat TTD...</div>
                                ) : (
                                    <div className="signature-image my-2">
                                        {ttdBendaharaUrl ? (
                                            <img 
                                                src={ttdBendaharaUrl} 
                                                alt="TTD Bendahara" 
                                                className="max-h-12 max-w-32 object-contain mx-auto"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="text-xs text-gray-400 italic">(TTD digital tidak tersedia)</div>
                                        )}
                                    </div>
                                )}
                                <div className="border-t border-black pt-2 mt-2"></div>
                                <div className="font-bold mt-3">{bendaharaNama}</div>
                            </div>
                            <div className="text-center w-1/3">
                                <div className="mb-16">Yang Menerima,</div>
                                {loadingTtd ? (
                                    <div className="text-gray-400 text-xs">Memuat TTD...</div>
                                ) : (
                                    <div className="signature-image my-2">
                                        {ttdPegawaiUrl ? (
                                            <img 
                                                src={ttdPegawaiUrl} 
                                                alt="TTD Pegawai" 
                                                className="max-h-12 max-w-32 object-contain mx-auto"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="text-xs text-gray-400 italic">(TTD digital tidak tersedia)</div>
                                        )}
                                    </div>
                                )}
                                <div className="border-t border-black pt-2 mt-2"></div>
                                <div className="font-bold mt-3">{pegawai?.nama || ''}</div>
                                <div className="signature-nip">NIP. {pegawai?.nip || '-'}</div>
                            </div>
                            <div className="text-center w-1/3">
                                <div className="mb-16">Pembuat Komitmen / PPK,</div>
                                {loadingTtd ? (
                                    <div className="text-gray-400 text-xs">Memuat TTD...</div>
                                ) : (
                                    <div className="signature-image my-2">
                                        {ttdPpkUrl ? (
                                            <img 
                                                src={ttdPpkUrl} 
                                                alt="TTD PPK" 
                                                className="max-h-12 max-w-32 object-contain mx-auto"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="text-xs text-gray-400 italic">(TTD digital tidak tersedia)</div>
                                        )}
                                    </div>
                                )}
                                <div className="border-t border-black pt-2 mt-2"></div>
                                <div className="font-bold mt-3">{ppkNama}</div>
                            </div>
                        </div>
                        
                        <div className="text-center text-xs mt-10">
                            <div>PERHITUNGAN SPD RAMPUNG</div>
                            <div>Ditetapkan sejumlah Rp {formatRupiah(totalBiaya)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}