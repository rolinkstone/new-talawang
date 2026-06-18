// components/kwitansi/KwitansiPrint.js
import React, { useState, useEffect } from 'react';
import { formatDateForDisplay } from '../../utils/formatters';
import axios from 'axios';
import { useSession } from 'next-auth/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function KwitansiPrint({ item, kegiatan, pegawai, onClose }) {
  const { data: session } = useSession();
  
  // Status approvals
  const [statusPegawai, setStatusPegawai] = useState(item?.status_pegawai || pegawai?.status_pegawai || 'belum');
  const [statusBendahara, setStatusBendahara] = useState(item?.status_bendahara || pegawai?.status_bendahara || 'belum');
  const [statusPpk, setStatusPpk] = useState(item?.status_ppk || pegawai?.status_ppk || 'belum');

  // TTD images
  const [ttdPegawaiUrl, setTtdPegawaiUrl] = useState(null);
  const [ttdPpkUrl, setTtdPpkUrl] = useState(null);
  const [ttdBendaharaUrl, setTtdBendaharaUrl] = useState(null);

  // SPTJM Transport data dari input kwitansi
  const [sptjmList, setSptjmList] = useState([]);
  
  // SPTJM Penginapan data dari input kwitansi
  const [penginapanSptjmList, setPenginapanSptjmList] = useState([]);

  // State untuk LPD
  const [isPrintingLpd, setIsPrintingLpd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detail biaya dari nominatif
  const transportDetail = pegawai?.transportasi_detail || [];
  const uangHarianDetail = pegawai?.uang_harian_detail || [];
  const penginapanDetail = pegawai?.penginapan_detail || [];

  // Fetch SPTJM Transport data dari tabel sptjm_transport (input kwitansi)
  const fetchSptjmTransport = async () => {
    const kwitansiId = item?.kwitansi_id || item?.id;
    if (!kwitansiId) return;
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-transport/${kwitansiId}`,
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );
      
      if (response.data.success && response.data.data) {
        setSptjmList(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching SPTJM transport:', error);
    }
  };

  // Fetch SPTJM Penginapan data dari tabel sptjm_penginapan (input kwitansi)
  const fetchSptjmPenginapan = async () => {
    const kwitansiId = item?.kwitansi_id || item?.id;
    if (!kwitansiId) return;
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-penginapan/${kwitansiId}`,
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );
      
      if (response.data.success && response.data.data) {
        setPenginapanSptjmList(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching SPTJM penginapan:', error);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchSptjmTransport();
      fetchSptjmPenginapan();
    }
  }, [item, session]);

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

  const isFullyApproved = statusPegawai === 'sudah' && statusBendahara === 'sudah' && statusPpk === 'sudah';

  const formatRupiah = (number) => {
    if (number === undefined || number === null || number === '') return '0';
    return new Intl.NumberFormat('id-ID').format(Number(number));
  };

  // Fungsi format tanggal ke DD Month YYYY (contoh: 06 Mei 2026)
  const formatDateIndonesian = (dateString) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const days = date.getDate().toString().padStart(2, '0');
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${days} ${month} ${year}`;
  };

  // Format tanggal untuk rincian kegiatan (DD-MM-YYYY)
  const formatTanggalRincian = (date) => {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const hari = d.getDate().toString().padStart(2, '0');
    const bulan = (d.getMonth() + 1).toString().padStart(2, '0');
    const tahun = d.getFullYear();
    return `${hari}-${bulan}-${tahun}`;
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
        let text = ratusan === 1 ? 'seratus' : satuan[ratusan] + ' ratus';
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
    if (ribu > 0) hasil += (ribu === 1 ? 'seribu ' : formatRibuan(ribu) + ' ribu ');
    if (satu > 0) hasil += formatRibuan(satu);
    if (hasil === '') hasil = 'nol';
    
    const trimmed = hasil.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + ' rupiah';
  };

  const loadTtdImages = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const getImageUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      let cleanPath = path;
      if (cleanPath.startsWith('/api/')) cleanPath = cleanPath.replace('/api', '');
      if (!cleanPath.startsWith('/uploads')) {
        if (!cleanPath.includes('/')) cleanPath = `/uploads/ttd/${cleanPath}`;
        else cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
      }
      return `${apiUrl}${cleanPath}`;
    };
    
    const ttdPegawai = item?.ttd_pegawai_path || pegawai?.ttd_pegawai_path;
    const ttdPpk = item?.ttd_ppk_path || pegawai?.ttd_ppk_path;
    const ttdBendahara = item?.ttd_bendahara_path || pegawai?.ttd_bendahara_path;

    setTtdPegawaiUrl(getImageUrl(ttdPegawai));
    setTtdPpkUrl(getImageUrl(ttdPpk));
    setTtdBendaharaUrl(getImageUrl(ttdBendahara));
  };

  useEffect(() => {
    loadTtdImages();
  }, [item, pegawai]);

  const ppkNama = kegiatan?.ppk_nama || 'PPK';
  const bendaharaNama = kegiatan?.bendahara_nama || 'Bendahara';
  const pegawaiNama = pegawai?.nama || '';
  const pegawaiNip = pegawai?.nip || '';
  const pegawaiJabatan = pegawai?.jabatan || 'Pegawai';
  
  const today = new Date();
  const todayFormatted = formatDateIndonesian(today);
  
  const tglSpd = item?.tgl_spd ? formatDateIndonesian(item.tgl_spd) : (item?.tgl_kwitansi ? formatDateIndonesian(item.tgl_kwitansi) : todayFormatted);
  const noSpt = item?.no_lpd || pegawai?.no_lpd || '-';

  const totalTransportFromNominatif = transportDetail.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || totals.transportTotal;
  const hasMultipleTransport = transportDetail.length > 1;
  const hasPenginapanSptjm = penginapanSptjmList && penginapanSptjmList.length > 0;

  // Generate baris untuk kwitansi
  const generateKwitansiRows = () => {
    let rows = '';
    
    if (transportDetail.length > 0) {
      transportDetail.forEach((t, idx) => {
        const namaTransport = t.transport || t.trans || '-';
        const lokasiTujuan = t.tujuan || t.keterangan || 'Pulang Pisau';
        const nominal = t.total ? `${formatRupiah(t.total)}` : '';
        rows += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">${idx === 0 ? '1' : ''}</td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
              ${idx === 0 ? '<strong>Uang Transport</strong>' : ''}
              <div style="padding-left: 20px; font-size: 10px; margin-top: 2px;">
                Uang Transport ${namaTransport} (Palangka Raya - ${lokasiTujuan})
              </div>
            </td>
            <td class="text-right" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
              ${nominal}
            </td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;"></td>
          </tr>
        `;
      });
    } else if (transportTotal > 0) {
      rows += `
        <tr>
          <td class="text-center" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">1</td>
          <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
            <strong>Uang Transport</strong>
            <div style="padding-left: 20px; font-size: 10px; margin-top: 2px;">
              Uang Transport (Palangka Raya - Pulang Pisau)
            </div>
          </td>
          <td class="text-right" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
            ${formatRupiah(transportTotal)}
          </td>
          <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;"></td>
        </tr>
      `;
    }
    
    if (uangHarianDetail.length > 0) {
      uangHarianDetail.forEach((u, idx) => {
        const tglMulai = u.rencana_tanggal_pelaksanaan || u.tanggal_mulai || u.tanggal;
        const tglAkhir = u.rencana_tanggal_pelaksanaan_akhir || u.tanggal_akhir;
        
        let tanggalText = '';
        if (tglMulai && tglAkhir) {
          tanggalText = `Uang Harian tanggal ${formatDateIndonesian(tglMulai)} s.d ${formatDateIndonesian(tglAkhir)}`;
        } else if (tglMulai) {
          tanggalText = `Uang Harian tanggal ${formatDateIndonesian(tglMulai)}`;
        } else {
          tanggalText = 'Uang Harian';
        }
        
        const nominal = u.total ? `${formatRupiah(u.total)}` : '';
        rows += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">${idx === 0 ? '2' : ''}</td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
              ${idx === 0 ? '<strong>Uang Harian</strong>' : ''}
              <div style="padding-left: 20px; font-size: 10px; margin-top: 2px;">
                ${tanggalText}
              </div>
            </td>
            <td class="text-right" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
              ${nominal}
            </td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;"></td>
          </tr>
        `;
      });
    } else if (uangHarianTotal > 0) {
      rows += `
        <tr>
          <td class="text-center" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">2</td>
          <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
            <strong>Uang Harian</strong>
          </td>
          <td class="text-right" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
            ${formatRupiah(uangHarianTotal)}
          </td>
          <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;"></td>
        </tr>
      `;
    }
    
    if (penginapanDetail.length > 0) {
      penginapanDetail.forEach((p, idx) => {
        const namaHotel = p.hotel || p.jenis || '-';
        const nominal = p.total ? `${formatRupiah(p.total)}` : '';
        rows += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">${idx === 0 ? '3' : ''}</td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
              ${idx === 0 ? '<strong>Penginapan</strong>' : ''}
              <div style="padding-left: 20px; font-size: 10px; margin-top: 2px;">
                ${namaHotel}
              </div>
            </td>
            <td class="text-right" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
              ${nominal}
            </td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;"></td>
          </tr>
        `;
      });
    } else if (penginapanTotal > 0) {
      rows += `
        <tr>
          <td class="text-center" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">3</td>
          <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
            <strong>Penginapan</strong>
          </td>
          <td class="text-right" style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;">
            ${formatRupiah(penginapanTotal)}
          </td>
          <td style="border: 1px solid #000; padding: 6px; vertical-align: top; border-bottom: none;"></td>
        </tr>
      `;
    }
    
    return rows;
  };

