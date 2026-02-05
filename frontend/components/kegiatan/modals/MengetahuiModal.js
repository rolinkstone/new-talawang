// components/kegiatan/PersetujuanModal.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

const PersetujuanModal = ({ show, kegiatan, onClose, onSuccess }) => {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [action, setAction] = useState(''); // 'setuju' or 'kembalikan'
    const [catatan, setCatatan] = useState('');

    // Reset state ketika modal dibuka/tutup
    useEffect(() => {
        if (show && kegiatan) {
            setAction('');
            setCatatan('');
            setError('');
        }
    }, [show, kegiatan]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!action) {
            setError('Pilih aksi terlebih dahulu');
            return;
        }

        // Validasi catatan untuk pengembalian
        if (action === 'kembalikan' && !catatan.trim()) {
            setError('Catatan wajib diisi untuk pengembalian');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let endpoint = '';
            let payload = {};
            let successMessage = '';
            
            if (action === 'setuju') {
                endpoint = `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/approve`;
                payload = { 
                    catatan: catatan.trim() || null,
                    approved_by: session?.user?.name || 'PPK',
                    approved_by_id: session?.user?.id || 'ppk'
                };
                successMessage = 'Kegiatan berhasil diketahui';
            } else {
                endpoint = `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/reject`;
                payload = { 
                    catatan: catatan.trim(),
                    rejected_by: session?.user?.name || 'PPK',
                    rejected_by_id: session?.user?.id || 'ppk'
                };
                successMessage = 'Kegiatan berhasil dikembalikan';
            }

            console.log('Mengirim payload:', payload);

            const response = await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                // Panggil onSuccess dengan pesan yang sesuai
                onSuccess(successMessage, action, response.data.data);
                handleCloseModal();
            } else {
                throw new Error(response.data.message || 'Gagal memproses persetujuan');
            }
        } catch (error) {
            console.error('Error processing approval:', error);
            setError(
                error.response?.data?.message || 
                error.response?.data?.error || 
                error.message || 
                'Terjadi kesalahan saat memproses'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setAction('');
        setCatatan('');
        setError('');
        setLoading(false);
        onClose();
    };

    if (!show || !kegiatan) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Overlay */}
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                    onClick={handleCloseModal}
                />
                
                {/* Modal */}
                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-1.5">
                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Ketahui Kegiatan</h3>
                                    <p className="text-sm text-blue-100">Tinjau dan berikan keputusan</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition"
                                disabled={loading}
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div className="px-6 py-5">
                        {/* Info Kegiatan */}
                        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3">
                                <h4 className="text-lg font-semibold text-gray-900">{kegiatan.kegiatan}</h4>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                        No. ST: {kegiatan.no_st || 'Belum ada'}
                                    </span>
                                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                        MAK: {kegiatan.mak || 'Belum diisi'}
                                    </span>
                                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                        Status: {kegiatan.status || 'Draft'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="space-y-1">
                                    <div className="text-gray-500">Total Biaya</div>
                                    <div className="font-semibold text-lg text-green-700">
                                        Rp {Number(kegiatan.total_nominatif || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-gray-500">Tanggal Diajukan</div>
                                    <div className="font-semibold text-gray-700">
                                        {kegiatan.tanggal_diajukan ? new Date(kegiatan.tanggal_diajukan).toLocaleDateString('id-ID') : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Pilihan Aksi */}
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Pilih Tindakan *
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAction('setuju')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                                        action === 'setuju'
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                    }`}
                                    disabled={loading}
                                >
                                    <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="font-semibold">Diketahui</span>
                                    <span className="text-xs mt-1">Status: Diketahui</span>
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setAction('kembalikan')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                                        action === 'kembalikan'
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                                    }`}
                                    disabled={loading}
                                >
                                    <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="font-semibold">Kembalikan</span>
                                    <span className="text-xs mt-1">Status: Dikembalikan</span>
                                </button>
                            </div>
                            
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Catatan Input */}
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Catatan {action === 'kembalikan' ? 'Pengembalian' : 'Diketahui'}
                                {action === 'kembalikan' && <span className="ml-1 text-red-500">*</span>}
                            </label>
                            <textarea
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                rows={4}
                                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                                placeholder={
                                    action === 'kembalikan' 
                                        ? 'Berikan alasan pengembalian...' 
                                        : 'Berikan catatan jika diperlukan...'
                                }
                                required={action === 'kembalikan'}
                                disabled={loading}
                            />
                            <p className="mt-1.5 text-sm text-gray-500">
                                {action === 'kembalikan' 
                                    ? 'Catatan wajib diisi untuk memberi tahu user alasan pengembalian'
                                    : 'Catatan opsional untuk memberikan informasi tambahan'}
                            </p>
                        </div>
                        
                        {/* Informasi */}
                        <div className="rounded-lg bg-blue-50 p-4">
                            <div className="flex">
                                <svg className="h-5 w-5 flex-shrink-0 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="ml-3">
                                    <h4 className="text-sm font-medium text-blue-800">Informasi Penting</h4>
                                    <div className="mt-1 text-sm text-blue-700 space-y-1">
                                        <p>• <span className="font-semibold">Diketahui:</span> Status menjadi "Diketahui" dan tidak dapat diubah lagi</p>
                                        <p>• <span className="font-semibold">Kembalikan:</span> Status menjadi "Dikembalikan" dan dapat diperbaiki user</p>
                                        <p>• User dapat mengedit data setelah dikembalikan</p>
                                        <p>• User harus mengirim ulang ke PPK setelah diperbaiki</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer / Actions */}
                    <div className="bg-gray-50 px-6 py-4">
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                disabled={loading}
                                className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                            >
                                Batal
                            </button>
                            
                            {action && (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || (action === 'kembalikan' && !catatan.trim())}
                                    className={`inline-flex w-full items-center justify-center rounded-lg border border-transparent px-4 py-2.5 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-sm ${
                                        action === 'setuju'
                                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                            : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Memproses...
                                        </>
                                    ) : action === 'setuju' ? (
                                        <>
                                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Ketahui Kegiatan
                                        </>
                                    ) : (
                                        <>
                                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Kembalikan Kegiatan
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersetujuanModal;