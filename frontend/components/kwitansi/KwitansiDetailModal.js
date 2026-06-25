// components/kwitansi/KwitansiDetailModal.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function KwitansiDetailModal({ item, onClose, formatDateForDisplay, formatRupiah, onRefresh }) {
    const { data: session } = useSession();
    const [fileUrl, setFileUrl] = useState(null);
    const [fileError, setFileError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [catatan, setCatatan] = useState('');
    const [messageType, setMessageType] = useState('info');
    
    // State untuk SPTJM Transport
    const [sptjmList, setSptjmList] = useState([]);
    const [loadingSptjm, setLoadingSptjm] = useState(false);
    
    // State untuk SPTJM Penginapan
    const [penginapanList, setPenginapanList] = useState([]);
    const [loadingPenginapan, setLoadingPenginapan] = useState(false);
    
    // State untuk mode edit
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        no_lpd: '',
        tgl_kwitansi: '',
        tgl_spd: '',
        upload_kwitansi: null
    });
    const [editFile, setEditFile] = useState(null);
    const [editFileName, setEditFileName] = useState('');
    
    // Status approvals - URUTAN BARU: Pegawai -> PPK -> Bendahara
    const [statusPegawai, setStatusPegawai] = useState(item.status_pegawai || 'belum');
    const [statusPpk, setStatusPpk] = useState(item.status_ppk || 'belum');
    const [statusBendahara, setStatusBendahara] = useState(item.status_bendahara || 'belum');
    
    // TTD URLs
    const [ttdPegawaiUrl, setTtdPegawaiUrl] = useState(null);
    const [ttdPpkUrl, setTtdPpkUrl] = useState(null);
    const [ttdBendaharaUrl, setTtdBendaharaUrl] = useState(null);
    
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
    const isRejected = statusPegawai === 'ditolak' || statusPpk === 'ditolak' || statusBendahara === 'ditolak';
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
            if (error.response?.status !== 404) {
                setMessage('Gagal memuat data transport');
            }
        } finally {
            setLoadingSptjm(false);
        }
    };
    
    // Fungsi untuk mengambil data SPTJM Penginapan
    const fetchSptjmPenginapan = async () => {
        const kwitansiId = item.kwitansi_id || item.id;
        if (!kwitansiId) return;
        
        setLoadingPenginapan(true);
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-penginapan/${kwitansiId}`,
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            
            if (response.data.success && response.data.data) {
                setPenginapanList(response.data.data);
                console.log('📦 SPTJM Penginapan data:', response.data.data);
            }
        } catch (error) {
            console.error('Error fetching SPTJM penginapan:', error);
            if (error.response?.status !== 404) {
                setMessage('Gagal memuat data penginapan');
            }
        } finally {
            setLoadingPenginapan(false);
        }
    };
    
    // Fungsi untuk download file transport
    const downloadFile = async (fileId, fileName) => {
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-transport-file/${fileId}/download`,
                {
                    headers: { Authorization: `Bearer ${session?.accessToken}` },
                    responseType: 'blob'
                }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            setMessage('Gagal mengunduh file');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // Fungsi untuk download file penginapan
    const downloadPenginapanFile = async (fileId, fileName) => {
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-penginapan-file/${fileId}/download`,
                {
                    headers: { Authorization: `Bearer ${session?.accessToken}` },
                    responseType: 'blob'
                }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading penginapan file:', error);
            setMessage('Gagal mengunduh file penginapan');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // Ambil data SPTJM saat modal dibuka
    useEffect(() => {
        if (item.id || item.kwitansi_id) {
            fetchSptjmTransport();
            fetchSptjmPenginapan();
        }
    }, [item.id, item.kwitansi_id]);
    
    // Get status badge
    const getStatusBadge = (status, label) => {
        switch (status) {
            case 'sudah': 
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">✓ {label} Disetujui</span>;
            case 'ditolak': 
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">✗ {label} Ditolak</span>;
            default: 
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">⏳ {label} Menunggu</span>;
        }
    };
    
    const getTtdImageUrl = (ttdPath) => {
        if (!ttdPath) return null;
        // Jika sudah URL lengkap, gunakan langsung
        if (ttdPath.startsWith('http')) return ttdPath;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        let cleanPath = ttdPath.replace(/^\/api/, '');
        if (!cleanPath.startsWith('/uploads')) {
            cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
        }
        return `${apiUrl}${cleanPath}`;
    };
    
    // Load TTD images
    useEffect(() => {
        if (item.ttd_pegawai_path) setTtdPegawaiUrl(getTtdImageUrl(item.ttd_pegawai_path));
        if (item.ttd_ppk_path) setTtdPpkUrl(getTtdImageUrl(item.ttd_ppk_path));
        if (item.ttd_bendahara_path) setTtdBendaharaUrl(getTtdImageUrl(item.ttd_bendahara_path));
    }, [item.ttd_pegawai_path, item.ttd_ppk_path, item.ttd_bendahara_path]);
    
    // Setup file URL
    useEffect(() => {
        if (item.upload_kwitansi) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            let cleanPath = item.upload_kwitansi.replace(/^\/api/, '');
            if (!cleanPath.startsWith('/uploads')) {
                cleanPath = `/uploads/kwitansi/${cleanPath.split('/').pop()}`;
            }
            setFileUrl(`${apiUrl}${cleanPath}`);
        }
        
        // Initialize edit data
        setEditData({
            no_lpd: item.no_lpd || '',
            tgl_kwitansi: item.tgl_kwitansi ? new Date(item.tgl_kwitansi).toISOString().split('T')[0] : '',
            tgl_spd: item.tgl_spd ? new Date(item.tgl_spd).toISOString().split('T')[0] : '',
            upload_kwitansi: null
        });
    }, [item.upload_kwitansi, item.no_lpd, item.tgl_kwitansi, item.tgl_spd]);
    
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
                if (isPpk) setStatusPpk(status);
                if (isBendahara) setStatusBendahara(status);
                
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
            formData.append('tgl_spd', editData.tgl_spd);
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
                setStatusPpk('belum');
                setStatusBendahara('belum');
                setIsEditing(false);
                
                if (response.data.data.upload_kwitansi) {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                    setFileUrl(`${apiUrl}${response.data.data.upload_kwitansi}`);
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
    
    // Cek apakah user bisa approve - URUTAN BARU: Pegawai -> PPK -> Bendahara
    const canUserApprove = () => {
        // Pegawai: harus NIP match, status_pegawai = 'belum'
        if (isPegawai && statusPegawai === 'belum') {
            return true;
        }
        // PPK: harus NIP match, status_pegawai = 'sudah', status_ppk = 'belum'
        if (isPpk && statusPegawai === 'sudah' && statusPpk === 'belum') {
            return true;
        }
        // Bendahara: harus NIP match, status_pegawai = 'sudah', status_ppk = 'sudah', status_bendahara = 'belum'
        if (isBendahara && statusPegawai === 'sudah' && statusPpk === 'sudah' && statusBendahara === 'belum') {
            return true;
        }
        return false;
    };
    
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
    
    // Helper untuk format tanggal menginap
    const formatDateRange = (tglMulai, tglSelesai) => {
        if (!tglMulai && !tglSelesai) return '-';
        if (tglMulai === tglSelesai) return formatDateForDisplay(tglMulai);
        return `${formatDateForDisplay(tglMulai)} - ${formatDateForDisplay(tglSelesai)}`;
    };
    
    // Helper untuk mendapatkan icon file
    const getFileIcon = (fileName) => {
        const ext = fileName?.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            );
        } else if (ext === 'pdf') {
            return (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            );
        } else if (ext === 'doc' || ext === 'docx') {
            return (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        } else {
            return (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        }
    };
    
    const showApproveButtons = canUserApprove();
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4 sticky top-0 bg-white dark:bg-gray-800">
                        <h3 className="text-lg font-medium dark:text-gray-100">
                            {isEditing ? 'Edit Kwitansi Perjalanan Dinas' : 'Detail Kwitansi Perjalanan Dinas'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg ${message.includes('berhasil') || message.includes('disetujui') ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200'}`}>
                            {message}
                        </div>
                    )}
                    
                    {/* Info Rejection - Tampilkan jika ditolak */}
                    {isRejected && !isEditing && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                <svg className="h-5 w-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-red-700 dark:text-red-300">Kwitansi Ditolak!</span>
                            </div>
                            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {statusPegawai === 'ditolak' && <p>Catatan Pegawai: {item.catatan_pegawai}</p>}
                                {statusPpk === 'ditolak' && <p>Catatan PPK: {item.catatan_ppk}</p>}
                                {statusBendahara === 'ditolak' && <p>Catatan Bendahara: {item.catatan_bendahara}</p>}
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">No LPD *</label>
                                <input
                                    type="text"
                                    value={editData.no_lpd}
                                    onChange={(e) => setEditData({ ...editData, no_lpd: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Masukkan No LPD"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal SPD</label>
                                <input
                                    type="date"
                                    value={editData.tgl_spd}
                                    onChange={(e) => setEditData({ ...editData, tgl_spd: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal Kwitansi</label>
                                <input
                                    type="date"
                                    value={editData.tgl_kwitansi}
                                    onChange={(e) => setEditData({ ...editData, tgl_kwitansi: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">File Kwitansi (PDF/Gambar)</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {editFileName && <p className="text-sm text-green-600 dark:text-green-400 mt-1">File baru: {editFileName}</p>}
                                {fileUrl && !editFile && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">File saat ini: {fileUrl.split('/').pop()}</p>}
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
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">No ST</p>
                                    <p className="dark:text-gray-300">{item.no_st || '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">No LPD</p>
                                    <p className="font-bold text-blue-600 dark:text-blue-400">{item.no_lpd || '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">Tanggal SPD</p>
                                    <p className="dark:text-gray-300">{item.tgl_spd ? formatDateForDisplay(item.tgl_spd) : '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">Kegiatan</p>
                                    <p className="dark:text-gray-300">{item.nama_kegiatan || '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">MAK</p>
                                    <p className="dark:text-gray-300">{item.mak || '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">Pegawai</p>
                                    <p className="dark:text-gray-300">{item.nama_pegawai || item.nama || '-'}<br/><span className="text-xs dark:text-gray-400">{item.pegawai_nip || item.nip || '-'}</span></p>
                                </div>
                                 
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <p className="font-medium dark:text-gray-200">Tanggal Kwitansi</p>
                                    <p className="dark:text-gray-300">{item.tgl_kwitansi ? formatDateForDisplay(item.tgl_kwitansi) : '-'}</p>
                                </div>
                               
                            </div>

                            {/* File Summary Badge */}
                            {(() => {
                                const totalFiles = [...sptjmList, ...penginapanList].reduce((sum, item) => sum + (item.files?.length || 0), 0);
                                if (totalFiles === 0) return null;
                                return (
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{totalFiles} File Pendukung</p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                                {sptjmList.reduce((s, i) => s + (i.files?.length || 0), 0)} file transport,{' '}
                                                {penginapanList.reduce((s, i) => s + (i.files?.length || 0), 0)} file penginapan
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            {/* SPTJM Transport Section */}
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                            <div key={sptjm.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">Transport {idx + 1}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatDateForDisplay(sptjm.created_at)}
                                                    </span>
                                                </div>
                                                <div className="p-3">
                                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Jenis Transport:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                                                {getJenisTransportLabel(sptjm.jenis_transport) || '-'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Nama Maskapai/Perusahaan:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">{sptjm.nama_maskapai || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Kode Penerbangan/No. Polisi:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">{sptjm.kode_penerbangan || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Nomor Kursi/Kabin:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">{sptjm.nomor_kursi || '-'}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* File Attachments */}
                                                    {sptjm.files && sptjm.files.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">File Pendukung:</span>
                                                            <div className="space-y-2">
                                                                {sptjm.files.map((file, fileIdx) => (
                                                                    <div key={file.id || fileIdx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            {getFileIcon(file.file_name)}
                                                                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-xs">{file.file_name}</span>
                                                                            {file.file_size && (
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                                    ({(file.file_size / 1024).toFixed(1)} KB)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => downloadFile(file.id, file.file_name)}
                                                                            className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                            </svg>
                                                                            Unduh
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
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
                            
                            {/* SPTJM Penginapan Section - PERBAIKAN */}
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    SPTJM Penginapan
                                </h4>
                                
                                {loadingPenginapan ? (
                                    <div className="flex justify-center py-4">
                                        <svg className="animate-spin h-6 w-6 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                ) : penginapanList.length > 0 ? (
                                    <div className="space-y-3">
                                        {penginapanList.map((penginapan, idx) => (
                                            <div key={penginapan.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">Penginapan {idx + 1}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {penginapan.created_at ? formatDateForDisplay(penginapan.created_at) : '-'}
                                                    </span>
                                                </div>
                                                <div className="p-3">
                                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                                        <div className="col-span-2">
                                                            <span className="text-gray-500 dark:text-gray-400">Nama Hotel/Penginapan:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                                                {penginapan.nama_penginapan || penginapan.nama_hotel || '-'}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="text-gray-500 dark:text-gray-400">Alamat:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                                                {penginapan.alamat_penginapan || penginapan.alamat || '-'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Nomor Kamar:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">{penginapan.nomor_kamar || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Tarif Hotel:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                                                {penginapan.tarif_hotel ? formatRupiah(penginapan.tarif_hotel) : '-'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Tanggal Menginap:</span>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                                                {penginapan.tgl_menginap ? formatDateForDisplay(penginapan.tgl_menginap) : '-'}
                                                            </p>
                                                        </div>
                                                        {penginapan.kode_booking && (
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-400">Kode Booking:</span>
                                                                <p className="font-medium text-gray-800 dark:text-gray-100">{penginapan.kode_booking}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* File Attachments */}
                                                    {penginapan.files && penginapan.files.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">File Pendukung:</span>
                                                            <div className="space-y-2">
                                                                {penginapan.files.map((file, fileIdx) => (
                                                                    <div key={file.id || fileIdx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            {getFileIcon(file.file_name)}
                                                                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-xs">{file.file_name}</span>
                                                                            {file.file_size && (
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                                    ({(file.file_size / 1024).toFixed(1)} KB)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => downloadPenginapanFile(file.id, file.file_name)}
                                                                            className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                            </svg>
                                                                            Unduh
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                        <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Belum ada data SPTJM Penginapan
                                    </div>
                                )}
                            </div>
                            
                            {/* Status Approval Berjenjang */}
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Status Persetujuan Berjenjang (Pegawai → PPK → Bendahara)</h4>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                        <div>
                                            <span className="font-medium dark:text-gray-200">1. Persetujuan Pegawai</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.nama_pegawai || item.nama || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(statusPegawai, 'Pegawai')}
                                            {item.tgl_ttd_pegawai && <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateForDisplay(item.tgl_ttd_pegawai)}</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                        <div>
                                            <span className="font-medium dark:text-gray-200">2. Persetujuan PPK</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.ppk_nama || '-'} ({item.ppk_nip || '-'})</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(statusPpk, 'PPK')}
                                            {item.tgl_ttd_ppk && <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateForDisplay(item.tgl_ttd_ppk)}</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                        <div>
                                            <span className="font-medium dark:text-gray-200">3. Persetujuan Bendahara</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.bendahara_nama || '-'} ({item.bendahara_nip || '-'})</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(statusBendahara, 'Bendahara')}
                                            {item.tgl_ttd_bendahara && <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateForDisplay(item.tgl_ttd_bendahara)}</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Tanda Tangan Digital */}
                                {(statusPegawai === 'sudah' || statusPpk === 'sudah' || statusBendahara === 'sudah') && (
                                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                        <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Tanda Tangan Digital</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {statusPegawai === 'sudah' && (
                                                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pegawai</p>
                                                    {ttdPegawaiUrl ? (
                                                        <img src={ttdPegawaiUrl} alt="TTD Pegawai" className="max-h-20 mx-auto object-contain" />
                                                    ) : <p className="text-xs text-gray-400 dark:text-gray-500">Tanda tangan digital</p>}
                                                </div>
                                            )}
                                            {statusPpk === 'sudah' && (
                                                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">PPK</p>
                                                    {ttdPpkUrl ? (
                                                        <img src={ttdPpkUrl} alt="TTD PPK" className="max-h-20 mx-auto object-contain" />
                                                    ) : <p className="text-xs text-gray-400 dark:text-gray-500">Tanda tangan digital</p>}
                                                </div>
                                            )}
                                            {statusBendahara === 'sudah' && (
                                                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bendahara</p>
                                                    {ttdBendaharaUrl ? (
                                                        <img src={ttdBendaharaUrl} alt="TTD Bendahara" className="max-h-20 mx-auto object-contain" />
                                                    ) : <p className="text-xs text-gray-400 dark:text-gray-500">Tanda tangan digital</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Tombol Persetujuan */}
                                {showApproveButtons && (
                                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            {isPegawai && 'Sebagai Pegawai, silakan periksa kwitansi dan berikan persetujuan.'}
                                            {isPpk && 'Sebagai PPK, silakan periksa kwitansi dan berikan persetujuan.'}
                                            {isBendahara && 'Sebagai Bendahara, silakan periksa kwitansi dan berikan persetujuan akhir.'}
                                        </p>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Catatan (jika ditolak)</label>
                                            <textarea
                                                value={catatan}
                                                onChange={(e) => setCatatan(e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                {!showApproveButtons && (
                                    <div className="mt-4 pt-4 border-t dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 text-sm">
                                        {isPegawai && statusPegawai !== 'belum' && '✓ Anda sudah memberikan persetujuan.'}
                                        {isPpk && statusPegawai !== 'sudah' && '⏳ Menunggu persetujuan dari Pegawai terlebih dahulu.'}
                                        {isPpk && statusPegawai === 'sudah' && statusPpk !== 'belum' && '✓ Anda sudah memberikan persetujuan.'}
                                        {isBendahara && statusPegawai !== 'sudah' && '⏳ Menunggu persetujuan dari Pegawai terlebih dahulu.'}
                                        {isBendahara && statusPegawai === 'sudah' && statusPpk !== 'sudah' && '⏳ Menunggu persetujuan dari PPK terlebih dahulu.'}
                                        {isBendahara && statusPegawai === 'sudah' && statusPpk === 'sudah' && statusBendahara !== 'belum' && '✓ Anda sudah memberikan persetujuan.'}
                                        {statusPegawai === 'sudah' && statusPpk === 'sudah' && statusBendahara === 'sudah' && '✓ Kwitansi sudah lengkap disetujui oleh semua pihak.'}
                                    </div>
                                )}
                            </div>
                            
                            {/* Total Biaya */}
                            <div className="mt-4 bg-red-50 dark:bg-red-900/30 p-3 rounded text-center">
                                <p className="font-medium dark:text-gray-200">Jumlah Total</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">Rp {formatRupiah(totalBiaya)}</p>
                            </div>
                            
                            {/* File Preview */}
                            {fileUrl && !fileError && (
                                <div className="mt-4">
                                    <p className="font-medium dark:text-gray-200 mb-2">File Kwitansi:</p>
                                    {getFilePreview()}
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="mt-6 flex justify-end sticky bottom-0 bg-white dark:bg-gray-800 pt-3 border-t dark:border-gray-700">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}