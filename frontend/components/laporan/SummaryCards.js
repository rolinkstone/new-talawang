// components/laporan/SummaryCards.js
import React from 'react';
import { FaUsers, FaBriefcase, FaCalendarWeek, FaMoneyBillWave } from 'react-icons/fa';

export default function SummaryCards({ summary, filters, formatRupiah }) {
  const cards = [
    {
      title: 'Total Pegawai',
      value: summary?.total_pegawai || 0,
      icon: <FaUsers className="text-blue-500 text-2xl" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Pegawai yang melakukan perjadin'
    },
    {
      title: 'Total Perjalanan Dinas',
      value: summary?.total_perjalanan || 0,
      icon: <FaBriefcase className="text-green-500 text-2xl" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Jumlah kegiatan perjadin'
    },
    {
      title: 'Total Hari Dinas',
      value: summary?.total_hari_dinas || 0,
      icon: <FaCalendarWeek className="text-orange-500 text-2xl" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Akumulasi hari perjalanan'
    },
    {
      title: 'Total Uang Harian',
      value: `Rp ${formatRupiah(summary?.total_uang_harian || 0)}`,
      icon: <FaMoneyBillWave className="text-purple-500 text-2xl" />,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Total uang harian dibayarkan'
    }
  ];
  
  // Hitung rata-rata
  const avgPerjalananPerPegawai = summary?.total_pegawai > 0 
    ? (summary.total_perjalanan / summary.total_pegawai).toFixed(1) 
    : 0;
  const avgHariPerPerjalanan = summary?.total_perjalanan > 0 
    ? (summary.total_hari_dinas / summary.total_perjalanan).toFixed(1) 
    : 0;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`${card.bgColor} border ${card.borderColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.description}</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      
      
      {/* Filter Info */}
      {filters && (
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          Data untuk periode: {filters.tahun}
          {filters.bulan !== 'all' && ` - Bulan ${filters.bulan}`}
          {filters.pegawai_id !== 'all' && ' - Filter Pegawai Aktif'}
          {filters.status_2 && ` - Status: ${filters.status_2}`}
        </div>
      )}
    </div>
  );
}