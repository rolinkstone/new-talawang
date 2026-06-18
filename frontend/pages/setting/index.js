// pages/setting/index.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';

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
    
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [cutoffDate, setCutoffDate] = useState('2026-07-01');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) { router.push('/login'); return; }
        
        // Cek role admin
        const userData = session.user || {};
        const roles = userData.roles || (userData.role ? [userData.role] : []);
        const admin = roles.some(r => r.toLowerCase() === 'admin');
        setIsAdmin(admin);
        
        if (admin) {
            loadSettings();
        } else {
            setLoading(false);
        }
    }, [session, status]);

    const loadSettings = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            if (res.data.success) {
                setSettings(res.data.data);
                if (res.data.data.lpd_cutoff_date) {
                    setCutoffDate(res.data.data.lpd_cutoff_date.value.substring(0, 10));
                }
            }
        } catch (e) {
            console.error('Error loading settings:', e);
            setMessage('Gagal memuat pengaturan');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCutoff = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/settings/lpd_cutoff_date`,
                { value: cutoffDate },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            if (res.data.success) {
                setMessage('✅ Tanggal cutoff LPD berhasil diperbarui');
                setMessageType('success');
                loadSettings();
            }
        } catch (e) {
            setMessage('❌ Gagal menyimpan: ' + (e.response?.data?.message || e.message));
            setMessageType('error');
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading') return <LoadingSpinner />;
    if (!session) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white">Pengaturan Aplikasi</h1>
                    <p className="text-indigo-100 mt-1">Konfigurasi sistem Talawang Keuangan</p>
                </div>
                
                {!isAdmin ? (
                    <div className="p-8 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6">
                            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">Akses Terbatas</h2>
                        <p className="text-gray-600 mb-6">Halaman ini hanya untuk admin.</p>
                        <button onClick={() => router.push('/')} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Kembali ke Dashboard</button>
                    </div>
                ) : loading ? (
                    <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div><p className="mt-3 text-gray-500">Memuat pengaturan...</p></div>
                ) : (
                    <div className="p-6 space-y-6">
                        {message && (
                            <div className={`p-4 rounded-lg ${messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {message}
                            </div>
                        )}
                        
                        {/* Card: Cutoff Date LPD */}
                        <div className="border border-gray-200 rounded-lg p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-800">Tanggal Cutoff LPD & Kwitansi</h3>
                                    
                                    {/* Info tanggal tersimpan */}
                                    {settings.lpd_cutoff_date && (
                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                            <span className="text-blue-600">📅</span>
                                            <span className="text-blue-800">
                                                <strong>Tanggal cutoff tersimpan:</strong> {settings.lpd_cutoff_date.value.substring(0, 10)}
                                            </span>
                                            {settings.lpd_cutoff_date.updated_at && (
                                                <span className="text-blue-400 text-xs ml-2">
                                                    (diperbarui: {new Date(settings.lpd_cutoff_date.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    <p className="text-sm text-gray-600 mt-3">
                Atur tanggal minimal <strong>nominatif dibuat</strong> agar muncul di halaman LPD dan Kwitansi.
                Nominatif yang dibuat sebelum tanggal ini tidak akan muncul.
            </p>
                                    <div className="mt-4 flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700">Hanya nominatif sejak:</label>
                                        <input
                                            type="date"
                                            value={cutoffDate}
                                            onChange={(e) => setCutoffDate(e.target.value)}
                                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleSaveCutoff}
                                            disabled={saving}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                                        >
                                            {saving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Format: YYYY-MM-DD. Contoh: 2026-07-01 berarti hanya nominatif yang dibuat sejak 1 Juli 2026.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Informasi */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <span className="text-yellow-600 text-lg">📌</span>
                                <div className="text-sm text-yellow-800">
                                    <p className="font-medium">Yang perlu diketahui:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Pengaturan ini hanya mempengaruhi halaman <strong>LPD</strong> dan <strong>Kwitansi</strong></li>
                                        <li>Halaman lain seperti Monev dan Laporan tetap menampilkan semua data</li>
                                        <li>Perubahan berlaku setelah halaman LPD/Kwitansi di-refresh</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </DashboardLayout>
    );
}