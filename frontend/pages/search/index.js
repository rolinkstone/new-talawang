import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { getSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import axios from 'axios';

export default function SearchKegiatanPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    
    // State utama
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const [activeFilters, setActiveFilters] = useState([]);
    const [sortBy, setSortBy] = useState('updated');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [stats, setStats] = useState({ total: 0, draft: 0, approved: 0, completed: 0 });
    const [cancelingId, setCancelingId] = useState(null);

    // Helper functions
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatRupiah = (number) => {
        if (!number || isNaN(number)) return 'Rp 0';
        return `Rp ${Number(number).toLocaleString('id-ID')}`;
    };

    // Status badge yang lebih profesional
    const StatusBadge = ({ status, no_st, tgl_st }) => {
        const hasCompleteST = no_st && tgl_st;
        
        const getStatusConfig = () => {
            if (hasCompleteST) {
                return {
                    color: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200',
                    label: 'Selesai',
                    icon: '✓'
                };
            }
            
            const configs = {
                draft: {
                    color: 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200',
                    label: 'Draft',
                    icon: '📝'
                },
                diajukan: {
                    color: 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200',
                    label: 'Diajukan',
                    icon: '⬆️'
                },
                disetujui: {
                    color: 'bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border border-blue-200',
                    label: 'Disetujui',
                    icon: '✅'
                },
                diketahui: {
                    color: 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200',
                    label: 'Diketahui',
                    icon: '👁️'
                },
                dikembalikan: {
                    color: 'bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border border-rose-200',
                    label: 'Dikembalikan',
                    icon: '↩️'
                },
                selesai: {
                    color: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200',
                    label: 'Selesai',
                    icon: '✓'
                },
                dibatalkan: {
                    color: 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 border border-gray-400',
                    label: 'Dibatalkan',
                    icon: '✗'
                }
            };
            
            return configs[status] || configs.draft;
        };
        
        const config = getStatusConfig();
        
        return (
            <div className={`px-3 py-1.5 text-xs font-medium rounded-lg ${config.color} flex items-center gap-1.5`}>
                <span className="text-xs">{config.icon}</span>
                <span>{config.label}</span>
            </div>
        );
    };

    // Search function
    const handleSearch = async (e) => {
        e?.preventDefault();
        
        if (!searchTerm.trim()) {
            showNotification('Masukkan kata kunci untuk mencari', 'warning');
            return;
        }
        
        if (!session?.accessToken) {
            showNotification('Session expired. Silakan login kembali', 'error');
            router.push('/login');
            return;
        }
        
        setIsSearching(true);
        
        try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        throw new Error('API URL tidak ditemukan. Periksa konfigurasi environment.');
    }

    const res = await axios.get(`${apiUrl}/search/search`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { q: searchTerm.trim(), limit: 100 }
    });
    
    if (res.data.success) {
        const results = res.data.data || [];
        
        // Sort results
        const sortedResults = sortResults(results, sortBy);
        setSearchResults(sortedResults);
        
        // Calculate stats
        calculateStats(sortedResults);
        
        if (sortedResults.length === 0) {
            showNotification(`Tidak ditemukan data untuk "${searchTerm}"`, 'info');
        }
    } else {
        showNotification(res.data.message || 'Gagal melakukan pencarian', 'error');
        setSearchResults([]);
    }
    } catch (error) {
        console.error('Search error:', error);
        
        // Handle specific error cases
        if (error.message.includes('API URL tidak ditemukan')) {
            showNotification('Konfigurasi aplikasi belum lengkap. Hubungi administrator.', 'error');
        } else {
            showNotification('Gagal melakukan pencarian. Silakan coba lagi.', 'error');
        }
        setSearchResults([]);
    } finally {
        setIsSearching(false);
    }
    };

    // Sort results
    const sortResults = (results, sortKey) => {
        const sorted = [...results];
        
        switch(sortKey) {
            case 'date_asc':
                return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'date_desc':
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'name':
                return sorted.sort((a, b) => (a.kegiatan || '').localeCompare(b.kegiatan || ''));
            case 'budget_high':
                return sorted.sort((a, b) => (b.total_biaya || 0) - (a.total_biaya || 0));
            case 'budget_low':
                return sorted.sort((a, b) => (a.total_biaya || 0) - (b.total_biaya || 0));
            default: // 'updated'
                return sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
    };

    // Calculate statistics
    const calculateStats = (results) => {
        const stats = {
            total: results.length,
            draft: results.filter(r => r.status === 'draft').length,
            approved: results.filter(r => r.status === 'disetujui').length,
            completed: results.filter(r => r.no_st && r.tgl_st).length,
            canceled: results.filter(r => r.status === 'dibatalkan').length,
            totalBudget: results.reduce((sum, r) => sum + (r.total_biaya || 0), 0)
        };
        setStats(stats);
    };

    // Handle cancel kegiatan
    const handleCancelKegiatan = async (id, kegiatanName) => {
        if (!confirm(`Apakah Anda yakin ingin membatalkan kegiatan "${kegiatanName}"?`)) {
            return;
        }

        setCancelingId(id);
        
        try {
            const res = await axios.put(
                `http://localhost:5000/api/search/${id}/cancel`,
                {},
                {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (res.data.success) {
                // Update local state
                setSearchResults(prevResults => 
                    prevResults.map(item => 
                        item.id === id 
                            ? { ...item, status: 'dibatalkan' }
                            : item
                    )
                );
                
                // Recalculate stats
                const updatedResults = searchResults.map(item => 
                    item.id === id ? { ...item, status: 'dibatalkan' } : item
                );
                calculateStats(updatedResults);
                
                showNotification(`Kegiatan "${kegiatanName}" berhasil dibatalkan`, 'success');
            } else {
                showNotification(res.data.message || 'Gagal membatalkan kegiatan', 'error');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            showNotification('Gagal membatalkan kegiatan. Silakan coba lagi.', 'error');
        } finally {
            setCancelingId(null);
        }
    };

    // Clear search
    const handleClearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setActiveFilters([]);
        setStats({ total: 0, draft: 0, approved: 0, completed: 0, canceled: 0, totalBudget: 0 });
    };

    // Notification helper
    const showNotification = (message, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
    };

    // Handle key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Handle sort change
    const handleSortChange = (e) => {
        const newSort = e.target.value;
        setSortBy(newSort);
        const sorted = sortResults(searchResults, newSort);
        setSearchResults(sorted);
    };

    // Logout handler
    const handleLogout = async () => {
        try {
            await signOut({ callbackUrl: '/login' });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Auth check
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) router.push('/login');
    }, [session, status, router]);

    // If loading
    if (status === 'loading') {
        return (
            <DashboardLayout onLogout={handleLogout}>
                <LoadingSpinner fullScreen={true} />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout onLogout={handleLogout}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Notification Toast */}
                {notification.show && (
                    <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-xl transform transition-all duration-300 ${
                        notification.type === 'error' ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white' :
                        notification.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                        notification.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' :
                        'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                    }`}>
                        <div className="flex items-center">
                            {notification.type === 'error' ? (
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : notification.type === 'warning' ? (
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.238 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            ) : notification.type === 'success' ? (
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <span className="font-medium">{notification.message}</span>
                        </div>
                    </div>
                )}

                {/* Main Content - Full Width */}
                <div className="w-full">
                    {/* Search Container */}
                    <div className="px-8 py-8">
                        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Cari Data Kegiatan</h2>
                                    <p className="text-gray-600">Gunakan kata kunci untuk mencari data kegiatan yang spesifik</p>
                                </div>
                                
                                {/* Stats Overview */}
                                {searchResults.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                                            <div className="text-lg font-bold text-blue-700">{stats.total}</div>
                                            <div className="text-xs text-blue-600 font-medium">Total</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg">
                                            <div className="text-lg font-bold text-gray-700">{stats.draft}</div>
                                            <div className="text-xs text-gray-600 font-medium">Draft</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-3 rounded-lg">
                                            <div className="text-lg font-bold text-emerald-700">{stats.approved}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Disetujui</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
                                            <div className="text-lg font-bold text-purple-700">{stats.completed}</div>
                                            <div className="text-xs text-purple-600 font-medium">Selesai</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-gray-200 to-gray-300 p-3 rounded-lg">
                                            <div className="text-lg font-bold text-gray-800">{stats.canceled}</div>
                                            <div className="text-xs text-gray-700 font-medium">Dibatalkan</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className="mb-6">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ketik kata kunci: nama kegiatan, MAK, no. ST, lokasi, PPK, Kabalai..."
                                        className="w-full pl-12 pr-40 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                                        disabled={isSearching}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="px-4 py-2.5 mr-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                            disabled={isSearching}
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSearching || !searchTerm.trim()}
                                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                                        >
                                            {isSearching ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Memproses...
                                                </>
                                            ) : (
                                                'Cari'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Results Section */}
                        <div className="space-y-8">
                            {searchResults.length > 0 ? (
                                <>
                                    {/* Results Header */}
                                    <div className="bg-white rounded-xl shadow p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    Hasil Pencarian: <span className="text-blue-600">{searchTerm}</span>
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Ditemukan <span className="font-bold text-gray-900">{searchResults.length}</span> data • 
                                                    Total anggaran: <span className="font-bold text-green-600">{formatRupiah(stats.totalBudget)}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs text-gray-500">
                                                    {new Date().toLocaleString('id-ID')}
                                                </div>
                                                <select
                                                    value={sortBy}
                                                    onChange={handleSortChange}
                                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="updated">Terbaru diperbarui</option>
                                                    <option value="date_desc">Tanggal (Baru - Lama)</option>
                                                    <option value="date_asc">Tanggal (Lama - Baru)</option>
                                                    <option value="name">Nama (A-Z)</option>
                                                    <option value="budget_high">Anggaran (Tinggi - Rendah)</option>
                                                    <option value="budget_low">Anggaran (Rendah - Tinggi)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Results Table - RAPIH */}
                                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">No</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Kegiatan</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">MAK & Lokasi</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Tanggal Pelaksanaan</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Anggaran</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {searchResults.map((item, index) => (
                                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 border-r border-gray-100">
                                                                {index + 1}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100">
                                                                <div className="flex flex-col gap-1">
                                                                    <StatusBadge status={item.status} no_st={item.no_st} tgl_st={item.tgl_st} />
                                                                    {item.no_st && (
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            ST: <span className="font-medium">{item.no_st}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100">
                                                                <div>
                                                                    <div className="font-medium text-gray-900 text-sm mb-1">{item.kegiatan || '-'}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        ID: {item.id}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100">
                                                                <div className="space-y-1">
                                                                    <div className="font-medium text-gray-900 text-sm">{item.mak || '-'}</div>
                                                                    <div className="text-xs text-gray-600">{item.kota_kab_kecamatan || '-'}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        PPK: {item.ppk_nama || '-'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100">
                                                                <div className="space-y-1">
                                                                    <div className="text-sm text-gray-900">
                                                                        {formatDate(item.rencana_tanggal_pelaksanaan)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Dibuat: {formatDate(item.createdAt)}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100">
                                                                <div className="text-right">
                                                                    <div className="text-base font-bold text-green-700">
                                                                        {formatRupiah(item.total_biaya)}
                                                                    </div>
                                                                    {item.total_biaya > 0 && (
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            per kegiatan
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-center">
                                                                    {item.status !== 'dibatalkan' ? (
                                                                        <button
                                                                            onClick={() => handleCancelKegiatan(item.id, item.kegiatan)}
                                                                            disabled={cancelingId === item.id}
                                                                            className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center shadow-sm border border-gray-300"
                                                                        >
                                                                            {cancelingId === item.id ? (
                                                                                <>
                                                                                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                    </svg>
                                                                                    Memproses...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                    </svg>
                                                                                    Batal Proses
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <div className="text-sm text-gray-500 italic px-4 py-2">
                                                                            Sudah dibatalkan
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Table Footer */}
                                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm text-gray-500 mb-2 sm:mb-0">
                                                    Menampilkan <span className="font-medium">{searchResults.length}</span> dari <span className="font-medium">{searchResults.length}</span> hasil
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Total anggaran: <span className="font-bold text-green-700">{formatRupiah(stats.totalBudget)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : searchTerm && !isSearching ? (
                                // Empty State
                                <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ditemukan hasil</h3>
                                    <p className="text-gray-600 mb-4">Tidak ada data yang cocok dengan pencarian "{searchTerm}"</p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Hapus Pencarian
                                    </button>
                                </div>
                            ) : !searchTerm && !isSearching ? (
                                // Initial State
                                <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Masukkan kata kunci pencarian</h3>
                                    <p className="text-gray-600">Gunakan kolom pencarian di atas untuk mencari data kegiatan</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-gray-200 mt-8">
                    <div className="px-8 py-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-gray-500">
                                © {new Date().getFullYear()} Sistem Pencarian Kegiatan • Versi 1.0
                            </div>
                            <div className="flex gap-4 mt-2 md:mt-0">
                                <div className="text-xs text-gray-500">
                                    Server: <span className="font-medium text-green-600">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);
    
    if (!session) {
        return {
            redirect: {
                destination: '/login',
                permanent: false,
            },
        };
    }
    
    return {
        props: { session },
    };
}