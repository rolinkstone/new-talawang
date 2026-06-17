// components/monev/Container.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';
import DetailModal from './modals/DetailModal';
import { formatRupiah, formatDateForDisplay } from '../../utils/formatters';

const ITEMS_PER_PAGE = 20;

export default function MonevContainer({ session, status }) {
  const [dataList, setDataList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });

  // Filter state
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear());
  const [filterBulan, setFilterBulan] = useState('all');
  const [filterPpk, setFilterPpk] = useState('all');
  const [ppkList, setPpkList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Debounce search — hanya fetch setelah user berhenti mengetik 400ms
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filterTahun) params.append('tahun', filterTahun);
      if (filterBulan && filterBulan !== 'all') params.append('bulan', filterBulan);
      if (filterPpk && filterPpk !== 'all') params.append('ppk', filterPpk);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/monev?${params.toString()}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );

      if (response.data.success) {
        setDataList(response.data.data || []);
        setSummary(response.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching monev data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data monev');
      setNotification({ show: true, message: err.response?.data?.message || 'Gagal memuat data monev' });
    } finally {
      setLoading(false);
    }
  }, [session, filterTahun, filterBulan, filterPpk, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pagination logic
  const totalPages = useMemo(() => {
    return Math.ceil(dataList.length / ITEMS_PER_PAGE);
  }, [dataList]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return dataList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [dataList, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTahun, filterBulan, filterPpk, debouncedSearch]);

  // Fetch PPK list untuk dropdown filter
  useEffect(() => {
    if (!session?.accessToken) return;
    
    const fetchPpkList = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/monev/ppk-list`, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        });
        if (res.data.success) setPpkList(res.data.data || []);
      } catch (err) {
        console.error('Error fetching PPK list:', err);
      }
    };
    fetchPpkList();
  }, [session]);

  const handleViewDetail = async (item) => {
    setSelectedPegawai(item);
    setShowDetailModal(true);
    setDetailLoading(true);
    setDetailData(null);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/monev/pegawai/${item.pegawai_id}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );

      if (response.data.success) {
        setDetailData(response.data.data);
      }
    } catch (err) {
      setNotification({ show: true, message: err.response?.data?.message || 'Gagal memuat detail' });
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper untuk escape CSV (handle nilai yang mengandung koma, kutip, newline)
  const toCsvValue = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = () => {
    if (dataList.length === 0) return;

    // Collect all unique transport & uang harian types
    const allTransportTypes = [...new Set(dataList.flatMap(item => 
      item.transport_detail ? Object.keys(item.transport_detail) : []
    ))];
    const allUhTypes = [...new Set(dataList.flatMap(item => 
      item.uang_harian_detail ? Object.keys(item.uang_harian_detail) : []
    ))];

    const headers = [
      'No', 'MAK', 'PPK', 'No ST', 'Tanggal ST', 'No SPM',
      'Nama Petugas', 'NIP', 'Pangkat', 'Jabatan',
      ...allTransportTypes.map(t => `Transport - ${t}`),
      'Total Transport',
      ...allUhTypes.map(u => `UH - ${u}`),
      'Total Uang Harian', 'Hotel', 'Total'
    ];

    const csvRows = dataList.map((item, index) => [
      index + 1,
      item.mak,
      item.ppk_nama,
      item.no_st,
      item.tgl_st || '',
      item.catatan_status_2 || '',
      item.pegawai_nama,
      item.pegawai_nip,
      item.pegawai_pangkat,
      item.pegawai_jabatan,
      ...allTransportTypes.map(t => item.transport_detail?.[t] || 0),
      item.total_transport,
      ...allUhTypes.map(u => item.uang_harian_detail?.[u] || 0),
      item.total_uang_harian,
      item.total_penginapan,
      item.pegawai_total_biaya
    ].map(toCsvValue));

    const csvContent = [
      headers.map(toCsvValue).join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monev-perjadin-${filterTahun}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Hanya fullscreen spinner saat session loading, bukan saat fetch data
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Monev Perjadin</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Monitoring &amp; Evaluasi Perjalanan Dinas
            </p>
          </div>
        </div>
        {dataList.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all text-sm font-medium shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-3.5 rounded-xl mb-6">
          <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Filter section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tahun</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(thn => (
                <option key={thn} value={thn}>{thn}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Bulan</label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="all">Semua Bulan</option>
              {[
                { value: '1', label: 'Januari' },
                { value: '2', label: 'Februari' },
                { value: '3', label: 'Maret' },
                { value: '4', label: 'April' },
                { value: '5', label: 'Mei' },
                { value: '6', label: 'Juni' },
                { value: '7', label: 'Juli' },
                { value: '8', label: 'Agustus' },
                { value: '9', label: 'September' },
                { value: '10', label: 'Oktober' },
                { value: '11', label: 'November' },
                { value: '12', label: 'Desember' }
              ].map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">PPK</label>
            <select
              value={filterPpk}
              onChange={(e) => setFilterPpk(e.target.value)}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all min-w-[180px]"
            >
              <option value="all">Semua PPK</option>
              {ppkList.map((ppk, idx) => (
                <option key={idx} value={ppk.ppk_nama}>{ppk.ppk_nama}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cari</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari MAK, No ST, Nama Petugas..."
                className="w-full border border-gray-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <button
              onClick={fetchData}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all text-sm font-semibold shadow-sm hover:shadow-md"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Info bar */}
      {dataList.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium text-xs">
              {dataList.length} Data
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              Total: <span className="font-semibold text-gray-800">{formatRupiah(dataList.reduce((s, d) => s + d.pegawai_total_biaya, 0))}</span>
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Loading overlay — hanya di area tabel, input tidak kena */}
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600"></div>
              <span className="text-sm text-gray-600 font-medium">Memuat data...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700">
                <th className="px-2 py-3.5 text-left text-xs font-semibold text-indigo-100 uppercase tracking-wider w-10">No</th>
                <th className="px-2 py-3.5 text-left text-xs font-semibold text-indigo-100 uppercase tracking-wider min-w-[200px] max-w-[240px]">MAK</th>
                <th className="px-2 py-3.5 text-left text-xs font-semibold text-indigo-100 uppercase tracking-wider min-w-[160px] max-w-[200px]">PPK</th>
                <th className="px-2 py-3.5 text-left text-xs font-semibold text-indigo-100 uppercase tracking-wider w-28">No ST</th>
                <th className="px-2 py-3.5 text-left text-xs font-semibold text-indigo-100 uppercase tracking-wider w-28">No SPM</th>
                <th className="px-2 py-3.5 text-left text-xs font-semibold text-indigo-100 uppercase tracking-wider min-w-[170px] max-w-[220px]">Nama Petugas</th>
                <th className="px-2 py-3.5 text-right text-xs font-semibold text-indigo-100 uppercase tracking-wider min-w-[160px]">
                  <span className="flex items-center justify-end gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Transport
                  </span>
                </th>
                <th className="px-2 py-3.5 text-right text-xs font-semibold text-indigo-100 uppercase tracking-wider min-w-[160px]">
                  <span className="flex items-center justify-end gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Uang Harian
                  </span>
                </th>
                <th className="px-2 py-3.5 text-right text-xs font-semibold text-indigo-100 uppercase tracking-wider w-24">
                  <span className="flex items-center justify-end gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Hotel
                  </span>
                </th>
                <th className="px-2 py-3.5 text-right text-xs font-semibold text-indigo-100 uppercase tracking-wider w-28">
                  <span className="flex items-center justify-end gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Total
                  </span>
                </th>
                <th className="px-2 py-3.5 text-center text-xs font-semibold text-indigo-100 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">Belum ada data monev</p>
                      <p className="text-gray-400 text-sm">
                        {filterTahun ? `Tidak ada data untuk tahun ${filterTahun}` : 'Belum ada data perjalanan dinas yang selesai'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const transportEntries = item.transport_detail ? Object.entries(item.transport_detail) : [];
                  const uhEntries = item.uang_harian_detail ? Object.entries(item.uang_harian_detail) : [];

                  // Warna badge berdasarkan jenis
                  const getTransportBadgeColor = (jenis) => {
                    const j = jenis.toLowerCase();
                    if (j.includes('pribadi') || j.includes('dinas')) return 'bg-blue-50 text-blue-700 border-blue-200';
                    if (j.includes('lokal')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
                    if (j.includes('umum')) return 'bg-teal-50 text-teal-700 border-teal-200';
                    return 'bg-slate-50 text-slate-700 border-slate-200';
                  };
                  const getUhBadgeColor = (jenis) => {
                    const j = jenis.toLowerCase();
                    if (j.includes('60') || j.includes('60%')) return 'bg-amber-50 text-amber-700 border-amber-200';
                    if (j.includes('biasa') || j.includes('100')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    if (j.includes('50') || j.includes('50%')) return 'bg-orange-50 text-orange-700 border-orange-200';
                    return 'bg-green-50 text-green-700 border-green-200';
                  };

                  return (
                  <tr key={`${item.pegawai_id}-${item.kegiatan_id}`} className={`transition-all hover:shadow-inner ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-2 py-3 text-sm">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded max-w-[220px] inline-block truncate" title={item.mak}>
                        {item.mak}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-700 font-medium truncate max-w-[190px]" title={item.ppk_nama}>{item.ppk_nama || '-'}</td>
                    <td className="px-2 py-3 text-sm text-gray-600 truncate max-w-[100px]" title={item.no_st}>{item.no_st || '-'}</td>
                    <td className="px-2 py-3 text-sm font-mono text-gray-700 truncate max-w-[100px]" title={item.catatan_status_2}>
                      {item.catatan_status_2 || '-'}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {(item.pegawai_nama || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[170px]" title={item.pegawai_nama}>{item.pegawai_nama}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.pegawai_nip || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right align-top">
                      <div className="space-y-1">
                        {transportEntries.length > 0 ? (
                          transportEntries.map(([jenis, total]) => (
                            <div key={jenis} className="flex items-center justify-end gap-1.5">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border leading-tight ${getTransportBadgeColor(jenis)}`}>
                                {jenis}
                              </span>
                              <span className="font-semibold text-xs text-gray-700 min-w-[65px] text-right whitespace-nowrap">{formatRupiah(total)}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                        {item.total_transport > 0 && transportEntries.length > 1 && (
                          <div className="flex items-center justify-end gap-1.5 pt-1 mt-1 border-t border-dashed border-gray-200">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">Total</span>
                            <span className="font-bold text-xs text-gray-800 min-w-[65px] text-right whitespace-nowrap">{formatRupiah(item.total_transport)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right align-top">
                      <div className="space-y-1">
                        {uhEntries.length > 0 ? (
                          uhEntries.map(([jenis, total]) => (
                            <div key={jenis} className="flex items-center justify-end gap-1.5">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border leading-tight ${getUhBadgeColor(jenis)}`}>
                                {jenis}
                              </span>
                              <span className="font-semibold text-xs text-gray-700 min-w-[65px] text-right whitespace-nowrap">{formatRupiah(total)}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                        {item.total_uang_harian > 0 && uhEntries.length > 1 && (
                          <div className="flex items-center justify-end gap-1.5 pt-1 mt-1 border-t border-dashed border-gray-200">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">Total</span>
                            <span className="font-bold text-xs text-gray-800 min-w-[65px] text-right whitespace-nowrap">{formatRupiah(item.total_uang_harian)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right align-top">
                      {item.total_penginapan > 0 ? (
                        <span className="font-semibold text-sm text-purple-700 whitespace-nowrap">{formatRupiah(item.total_penginapan)}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right align-top">
                      <span className="font-bold text-sm text-gray-900 bg-gray-50 px-2.5 py-1.5 rounded-lg inline-block whitespace-nowrap">
                        {formatRupiah(item.pegawai_total_biaya)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center align-top">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-lg transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50/80">
            <div className="text-sm text-gray-500">
              Menampilkan <span className="font-semibold text-gray-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-semibold text-gray-700">{Math.min(currentPage * ITEMS_PER_PAGE, dataList.length)}</span> dari <span className="font-semibold text-gray-700">{dataList.length}</span> data
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 active:bg-gray-50 transition-all"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Sebelumnya
                </span>
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[36px] h-9 text-sm font-medium rounded-lg transition-all ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 active:bg-gray-50 transition-all"
              >
                <span className="flex items-center gap-1">
                  Selanjutnya
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DetailModal
        show={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailData(null);
          setSelectedPegawai(null);
        }}
        loading={detailLoading}
        data={detailData}
        formatRupiah={formatRupiah}
      />

      <NotificationModal
        show={notification.show}
        message={notification.message}
        onClose={() => setNotification({ show: false, message: '' })}
      />
    </div>
  );
}
