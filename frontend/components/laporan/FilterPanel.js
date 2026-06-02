// components/laporan/FilterPanel.js
import React from 'react';
import { FaFilter, FaTimes, FaCalendarAlt, FaUser, FaTag, FaCalendarWeek } from 'react-icons/fa';

export default function FilterPanel({ filters, setFilters, options, onReset }) {
  const bulanOptions = [
    { value: 'all', label: 'Semua Bulan' },
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
  ];
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-500" />
          <h3 className="font-semibold text-gray-700">Filter Data</h3>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <FaTimes className="text-xs" />
          Reset Filter
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filter Tahun */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <FaCalendarAlt className="text-xs" />
            Tahun
          </label>
          <select
            value={filters.tahun}
            onChange={(e) => handleFilterChange('tahun', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {options.tahun?.map(tahun => (
              <option key={tahun} value={tahun}>{tahun}</option>
            ))}
          </select>
        </div>
        
        {/* Filter Bulan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <FaCalendarWeek className="text-xs" />
            Bulan
          </label>
          <select
            value={filters.bulan}
            onChange={(e) => handleFilterChange('bulan', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {bulanOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        {/* Filter Pegawai */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <FaUser className="text-xs" />
            Pegawai
          </label>
          <select
            value={filters.pegawai_id}
            onChange={(e) => handleFilterChange('pegawai_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Pegawai</option>
            {options.pegawai?.map(pegawai => (
              <option key={pegawai.id} value={pegawai.id}>
                {pegawai.nama} {pegawai.nip ? `- ${pegawai.nip}` : ''}
              </option>
            ))}
          </select>
        </div>
        
        {/* Filter Status SPM */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <FaTag className="text-xs" />
            Status SPM
          </label>
          <select
            value={filters.status_2}
            onChange={(e) => handleFilterChange('status_2', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Status</option>
            {options.status_2?.map(status => (
              <option key={status} value={status}>{status || 'Selesai'}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Info Filter Aktif */}
      {(filters.bulan !== 'all' || filters.pegawai_id !== 'all' || filters.status_2 !== 'all') && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {filters.bulan !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                Bulan: {bulanOptions.find(b => b.value === filters.bulan)?.label}
                <button onClick={() => handleFilterChange('bulan', 'all')} className="hover:text-blue-900">
                  <FaTimes className="text-xs" />
                </button>
              </span>
            )}
            {filters.pegawai_id !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                Pegawai: {options.pegawai?.find(p => p.id === parseInt(filters.pegawai_id))?.nama}
                <button onClick={() => handleFilterChange('pegawai_id', 'all')} className="hover:text-green-900">
                  <FaTimes className="text-xs" />
                </button>
              </span>
            )}
            {filters.status_2 !== 'all' && filters.status_2 !== 'selesai' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Status: {filters.status_2}
                <button onClick={() => handleFilterChange('status_2', 'selesai')} className="hover:text-purple-900">
                  <FaTimes className="text-xs" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}