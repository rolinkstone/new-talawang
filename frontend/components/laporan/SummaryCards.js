// components/laporan/SummaryCards.js
import React from 'react';
import { FaUsers, FaBriefcase, FaMoneyBillWave, FaBus, FaChartLine } from 'react-icons/fa';

export default function SummaryCards({ summary, filters, formatRupiah }) {
  const cards = [
    {
      title: 'Total Pegawai',
      value: summary?.total_pegawai || 0,
      icon: <FaUsers className="text-blue-500 text-2xl" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      description: 'Pegawai yang melakukan perjadin'
    },
    {
      title: 'Total Perjalanan Dinas',
      value: summary?.total_perjalanan || 0,
      icon: <FaBriefcase className="text-green-500 text-2xl" />,
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      description: 'Jumlah kegiatan perjadin'
    },
    {
      title: 'Total Uang Harian',
      value: `Rp ${formatRupiah(summary?.total_uang_harian || 0)}`,
      icon: <FaMoneyBillWave className="text-purple-500 text-2xl" />,
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
      description: 'Total uang harian dibayarkan'
    },
    {
      title: 'Total Transport Lokal',
      value: `Rp ${formatRupiah(summary?.total_transport || 0)}`,
      icon: <FaBus className="text-blue-500 text-2xl" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      description: 'Total transport perjalanan lokal'
    },
    {
      title: 'Total Keseluruhan',
      value: `Rp ${formatRupiah(summary?.total_keseluruhan || 0)}`,
      icon: <FaChartLine className="text-indigo-500 text-2xl" />,
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      description: 'UH + Transport Lokal'
    }
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`${card.bgColor} border ${card.borderColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.description}</p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm dark:shadow-gray-900/30">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Filter Info */}
      {filters && (
        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 p-2 rounded">
          Data untuk periode: {filters.tahun}
          {filters.bulan !== 'all' && ` - Bulan ${filters.bulan}`}
          {filters.pegawai_id !== 'all' && ' - Filter Pegawai Aktif'}
          {filters.status_2 && ` - Status: ${filters.status_2}`}
          {filters.jenis_spm && ` - Jenis SPM: ${filters.jenis_spm}`}
        </div>
      )}
    </div>
  );
}