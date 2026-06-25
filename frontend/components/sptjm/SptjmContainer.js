// components/sptjm/SptjmContainer.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import NotificationModal from '../common/NotificationModal';

export default function SptjmContainer() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');

    useEffect(() => {
        if (session?.accessToken) {
            fetchData();
        }
    }, [session]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sptjm`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`
                }
            });
            
            if (response.data.success) {
                setData(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching SPTJM data:', error);
            setError('Gagal memuat data SPTJM');
            setNotificationMessage('Gagal memuat data SPTJM');
            setModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">SPTJM - Surat Pernyataan Tanggung Jawab Mutlak</h1>
            
            {error && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
                    {error}
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                    Belum ada data SPTJM
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <tr key={item.id || index}>
                                    <td className="px-6 py-4">{item.id || '-'}</td>
                                    <td className="px-6 py-4">{item.nama || '-'}</td>
                                    <td className="px-6 py-4">{item.status || '-'}</td>
                                    <td className="px-6 py-4">{item.tanggal || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <NotificationModal
                show={modalOpen}
                message={notificationMessage}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
}