// components/laporan/LaporanTable.js
import React, { useState } from 'react';
import { FaEye, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

export default function LaporanTable({ data, onViewDetail, formatRupiah }) {
  const [sortField, setSortField] = useState('total_uang_harian');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortDirection === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />;
  };
  
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return item.pegawai_nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.pegawai_nip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.pegawai_pangkat?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    aVal = String(aVal || '').toLowerCase();
    bVal = String(bVal || '').toLowerCase();
    
    if (sortDirection === 'asc') {
      return aVal.localeCompare(bVal);
    } else {
      return bVal.localeCompare(aVal);
    }
  });
  
  // Pagination
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);
  
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Cari pegawai (nama, NIP, pangkat)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('pegawai_nama')}
              >
                <div className="flex items-center gap-1">
                  Nama Pegawai {getSortIcon('pegawai_nama')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pangkat</th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('jumlah_perjalanan')}
              >
                <div className="flex items-center justify-center gap-1">
                  Jml Perjadin {getSortIcon('jumlah_perjalanan')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_hari_dinas')}
              >
                <div className="flex items-center justify-center gap-1">
                  Total Hari {getSortIcon('total_hari_dinas')}
                </div>
              </th>
              
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_uang_harian')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Uang Harian {getSortIcon('total_uang_harian')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_hari_transport_lokal')}
              >
                <div className="flex items-center justify-center gap-1">
                  Hari Transport Lokal {getSortIcon('total_hari_transport_lokal')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_transport')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Transport Lokal {getSortIcon('total_transport')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_keseluruhan')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Keseluruhan {getSortIcon('total_keseluruhan')}
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
              <tr key={item.pegawai_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rowNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{item.pegawai_nama}</div>
                  <div className="text-xs text-gray-500">{item.pegawai_jabatan || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.pegawai_nip || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.pegawai_pangkat || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.jumlah_perjalanan} Kali
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {item.total_hari_dinas} Hari
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  Rp {formatRupiah(item.total_uang_harian)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {item.total_hari_transport_lokal || 0} Hari
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                  Rp {formatRupiah(item.total_transport || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                  Rp {formatRupiah(item.total_keseluruhan || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Lihat Detail"
                  >
                    <FaEye size={18} />
                  </button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {sortedData.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedData.length)} dari {filteredData.length} pegawai</span>
            <span>Total Hari Transport Lokal: {sortedData.reduce((sum, item) => sum + (item.total_hari_transport_lokal || 0), 0)} Hari</span>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center px-6 py-3 bg-white border-t border-gray-200">
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

      {/* Footer Info */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div className="flex gap-6">
            <span>Total UH: Rp {formatRupiah(sortedData.reduce((sum, item) => sum + (item.total_uang_harian || 0), 0))}</span>
            <span>Total Transport: Rp {formatRupiah(sortedData.reduce((sum, item) => sum + (item.total_transport || 0), 0))}</span>
            <span className="font-semibold text-gray-700">Total Keseluruhan: Rp {formatRupiah(sortedData.reduce((sum, item) => sum + (item.total_keseluruhan || 0), 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}