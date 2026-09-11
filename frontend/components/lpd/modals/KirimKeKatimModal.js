// components/lpd/modals/KirimKeKatimModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function KirimKeKatimModal({ show, onClose, kegiatanId, kegiatanNama, onSuccess, session }) {
    const [loading, setLoading] = useState(false);
    const [katimList, setKatimList] = useState([]);
    const [loadingKatim, setLoadingKatim] = useState(false);
    const [selectedKatim, setSelectedKatim] = useState('');
    const [selectedKatimNama, setSelectedKatimNama] = useState('');
    const [selectedKatimNip, setSelectedKatimNip] = useState('');
    const [catatan, setCatatan] = useState('');
    const [error, setError] = useState('');

    // Fungsi untuk refresh notifikasi di dashboard
    const refreshNotifications = () => {
        if (typeof window !== 'undefined') {
            // Trigger event untuk refresh notifikasi
            window.dispatchEvent(new Event('refresh-notifications'));
            console.log('🔔 Event refresh-notifications dispatched from KirimKeKatimModal');
            
            // Jika ada fungsi global
            if (window.refreshNotifications) {
                window.refreshNotifications();
                console.log('🔔 window.refreshNotifications() called');
            }
        }
    };

    const fetchKatimList = async () => {
        if (!session?.accessToken) return;
        
        try {
            setLoadingKatim(true);
            
            // ============ PERBAIKAN: Gunakan endpoint yang sudah dibuat ============
            // Coba endpoint untuk mendapatkan Kabag TU dan Katim
            const response = await axios.get(`${API_BASE_URL}/keycloak/kabag-katim/list`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            
            if (response.data.success && response.data.data) {
                console.log('📋 Daftar Kabag TU/Katim:', response.data.data);
                setKatimList(response.data.data);
            } else {
                // Fallback ke endpoint all-simple jika gagal
                console.log('⚠️ Endpoint kabag-katim/list gagal, mencoba fallback...');
                const fallbackResponse = await axios.get(`${API_BASE_URL}/keycloak/users/all-simple`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });
                
                if (fallbackResponse.data.success && fallbackResponse.data.data) {
                    // Filter berdasarkan jabatan atau role
                    const filtered = fallbackResponse.data.data.filter(user => 
                        user.jabatan?.toLowerCase().includes('katim') || 
                        user.jabatan?.toLowerCase().includes('kabag') ||
                        user.jabatan?.toLowerCase().includes('kepala bidang')
                    );
                    setKatimList(filtered);
                }
            }
        } catch (error) {
            console.error('Error fetching Katim list:', error);
            
            // Coba fallback ke all-simple
            try {
                console.log('🔄 Mencoba fallback ke users/all-simple...');
                const fallbackResponse = await axios.get(`${API_BASE_URL}/keycloak/users/all-simple`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });
                
                if (fallbackResponse.data.success && fallbackResponse.data.data) {
                    const filtered = fallbackResponse.data.data.filter(user => 
                        user.jabatan?.toLowerCase().includes('katim') || 
                        user.jabatan?.toLowerCase().includes('kabag') ||
                        user.jabatan?.toLowerCase().includes('kepala bidang')
                    );
                    setKatimList(filtered);
                } else {
                    setKatimList([]);
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                setKatimList([]);
            }
        } finally {
            setLoadingKatim(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchKatimList();
            setSelectedKatim('');
            setSelectedKatimNama('');
            setSelectedKatimNip('');
            setCatatan('');
            setError('');
        }
    }, [show]);

    const handleKatimChange = (e) => {
        const value = e.target.value;
        if (!value) {
            setSelectedKatim('');
            setSelectedKatimNama('');
            setSelectedKatimNip('');
            return;
        }
        
        const selected = katimList.find(k => k.id === value || k.user_id === value);
        if (selected) {
            setSelectedKatim(selected.id || selected.user_id);
            setSelectedKatimNama(selected.nama);
            setSelectedKatimNip(selected.nip || '');
        }
    };

    const handleSubmit = async () => {
        if (!selectedKatim) {
            setError('Silakan pilih Katim/Kabag TU terlebih dahulu');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${API_BASE_URL}/lpd/kirim-ke-katim/${kegiatanId}`,
                {
                    katim_id: selectedKatim,
                    katim_nama: selectedKatimNama,
                    katim_nip: selectedKatimNip,
                    catatan: catatan || ''
                },
                {
                    headers: { 'Authorization': `Bearer ${session?.accessToken}` }
                }
            );

            if (response.data.success) {
                // ============ REFRESH NOTIFIKASI ============
                refreshNotifications();
                
                onSuccess(response.data.message);
                onClose();
            } else {
                setError(response.data.message || 'Gagal mengirim LPD');
            }
        } catch (err) {
            console.error('Error sending to Katim:', err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengirim LPD');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>
                
                <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-4 pt-5 pb-4 bg-white dark:bg-gray-800 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/50 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                                    Kirim LPD ke Katim/Kabag TU
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Kegiatan: <span className="font-medium">{kegiatanNama}</span>
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Setelah dikirim, LPD akan menunggu persetujuan dari Katim/Kabag TU.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Pilih Katim/Kabag TU *
                                </label>
                                {loadingKatim ? (
                                    <div className="flex items-center py-2">
                                        <svg className="w-5 h-5 mr-2 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-gray-500 dark:text-gray-400">Memuat daftar Katim...</span>
                                    </div>
                                ) : katimList.length === 0 ? (
                                    <div className="p-3 text-sm text-yellow-700 bg-yellow-50 rounded-md">
                                        <p>Tidak ada data Katim/Kabag TU ditemukan.</p>
                                        <p className="text-xs mt-1">Pastikan ada user dengan role "katim" atau "kabag_tu" di Keycloak.</p>
                                    </div>
                                ) : (
                                    <select
                                        value={selectedKatim}
                                        onChange={handleKatimChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Pilih Katim/Kabag TU --</option>
                                        {katimList.map(katim => (
                                            <option key={katim.id || katim.user_id} value={katim.id || katim.user_id}>
                                                {katim.nama} 
                                                {katim.nip ? ` - NIP: ${katim.nip}` : ''} 
                                                {katim.jabatan ? ` (${katim.jabatan})` : ''}
                                                {katim.role ? ` [${katim.role.toUpperCase()}]` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Catatan (Opsional)
                                </label>
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Tambahkan catatan untuk Katim/Kabag TU..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedKatim}
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mengirim...
                                </>
                            ) : (
                                'Kirim ke Katim/Kabag TU'
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            type="button"
                            className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}