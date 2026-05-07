// components/profile/modals/ViewTTDModal.js
import React, { useState, useEffect } from 'react';

export default function ViewTTDModal({ show, onClose, ttdUrl, userName }) {
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fullImageUrl, setFullImageUrl] = useState(null);

    // Proses URL TTD seperti pola kwitansi
    useEffect(() => {
        if (ttdUrl) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            let cleanPath = ttdUrl;
            
            // Hapus /api jika ada di awal
            if (cleanPath.startsWith('/api/')) {
                cleanPath = cleanPath.replace('/api', '');
            }
            
            // Hapus /api jika ada di tengah
            if (cleanPath.includes('/api/')) {
                cleanPath = cleanPath.replace('/api', '');
            }
            
            // Jika tidak dimulai dengan /uploads, tambahkan
            if (!cleanPath.startsWith('/uploads')) {
                cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
            }
            
            const url = `${baseUrl}${cleanPath}`;
            console.log('ViewTTDModal - URL:', {
                original: ttdUrl,
                cleanPath: cleanPath,
                fullUrl: url
            });
            
            setFullImageUrl(url);
        }
    }, [ttdUrl]);

    const handleImageLoad = () => {
        setLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        setLoading(false);
        setImageError(true);
        console.error('Failed to load image:', fullImageUrl);
    };

    const handleRetry = () => {
        setLoading(true);
        setImageError(false);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Tanda Tangan Digital
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

                    <div className="space-y-4">
                        {/* User Info */}
                        <div className="text-center">
                            <p className="text-sm text-gray-600">Tanda Tangan Digital</p>
                            <p className="font-medium text-gray-900">{userName || '-'}</p>
                        </div>

                        {/* TTD Image */}
                        <div className="border rounded-lg p-4 bg-gray-50 flex justify-center min-h-[200px] items-center">
                            {loading && !imageError && (
                                <div className="text-center">
                                    <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-500">Memuat gambar...</p>
                                </div>
                            )}
                            
                            {!imageError && fullImageUrl && (
                                <img 
                                    src={fullImageUrl} 
                                    alt="Tanda Tangan Digital"
                                    className="max-w-full max-h-48 object-contain"
                                    onLoad={handleImageLoad}
                                    onError={handleImageError}
                                    style={{ display: loading ? 'none' : 'block' }}
                                />
                            )}
                            
                            {imageError && (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-500">Gambar tidak dapat dimuat</p>
                                    <p className="text-xs text-gray-400 mt-1 break-all">Path: {ttdUrl}</p>
                                    <button
                                        onClick={handleRetry}
                                        className="mt-3 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Coba Lagi
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="text-xs text-gray-500 text-center">
                            <p>Format: JPG, JPEG, PNG (maks 2MB)</p>
                            <p className="mt-1">Gunakan untuk verifikasi dokumen</p>
                        </div>

                        {/* Actions */}
                        {fullImageUrl && !imageError && !loading && (
                            <div className="flex justify-center space-x-3 pt-2">
                                <a
                                    href={fullImageUrl}
                                    download="tanda-tangan-digital.png"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </a>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                                >
                                    Tutup
                                </button>
                            </div>
                        )}
                        
                        {(imageError || (!fullImageUrl && !loading)) && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                                >
                                    Tutup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}