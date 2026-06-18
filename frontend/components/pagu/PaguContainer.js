// components/pagu/PaguContainer.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';
import PaguModal from './modals/PaguModal';
import DeletePaguModal from './modals/DeletePaguModal';
import UploadPaguModal from './modals/UploadPaguModal';
import { formatRupiah, formatMak, getMakParts } from '../../utils/formatters';

export default function PaguContainer({ session, status }) {
  const [paguList, setPaguList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '' });

  // Modal state
  const [showPaguModal, setShowPaguModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/pagu`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });

      if (response.data.success) {
        setPaguList(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching pagu:', err);
      setError(err.response?.data?.message || 'Gagal memuat data pagu');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchPaguList();
  }, [fetchPaguList]);

  const handleAdd = () => {
    setEditItem(null);
    setShowPaguModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowPaguModal(true);
  };

  const handleDelete = (item) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  };

  const handleSave = async (data) => {
    try {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      let response;

      if (editItem) {
        response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/pagu/${editItem.id}`, data, { headers });
      } else {
        response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/pagu`, data, { headers });
      }

      if (response.data.success) {
        setShowPaguModal(false);
        setEditItem(null);
        setNotification({ show: true, message: response.data.message });
        fetchPaguList();
      }
    } catch (err) {
      throw err.response?.data?.message || err.message;
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    try {
      setDeletingId(deleteItem.id);
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/pagu/${deleteItem.id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });

      if (response.data.success) {
        setShowDeleteModal(false);
        setDeleteItem(null);
        setNotification({ show: true, message: response.data.message });
        fetchPaguList();
      }
    } catch (err) {
      setNotification({ show: true, message: err.response?.data?.message || 'Gagal menghapus pagu' });
    } finally {
      setDeletingId(null);
    }
  };

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
            Kelola pagu dan realisasi anggaran per MAK
          </p>
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Excel
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Pagu
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Pagu</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">Rp {formatRupiah(totals.totalPagu)}</p>
          <p className="text-xs text-gray-400 mt-1">{groupedData.length} MAK unik</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Realisasi</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">Rp {formatRupiah(totals.totalRealisasi)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Sisa</p>
          <p className={`text-2xl font-bold mt-1 ${totals.totalSisa < 0 ? 'text-red-600' : 'text-green-600'}`}>
            Rp {formatRupiah(totals.totalSisa)}
          </p>
          {lastUpdateTime && (
            <p className="text-xs text-gray-400 mt-2">
              🕐 Terakhir diupdate: {lastUpdateTime}
            </p>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Tahun</option>
              {tahunList.map(tahun => (
                <option key={tahun} value={tahun}>{tahun}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
            <select
              value={filterKode}
              onChange={(e) => setFilterKode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kode</option>
              {kodeList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis MAK</label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Jenis</option>
              {jenisList.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari MAK</label>
            <input
              type="text"
              value={searchMak}
              onChange={(e) => setSearchMak(e.target.value)}
              placeholder="Cari MAK asli atau singkatan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Info update terakhir */}
      {lastUpdateTime && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <p className="text-sm text-blue-700">
              <span className="font-medium">Data terakhir diupdate:</span>{' '}
              <span className="font-semibold">{lastUpdateTime}</span>
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MAK</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Pagu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Realisasi</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sisa</th>                {isAdmin && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Aksi</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const sisa = item.pagu - item.realisasi;
                  const sisaColor = sisa < 0 ? 'text-red-600' : sisa < item.pagu * 0.1 ? 'text-yellow-600' : 'text-green-600';

                  return (
                    <tr key={item.formattedMak} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{rowNumber}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <span title={item.mak}>{item.formattedMak}</span>
                        {item.count > 1 && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">{item.count}x</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">Rp {formatRupiah(item.pagu)}</td>
                      <td className="px-4 py-3 text-sm text-right">Rp {formatRupiah(item.realisasi)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${sisaColor}`}>
                        Rp {formatRupiah(sisa)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isAdmin ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition"
                            >
                              Hapus
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    {searchMak || filterTahun ? 'Tidak ada data sesuai filter' : 'Belum ada data pagu'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {groupedData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, groupedData.length)} dari {groupedData.length} MAK
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PaguModal
        show={showPaguModal}
        onClose={() => { setShowPaguModal(false); setEditItem(null); }}
        onSave={handleSave}
        editItem={editItem}
      />

      <DeletePaguModal
        show={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteItem(null); }}
        onConfirm={confirmDelete}
        deletingId={deletingId}
        item={deleteItem}
      />

      <UploadPaguModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        session={session}
        onSuccess={(message) => {
          setShowUploadModal(false);
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
