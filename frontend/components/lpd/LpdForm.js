// components/lpd/LpdForm.js
import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function LpdForm({ lpdData, session, apiBaseUrl, onRefresh, onOpenModal }) {
    const [activeTab, setActiveTab] = useState('pegawai');
    const [dokumentasiList, setDokumentasiList] = useState([]);
    const [rincianList, setRincianList] = useState([]);

    // Update state ketika lpdData berubah
    useEffect(() => {
        if (lpdData) {
            setDokumentasiList(lpdData.dokumentasi || []);
            setRincianList(lpdData.rincian_kegiatan || []);
        }
    }, [lpdData]);

    // 🔥 PERBAIKAN: canEdit true jika status draft ATAU ditolak_katim ATAU ditolak_kabalai
    const canEdit = lpdData?.can_edit === true || 
                    lpdData?.lpd_status === 'ditolak_katim' || 
                    lpdData?.lpd_status === 'ditolak_kabalai';
    
    // Status badge untuk ditolak
    const getStatusBadge = () => {
        const status = lpdData?.lpd_status;
        if (status === 'ditolak_katim') {
            return { text: 'Ditolak Katim/Kabag TU', color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800' };
        }
        if (status === 'ditolak_kabalai') {
            return { text: 'Ditolak Kabalai', color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800' };
        }
        if (status === 'menunggu_katim') {
            return { text: 'Menunggu Persetujuan Katim/Kabag TU', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800' };
        }
        if (status === 'menunggu_kabalai') {
            return { text: 'Menunggu Persetujuan Kabalai', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800' };
        }
        if (status === 'selesai') {
            return { text: 'Selesai', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800' };
        }
        return null;
    };

    const statusBadge = getStatusBadge();
    const isRejected = lpdData?.lpd_status === 'ditolak_katim' || lpdData?.lpd_status === 'ditolak_kabalai';

    // Format tanggal
    const formatTanggal = (dateStr) => {
        if (!dateStr) return '-';
        return dateStr;
    };

    // Render preview gambar dokumentasi
    const renderDokumentasiPreview = (dokumentasi) => {
        if (!dokumentasi || !dokumentasi.file_path) {
            return (
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            );
        }

        const filename = dokumentasi.file_path.split('/').pop();
        const imageUrl = `${BACKEND_URL}/uploads/lpd-dokumentasi/${filename}`;
        const isImage = dokumentasi.file_type?.startsWith('image/');

        if (isImage) {
            return (
                <img 
                    src={imageUrl}
                    alt={dokumentasi.keterangan || dokumentasi.file_name || 'Preview'}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                    onError={(e) => {
                        console.error('Image failed to load:', imageUrl);
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23999"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /%3E%3C/svg%3E';
                    }}
                />
            );
        } else {
            const fileExtension = dokumentasi.file_name?.split('.').pop()?.toUpperCase() || 'FILE';
            return (
                <div 
                    className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 rounded-lg flex flex-col items-center justify-center border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                >
                    <svg className="w-8 h-8 text-blue-500 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-blue-600 dark:text-blue-300 font-medium mt-1">{fileExtension}</span>
                </div>
            );
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Status Banner jika ditolak */}
            {isRejected && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-medium text-red-800 dark:text-red-300">LPD Ditolak</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                {lpdData?.lpd_status === 'ditolak_katim' 
                                    ? `Ditolak oleh Katim/Kabag TU: ${lpdData?.katim?.catatan || 'Tidak ada catatan'}`
                                    : `Ditolak oleh Kabalai: ${lpdData?.kabalai?.catatan || 'Tidak ada catatan'}`
                                }
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                Silakan perbaiki rincian kegiatan dan/atau upload ulang dokumentasi, lalu kirim ulang ke Katim/Kabag TU.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Banner jika menunggu */}
            {statusBadge && !isRejected && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusBadge.color}`}>
                            {statusBadge.text}
                        </span>
                    </div>
                </div>
            )}

            {/* Banner LPD Shared (No ST yang sama) */}
            {lpdData?.lpd_shared_done === true && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-medium text-emerald-800 dark:text-emerald-300">LPD Sudah Terisi (No ST yang sama)</h4>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                                Rincian kegiatan &amp; dokumentasi LPD ditampilkan dari kegiatan lain dengan No ST yang sama.
                                Anda tidak perlu mengisi LPD lagi — langsung isi Kwitansi (LPJ) di menu Kwitansi.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Informasi Kegiatan */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Informasi Kegiatan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Kegiatan</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lpdData?.nama_kegiatan || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nomor ST</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lpdData?.dasar_pelaksanaan?.nomor_st || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal ST</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lpdData?.dasar_pelaksanaan?.tanggal_st || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">MAK</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lpdData?.pembiayaan?.mak || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tempat Pelaksanaan</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lpdData?.waktu_tempat?.tempat_pelaksanaan || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Pelaksanaan</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                            {lpdData?.waktu_tempat?.tanggal_mulai || '-'} s/d {lpdData?.waktu_tempat?.tanggal_selesai || '-'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lama Perjalanan</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lpdData?.waktu_tempat?.lama_perjalanan || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 px-6">
                    <button
                        onClick={() => setActiveTab('pegawai')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'pegawai' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        Petugas Pelaksana
                    </button>
                    <button
                        onClick={() => setActiveTab('rincian')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'rincian' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        Rincian Kegiatan
                    </button>
                    <button
                        onClick={() => setActiveTab('dokumentasi')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'dokumentasi' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        Dokumentasi
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 dark:bg-gray-800">
                {/* Tab Petugas Pelaksana */}
                {activeTab === 'pegawai' && (
                    <div>
                        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Petugas Pelaksana</h4>
                        {lpdData?.petugas_pelaksana && lpdData.petugas_pelaksana.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">No</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Nama</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">NIP</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Pangkat/Golongan</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Jabatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {lpdData.petugas_pelaksana.map((pegawai, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{idx + 1}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{pegawai.nama || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{pegawai.nip || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{pegawai.pangkat_golongan || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{pegawai.jabatan || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Belum ada data petugas pelaksana</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Rincian Kegiatan */}
                {activeTab === 'rincian' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Rincian Hasil Kegiatan</h4>
                            {canEdit && (
                                <button
                                    onClick={() => onOpenModal('rincian')}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    {rincianList.length > 0 ? 'Edit Rincian' : 'Tambah Rincian'}
                                </button>
                            )}
                        </div>
                        
                        {rincianList.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">No</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Tanggal</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Kegiatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {rincianList.map((item, idx) => (
                                            <tr key={item.id || idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.no || idx + 1}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.tanggal}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.kegiatan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Belum ada rincian kegiatan</p>
                                {canEdit && (
                                    <button
                                        onClick={() => onOpenModal('rincian')}
                                        className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                                    >
                                        + Tambah Rincian
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Dokumentasi */}
                {activeTab === 'dokumentasi' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Dokumentasi Kegiatan</h4>
                            {canEdit && (
                                <button
                                    onClick={() => onOpenModal('dokumentasi')}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Upload Dokumentasi
                                </button>
                            )}
                        </div>
                        
                        {dokumentasiList.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {dokumentasiList.map((doc, idx) => (
                                    <div key={doc.id || idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                        <div className="flex justify-center mb-2">
                                            {renderDokumentasiPreview(doc)}
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate text-center">{doc.file_name}</p>
                                        {doc.keterangan && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{doc.keterangan}</p>
                                        )}
                                        {canEdit && (
                                            <button
                                                onClick={() => onOpenModal('delete', doc)}
                                                className="mt-2 w-full text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                            >
                                                Hapus
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Belum ada dokumentasi</p>
                                {canEdit && (
                                    <button
                                        onClick={() => onOpenModal('dokumentasi')}
                                        className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                                    >
                                        + Upload Dokumentasi
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}