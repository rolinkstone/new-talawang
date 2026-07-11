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
    const [stats, setStats] = useState({ total: 0, draft: 0, diajukan: 0, approved: 0, diketahui: 0, dikembalikan: 0, completed: 0, canceled: 0, totalBudget: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const [cancelingId, setCancelingId] = useState(null);
    const [userRole, setUserRole] = useState('');

    // Get user role
    useEffect(() => {
        if (session?.user) {
            const roles = session.user.roles || session.user.role || [];
            const roleArray = Array.isArray(roles) ? roles : [roles];
            if (roleArray.some(r => r.toLowerCase() === 'admin')) {
                setUserRole('admin');
            } else if (roleArray.some(r => r.toLowerCase() === 'ppk')) {
                setUserRole('ppk');
            } else if (roleArray.some(r => r.toLowerCase().includes('kabalai'))) {
                setUserRole('kabalai');
            } else {
                setUserRole('user');
            }
        }
    }, [session]);

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
                    color: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/40 dark:to-green-800/30 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
                    label: 'Selesai',
                    icon: '✓'
                };
            }
            
            const configs = {
                draft: {
                    color: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600',
                    label: 'Draft',
                    icon: '📝'
                },
                diajukan: {
                    color: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-800/30 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-800',
                    label: 'Diajukan',
                    icon: '⬆️'
                },
                disetujui: {
                    color: 'bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/40 dark:to-sky-800/30 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
                    label: 'Disetujui',
                    icon: '✅'
                },
                diketahui: {
                    color: 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-800/30 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800',
                    label: 'Diketahui',
                    icon: '👁️'
                },
                dikembalikan: {
                    color: 'bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/40 dark:to-red-800/30 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800',
                    label: 'Dikembalikan',
                    icon: '↩️'
                },
                selesai: {
                    color: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/40 dark:to-green-800/30 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
                    label: 'Selesai',
                    icon: '✓'
                },
                dibatalkan: {
                    color: 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-gray-100 border border-gray-400 dark:border-gray-600',
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
                
                const sortedResults = sortResults(results, sortBy);
                setSearchResults(sortedResults);
                
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
            default:
                return sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
    };

    // Calculate statistics
    const calculateStats = (results) => {
        const stats = {
            total: results.length,
            draft: results.filter(r => r.status === 'draft').length,
            diajukan: results.filter(r => r.status === 'diajukan').length,
            approved: results.filter(r => r.status === 'disetujui').length,
            diketahui: results.filter(r => r.status === 'diketahui').length,
            dikembalikan: results.filter(r => r.status === 'dikembalikan').length,
            completed: results.filter(r => r.no_st && r.tgl_st).length,
            canceled: results.filter(r => r.status === 'dibatalkan').length,
            totalBudget: results.reduce((sum, r) => sum + (r.total_biaya || 0), 0)
        };
        setStats(stats);
    };

    // Handle cancel kegiatan - ADMIN dan PPK bisa membatalkan
    const handleCancelKegiatan = async (id, kegiatanName, alasan = null) => {
        // Debug log
        console.log('Cancel attempt - User Role:', userRole);
        console.log('Cancel attempt - Kegiatan ID:', id);
        
        // Tentukan pesan konfirmasi berdasarkan role
        let confirmMessage = '';
        if (userRole === 'admin') {
            confirmMessage = `Apakah Anda yakin ingin membatalkan kegiatan "${kegiatanName}"? Sebagai Admin, Anda memiliki wewenang penuh untuk membatalkan kegiatan ini.`;
        } else if (userRole === 'ppk') {
            confirmMessage = `Apakah Anda yakin ingin membatalkan kegiatan "${kegiatanName}"? Sebagai PPK yang bertanggung jawab, Anda dapat membatalkan kegiatan ini.`;
        } else {
            confirmMessage = `Anda tidak memiliki wewenang untuk membatalkan kegiatan ini. Hanya Admin dan PPK yang bersangkutan yang dapat membatalkan.`;
            showNotification(confirmMessage, 'error');
            return;
        }
        
        // Minta alasan pembatalan (Cancel = batal)
        const userReason = prompt(`${confirmMessage}\n\nMasukkan alasan pembatalan (opsional):`, 'Dibatalkan melalui sistem pencarian');
        
        if (userReason === null) {
            return; // User membatalkan
        }

        setCancelingId(id);
        
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const payload = {};
            if (userReason && userReason.trim()) {
                payload.alasan_pembatalan = userReason;
            }
            
            console.log(`Sending cancel request to: ${apiUrl}/search/${id}/cancel`);
            
            const res = await axios.put(
                `${apiUrl}/search/${id}/cancel`,
                payload,
                {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Cancel response:', res.data);

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
                
                const successMessage = res.data.data?.alasan_pembatalan 
                    ? `Kegiatan "${kegiatanName}" berhasil dibatalkan. Alasan: ${res.data.data.alasan_pembatalan}`
                    : `Kegiatan "${kegiatanName}" berhasil dibatalkan oleh ${userRole.toUpperCase()}`;
                
                showNotification(successMessage, 'success');
            } else {
                showNotification(res.data.message || 'Gagal membatalkan kegiatan', 'error');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            
            // Handle error response
            if (error.response) {
                console.error('Error response:', error.response.data);
                showNotification(error.response.data?.message || 'Gagal membatalkan kegiatan. Silakan coba lagi.', 'error');
            } else if (error.request) {
                showNotification('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 'error');
            } else {
                showNotification('Gagal membatalkan kegiatan. Silakan coba lagi.', 'error');
            }
        } finally {
            setCancelingId(null);
        }
    };

    // Clear search
    const handleClearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setActiveFilters([]);
        setStatusFilter('');
        setStats({ total: 0, draft: 0, diajukan: 0, approved: 0, diketahui: 0, dikembalikan: 0, completed: 0, canceled: 0, totalBudget: 0 });
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

    // Cek apakah user berhak membatalkan (Admin atau PPK)
    const canCancel = userRole === 'admin' || userRole === 'ppk';

    // Filter results berdasarkan status
    const filteredResults = statusFilter
        ? searchResults.filter(item => item.status === statusFilter)
        : searchResults;

    return (
        <DashboardLayout onLogout={handleLogout}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Cari Data Kegiatan</h2>
                                    <p className="text-gray-600 dark:text-gray-400">Cari semua data kegiatan (semua status termasuk diajukan/selesai) untuk dibatalkan</p>
                                    {/* Role Info */}
                                    <div className="mt-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            userRole === 'admin' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200' :
                                            userRole === 'ppk' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' :
                                            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200'
                                        }`}>
                                            Role: {userRole === 'admin' ? 'Administrator' : userRole === 'ppk' ? 'PPK' : 'User'}
                                            {userRole === 'admin' && ' - Dapat membatalkan semua kegiatan'}
                                            {userRole === 'ppk' && ' - Dapat membatalkan kegiatan yang menjadi tanggung jawab'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Stats Overview */}
                                {searchResults.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => setStatusFilter(statusFilter === '' ? '' : '')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === '' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            Semua ({stats.total})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'draft' ? '' : 'draft')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'draft' ? 'ring-2 ring-gray-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            📝 Draft ({stats.draft})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'diajukan' ? '' : 'diajukan')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'diajukan' ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            ⬆️ Diajukan ({stats.diajukan})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'disetujui' ? '' : 'disetujui')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'disetujui' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            ✅ Disetujui ({stats.approved})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'diketahui' ? '' : 'diketahui')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'diketahui' ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            👁️ Diketahui ({stats.diketahui})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'dikembalikan' ? '' : 'dikembalikan')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'dikembalikan' ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            ↩️ Dikembalikan ({stats.dikembalikan})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'selesai' ? '' : 'selesai')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'selesai' ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            ✓ Selesai ({stats.completed})
                                        </button>
                                        <button onClick={() => setStatusFilter(statusFilter === 'dibatalkan' ? '' : 'dibatalkan')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                statusFilter === 'dibatalkan' ? 'ring-2 ring-gray-500 bg-gray-300 dark:bg-gray-500 text-gray-800 dark:text-gray-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}>
                                            ✗ Dibatalkan ({stats.canceled})
                                        </button>
                                        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 self-center">
                                            Total: <span className="font-bold">{formatRupiah(stats.totalBudget)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className="mb-6">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ketik kata kunci: nama kegiatan, MAK, no. ST, lokasi, PPK, pembuat, status..."
                                        className="w-full pl-12 pr-40 py-3 text-base border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800 transition-all duration-200"
                                        disabled={isSearching}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="px-4 py-2.5 mr-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                            {filteredResults.length > 0 ? (
                                <>
                                    {/* Results Header */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                    Hasil Pencarian: <span className="text-blue-600 dark:text-blue-400">{searchTerm}</span>
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    Ditemukan <span className="font-bold text-gray-900 dark:text-gray-100">{filteredResults.length}</span>{statusFilter ? ` dari ${searchResults.length}` : ''} data • 
                                                    Total anggaran: <span className="font-bold text-green-600 dark:text-green-400">{formatRupiah(stats.totalBudget)}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date().toLocaleString('id-ID')}
                                                </div>
                                                <select
                                                    value={sortBy}
                                                    onChange={handleSortChange}
                                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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

                                    {/* Results Table */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">No</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Kegiatan</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Pembuat</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">MAK & Lokasi</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Tanggal Pelaksanaan</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Anggaran</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {filteredResults.map((item, index) => (
                                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">
                                                                {index + 1}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100 dark:border-gray-700">
                                                                <div className="flex flex-col gap-1">
                                                                    <StatusBadge status={item.status} no_st={item.no_st} tgl_st={item.tgl_st} />
                                                                    {item.no_st && (
                                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                            ST: <span className="font-medium dark:text-gray-200">{item.no_st}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.status_2 && item.status_2 !== item.status && (
                                                                        <div className="text-xs text-gray-400 dark:text-gray-500">
                                                                            status_2: {item.status_2}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <div>
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">{item.kegiatan || '-'}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        ID: {item.id}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100 dark:border-gray-700">
                                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                                    <div>User ID: {item.user_id || '-'}</div>
                                                                    <div className="mt-1 text-gray-400 dark:text-gray-500">Dibuat: {formatDate(item.createdAt)}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <div className="space-y-1">
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.mak || '-'}</div>
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400">{item.kota_kab_kecamatan || '-'}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        PPK: {item.ppk_nama || '-'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <div className="space-y-1">
                                                                    <div className="text-sm text-gray-900 dark:text-gray-100">
                                                                        {formatDate(item.rencana_tanggal_pelaksanaan)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        Dibuat: {formatDate(item.createdAt)}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700">
                                                                <div className="text-right">
                                                                    <div className="text-base font-bold text-green-700 dark:text-green-400">
                                                                        {formatRupiah(item.total_biaya)}
                                                                    </div>
                                                                    {item.total_biaya > 0 && (
                                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                            per kegiatan
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-center">
                                                                    {item.status !== 'dibatalkan' ? (
                                                                        canCancel ? (
                                                                            <button
                                                                                onClick={() => handleCancelKegiatan(item.id, item.kegiatan)}
                                                                                disabled={cancelingId === item.id}
                                                                                className="px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/30 text-red-700 dark:text-red-200 text-sm font-medium rounded-lg hover:from-red-100 hover:to-red-200 dark:hover:from-red-800/50 dark:hover:to-red-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center shadow-sm border border-red-200 dark:border-red-800"
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
                                                                                        Batalkan
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        ) : (
                                                                            <div className="text-xs text-gray-400 dark:text-gray-500 italic px-4 py-2">
                                                                                (Tidak ada akses)
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <div className="text-sm text-gray-500 dark:text-gray-400 italic px-4 py-2">
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
                                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-0">
                                                    Menampilkan <span className="font-medium">{filteredResults.length}</span>{statusFilter ? ` dari ${searchResults.length}` : ''} hasil
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    Total anggaran: <span className="font-bold text-green-700 dark:text-green-400">{formatRupiah(stats.totalBudget)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : searchTerm && !isSearching && searchResults.length === 0 ? (
                                // Empty State - No search results
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Tidak ditemukan hasil</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">Tidak ada data yang cocok dengan pencarian "{searchTerm}"</p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Hapus Pencarian
                                    </button>
                                </div>
                            ) : searchTerm && !isSearching && searchResults.length > 0 && filteredResults.length === 0 ? (
                                // Empty State - Status filter has no matches
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Tidak ada data dengan status ini</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">Tidak ada data dengan status tersebut dari pencarian "{searchTerm}". Coba pilih status lain.</p>
                                    <button
                                        onClick={() => setStatusFilter('')}
                                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                                    >
                                        Tampilkan Semua Status
                                    </button>
                                </div>
                            ) : !searchTerm && !isSearching ? (
                                // Initial State
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Masukkan kata kunci pencarian</h3>
                                    <p className="text-gray-600 dark:text-gray-400">Cari berdasarkan nama kegiatan, MAK, no. ST, lokasi, PPK, atau ID pembuat. Semua status ditampilkan termasuk yang sudah diajukan/selesai.</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
                    <div className="px-8 py-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                © {new Date().getFullYear()} Sistem Pencarian Kegiatan • Versi 1.0
                            </div>
                            <div className="flex gap-4 mt-2 md:mt-0">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Server: <span className="font-medium text-green-600 dark:text-green-400">Online</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Role: <span className="font-medium text-blue-600 dark:text-blue-400">{userRole.toUpperCase()}</span>
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