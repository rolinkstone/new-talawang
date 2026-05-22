// components/kwitansi/KwitansiPrint.js
import React, { useState, useEffect } from 'react';
import { formatDateFn } from '../../utils/formatters';
import axios from 'axios';
import { useSession } from 'next-auth/react';

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
        console.log('📦 SPTJM Transport data from input:', response.data.data);
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
        console.log('📦 SPTJM Penginapan data from input:', response.data.data);
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
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const getImageUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      let cleanPath = path;
      if (cleanPath.startsWith('/api/')) cleanPath = cleanPath.replace('/api', '');
      if (!cleanPath.startsWith('/uploads')) {
        if (!cleanPath.includes('/')) cleanPath = `/uploads/ttd/${cleanPath}`;
        else cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
      }
      return `${baseUrl}${cleanPath}`;
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
  const todayFormatted = formatDateFn(today);
  
  // Tanggal SPD dari item (tgl_spd) atau fallback ke tgl_kwitansi
  const tglSpd = item?.tgl_spd ? formatDateFn(item.tgl_spd) : (item?.tgl_kwitansi ? formatDateFn(item.tgl_kwitansi) : todayFormatted);
  const tglKwitansi = item?.tgl_kwitansi ? formatDateFn(item.tgl_kwitansi) : todayFormatted;
  const noSpt = item?.no_lpd || pegawai?.no_lpd || '-';

  // Hitung total transport dari nominatif
  const totalTransportFromNominatif = transportDetail.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || transportTotal;
  const hasMultipleTransport = transportDetail.length > 1;
  const hasPenginapanSptjm = penginapanSptjmList && penginapanSptjmList.length > 0;

  const generateSptjmPenginapanRows = () => {
    if (hasPenginapanSptjm) {
      return penginapanSptjmList.map((penginapan, idx) => {
        // Gabungkan nama hotel dan alamat
        let namaDanAlamat = penginapan.nama_penginapan || '-';
        if (penginapan.alamat_penginapan) {
          namaDanAlamat += `, ${penginapan.alamat_penginapan}`;
        }
        
        // Hitung panjang maksimal label untuk perataan
        const labelNama = "Nama dan Alamat Penginapan";
        const labelKamar = "Nomor kamar";
        const labelTarif = "Tarif hotel";
        
        return `
          <div style="margin-bottom: 20px;">
            <div style="margin-bottom: 5px; display: flex;">
              <div style="width: 200px;">${labelNama}</div>
              <div style="flex: 1;">: ${namaDanAlamat}</div>
            </div>
            <div style="margin-bottom: 3px; display: flex;">
              <div style="width: 200px;">${labelKamar}</div>
              <div style="flex: 1;">: ${penginapan.nomor_kamar || '-'}</div>
            </div>
            <div style="display: flex;">
              <div style="width: 200px;">${labelTarif}</div>
              <div style="flex: 1;">: Rp ${formatRupiah(penginapan.tarif_hotel)}/ hari tanggal ${penginapan.tgl_menginap ? formatDateFn(penginapan.tgl_menginap) : '-'}</div>
            </div>
          </div>
        `;
      }).join('');
    } else if (penginapanDetail.length > 0) {
      return penginapanDetail.map((p, idx) => {
        let namaDanAlamat = p.hotel || p.jenis || '-';
        
        const labelNama = "Nama dan Alamat Penginapan";
        const labelKamar = "Nomor kamar";
        const labelTarif = "Tarif hotel";
        
        return `
          <div style="margin-bottom: 20px;">
            <div style="margin-bottom: 5px; display: flex;">
              <div style="width: 200px;"><strong>${labelNama}</strong></div>
              <div style="flex: 1;">: ${namaDanAlamat}</div>
            </div>
            <div style="margin-bottom: 3px; display: flex;">
              <div style="width: 200px;"><strong>${labelKamar}</strong></div>
              <div style="flex: 1;">: -</div>
            </div>
            <div style="display: flex;">
              <div style="width: 200px;"><strong>${labelTarif}</strong></div>
              <div style="flex: 1;">: Rp ${formatRupiah(p.total)}/ hari</div>
            </div>
          </div>
        `;
      }).join('');
    }
    return '<div style="color: #999;">Tidak ada data penginapan</div>';
  };

  const handlePrint = () => {
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

    const transportRows = transportDetail.map(t => `<div>${t.transport || t.trans || '-'}</div>`).join('');
    const uangHarianRows = uangHarianDetail.map(u => `<div>${u.qty || 0} hari</div>`).join('');
    const penginapanRows = penginapanDetail.map(p => `<div>${p.hotel || 'Hotel'}</div>`).join('');

    const hasSptjm = sptjmList && sptjmList.length > 0;
    
    // Generate tabel SPTJM Transport
    let sptjmTableRows = '';
    
    if (hasMultipleTransport) {
      console.log('📋 Multiple transport detected, using nominatif data');
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
    } else if (hasSptjm && sptjmList.length > 0) {
      console.log('📋 Single transport detected, using SPTJM data from input');
      sptjmList.forEach((sptjm, idx) => {
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

    // Generate SPTJM Penginapan rows
    const sptjmPenginapanRows = generateSptjmPenginapanRows();

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
          .page-break {
            page-break-after: always;
            margin-bottom: 20px;
          }
          .kwitansi-container { 
            border: 1px solid #000; 
            padding: 20px 25px; 
            position: relative;
            max-width: 800px;
            margin: 0 auto;
          }
          .sptjm-container {
            border: 1px solid #000;
            padding: 20px 25px;
            position: relative;
            max-width: 800px;
            margin: 0 auto;
          }
          .approved-stamp { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate(-25deg); 
            font-size: 48px; 
            font-weight: bold; 
            color: rgba(34, 197, 94, 0.12); 
            white-space: nowrap; 
            pointer-events: none; 
            border: 3px solid rgba(34, 197, 94, 0.2); 
            padding: 10px 20px; 
            border-radius: 10px; 
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
          .text-left { text-align: left; }
          .jumlah-total { text-align: right; font-weight: bold; margin-top: 8px; font-size: 11px; }
          .terbilang { margin-top: 8px; font-size: 11px; }
          
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
          .payment-amount { font-weight: bold; margin: 3px 0; }
          
          .footer { margin-top: 30px; text-align: center; font-size: 10px; }
          .footer-box { border: 1px solid #000; padding: 8px; margin-top: 15px; }
          .footer-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-amount { font-weight: bold; }
          
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
          .sptjm-signature-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 5px; font-weight: bold; }
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
        <!-- Halaman 1: Kwitansi -->
        <div class="kwitansi-container">
          ${isFullyApproved ? '<div class="approved-stamp">✓ DISETUJUI</div>' : ''}
          
          <div class="header">
            <div class="info-box">
              <div class="info-row"><div class="label">TA</div><div>: ${new Date().getFullYear()}</div></div>
              <div class="info-row"><div class="label">MAK</div><div>: ${makText}</div></div>
              <div class="bukti-kas">BUKTI KAS</div>
            </div>
          </div>

          <div class="title">${kegiatanText}</div>

          <div class="lampiran">
            Lampiran SPD Nomor  : ${noSpt}<br/>
            Tanggal SPD         : ${tglSpd}<br/>
          </div>

          <table>
            <thead>
              <tr><th style="width:8%">NO</th><th style="width:47%">PERINCIAN BIAYA</th><th style="width:20%">JUMLAH</th><th style="width:25%">KETERANGAN</th></tr>
            </thead>
            <tbody>
              <tr><td class="text-center">1.</td><td class="text-left">Transport</td><td class="text-right">Rp ${formatRupiah(transportTotal)}</td><td class="text-left">${transportRows || '-'}</td></tr>
              <tr><td class="text-center">2.</td><td class="text-left">Uang Harian<\/td><td class="text-right">Rp ${formatRupiah(uangHarianTotal)}<\/td><td class="text-left">${uangHarianRows || '-'}<\/td><\/tr>
              <tr><td class="text-center">3.<\/td><td class="text-left">Penginapan<\/td><td class="text-right">Rp ${formatRupiah(penginapanTotal)}<\/td><td class="text-left">${penginapanRows || '-'}<\/td><\/tr>
              <tr style="font-weight:bold;"><td colspan="2" class="text-right">JUMLAH<\/td><td class="text-right">Rp ${formatRupiah(totalBiaya)}<\/td><td class="text-left"><\/td><\/tr>
            <\/tbody>
          <\/table>

          <div class="jumlah-total">JUMLAH : Rp ${formatRupiah(totalBiaya)}<\/div>
          <div class="terbilang">Terbilang : "${terbilang(totalBiaya)}"<\/div>

          <div class="signature-wrapper">
            <div class="signature-header">
              <div class="signature-header-left">
                <div>Palangka Raya, ${todayFormatted}<\/div>
                <div class="payment-amount">Telah Dibayar Sejumlah<\/div>
                <div class="payment-amount">Rp ${formatRupiah(totalBiaya)}<\/div>
              <\/div>
              <div class="signature-header-right">
                <div>Telah menerima jumlah uang sebesar<\/div>
                <div class="payment-amount">Rp ${formatRupiah(totalBiaya)}<\/div>
              <\/div>
            <\/div>

            <div class="signature-title">
              <div class="signature-title-left">Bendahara Pengeluaran,<\/div>
              <div class="signature-title-right">Yang Menerima,<\/div>
            <\/div>

            <div class="signature-ttd">
              <div class="signature-ttd-left"><div class="signature-ttd-image">${ttdBendaharaHtml}<\/div><\/div>
              <div class="signature-ttd-right"><div class="signature-ttd-image">${ttdPegawaiHtml}<\/div><\/div>
            <\/div>

            <div class="signature-name">
              <div class="signature-name-left">${bendaharaNama}<\/div>
              <div class="signature-name-right">${pegawaiNama}<\/div>
            <\/div>

            <div class="signature-nip">
              <div class="signature-nip-left">NIP. ${kegiatan?.bendahara_nip || '-'}<\/div>
              <div class="signature-nip-right">NIP. ${pegawaiNip}<\/div>
            <\/div>
          <\/div>

          <div class="footer">
            <div class="footer-box">
              <div class="footer-row"><span>PERHITUNGAN SPD RAMPUNG<\/span><span class="total-amount">Rp ${formatRupiah(totalBiaya)}<\/span><\/div>
              <div class="footer-row"><span>Ditetapkan sejumlah<\/span><span class="total-amount">Rp ${formatRupiah(totalBiaya)}<\/span><\/div>
              <div class="footer-row"><span>Yang telah dibayarkan semula<\/span><span>-<\/span><\/div>
              <div class="footer-row"><span>Sisa kurang/lebih<\/span><span class="total-amount">Rp ${formatRupiah(totalBiaya)}<\/span><\/div>
            <\/div>
          <\/div>

          <div class="ppk-wrapper">
            <div class="ppk-label">An. KUASA PENGGUNA ANGGARAN<br\/>BALAI BESAR PENGAWAS OBAT DAN MAKANAN<br\/>DI PALANGKA RAYA<\/div>
            <div class="ppk-label" style="margin-top: 15px;">Pembuat Komitmen,<\/div>
            <div class="ppk-image">${ttdPpkHtml}<\/div>
            <div class="ppk-line">${ppkNama}<\/div>
            <div class="ppk-nip">NIP. ${kegiatan?.ppk_nip || '-'}<\/div>
          <\/div>
        <\/div>

        <!-- Page Break untuk halaman 2 - SPTJM Transport -->
        <div class="page-break"><\/div>

        <!-- Halaman 2: SPTJM Transport (Surat Pernyataan Tanggung Jawab Mutlak) -->
        <div class="sptjm-container">
          <div class="sptjm-title">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK<\/div>
          
          <div class="sptjm-text">
            Yang bertandatangan dibawah ini saya :
          <\/div>
          
          <table class="sptjm-data-table">
            <tbody>
              <tr>
                <td style="width: 180px;">Nama Lengkap<\/td>
                <td style="width: 20px; text-align: center;">:<\/td>
                <td><strong>${pegawaiNama}<\/strong><\/td>
              <\/tr>
              <tr>
                <td style="width: 180px;">NIP.<\/td>
                <td style="width: 20px; text-align: center;">:<\/td>
                <td><strong>${pegawaiNip}<\/strong><\/td>
              <\/tr>
              <tr>
                <td style="width: 180px;">Jabatan<\/td>
                <td style="width: 20px; text-align: center;">:<\/td>
                <td><strong>${pegawaiJabatan}<\/strong><\/td>
              <\/tr>
            <\/tbody>
          <\/table>
          
          <div class="sptjm-text">
            Sesuai dengan Surat Perintah Dinas (SPD) Nomor <strong>${noSpt}<\/strong> 
            tanggal <strong>${tglSpd}<\/strong>, dengan ini menyatakan bahwa :
          <\/div>
          
          <div class="sptjm-text">
            1. Tiket yang saya sampaikan sebagai pertanggungjawaban adalah benar asli, dengan menggunakan penerbangan sebagai berikut :
          <\/div>
          
          <table style="margin: 10px 0; width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="width: 8%; border: 1px solid #000; padding: 6px; text-align: center;">No<\/th>
                <th style="width: 67%; border: 1px solid #000; padding: 6px; text-align: center;">Uraian<\/th>
                <th style="width: 25%; border: 1px solid #000; padding: 6px; text-align: center;">Jumlah<\/th>
              <\/tr>
            <\/thead>
            <tbody>
              ${sptjmTableRows}
            <\/tbody>
          <\/table>
          
          <div class="sptjm-text">
            2. Jika dikemudian hari terdapat ketidaksesuaian, saya bersedia mempertanggungjawabkan dan mengembalikan ke Kas Negara.
          <\/div>
          
          <div class="sptjm-text">
            Demikian surat pernyataan ini saya buat untuk dapat digunakan sebagaimana mestinya.
          <\/div>
          
          <div class="sptjm-signature">
            <div class="sptjm-signature-box">
              <div>Palangka Raya, ${todayFormatted}<\/div>
              <div>Yang membuat pernyataan dan<\/div>
              <div>melakukan Perjalanan Dinas<\/div>
              <div style="min-height: 60px; display: flex; justify-content: center; align-items: center; margin: 15px 0;">${ttdPegawaiHtml}<\/div>
              <div class="sptjm-signature-line">${pegawaiNama}<\/div>
              <div class="sptjm-signature-nip">NIP. ${pegawaiNip}<\/div>
            <\/div>
          <\/div>
        <\/div>

        <!-- Page Break untuk halaman 3 - SPTJM Penginapan -->
        <div class="page-break"><\/div>

        <!-- Halaman 3: SPTJM Penginapan (Surat Pernyataan Tanggung Jawab Mutlak untuk Penginapan) -->
        <div class="sptjm-container">
          <div class="sptjm-title">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK<\/div>
          
          <div class="sptjm-text">
            Yang bertandatangan dibawah ini saya :
          <\/div>
          
          <table class="sptjm-data-table">
            <tbody>
              <tr>
                <td style="width: 180px;">Nama Lengkap<\/td>
                <td style="width: 20px; text-align: center;">:<\/td>
                <td><strong>${pegawaiNama}<\/strong><\/td>
              <\/tr>
              <tr>
                <td style="width: 180px;">NIP.<\/td>
                <td style="width: 20px; text-align: center;">:<\/td>
                <td><strong>${pegawaiNip}<\/strong><\/td>
              <\/tr>
              <tr>
                <td style="width: 180px;">Jabatan<\/td>
                <td style="width: 20px; text-align: center;">:<\/td>
                <td><strong>${pegawaiJabatan}<\/strong><\/td>
              <\/tr>
            <\/tbody>
          <\/table>
          
          <div class="sptjm-text">
            Sesuai dengan Surat Perintah Dinas (SPD) Nomor <strong>${noSpt}<\/strong> 
            tanggal <strong>${tglSpd}<\/strong>, dengan ini menyatakan bahwa :
          <\/div>
          
          <div class="sptjm-text">
            1. Bukti penginapan yang saya sampaikan sebagai pertanggungjawaban adalah benar asli, dengan tempat penginapan sebagai berikut:
          <\/div>
          
          <div style="margin: 15px 0 15px 0;">
            ${sptjmPenginapanRows}
          <\/div>
          
          <div class="sptjm-text">
            2. Jika dikemudian hari terdapat ketidaksesuaian, saya bersedia mempertanggungjawabkan dan mengembalikan ke Kas Negara.
          <\/div>
          
          <div class="sptjm-text">
            Demikian surat pernyataan ini saya buat untuk dapat digunakan sebagaimana mestinya.
          <\/div>
          
          <div class="sptjm-signature">
            <div class="sptjm-signature-box">
              <div>Palangka Raya, ${todayFormatted}<\/div>
              <div>Yang membuat pernyataan dan<\/div>
              <div>melakukan Perjalanan Dinas<\/div>
              <div style="min-height: 60px; display: flex; justify-content: center; align-items: center; margin: 15px 0;">${ttdPegawaiHtml}<\/div>
              <div class="sptjm-signature-line">${pegawaiNama}<\/div>
              <div class="sptjm-signature-nip">NIP. ${pegawaiNip}<\/div>
            <\/div>
          <\/div>
        <\/div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print();setTimeout(function(){window.close();}, 500);" style="padding:10px 20px;margin-right:10px;cursor:pointer;">🖨️ Cetak<\/button>
          <button onclick="window.close();" style="padding:10px 20px;cursor:pointer;">Tutup<\/button>
        <\/div>
      <\/body>
      <\/html>
    `);

    printWindow.document.close();
  };

  // ====== RENDER Preview ======
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-20">
            <h3 className="text-lg font-medium">Preview Kwitansi & SPTJM - ${pegawaiNama}</h3>
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

          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p className="text-gray-600">Preview lengkap akan ditampilkan saat mencetak.</p>
            <p className="text-sm text-gray-500 mt-2">Klik tombol "Cetak / Print" untuk melihat hasil lengkap kwitansi dan SPTJM.</p>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-medium text-yellow-800">📄 Dokumen yang akan dicetak:</p>
              <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                <li>Halaman 1: Kwitansi Perjalanan Dinas</li>
                <li>Halaman 2: SPTJM Transport (Surat Pernyataan Tanggung Jawab Mutlak)</li>
                <li>Halaman 3: SPTJM Penginapan (Surat Pernyataan Tanggung Jawab Mutlak)</li>
              </ul>
              <p className="text-xs text-yellow-700 mt-2">
                {hasMultipleTransport 
                  ? "✅ Data transport di SPTJM dari nominatif (multiple items)"
                  : "⚠️ Data transport di SPTJM dari input kwitansi, nominal hanya di item pertama"}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {hasPenginapanSptjm 
                  ? "✅ Data penginapan di SPTJM dari input kwitansi"
                  : penginapanDetail.length > 0
                    ? "⚠️ Data penginapan di SPTJM dari nominatif"
                    : "⚠️ Tidak ada data penginapan"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              🖨️ Cetak Kwitansi & SPTJM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}