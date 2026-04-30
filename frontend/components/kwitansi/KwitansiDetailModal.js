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
    
    // Normalisasi NIP (hilangkan spasi) untuk perbandingan
    const normalizeNip = (value) => {
        if (!value) return '';
        return String(value).replace(/\s/g, '');
    };
    
    // Ambil identitas user dari session (NIP atau username)
    const userNipRaw = session?.user?.nip || session?.user?.username || '';
    const userNip = normalizeNip(userNipRaw);
    
    // Ambil NIP pegawai dari item (dengan spasi atau tanpa spasi)
    const pegawaiNipRaw = item.nip || '';
    const pegawaiNip = normalizeNip(pegawaiNipRaw);
    
    // Cek apakah sama (setelah dinormalisasi)
    const isPegawai = userNip && pegawaiNip && userNip === pegawaiNip;
    
    // DEBUG DETAIL - Cek semua kondisi untuk tombol
    const shouldShowButtons = isPegawai && statusTtd === 'belum';
    
    console.log('=== DEBUG PERSETUJUAN DETAIL ===');
    console.log('1. SESSION DATA:');
    console.log('   - Session object:', session);
    console.log('   - session?.user:', session?.user);
    console.log('   - session?.user?.nip:', session?.user?.nip);
    console.log('   - session?.user?.username:', session?.user?.username);
    console.log('2. NIP COMPARISON:');
    console.log('   - User Raw:', userNipRaw);
    console.log('   - User Normalized:', userNip);
    console.log('   - User Length:', userNip.length);
    console.log('   - Pegawai Raw:', pegawaiNipRaw);
    console.log('   - Pegawai Normalized:', pegawaiNip);
    console.log('   - Pegawai Length:', pegawaiNip.length);
    console.log('   - Is Pegawai (strict):', userNip === pegawaiNip);
    console.log('   - Is Pegawai (boolean):', isPegawai);
    console.log('3. STATUS CONDITIONS:');
    console.log('   - statusTtd:', statusTtd);
    console.log('   - statusTtd === "belum":', statusTtd === 'belum');
    console.log('4. BUTTON CONDITIONS:');
    console.log('   - isPegawai:', isPegawai);
    console.log('   - statusTtd === "belum":', statusTtd === 'belum');
    console.log('   - shouldShowButtons:', shouldShowButtons);
    console.log('5. ITEM DATA:');
    console.log('   - Item ID:', item.id);
    console.log('   - Kwitansi ID:', item.kwitansi_id);
    console.log('   - Item NIP:', item.nip);
    console.log('   - Item Nama Pegawai:', item.nama_pegawai);
    console.log('   - Item Status TTD dari DB:', item.status_ttd);
    
    // Cek apakah session ada
    if (!session) {
        console.error('SESSION TIDAK ADA! User mungkin belum login.');
    }
    
    // Cek apakah userNip kosong
    if (!userNip) {
        console.error('USER NIP KOSONG! Session user tidak memiliki NIP atau username.');
        console.log('   - Session user keys:', Object.keys(session?.user || {}));
    }
    
    // Cek apakah pegawaiNip kosong
    if (!pegawaiNip) {
        console.error('PEGAWAI NIP KOSONG! Item tidak memiliki NIP.');
    }
    
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
                { status_ttd: status, catatan_ttd: status === 'ditolak' ? catatanTtd : null },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            
            if (response.data.success) {
                setStatusTtd(status);
                setMessage(response.data.message);
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
                    
                    {/* DEBUG PANEL - Hanya untuk development */}
                    {process.env.NODE_ENV !== 'production' && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono">
                            <details>
                                <summary className="font-bold cursor-pointer">🔧 Debug Info (Klik untuk detail)</summary>
                                <div className="mt-2 space-y-1">
                                    <p><strong>Session User NIP:</strong> {userNip || '(kosong)'}</p>
                                    <p><strong>Session User Raw:</strong> {userNipRaw || '(kosong)'}</p>
                                    <p><strong>Item NIP:</strong> {pegawaiNip || '(kosong)'}</p>
                                    <p><strong>Item NIP Raw:</strong> {pegawaiNipRaw || '(kosong)'}</p>
                                    <p><strong>Is Pegawai:</strong> {String(isPegawai)}</p>
                                    <p><strong>Status TTD:</strong> {statusTtd}</p>
                                    <p><strong>Harusnya Muncul Tombol:</strong> {String(shouldShowButtons)}</p>
                                    <p><strong>Session Ada:</strong> {String(!!session)}</p>
                                    <p><strong>Session User Keys:</strong> {Object.keys(session?.user || {}).join(', ') || '(tidak ada)'}</p>
                                </div>
                            </details>
                        </div>
                    )}
                    
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg ${message.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {message}
                        </div>
                    )}
                    
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