// components/profile/modals/UploadTTDModal.js
import React, { useState, useRef } from 'react';

export default function UploadTTDModal({ show, onClose, onUpload, uploading, currentTtd }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setError('');
        
        if (!file) {
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            setError('Hanya file JPG, JPEG, atau PNG yang diperbolehkan');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Ukuran file maksimal 2MB');
            return;
        }

        setSelectedFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = () => {
        if (!selectedFile) {
            setError('Pilih file terlebih dahulu');
            return;
        }
        onUpload(selectedFile);
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setError('');
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose}></div>
                
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {currentTtd ? 'Ganti Tanda Tangan Digital' : 'Upload Tanda Tangan Digital'}
                        </h3>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
                            disabled={uploading}
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Info */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-200">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="font-medium">Format yang didukung:</p>
                                    <p className="text-xs mt-1">JPG, JPEG, PNG (maksimal 2MB)</p>
                                    <p className="text-xs mt-1">Rekomendasi ukuran: 200x100 pixels</p>
                                </div>
                            </div>
                        </div>

                        {/* File Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Pilih File TTD
                            </label>
                            <div 
                                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                {previewUrl ? (
                                    <div className="space-y-2">
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview TTD" 
                                            className="max-h-32 mx-auto border rounded"
                                        />
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Klik untuk mengganti file</p>
                                    </div>
                                ) : (
                                    <div>
                                        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Klik untuk pilih file</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">atau drag and drop</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                                <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                disabled={uploading}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Mengupload...
                                    </>
                                ) : (
                                    'Upload TTD'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}