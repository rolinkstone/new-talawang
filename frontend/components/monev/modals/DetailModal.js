// components/monev/modals/DetailModal.js
import React from 'react';

export default function DetailModal({ show, onClose, loading, data, formatRupiah }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative inline-block bg-white dark:bg-gray-800 rounded-lg shadow-xl text-left overflow-hidden transform transition-all sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Detail Biaya Perjadin</h3>
            <button onClick={onClose} className="text-white hover:text-indigo-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Memuat detail...</span>
              </div>
            ) : data ? (
              <div className="space-y-6">
                {/* Informasi Pegawai */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Informasi Petugas</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Nama:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.nama}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">NIP:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.nip || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Pangkat:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.pangkat || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Jabatan:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.jabatan || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Informasi Kegiatan */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Informasi Kegiatan</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Kegiatan:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.nama_kegiatan}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">MAK:</span>
                      <p className="font-mono text-sm text-gray-800 dark:text-gray-200">{data.mak}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">No ST:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.no_st || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">PPK:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.ppk_nama || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tempat:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{data.tempat || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Rincian Biaya */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Rincian Biaya</h4>

                  {/* Transportasi */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Transportasi
                    </h5>
                    {data.rincian?.transportasi?.items?.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left py-1 pr-2 text-gray-500 dark:text-gray-400">Jenis</th>
                            <th className="text-right py-1 px-2 text-gray-500 dark:text-gray-400">Harga</th>
                            <th className="text-right py-1 pl-2 text-gray-500 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.rincian.transportasi.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-1 pr-2 dark:text-gray-200">{item.trans || '-'}</td>
                              <td className="text-right py-1 px-2 dark:text-gray-200">{formatRupiah(item.harga)}</td>
                              <td className="text-right py-1 pl-2 font-medium dark:text-gray-200">{formatRupiah(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold">
                            <td className="py-2 pr-2 text-gray-700 dark:text-gray-200">Subtotal Transport</td>
                            <td></td>
                            <td className="text-right py-2 pl-2 text-blue-700 dark:text-blue-400">
                              {formatRupiah(data.rincian.transportasi.subtotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">Tidak ada biaya transportasi</p>
                    )}
                  </div>

                  {/* Uang Harian */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Uang Harian
                    </h5>
                    {data.rincian?.uang_harian?.items?.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left py-1 pr-2 text-gray-500 dark:text-gray-400">Jenis</th>
                            <th className="text-center py-1 px-2 text-gray-500 dark:text-gray-400">Qty</th>
                            <th className="text-right py-1 px-2 text-gray-500 dark:text-gray-400">Harga</th>
                            <th className="text-right py-1 pl-2 text-gray-500 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.rincian.uang_harian.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-1 pr-2 dark:text-gray-200">{item.jenis || '-'}</td>
                              <td className="text-center py-1 px-2 dark:text-gray-200">{item.qty}</td>
                              <td className="text-right py-1 px-2 dark:text-gray-200">{formatRupiah(item.harga)}</td>
                              <td className="text-right py-1 pl-2 font-medium dark:text-gray-200">{formatRupiah(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold">
                            <td className="py-2 pr-2 text-gray-700 dark:text-gray-200">Subtotal Uang Harian</td>
                            <td></td>
                            <td></td>
                            <td className="text-right py-2 pl-2 text-green-700 dark:text-green-400">
                              {formatRupiah(data.rincian.uang_harian.subtotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">Tidak ada biaya uang harian</p>
                    )}
                  </div>

                  {/* Penginapan */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Hotel / Penginapan
                    </h5>
                    {data.rincian?.penginapan?.items?.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left py-1 pr-2 text-gray-500 dark:text-gray-400">Jenis</th>
                            <th className="text-center py-1 px-2 text-gray-500 dark:text-gray-400">Qty</th>
                            <th className="text-right py-1 px-2 text-gray-500 dark:text-gray-400">Harga</th>
                            <th className="text-right py-1 pl-2 text-gray-500 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.rincian.penginapan.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-1 pr-2 dark:text-gray-200">{item.jenis || '-'}</td>
                              <td className="text-center py-1 px-2 dark:text-gray-200">{item.qty}</td>
                              <td className="text-right py-1 px-2 dark:text-gray-200">{formatRupiah(item.harga)}</td>
                              <td className="text-right py-1 pl-2 font-medium dark:text-gray-200">{formatRupiah(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold">
                            <td className="py-2 pr-2 text-gray-700 dark:text-gray-200">Subtotal Penginapan</td>
                            <td></td>
                            <td></td>
                            <td className="text-right py-2 pl-2 text-purple-700 dark:text-purple-400">
                              {formatRupiah(data.rincian.penginapan.subtotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">Tidak ada biaya penginapan</p>
                    )}
                  </div>

                  {/* Total Keseluruhan */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-800 dark:text-gray-100">Total Keseluruhan</span>
                      <span className="text-base font-bold text-indigo-700 dark:text-indigo-400">
                        {formatRupiah(data.total_biaya)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Data tidak ditemukan
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
