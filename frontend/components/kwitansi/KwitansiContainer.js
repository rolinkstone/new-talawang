// components/kwitansi/KwitansiContainer.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useSession } from 'next-auth/react';

import KwitansiInputModal from './KwitansiInputModal';
import KwitansiDetailModal from './KwitansiDetailModal';
import KwitansiPrint from './KwitansiPrint';
import NotificationModal from '../common/NotificationModal';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDateFn } from '../../utils/formatters';

const ITEMS_PER_PAGE = 5;

export default function KwitansiContainer() {
    const router = useRouter();
    const { data: session, status } = useSession();
    
    const [kegiatanList, setKegiatanList] = useState([]);
    const [filteredKegiatan, setFilteredKegiatan] = useState([]);
    const [expandedKegiatan, setExpandedKegiatan] = useState({});
    const [showInputModal, setShowInputModal] = useState(false);
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [selectedPegawai, setSelectedPegawai] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedKwitansi, setSelectedKwitansi] = useState(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printData, setPrintData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [userRole, setUserRole] = useState('');
    const [userType, setUserType] = useState({
        isAdmin: false,
        isPPK: false,
        isKabalai: false,
        isBendahara: false,
        isRegularUser: false
    });
    
    const formatRupiah = (number) => {
        if (number === undefined || number === null) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };
    
    useEffect(() => {
        if (session) {
            const userData = session.user || {};
            let roles = [];
            if (userData.role) {
                roles = Array.isArray(userData.role) ? userData.role : [userData.role];
            } else if (userData.roles && Array.isArray(userData.roles)) {
                roles = userData.roles;
            }
            if (roles.length > 0) {
                setUserRole(roles[0]);
            }
            const isAdmin = roles.some(role => role.toLowerCase() === 'admin');
            const isPPK = roles.some(role => role.toLowerCase() === 'ppk');
            const isKabalai = roles.some(role => role.toLowerCase() === 'kabalai');
            const isBendahara = roles.some(role => role.toLowerCase() === 'bendahara');
            
            setUserType({
                isAdmin,
                isPPK,
                isKabalai,
                isBendahara,
                isRegularUser: !isAdmin && !isPPK && !isKabalai && !isBendahara
            });
            
            console.log('📊 User Type Info:', {
                isAdmin,
                isPPK,
                isKabalai,
                isBendahara,
                isRegularUser: !isAdmin && !isPPK && !isKabalai && !isBendahara,
                roles
            });
        }
    }, [session]);
    
    const fetchNeedKwitansi = async () => {
        if (!session?.accessToken) return;
        
        try {
            console.log('🔄 Fetching need-kwitansi data...');
            const url = `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/need-kwitansi`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            console.log('📦 API Response:', res.data);
            
            if (res.data.success) {
                console.log(`✅ Total kegiatan: ${res.data.data.length}`);
                
                // Log detail pegawai per kegiatan untuk debugging
                res.data.data.forEach(kegiatan => {
                    console.log(`Kegiatan ID ${kegiatan.id}: ${kegiatan.kegiatan}`);
                    console.log(`  - Total pegawai: ${kegiatan.total_pegawai}`);
                    console.log(`  - Pegawai list: ${kegiatan.pegawai?.length || 0} items`);
                    if (kegiatan.pegawai && kegiatan.pegawai.length > 0) {
                        kegiatan.pegawai.forEach((p, idx) => {
                            console.log(`    [${idx + 1}] ${p.nama} (NIP: ${p.nip}) - Kwitansi: ${p.kwitansi_status}`);
                        });
                    } else {
                        console.log(`  ⚠️ Tidak ada pegawai untuk kegiatan ini!`);
                    }
                });
                
                setKegiatanList(res.data.data);
                setFilteredKegiatan(res.data.data);
                setCurrentPage(1);
                
                // Expand semua kegiatan secara default
                const expanded = {};
                res.data.data.forEach(k => {
                    expanded[k.id] = true;
                });
                setExpandedKegiatan(expanded);
            } else {
                console.error('API returned success=false:', res.data);
            }
        } catch (error) {
            console.error('❌ Error fetching need kwitansi:', error);
            console.error('Error details:', error.response?.data || error.message);
            setNotificationMessage('Gagal memuat data: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
        }
    };
    
    const refreshData = async () => {
        await fetchNeedKwitansi();
        setRefreshKey(prev => prev + 1);
    };
    
    useEffect(() => {
        if (session?.accessToken) {
            fetchNeedKwitansi();
        }
    }, [session]);
    
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredKegiatan(kegiatanList);
        } else {
            const filtered = kegiatanList.filter(kegiatan => 
                kegiatan.kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kegiatan.no_st?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kegiatan.mak?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kegiatan.kota_kab_kecamatan?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredKegiatan(filtered);
        }
        setCurrentPage(1);
    }, [searchTerm, kegiatanList]);
    
    useEffect(() => {
        setTotalPages(Math.ceil(filteredKegiatan.length / ITEMS_PER_PAGE));
    }, [filteredKegiatan]);
    
    const getCurrentPageItems = () => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredKegiatan.slice(startIndex, endIndex);
    };
    
    const paginatedKegiatan = getCurrentPageItems();
    
    const toggleExpand = (kegiatanId) => {
        setExpandedKegiatan(prev => ({
            ...prev,
            [kegiatanId]: !prev[kegiatanId]
        }));
    };
    
    const expandAll = () => {
        const expanded = {};
        paginatedKegiatan.forEach(k => {
            expanded[k.id] = true;
        });
        setExpandedKegiatan(expanded);
    };
    
    const collapseAll = () => {
        const expanded = {};
        paginatedKegiatan.forEach(k => {
            expanded[k.id] = false;
        });
        setExpandedKegiatan(expanded);
    };
    
    const handleInputKwitansi = (kegiatan, pegawai) => {
        setSelectedKegiatan(kegiatan);
        setSelectedPegawai(pegawai);
        setShowInputModal(true);
    };
    
    const handleDelete = async (kegiatanId, pegawaiId, kwitansiId) => {
        setItemToDelete({ kegiatanId, pegawaiId, kwitansiId });
        setConfirmDeleteModalOpen(true);
    };
    
    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setDeletingId(itemToDelete.kwitansiId);
        try {
            const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/${itemToDelete.kwitansiId}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            if (response.data.success) {
                setNotificationMessage('Kwitansi berhasil dihapus');
                setModalOpen(true);
                await refreshData();
                setConfirmDeleteModalOpen(false);
            } else {
                setNotificationMessage(response.data.message || 'Gagal menghapus');
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error deleting kwitansi:', error);
            setNotificationMessage('Gagal menghapus data');
            setModalOpen(true);
        } finally {
            setDeletingId(null);
            setItemToDelete(null);
        }
    };
    
    const fetchLatestKwitansi = async (kwitansiId) => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/${kwitansiId}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.error('Error fetching latest kwitansi:', error);
            return null;
        }
    };
    
    const handleViewDetail = async (pegawai, kegiatan) => {
        try {
            let latestKwitansi = null;
            
            if (pegawai.kwitansi_id) {
                latestKwitansi = await fetchLatestKwitansi(pegawai.kwitansi_id);
            }
            
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/detail`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            let detailPegawai = null;
            if (res.data.success && res.data.data.pegawai) {
                detailPegawai = res.data.data.pegawai.find(p => p.id === pegawai.id);
            }
            
            setSelectedKwitansi({
                ...pegawai,
                ...detailPegawai,
                ...(latestKwitansi || {}),
                nama_kegiatan: kegiatan.kegiatan,
                no_st: kegiatan.no_st,
                mak: kegiatan.mak,
                kota_kab_kecamatan: kegiatan.kota_kab_kecamatan,
                kwitansi_id: pegawai.kwitansi_id,
                status_ttd: latestKwitansi?.status_ttd || pegawai.status_ttd || 'belum',
                tgl_ttd: latestKwitansi?.tgl_ttd || pegawai.tgl_ttd,
                catatan_ttd: latestKwitansi?.catatan_ttd || pegawai.catatan_ttd
            });
        } catch (error) {
            console.error('Error fetching detail:', error);
            setSelectedKwitansi({
                ...pegawai,
                nama_kegiatan: kegiatan.kegiatan,
                no_st: kegiatan.no_st,
                mak: kegiatan.mak,
                kota_kab_kecamatan: kegiatan.kota_kab_kecamatan,
                status_ttd: pegawai.status_ttd || 'belum'
            });
        }
        setShowDetailModal(true);
    };
    
    const handlePrint = async (pegawai, kegiatan, kwitansiItem) => {
        try {
            let latestKwitansi = null;
            if (pegawai.kwitansi_id) {
                latestKwitansi = await fetchLatestKwitansi(pegawai.kwitansi_id);
            }
            
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/detail`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            let detailPegawai = null;
            let transportTotal = 0;
            let uangHarianTotal = 0;
            let penginapanTotal = 0;
            let transportDetail = [];
            let uangHarianDetail = [];
            let penginapanDetail = [];
            
            if (res.data.success && res.data.data.pegawai) {
                detailPegawai = res.data.data.pegawai.find(p => p.id === pegawai.id);
                
                if (detailPegawai?.biaya_list) {
                    transportTotal = detailPegawai.biaya_list.reduce((sum, b) => 
                        sum + (b.transportasi?.reduce((s, t) => s + (Number(t.total) || 0), 0) || 0), 0);
                    uangHarianTotal = detailPegawai.biaya_list.reduce((sum, b) => 
                        sum + (b.uang_harian?.reduce((s, u) => s + (Number(u.total) || 0), 0) || 0), 0);
                    penginapanTotal = detailPegawai.biaya_list.reduce((sum, b) => 
                        sum + (b.penginapan?.reduce((s, p) => s + (Number(p.total) || 0), 0) || 0), 0);
                    transportDetail = detailPegawai.biaya_list.flatMap(b => b.transportasi || []);
                    uangHarianDetail = detailPegawai.biaya_list.flatMap(b => b.uang_harian || []);
                    penginapanDetail = detailPegawai.biaya_list.flatMap(b => b.penginapan || []);
                }
            }
            
            const kwitansiData = latestKwitansi || kwitansiItem || { no_lpd: pegawai.no_lpd, id: pegawai.kwitansi_id };
            
            setPrintData({
                item: {
                    ...kwitansiData,
                    status_ttd: latestKwitansi?.status_ttd || pegawai.status_ttd || 'belum',
                    tgl_ttd: latestKwitansi?.tgl_ttd || pegawai.tgl_ttd,
                    catatan_ttd: latestKwitansi?.catatan_ttd || pegawai.catatan_ttd
                },
                kegiatan: kegiatan,
                pegawai: {
                    ...pegawai,
                    ...detailPegawai,
                    total_biaya: pegawai.total_biaya || 0,
                    transport_total: transportTotal,
                    uang_harian_total: uangHarianTotal,
                    penginapan_total: penginapanTotal,
                    transportasi_detail: transportDetail,
                    uang_harian_detail: uangHarianDetail,
                    penginapan_detail: penginapanDetail
                }
            });
            setShowPrintModal(true);
        } catch (error) {
            console.error('Error fetching print data:', error);
            setNotificationMessage('Gagal mengambil data untuk dicetak');
            setModalOpen(true);
        }
    };
    
    const closeModal = () => {
        setModalOpen(false);
        setShowDetailModal(false);
        setSelectedKwitansi(null);
        setShowInputModal(false);
        setShowPrintModal(false);
        setSelectedKegiatan(null);
        setSelectedPegawai(null);
        setPrintData(null);
        refreshData();
    };
    
    const closeConfirmModal = () => {
        setConfirmDeleteModalOpen(false);
        setItemToDelete(null);
        setDeletingId(null);
    };
    
    const goToPage = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const nextPage = () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    };
    
    const prevPage = () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    };
    
    if (status === 'loading') return <LoadingSpinner />;
    if (!session) return null;
    
    return (
        <div className="max-w-[95vw] mx-auto p-6 shadow-md rounded-lg overflow-x-auto" key={refreshKey}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">KWITANSI PERJALANAN DINAS</h2>
                    <p className="text-gray-600 mt-1">
                        User: {session.user?.name || session.user?.email || 'Unknown User'} | Role: {userRole || 'User'}
                        {userType.isAdmin && <span className="ml-2 text-blue-600">(Admin - Melihat Semua Data)</span>}
                        {!userType.isAdmin && <span className="ml-2 text-green-600">(Hanya Melihat Data Diri Sendiri)</span>}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">Input kwitansi untuk setiap pegawai yang melakukan perjalanan dinas</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={expandAll} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        Expand All
                    </button>
                    <button onClick={collapseAll} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        Collapse All
                    </button>
                    <button onClick={refreshData} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Refresh
                    </button>
                </div>
            </div>
            
            {/* Informasi role yang sedang aktif */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center text-sm">
                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-medium">Mode Akses:</span> 
                        {userType.isAdmin && ' Anda adalah Admin - dapat melihat dan mengelola semua data kwitansi.'}
                        {!userType.isAdmin && ' Anda adalah Pegawai - hanya dapat melihat dan menginput kwitansi untuk diri Anda sendiri.'}
                    </div>
                </div>
            </div>
            
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="Cari berdasarkan Nama Kegiatan, No ST, MAK, atau Lokasi..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            
            <div className="mb-4 flex justify-between items-center text-sm text-gray-600">
                <span>Menampilkan {paginatedKegiatan.length} dari {filteredKegiatan.length} kegiatan</span>
                <div className="flex gap-2">
                    <button onClick={prevPage} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100">Previous</button>
                    <span className="px-3 py-1">Halaman {currentPage} dari {totalPages || 1}</span>
                    <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100">Next</button>
                </div>
            </div>
            
            {paginatedKegiatan.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Belum ada kegiatan yang memerlukan input kwitansi.</p>
                    <p className="text-sm text-gray-400 mt-1">Setelah kegiatan selesai, Anda dapat menginput kwitansi di sini.</p>
                </div>
            ) : (
                paginatedKegiatan.map((kegiatan) => (
                    <div key={kegiatan.id} className="mb-4 border rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b cursor-pointer hover:bg-blue-100" onClick={() => toggleExpand(kegiatan.id)}>
                            <div className="flex items-center gap-2">
                                <svg className={`h-5 w-5 text-blue-600 transform transition-transform ${expandedKegiatan[kegiatan.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <h3 className="font-bold text-lg text-blue-900">{kegiatan.kegiatan}</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mt-2 ml-7">
                                <div><span className="font-medium">No ST:</span> {kegiatan.no_st || '-'}</div>
                                <div><span className="font-medium">MAK:</span> {kegiatan.mak}</div>
                                <div><span className="font-medium">Lokasi:</span> {kegiatan.kota_kab_kecamatan}</div>
                                <div><span className="font-medium">Progress:</span> <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">{kegiatan.sudah_input || 0} / {kegiatan.total_pegawai} sudah input</span></div>
                                <div><span className="font-medium">Status:</span> {kegiatan.sudah_input === kegiatan.total_pegawai ? <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Lengkap</span> : <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Belum Lengkap</span>}</div>
                            </div>
                            {/* Tampilkan jumlah pegawai yang tersedia */}
                            <div className="mt-2 ml-7 text-xs text-gray-500">
                                <span className="font-medium">ℹ️ Jumlah pegawai dalam kegiatan ini: {kegiatan.pegawai?.length || 0} orang</span>
                                {!userType.isAdmin && kegiatan.pegawai?.length === 1 && (
                                    <span className="ml-2 text-green-600">(Hanya menampilkan data Anda)</span>
                                )}
                            </div>
                        </div>
                        
                        {expandedKegiatan[kegiatan.id] && (
                            <div className="overflow-x-auto">
                                {kegiatan.pegawai && kegiatan.pegawai.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nama Pegawai</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">NIP</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Biaya</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status Kwitansi</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status TTD</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">No LPD</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tgl TTD</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">File</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {kegiatan.pegawai.map((pegawai, idx) => {
                                                const sudahInput = pegawai.kwitansi_status === 'sudah';
                                                return (
                                                    <tr key={pegawai.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-medium">{pegawai.nama}</td>
                                                        <td className="px-4 py-3">{pegawai.nip || '-'}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600">Rp {formatRupiah(pegawai.total_biaya)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {sudahInput ? 
                                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Sudah Input</span> : 
                                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">⊗ Belum Input</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {pegawai.status_ttd === 'sudah' ? (
                                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                                    ✓ Disetujui
                                                                </span>
                                                            ) : pegawai.status_ttd === 'ditolak' ? (
                                                                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                                                    ✗ Ditolak
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                                                    ⏳ Menunggu
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-medium text-blue-600">{pegawai.no_lpd || '-'}</td>
                                                        <td className="px-4 py-3 text-center text-xs">
                                                            {pegawai.tgl_ttd ? formatDateFn(pegawai.tgl_ttd) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {pegawai.upload_kwitansi ? 
                                                                <span className="text-green-600">✓ Ada</span> : 
                                                                <span className="text-gray-400">-</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex justify-center gap-2 flex-wrap">
                                                                {!sudahInput ? (
                                                                    <button onClick={() => handleInputKwitansi(kegiatan, pegawai)} className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">
                                                                        Input Kwitansi
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => handleViewDetail(pegawai, kegiatan)} className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                                                                            Detail
                                                                        </button>
                                                                        <button onClick={() => handlePrint(pegawai, kegiatan, { no_lpd: pegawai.no_lpd, id: pegawai.kwitansi_id })} className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">
                                                                            🖨️ Cetak
                                                                        </button>
                                                                        {userType.isAdmin && (
                                                                            <button onClick={() => handleDelete(kegiatan.id, pegawai.id, pegawai.kwitansi_id)} className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" disabled={deletingId === pegawai.kwitansi_id}>
                                                                                Hapus
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <svg className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <p>Tidak ada data pegawai untuk kegiatan ini.</p>
                                        <p className="text-sm mt-1">Pastikan kegiatan memiliki pegawai yang terdaftar.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
            
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                    <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Previous</button>
                    {[...Array(totalPages)].map((_, i) => <button key={i} onClick={() => goToPage(i + 1)} className={`px-3 py-1 rounded-md ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{i + 1}</button>)}
                    <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Next</button>
                </div>
            )}
            
            {showInputModal && selectedKegiatan && selectedPegawai && (
                <KwitansiInputModal 
                    kegiatan={selectedKegiatan} 
                    pegawai={selectedPegawai} 
                    onClose={closeModal} 
                    onSuccess={(message) => { 
                        setNotificationMessage(message); 
                        setModalOpen(true); 
                        refreshData(); 
                    }} 
                />
            )}
            
            {showDetailModal && selectedKwitansi && (
                <KwitansiDetailModal 
                    item={selectedKwitansi} 
                    onClose={closeModal} 
                    formatDateFn={formatDateFn} 
                    formatRupiah={formatRupiah}
                    onRefresh={refreshData}
                />
            )}
            
            {showPrintModal && printData && (
                <KwitansiPrint 
                    key={printData.item?.id + '_' + printData.item?.status_ttd}
                    item={printData.item} 
                    kegiatan={printData.kegiatan} 
                    pegawai={printData.pegawai} 
                    onClose={closeModal} 
                />
            )}
            
            <NotificationModal show={modalOpen} message={notificationMessage} onClose={closeModal} />
            <ConfirmDeleteModal 
                show={confirmDeleteModalOpen} 
                deletingId={deletingId} 
                itemToDelete={itemToDelete?.kwitansiId} 
                onClose={closeConfirmModal} 
                onConfirm={confirmDelete} 
            />
        </div>
    );
}