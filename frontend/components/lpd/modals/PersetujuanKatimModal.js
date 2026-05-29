// components/lpd/modals/PersetujuanKatimModal.js
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PersetujuanKatimModal({ show, onClose, kegiatanId, kegiatanNama, onSuccess, session }) {
    const [loading, setLoading] = useState(false);
    const [catatan, setCatatan] = useState('');
    const [error, setError] = useState('');

    const resetForm = () => {
        setCatatan('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleApprove = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${API_BASE_URL}/lpd/approve-katim/${kegiatanId}`,
                { catatan: catatan || '' },
                {
                    headers: { 'Authorization': `Bearer ${session?.accessToken}` }
                }
            );

            if (response.data.success) {
                onSuccess(response.data.message);
                handleClose();
            } else {
                setError(response.data.message || 'Gagal menyetujui LPD');
            }
        } catch (err) {
            console.error('Error approving LPD:', err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat menyetujui LPD');
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
            const response = await axios.post(
                `${API_BASE_URL}/lpd/reject-katim/${kegiatanId}`,
                { catatan: catatan },
                {
                    headers: { 'Authorization': `Bearer ${session?.accessToken}` }
                }
            );

            if (response.data.success) {
                onSuccess(response.data.message);
                handleClose();
            } else {
                setError(response.data.message || 'Gagal menolak LPD');
            }
        } catch (err) {
            console.error('Error rejecting LPD:', err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat menolak LPD');
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
                            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full sm:mx-0 sm:h-10 sm:w-10 bg-amber-100">
                                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">
                                    Persetujuan Katim/Kabag TU
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Kegiatan: <span className="font-medium">{kegiatanNama}</span>
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Tanda tangan akan diambil otomatis dari profile Anda
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Catatan (Opsional untuk Approve, Wajib untuk Tolak)
                                </label>
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Tambahkan catatan jika diperlukan..."
                                />
                            </div>

                            <div className="p-3 bg-blue-50 rounded-md">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium">Informasi:</p>
                                        <p>Tanda tangan digital akan diambil otomatis dari profile Anda berdasarkan NIP.</p>
                                        <p className="text-xs mt-1">Pastikan Anda telah mengupload tanda tangan di menu Profile.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={handleApprove}
                            disabled={loading}
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Memproses...' : 'Setujui LPD'}
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