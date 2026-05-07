// components/kwitansi/KwitansiDetailModal.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function KwitansiDetailModal({ item, onClose, formatDateFn, formatRupiah, onRefresh }) {
    const { data: session } = useSession();
    const [fileUrl, setFileUrl] = useState(null);
    const [fileError, setFileError] = useState(false);
    const [statusTtd, setStatusTtd] = useState(item.status_ttd || 'belum');
    const [catatanTtd, setCatatanTtd] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // State untuk TTD dari profile (hanya ditampilkan setelah approved)
    const [ttdPegawaiUrl, setTtdPegawaiUrl] = useState(null);
    const [ttdPpkUrl, setTtdPpkUrl] = useState(null);
    const [ttdBendaharaUrl, setTtdBendaharaUrl] = useState(null);
    const [loadingTtd, setLoadingTtd] = useState(false);
    
    // Normalisasi NIP (hilangkan spasi)
    const normalizeNip = (value) => {
        if (!value) return '';
        return String(value).replace(/\s/g, '');
    };
    
    // Ambil identitas user dari session
    const userNipRaw = session?.user?.nip || session?.user?.username || '';
    const userNip = normalizeNip(userNipRaw);
    
    // Ambil NIP pegawai dari item
    const pegawaiNipRaw = item.nip || '';
    const pegawaiNip = normalizeNip(pegawaiNipRaw);
    
    // Cek apakah user adalah pegawai yang bersangkutan
    const isPegawai = userNip && pegawaiNip && userNip === pegawaiNip;
    
    // Cek apakah tombol approve harus ditampilkan
    const shouldShowButtons = isPegawai && statusTtd === 'belum';
    
    // Fungsi untuk mengambil TTD dari profile berdasarkan path
    const getTtdImageUrl = (ttdPath) => {
        if (!ttdPath) return null;
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        let cleanPath = ttdPath;
        
        if (cleanPath.startsWith('/api/')) {
            cleanPath = cleanPath.replace('/api', '');
        }
        
        if (!cleanPath.startsWith('/uploads')) {
            cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
        }
        
        return `${baseUrl}${cleanPath}`;
    };
    
    // Load TTD dari profile yang sudah disimpan di kwitansi (hanya jika sudah disetujui)
    useEffect(() => {
        const loadTtdImages = async () => {
            setLoadingTtd(true);
            
            // Hanya tampilkan TTD jika status sudah disetujui
            if (statusTtd === 'sudah') {
                // TTD Pegawai
                if (item.ttd_pegawai_path) {
                    setTtdPegawaiUrl(getTtdImageUrl(item.ttd_pegawai_path));
                }
                
                // TTD PPK
                if (item.ttd_ppk_path) {
                    setTtdPpkUrl(getTtdImageUrl(item.ttd_ppk_path));
                }
                
                // TTD Bendahara
                if (item.ttd_bendahara_path) {
                    setTtdBendaharaUrl(getTtdImageUrl(item.ttd_bendahara_path));
                }
            } else {
                // Kosongkan TTD jika belum disetujui
                setTtdPegawaiUrl(null);
                setTtdPpkUrl(null);
                setTtdBendaharaUrl(null);
            }
            
            setLoadingTtd(false);
        };
        
        loadTtdImages();
    }, [item, statusTtd]);
    
    // Setup file URL untuk kwitansi
    useEffect(() => {
        if (item.upload_kwitansi) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            let cleanPath = item.upload_kwitansi;
            
            if (cleanPath.startsWith('/api/')) {
                cleanPath = cleanPath.replace('/api', '');
            }
            
            if (!cleanPath.startsWith('/uploads')) {
                cleanPath = `/uploads/kwitansi/${cleanPath.split('/').pop()}`;
            }
            
            const url = `${baseUrl}${cleanPath}`;
            setFileUrl(url);
        }
    }, [item.upload_kwitansi]);
    
    const handleApprove = async (status) => {
        setLoading(true);
        setMessage('');
        
        try {
            const kwitansiId = item.kwitansi_id || item.id;
            console.log('Approving kwitansi ID:', kwitansiId);
            
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/approve-ttd/${kwitansiId}`,
                { 
                    status_ttd: status, 
                    catatan_ttd: status === 'ditolak' ? catatanTtd : null,
                    user_nip: userNip // Kirim NIP user untuk mengambil TTD dari profile
                },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            
            if (response.data.success) {
                setStatusTtd(status);
                setMessage(response.data.message);
                
                // Jika approve berhasil, reload TTD images
                if (status === 'sudah') {
                    // TTD akan diambil dari respons backend
                    if (response.data.ttd_pegawai_path) {
                        setTtdPegawaiUrl(getTtdImageUrl(response.data.ttd_pegawai_path));
                    }
                    if (response.data.ttd_ppk_path) {
                        setTtdPpkUrl(getTtdImageUrl(response.data.ttd_ppk_path));
                    }
                    if (response.data.ttd_bendahara_path) {
                        setTtdBendaharaUrl(getTtdImageUrl(response.data.ttd_bendahara_path));
                    }
                }
                
                // Refresh data setelah approve
                setTimeout(() => {
                    if (onRefresh) onRefresh();
                    onClose();
                }, 1500);
            }
        } catch (error) {
            console.error('Error approving TTD:', error);
            setMessage(error.response?.data?.message || 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };
    
    const getFilePreview = () => {
        if (!fileUrl) return null;
        
        const filename = fileUrl.split('/').pop();
        const fileExt = filename?.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
            return (
                <div className="relative w-full h-96 mt-4">
                    <img 
                        src={fileUrl} 
                        alt="Kwitansi" 
                        className="w-full h-full object-contain rounded-lg"
                        onError={() => setFileError(true)}
                    />
                </div>
            );
        } else if (fileExt === 'pdf') {
            return (
                <div className="mt-4">
                    <iframe 
                        src={fileUrl} 
                        className="w-full h-96 border rounded-lg" 
                        title="Kwitansi PDF"
                        onError={() => setFileError(true)}
                    />
                    <div className="mt-2 text-center">
                        <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm hover:underline"
                        >
                            Buka PDF di tab baru
                        </a>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    const getStatusBadge = () => {
        switch (statusTtd) {
            case 'sudah':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Sudah Disetujui</span>;
            case 'ditolak':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">✗ Ditolak</span>;
            default:
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">⏳ Menunggu Persetujuan</span>;
        }
    };
    
    // Hitung total biaya
    const hitungTotalBiaya = () => {
        if (item.biaya_list && item.biaya_list.length > 0) {
            let total = 0;
            item.biaya_list.forEach(biaya => {
                if (biaya.transportasi) {
                    biaya.transportasi.forEach(t => {
                        total += Number(t.total) || 0;
                    });
                }
                if (biaya.uang_harian) {
                    biaya.uang_harian.forEach(u => {
                        total += Number(u.total) || 0;
                    });
                }
                if (biaya.penginapan) {
                    biaya.penginapan.forEach(p => {
                        total += Number(p.total) || 0;
                    });
                }
            });
            return total;
        }
        return item.total_biaya || 0;
    };
    
    const totalBiaya = hitungTotalBiaya();
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white">
                        <h3 className="text-lg font-medium">Detail Kwitansi Perjalanan Dinas</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* DEBUG PANEL - Hanya development */}
                    {process.env.NODE_ENV !== 'production' && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono">
                            <details>
                                <summary className="font-bold cursor-pointer">🔧 Debug Info</summary>
                                <div className="mt-2 space-y-1">
                                    <p><strong>Session User NIP:</strong> {userNip || '(kosong)'}</p>
                                    <p><strong>Item NIP:</strong> {pegawaiNip || '(kosong)'}</p>
                                    <p><strong>Is Pegawai:</strong> {String(isPegawai)}</p>
                                    <p><strong>Status TTD:</strong> {statusTtd}</p>
                                    <p><strong>TTD Pegawai Path:</strong> {item.ttd_pegawai_path || '(kosong)'}</p>
                                    <p><strong>TTD PPK Path:</strong> {item.ttd_ppk_path || '(kosong)'}</p>
                                    <p><strong>TTD Bendahara Path:</strong> {item.ttd_bendahara_path || '(kosong)'}</p>
                                </div>
                            </details>
                        </div>
                    )}
                    
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg ${message.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {message}
                        </div>
                    )}
                    
                    {/* Info Kegiatan */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">No ST</p>
                            <p>{item.no_st || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">No LPD</p>
                            <p className="font-bold text-blue-600">{item.no_lpd || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">Kegiatan</p>
                            <p>{item.nama_kegiatan || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">MAK</p>
                            <p>{item.mak || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">Pegawai</p>
                            <p>{item.nama_pegawai || '-'}<br/><span className="text-xs">{item.nip || '-'}</span></p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium">Tanggal Kwitansi</p>
                            <p>{item.tgl_kwitansi ? formatDateFn(item.tgl_kwitansi) : '-'}</p>
                        </div>
                    </div>
                    
                    {/* Status Persetujuan */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-700">Status Persetujuan</h4>
                            {getStatusBadge()}
                        </div>
                        
                        {item.tgl_ttd && (
                            <p className="text-sm text-gray-500">Tanggal persetujuan: {formatDateFn(item.tgl_ttd)}</p>
                        )}
                        
                        {item.catatan_ttd && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                                <p className="font-medium text-red-700">Catatan:</p>
                                <p className="text-red-600">{item.catatan_ttd}</p>
                            </div>
                        )}
                        
                        {/* Tanda Tangan Digital - HANYA TAMPIL JIKA SUDAH DISETUJUI */}
                        {statusTtd === 'sudah' && (
                            <div className="mt-4 pt-4 border-t">
                                <h5 className="font-semibold text-gray-700 mb-3">Tanda Tangan Digital</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* TTD Pegawai */}
                                    <div className="text-center p-3 bg-white rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Pegawai</p>
                                        {loadingTtd ? (
                                            <div className="flex justify-center py-4">
                                                <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                        ) : ttdPegawaiUrl ? (
                                            <div>
                                                <img 
                                                    src={ttdPegawaiUrl} 
                                                    alt="TTD Pegawai" 
                                                    className="max-h-20 mx-auto object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <p className="text-xs text-green-600 mt-2">
                                                    ✓ Tanda tangan digital
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 py-4">Belum ada TTD digital</p>
                                        )}
                                    </div>
                                    
                                    {/* TTD PPK */}
                                    <div className="text-center p-3 bg-white rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-600 mb-2">PPK</p>
                                        {loadingTtd ? (
                                            <div className="flex justify-center py-4">
                                                <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                        ) : ttdPpkUrl ? (
                                            <div>
                                                <img 
                                                    src={ttdPpkUrl} 
                                                    alt="TTD PPK" 
                                                    className="max-h-20 mx-auto object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <p className="text-xs text-green-600 mt-2">
                                                    ✓ Tanda tangan digital
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 py-4">Belum ada TTD digital</p>
                                        )}
                                    </div>
                                    
                                    {/* TTD Bendahara */}
                                    <div className="text-center p-3 bg-white rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Bendahara</p>
                                        {loadingTtd ? (
                                            <div className="flex justify-center py-4">
                                                <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                        ) : ttdBendaharaUrl ? (
                                            <div>
                                                <img 
                                                    src={ttdBendaharaUrl} 
                                                    alt="TTD Bendahara" 
                                                    className="max-h-20 mx-auto object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <p className="text-xs text-green-600 mt-2">
                                                    ✓ Tanda tangan digital
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 py-4">Belum ada TTD digital</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Tombol Persetujuan untuk Pegawai */}
                        {shouldShowButtons && (
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm text-gray-600 mb-3">
                                    Silakan periksa kwitansi di atas. Jika sudah sesuai, berikan persetujuan Anda.
                                </p>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Catatan (jika ditolak)
                                    </label>
                                    <textarea
                                        value={catatanTtd}
                                        onChange={(e) => setCatatanTtd(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Isi alasan penolakan jika diperlukan..."
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove('sudah')}
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Memproses...' : '✓ Setujui Kwitansi'}
                                    </button>
                                    <button
                                        onClick={() => handleApprove('ditolak')}
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Memproses...' : '✗ Tolak Kwitansi'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {isPegawai && statusTtd !== 'belum' && (
                            <div className="mt-4 pt-4 border-t text-center text-gray-500">
                                {statusTtd === 'sudah' ? 
                                    'Kwitansi sudah disetujui. Terima kasih.' : 
                                    'Kwitansi ditolak. Silakan hubungi admin untuk perbaikan.'}
                            </div>
                        )}
                        
                        {!isPegawai && (
                            <div className="mt-4 pt-4 border-t text-center text-gray-500 text-sm">
                                Menunggu persetujuan dari pegawai yang bersangkutan.
                            </div>
                        )}
                    </div>
                    
                    {/* Rincian Biaya */}
                    {item.biaya_list && item.biaya_list.length > 0 ? (
                        <div className="mt-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Rincian Biaya:</h4>
                            {item.biaya_list.map((biaya, idx) => {
                                const totalTransport = biaya.transportasi?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0;
                                const totalUH = biaya.uang_harian?.reduce((sum, u) => sum + (Number(u.total) || 0), 0) || 0;
                                const totalPenginapan = biaya.penginapan?.reduce((sum, p) => sum + (Number(p.total) || 0), 0) || 0;
                                const grandTotal = totalTransport + totalUH + totalPenginapan;
                                
                                return (
                                    <div key={idx} className="mb-4 p-3 border rounded-lg bg-gray-50">
                                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                                            <div className="bg-blue-100 p-2 rounded">
                                                <p className="font-medium text-blue-800">Transportasi</p>
                                                <p className="font-bold text-blue-600">Rp {formatRupiah(totalTransport)}</p>
                                            </div>
                                            <div className="bg-green-100 p-2 rounded">
                                                <p className="font-medium text-green-800">Uang Harian</p>
                                                <p className="font-bold text-green-600">Rp {formatRupiah(totalUH)}</p>
                                            </div>
                                            <div className="bg-purple-100 p-2 rounded">
                                                <p className="font-medium text-purple-800">Penginapan</p>
                                                <p className="font-bold text-purple-600">Rp {formatRupiah(totalPenginapan)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-center bg-red-50 p-2 rounded">
                                            <p className="font-medium text-red-800">Total</p>
                                            <p className="font-bold text-red-600">Rp {formatRupiah(grandTotal)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mt-4 bg-red-50 p-3 rounded text-center">
                            <p className="font-medium">Jumlah Total</p>
                            <p className="text-2xl font-bold text-red-600">Rp {formatRupiah(totalBiaya)}</p>
                        </div>
                    )}
                    
                    {/* File Preview */}
                    {fileUrl && !fileError && (
                        <div className="mt-4">
                            <p className="font-medium mb-2">File Kwitansi:</p>
                            {getFilePreview()}
                        </div>
                    )}
                    
                    {fileError && (
                        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
                            <p>File kwitansi tidak ditemukan.</p>
                        </div>
                    )}
                    
                    <div className="mt-6 flex justify-end sticky bottom-0 bg-white pt-3 border-t">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}