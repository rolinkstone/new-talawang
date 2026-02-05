// components/kegiatan/SuratTugasModal.js - VERSI PROFESIONAL
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function SuratTugasModal({ show, kegiatan, onClose, onSuccess }) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        no_st: '',
        tgl_st: ''
    });

    // Pre-fill form data saat modal dibuka
    useEffect(() => {
        if (show && kegiatan) {
            const defaultNoST = kegiatan.no_st || ``;
            const defaultDate = kegiatan.tgl_st 
                ? new Date(kegiatan.tgl_st).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            setFormData({
                no_st: defaultNoST,
                tgl_st: defaultDate
            });
            setError('');
        }
    }, [show, kegiatan]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validasi
        if (!formData.no_st.trim()) {
            setError('Nomor ST wajib diisi');
            return;
        }

        if (!formData.tgl_st) {
            setError('Tanggal ST wajib diisi');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (!kegiatan?.id) {
                throw new Error('Kegiatan tidak valid');
            }

            if (!session?.accessToken) {
                throw new Error('Sesi tidak valid');
            }

            const payload = {
                no_st: formData.no_st.trim(),
                tgl_st: formData.tgl_st
            };

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/surat-tugas`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                if (onSuccess) {
                    onSuccess(response.data.message || `Surat tugas berhasil direkam: ${formData.no_st}`);
                }
            } else {
                throw new Error(response.data.message || 'Gagal menyimpan surat tugas');
            }

        } catch (error) {
            let errorMessage = 'Terjadi kesalahan saat menyimpan surat tugas';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Input Surat Tugas
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {kegiatan && (
                    <div className="p-6 border-b bg-gray-50">
                        <div className="space-y-2">
                            <div className="flex items-start">
                                <span className="text-sm font-medium text-gray-600 w-24">Kegiatan:</span>
                                <span className="text-sm text-gray-800 flex-1">{kegiatan.kegiatan}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-sm font-medium text-gray-600 w-24">MAK:</span>
                                <span className="text-sm text-gray-800 flex-1">{kegiatan.mak || '-'}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-sm font-medium text-gray-600 w-24">Status:</span>
                                <span className="text-sm text-gray-800 flex-1">{kegiatan.status}</span>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nomor Surat Tugas <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="no_st"
                                value={formData.no_st}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Contoh: ST/BPPK/2024/001"
                                required
                                disabled={loading}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Format: ST/[Unit Kerja]/[Tahun]/[Nomor Urut]
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tanggal Surat Tugas <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="tgl_st"
                                value={formData.tgl_st}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-red-700">{error}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Surat Tugas'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}