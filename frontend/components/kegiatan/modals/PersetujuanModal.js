// components/kegiatan/PersetujuanModal.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

const PersetujuanModal = ({ show, kegiatan, onClose, onSuccess }) => {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [kembalikanLoading, setKembalikanLoading] = useState(false);
    const [error, setError] = useState('');
    const [action, setAction] = useState('menyetujui'); // 'mengetahui' atau 'kembalikan'
    
    // State form sesuai backend
    const [formData, setFormData] = useState({
        catatan_kabalai: '',
        tanggal_mengetahui: new Date().toISOString().split('T')[0]
    });

    // Reset form saat modal dibuka
    useEffect(() => {
        if (show && session?.user) {
            setFormData({
                catatan_kabalai: '',
                tanggal_mengetahui: new Date().toISOString().split('T')[0]
            });
            setError('');
            setAction('menyetujui'); // Reset ke default action
        }
    }, [show, session]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/menyetujui`,
                {
                    ...formData,
                    catatan_kabalai: formData.catatan_kabalai.trim() || null,
                    tanggal_mengetahui: formData.tanggal_mengetahui || new Date().toISOString().split('T')[0],
                    diketahui_oleh: session?.user?.name || session?.user?.username || '',
                    diketahui_oleh_id: session?.user?.id || session?.user?.userId || ''
                },
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                const message = response.data.notification?.message || 
                               response.data.message || 
                               'Form Persetujuan berhasil disimpan';
                
                onSuccess(message);
            } else {
                throw new Error(response.data.message || 'Gagal memproses form Persetujuan');
            }
        } catch (error) {
            console.error('Error processing Persetujuan:', error);
            
            let errorMessage = 'Terjadi kesalahan saat menyimpan data Persetujuan';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            if (error.response?.data?.suggestion) {
                errorMessage += `\nSaran: ${error.response.data.suggestion}`;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleKembalikanKeUser = async () => {
        if (!window.confirm('Apakah Anda yakin ingin mengembalikan kegiatan ini ke user? Kegiatan akan dikembalikan ke status sebelumnya untuk perbaikan.')) {
            return;
        }

        setKembalikanLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/reject-kabalai`,
                {
                    catatan_kabalai: formData.catatan_kabalai.trim() || null,
                    tanggal_kembalikan: new Date().toISOString().split('T')[0],
                    dikembalikan_oleh: session?.user?.name || session?.user?.username || '',
                    dikembalikan_oleh_id: session?.user?.id || session?.user?.userId || ''
                },
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                const message = response.data.notification?.message || 
                               response.data.message || 
                               'Kegiatan berhasil dikembalikan ke user';
                
                onSuccess(message);
            } else {
                throw new Error(response.data.message || 'Gagal mengembalikan kegiatan');
            }
        } catch (error) {
            console.error('Error mengembalikan kegiatan:', error);
            
            let errorMessage = 'Terjadi kesalahan saat mengembalikan kegiatan';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            if (error.response?.data?.suggestion) {
                errorMessage += `\nSaran: ${error.response.data.suggestion}`;
            }
            
            setError(errorMessage);
        } finally {
            setKembalikanLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-teal-100 rounded-lg">
                                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Aksi Kabalai - Persetujuan Kegiatan
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Pilih aksi yang akan dilakukan untuk kegiatan ini
                                    </p>
                                </div>
                            </div>
                            
                            {kegiatan && (
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Kegiatan:</span> {kegiatan.kegiatan}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">No ST:</span> {kegiatan.no_st || '-'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Status Saat Ini:</span>
                                                </p>
                                                <div className="flex items-center mt-1">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                                        kegiatan.status === 'Disetujui PPK' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {kegiatan.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Terakhir diupdate:</p>
                                                <p className="text-xs font-medium text-gray-700">
                                                    {kegiatan.updated_at ? new Date(kegiatan.updated_at).toLocaleDateString('id-ID') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 ml-4"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Action Tabs */}
                <div className="border-b">
                    <div className="flex">
                        <button
                            onClick={() => setAction('menyetujui')}
                            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                                action === 'menyetujui'
                                    ? 'border-b-2 border-teal-500 text-teal-600 bg-teal-50'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Form Persetujuan</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAction('kembalikan')}
                            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                                action === 'kembalikan'
                                    ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                <span>Kembalikan ke User</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex">
                                    <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info berdasarkan action */}
                        {action === 'menyetujui' ? (
                            <>
                               

                                {/* Tanggal Mengetahui */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tanggal Persetujuan
                                    </label>
                                    <input
                                        type="date"
                                        name="tanggal_mengetahui"
                                        value={formData.tanggal_mengetahui}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tanggal persetujuan Kabalai
                                    </p>
                                </div>

                                {/* Catatan Kabalai */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Catatan Tambahan (Opsional)
                                    </label>
                                    <textarea
                                        name="catatan_kabalai"
                                        value={formData.catatan_kabalai}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        rows="4"
                                        placeholder="Tambahkan catatan atau instruksi jika diperlukan..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Catatan akan dicatat dalam riwayat kegiatan
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Info Penting untuk Kembalikan */}
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                                    <div className="flex">
                                        <svg className="h-5 w-5 text-orange-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-medium text-orange-700 mb-1">Kembalikan ke User</p>
                                            <p className="text-xs text-orange-600">
                                                Aksi ini akan mengembalikan kegiatan ke user untuk perbaikan. Kegiatan akan dikembalikan ke status sebelumnya dan user dapat memperbaiki data yang diperlukan.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Catatan Pengembalian */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Alasan Pengembalian *
                                    </label>
                                    <textarea
                                        name="catatan_kabalai"
                                        value={formData.catatan_kabalai}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        rows="4"
                                        placeholder="Berikan alasan mengapa kegiatan perlu dikembalikan ke user (contoh: data tidak lengkap, perlu revisi, dll.)"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Alasan wajib diisi untuk membantu user memahami apa yang perlu diperbaiki
                                    </p>
                                </div>

                                
                            </>
                        )}

                        {/* Preview Data */}
                        
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-gray-50">
                        <div className="flex justify-between items-center">
                            <div className="text-sm">
                                <p className="text-gray-600">
                                    <span className="font-medium">Kabalai:</span> {session?.user?.name || session?.user?.username || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date().toLocaleDateString('id-ID', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                    disabled={loading || kembalikanLoading}
                                >
                                    Batal
                                </button>
                                
                                {action === 'menyetujui' ? (
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                                        disabled={loading || kembalikanLoading}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Setujui & Tandai Persetujuan
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleKembalikanKeUser}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                                        disabled={loading || kembalikanLoading || !formData.catatan_kabalai.trim()}
                                    >
                                        {kembalikanLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                </svg>
                                                Kembalikan ke User
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PersetujuanModal;