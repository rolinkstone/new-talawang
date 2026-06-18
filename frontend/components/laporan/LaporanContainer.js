// components/laporan/LaporanContainer.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useSession } from 'next-auth/react';

import FilterPanel from './FilterPanel';
import LaporanTable from './LaporanTable';
import DetailModal from './DetailModal';
import SummaryCards from './SummaryCards';
import ChartView from './ChartView';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatRupiah } from '../../utils/formatters';

export default function LaporanContainer({ session: propSession, status: propStatus }) {
    const router = useRouter();
    const { data: session, status } = useSession();
    
    // State untuk data
    const [laporanData, setLaporanData] = useState([]);
    const [detailPerjalanan, setDetailPerjalanan] = useState([]);
    const [summary, setSummary] = useState(null);
    const [options, setOptions] = useState({ pegawai: [], tahun: [], status_2: [], jenis_spm: [] });
    
    // State untuk loading
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [optionsLoading, setOptionsLoading] = useState(true);
    
    // State untuk filter
    const [filters, setFilters] = useState({
        tahun: new Date().getFullYear(),
        bulan: 'all',
        pegawai_id: 'all',
        status_2: 'selesai',
        jenis_spm: 'LS'
    });
    
    // State untuk modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPegawai, setSelectedPegawai] = useState(null);
    const [pegawaiDetail, setPegawaiDetail] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    
    // State untuk view
    const [viewType, setViewType] = useState('table');
    const [showFilters, setShowFilters] = useState(true);
    
    // State untuk notifikasi
    const [notificationMessage, setNotificationMessage] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    
    // State untuk user role
    const [userRole, setUserRole] = useState('');
    const [userType, setUserType] = useState({
        isAdmin: false,
        isPPK: false,
        isKabalai: false,
        isKabagTu: false,
        isBendahara: false,
        isRegularUser: false
    });
    
    // ============ PERBAIKAN: Fungsi cek role Kabag TU ============
    const hasKabagTuRole = () => {
        if (!session?.user) return false;
        
        if (session.user.roles) {
            const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
            if (roles.some(r => r.toLowerCase().includes('kabag_tu'))) return true;
        }
        if (session.user.role && session.user.role.toLowerCase().includes('kabag_tu')) return true;
        return false;
    };
    
    const hasKepalaBalaiRole = () => {
        if (!session?.user) return false;
        if (session.user.roles) {
            const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
            if (roles.some(r => r.toLowerCase().includes('kabalai') || r.toLowerCase().includes('kepala balai'))) return true;
        }
        const roleLower = session.user.role?.toLowerCase() || '';
        if (roleLower.includes('kabalai') || roleLower.includes('kepala balai')) return true;
        return false;
    };
    
    const hasAdminRole = () => {
        if (!session?.user) return false;
        if (session.user.roles) {
            const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
            if (roles.some(r => r.toLowerCase().includes('admin'))) return true;
        }
        if (session.user.role && session.user.role.toLowerCase().includes('admin')) return true;
        return false;
    };
    
    // ============ PERBAIKAN: Cek akses laporan untuk Admin, Kabag TU, atau Kabalai ============
    const canAccessLaporan = () => {
        return hasAdminRole() || hasKabagTuRole() || hasKepalaBalaiRole();
    };
    
    // Cek akses user
    useEffect(() => {
        if (session) {
            const userData = session.user || {};
            let roles = [];
            if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0) {
                roles = userData.roles;
            } else if (userData.role) {
                roles = Array.isArray(userData.role) ? userData.role : [userData.role];
            }
            if (roles.length > 0) {
                setUserRole(roles[0]);
            }
            
            const isAdmin = roles.some(role => role.toLowerCase() === 'admin');
            const isPPK = roles.some(role => role.toLowerCase() === 'ppk');
            const isKabalai = roles.some(role => role.toLowerCase() === 'kabalai' || role.toLowerCase().includes('kepala balai'));
            const isKabagTu = roles.some(role => role.toLowerCase() === 'kabag_tu');
            const isBendahara = roles.some(role => role.toLowerCase() === 'bendahara');
            
            setUserType({
                isAdmin,
                isPPK,
                isKabalai,
                isKabagTu,
                isBendahara,
                isRegularUser: !isAdmin && !isPPK && !isKabalai && !isKabagTu && !isBendahara
            });
            
            console.log('📊 User Type Info:', {
                isAdmin,
                isPPK,
                isKabalai,
                isKabagTu,
                isBendahara,
                roles
            });
        }
    }, [session]);
    
    // Fetch options untuk filter
    const fetchOptions = async () => {
        if (!session?.accessToken) {
            console.log('No access token yet, waiting...');
            return;
        }
        
        setOptionsLoading(true);
        try {
            console.log('🔄 Fetching options from:', `${process.env.NEXT_PUBLIC_API_URL}/laporan/options`);
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/laporan/options`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            console.log('📦 Options API Response:', response.data);
            
            if (response.data.success) {
                setOptions(response.data.data);
                
                // Set default tahun ke tahun terbaru
                if (response.data.data.tahun && response.data.data.tahun.length > 0) {
                    setFilters(prev => ({ ...prev, tahun: response.data.data.tahun[0] }));
                }
            } else {
                console.error('Options API returned success=false:', response.data);
                setOptions({
                    pegawai: [],
                    tahun: [new Date().getFullYear()],
                    status_2: ['selesai'],
                    jenis_spm: ['LS']
                });
            }
        } catch (error) {
            console.error('❌ Error fetching options:', error);
            setNotificationMessage('Gagal memuat data filter: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
            setOptions({
                pegawai: [],
                tahun: [new Date().getFullYear()],
                status_2: ['selesai'],
                jenis_spm: ['LS']
            });
        } finally {
            setOptionsLoading(false);
        }
    };
    
    // Fetch laporan data
    const fetchLaporan = async () => {
        if (!session?.accessToken) {
            console.log('No access token yet, waiting...');
            return;
        }
        
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.tahun) params.append('tahun', filters.tahun);
            if (filters.bulan && filters.bulan !== 'all') params.append('bulan', filters.bulan);
            if (filters.pegawai_id && filters.pegawai_id !== 'all') params.append('pegawai_id', filters.pegawai_id);
            if (filters.status_2 && filters.status_2 !== 'all') params.append('status_2', filters.status_2);
            if (filters.jenis_spm && filters.jenis_spm !== 'all') params.append('jenis_spm', filters.jenis_spm);
            
            const url = `${process.env.NEXT_PUBLIC_API_URL}/laporan/rekap-pegawai?${params.toString()}`;
            console.log('🔄 Fetching laporan from:', url);
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            console.log('📦 Laporan API Response:', response.data);
            
            if (response.data.success) {
                setLaporanData(response.data.data || []);
                setDetailPerjalanan(response.data.detail_perjalanan || []);
                setSummary(response.data.summary);
                console.log(`✅ Laporan loaded: ${response.data.data?.length || 0} pegawai`);
            } else {
                console.error('Laporan API returned success=false:', response.data);
                setNotificationMessage(response.data.message || 'Gagal memuat data laporan');
                setModalOpen(true);
                setLaporanData([]);
                setDetailPerjalanan([]);
                setSummary(null);
            }
        } catch (error) {
            console.error('❌ Error fetching laporan:', error);
            setNotificationMessage('Gagal memuat data laporan: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
            setLaporanData([]);
            setDetailPerjalanan([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch detail pegawai untuk modal
    const fetchPegawaiDetail = async (pegawaiId) => {
        if (!session?.accessToken) return;
        
        setModalLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.tahun) params.append('tahun', filters.tahun);
            if (filters.status_2 && filters.status_2 !== 'all') params.append('status_2', filters.status_2);
            if (filters.jenis_spm && filters.jenis_spm !== 'all') params.append('jenis_spm', filters.jenis_spm);
            
            const url = `${process.env.NEXT_PUBLIC_API_URL}/laporan/pegawai/${pegawaiId}?${params.toString()}`;
            console.log(`🔍 Fetching pegawai detail from: ${url}`);
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            if (response.data.success) {
                setPegawaiDetail(response.data.data);
                console.log(`✅ Pegawai detail loaded for ID: ${pegawaiId}`);
            } else {
                console.error('Failed to fetch pegawai detail:', response.data);
                setNotificationMessage(response.data.message || 'Gagal memuat detail pegawai');
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching pegawai detail:', error);
            setNotificationMessage('Gagal memuat detail pegawai: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
        } finally {
            setModalLoading(false);
        }
    };
    
    // Export CSV
    const handleExportCSV = async () => {
        if (!session?.accessToken) return;
        
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (filters.tahun) params.append('tahun', filters.tahun);
            if (filters.bulan && filters.bulan !== 'all') params.append('bulan', filters.bulan);
            if (filters.status_2 && filters.status_2 !== 'all') params.append('status_2', filters.status_2);
            if (filters.jenis_spm && filters.jenis_spm !== 'all') params.append('jenis_spm', filters.jenis_spm);
            
            const url = `${process.env.NEXT_PUBLIC_API_URL}/laporan/export/csv?${params.toString()}`;
            console.log('📥 Exporting CSV from:', url);
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'text/csv' });
            const link = document.createElement('a');
            const downloadUrl = window.URL.createObjectURL(blob);
            link.href = downloadUrl;
            link.download = `laporan_perjadin_${filters.tahun}_${filters.bulan !== 'all' ? filters.bulan : 'semua'}_${filters.jenis_spm || 'LS'}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            setNotificationMessage('Export CSV berhasil');
            setModalOpen(true);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            setNotificationMessage('Gagal mengexport data: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
        } finally {
            setExporting(false);
        }
    };
    
    // Handle print
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setNotificationMessage('Popup diblokir. Izinkan popup untuk mencetak.');
            setModalOpen(true);
            return;
        }
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Laporan Perjalanan Dinas Pegawai</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .summary { margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
                        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px; }
                        .summary-item { text-align: center; padding: 10px; background: #fff; border-radius: 5px; }
                        .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #666; }
                        @media print {
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>LAPORAN PERJALANAN DINAS PEGAWAI</h1>
                    <div class="summary">
                        <p><strong>Periode:</strong> ${filters.tahun} ${filters.bulan !== 'all' ? `- Bulan ${getBulanName(filters.bulan)}` : '(Semua Bulan)'}</p>
                        <p><strong>Status SPM:</strong> ${filters.status_2 === 'all' ? 'Semua' : filters.status_2}</p>
                        <p><strong>Jenis SPM:</strong> ${filters.jenis_spm === 'all' ? 'Semua' : filters.jenis_spm}</p>
                        <div class="summary-grid">
                            <div class="summary-item"><strong>Total Pegawai:</strong><br/>${summary?.total_pegawai || 0}</div>
                            <div class="summary-item"><strong>Total Perjalanan:</strong><br/>${summary?.total_perjalanan || 0}</div>
                            <div class="summary-item"><strong>Total Uang Harian:</strong><br/>Rp ${formatRupiah(summary?.total_uang_harian || 0)}</div>
                            <div class="summary-item"><strong>Total Transport Lokal:</strong><br/>Rp ${formatRupiah(summary?.total_transport || 0)}</div>
                            <div class="summary-item"><strong>Total Keseluruhan:</strong><br/>Rp ${formatRupiah(summary?.total_keseluruhan || 0)}</div>
                        </div>
                    </div>
                    ${generatePrintTable()}
                    <div class="footer">
                        <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
                        <p>Dicetak oleh: ${session?.user?.name || session?.user?.email || 'User'}</p>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };
    
    const getBulanName = (bulan) => {
        const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return bulanNames[parseInt(bulan) - 1] || bulan;
    };
    
    const generatePrintTable = () => {
        if (laporanData.length === 0) return '<p>Tidak ada data</p>';
        
        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">No</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nama Pegawai</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">NIP</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pangkat</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Jabatan</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Jml Perjalanan</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total UH</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total Transport</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total Keseluruhan</th>
                    </tr>
                </thead>
                <tbody>
                    ${laporanData.map((item, idx) => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.pegawai_nama || '-'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.pegawai_nip || '-'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.pegawai_pangkat || '-'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.pegawai_jabatan || '-'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.jumlah_perjalanan || 0}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rp ${formatRupiah(item.total_uang_harian || 0)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rp ${formatRupiah(item.total_transport || 0)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Rp ${formatRupiah(item.total_keseluruhan || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f2f2f2; font-weight: bold;">
                        <td colspan="5" style="border: 1px solid #ddd; padding: 8px; text-align: right;">TOTAL</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${laporanData.reduce((sum, item) => sum + (item.jumlah_perjalanan || 0), 0)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rp ${formatRupiah(laporanData.reduce((sum, item) => sum + (item.total_uang_harian || 0), 0))}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rp ${formatRupiah(laporanData.reduce((sum, item) => sum + (item.total_transport || 0), 0))}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rp ${formatRupiah(laporanData.reduce((sum, item) => sum + (item.total_keseluruhan || 0), 0))}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    };
    
    // Handle view detail
    const handleViewDetail = (pegawai) => {
        setSelectedPegawai(pegawai);
        fetchPegawaiDetail(pegawai.pegawai_id);
        setShowDetailModal(true);
    };
    
    // Handle reset filter
    const handleResetFilter = () => {
        setFilters({
            tahun: options.tahun?.[0] || new Date().getFullYear(),
            bulan: 'all',
            pegawai_id: 'all',
            status_2: 'selesai',
            jenis_spm: 'LS'
        });
    };
    
    // Refresh data
    const refreshData = async () => {
        await fetchOptions();
        await fetchLaporan();
    };
    
    // Initial load
    useEffect(() => {
        if (session?.accessToken) {
            fetchOptions();
        }
    }, [session?.accessToken]);
    
    // Fetch laporan when filters change or options are loaded
    useEffect(() => {
        if (session?.accessToken && options.tahun && options.tahun.length > 0) {
            fetchLaporan();
        }
    }, [filters, session?.accessToken, options.tahun]);
    
    // ============ PERBAIKAN: Cek akses laporan ============
    const hasAccess = canAccessLaporan();
    
    if (status === 'loading' || optionsLoading) {
        return <LoadingSpinner />;
    }
    
    if (!session) {
        return null;
    }
    
    // ============ PERBAIKAN: Pesan akses ditolak dengan role Kabag TU ============
    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-2">Akses Ditolak</h2>
                    <p className="text-gray-600">
                        Halaman ini hanya dapat diakses oleh <strong>Admin, Kabag TU, dan Kepala Balai</strong>.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Role Anda: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{userRole || 'Tidak diketahui'}</span>
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="max-w-[95vw] mx-auto p-6 shadow-md rounded-lg overflow-x-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">LAPORAN PERJALANAN DINAS PEGAWAI</h2>
                    <p className="text-gray-600 mt-1">
                        User: {session.user?.name || session.user?.email || 'Unknown User'} | Role: {userRole || 'User'}
                        {userType.isAdmin && <span className="ml-2 text-blue-600">(Admin - Melihat Semua Data)</span>}
                        {userType.isKabagTu && <span className="ml-2 text-teal-600">(Kabag TU - Laporan Perjadin)</span>}
                        {userType.isKabalai && <span className="ml-2 text-purple-600">(Kepala Balai - Laporan Perjadin)</span>}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Rekapitulasi perjalanan dinas per pegawai (Uang Harian + Transport Lokal)
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                    </button>
                    
                    <button 
                        onClick={handleExportCSV} 
                        disabled={exporting || laporanData.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {exporting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                        Export CSV
                    </button>
                    
                    <button 
                        onClick={handlePrint} 
                        disabled={laporanData.length === 0}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                    
                    <button 
                        onClick={refreshData} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
            
            {/* Info Box */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center text-sm">
                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-medium">Informasi Laporan:</span>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-xs">Data berdasarkan status SPM yang sudah selesai (status_2)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="text-xs">Transport lokal berdasarkan MAK 524113 / 524119</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Summary Cards */}
            {summary && summary.total_pegawai > 0 && (
                <SummaryCards summary={summary} filters={filters} formatRupiah={formatRupiah} />
            )}
            
            {/* Filter Panel */}
            {showFilters && (
                <FilterPanel
                    filters={filters}
                    setFilters={setFilters}
                    options={options}
                    onReset={handleResetFilter}
                />
            )}
            
            {/* View Toggle */}
            {laporanData.length > 0 && (
                <div className="mb-4 flex justify-end gap-2">
                    <button
                        onClick={() => setViewType('table')}
                        className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                            viewType === 'table' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Tabel
                    </button>
                    <button
                        onClick={() => setViewType('chart')}
                        className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                            viewType === 'chart' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Grafik
                    </button>
                </div>
            )}
            
            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : laporanData.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <svg className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">Tidak ada data laporan</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Tidak ditemukan data perjalanan dinas untuk periode yang dipilih.
                    </p>
                    <p className="text-sm text-gray-400">
                        Pastikan ada kegiatan dengan status "selesai" dan status_2 sesuai filter.
                    </p>
                </div>
            ) : viewType === 'table' ? (
                <LaporanTable 
                    data={laporanData} 
                    onViewDetail={handleViewDetail} 
                    formatRupiah={formatRupiah}
                />
            ) : (
                <ChartView 
                    data={laporanData} 
                    formatRupiah={formatRupiah}
                />
            )}
            
            {/* Detail Modal */}
            {showDetailModal && selectedPegawai && (
                <DetailModal
                    isOpen={showDetailModal}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedPegawai(null);
                        setPegawaiDetail(null);
                    }}
                    pegawai={selectedPegawai}
                    detail={pegawaiDetail}
                    loading={modalLoading}
                    formatRupiah={formatRupiah}
                />
            )}
            
            {/* Notification Modal */}
            <NotificationModal 
                show={modalOpen} 
                message={notificationMessage} 
                onClose={() => setModalOpen(false)} 
            />
        </div>
    );
}