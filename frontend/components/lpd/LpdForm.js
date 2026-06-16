// components/lpd/LpdForm.js
import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
            return { text: 'Ditolak Katim/Kabag TU', color: 'bg-red-100 text-red-800 border-red-200' };
        }
        if (status === 'ditolak_kabalai') {
            return { text: 'Ditolak Kabalai', color: 'bg-red-100 text-red-800 border-red-200' };
        }
        if (status === 'menunggu_katim') {
            return { text: 'Menunggu Persetujuan Katim/Kabag TU', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
        }
        if (status === 'menunggu_kabalai') {
            return { text: 'Menunggu Persetujuan Kabalai', color: 'bg-purple-100 text-purple-800 border-purple-200' };
        }
        if (status === 'selesai') {
            return { text: 'Selesai', color: 'bg-green-100 text-green-800 border-green-200' };
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
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-20 h-20 bg-blue-50 rounded-lg flex flex-col items-center justify-center border border-blue-200 cursor-pointer hover:bg-blue-100 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                >
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-blue-600 font-medium mt-1">{fileExtension}</span>
                </div>
            );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Status Banner jika ditolak */}
            {isRejected && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-medium text-red-800">LPD Ditolak</h4>
                            <p className="text-sm text-red-700 mt-1">
                                {lpdData?.lpd_status === 'ditolak_katim' 
                                    ? `Ditolak oleh Katim/Kabag TU: ${lpdData?.katim?.catatan || 'Tidak ada catatan'}`
                                    : `Ditolak oleh Kabalai: ${lpdData?.kabalai?.catatan || 'Tidak ada catatan'}`
                                }
                            </p>
                            <p className="text-sm text-red-600 mt-2">
                                Silakan perbaiki rincian kegiatan dan/atau upload ulang dokumentasi, lalu kirim ulang ke Katim/Kabag TU.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Banner jika menunggu */}
            {statusBadge && !isRejected && (
                <div className={`p-3 border-b ${statusBadge.color.replace('text', 'bg').replace('800', '50')}`}>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusBadge.color}`}>
                            {statusBadge.text}
                        </span>
                    </div>
                </div>
            )}

            {/* Informasi Kegiatan */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Kegiatan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nama Kegiatan</label>
                        <p className="mt-1 text-sm text-gray-900">{lpdData?.nama_kegiatan || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor ST</label>
                        <p className="mt-1 text-sm text-gray-900">{lpdData?.dasar_pelaksanaan?.nomor_st || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal ST</label>
                        <p className="mt-1 text-sm text-gray-900">{lpdData?.dasar_pelaksanaan?.tanggal_st || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">MAK</label>
                        <p className="mt-1 text-sm text-gray-900">{lpdData?.pembiayaan?.mak || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tempat Pelaksanaan</label>
                        <p className="mt-1 text-sm text-gray-900">{lpdData?.waktu_tempat?.tempat_pelaksanaan || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal Pelaksanaan</label>
                        <p className="mt-1 text-sm text-gray-900">
                            {lpdData?.waktu_tempat?.tanggal_mulai || '-'} s/d {lpdData?.waktu_tempat?.tanggal_selesai || '-'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lama Perjalanan</label>
                        <p className="mt-1 text-sm text-gray-900">{lpdData?.waktu_tempat?.lama_perjalanan || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                    <button
                        onClick={() => setActiveTab('pegawai')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'pegawai' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Petugas Pelaksana
                    </button>
                    <button
                        onClick={() => setActiveTab('rincian')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'rincian' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Rincian Kegiatan
                    </button>
                    <button
                        onClick={() => setActiveTab('dokumentasi')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'dokumentasi' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Dokumentasi
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {/* Tab Petugas Pelaksana */}
                {activeTab === 'pegawai' && (
                    <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">Petugas Pelaksana</h4>
                        {lpdData?.petugas_pelaksana && lpdData.petugas_pelaksana.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">No</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nama</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NIP</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pangkat/Golongan</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Jabatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {lpdData.petugas_pelaksana.map((pegawai, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{pegawai.nama || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{pegawai.nip || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{pegawai.pangkat_golongan || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{pegawai.jabatan || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Belum ada data petugas pelaksana</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Rincian Kegiatan */}
                {activeTab === 'rincian' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-medium text-gray-900">Rincian Hasil Kegiatan</h4>
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
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">No</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kegiatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {rincianList.map((item, idx) => (
                                            <tr key={item.id || idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900">{item.no || idx + 1}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{item.tanggal}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{item.kegiatan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Belum ada rincian kegiatan</p>
                                {canEdit && (
                                    <button
                                        onClick={() => onOpenModal('rincian')}
                                        className="mt-2 text-indigo-600 hover:text-indigo-800"
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
                            <h4 className="text-md font-medium text-gray-900">Dokumentasi Kegiatan</h4>
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
                                    <div key={doc.id || idx} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex justify-center mb-2">
                                            {renderDokumentasiPreview(doc)}
                                        </div>
                                        <p className="text-xs text-gray-600 truncate text-center">{doc.file_name}</p>
                                        {doc.keterangan && (
                                            <p className="text-xs text-gray-500 text-center mt-1">{doc.keterangan}</p>
                                        )}
                                        {canEdit && (
                                            <button
                                                onClick={() => onOpenModal('delete', doc)}
                                                className="mt-2 w-full text-xs text-red-600 hover:text-red-800"
                                            >
                                                Hapus
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Belum ada dokumentasi</p>
                                {canEdit && (
                                    <button
                                        onClick={() => onOpenModal('dokumentasi')}
                                        className="mt-2 text-indigo-600 hover:text-indigo-800"
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