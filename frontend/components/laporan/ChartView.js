// components/laporan/ChartView.js
import React, { useState } from 'react';
import { FaChartBar, FaChartLine } from 'react-icons/fa';

export default function ChartView({ data, formatRupiah }) {
  const [chartType, setChartType] = useState('uang_harian');
  
  const sortedDataByUH = [...data].sort((a, b) => b.total_uang_harian - a.total_uang_harian);
  const sortedDataByTransport = [...data].sort((a, b) => b.total_transport - a.total_transport);
  const sortedDataByTotal = [...data].sort((a, b) => b.total_keseluruhan - a.total_keseluruhan);
  
  let top10 = [];
  let maxValue = 0;
  let chartTitle = '';
  let colorGradient = '';
  
  if (chartType === 'uang_harian') {
    top10 = sortedDataByUH.slice(0, 10);
    maxValue = Math.max(...top10.map(item => item.total_uang_harian), 0);
    chartTitle = 'Top 10 Pegawai dengan Total Uang Harian Tertinggi';
    colorGradient = 'from-green-500 to-green-600';
  } else if (chartType === 'transport') {
    top10 = sortedDataByTransport.slice(0, 10);
    maxValue = Math.max(...top10.map(item => item.total_transport), 0);
    chartTitle = 'Top 10 Pegawai dengan Total Transport Lokal Tertinggi';
    colorGradient = 'from-blue-500 to-blue-600';
  } else {
    top10 = sortedDataByTotal.slice(0, 10);
    maxValue = Math.max(...top10.map(item => item.total_keseluruhan), 0);
    chartTitle = 'Top 10 Pegawai dengan Total Keseluruhan Tertinggi';
    colorGradient = 'from-purple-500 to-purple-600';
  }
  
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }
  
  const totalUH = data.reduce((sum, item) => sum + (item.total_uang_harian || 0), 0);
  const totalTransport = data.reduce((sum, item) => sum + (item.total_transport || 0), 0);
  const totalKeseluruhan = data.reduce((sum, item) => sum + (item.total_keseluruhan || 0), 0);
  const totalHariTransportLokal = data.reduce((sum, item) => sum + (item.total_hari_transport_lokal || 0), 0);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-700">Visualisasi Data Perjalanan Dinas</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('uang_harian')}
            className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
              chartType === 'uang_harian' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaChartBar /> Uang Harian
          </button>
          <button
            onClick={() => setChartType('transport')}
            className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
              chartType === 'transport' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaChartBar /> Transport Lokal
          </button>
          <button
            onClick={() => setChartType('total')}
            className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
              chartType === 'total' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaChartBar /> Total Keseluruhan
          </button>
        </div>
      </div>
      
      {/* Top 10 Chart */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-600 mb-4">{chartTitle}</h4>
        <div className="space-y-3">
          {top10.map((item, idx) => {
            let value = 0;
            if (chartType === 'uang_harian') value = item.total_uang_harian;
            else if (chartType === 'transport') value = item.total_transport;
            else value = item.total_keseluruhan;
            
            const percentage = (value / maxValue) * 100;
            return (
              <div key={item.pegawai_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">
                    {idx + 1}. {item.pegawai_nama}
                  </span>
                  <span className="text-gray-600">
                    Rp {formatRupiah(value)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end px-2 text-xs text-white bg-gradient-to-r ${colorGradient}`}
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
      
      {/* Summary Stats - 6 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <p className="text-xl font-bold text-blue-600">{data.length}</p>
          <p className="text-xs text-gray-600">Total Pegawai</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-xl font-bold text-green-600">
            {data.reduce((sum, item) => sum + (item.jumlah_perjalanan || 0), 0)}
          </p>
          <p className="text-xs text-gray-600">Total Perjalanan</p>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded-lg">
          <p className="text-xl font-bold text-yellow-600">
            {data.reduce((sum, item) => sum + (item.total_hari_dinas || 0), 0)}
          </p>
          <p className="text-xs text-gray-600">Total Hari Dinas</p>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded-lg">
          <p className="text-xl font-bold text-orange-600">
            {totalHariTransportLokal}
          </p>
          <p className="text-xs text-gray-600">Hari Transport Lokal</p>
        </div>
        <div className="text-center p-2 bg-teal-50 rounded-lg">
          <p className="text-xl font-bold text-teal-600">Rp {formatRupiah(totalUH)}</p>
          <p className="text-xs text-gray-600">Total Uang Harian</p>
        </div>
        <div className="text-center p-2 bg-purple-50 rounded-lg">
          <p className="text-xl font-bold text-purple-600">Rp {formatRupiah(totalKeseluruhan)}</p>
          <p className="text-xs text-gray-600">Total Keseluruhan</p>
        </div>
      </div>
      
      {/* Statistik Ringkasan */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-600 mb-3">Ringkasan Biaya</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Uang Harian:</span>
              <span className="font-semibold text-green-600">Rp {formatRupiah(totalUH)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Transport Lokal:</span>
              <span className="font-semibold text-blue-600">Rp {formatRupiah(totalTransport)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Total Keseluruhan:</span>
              <span className="font-bold text-purple-600">Rp {formatRupiah(totalKeseluruhan)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rata-rata UH per Pegawai:</span>
              <span className="font-semibold">Rp {formatRupiah(totalUH / data.length)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rata-rata Transport per Pegawai:</span>
              <span className="font-semibold">Rp {formatRupiah(totalTransport / data.length)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Rata-rata Total per Pegawai:</span>
              <span className="font-semibold text-purple-600">Rp {formatRupiah(totalKeseluruhan / data.length)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}