const generateSptjmPenginapanRows = (dataSource = null) => {
    const data = dataSource || penginapanSptjmList;
    if (data && data.length > 0) {
        return data.map((penginapan, idx) => {
            let namaDanAlamat = penginapan.nama_penginapan || '-';
            if (penginapan.alamat_penginapan) {
                namaDanAlamat += `, ${penginapan.alamat_penginapan}`;
            }
            
            const tglMenginapFormatted = penginapan.tgl_menginap ? formatDateIndonesian(penginapan.tgl_menginap) : '-';
            
            return `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; ${idx !== data.length - 1 ? 'border-bottom: 1px dashed #ccc;' : ''}">
                    <tbody>
                        <tr>
                            <td style="width: 180px; padding: 4px 0; vertical-align: top;">Nama dan Alamat Penginapan</td>
                            <td style="width: 15px; padding: 4px 0; text-align: center;">&nbsp;:</td>
                            <td style="padding: 4px 0 4px 8px; vertical-align: top;"><strong>&nbsp;${namaDanAlamat}</strong></td>
                        </tr>
                      
                        <tr>
                            <td style="width: 180px; padding: 4px 0; vertical-align: top;">Nomor kamar</td>
                            <td style="width: 15px; padding: 4px 0; text-align: center;">&nbsp;:</td>
                            <td style="padding: 4px 0 4px 8px; vertical-align: top;">&nbsp;${penginapan.nomor_kamar || '-'}</td>
                        </tr>
                        <tr>
                            <td style="width: 180px; padding: 4px 0; vertical-align: top;">Tarif hotel</td>
                            <td style="width: 15px; padding: 4px 0; text-align: center;">&nbsp;:</td>
                            <td style="padding: 4px 0 4px 8px; vertical-align: top;">&nbsp;Rp ${formatRupiah(penginapan.tarif_hotel)} / hari (tanggal ${tglMenginapFormatted})</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }).join('');
    } else if (penginapanDetail.length > 0) {
        return penginapanDetail.map((p, idx) => {
            let namaDanAlamat = p.hotel || p.jenis || '-';
            
            return `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; ${idx !== penginapanDetail.length - 1 ? 'border-bottom: 1px dashed #ccc;' : ''}">
                    <tbody>
                        <tr>
                            <td style="width: 180px; padding: 4px 0;">Nama dan Alamat Penginapan</td>
                            <td style="width: 10px; padding: 4px 0;">&nbsp;:</td>
                            <td style="padding: 4px 0;"><strong>&nbsp;${namaDanAlamat}</strong></td>
                        </tr>
                        <tr>
                            <td style="width: 180px; padding: 4px 0;">Nomor kamar</td>
                            <td style="width: 10px; padding: 4px 0;">&nbsp;:</td>
                            <td style="padding: 4px 0;">&nbsp;-</td>
                        </tr>
                        <tr>
                            <td style="width: 180px; padding: 4px 0;">Tarif hotel</td>
                            <td style="width: 10px; padding: 4px 0;">&nbsp;:</td>
                            <td style="padding: 4px 0;">&nbsp;Rp ${formatRupiah(p.total)} / hari</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }).join('');
    }
    return '<div style="color: #999; text-align: center; padding: 20px;">Tidak ada data penginapan</div>';
};

  // Fungsi untuk cetak Kwitansi — render PDF ke canvas, lalu tampilkan sebagai gambar
  const handlePrintKwitansi = async () => {
    setLoading(true);
    
    // Ambil SPTJM data langsung dari API
    const kwitansiId = item?.kwitansi_id || item?.id;
    let sptjmData = [];
    let penginapanData = [];
    
    if (kwitansiId && session?.accessToken) {
      try {
        const headers = { Authorization: `Bearer ${session.accessToken}` };
        const [transportRes, penginapanRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-transport/${kwitansiId}`, { headers }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-penginapan/${kwitansiId}`, { headers })
        ]);
        if (transportRes.data.success) sptjmData = transportRes.data.data || [];
        if (penginapanRes.data.success) penginapanData = penginapanRes.data.data || [];
      } catch (e) {
        console.error('Error fetching SPTJM for print:', e);
      }
    }
    
    // Fallback ke state jika fetch gagal
    if (sptjmData.length === 0) sptjmData = sptjmList;
    if (penginapanData.length === 0) penginapanData = penginapanSptjmList;

    // === RENDER SEMUA FILE PDF KE CANVAS ===
    const allFileUrls = [];
    sptjmData.forEach(s => { if (s.files) s.files.forEach(f => { if (f.file_path) allFileUrls.push({ id: f.id, url: BACKEND_URL + f.file_path, name: f.file_name, type: 'transport', parent: s }); }); });
    penginapanData.forEach(p => { if (p.files) p.files.forEach(f => { if (f.file_path) allFileUrls.push({ id: f.id, url: BACKEND_URL + f.file_path, name: f.file_name, type: 'penginapan', parent: p }); }); });
    
    // Map untuk menyimpan hasil render: fileId -> [dataUrl, ...]
    const renderedPages = {};
    
    if (allFileUrls.length > 0) {
      // Load PDF.js dari CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });
      
      const pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      for (const file of allFileUrls) {
        try {
          const resp = await fetch(file.url);
          const arrayBuffer = await resp.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            pages.push(canvas.toDataURL('image/png'));
          }
          renderedPages[file.id] = pages;
        } catch (e) {
          console.error('Error rendering PDF:', file.name, e);
        }
      }
    }
    
    // === GENERATE HTML ===
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    
    const ttdPegawaiHtml = ttdPegawaiUrl
      ? `<img src="${ttdPegawaiUrl}" style="max-height:50px;max-width:150px;object-fit:contain;" />`
      : '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';

    const ttdPpkHtml = ttdPpkUrl
      ? `<img src="${ttdPpkUrl}" style="max-height:50px;max-width:150px;object-fit:contain;" />`
      : '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';

    const ttdBendaharaHtml = ttdBendaharaUrl
      ? `<img src="${ttdBendaharaUrl}" style="max-height:50px;max-width:150px;object-fit:contain;" />`
      : '<div class="ttd-placeholder">(Tanda tangan digital tidak tersedia)</div>';

    const kegiatanText = kegiatan?.kegiatan || '-';
    const makText = kegiatan?.mak || '-';

    const hasSptjm = sptjmData && sptjmData.length > 0;
    
    let sptjmTableRows = '';
    
    if (hasMultipleTransport) {
      transportDetail.forEach((t, idx) => {
        const itemTotal = Number(t.total) || 0;
        const uraian = t.transport || t.trans || '-';
        sptjmTableRows += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px;">${uraian}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 6px;">Rp ${formatRupiah(itemTotal)}</td>
          </tr>
        `;
      });
    } else if (hasSptjm && sptjmData.length > 0) {
      sptjmData.forEach((sptjm, idx) => {
        let uraian = sptjm.jenis_transport || '-';
        if (sptjm.nama_maskapai) {
          uraian += ` ${sptjm.nama_maskapai}`;
        }
        if (sptjm.kode_penerbangan) {
          uraian += ` (${sptjm.kode_penerbangan})`;
        }
        if (sptjm.nomor_kursi && sptjm.nomor_kursi !== '-') {
          uraian += ` - Kursi: ${sptjm.nomor_kursi}`;
        }
        
        const nominal = idx === 0 ? `Rp ${formatRupiah(totalTransportFromNominatif)}` : '-';
        
        sptjmTableRows += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px;">${uraian}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 6px;">${nominal}</td>
          </tr>
        `;
      });
    } else if (transportDetail.length > 0) {
      transportDetail.forEach((t, idx) => {
        const itemTotal = Number(t.total) || 0;
        const uraian = t.transport || t.trans || '-';
        sptjmTableRows += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px;">${uraian}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 6px;">Rp ${formatRupiah(itemTotal)}</td>
          </tr>
        `;
      });
    } else {
      sptjmTableRows = `
        <tr>
          <td class="text-center" style="border: 1px solid #000; padding: 6px;">1</td>
          <td style="border: 1px solid #000; padding: 6px;">Transportasi Perjalanan Dinas</td>
          <td class="text-right" style="border: 1px solid #000; padding: 6px;">Rp ${formatRupiah(totalTransportFromNominatif)}</td>
        </tr>
      `;
    }

    const sptjmPenginapanRows = generateSptjmPenginapanRows(penginapanData);
    const kwitansiRows = generateKwitansiRows();

    // Build HTML untuk lampiran file transport
    let sptjmFilesHtml = '';
    sptjmData.forEach((sptjm, idx) => {
      if (sptjm.files && sptjm.files.length > 0) {
        sptjmFilesHtml += '<div style="margin: 10px 0;"><strong>File Transport ' + (idx + 1) + (sptjm.jenis_transport ? ' - ' + sptjm.jenis_transport : '') + ':</strong></div>';
        sptjm.files.forEach(file => {
          if (file.id && renderedPages[file.id]) {
            renderedPages[file.id].forEach(pageData => {
              sptjmFilesHtml += '<div style="margin: 10px 0; text-align: center;"><img src="' + pageData + '" style="max-width: 100%; border: 1px solid #ccc;" /></div>';
            });
          }
        });
      }
    });
    
    // Build HTML untuk lampiran file penginapan
    let penginapanFilesHtml = '';
    penginapanData.forEach((penginapan, idx) => {
      if (penginapan.files && penginapan.files.length > 0) {
        penginapanFilesHtml += '<div style="margin: 10px 0;"><strong>File Penginapan ' + (idx + 1) + (penginapan.nama_penginapan ? ' - ' + penginapan.nama_penginapan : '') + ':</strong></div>';
        penginapan.files.forEach(file => {
          if (file.id && renderedPages[file.id]) {
            renderedPages[file.id].forEach(pageData => {
              penginapanFilesHtml += '<div style="margin: 10px 0; text-align: center;"><img src="' + pageData + '" style="max-width: 100%; border: 1px solid #ccc;" /></div>';
            });
          }
        });
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kwitansi dan SPTJM Perjalanan Dinas - ${pegawaiNama}</title>
        <meta charset="UTF-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Times New Roman', Times, serif; 
            background: #fff; 
            margin: 0; 
            padding: 30px; 
            font-size: 11px; 
          }
          .page-break { page-break-after: always; margin-bottom: 20px; }
          .kwitansi-container { border: 1px solid #000; padding: 20px 25px; position: relative; max-width: 800px; margin: 0 auto; }
          .sptjm-container { border: 1px solid #000; padding: 20px 25px; position: relative; max-width: 800px; margin: 0 auto; }
          .approved-stamp { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); 
            font-size: 48px; font-weight: bold; color: rgba(34, 197, 94, 0.12); 
            white-space: nowrap; pointer-events: none; border: 3px solid rgba(34, 197, 94, 0.2); 
            padding: 10px 20px; border-radius: 10px; 
          }
          .header { display: flex; justify-content: flex-end; margin-bottom: 15px; }
          .info-box { border: 1px solid #000; padding: 5px 12px; min-width: 220px; }
          .info-row { display: flex; gap: 8px; line-height: 1.4; }
          .label { min-width: 35px; }
          .bukti-kas { margin-top: 5px; padding-top: 3px; border-top: 1px dashed #000; font-weight: bold; font-size: 11px; }
          .title { text-align: center; font-size: 12px; font-weight: bold; margin: 15px 0 10px; }
          .lampiran { font-size: 11px; margin: 10px 0 5px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
          th { background-color: #f5f5f5; text-align: center; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .signature-wrapper { margin-top: 40px; }
          .signature-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .signature-header-left, .signature-header-right { width: 48%; text-align: left; }
          .signature-title { display: flex; justify-content: space-between; margin: 15px 0; }
          .signature-title-left, .signature-title-right { width: 48%; text-align: left; font-weight: bold; }
          .signature-ttd { display: flex; justify-content: space-between; margin: 10px 0; }
          .signature-ttd-left, .signature-ttd-right { width: 48%; text-align: left; }
          .signature-ttd-image { min-height: 60px; display: flex; align-items: center; }
          .signature-name { display: flex; justify-content: space-between; margin: 10px 0; }
          .signature-name-left, .signature-name-right { width: 48%; text-align: left; font-weight: bold; }
          .signature-nip { display: flex; justify-content: space-between; margin: 5px 0; }
          .signature-nip-left, .signature-nip-right { width: 48%; text-align: left; font-size: 9px; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; }
          .ppk-wrapper { margin-top: 25px; text-align: center; width: 50%; margin-left: auto; }
          .ppk-label { font-size: 11px; margin-bottom: 5px; }
          .ppk-image { min-height: 60px; display: flex; justify-content: center; align-items: center; margin: 10px 0; }
          .ppk-line { border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; font-weight: bold; font-size: 11px; }
          .ppk-nip { font-size: 9px; margin-top: 3px; }
          .sptjm-title { text-align: center; font-size: 14px; font-weight: bold; margin: 20px 0 15px; text-transform: uppercase; }
          .sptjm-text { margin: 10px 0; line-height: 1.5; text-align: justify; }
          .sptjm-data-table { width: 100%; border: none; margin: 10px 0; border-collapse: collapse; }
          .sptjm-data-table td { border: none; padding: 4px 0; vertical-align: top; }
          .sptjm-signature { margin-top: 40px; display: flex; justify-content: flex-end; }
          .sptjm-signature-box { text-align: center; width: 250px; }
          .sptjm-signature-nip { font-size: 9px; margin-top: 3px; }
          .no-print { text-align: center; margin-top: 20px; }
          @media print { 
            body { padding: 0; margin: 0; } 
            .kwitansi-container, .sptjm-container { border: none; padding: 15px; margin: 0; }
            .page-break { page-break-after: always; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="kwitansi-container">
          <div class="header">
            <div class="info-box">
              <div class="info-row"><div class="label">TA</div><div>: ${new Date().getFullYear()}</div></div>
              <div class="info-row"><div class="label">MAK</div><div>: ${makText}</div></div>
              <div class="bukti-kas">BUKTI KAS</div>
            </div>
          </div>
          <div class="title">${kegiatanText}</div>
          <div class="lampiran" style="margin: 10px 0 5px 0;">
            <div style="display: flex; align-items: baseline; margin-bottom: 2px;">
              <div style="width: 120px;">Lampiran SPD Nomor</div>
              <div style="width: 15px;">:</div>
              <div style="flex: 1;">${noSpt}</div>
            </div>
            <div style="display: flex; align-items: baseline;">
              <div style="width: 120px;">Tanggal SPD</div>
              <div style="width: 15px;">:</div>
              <div style="flex: 1;">${tglSpd}</div>
            </div>
          </div>
          <table>
            <thead><tr><th style="width:8%">NO</th><th style="width:47%">PERINCIAN BIAYA</th><th style="width:20%">JUMLAH</th><th style="width:25%">KETERANGAN</th></tr></thead>
            <tbody>
              ${kwitansiRows}
              <tr style="font-weight:bold;"><td colspan="2" class="text-center" style="border: 1px solid #000; padding: 6px;">JUMLAH</td><td class="text-right" style="border: 1px solid #000; padding: 6px;">${formatRupiah(totalBiaya)}</td><td style="border: 1px solid #000; padding: 6px;"></td></tr>
              <tr><td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: center;"><strong>Terbilang : ${terbilang(totalBiaya)}</strong></td></tr>
            </tbody>
          </table>
          <div class="signature-wrapper" style="margin-top: 10px;">
            <div class="signature-header" style="margin-bottom: 2px;"><div class="signature-header-left">&nbsp;</div><div class="signature-header-right">Palangka Raya, ${todayFormatted}</div></div>
            <div class="signature-header" style="margin-bottom: 2px;"><div class="signature-header-left">Telah Dibayar Sejumlah</div><div class="signature-header-right">Telah menerima jumlah uang sebesar</div></div>
            <div class="signature-header" style="margin-bottom: 15px;"><div class="signature-header-left">Rp ${formatRupiah(totalBiaya)}</div><div class="signature-header-right">Rp ${formatRupiah(totalBiaya)}</div></div>
            <div class="signature-title" style="margin-bottom: 5px;"><div class="signature-title-left">Bendahara Pengeluaran,</div><div class="signature-title-right">Yang Menerima,</div></div>
            <div class="signature-ttd" style="margin-bottom: 5px;"><div class="signature-ttd-left"><div class="signature-ttd-image" style="min-height: 50px;">${ttdBendaharaHtml}</div></div><div class="signature-ttd-right"><div class="signature-ttd-image" style="min-height: 50px;">${ttdPegawaiHtml}</div></div></div>
            <div class="signature-name" style="margin-bottom: 2px;"><div class="signature-name-left">${bendaharaNama}</div><div class="signature-name-right">${pegawaiNama}</div></div>
            <div class="signature-nip"><div class="signature-nip-left" style="font-size: 9px;">NIP. ${kegiatan?.bendahara_nip || '-'}</div><div class="signature-nip-right" style="font-size: 9px;">NIP. ${pegawaiNip}</div></div>
          </div>
          <div style="border-top: 1px solid #000; margin: 20px 0 10px 0;"></div>
          <div class="footer" style="display: flex; justify-content: center;">
            <div style="width: 520px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span></span><span style="font-weight: bold;">PERHITUNGAN SPD RAMPUNG</span><span></span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Ditetapkan sejumlah : <span style="letter-spacing: 2px;"></span></span><span>Rp ${formatRupiah(totalBiaya)}</span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Yang telah dibayar semula : <span style="letter-spacing: 2px;"></span></span><span>-</span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Sisa kurang/lebih : <span style="letter-spacing: 2px;"></span></span><span>Rp ${formatRupiah(totalBiaya)}</span></div>
            </div>
          </div>
          <div class="ppk-wrapper" style="margin-top: 25px; text-align: center; width: 50%; margin-left: auto;">
            <div class="ppk-label" style="font-size: 11px; margin-bottom: 5px;">An. KUASA PENGGUNA ANGGARAN<br/>BALAI BESAR PENGAWAS OBAT DAN MAKANAN<br/>DI PALANGKA RAYA</div>
            <div class="ppk-label" style="font-size: 11px; margin-bottom: 5px; margin-top: 15px;">Pembuat Komitmen,</div>
            <div class="ppk-image" style="min-height: 60px; display: flex; justify-content: center; align-items: center; margin: 10px 0;">${ttdPpkHtml}</div>
            <div class="ppk-line" style="font-weight: normal; font-size: 11px; margin-top: 5px; border-top: none;">${ppkNama}</div>
            <div class="ppk-nip" style="font-size: 9px; margin-top: 3px;">NIP. ${kegiatan?.ppk_nip || '-'}</div>
          </div>
        </div>

        <div class="page-break"></div>
        <div class="sptjm-container">
          <div class="sptjm-title">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</div>
          <div class="sptjm-text">Yang bertandatangan dibawah ini saya :</div>
          <table class="sptjm-data-table"><tbody>
            <tr><td style="width: 180px;">Nama Lengkap</td><td style="width: 20px; text-align: center;">:</td><td><strong>${pegawaiNama}</strong></td></tr>
            <tr><td style="width: 180px;">NIP.</td><td style="width: 20px; text-align: center;">:</td><td><strong>${pegawaiNip}</strong></td></tr>
            <tr><td style="width: 180px;">Jabatan</td><td style="width: 20px; text-align: center;">:</td><td><strong>${pegawaiJabatan}</strong></td></tr>
          </tbody></table>
          <div class="sptjm-text">Sesuai dengan Surat Perintah Dinas (SPD) Nomor <strong>${noSpt}</strong> tanggal <strong>${tglSpd}</strong>, dengan ini menyatakan bahwa :</div>
          <div class="sptjm-text">1. Tiket yang saya sampaikan sebagai pertanggungjawaban adalah benar asli, dengan menggunakan penerbangan sebagai berikut :</div>
          <table style="margin: 10px 0; width: 100%; border-collapse: collapse;"><thead><tr><th style="width:8%; border:1px solid #000; padding:6px;">No</th><th style="width:67%; border:1px solid #000; padding:6px;">Uraian</th><th style="width:25%; border:1px solid #000; padding:6px;">Jumlah</th></tr></thead><tbody>${sptjmTableRows}</tbody></table>
          <div class="sptjm-text">2. Jika dikemudian hari terdapat ketidaksesuaian, saya bersedia mempertanggungjawabkan dan mengembalikan ke Kas Negara.</div>
          <div class="sptjm-text">Demikian surat pernyataan ini saya buat untuk dapat digunakan sebagaimana mestinya.</div>
          <div class="sptjm-signature" style="margin-top: 40px; display: flex; justify-content: flex-end;">
            <div class="sptjm-signature-box" style="text-align: center; width: 250px;">
              <div>Palangka Raya, ${todayFormatted}</div>
              <div>Yang membuat pernyataan dan</div>
              <div>melakukan Perjalanan Dinas</div>
              <div style="min-height: 60px; display: flex; justify-content: center; align-items: center; margin: 15px 0;">${ttdPegawaiHtml}</div>
              <div class="sptjm-signature-name" style="font-weight: bold; margin-top: 5px;">${pegawaiNama}</div>
              <div class="sptjm-signature-nip" style="font-size: 9px; margin-top: 3px;">NIP. ${pegawaiNip}</div>
            </div>
          </div>
        </div>

        <div class="page-break"></div>
        <div class="sptjm-container">
          <div class="sptjm-title">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</div>
          <div class="sptjm-text">Yang bertandatangan dibawah ini saya :</div>
          <table class="sptjm-data-table"><tbody>
            <tr><td style="width: 180px;">Nama Lengkap</td><td style="width: 20px;">:</td><td><strong>${pegawaiNama}</strong></td></tr>
            <tr><td style="width: 180px;">NIP.</td><td style="width: 20px;">:</td><td><strong>${pegawaiNip}</strong></td></tr>
            <tr><td style="width: 180px;">Jabatan</td><td style="width: 20px;">:</td><td><strong>${pegawaiJabatan}</strong></td></tr>
          </tbody></table>
          <div class="sptjm-text">Sesuai dengan Surat Perintah Dinas (SPD) Nomor <strong>${noSpt}</strong> tanggal <strong>${tglSpd}</strong>, dengan ini menyatakan bahwa :</div>
          <div class="sptjm-text">1. Bukti penginapan yang saya sampaikan sebagai pertanggungjawaban adalah benar asli, dengan tempat penginapan sebagai berikut:</div>
          ${sptjmPenginapanRows}
          <div class="sptjm-text">2. Jika dikemudian hari terdapat ketidaksesuaian, saya bersedia mempertanggungjawabkan dan mengembalikan ke Kas Negara.</div>
          <div class="sptjm-text">Demikian surat pernyataan ini saya buat untuk dapat digunakan sebagaimana mestinya.</div>
          <div class="sptjm-signature" style="margin-top: 40px; display: flex; justify-content: flex-end;">
            <div class="sptjm-signature-box" style="text-align: center; width: 250px;">
              <div>Palangka Raya, ${todayFormatted}</div>
              <div>Yang membuat pernyataan dan</div>
              <div>melakukan Perjalanan Dinas</div>
              <div style="min-height: 60px; display: flex; justify-content: center; align-items: center; margin: 15px 0;">${ttdPegawaiHtml}</div>
              <div class="sptjm-signature-name" style="font-weight: bold; margin-top: 5px;">${pegawaiNama}</div>
              <div class="sptjm-signature-nip" style="font-size: 9px; margin-top: 3px;">NIP. ${pegawaiNip}</div>
            </div>
          </div>
        </div>

        ${allFileUrls.filter(f => f.type === 'transport').length > 0 ? `
        <div class="page-break"></div>
        <div class="sptjm-container">
          <div style="text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 15px;">LAMPIRAN FILE TRANSPORT</div>
          ${sptjmFilesHtml}
        </div>
        ` : ''}

        ${allFileUrls.filter(f => f.type === 'penginapan').length > 0 ? `
        <div class="page-break"></div>
        <div class="sptjm-container">
          <div style="text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 15px;">LAMPIRAN FILE PENGINAPAN</div>
          ${penginapanFilesHtml}
        </div>
        ` : ''}

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print();setTimeout(function(){window.close();}, 500);" style="padding:10px 20px;margin-right:10px;cursor:pointer;">💾 Save to PDF</button>
          <button onclick="window.close();" style="padding:10px 20px;cursor:pointer;">Tutup</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setLoading(false);
  };

  // ==================== FUNGSI CETAK LPD ====================
  const handlePrintLPD = async () => {
    const kegiatanId = kegiatan?.id;
    if (!kegiatanId) {
      alert('Data kegiatan tidak ditemukan');
      return;
    }

    setIsPrintingLpd(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lpd/print/${kegiatanId}`, {
        headers: { 'Authorization': `Bearer ${session?.accessToken}` }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Gagal mengambil data LPD');
      }
      
      const lpdData = result.data;
      
      // ============ AMBIL DATA DARI RESPONSE API LPD ============
      const tglMulai = lpdData?.tgl_mulai;
      const tglSelesai = lpdData?.tgl_selesai;
      const tempatPelaksanaan = lpdData?.tempat_pelaksanaan || '-';
      const noSt = lpdData?.no_st || '-';
      const tglSt = lpdData?.tgl_st;
      const makKegiatan = lpdData?.mak || '-';
      const namaKegiatan = lpdData?.nama_kegiatan || '-';
      
      // Data TTD dari response
      let ttdKabalaiPath = lpdData?.ttd_kabalai_path || '';
      let ttdKabalaiNama = lpdData?.ttd_kabalai || lpdData?.kabalai_nama || '-';
      let ttdKabalaiNip = lpdData?.kabalai_nip || '-';
      
      const getTtdImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('/uploads')) return `${BACKEND_URL}${path}`;
        return `${BACKEND_URL}/uploads/ttd/${path}`;
      };
      
      const ttdKabalaiUrl = getTtdImageUrl(ttdKabalaiPath);
      
      const pegawaiList = lpdData?.petugas_pelaksana || [];
      const rincianKegiatan = lpdData?.rincian_kegiatan || [];
      const dokumentasi = lpdData?.dokumentasi || [];
      
      console.log('📋 LPD Print Data from API:', {
        tglMulai,
        tglSelesai,
        tempatPelaksanaan,
        namaKegiatan,
        ttdKabalaiNama,
        pegawaiCount: pegawaiList.length
      });
      
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.width = '0px';
      printFrame.style.height = '0px';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
      const printDocument = printFrame.contentWindow.document;
      
      const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      const formatTanggal = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return `${d.getDate().toString().padStart(2, '0')} ${namaBulan[d.getMonth()]} ${d.getFullYear()}`;
      };
      
      const hitungLamaPerjalanan = () => {
        if (!tglMulai || !tglSelesai) return '-';
        const start = new Date(tglMulai);
        const end = new Date(tglSelesai);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} (${diffDays} hari)`;
      };
      
      const generatePegawaiHTML = () => {
        if (pegawaiList.length === 0) {
          return '<tr><td colspan="2">- Tidak ada data -</td></tr>';
        }
        let html = '';
        pegawaiList.forEach((p, idx) => {
          if (idx > 0) html += '<tr><td colspan="2" style="height: 8px;"></td></tr>';
          html += `
            <tr><td class="label-cell" style="width: 170px;">Nama</td><td class="value-cell">: ${p.nama || '-'}</td></tr>
            <tr><td class="label-cell" style="width: 170px;">NIP</td><td class="value-cell">: ${p.nip || '-'}</td></tr>
            <tr><td class="label-cell" style="width: 170px;">Pangkat / Golongan</td><td class="value-cell">: ${p.pangkat_golongan || '-'}</td></tr>
            <tr><td class="label-cell" style="width: 170px;">Jabatan</td><td class="value-cell">: ${p.jabatan || '-'}</td></tr>
          `;
        });
        return html;
      };
      
      const generateRincianHTML = () => {
        if (rincianKegiatan.length === 0) {
          return '<tr><td colspan="3" style="text-align: center;">- Tidak ada rincian kegiatan -</td></tr>';
        }
        return rincianKegiatan.map((item, idx) => `
          <tr><td style="text-align: center;">${idx + 1}</td><td style="text-align: center;">${formatTanggalRincian(item.tanggal)}</td><td>${item.kegiatan || '-'}</td></tr>
        `).join('');
      };
      
      const generateDokumentasiHTML = () => {
        if (dokumentasi.length === 0) return '<p>- Tidak ada dokumentasi -</p>';
        return `
          <div class="dokumentasi-grid">
            ${dokumentasi.map(doc => {
              const filename = doc.file_path?.split('/').pop();
              const imageUrl = `${BACKEND_URL}/uploads/lpd-dokumentasi/${filename}`;
              if (doc.file_type?.startsWith('image/')) {
                return `<div class="dokumentasi-item"><img src="${imageUrl}" alt="${doc.keterangan || ''}" /><div class="keterangan">${doc.keterangan || ''}</div></div>`;
              }
              return `<div class="dokumentasi-item"><div class="file-placeholder">📄</div><div class="keterangan">${doc.file_name || 'File'}</div><div class="keterangan">${doc.keterangan || ''}</div></div>`;
            }).join('')}
          </div>
        `;
      };
      
      const logoSrc = '/images/badan_pom.png';
      const getHeaderDate = () => formatTanggal(lpdData?.created_at || new Date());
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan Perjalanan Dinas - ${namaKegiatan}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.3; background: white; margin: 0; padding: 20px; }
            .page-break { page-break-before: always; }
            .header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 20px; }
            .header-table td { border: 1px solid #000; padding: 6px; vertical-align: top; }
            .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
            .title-cell { text-align: center; font-weight: bold; font-size: 13pt; }
            .subtitle-cell { text-align: center; font-size: 11pt; }
            .label-cell-header { text-align: center; vertical-align: middle; width: 70px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; font-size: 12pt; margin-bottom: 8px; }
            .info-table-inline { width: 100%; border: none; margin: 5px 0; border-collapse: collapse; }
            .info-table-inline td { border: none; padding: 3px 0; vertical-align: top; }
            .info-table-inline .label-cell { font-weight: bold; white-space: nowrap; }
            .info-table-inline .value-cell { padding-left: 8px; }
            .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .table th, .table td { border: 1px solid #000; padding: 5px; vertical-align: top; }
            .table th { background-color: #f0f0f0; text-align: center; }
            .dokumentasi-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px; }
            .dokumentasi-item { width: 170px; text-align: center; }
            .dokumentasi-item img { width: 100%; height: 120px; object-fit: cover; border: 1px solid #ccc; }
            .dokumentasi-item .keterangan { font-size: 9pt; margin-top: 5px; }
            .file-placeholder { width: 100%; height: 120px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; font-size: 35px; }
            .signature-wrapper { margin-top: 30px; display: flex; justify-content: flex-end; }
            .signature-box { width: 45%; text-align: center; }
            .signature-title { font-weight: bold; margin-bottom: 8px; font-size: 11pt; }
            .signature-name { font-weight: bold; margin-top: 5px; }
            .signature-nip { font-size: 9pt; margin-top: 3px; }
            .signature-ttd-image { margin: 10px 0; }
            .footer { margin-top: 25px; text-align: center; font-size: 10pt; }
            @media print { body { margin: 0; padding: 0; } .page-break { page-break-before: always; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="page">
            <table class="header-table">
              <tr><td rowspan="2" class="logo-cell"><img src="${logoSrc}" style="width: 100px; height: 100px; object-fit: contain;" /></td>
                  <td class="title-cell" colspan="2"><strong>LAPORAN PERJALANAN DINAS (LPD)</strong></td>
                  <td class="label-cell-header" style="width: 100px; text-align: center;">Tanggal : <br> ${getHeaderDate()}</td></tr>
              <tr><td class="subtitle-cell" colspan="2">${namaKegiatan}</td>
                  <td class="label-cell-header" style="width: 180px; text-align: center;">Halaman : 1 dari 2</td></tr>
            </table>
            
            <div class="section"><div class="section-title">A. Dasar Pelaksanaan Kegiatan</div>
              <div class="section-content"><div class="info-row">Surat Perintah Melaksanakan Tugas Kepala Balai Besar Pengawas Obat dan Makanan Di Palangka Raya</div>
                <table class="info-table-inline"><tbody>
                  <tr><td class="label-cell" style="width: 65px;">Nomor</td><td class="value-cell">: ${noSt}</td></tr>
                  <tr><td class="label-cell" style="width: 65px;">Tanggal</td><td class="value-cell">: ${formatTanggal(tglSt)}</td></tr>
                </tbody></table>
              </div>
            </div>
            
            <div class="section"><div class="section-title">B. Petugas Pelaksana</div>
              <div class="section-content"><table class="info-table-inline"><tbody>${generatePegawaiHTML()}</tbody></table></div>
            </div>
            
            <div class="section"><div class="section-title">C. Waktu dan Tempat Pelaksanaan</div>
              <div class="section-content"><table class="info-table-inline"><tbody>
                <tr><td class="label-cell" style="width: 130px;">Lama Perjalanan</td><td class="value-cell">: ${hitungLamaPerjalanan()}</td></tr>
                <tr><td class="label-cell" style="width: 130px;">Tanggal</td><td class="value-cell">: ${formatTanggal(tglMulai)} s/d ${formatTanggal(tglSelesai)}</td></tr>
                <tr><td class="label-cell" style="width: 130px;">Tempat Pelaksanaan</td><td class="value-cell">: ${tempatPelaksanaan}</td></tr>
              </tbody></table></div>
            </div>
            
            <div class="section"><div class="section-title">D. Pembiayaan</div>
              <div class="section-content"><div class="info-row">DIPA BBPOM di Palangka Raya No.SP DIPA.63.01.2.432872/2026 Tanggal 24 Desember 2025.</div>
                <table class="info-table-inline"><tbody>
                  <tr><td class="label-cell" style="width: 130px;">Mata Anggaran :</td><td class="value-cell">${makKegiatan}</td></tr>
                </tbody></table>
              </div>
            </div>
            
            <div class="section"><div class="section-title">E. Rincian Hasil Kegiatan</div>
              <table class="table"><thead><tr><th style="width:5%">No</th><th style="width:20%">Tanggal</th><th style="width:75%">Kegiatan</th></tr></thead>
              <tbody>${generateRincianHTML()}</tbody></table>
            </div>
          </div>
          
          <div class="page-break"></div>
          
          <div class="page">
            <table class="header-table">
              <tr><td rowspan="2" class="logo-cell"><img src="${logoSrc}" style="width: 100px; height: 100px; object-fit: contain;" /></td>
                  <td class="title-cell" colspan="2"><strong>LAPORAN PERJALANAN DINAS (LPD)</strong></td>
                  <td class="label-cell-header" style="width: 100px; text-align: center;">Tanggal : <br> ${getHeaderDate()}</td></tr>
              <tr><td class="subtitle-cell" colspan="2">${namaKegiatan}</td>
                  <td class="label-cell-header" style="width: 180px; text-align: center;">Halaman : 2 dari 2</td></tr>
            </table>
            
            <div class="section"><div class="section-title">F. Dokumentasi Kegiatan</div>
              <div class="section-content">${generateDokumentasiHTML()}</div>
            </div>
            
            <div class="footer"><p>Laporan ini telah diverifikasi Kepala Bagian Tata Usaha/Ketua Tim Kerja</p></div>
            
            <div class="signature-wrapper"><div class="signature-box">
              <div class="signature-title">Kepala Balai Besar POM di Palangka Raya</div>
              ${ttdKabalaiUrl ? `<div class="signature-ttd-image"><img src="${ttdKabalaiUrl}" style="max-height:80px;max-width:200px;object-fit:contain;" /></div>` : '<div style="color:#999;margin:10px 0;">(Tanda tangan belum tersedia)</div>'}
              <div class="signature-name">${ttdKabalaiNama}</div>
              
            </div></div>
          </div>
          
          <div class="no-print" style="text-align:center;margin-top:20px;">
            <button onclick="window.print()" style="padding:8px 16px;margin:8px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:4px;">🖨️ Cetak LPD</button>
            <button onclick="window.close()" style="padding:8px 16px;margin:8px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:4px;">❌ Tutup</button>
          </div>
        </body>
        </html>
      `;
      
      printDocument.write(html);
      printDocument.close();
      printFrame.onload = () => setTimeout(() => printFrame.contentWindow.print(), 500);
      
    } catch (error) {
      console.error('Error printing LPD:', error);
      alert('Gagal mencetak LPD: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsPrintingLpd(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-20">
            <h3 className="text-lg font-medium">Preview Dokumen - ${pegawaiNama}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p className="text-gray-600">Pilih dokumen yang akan dicetak:</p>
            <div className="mt-2 flex justify-center gap-4">
              <div className="text-sm text-blue-600">📄 Kwitansi & SPTJM (3 halaman)</div>
              <div className="text-sm text-green-600">📋 LPD (2 halaman)</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handlePrintKwitansi} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex flex-col items-center">
              <span className="text-2xl mb-2">{loading ? '⏳' : '📄'}</span>
              <span className="font-medium">{loading ? 'Memproses file...' : 'Save to PDF (Lengkap)'}</span>
              <span className="text-xs mt-1">Kwitansi + SPTJM + File Pendukung</span>
            </button>
            <button onClick={handlePrintLPD} disabled={isPrintingLpd} className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex flex-col items-center">
              <span className="text-2xl mb-2">📋</span>
              <span className="font-medium">{isPrintingLpd ? '⏳ Memuat...' : 'Cetak LPD'}</span>
              <span className="text-xs mt-1">Laporan Perjalanan Dinas (2 halaman)</span>
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-800">📄 Keterangan Dokumen:</p>
            <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
              <li><strong>Kwitansi & SPTJM</strong> (3 halaman): Kwitansi perjalanan dinas, SPTJM Transport, SPTJM Penginapan</li>
              <li><strong>LPD</strong> (2 halaman): Laporan Perjalanan Dinas lengkap dengan dokumentasi</li>
            </ul>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}