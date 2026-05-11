import React, { useState, useEffect } from 'react';
import { formatDateFn } from '../../utils/formatters';

export default function KwitansiPrint({ item, kegiatan, pegawai, onClose }) {
    // Status approvals dari data yang benar
    const [statusPegawai, setStatusPegawai] = useState(item?.status_pegawai || pegawai?.status_pegawai || 'belum');
    const [statusBendahara, setStatusBendahara] = useState(item?.status_bendahara || pegawai?.status_bendahara || 'belum');
    const [statusPpk, setStatusPpk] = useState(item?.status_ppk || pegawai?.status_ppk || 'belum');
    
    const [tglTtdPegawai, setTglTtdPegawai] = useState(item?.tgl_ttd_pegawai || pegawai?.tgl_ttd_pegawai || null);
    const [tglTtdBendahara, setTglTtdBendahara] = useState(item?.tgl_ttd_bendahara || pegawai?.tgl_ttd_bendahara || null);
    const [tglTtdPpk, setTglTtdPpk] = useState(item?.tgl_ttd_ppk || pegawai?.tgl_ttd_ppk || null);
    
    const [catatanPegawai, setCatatanPegawai] = useState(item?.catatan_pegawai || pegawai?.catatan_pegawai || '');
    const [catatanBendahara, setCatatanBendahara] = useState(item?.catatan_bendahara || pegawai?.catatan_bendahara || '');
    const [catatanPpk, setCatatanPpk] = useState(item?.catatan_ppk || pegawai?.catatan_ppk || '');
    
    // State untuk TTD images
    const [ttdPegawaiUrl, setTtdPegawaiUrl] = useState(null);
    const [ttdPpkUrl, setTtdPpkUrl] = useState(null);
    const [ttdBendaharaUrl, setTtdBendaharaUrl] = useState(null);
    const [loadingTtd, setLoadingTtd] = useState(true);
    
    // State untuk biaya - dengan fallback ke total_biaya jika tidak ada detail
    const transportDetail = pegawai?.transportasi_detail || [];
    const uangHarianDetail = pegawai?.uang_harian_detail || [];
    const penginapanDetail = pegawai?.penginapan_detail || [];
    
    // Hitung ulang total dari detail jika ada,否则使用 pegawai.total_biaya
    const calculateTotals = () => {
        let transportTotal = 0;
        let uangHarianTotal = 0;
        let penginapanTotal = 0;
        
        if (transportDetail.length > 0) {
            transportTotal = transportDetail.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        } else if (pegawai?.transport_total) {
            transportTotal = Number(pegawai.transport_total) || 0;
        }
        
        if (uangHarianDetail.length > 0) {
            uangHarianTotal = uangHarianDetail.reduce((sum, u) => sum + (Number(u.total) || 0), 0);
        } else if (pegawai?.uang_harian_total) {
            uangHarianTotal = Number(pegawai.uang_harian_total) || 0;
        }
        
        if (penginapanDetail.length > 0) {
            penginapanTotal = penginapanDetail.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        } else if (pegawai?.penginapan_total) {
            penginapanTotal = Number(pegawai.penginapan_total) || 0;
        }
        
        let total = transportTotal + uangHarianTotal + penginapanTotal;
        if (total === 0 && pegawai?.total_biaya) {
            total = Number(pegawai.total_biaya) || 0;
        }
        
        return { transportTotal, uangHarianTotal, penginapanTotal, total };
    };
    
    const totals = calculateTotals();
    const transportTotal = totals.transportTotal;
    const uangHarianTotal = totals.uangHarianTotal;
    const penginapanTotal = totals.penginapanTotal;
    const totalBiaya = totals.total;

    // Cek apakah semua approval sudah selesai
    const isFullyApproved = statusPegawai === 'sudah' && statusBendahara === 'sudah' && statusPpk === 'sudah';
    const approvalStage = isFullyApproved ? 'COMPLETED' : 
                          statusPpk === 'sudah' ? 'WAITING_PPK' :
                          statusBendahara === 'sudah' ? 'WAITING_BENDAHARA' :
                          statusPegawai === 'sudah' ? 'WAITING_PEGAWAI' : 'MENUNGGU';

    useEffect(() => {
        console.log('=== KWITANSI PRINT DEBUG ===');
        console.log('Pegawai data:', pegawai);
        console.log('Item data:', item);
        console.log('Transport detail:', transportDetail);
        console.log('Uang harian detail:', uangHarianDetail);
        console.log('Penginapan detail:', penginapanDetail);
        console.log('Transport total:', transportTotal);
        console.log('Uang harian total:', uangHarianTotal);
        console.log('Penginapan total:', penginapanTotal);
        console.log('Total biaya:', totalBiaya);
        console.log('Approval status:', { statusPegawai, statusBendahara, statusPpk, approvalStage });
    }, [pegawai, item]);

    useEffect(() => {
        loadTtdImages();
    }, [item, pegawai]);

    const loadTtdImages = () => {
        setLoadingTtd(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        
        const getImageUrl = (path) => {
            if (!path) return null;
            // Jika path sudah full URL, gunakan langsung
            if (path.startsWith('http')) return path;
            let cleanPath = path;
            if (cleanPath.startsWith('/api/')) cleanPath = cleanPath.replace('/api', '');
            if (!cleanPath.startsWith('/uploads')) {
                // Jika hanya nama file
                if (!cleanPath.includes('/')) {
                    cleanPath = `/uploads/ttd/${cleanPath}`;
                } else {
                    cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
                }
            }
            return `${baseUrl}${cleanPath}`;
        };
        
        // Cari TTD dari berbagai sumber
        const ttdPegawai = item?.ttd_pegawai_path || pegawai?.ttd_pegawai_path;
        const ttdPpk = item?.ttd_ppk_path || pegawai?.ttd_ppk_path;
        const ttdBendahara = item?.ttd_bendahara_path || pegawai?.ttd_bendahara_path;
        
        setTtdPegawaiUrl(getImageUrl(ttdPegawai));
        setTtdPpkUrl(getImageUrl(ttdPpk));
        setTtdBendaharaUrl(getImageUrl(ttdBendahara));
        setLoadingTtd(false);
    };

    const formatRupiah = (number) => {
        if (number === undefined || number === null) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const terbilang = (angka) => {
        if (!angka || angka === 0) return 'Nol rupiah';
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
        if (hasil === '') hasil = 'nol';
        return hasil.trim().charAt(0).toUpperCase() + hasil.trim().slice(1) + ' rupiah';
    };

    const today = new Date();
    const ppkNama = kegiatan?.ppk_nama || 'PPK';
    const bendaharaNama = kegiatan?.bendahara_nama || 'Bendahara';

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        const ttdPegawaiHtml = ttdPegawaiUrl ? 
            `<img src="${ttdPegawaiUrl}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : 
            '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';
        
        const ttdPpkHtml = ttdPpkUrl ? 
            `<img src="${ttdPpkUrl}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : 
            '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';
        
        const ttdBendaharaHtml = ttdBendaharaUrl ? 
            `<img src="${ttdBendaharaUrl}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : 
            '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';
        
        // Generate HTML untuk detail
        const transportRows = transportDetail.length > 0 ? 
            transportDetail.map(t => `<div>• ${t.transport || t.trans || '-'} (Rp ${formatRupiah(t.total)})</div>`).join('') : 
            (transportTotal > 0 ? `<div>• Transportasi (Rp ${formatRupiah(transportTotal)})</div>` : '-');
        
        const uangHarianRows = uangHarianDetail.length > 0 ? 
            uangHarianDetail.map(u => `<div>• ${u.qty || 0} hari x Rp ${formatRupiah(u.tarif)} = Rp ${formatRupiah(u.total)}</div>`).join('') : 
            (uangHarianTotal > 0 ? `<div>• Uang Harian (Rp ${formatRupiah(uangHarianTotal)})</div>` : '-');
        
        const penginapanRows = penginapanDetail.length > 0 ? 
            penginapanDetail.map(p => `<div>• ${p.hotel || 'Hotel'} (${p.qty || 0} hari) - Rp ${formatRupiah(p.total)}</div>`).join('') : 
            (penginapanTotal > 0 ? `<div>• Penginapan (Rp ${formatRupiah(penginapanTotal)})</div>` : '-');
        
        // Kumpulkan catatan penolakan
        let rejectionNotes = '';
        if (catatanPegawai) rejectionNotes += `<p>Catatan Pegawai: ${catatanPegawai}</p>`;
        if (catatanBendahara) rejectionNotes += `<p>Catatan Bendahara: ${catatanBendahara}</p>`;
        if (catatanPpk) rejectionNotes += `<p>Catatan PPK: ${catatanPpk}</p>`;
        
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
                    }
                    .header { display: flex; justify-content: flex-end; margin-bottom: 20px; }
                    .info-box {
                        border: 1px solid #000;
                        padding: 8px 15px;
                        text-align: right;
                        min-width: 250px;
                    }
                    .info-box .bukti-kas {
                        font-weight: bold;
                        font-size: 13px;
                        margin-top: 5px;
                        padding-top: 3px;
                        border-top: 1px dashed #000;
                    }
                    .judul-kegiatan { text-align: center; font-size: 13px; margin: 20px 0; font-weight: bold; }
                    .lampiran { text-align: left; font-size: 11px; margin: 10px 0; }
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
                    th { text-align: center; font-weight: bold; background-color: #f5f5f5; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .bold { font-weight: bold; }
                    .jumlah-total { text-align: right; font-weight: bold; margin-top: 10px; font-size: 12px; }
                    .terbilang { margin-top: 15px; font-size: 11px; }
                    .signature {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .signature-item { text-align: center; width: 30%; }
                    .signature-label { font-size: 11px; margin-bottom: 20px; }
                    .signature-image { margin: 10px 0; min-height: 60px; display: flex; justify-content: center; align-items: center; }
                    .signature-lines { margin-top: 5px; border-top: 1px solid black; width: 100%; }
                    .signature-name { margin-top: 10px; font-weight: bold; font-size: 11px; }
                    .signature-nip { font-size: 9px; margin-top: 5px; }
                    .approval-info {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #f0fdf4;
                        border: 1px solid #22c55e;
                        border-radius: 5px;
                        font-size: 10px;
                    }
                    .footer { margin-top: 50px; font-size: 10px; text-align: center; }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .no-print { display: none; }
                        .kwitansi-container { border: none; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="kwitansi-container">
                    ${isFullyApproved ? '<div class="stamp-approve">✓ DISETUJUI</div>' : ''}
                    
                    <div class="header">
                        <div class="info-box">
                            <div>TA : ${new Date().getFullYear()}</div>
                            <div>MAK : ${kegiatan?.mak || '-'}</div>
                            <div class="bukti-kas">BUKTI KAS</div>
                        </div>
                    </div>
                    
                    <div class="judul-kegiatan">${kegiatan?.kegiatan || ''}</div>
                    
                    <div class="lampiran">
                        Lampiran SPD Nomor : ${item?.no_lpd || pegawai?.no_lpd || '-'} <br/>
                        Tanggal : ${item?.tgl_kwitansi ? formatDateFn(item.tgl_kwitansi) : '-'}
                    </div>
                    
                    <table>
                        <thead>
                            <tr><th style="width: 5%">NO</th><th style="width: 50%">PERINCIAN BIAYA</th><th style="width: 20%">JUMLAH</th><th style="width: 25%">KETERANGAN</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-center">1.</td>
                                <td class="text-left">Transport</td>
                                <td class="text-right">Rp ${formatRupiah(transportTotal)}</td>
                                <td class="text-left">${transportRows}</td>
                            </tr>
                            <tr>
                                <td class="text-center">2.</td>
                                <td class="text-left">Uang Harian</td>
                                <td class="text-right">Rp ${formatRupiah(uangHarianTotal)}</td>
                                <td class="text-left">${uangHarianRows}</td>
                            </tr>
                            <tr>
                                <td class="text-center">3.</td>
                                <td class="text-left">Penginapan</td>
                                <td class="text-right">Rp ${formatRupiah(penginapanTotal)}</td>
                                <td class="text-left">${penginapanRows}</td>
                            </tr>
                            <tr class="bold">
                                <td colspan="2" class="text-right">JUMLAH</td>
                                <td class="text-right">Rp ${formatRupiah(totalBiaya)}</td>
                                <td class="text-left"></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="jumlah-total">JUMLAH : Rp ${formatRupiah(totalBiaya)}</div>
                    <div class="terbilang">Terbilang : "${terbilang(totalBiaya)}"</div>
                    
                    ${isFullyApproved ? `
                    <div class="approval-info">
                        <p class="bold">✓ KUITANSI INI TELAH DISETUJUI</p>
                        <p>Disetujui oleh Pegawai: ${pegawai?.nama || '-'} (${tglTtdPegawai ? formatDateFn(tglTtdPegawai) : '-'})</p>
                        <p>Disetujui oleh Bendahara: ${bendaharaNama} (${tglTtdBendahara ? formatDateFn(tglTtdBendahara) : '-'})</p>
                        <p>Disetujui oleh PPK: ${ppkNama} (${tglTtdPpk ? formatDateFn(tglTtdPpk) : '-'})</p>
                        ${rejectionNotes}
                    </div>
                    ` : `
                    <div class="approval-info" style="background-color:#fef3c7; border-color:#f59e0b;">
                        <p class="bold" style="color:#d97706;">⏳ STATUS PERSETUJUAN</p>
                        <p>Pegawai: ${statusPegawai === 'sudah' ? '✓ Disetujui' : statusPegawai === 'ditolak' ? '✗ Ditolak' : '⏳ Menunggu'}</p>
                        <p>Bendahara: ${statusBendahara === 'sudah' ? '✓ Disetujui' : statusBendahara === 'ditolak' ? '✗ Ditolak' : '⏳ Menunggu'}</p>
                        <p>PPK: ${statusPpk === 'sudah' ? '✓ Disetujui' : statusPpk === 'ditolak' ? '✗ Ditolak' : '⏳ Menunggu'}</p>
                        ${rejectionNotes}
                    </div>
                    `}
                    
                    <div class="signature">
                        <div class="signature-item">
                            <div class="signature-label">Palangka Raya, ${formatDateFn(today)}</div>
                            <div class="signature-label">Bendahara Pengeluaran,</div>
                            <div class="signature-image">${ttdBendaharaHtml}</div>
                            <div class="signature-lines"></div>
                            <div class="signature-name">${bendaharaNama}</div>
                        </div>
                        <div class="signature-item">
                            <div class="signature-label">Yang Menerima,</div>
                            <div class="signature-image">${ttdPegawaiHtml}</div>
                            <div class="signature-lines"></div>
                            <div class="signature-name">${pegawai?.nama || ''}</div>
                            <div class="signature-nip">NIP. ${pegawai?.nip || '-'}</div>
                        </div>
                        <div class="signature-item">
                            <div class="signature-label">Pembuat Komitmen / PPK,</div>
                            <div class="signature-image">${ttdPpkHtml}</div>
                            <div class="signature-lines"></div>
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
                    
                    {/* Debug Panel */}
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <details>
                            <summary className="font-bold cursor-pointer">🔧 Debug Info - Data Biaya & Approval</summary>
                            <div className="mt-2">
                                <p><strong>Status Approval:</strong> Pegawai={statusPegawai} | Bendahara={statusBendahara} | PPK={statusPpk}</p>
                                <p><strong>Transport Total:</strong> Rp {formatRupiah(transportTotal)} ({transportDetail.length} item)</p>
                                <p><strong>Uang Harian Total:</strong> Rp {formatRupiah(uangHarianTotal)} ({uangHarianDetail.length} item)</p>
                                <p><strong>Penginapan Total:</strong> Rp {formatRupiah(penginapanTotal)} ({penginapanDetail.length} item)</p>
                                <p><strong>Grand Total:</strong> Rp {formatRupiah(totalBiaya)}</p>
                                <p><strong>Approval Stage:</strong> {approvalStage}</p>
                            </div>
                        </details>
                    </div>
                    
                    {/* Preview content */}
                    <div className="border rounded-lg p-6 bg-white relative" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        <div className="text-center text-sm font-bold my-5">{kegiatan?.kegiatan || ''}</div>
                        <div className="text-left text-xs my-3">
                            <div>Lampiran SPD Nomor : {item?.no_lpd || pegawai?.no_lpd || '-'}</div>
                            <div>Tanggal : {item?.tgl_kwitansi ? formatDateFn(item.tgl_kwitansi) : '-'}</div>
                        </div>
                        
                        <table className="min-w-full border-collapse border text-sm mt-4">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2">NO</th>
                                    <th className="border p-2">PERINCIAN BIAYA</th>
                                    <th className="border p-2">JUMLAH</th>
                                    <th className="border p-2">KETERANGAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border p-2 text-center">1.</td>
                                    <td className="border p-2">Transport</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(transportTotal)}</td>
                                    <td className="border p-2 text-left">
                                        {transportDetail.length > 0 ? 
                                            transportDetail.map((t, i) => (
                                                <div key={i}>• {t.transport || t.trans || '-'} (Rp {formatRupiah(t.total)})</div>
                                            )) : 
                                            (transportTotal > 0 ? <div>• Transportasi (Rp {formatRupiah(transportTotal)})</div> : '-')
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border p-2 text-center">2.</td>
                                    <td className="border p-2">Uang Harian</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(uangHarianTotal)}</td>
                                    <td className="border p-2 text-left">
                                        {uangHarianDetail.length > 0 ? 
                                            uangHarianDetail.map((u, i) => (
                                                <div key={i}>• {u.qty || 0} hari x Rp {formatRupiah(u.tarif)} = Rp {formatRupiah(u.total)}</div>
                                            )) : 
                                            (uangHarianTotal > 0 ? <div>• Uang Harian (Rp {formatRupiah(uangHarianTotal)})</div> : '-')
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border p-2 text-center">3.</td>
                                    <td className="border p-2">Penginapan</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(penginapanTotal)}</td>
                                    <td className="border p-2 text-left">
                                        {penginapanDetail.length > 0 ? 
                                            penginapanDetail.map((p, i) => (
                                                <div key={i}>• {p.hotel || 'Hotel'} ({p.qty || 0} hari) - Rp {formatRupiah(p.total)}</div>
                                            )) : 
                                            (penginapanTotal > 0 ? <div>• Penginapan (Rp {formatRupiah(penginapanTotal)})</div> : '-')
                                        }
                                    </td>
                                </tr>
                                <tr className="font-bold">
                                    <td colSpan="2" className="border p-2 text-right">JUMLAH</td>
                                    <td className="border p-2 text-right">Rp {formatRupiah(totalBiaya)}</td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div className="text-right font-bold mt-3">JUMLAH : Rp {formatRupiah(totalBiaya)}</div>
                        <div className="mt-3">Terbilang : "{terbilang(totalBiaya)}"</div>
                        
                        {/* Signature section */}
                        <div className="flex justify-between mt-20 items-end">
                            <div className="text-center w-1/3">
                                <div>Bendahara Pengeluaran,</div>
                                <div className="mt-12 mb-2">
                                    {ttdBendaharaUrl ? <img src={ttdBendaharaUrl} className="max-h-12 mx-auto" alt="TTD Bendahara" /> : <div className="text-xs">(TTD)</div>}
                                </div>
                                <div className="border-t border-black pt-2">{bendaharaNama}</div>
                            </div>
                            <div className="text-center w-1/3">
                                <div>Yang Menerima,</div>
                                <div className="mt-12 mb-2">
                                    {ttdPegawaiUrl ? <img src={ttdPegawaiUrl} className="max-h-12 mx-auto" alt="TTD Pegawai" /> : <div className="text-xs">(TTD)</div>}
                                </div>
                                <div className="border-t border-black pt-2">{pegawai?.nama}</div>
                                <div className="text-xs">NIP. {pegawai?.nip}</div>
                            </div>
                            <div className="text-center w-1/3">
                                <div>PPK,</div>
                                <div className="mt-12 mb-2">
                                    {ttdPpkUrl ? <img src={ttdPpkUrl} className="max-h-12 mx-auto" alt="TTD PPK" /> : <div className="text-xs">(TTD)</div>}
                                </div>
                                <div className="border-t border-black pt-2">{ppkNama}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                        <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            🖨️ Cetak Kwitansi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}