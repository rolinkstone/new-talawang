import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

const KirimPPKModal = ({ 
    show, 
    kegiatanId, 
    onClose, 
    onSuccess,
    kegiatanData 
}) => {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [loadingPpkList, setLoadingPpkList] = useState(false);
    const [error, setError] = useState('');
    const [ppkList, setPpkList] = useState([]);
    const [selectedPpkId, setSelectedPpkId] = useState('');
    const [selectedPpkNama, setSelectedPpkNama] = useState('');
    const [selectedPpkNip, setSelectedPpkNip] = useState('');
    const [catatan, setCatatan] = useState('');
    
    // Fetch daftar PPK saat modal dibuka
    useEffect(() => {
        if (show && session?.accessToken) {
            fetchPPKList();
            resetForm();
        }
    }, [show, session]);

    const fetchPPKList = async () => {
        try {
            setLoadingPpkList(true);
            setError('');

            // Menggunakan route dari keycloak.js
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/keycloak/ppk/list`,
                {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            if (response.data.success) {
                setPpkList(response.data.data);
            } else {
                throw new Error(response.data.message || 'Gagal mengambil daftar PPK');
            }
        } catch (error) {
            console.error('Error fetching PPK list:', error);
            
            // Fallback: coba ambil dari route alternatif
            if (error.response?.status === 404 || error.response?.status === 500) {
                try {
                    console.log('Mencoba route alternatif...');
                    const fallbackResponse = await axios.get(
                        `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/ppk/list`,
                        {
                            headers: { 
                                Authorization: `Bearer ${session.accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    if (fallbackResponse.data.success) {
                        setPpkList(fallbackResponse.data.data);
                    } else {
                        throw new Error('Route alternatif juga gagal');
                    }
                } catch (fallbackError) {
                    setError('Gagal mengambil daftar PPK. Pastikan server berjalan dan Anda memiliki akses.');
                }
            } else {
                setError('Gagal mengambil daftar PPK: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setLoadingPpkList(false);
        }
    };

    const resetForm = () => {
        setSelectedPpkId('');
        setSelectedPpkNama('');
        setSelectedPpkNip('');
        setCatatan('');
        setError('');
    };

    const handleSelectPpk = (e) => {
        const ppkId = e.target.value;
        const selected = ppkList.find(p => p.user_id === ppkId);
        
        if (selected) {
            setSelectedPpkId(ppkId);
            setSelectedPpkNama(selected.nama || selected.full_name || selected.username || '');
            setSelectedPpkNip(selected.nip || selected.user_nip || '');
            console.log('Selected PPK:', {
                id: ppkId,
                nama: selected.nama,
                nip: selected.nip
            });
        } else {
            setSelectedPpkId('');
            setSelectedPpkNama('');
            setSelectedPpkNip('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!kegiatanId || !selectedPpkId || !selectedPpkNama) {
            setError('Pilih PPK terlebih dahulu');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatanId}/kirim-ke-ppk`,
                {
                    ppk_id: selectedPpkId,
                    ppk_nama: selectedPpkNama,
                    ppk_nip: selectedPpkNip || null,
                    catatan: catatan.trim() || null,
                    tanggal_kirim: new Date().toISOString()
                },
                {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    validateStatus: (status) => status < 500
                }
            );

            if (response.data.success) {
                if (onSuccess) {
                    onSuccess({
                        message: response.data.message || 'Kegiatan berhasil dikirim ke PPK',
                        ppk_nama: selectedPpkNama,
                        ppk_nip: selectedPpkNip,
                        kegiatan_id: kegiatanId,
                        data: response.data.data
                    });
                }
                onClose();
            } else {
                throw new Error(response.data.message || 'Gagal mengirim ke PPK');
            }
        } catch (error) {
            console.error('Error sending to PPK:', error);
            
            let errorMessage = 'Terjadi kesalahan saat mengirim ke PPK';
            
            if (error.response) {
                if (error.response.status === 400) {
                    errorMessage = error.response.data.message || 'Data tidak valid';
                } else if (error.response.status === 401) {
                    errorMessage = 'Sesi telah berakhir. Silakan login kembali.';
                } else if (error.response.status === 403) {
                    errorMessage = 'Anda tidak memiliki izin untuk melakukan aksi ini';
                } else if (error.response.status === 404) {
                    errorMessage = 'Kegiatan tidak ditemukan';
                } else if (error.response.status === 409) {
                    errorMessage = 'Kegiatan sudah dikirim ke PPK sebelumnya';
                } else {
                    errorMessage = error.response.data.message || error.message;
                }
            } else if (error.request) {
                errorMessage = 'Tidak ada respon dari server. Periksa koneksi internet Anda.';
            } else {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Kirim ke PPK</h3>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
                            disabled={loading}
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-400 dark:text-red-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        {/* Info Kegiatan */}
                        {kegiatanData && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800">
                                <div className="text-sm">
                                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{kegiatanData.kegiatan || 'Kegiatan'}</div>
                                    <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                                        No. ST: {kegiatanData.no_st || '-'} | MAK: {kegiatanData.mak || '-'}
                                    </div>
                                    {kegiatanData.total_nominatif && (
                                        <div className="text-green-700 dark:text-green-400 font-medium mt-1">
                                            Total: Rp {Number(kegiatanData.total_nominatif || 0).toLocaleString("id-ID")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Pilih PPK */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Pilih PPK *
                            </label>
                            {loadingPpkList ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Memuat daftar PPK...</span>
                                </div>
                            ) : (
                                <select
                                    value={selectedPpkId}
                                    onChange={handleSelectPpk}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                >
                                    <option value="">-- Pilih PPK --</option>
                                    {ppkList.map(ppk => (
                                        <option key={ppk.user_id} value={ppk.user_id}>
                                            {ppk.nama || ppk.full_name || ppk.username || 'Unknown'} 
                                            {ppk.nip && ` - NIP: ${ppk.nip}`}
                                            {!ppk.nip && ppk.user_nip && ` - NIP: ${ppk.user_nip}`}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        
                        {/* PPK yang dipilih dengan NIP */}
                        {selectedPpkNama && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    PPK yang dipilih
                                </label>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{selectedPpkNama}</div>
                                    {selectedPpkNip && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                            <span className="font-medium">NIP:</span> {selectedPpkNip}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        PPK akan menerima notifikasi via sistem
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Catatan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Catatan (Opsional)
                            </label>
                            <textarea
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Tambahkan catatan untuk PPK..."
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Catatan akan ditampilkan kepada PPK sebagai informasi tambahan
                            </p>
                        </div>
                        
                        {/* Summary yang akan dikirim */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 border border-gray-200 dark:border-gray-600">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Data yang akan dikirim:</div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">PPK:</span>
                                    <span className="font-medium dark:text-gray-100">{selectedPpkNama || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">NIP PPK:</span>
                                    <span className="font-medium dark:text-gray-100">{selectedPpkNip || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Kegiatan ID:</span>
                                    <span className="font-medium dark:text-gray-100">{kegiatanId || '-'}</span>
                                </div>
                                {catatan && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Catatan:</span>
                                        <span className="font-medium dark:text-gray-100 truncate max-w-[200px]">{catatan}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Warning */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="flex items-start">
                                <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-yellow-700">
                                    <p className="font-medium">Perhatian!</p>
                                    <p>Setelah dikirim ke PPK, data tidak dapat diubah atau dihapus oleh Anda.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer / Actions */}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!selectedPpkId || loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Kirim ke PPK
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KirimPPKModal;