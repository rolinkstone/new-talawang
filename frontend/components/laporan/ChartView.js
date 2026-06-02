// components/laporan/ChartView.js
import React, { useState } from 'react';
import { FaChartBar } from 'react-icons/fa';

export default function ChartView({ data, formatRupiah }) {
  const [chartType, setChartType] = useState('bar');
  
  const sortedData = [...data].sort((a, b) => b.total_uang_harian - a.total_uang_harian);
  const top10 = sortedData.slice(0, 10);
  const maxValue = Math.max(...top10.map(item => item.total_uang_harian), 0);
  
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-gray-700">Visualisasi Data Perjalanan Dinas</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
              chartType === 'bar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaChartBar /> Bar Chart
          </button>
        </div>
      </div>
      
      {/* Top 10 Pegawai by Total UH */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-600 mb-4">Top 10 Pegawai dengan Total Uang Harian Tertinggi</h4>
        <div className="space-y-3">
          {top10.map((item, idx) => {
            const percentage = (item.total_uang_harian / maxValue) * 100;
            return (
              <div key={item.pegawai_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">
                    {idx + 1}. {item.pegawai_nama}
                  </span>
                  <span className="text-gray-600">
                    Rp {formatRupiah(item.total_uang_harian)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end px-2 text-xs text-white ${
                      idx === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                      idx === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      idx === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                      'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 15 && `${Math.round(percentage)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{data.length}</p>
          <p className="text-sm text-gray-600">Total Pegawai</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">
            {data.reduce((sum, item) => sum + item.jumlah_perjalanan, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Perjalanan</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">
            {data.reduce((sum, item) => sum + item.total_hari_dinas, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Hari Dinas</p>
        </div>
      </div>
      
      {/* Rata-rata */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Statistik Rata-rata</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-500">Rata-rata UH per Pegawai</p>
            <p className="font-semibold">
              Rp {formatRupiah(data.reduce((sum, item) => sum + item.total_uang_harian, 0) / data.length)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rata-rata Hari per Pegawai</p>
            <p className="font-semibold">
              {(data.reduce((sum, item) => sum + item.total_hari_dinas, 0) / data.length).toFixed(1)} Hari
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rata-rata Perjalanan per Pegawai</p>
            <p className="font-semibold">
              {(data.reduce((sum, item) => sum + item.jumlah_perjalanan, 0) / data.length).toFixed(1)} Kali
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}