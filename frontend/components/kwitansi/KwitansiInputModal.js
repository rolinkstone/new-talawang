// components/kwitansi/KwitansiInputModal.js
import React, { useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function KwitansiInputModal({ kegiatan, pegawai, onClose, onSuccess }) {
    const { data: session } = useSession();
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        kegiatan_id: kegiatan.id,
        pegawai_id: pegawai.id,
        no_lpd: '',
        tgl_kwitansi: '',
        upload_kwitansi: null
    });
    
    const formatRupiah = (number) => {
        if (!number) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, upload_kwitansi: file });
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('kegiatan_id', formData.kegiatan_id);
            formDataToSend.append('pegawai_id', formData.pegawai_id);
            formDataToSend.append('no_lpd', formData.no_lpd);
            formDataToSend.append('tgl_kwitansi', formData.tgl_kwitansi);
            
            if (formData.upload_kwitansi) {
                formDataToSend.append('upload_kwitansi', formData.upload_kwitansi);
            }
            
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi`, formDataToSend, {
                headers: { 
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.success) {
                onSuccess('Kwitansi berhasil disimpan');
                onClose();
            } else {
                setFormError(response.data.message);
            }
        } catch (error) {
            console.error('Error saving kwitansi:', error);
            setFormError(error.response?.data?.message || 'Terjadi kesalahan');
        } finally {
            setFormLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                
                <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Input Kwitansi Perjalanan Dinas
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Kegiatan:</span> {kegiatan.kegiatan}</div>
                            <div><span className="font-medium">No ST:</span> {kegiatan.no_st || '-'}</div>
                            <div><span className="font-medium">MAK:</span> {kegiatan.mak}</div>
                            <div><span className="font-medium">Lokasi:</span> {kegiatan.kota_kab_kecamatan}</div>
                        </div>
                    </div>
                    
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Pegawai:</span> {pegawai.nama}</div>
                            <div><span className="font-medium">NIP:</span> {pegawai.nip || '-'}</div>
                            <div><span className="font-medium">Total Biaya:</span> 
                                <span className="font-bold text-green-600 ml-1">Rp {formatRupiah(pegawai.total_biaya)}</span>
                            </div>
                        </div>
                    </div>
                    
                    {formError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                            {formError}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    No LPD <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.no_lpd}
                                    onChange={(e) => setFormData({ ...formData, no_lpd: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                    placeholder="Contoh: LPD-001/2024"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tanggal Kwitansi
                                </label>
                                <input
                                    type="date"
                                    value={formData.tgl_kwitansi}
                                    onChange={(e) => setFormData({ ...formData, tgl_kwitansi: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Upload Kwitansi
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max 5MB)</p>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {formLoading ? 'Menyimpan...' : 'Simpan Kwitansi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}