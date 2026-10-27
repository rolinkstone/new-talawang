// components/laporan/LaporanTable.js
import React, { useState } from 'react';
import { FaEye, FaSort, FaSortUp, FaSortDown, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

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
    if (sortField !== field) return <FaSort className="text-gray-300 dark:text-gray-500" />;
    return sortDirection === 'asc'
      ? <FaSortUp className="text-indigo-600 dark:text-indigo-300" />
      : <FaSortDown className="text-indigo-600 dark:text-indigo-300" />;
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
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);
  
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalUangHarian = sortedData.reduce((sum, item) => sum + (item.total_uang_harian || 0), 0);
  const totalTransport = sortedData.reduce((sum, item) => sum + (item.total_transport || 0), 0);
  const totalKeseluruhan = sortedData.reduce((sum, item) => sum + (item.total_keseluruhan || 0), 0);
  
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    const pages = [...new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1])]
      .filter(page => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
    
    const hasil = [];
    pages.forEach((page, index) => {
      if (index > 0 && page - pages[index - 1] > 1) hasil.push('...');
      hasil.push(page);
    });
    return hasil;
  })();
  
  const thBase = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300';
  const thSortable = 'cursor-pointer select-none group';
  
  const SortLabel = ({ field, children, align = 'left' }) => (
    <div className={`flex items-center gap-1.5 ${
      align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''
    }`}>
      <span>{children}</span>
      <span className="transition-transform group-hover:scale-110">{getSortIcon(field)}</span>
    </div>
  );
  
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <FaSearch className="text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Daftar Rekap Pegawai</h3>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
            {filteredData.length}
          </span>
        </div>
        
        <div className="relative w-full sm:w-80">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau pangkat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className={`${thBase} text-left w-12`}>No</th>
              <th className={`${thBase} ${thSortable} text-left`} onClick={() => handleSort('pegawai_nama')}>
                <SortLabel field="pegawai_nama">Pegawai</SortLabel>
              </th>
              <th className={`${thBase} text-left`}>NIP</th>
              <th className={`${thBase} text-left`}>Pangkat</th>
              <th className={`${thBase} ${thSortable} text-center`} onClick={() => handleSort('jumlah_perjalanan')}>
                <SortLabel field="jumlah_perjalanan" align="center">Jml Perjadin</SortLabel>
              </th>
              <th className={`${thBase} ${thSortable} text-center`} onClick={() => handleSort('total_hari_dinas')}>
                <SortLabel field="total_hari_dinas" align="center">Total Hari</SortLabel>
              </th>
              <th className={`${thBase} ${thSortable} text-right`} onClick={() => handleSort('total_uang_harian')}>
                <SortLabel field="total_uang_harian" align="right">Uang Harian</SortLabel>
              </th>
              <th className={`${thBase} ${thSortable} text-center`} onClick={() => handleSort('total_hari_transport_lokal')}>
                <SortLabel field="total_hari_transport_lokal" align="center">Hari Trans. Lokal</SortLabel>
              </th>
              <th className={`${thBase} ${thSortable} text-right`} onClick={() => handleSort('total_transport')}>
                <SortLabel field="total_transport" align="right">Transport Lokal</SortLabel>
              </th>
              <th className={`${thBase} ${thSortable} text-right`} onClick={() => handleSort('total_keseluruhan')}>
                <SortLabel field="total_keseluruhan" align="right">Total Keseluruhan</SortLabel>
              </th>
              <th className={`${thBase} text-center w-16`}>Aksi</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
            {paginatedData.map((item, idx) => {
              const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
              return (
                <tr
                  key={item.pegawai_id}
                  className="group odd:bg-white even:bg-slate-50/70 hover:bg-indigo-50/60 dark:odd:bg-gray-800 dark:even:bg-gray-800/50 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 tabular-nums">{rowNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{item.pegawai_nama}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.pegawai_jabatan || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 tabular-nums whitespace-nowrap">{item.pegawai_nip || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.pegawai_pangkat || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200/70 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-700/50">
                      {item.jumlah_perjalanan}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-700/50">
                      {item.total_hari_dinas} hari
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                    Rp {formatRupiah(item.total_uang_harian)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700/50">
                      {item.total_hari_transport_lokal || 0} hari
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-sky-600 dark:text-sky-400 tabular-nums whitespace-nowrap">
                    Rp {formatRupiah(item.total_transport || 0)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                      Rp {formatRupiah(item.total_keseluruhan || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onViewDetail(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 group-hover:text-indigo-500 dark:hover:bg-gray-700 dark:hover:text-indigo-300"
                      title="Lihat Detail"
                      aria-label={`Lihat detail ${item.pegawai_nama}`}
                    >
                      <FaEye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Info baris */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/40 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Menampilkan <span className="font-semibold text-gray-700 dark:text-gray-200">
            {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedData.length)}
          </span> dari <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredData.length}</span> pegawai
        </span>
        <span>Total hari transport lokal: <span className="font-semibold text-gray-700 dark:text-gray-200">{sortedData.reduce((sum, item) => sum + (item.total_hari_transport_lokal || 0), 0)} hari</span></span>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FaChevronLeft size={10} />
            Prev
          </button>
          
          {pageNumbers.map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-gray-400">…</span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            )
          ))}
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Next
            <FaChevronRight size={10} />
          </button>
        </div>
      )}
      
      {/* Footer total */}
      <div className="grid grid-cols-1 gap-3 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-white dark:from-gray-800 dark:to-gray-800 px-4 py-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-gray-700/40 px-3 py-2 ring-1 ring-gray-200/80 dark:ring-gray-600/60">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-400">Total Uang Harian</div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">Rp {formatRupiah(totalUangHarian)}</div>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-700/40 px-3 py-2 ring-1 ring-gray-200/80 dark:ring-gray-600/60">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-400">Total Transport Lokal</div>
          <div className="text-sm font-bold text-sky-600 dark:text-sky-400 tabular-nums">Rp {formatRupiah(totalTransport)}</div>
        </div>
        <div className="rounded-xl bg-indigo-600 px-3 py-2 shadow-sm shadow-indigo-600/30">
          <div className="text-[11px] font-medium uppercase tracking-wide text-indigo-100">Total Keseluruhan</div>
          <div className="text-sm font-bold text-white tabular-nums">Rp {formatRupiah(totalKeseluruhan)}</div>
        </div>
      </div>
    </div>
  );
}
