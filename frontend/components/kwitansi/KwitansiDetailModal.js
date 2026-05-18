// components/kwitansi/KwitansiDetailModal.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function KwitansiDetailModal({ item, onClose, formatDateFn, formatRupiah, onRefresh }) {
    const { data: session } = useSession();
    const [fileUrl, setFileUrl] = useState(null);
    const [fileError, setFileError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [catatan, setCatatan] = useState('');
    
    // State untuk SPTJM Transport
    const [sptjmList, setSptjmList] = useState([]);
    const [loadingSptjm, setLoadingSptjm] = useState(false);
    
    // State untuk mode edit
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        no_lpd: '',
        tgl_kwitansi: '',
        upload_kwitansi: null
    });
    const [editFile, setEditFile] = useState(null);
    const [editFileName, setEditFileName] = useState('');
    
    // Status approvals
    const [statusPegawai, setStatusPegawai] = useState(item.status_pegawai || 'belum');
    const [statusBendahara, setStatusBendahara] = useState(item.status_bendahara || 'belum');
    const [statusPpk, setStatusPpk] = useState(item.status_ppk || 'belum');
    
    // TTD URLs
    const [ttdPegawaiUrl, setTtdPegawaiUrl] = useState(null);
    const [ttdBendaharaUrl, setTtdBendaharaUrl] = useState(null);
    const [ttdPpkUrl, setTtdPpkUrl] = useState(null);
    
    // User info
    const normalizeNip = (value) => {
        if (!value) return '';
        return String(value).replace(/\s/g, '');
    };
    
    const userNip = normalizeNip(session?.user?.nip || session?.user?.username || '');
    const pegawaiNip = normalizeNip(item.pegawai_nip || item.nip || '');
    const bendaharaNip = normalizeNip(item.bendahara_nip || '');
    const ppkNip = normalizeNip(item.ppk_nip || '');
    
    const isPegawai = userNip && pegawaiNip && userNip === pegawaiNip;
    const isBendahara = userNip && bendaharaNip && userNip === bendaharaNip;
    const isPpk = userNip && ppkNip && userNip === ppkNip;
    
    // Cek apakah kwitansi ditolak dan pegawai bisa edit
    const isRejected = statusPegawai === 'ditolak' || statusBendahara === 'ditolak' || statusPpk === 'ditolak';
    const canEdit = isPegawai && isRejected;
    
    // Fungsi untuk mengambil data SPTJM Transport
    const fetchSptjmTransport = async () => {
        const kwitansiId = item.kwitansi_id || item.id;
        if (!kwitansiId) return;
        
        setLoadingSptjm(true);
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-transport/${kwitansiId}`,
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            
            if (response.data.success && response.data.data) {
                setSptjmList(response.data.data);
                console.log('📦 SPTJM Transport data:', response.data.data);
            }
        } catch (error) {
            console.error('Error fetching SPTJM transport:', error);
            // Jika tabel belum ada, tidak perlu error
            if (error.response?.status !== 404) {
                setMessage('Gagal memuat data transport');
            }
        } finally {
            setLoadingSptjm(false);
        }
    };
    
    // Ambil data SPTJM Transport saat modal dibuka
    useEffect(() => {
        if (item.id || item.kwitansi_id) {
            fetchSptjmTransport();
        }
    }, [item.id, item.kwitansi_id]);
    
    // Get status badge
    const getStatusBadge = (status, label) => {
        switch (status) {
            case 'sudah': 
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ {label} Disetujui</span>;
            case 'ditolak': 
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">✗ {label} Ditolak</span>;
            default: 
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">⏳ {label} Menunggu</span>;
        }
    };
    
    const getTtdImageUrl = (ttdPath) => {
        if (!ttdPath) return null;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        let cleanPath = ttdPath.replace(/^\/api/, '');
        if (!cleanPath.startsWith('/uploads')) {
            cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
        }
        return `${baseUrl}${cleanPath}`;
    };
    
    // Load TTD images
    useEffect(() => {
        if (item.ttd_pegawai_path) setTtdPegawaiUrl(getTtdImageUrl(item.ttd_pegawai_path));
        if (item.ttd_bendahara_path) setTtdBendaharaUrl(getTtdImageUrl(item.ttd_bendahara_path));
        if (item.ttd_ppk_path) setTtdPpkUrl(getTtdImageUrl(item.ttd_ppk_path));
    }, [item.ttd_pegawai_path, item.ttd_bendahara_path, item.ttd_ppk_path]);
    
    // Setup file URL
    useEffect(() => {
        if (item.upload_kwitansi) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            let cleanPath = item.upload_kwitansi.replace(/^\/api/, '');
            if (!cleanPath.startsWith('/uploads')) {
                cleanPath = `/uploads/kwitansi/${cleanPath.split('/').pop()}`;
            }
            setFileUrl(`${baseUrl}${cleanPath}`);
        }
        
        // Initialize edit data
        setEditData({
            no_lpd: item.no_lpd || '',
            tgl_kwitansi: item.tgl_kwitansi ? new Date(item.tgl_kwitansi).toISOString().split('T')[0] : '',
            upload_kwitansi: null
        });
    }, [item.upload_kwitansi, item.no_lpd, item.tgl_kwitansi]);
    
    const handleApprove = async (status) => {
        setLoading(true);
        setMessage('');
        
        try {
            const kwitansiId = item.kwitansi_id || item.id;
            
            console.log(`📤 Sending approval: kwitansiId=${kwitansiId}, status=${status}, role=${isPpk ? 'PPK' : isBendahara ? 'Bendahara' : 'Pegawai'}`);
            
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/approve/${kwitansiId}`,
                { status, catatan: status === 'ditolak' ? catatan : null },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            
            if (response.data.success) {
                if (isPegawai) setStatusPegawai(status);
                if (isBendahara) setStatusBendahara(status);
                if (isPpk) setStatusPpk(status);
                
                setMessage(response.data.message);
                
                setTimeout(() => {
                    if (onRefresh) onRefresh();
                    onClose();
                }, 1500);
            }
        } catch (error) {
            console.error('Error approving:', error);
            setMessage(error.response?.data?.message || 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };
    
    const handleEditSubmit = async () => {
        if (!editData.no_lpd.trim()) {
            setMessage('No LPD wajib diisi');
            return;
        }
        
        setLoading(true);
        setMessage('');
        
        try {
            const kwitansiId = item.kwitansi_id || item.id;
            const formData = new FormData();
            formData.append('no_lpd', editData.no_lpd);
            formData.append('tgl_kwitansi', editData.tgl_kwitansi);
            if (editFile) {
                formData.append('upload_kwitansi', editFile);
            }
            
            const response = await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/${kwitansiId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            if (response.data.success) {
                setMessage('Kwitansi berhasil diperbarui');
                setStatusPegawai('belum');
                setStatusBendahara('belum');
                setStatusPpk('belum');
                setIsEditing(false);
                
                if (response.data.data.upload_kwitansi) {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
                    setFileUrl(`${baseUrl}${response.data.data.upload_kwitansi}`);
                }
                
                setTimeout(() => {
                    if (onRefresh) onRefresh();
                    onClose();
                }, 1500);
            }
        } catch (error) {
            console.error('Error updating kwitansi:', error);
            setMessage(error.response?.data?.message || 'Gagal memperbarui kwitansi');
        } finally {
            setLoading(false);
        }
    };
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditFile(file);
            setEditFileName(file.name);
        }
    };
    
    const getFilePreview = () => {
        if (!fileUrl && !editFile) return null;
        
        const previewUrl = editFile ? URL.createObjectURL(editFile) : fileUrl;
        const filename = editFile ? editFile.name : (fileUrl?.split('/').pop() || '');
        const fileExt = filename?.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
            return (
                <div className="relative w-full h-96 mt-4">
                    <img 
                        src={previewUrl} 
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
                        src={previewUrl} 
                        className="w-full h-96 border rounded-lg" 
                        title="Kwitansi PDF" 
                        onError={() => setFileError(true)} 
                    />
                    <div className="mt-2 text-center">
                        <a 
                            href={previewUrl} 
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
    
    const hitungTotalBiaya = () => {
        if (item.biaya_list && item.biaya_list.length > 0) {
            let total = 0;
            item.biaya_list.forEach(biaya => {
                if (biaya.transportasi) {
                    biaya.transportasi.forEach(t => total += Number(t.total) || 0);
                }
                if (biaya.uang_harian) {
                    biaya.uang_harian.forEach(u => total += Number(u.total) || 0);
                }
                if (biaya.penginapan) {
                    biaya.penginapan.forEach(p => total += Number(p.total) || 0);
                }
            });
            return total;
        }
        return item.total_biaya || 0;
    };
    
    const totalBiaya = hitungTotalBiaya();
    const canUserApprove = (isPpk && statusPegawai === 'sudah' && statusBendahara === 'sudah' && statusPpk === 'belum') ||
                           (isBendahara && statusPegawai === 'sudah' && statusBendahara === 'belum') ||
                           (isPegawai && statusPegawai === 'belum');
    
    // Helper untuk mendapatkan label jenis transport
    const getJenisTransportLabel = (jenis) => {
        const icons = {
            'Pesawat': '✈️',
            'Kereta Api': '🚆',
            'Bus': '🚌',
            'Travel': '🚐',
            'Taksi': '🚕',
            'Kapal/Laut': '⛴️',
            'Mobil Dinas': '🚗',
            'Kendaraan Pribadi': '🏍️',
            'Ojek': '🏍️',
            'Lainnya': '📦'
        };
        return `${icons[jenis] || '🚗'} ${jenis}`;
    };
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white">
                        <h3 className="text-lg font-medium">
                            {isEditing ? 'Edit Kwitansi Perjalanan Dinas' : 'Detail Kwitansi Perjalanan Dinas'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg ${message.includes('berhasil') || message.includes('disetujui') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {message}
                        </div>
                    )}
                    
                    {/* Info Rejection - Tampilkan jika ditolak */}
                    {isRejected && !isEditing && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-red-700">Kwitansi Ditolak!</span>
                            </div>
                            <div className="mt-2 text-sm text-red-600">
                                {statusPegawai === 'ditolak' && <p>Catatan Pegawai: {item.catatan_pegawai}</p>}
                                {statusBendahara === 'ditolak' && <p>Catatan Bendahara: {item.catatan_bendahara}</p>}
                                {statusPpk === 'ditolak' && <p>Catatan PPK: {item.catatan_ppk}</p>}
                            </div>
                            {canEdit && !isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                                >
                                    ✏️ Edit & Upload Ulang Kwitansi
                                </button>
                            )}
                        </div>
                    )}
                    
                    {isEditing ? (
                        // FORM EDIT
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">No LPD *</label>
                                <input
                                    type="text"
                                    value={editData.no_lpd}
                                    onChange={(e) => setEditData({ ...editData, no_lpd: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Masukkan No LPD"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kwitansi</label>
                                <input
                                    type="date"
                                    value={editData.tgl_kwitansi}
                                    onChange={(e) => setEditData({ ...editData, tgl_kwitansi: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">File Kwitansi (PDF/Gambar)</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {editFileName && <p className="text-sm text-green-600 mt-1">File baru: {editFileName}</p>}
                                {fileUrl && !editFile && <p className="text-sm text-gray-500 mt-1">File saat ini: {fileUrl.split('/').pop()}</p>}
                            </div>
                            
                            {editFile && getFilePreview()}
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleEditSubmit}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    ) : (
                        // VIEW MODE
                        <>
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
                                    <p>{item.nama_pegawai || item.nama || '-'}<br/><span className="text-xs">{item.pegawai_nip || item.nip || '-'}</span></p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                    <p className="font-medium">Tanggal Kwitansi</p>
                                    <p>{item.tgl_kwitansi ? formatDateFn(item.tgl_kwitansi) : '-'}</p>
                                </div>
                            </div>
                            
                            {/* SPTJM Transport Section */}
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    SPTJM Transport
                                </h4>
                                
                                {loadingSptjm ? (
                                    <div className="flex justify-center py-4">
                                        <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                ) : sptjmList.length > 0 ? (
                                    <div className="space-y-3">
                                        {sptjmList.map((sptjm, idx) => (
                                            <div key={sptjm.id} className="bg-white rounded-lg border border-gray-200 p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-gray-700">Transport {idx + 1}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDateFn(sptjm.created_at)}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Jenis Transport:</span>
                                                        <p className="font-medium text-gray-800">
                                                            {getJenisTransportLabel(sptjm.jenis_transport) || '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Nama Maskapai/Perusahaan:</span>
                                                        <p className="font-medium text-gray-800">{sptjm.nama_maskapai || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Kode Penerbangan/No. Polisi:</span>
                                                        <p className="font-medium text-gray-800">{sptjm.kode_penerbangan || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Nomor Kursi/Kabin:</span>
                                                        <p className="font-medium text-gray-800">{sptjm.nomor_kursi || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                        <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        Belum ada data SPTJM Transport
                                    </div>
                                )}
                            </div>
                            
                            {/* Status Approval Berjenjang */}
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-3">Status Persetujuan Berjenjang</h4>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 bg-white rounded">
                                        <div>
                                            <span className="font-medium">1. Persetujuan Pegawai</span>
                                            <p className="text-xs text-gray-500">{item.nama_pegawai || item.nama || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(statusPegawai, 'Pegawai')}
                                            {item.tgl_ttd_pegawai && <p className="text-xs text-gray-400">{formatDateFn(item.tgl_ttd_pegawai)}</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-2 bg-white rounded">
                                        <div>
                                            <span className="font-medium">2. Persetujuan Bendahara</span>
                                            <p className="text-xs text-gray-500">{item.bendahara_nama || '-'} ({item.bendahara_nip || '-'})</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(statusBendahara, 'Bendahara')}
                                            {item.tgl_ttd_bendahara && <p className="text-xs text-gray-400">{formatDateFn(item.tgl_ttd_bendahara)}</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-2 bg-white rounded">
                                        <div>
                                            <span className="font-medium">3. Persetujuan PPK</span>
                                            <p className="text-xs text-gray-500">{item.ppk_nama || '-'} ({item.ppk_nip || '-'})</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(statusPpk, 'PPK')}
                                            {item.tgl_ttd_ppk && <p className="text-xs text-gray-400">{formatDateFn(item.tgl_ttd_ppk)}</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Tanda Tangan Digital */}
                                {(statusPegawai === 'sudah' || statusBendahara === 'sudah' || statusPpk === 'sudah') && (
                                    <div className="mt-4 pt-4 border-t">
                                        <h5 className="font-semibold text-gray-700 mb-3">Tanda Tangan Digital</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {statusPegawai === 'sudah' && (
                                                <div className="text-center p-3 bg-white rounded-lg shadow">
                                                    <p className="text-sm font-medium text-gray-600 mb-2">Pegawai</p>
                                                    {ttdPegawaiUrl ? (
                                                        <img src={ttdPegawaiUrl} alt="TTD Pegawai" className="max-h-20 mx-auto object-contain" />
                                                    ) : <p className="text-xs text-gray-400">Tanda tangan digital</p>}
                                                </div>
                                            )}
                                            {statusBendahara === 'sudah' && (
                                                <div className="text-center p-3 bg-white rounded-lg shadow">
                                                    <p className="text-sm font-medium text-gray-600 mb-2">Bendahara</p>
                                                    {ttdBendaharaUrl ? (
                                                        <img src={ttdBendaharaUrl} alt="TTD Bendahara" className="max-h-20 mx-auto object-contain" />
                                                    ) : <p className="text-xs text-gray-400">Tanda tangan digital</p>}
                                                </div>
                                            )}
                                            {statusPpk === 'sudah' && (
                                                <div className="text-center p-3 bg-white rounded-lg shadow">
                                                    <p className="text-sm font-medium text-gray-600 mb-2">PPK</p>
                                                    {ttdPpkUrl ? (
                                                        <img src={ttdPpkUrl} alt="TTD PPK" className="max-h-20 mx-auto object-contain" />
                                                    ) : <p className="text-xs text-gray-400">Tanda tangan digital</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Tombol Persetujuan */}
                                {canUserApprove && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm text-gray-600 mb-3">
                                            {isPpk && 'Sebagai PPK, silakan periksa kwitansi dan berikan persetujuan akhir.'}
                                            {isBendahara && 'Sebagai Bendahara, silakan periksa kwitansi dan berikan persetujuan.'}
                                            {isPegawai && 'Sebagai Pegawai, silakan periksa kwitansi dan berikan persetujuan.'}
                                        </p>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (jika ditolak)</label>
                                            <textarea
                                                value={catatan}
                                                onChange={(e) => setCatatan(e.target.value)}
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
                                                {loading ? 'Memproses...' : '✓ Setujui'}
                                            </button>
                                            <button
                                                onClick={() => handleApprove('ditolak')}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {loading ? 'Memproses...' : '✗ Tolak'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Pesan jika tidak bisa approve */}
                                {!canUserApprove && isPpk && (
                                    <div className="mt-4 pt-4 border-t text-center text-gray-500 text-sm">
                                        {statusPegawai !== 'sudah' && '⏳ Menunggu persetujuan dari Pegawai terlebih dahulu.'}
                                        {statusPegawai === 'sudah' && statusBendahara !== 'sudah' && '⏳ Menunggu persetujuan dari Bendahara terlebih dahulu.'}
                                        {statusPegawai === 'sudah' && statusBendahara === 'sudah' && statusPpk === 'sudah' && '✓ Kwitansi sudah lengkap disetujui oleh semua pihak.'}
                                        {statusPpk === 'ditolak' && '✗ Kwitansi sudah ditolak.'}
                                    </div>
                                )}
                            </div>
                            
                            {/* Total Biaya */}
                            <div className="mt-4 bg-red-50 p-3 rounded text-center">
                                <p className="font-medium">Jumlah Total</p>
                                <p className="text-2xl font-bold text-red-600">Rp {formatRupiah(totalBiaya)}</p>
                            </div>
                            
                            {/* File Preview */}
                            {fileUrl && !fileError && (
                                <div className="mt-4">
                                    <p className="font-medium mb-2">File Kwitansi:</p>
                                    {getFilePreview()}
                                </div>
                            )}
                        </>
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