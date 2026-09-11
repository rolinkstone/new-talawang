// components/lpd/modals/LihatLPDModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function LihatLPDModal({ show, onClose, kegiatanId, kegiatanNama, session }) {
    const [loading, setLoading] = useState(true);
    const [lpdData, setLpdData] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('rincian');

    const fetchLpdData = async () => {
        if (!show || !kegiatanId) return;
        
        setLoading(true);
        setError('');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/lpd/kegiatan/${kegiatanId}`, {
                headers: { 'Authorization': `Bearer ${session?.accessToken}` }
            });
            
            if (response.data.success) {
                setLpdData(response.data.data);
            } else {
                setError(response.data.message || 'Gagal mengambil data LPD');
            }
        } catch (err) {
            console.error('Error fetching LPD data:', err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengambil data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchLpdData();
        }
    }, [show, kegiatanId]);

    const formatTanggal = (dateStr) => {
        if (!dateStr) return '-';
        return dateStr;
    };

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
                    className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 rounded-lg flex flex-col items-center justify-center border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                >
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-blue-600 dark:text-blue-300 font-medium mt-1">{fileExtension}</span>
                </div>
            );
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'selesai') {
            return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">✓ Selesai</span>;
        } else if (status === 'menunggu_kabalai') {
            return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">⏳ Menunggu Kabalai</span>;
        } else if (status === 'menunggu_katim') {
            return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">⏳ Menunggu Katim</span>;
        } else if (status === 'ditolak_katim') {
            return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">✗ Ditolak Katim</span>;
        } else if (status === 'ditolak_kabalai') {
            return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">✗ Ditolak Kabalai</span>;
        } else if (status === 'draft') {
            return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">📝 Draft</span>;
        }
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">{status || 'Draft'}</span>;
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>
                
                <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="px-4 pt-5 pb-4 bg-white dark:bg-gray-800 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                                    Detail Laporan Perjalanan Dinas (LPD)
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Kegiatan: <span className="font-medium">{kegiatanNama}</span>
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-500">{error}</div>
                        ) : lpdData ? (
                            <>
                                {/* Status Banner */}
                                <div className={`mb-4 p-3 rounded-md ${lpdData.lpd_status === 'selesai' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Status LPD:</span>
                                            {getStatusBadge(lpdData.lpd_status)}
                                        </div>
                                        {lpdData.submitted_at && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Dikirim: {formatTanggal(lpdData.submitted_at)}
                                            </div>
                                        )}
                                    </div>
                                    {lpdData.lpd_status === 'menunggu_kabalai' && lpdData.katim?.nama && (
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Disetujui oleh Katim: {lpdData.katim.nama} pada {formatTanggal(lpdData.katim.tgl_ttd)}
                                        </div>
                                    )}
                                    {lpdData.lpd_status === 'selesai' && lpdData.kabalai?.nama && (
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Disetujui oleh Kabalai: {lpdData.kabalai.nama} pada {formatTanggal(lpdData.kabalai.tgl_ttd)}
                                        </div>
                                    )}
                                </div>

                                {/* Tabs */}
                                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                                    <nav className="-mb-px flex space-x-8">
                                        <button
                                            onClick={() => setActiveTab('rincian')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                                activeTab === 'rincian' 
                                                    ? 'border-blue-500 text-blue-600' 
                                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            Rincian Kegiatan
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('dokumentasi')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                                activeTab === 'dokumentasi' 
                                                    ? 'border-blue-500 text-blue-600' 
                                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            Dokumentasi
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('pegawai')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                                activeTab === 'pegawai' 
                                                    ? 'border-blue-500 text-blue-600' 
                                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            Petugas Pelaksana
                                        </button>
                                    </nav>
                                </div>

                                {/* Tab Content */}
                                <div className="max-h-[60vh] overflow-y-auto">
                                    {/* Tab Rincian Kegiatan */}
                                    {activeTab === 'rincian' && (
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Informasi Kegiatan</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm mb-4 dark:text-gray-200">
                                                <div><span className="font-medium">Nomor ST:</span> {lpdData.dasar_pelaksanaan?.nomor_st || '-'}</div>
                                                <div><span className="font-medium">Tanggal ST:</span> {lpdData.dasar_pelaksanaan?.tanggal_st || '-'}</div>
                                                <div><span className="font-medium">MAK:</span> {lpdData.pembiayaan?.mak || '-'}</div>
                                                <div><span className="font-medium">Tempat:</span> {lpdData.waktu_tempat?.tempat_pelaksanaan || '-'}</div>
                                                <div><span className="font-medium">Tanggal:</span> {lpdData.waktu_tempat?.tanggal_mulai || '-'} s/d {lpdData.waktu_tempat?.tanggal_selesai || '-'}</div>
                                                <div><span className="font-medium">Lama:</span> {lpdData.waktu_tempat?.lama_perjalanan || '-'}</div>
                                            </div>

                                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3 mt-4">Rincian Hasil Kegiatan</h4>
                                            {lpdData.rincian_kegiatan && lpdData.rincian_kegiatan.length > 0 ? (
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
                                                            {lpdData.rincian_kegiatan.map((item, idx) => (
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
                                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Belum ada rincian kegiatan</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab Dokumentasi */}
                                    {activeTab === 'dokumentasi' && (
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Dokumentasi Kegiatan</h4>
                                            {lpdData.dokumentasi && lpdData.dokumentasi.length > 0 ? (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {lpdData.dokumentasi.map((doc, idx) => (
                                                        <div key={doc.id || idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                            <div className="flex justify-center mb-2">
                                                                {renderDokumentasiPreview(doc)}
                                                            </div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate text-center">{doc.file_name}</p>
                                                            {doc.keterangan && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{doc.keterangan}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Belum ada dokumentasi</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab Petugas Pelaksana */}
                                    {activeTab === 'pegawai' && (
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Petugas Pelaksana</h4>
                                            {lpdData.petugas_pelaksana && lpdData.petugas_pelaksana.length > 0 ? (
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
                                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Belum ada data petugas pelaksana</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Data tidak ditemukan</div>
                        )}
                    </div>

                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={onClose}
                            type="button"
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}