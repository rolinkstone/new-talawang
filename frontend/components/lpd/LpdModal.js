// components/lpd/LpdModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function LpdModal({ isOpen, onClose, type, title, kegiatanId, existingData, onSave, onDelete, selectedItem }) {
    const [loading, setLoading] = useState(false);
    const [rincianList, setRincianList] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [keteranganList, setKeteranganList] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    // Format tanggal untuk input (YYYY-MM-DD) - PERBAIKAN UNTUK BERBAGAI FORMAT
    const formatTanggalInput = (date) => {
        if (!date) return '';
        
        try {
            // Jika sudah dalam format YYYY-MM-DD
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return date;
            }
            
            // Jika dalam format DD-MM-YYYY
            if (typeof date === 'string' && date.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const [day, month, year] = date.split('-');
                return `${year}-${month}-${day}`;
            }
            
            // Jika dalam format DD/MM/YYYY
            if (typeof date === 'string' && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = date.split('/');
                return `${year}-${month}-${day}`;
            }
            
            // Coba parse dengan Date object
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            
            console.warn('Could not parse date:', date);
            return '';
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    // Inisialisasi data untuk modal rincian
    useEffect(() => {
        if (type === 'rincian') {
            if (existingData && existingData.length > 0) {
                const formattedData = existingData.map(item => ({
                    id: item.id,
                    tanggal: formatTanggalInput(item.tanggal),
                    kegiatan: item.kegiatan || '',
                    urutan: item.urutan || 0
                }));
                setRincianList(formattedData);
            } else {
                setRincianList([{ tanggal: '', kegiatan: '', urutan: 1 }]);
            }
        }
    }, [type, existingData, isOpen]);

    // Handle untuk rincian
    const handleAddRincian = () => {
        setRincianList([...rincianList, { tanggal: '', kegiatan: '', urutan: rincianList.length + 1 }]);
    };

    const handleRemoveRincian = (index) => {
        const newList = rincianList.filter((_, i) => i !== index);
        setRincianList(newList);
    };

    const handleRincianChange = (index, field, value) => {
        const newList = [...rincianList];
        newList[index][field] = value;
        setRincianList(newList);
    };

    // Handle untuk dokumentasi
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        
        // Generate preview URLs
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
        
        // Initialize keterangan list
        setKeteranganList(files.map(() => ''));
    };

    const handleKeteranganChange = (index, value) => {
        const newList = [...keteranganList];
        newList[index] = value;
        setKeteranganList(newList);
    };

    const handleRemoveFile = (index) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        
        // Revoke URL to avoid memory leak
        if (previewUrls[index]) {
            URL.revokeObjectURL(previewUrls[index]);
        }
        const newUrls = previewUrls.filter((_, i) => i !== index);
        setPreviewUrls(newUrls);
        
        const newKeterangan = keteranganList.filter((_, i) => i !== index);
        setKeteranganList(newKeterangan);
    };

    // Handle save
    const handleSave = async () => {
        if (type === 'rincian') {
            // Filter out empty rows
            const validRincian = rincianList.filter(item => item.tanggal && item.kegiatan);
            if (validRincian.length === 0) {
                alert('Minimal satu rincian kegiatan harus diisi');
                return;
            }
            
            const result = await onSave(validRincian);
            if (result?.success) {
                onClose();
            }
        } else if (type === 'dokumentasi') {
            if (selectedFiles.length === 0) {
                alert('Pilih file terlebih dahulu');
                return;
            }
            
            const result = await onSave(selectedFiles, keteranganList);
            if (result?.success) {
                onClose();
            }
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (selectedItem && onDelete) {
            const result = await onDelete(selectedItem.id);
            if (result?.success) {
                onClose();
            }
        }
    };

    // Render preview foto untuk dokumentasi
    const renderPreviewImage = (url, index) => {
        const file = selectedFiles[index];
        const isImage = file?.type?.startsWith('image/');
        
        if (isImage) {
            return (
                <img 
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
            );
        } else {
            const fileExtension = file?.name?.split('.').pop()?.toUpperCase() || 'FILE';
            return (
                <div className="w-20 h-20 bg-blue-50 rounded-lg flex flex-col items-center justify-center border border-blue-200">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-blue-600 font-medium mt-1">{fileExtension}</span>
                </div>
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4">
                        {type === 'rincian' && (
                            <div>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {rincianList.map((item, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="text-sm font-medium text-gray-700">Rincian {index + 1}</h4>
                                                {rincianList.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveRincian(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                                                    <input
                                                        type="date"
                                                        value={item.tanggal || ''}
                                                        onChange={(e) => handleRincianChange(index, 'tanggal', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Kegiatan</label>
                                                    <textarea
                                                        value={item.kegiatan || ''}
                                                        onChange={(e) => handleRincianChange(index, 'kegiatan', e.target.value)}
                                                        rows="3"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        placeholder="Deskripsi kegiatan..."
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAddRincian}
                                    className="mt-4 w-full px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-300 transition"
                                >
                                    + Tambah Rincian
                                </button>
                            </div>
                        )}

                        {type === 'dokumentasi' && (
                            <div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih File (Gambar, PDF, Word)</label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Maksimal 20 file, masing-masing maksimal 10MB</p>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-3">
                                                <div className="flex items-start space-x-3">
                                                    {renderPreviewImage(previewUrls[index], index)}
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                        <textarea
                                                            placeholder="Keterangan (opsional)"
                                                            value={keteranganList[index] || ''}
                                                            onChange={(e) => handleKeteranganChange(index, e.target.value)}
                                                            rows="2"
                                                            className="mt-2 w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveFile(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {type === 'delete' && (
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <p className="mt-2 text-sm text-gray-500">
                                    Apakah Anda yakin ingin menghapus dokumentasi "{selectedItem?.file_name}"?
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                        >
                            Batal
                        </button>
                        <button
                            onClick={type === 'delete' ? handleDelete : handleSave}
                            disabled={loading}
                            className={`px-4 py-2 rounded-md text-white transition ${
                                type === 'delete' 
                                    ? 'bg-red-600 hover:bg-red-700' 
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            } disabled:opacity-50`}
                        >
                            {loading ? 'Memproses...' : (type === 'delete' ? 'Hapus' : 'Simpan')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}