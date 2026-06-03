// pages/setting/index.js
import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

// LoadingSpinner sederhana (tanpa import file eksternal)
const LoadingSpinner = () => (
    <div className="flex justify-center items-center min-h-screen">
        <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
            <div className="mt-3 text-gray-600 font-medium">Memuat...</div>
        </div>
    </div>
);

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Loading state
    if (status === 'loading') {
        return <LoadingSpinner />;
    }

    // Redirect jika tidak login
    if (!session) {
        router.push('/login');
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white">
                        Halaman Pengaturan
                    </h1>
                    <p className="text-indigo-100 mt-1">Fitur sedang dalam pengembangan</p>
                </div>
                
                <div className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
                        <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 8h-6L8 4z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-800 mb-3">
                        🚧 Sedang dalam Pengembangan
                    </h2>
                    
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                        Halaman pengaturan sedang kami kembangkan. Fitur ini akan segera tersedia.
                    </p>
                    
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Kembali ke DashboardH
                    </button>
                </div>
            </div>
        </div>
    );
}