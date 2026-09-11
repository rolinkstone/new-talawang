// components/laporan/DetailModal.js
import React from 'react';
import { 
  FaTimes, FaUser, FaIdCard, FaBriefcase, FaMoneyBillWave, 
  FaCalendarAlt, FaMapMarkerAlt, FaFileAlt, FaCalendarWeek,
  FaBus, FaChartLine
} from 'react-icons/fa';

export default function DetailModal({ isOpen, onClose, pegawai, detail, loading, formatRupiah }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <FaUser size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Detail Perjalanan Dinas</h3>
                <p className="text-sm text-blue-100">{pegawai?.pegawai_nama}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <FaTimes size={20} />
            </button>
          </div>
          
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : detail ? (
              <>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <FaIdCard className="text-blue-600 dark:text-blue-400" />
                    Informasi Pegawai
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">Nama Lengkap</p><p className="font-medium dark:text-gray-200">{detail.pegawai?.nama || '-'}</p></div>
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">NIP</p><p className="font-medium dark:text-gray-200">{detail.pegawai?.nip || '-'}</p></div>
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">Pangkat/Golongan</p><p className="font-medium dark:text-gray-200">{detail.pegawai?.pangkat || '-'}</p></div>
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">Jabatan</p><p className="font-medium dark:text-gray-200">{detail.pegawai?.jabatan || '-'}</p></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <FaChartLine className="text-blue-600 dark:text-blue-400" />
                    Ringkasan Perjalanan Dinas
                  </h4>
                  
                  {/* Baris 1: Total Perjalanan & Total Hari Dinas */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/30">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{detail.ringkasan?.total_perjalanan || 0}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Perjalanan Dinas</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/30">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{detail.ringkasan?.total_hari_dinas || 0}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Hari Dinas</p>
                    </div>
                  </div>
                  
                  {/* Baris 2: Uang Harian */}
                  <div className="mb-6">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/30">
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">Rp {formatRupiah(detail.ringkasan?.total_uang_harian || 0)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Uang Harian</p>
                    </div>
                  </div>
                  
                  {/* Baris 3: Hari Transport Lokal & Total Transport Lokal */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/30">
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{detail.ringkasan?.total_hari_transport_lokal || 0}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hari Transport Lokal</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/30">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">Rp {formatRupiah(detail.ringkasan?.total_transport || 0)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Transport Lokal</p>
                    </div>
                  </div>
                  
                  {/* Baris 4: Total Keseluruhan */}
                  <div>
                    <div className="text-center p-3 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-800/30 rounded-lg shadow-sm dark:shadow-gray-900/30 border border-purple-200 dark:border-purple-800">
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">Rp {formatRupiah(detail.ringkasan?.total_keseluruhan || 0)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">Total Keseluruhan (UH + Transport Lokal)</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <FaBriefcase className="text-blue-600 dark:text-blue-400" />
                    Daftar Perjalanan Dinas
                  </h4>
                  <div className="space-y-4">
                    {detail.detail_perjalanan?.map((perjalanan, idx) => (
                      <div key={idx} className={`border rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow ${perjalanan.is_lokal ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-semibold text-gray-800 dark:text-gray-100">{perjalanan.kegiatan_nama}</h5>
                              {perjalanan.is_lokal && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-full text-xs">
                                  <FaBus size={10} /> Lokal
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">MAK: {perjalanan.mak || '-'}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded text-xs">#{idx + 1}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <FaFileAlt className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">No ST:</span>
                            <span className="font-medium dark:text-gray-200">{perjalanan.no_st || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Tgl ST:</span>
                            <span className="font-medium dark:text-gray-200">{perjalanan.tgl_st || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Periode:</span>
                            <span className="font-medium dark:text-gray-200">{perjalanan.tgl_mulai} s/d {perjalanan.tgl_selesai}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Lokasi:</span>
                            <span className="font-medium dark:text-gray-200">{perjalanan.lokasi || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaCalendarWeek className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Jumlah Hari:</span>
                            <span className="font-medium dark:text-gray-200">{perjalanan.jumlah_hari} Hari</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaBus className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Hari Transport Lokal:</span>
                            <span className={`font-medium ${perjalanan.hari_transport_lokal > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {perjalanan.hari_transport_lokal || 0} Hari
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaMoneyBillWave className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Uang Harian:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">Rp {formatRupiah(perjalanan.uang_harian)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaBus className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Transport Lokal:</span>
                            <span className={`font-medium ${perjalanan.transport > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              Rp {formatRupiah(perjalanan.transport)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 md:col-span-2">
                            <FaMoneyBillWave className="text-purple-400 dark:text-purple-300" />
                            <span className="text-gray-600 dark:text-gray-400">Total (UH + Transport):</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">Rp {formatRupiah(perjalanan.total)}</span>
                          </div>
                        </div>
                        {perjalanan.status_2 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${perjalanan.status_2 === 'selesai' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200'}`}>
                              Status SPM: {perjalanan.status_2}
                            </span>
                            {perjalanan.catatan_status_2 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Catatan: {perjalanan.catatan_status_2}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Gagal memuat data detail</div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}