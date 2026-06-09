// components/lpd/modals/PersetujuanKabalaiModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PersetujuanKabalaiModal({ show, onClose, kegiatanId, kegiatanNama, onSuccess, session }) {
    const [loading, setLoading] = useState(false);
    const [catatan, setCatatan] = useState('');
    const [error, setError] = useState('');
    const [manualNama, setManualNama] = useState('');
    const [useManualNama, setUseManualNama] = useState(false);

    // Reset form saat modal ditutup
    const resetForm = () => {
        setCatatan('');
        setError('');
        setUseManualNama(false);
        setManualNama('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleApprove = async () => {
        setLoading(true);
        setError('');

        try {
            const userData = session?.user || {};
            
            // Gunakan nama manual jika diaktifkan
            let namaKabalai;
            if (useManualNama && manualNama.trim()) {
                namaKabalai = manualNama.trim();
            } else {
                namaKabalai = userData.name || 
                              userData.full_name || 
                              userData.fullName || 
                              userData.nama || 
                              userData.email || 
                              'Unknown';
            }
            
            const nipKabalai = userData.nip || '';

            const response = await axios.post(
                `${API_BASE_URL}/lpd/approve-kabalai/${kegiatanId}`,
                { 
                    catatan: catatan || '',
                    nama_kabalai: namaKabalai,
                    nip_kabalai: nipKabalai
                },
                {
                    headers: { 
                        'Authorization': `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data.success) {
                onSuccess(response.data.message);
                handleClose();
            } else {
                setError(response.data.message || 'Gagal menyetujui LPD');
            }
        } catch (err) {
            let errorMessage = 'Terjadi kesalahan saat menyetujui LPD';
            
            if (err.response) {
                errorMessage = err.response.data?.message || 
                              err.response.data?.error || 
                              `Server error: ${err.response.status}`;
            } else if (err.request) {
                errorMessage = 'Tidak ada response dari server. Periksa koneksi Anda.';
            } else {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!catatan || catatan.trim().length === 0) {
            setError('Catatan alasan penolakan wajib diisi');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userData = session?.user || {};
            
            let namaKabalai;
            if (useManualNama && manualNama.trim()) {
                namaKabalai = manualNama.trim();
            } else {
                namaKabalai = userData.name || 
                              userData.full_name || 
                              userData.fullName || 
                              userData.nama || 
                              userData.email || 
                              'Unknown';
            }

            const response = await axios.post(
                `${API_BASE_URL}/lpd/reject-kabalai/${kegiatanId}`,
                { 
                    catatan: catatan,
                    nama_kabalai: namaKabalai
                },
                {
                    headers: { 
                        'Authorization': `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data.success) {
                onSuccess(response.data.message);
                handleClose();
            } else {
                setError(response.data.message || 'Gagal menolak LPD');
            }
        } catch (err) {
            let errorMessage = 'Terjadi kesalahan saat menolak LPD';
            
            if (err.response) {
                errorMessage = err.response.data?.message || 
                              err.response.data?.error || 
                              `Server error: ${err.response.status}`;
            } else if (err.request) {
                errorMessage = 'Tidak ada response dari server. Periksa koneksi Anda.';
            } else {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>
                
                <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full sm:mx-0 sm:h-10 sm:w-10 bg-purple-100">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">
                                    Persetujuan Kabalai
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Kegiatan: <span className="font-medium">{kegiatanNama}</span>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    ✓ Telah disetujui oleh Katim/Kabag TU
                                </p>
                            </div>
                        </div>

                        {/* Opsi Manual Input Nama */}
                        <div className="mt-4 p-3 bg-blue-50 rounded-md">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-blue-700 w-full">
                                    <p className="font-medium">✏️ Opsi Nama Kabalai:</p>
                                    <label className="flex items-center mt-2">
                                        <input
                                            type="checkbox"
                                            checked={useManualNama}
                                            onChange={(e) => setUseManualNama(e.target.checked)}
                                            className="mr-2"
                                        />
                                        <span>Gunakan nama manual (jika nama otomatis tidak sesuai)</span>
                                    </label>
                                    
                                    {useManualNama && (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                value={manualNama}
                                                onChange={(e) => setManualNama(e.target.value)}
                                                placeholder="Masukkan nama Kabalai"
                                                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <p className="text-xs text-blue-600 mt-1">
                                                Nama ini akan disimpan sebagai nama_kabalai di database
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Error Panel */}
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm w-full">
                                        <p className="font-medium text-red-800">Error:</p>
                                        <p className="text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Catatan (Opsional untuk Approve, Wajib untuk Tolak)
                                </label>
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Tambahkan catatan jika diperlukan..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={handleApprove}
                            disabled={loading}
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memproses...
                                </>
                            ) : (
                                'Setujui LPD'
                            )}
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={loading}
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Memproses...' : 'Tolak LPD'}
                        </button>
                        <button
                            onClick={handleClose}
                            type="button"
                            className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}