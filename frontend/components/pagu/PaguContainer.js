// components/pagu/PaguContainer.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';
import TarikPaguModal from './modals/TarikPaguModal';
import { formatRupiah, formatMak, getMakParts } from '../../utils/formatters';

// Waktu dari API berupa ISO (UTC); tampilkan dalam waktu lokal.
const formatWaktu = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function PaguContainer({ session, status }) {
  const [paguList, setPaguList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });

  // Modal state
  const [showTarikModal, setShowTarikModal] = useState(false);

  // Cek role admin
  const isAdmin = useMemo(() => {
    if (!session) return false;
    const roles = session.user?.roles || session.user?.extractedRoles || [];
    if (Array.isArray(roles) && roles.some(r => r.toLowerCase().includes('admin'))) return true;
    if (session.user?.role && session.user.role.toLowerCase().includes('admin')) return true;
    return false;
  }, [session]);

  // Filter & sort
  const [filterTahun, setFilterTahun] = useState('');
  const [filterKode, setFilterKode] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [searchMak, setSearchMak] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchPaguList = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/pagu`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });

      setPaguList(response.data.data || []);
    } catch (err) {
      console.error('Error fetching pagu:', err);
      setPaguList([]);
      setError(err.response?.data?.message || 'Gagal memuat data pagu');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchPaguList();
  }, [fetchPaguList]);

  // Get unique values for filter
  const tahunList = [...new Set(paguList.map(item => item.tahun_anggaran).filter(Boolean))].sort((a, b) => b - a);
  const kodeList = [...new Set(paguList.map(item => getMakParts(item.mak).kodeHuruf).filter(Boolean))].sort();
  const jenisList = [...new Set(paguList.map(item => getMakParts(item.mak).kodeJenis).filter(Boolean))].sort();

  // Filter data — cari juga di MAK yang sudah diformat
  const filteredData = useMemo(() => {
    return paguList.filter(item => {
      if (filterTahun && item.tahun_anggaran != filterTahun) return false;
      if (filterKode || filterJenis) {
        const parts = getMakParts(item.mak);
        if (filterKode && parts.kodeHuruf !== filterKode) return false;
        if (filterJenis && parts.kodeJenis !== filterJenis) return false;
      }
      if (searchMak) {
        const q = searchMak.toLowerCase();
        const rawMak = item.mak.toLowerCase();
        const formattedMak = formatMak(item.mak).toLowerCase();
        if (!rawMak.includes(q) && !formattedMak.includes(q)) return false;
      }
      return true;
    });
  }, [paguList, filterTahun, filterKode, filterJenis, searchMak]);

  // Group data by formatted MAK — gabung & jumlahkan nominal
  const groupedData = useMemo(() => {
    const map = new Map();
    filteredData.forEach(item => {
      const key = formatMak(item.mak);
      if (map.has(key)) {
        const g = map.get(key);
        g.pagu += parseFloat(item.pagu) || 0;
        g.realisasi += parseFloat(item.realisasi) || 0;
        g.count++;
        // Simpan updated_at terbaru dari semua record dalam grup
        if (item.updated_at && (!g.updated_at || item.updated_at > g.updated_at)) {
          g.updated_at = item.updated_at;
        }
      } else {
        map.set(key, {
          id: item.id,
          mak: item.mak,
          formattedMak: key,
          pagu: parseFloat(item.pagu) || 0,
          realisasi: parseFloat(item.realisasi) || 0,
          count: 1,
          updated_at: item.updated_at || null
        });
      }
    });
    // Urutkan berdasarkan formatted MAK
    return Array.from(map.values()).sort((a, b) => a.formattedMak.localeCompare(b.formattedMak));
  }, [filteredData]);

  // Total dari grouped data
  const totals = useMemo(() => {
    let totalPagu = 0, totalRealisasi = 0, totalSisa = 0;
    groupedData.forEach(item => {
      totalPagu += item.pagu;
      totalRealisasi += item.realisasi;
      totalSisa += (item.pagu - item.realisasi);
    });
    return { totalPagu, totalRealisasi, totalSisa };
  }, [groupedData]);

  // Cari updated_at paling baru dari seluruh data
  const lastUpdateTime = useMemo(() => {
    let latest = null;
    filteredData.forEach(item => {
      if (item.updated_at && (!latest || item.updated_at > latest)) {
        latest = item.updated_at;
      }
    });
    return latest;
  }, [filteredData]);

  // Pagination
  const totalPages = Math.ceil(groupedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedData.slice(start, start + itemsPerPage);
  }, [groupedData, currentPage, itemsPerPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTahun, filterKode, filterJenis, searchMak]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-[95vw] mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Pagu & Realisasi</h2>
          <p className="text-gray-600 mt-1">
            Pagu dan realisasi anggaran per MAK — langsung dari Jendela Kinerja
          </p>
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
            <button
              onClick={() => setShowTarikModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atur Token
            </button>
          )}
        </div>
      </div>

      {/* Error pengambilan data live */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-200">
            <span className="font-semibold">Gagal memuat data pagu:</span> {error}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowTarikModal(true)}
              className="mt-2 px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
            >
              Isi / perbarui token
            </button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pagu</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">Rp {formatRupiah(totals.totalPagu)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{groupedData.length} MAK unik</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Realisasi</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">Rp {formatRupiah(totals.totalRealisasi)}</p>
          {totals.totalPagu > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((totals.totalRealisasi / totals.totalPagu) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
                {(totals.totalRealisasi / totals.totalPagu * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sisa</p>
          <p className={`text-2xl font-bold mt-1 ${totals.totalSisa < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            Rp {formatRupiah(totals.totalSisa)}
          </p>
          {totals.totalPagu > 0 && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
              {(totals.totalRealisasi / totals.totalPagu * 100).toFixed(1)}% terealisasi
            </p>
          )}
          {lastUpdateTime && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              🕐 Terakhir diambil: {formatWaktu(lastUpdateTime)}
            </p>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tahun</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Tahun</option>
              {tahunList.map(tahun => (
                <option key={tahun} value={tahun}>{tahun}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kode</label>
            <select
              value={filterKode}
              onChange={(e) => setFilterKode(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kode</option>
              {kodeList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Jenis MAK</label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Jenis</option>
              {jenisList.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cari MAK</label>
            <input
              type="text"
              value={searchMak}
              onChange={(e) => setSearchMak(e.target.value)}
              placeholder="Cari MAK asli atau singkatan..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Info update terakhir */}
      {lastUpdateTime && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              <span className="font-medium">Data terakhir diambil dari sumber:</span>{' '}
              <span className="font-semibold">{formatWaktu(lastUpdateTime)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">MAK</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">Pagu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">Realisasi</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">%</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">Sisa</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const sisa = item.pagu - item.realisasi;
                  const sisaColor = sisa < 0 ? 'text-red-600' : sisa < item.pagu * 0.1 ? 'text-yellow-600' : 'text-green-600';

                  return (
                    <tr key={item.formattedMak} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{rowNumber}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <span title={item.mak}>{item.formattedMak}</span>
                        {item.count > 1 && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full">{item.count}x</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-200">Rp {formatRupiah(item.pagu)}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-200">Rp {formatRupiah(item.realisasi)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {item.pagu > 0 ? (item.realisasi / item.pagu * 100).toFixed(1) + '%' : '0%'}
                          </span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min((item.pagu > 0 ? item.realisasi / item.pagu : 0) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${sisaColor}`}>
                        Rp {formatRupiah(sisa)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchMak || filterTahun ? 'Tidak ada data sesuai filter' : 'Belum ada data pagu'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {groupedData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, groupedData.length)} dari {groupedData.length} MAK
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition dark:text-gray-200"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm border rounded-md transition ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition dark:text-gray-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TarikPaguModal
        show={showTarikModal}
        onClose={() => setShowTarikModal(false)}
        session={session}
        onSuccess={(message) => {
          setNotification({ show: true, message });
          fetchPaguList();
        }}
      />

      <NotificationModal
        show={notification.show}
        message={notification.message}
        onClose={() => setNotification({ show: false, message: '' })}
      />
    </div>
  );
}
