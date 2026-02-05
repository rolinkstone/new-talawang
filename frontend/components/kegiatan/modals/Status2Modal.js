// components/kegiatan/modals/Status2Modal.js
import React, { useState, useEffect } from 'react';

const Status2Modal = ({ show, onClose, item, onSave, isLoading }) => {
    const [formData, setFormData] = useState({
        status_2: '',
        catatan_status_2: ''
    });

    // Opsi untuk status_2 (bisa disesuaikan)
    const status2Options = [
        { value: '', label: '-- Pilih Status 2 --' },
        { value: 'DIPROSES', label: 'DIPROSES' },
        { value: 'SELESAI', label: 'SELESAI' }
    ];

    // Reset form ketika modal dibuka dengan item baru
    useEffect(() => {
        if (item) {
            setFormData({
                status_2: item.status_2 || '',
                catatan_status_2: item.catatan_status_2 || ''
            });
        }
    }, [item, show]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.status_2.trim()) {
            alert('Status 2 harus dipilih');
            return;
        }

        onSave({
            id: item.id,
            ...formData
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (!show || !item) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Ubah Status 2
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="text-sm text-blue-700">
                            <span className="font-medium">Kegiatan:</span> {item.kegiatan}
                        </div>
                        <div className="text-sm text-blue-700">
                            <span className="font-medium">MAK:</span> {item.mak}
                        </div>
                        <div className="text-sm text-blue-700">
                            <span className="font-medium">Status Saat Ini:</span> {item.status}
                        </div>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status 2 *
                            </label>
                            <select
                                name="status_2"
                                value={formData.status_2}
                                onChange={handleSelectChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                required
                            >
                                {status2Options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Pilih status tambahan untuk kegiatan yang sudah selesai
                            </p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Catatan Status 2 (Opsional)
                            </label>
                            <textarea
                                name="catatan_status_2"
                                value={formData.catatan_status_2}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Tambahkan catatan atau penjelasan untuk status 2 ini..."
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Catatan akan disimpan di riwayat perubahan
                            </p>
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition duration-150 ease-in-out"
                                disabled={isLoading}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition duration-150 ease-in-out flex items-center"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan Status 2'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Status2Modal;