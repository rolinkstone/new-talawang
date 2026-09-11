// components/common/UnderDevelopment.js
import React from 'react';
import { useRouter } from 'next/router';

export default function UnderDevelopment({ 
    title = "Fitur dalam Pengembangan",
    description = "Halaman ini sedang kami kembangkan untuk memberikan pengalaman terbaik.",
    features = [],
    redirectTo = "/"
}) {
    const router = useRouter();

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
                    <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 8h-6L8 4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                              d="M4 8h16M7 12h10M9 16h6" />
                    </svg>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    🚧 {title}
                </h2>
                
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                    {description}
                </p>
                
                {features.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                        <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Rencana Fitur:
                        </h3>
                        <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                            {features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <button
                    onClick={() => router.push(redirectTo)}
                    className="mt-8 inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
}