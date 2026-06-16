import React from 'react';

export default function KegiatanTable({
  paginatedItems,
  detailShown,
  detailData,
  pegawaiDetailShown,
  userType,
  sortConfig,
  currentPage,
  totalPages,
  totalItems,
  ITEMS_PER_PAGE,
  formatDateForDisplay,
  formatRupiah,
  renderStatusBadge,
  hasValidStatus2,
  getStatus2Color,
  onSort,
  onEdit,
  onDelete,
  onPrint,
  onToggleDetail,
  onTogglePegawaiDetail,
  onOpenHistoriModal,
  onOpenStatus2Modal,
  onOpenKirimPPKModal,
  onOpenMengetahuiModal,
  onOpenPersetujuanModal,
  onOpenSuratTugasModal,
  onCalculateTotal,
  onPageChange
}) {
  return (
    <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('id')}>ID</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('status')}>Status</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('jenis_spm')}>Jenis SPM</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('mak')}>Kegiatan & MAK</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('realisasi_anggaran_sebelumnya')}>Realisasi Dan Target</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('lokasi_tanggal')}>Lokasi & Tanggal</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-tight cursor-pointer hover:bg-gray-200" onClick={() => onSort('total_nominatif')}>Nominatif</th>
              <th className="px-2 py-2 text-center text-[11px] font-bold text-white uppercase tracking-tight bg-gradient-to-r from-blue-600 to-blue-700">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedItems.length > 0 ? (
              paginatedItems.map(item => (
                <React.Fragment key={item.id}>
                  <tr className={item.jenis_spm === 'KKP' ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4">{item.id}</td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onOpenHistoriModal(item)}
                            className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors duration-200 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 border border-blue-200 hover:border-blue-300 bg-blue-50/50"
                            title="Lihat catatan dan riwayat perubahan"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {renderStatusBadge(item.status, item.no_st, item.tgl_st)}
                          </button>
                        </div>

                        {item.status === 'selesai' && (
                          <div className="mt-1">
                            <div className="text-xs text-gray-500 mb-1">Status Sakti:</div>
                            <div className="flex flex-col items-start gap-2">
                              {hasValidStatus2(item.status_2) ? (
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatus2Color(item.status_2)}`}>
                                    {item.status_2} {item.catatan_status_2 ? `|| ${item.catatan_status_2}` : ''}
                                  </span>
                                  {userType.isAdmin && (
                                    <button
                                      onClick={() => onOpenStatus2Modal(item)}
                                      className="flex items-center gap-1 px-2 py-1 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600 transition"
                                      title="Ubah Status 2"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Ubah
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">Belum diisi</span>
                                  {userType.isAdmin && (
                                    <button
                                      onClick={() => onOpenStatus2Modal(item)}
                                      className="flex items-center gap-1 px-2 py-1 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600 transition"
                                      title="Ubah Status 2"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Ubah
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm">{item.jenis_spm}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{item.kegiatan || '-'}</div>
                        <div className="font-medium text-gray-900">{item.mak || '-'}</div>
                        <div className="font-medium text-gray-900">{item.no_st || '-'}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm"><span className="font-medium">Target Setahun:</span> {item.target_output_tahun}</div>
                        <div className="text-sm"><span className="font-medium">Realisasi Sebelumnya:</span> {item.realisasi_anggaran_sebelumnya}</div>
                        <div className="text-sm"><span className="font-medium">Realisasi Output Sebelumnya:</span> {item.realisasi_output_sebelumnya}</div>
                        <div className="text-sm"><span className="font-medium">Target Output Akan Dicapai:</span> {item.target_output_yg_akan_dicapai}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="font-medium text-gray-900 text-sm">{item.kota_kab_kecamatan || '-'}</div>
                        <div className="text-xs text-gray-600">
                          {item.rencana_tanggal_pelaksanaan 
                            ? (item.rencana_tanggal_pelaksanaan_akhir 
                              ? `${formatDateForDisplay(item.rencana_tanggal_pelaksanaan)} - ${formatDateForDisplay(item.rencana_tanggal_pelaksanaan_akhir)}`
                              : formatDateForDisplay(item.rencana_tanggal_pelaksanaan))
                            : '-'}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-green-700">
                      {item.total_nominatif !== undefined ? (
                        <>Rp {formatRupiah(item.total_nominatif)}</>
                      ) : (
                        <button
                          onClick={() => onCalculateTotal(item.id)}
                          className="px-2 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-500 transition"
                        >
                          Hitung
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {userType.isRegularUser && (item.status === 'draft' || item.status === 'dikembalikan') && (
                            <>
                              <button onClick={() => onEdit(item.id)} className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536L12 14H9v-3z" /></svg>
                                Edit
                              </button>
                              <button onClick={() => onDelete(item.id)} className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3m-9 0h12" /></svg>
                                Delete
                              </button>
                            </>
                          )}
                          {(item.status === 'selesai' || item.status === 'diketahui' || item.status === 'disetujui') && (
                            <button onClick={(e) => onPrint(item, e)} className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition" title="Cetak Dokumen">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              Print
                            </button>
                          )}
                          <button onClick={() => onToggleDetail(item.id)} className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                            {detailShown[item.id] ? "Hide" : "Show"}
                          </button>
                        </div>

                        {userType.isRegularUser && (item.status === 'draft' || item.status === 'dikembalikan') && (
                          <button onClick={() => onOpenKirimPPKModal(item.id)} className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            Kirim ke PPK
                          </button>
                        )}

                        {userType.isPPK && item.status === 'diajukan' && (
                          <button onClick={() => onOpenMengetahuiModal(item.id, item)} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Mengetahui
                          </button>
                        )}

                        {userType.isKabalai && item.status === 'diketahui' && !item.nama_kabalai && (
                          <button onClick={() => onOpenPersetujuanModal(item.id, item)} className="flex items-center gap-2 px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            Persetujuan
                          </button>
                        )}

                        {userType.isRegularUser && item.status === 'disetujui' && (!item.no_st || item.no_st.trim().length === 0) && (
                          <button onClick={() => onOpenSuratTugasModal(item)} className="flex items-center justify-center gap-2 px-4 py-2 w-full min-w-[120px] bg-orange-600 text-white rounded-md hover:bg-orange-700 transition mt-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="whitespace-nowrap">Surat Tugas</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {detailShown[item.id] && detailData[item.id]?.pegawai?.length > 0 && (
                    <tr className={item.jenis_spm === 'KKP' ? 'bg-blue-50' : 'bg-gray-100'}>
                      <td colSpan={12} className="px-6 py-4">
                        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                          <thead>
                            <tr className={item.jenis_spm === 'KKP' ? 'bg-blue-200' : 'bg-gray-200'}>
                              <th className="px-4 py-2 text-left">ID</th>
                              <th className="px-4 py-2 text-left">Nama</th>
                              <th className="px-4 py-2 text-left">NIP</th>
                              <th className="px-4 py-2 text-left">Pangkat</th>
                              <th className="px-4 py-2 text-left">Jabatan</th>
                              <th className="px-4 py-2 text-left">Total Biaya</th>
                              <th className="px-4 py-2 text-left">Rincian Biaya</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData[item.id].pegawai.map(p => (
                              <React.Fragment key={p.id}>
                                <tr className={item.jenis_spm === 'KKP' ? 'hover:bg-blue-100' : 'hover:bg-gray-50'}>
                                  <td className="px-4 py-2">{p.id}</td>
                                  <td className="px-4 py-2">{p.nama}</td>
                                  <td className="px-4 py-2">{p.nip}</td>
                                  <td className="px-4 py-2">{p.pangkat || '-'}</td>
                                  <td className="px-4 py-2">{p.jabatan}</td>
                                  <td className="px-4 py-2 font-semibold text-green-700">Rp {formatRupiah(p.total_biaya)}</td>
                                  <td className="px-4 py-2">
                                    <button onClick={() => onTogglePegawaiDetail(p.id)} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                                      {pegawaiDetailShown[p.id] ? 'Hide' : 'Show'}
                                    </button>
                                  </td>
                                </tr>

                                {pegawaiDetailShown[p.id] && p.biaya_list && p.biaya_list.length > 0 && (
                                  <tr className={item.jenis_spm === 'KKP' ? 'bg-blue-50' : 'bg-gray-50'}>
                                    <td colSpan={7} className="px-4 py-2">
                                      {p.biaya_list.map((b, idx) => {
                                        const totalTransport = (b.transportasi || []).reduce((sum, t) => sum + Number(t.total || 0), 0);
                                        const totalUH = (b.uang_harian || []).reduce((sum, u) => sum + Number(u.total || 0), 0);
                                        const totalPenginapan = (b.penginapan || []).reduce((sum, pItem) => sum + Number(pItem.total || 0), 0);
                                        const grandTotal = totalTransport + totalUH + totalPenginapan;
                                        const maxRows = Math.max((b.transportasi || []).length, (b.uang_harian || []).length, (b.penginapan || []).length);

                                        return (
                                          <div key={idx} className="mb-4 p-4 border border-gray-400 rounded-md">
                                            <h6 className="font-medium text-gray-800 mb-3">Rincian</h6>
                                            <div className="overflow-x-auto">
                                              <table className="min-w-full border border-gray-400 text-sm mb-3">
                                                <thead className="bg-gray-200">
                                                  <tr>
                                                    <th colSpan="3" className="border border-gray-700 px-2 py-1 text-center">Transportasi</th>
                                                    <th colSpan="4" className="border border-gray-700 px-2 py-1 text-center">Uang Harian</th>
                                                    <th colSpan="4" className="border border-gray-700 px-2 py-1 text-center">Penginapan</th>
                                                  </tr>
                                                  <tr>
                                                    <th className="border border-gray-700 px-2 py-1">Jenis</th>
                                                    <th className="border border-gray-700 px-2 py-1">Harga</th>
                                                    <th className="border border-gray-700 px-2 py-1">Total</th>
                                                    <th className="border border-gray-700 px-2 py-1">Jenis</th>
                                                    <th className="border border-gray-700 px-2 py-1">Qty</th>
                                                    <th className="border border-gray-700 px-2 py-1">Harga</th>
                                                    <th className="border border-gray-700 px-2 py-1">Total</th>
                                                    <th className="border border-gray-700 px-2 py-1">Jenis</th>
                                                    <th className="border border-gray-700 px-2 py-1">Qty</th>
                                                    <th className="border border-gray-700 px-2 py-1">Harga</th>
                                                    <th className="border border-gray-700 px-2 py-1">Total</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {Array.from({ length: maxRows }).map((_, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                      <td className="border px-2 py-1">{(b.transportasi || [])[i]?.trans || ""}</td>
                                                      <td className="border px-2 py-1 text-right">{(b.transportasi || [])[i] ? formatRupiah((b.transportasi || [])[i].harga) : ""}</td>
                                                      <td className="border px-2 py-1 text-right font-medium">{(b.transportasi || [])[i] ? formatRupiah((b.transportasi || [])[i].total) : ""}</td>
                                                      <td className="border px-2 py-1">{(b.uang_harian || [])[i]?.jenis || ""}</td>
                                                      <td className="border px-2 py-1 text-center">{(b.uang_harian || [])[i]?.qty || ""}</td>
                                                      <td className="border px-2 py-1 text-right">{(b.uang_harian || [])[i] ? formatRupiah((b.uang_harian || [])[i].harga) : ""}</td>
                                                      <td className="border px-2 py-1 text-right font-medium">{(b.uang_harian || [])[i] ? formatRupiah((b.uang_harian || [])[i].total) : ""}</td>
                                                      <td className="border px-2 py-1">{(b.penginapan || [])[i]?.jenis || ""}</td>
                                                      <td className="border px-2 py-1 text-center">{(b.penginapan || [])[i]?.qty || ""}</td>
                                                      <td className="border px-2 py-1 text-right">{(b.penginapan || [])[i] ? formatRupiah((b.penginapan || [])[i].harga) : ""}</td>
                                                      <td className="border px-2 py-1 text-right font-medium">{(b.penginapan || [])[i] ? formatRupiah((b.penginapan || [])[i].total) : ""}</td>
                                                    </tr>
                                                  ))}
                                                  <tr className="bg-gray-100 font-medium">
                                                    <td colSpan="2" className="border px-2 py-1 text-right">Total Transportasi:</td>
                                                    <td className="border px-2 py-1 text-right text-green-700">Rp {formatRupiah(totalTransport)}</td>
                                                    <td colSpan="3" className="border px-2 py-1 text-right">Total Uang Harian:</td>
                                                    <td className="border px-2 py-1 text-right text-green-700">Rp {formatRupiah(totalUH)}</td>
                                                    <td colSpan="3" className="border px-2 py-1 text-right">Total Penginapan:</td>
                                                    <td className="border px-2 py-1 text-right text-green-700">Rp {formatRupiah(totalPenginapan)}</td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </div>
                                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                              <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-700">Total Rincian Ini:</span>
                                                <span className="text-xl font-bold text-green-800">Rp {formatRupiah(grandTotal)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="px-6 py-4 text-center text-gray-500">Tidak ada data kegiatan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} kegiatan
          </div>
          <div className="space-x-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            <span className="px-3 py-2">Halaman {currentPage} dari {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage * ITEMS_PER_PAGE >= totalItems}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}
    </>
  );
}
