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
import { formatDateForDisplay } from '../../utils/formatters';

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
    const [exportingXlsx, setExportingXlsx] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Tab state
    const [activeTab, setActiveTab] = useState('diri_sendiri');
    
    const [userRole, setUserRole] = useState('');
    const [userType, setUserType] = useState({
        isAdmin: false,
        isPPK: false,
        isKabalai: false,
        isBendahara: false,
        isRegularUser: false,
        isCreator: false
    });
    
    // Data user login
    const [currentUserNip, setCurrentUserNip] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');
    const [currentUserName, setCurrentUserName] = useState('');
    const [currentUserUsername, setCurrentUserUsername] = useState('');
    
    const formatRupiah = (number) => {
        if (number === undefined || number === null) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };

    // Badge pembeda Jenis SPM (LS/KKP)
    const renderJenisSpmBadge = (kegiatan) => {
        const jenis = String(kegiatan?.jenis_spm || '').toUpperCase();
        if (jenis === 'KKP') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300 dark:border-purple-700" title="KKP (Kartu Kredit Pemerintah) - Transport saja">
                    KKP
                </span>
            );
        }
        if (jenis === 'LS') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700" title="LS (Langsung)">
                    LS
                </span>
            );
        }
        return <span className="text-xs text-gray-400">-</span>;
    };
    
    const getApprovalBadge = (status) => {
        switch (status) {
            case 'sudah': return <span className="w-3 h-3 rounded-full bg-green-500" title="Disetujui"></span>;
            case 'ditolak': return <span className="w-3 h-3 rounded-full bg-red-500" title="Ditolak - Perlu Edit"></span>;
            default: return <span className="w-3 h-3 rounded-full bg-yellow-500" title="Menunggu"></span>;
        }
    };
    
    const normalizeNip = (nip) => {
        if (!nip) return '';
        return String(nip).replace(/\s/g, '');
    };

    // Helper untuk mencocokkan NIP secara fleksibel
    const matchNip = (nip1, nip2) => {
        if (!nip1 || !nip2) return false;
        const a = normalizeNip(nip1);
        const b = normalizeNip(nip2);
        if (a === b) return true;
        if (a.length > 0 && b.length > 0) {
            if (a.includes(b) || b.includes(a)) return true;
        }
        return false;
    };
    
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
            const isKabalai = roles.some(role => role.toLowerCase() === 'kabalai');
            const isBendahara = roles.some(role => role.toLowerCase() === 'bendahara');
            
            setUserType({
                isAdmin,
                isPPK,
                isKabalai,
                isBendahara,
                isRegularUser: !isAdmin && !isPPK && !isKabalai && !isBendahara,
                isCreator: false
            });
            
            const userNip = userData.nip || userData.username || '';
            const userId = userData.id || userData.userId || '';
            setCurrentUserNip(normalizeNip(userNip));
            setCurrentUserId(userId);
            setCurrentUserName(userData.name || userData.email || 'User');
            setCurrentUserUsername(normalizeNip(userData.username || ''));
            
            console.log('📊 User Type Info:', {
                isAdmin,
                isPPK,
                isKabalai,
                isBendahara,
                isRegularUser: !isAdmin && !isPPK && !isKabalai && !isBendahara,
                roles,
                userNip: currentUserNip,
                userId: currentUserId,
                userName: currentUserName
            });
        }
    }, [session]);
    
    // Filter data untuk tab Diri Sendiri
    const filterSelfData = (data) => {
        if (!data || data.length === 0) return [];
        
        const filtered = data.filter(kegiatan => {
            const hasCurrentUser = kegiatan.pegawai?.some(p => p.isCurrentUser === true);
            return hasCurrentUser;
        }).map(kegiatan => {
            const currentUserPegawai = kegiatan.pegawai?.filter(p => p.isCurrentUser === true);
            
            return {
                ...kegiatan,
                pegawai: currentUserPegawai,
                semua_pegawai_approve: currentUserPegawai?.every(p => p.status_pegawai === 'sudah') || false,
                semua_ppk_approve: currentUserPegawai?.every(p => p.status_ppk === 'sudah') || false,
                semua_bendahara_approve: currentUserPegawai?.every(p => p.status_bendahara === 'sudah') || false
            };
        });
        
        console.log(`👤 Tab "Diri Sendiri": ${filtered.length} kegiatan`);
        return filtered;
    };
    
    // Filter data untuk tab Pegawai Lain (hanya untuk creator kegiatan)
    const filterOtherData = (data) => {
        if (!data || data.length === 0) return [];
        
        const filtered = data.filter(kegiatan => {
            const isCreatorKegiatan = kegiatan.user_id === currentUserId;
            const hasOtherPegawai = kegiatan.pegawai?.some(p => p.isCurrentUser !== true);
            return isCreatorKegiatan && hasOtherPegawai;
        }).map(kegiatan => {
            const otherPegawai = kegiatan.pegawai?.filter(p => p.isCurrentUser !== true);
            return {
                ...kegiatan,
                pegawai: otherPegawai,
                isCreator: true
            };
        });
        
        console.log(`👥 Tab "Pegawai Lain": ${filtered.length} kegiatan`);
        return filtered;
    };
    
    const filterPpkApprovalData = (data) => {
        if (!data || data.length === 0) return [];
        
        const filtered = data.filter(kegiatan => {
            const hasWaitingPpk = kegiatan.pegawai?.some(p => 
                p.status_ppk === 'belum' && 
                p.status_pegawai === 'sudah'
            );
            
            if (hasWaitingPpk) {
                console.log(`📋 Kegiatan ${kegiatan.id} memiliki kwitansi yang menunggu PPK`);
                const waitingPegawai = kegiatan.pegawai?.filter(p => 
                    p.status_ppk === 'belum' && p.status_pegawai === 'sudah'
                );
                waitingPegawai.forEach(p => {
                    console.log(`   - Pegawai: ${p.nama}, status_pegawai=${p.status_pegawai}, status_ppk=${p.status_ppk}`);
                });
            }
            
            return hasWaitingPpk;
        }).map(kegiatan => {
            const waitingPegawai = kegiatan.pegawai?.filter(p => 
                p.status_ppk === 'belum' && 
                p.status_pegawai === 'sudah'
            ) || [];
            return {
                ...kegiatan,
                pegawai: waitingPegawai,
                semua_pegawai_approve: waitingPegawai.every(p => p.status_pegawai === 'sudah') || false,
                semua_ppk_approve: waitingPegawai.every(p => p.status_ppk === 'sudah') || false,
                semua_bendahara_approve: waitingPegawai.every(p => p.status_bendahara === 'sudah') || false
            };
        });
        
        console.log(`📋 Tab "Persetujuan PPK": ${filtered.length} kegiatan ditemukan`);
        return filtered;
    };
    
    const filterPpkHistoryData = (data) => {
        if (!data || data.length === 0) return [];
        
        const filtered = data.filter(kegiatan => {
            const hasApprovedPpk = kegiatan.pegawai?.some(p => p.status_ppk === 'sudah');
            return hasApprovedPpk;
        }).map(kegiatan => {
            const pegawai = kegiatan.pegawai || [];
            return {
                ...kegiatan,
                pegawai,
                semua_pegawai_approve: pegawai.every(p => p.status_pegawai === 'sudah') || false,
                semua_ppk_approve: pegawai.every(p => p.status_ppk === 'sudah') || false,
                semua_bendahara_approve: pegawai.every(p => p.status_bendahara === 'sudah') || false
            };
        });
        
        console.log(`📜 Tab "Riwayat PPK": ${filtered.length} kegiatan`);
        return filtered;
    };
    
    // ============ FILTER UNTUK BENDAHARA ============
    const filterBendaharaApprovalData = (data) => {
        if (!data || data.length === 0) return [];
        
        console.log('🔍 Filtering Bendahara Approval Data...');
        
        const filtered = data.filter(kegiatan => {
            const hasWaitingBendahara = kegiatan.pegawai?.some(p => 
                p.status_bendahara === 'belum' && 
                p.status_pegawai === 'sudah' &&
                p.status_ppk === 'sudah'
            );
            
            if (hasWaitingBendahara) {
                console.log(`💰 Kegiatan ${kegiatan.id} memiliki kwitansi yang menunggu Bendahara`);
                const waitingPegawai = kegiatan.pegawai?.filter(p => 
                    p.status_bendahara === 'belum' && 
                    p.status_pegawai === 'sudah' &&
                    p.status_ppk === 'sudah'
                );
                waitingPegawai.forEach(p => {
                    console.log(`   - Pegawai: ${p.nama}, status_pegawai=${p.status_pegawai}, status_ppk=${p.status_ppk}, status_bendahara=${p.status_bendahara}`);
                });
            }
            
            return hasWaitingBendahara;
        }).map(kegiatan => {
            const waitingPegawai = kegiatan.pegawai?.filter(p => 
                p.status_bendahara === 'belum' && 
                p.status_pegawai === 'sudah' &&
                p.status_ppk === 'sudah'
            ) || [];
            return {
                ...kegiatan,
                pegawai: waitingPegawai,
                semua_pegawai_approve: waitingPegawai.every(p => p.status_pegawai === 'sudah') || false,
                semua_ppk_approve: waitingPegawai.every(p => p.status_ppk === 'sudah') || false,
                semua_bendahara_approve: waitingPegawai.every(p => p.status_bendahara === 'sudah') || false
            };
        });
        
        console.log(`💰 Tab "Persetujuan Bendahara": ${filtered.length} kegiatan ditemukan`);
        return filtered;
    };
    
    const filterBendaharaHistoryData = (data) => {
        if (!data || data.length === 0) return [];
        
        const filtered = data.filter(kegiatan => {
            const hasApprovedBendahara = kegiatan.pegawai?.some(p => p.status_bendahara === 'sudah');
            return hasApprovedBendahara;
        }).map(kegiatan => {
            const pegawai = kegiatan.pegawai?.filter(p => p.status_bendahara === 'sudah') || [];
            return {
                ...kegiatan,
                pegawai,
                semua_pegawai_approve: pegawai.every(p => p.status_pegawai === 'sudah') || false,
                semua_ppk_approve: pegawai.every(p => p.status_ppk === 'sudah') || false,
                semua_bendahara_approve: pegawai.every(p => p.status_bendahara === 'sudah') || false
            };
        });
        
        console.log(`📜 Tab "Riwayat Bendahara": ${filtered.length} kegiatan`);
        return filtered;
    };
    
    const filterDataByTab = (data, tab) => {
        if (!data || data.length === 0) {
            setFilteredKegiatan([]);
            return;
        }
        
        let filtered = [];
        
        if (tab === 'diri_sendiri') {
            filtered = filterSelfData(data);
        } else if (tab === 'pegawai_lain') {
            filtered = filterOtherData(data);
        } else if (tab === 'persetujuan_ppk') {
            filtered = filterPpkApprovalData(data);
        } else if (tab === 'riwayat_ppk') {
            filtered = filterPpkHistoryData(data);
        } else if (tab === 'persetujuan_bendahara') {
            filtered = filterBendaharaApprovalData(data);
        } else if (tab === 'riwayat_bendahara') {
            filtered = filterBendaharaHistoryData(data);
        }
        
        setFilteredKegiatan(filtered);
        
        const expanded = {};
        filtered.forEach(k => {
            if (k && k.id) {
                expanded[k.id] = true;
            }
        });
        setExpandedKegiatan(expanded);
    };
    
    const fetchNeedKwitansi = async () => {
        if (!session?.accessToken) return;
        
        try {
            let url = `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/need-kwitansi`;
            
            if (activeTab === 'riwayat_ppk') {
                url = `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/need-kwitansi-ppk-history`;
            } else if (activeTab === 'riwayat_bendahara') {
                url = `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/need-kwitansi-bendahara-history`;
            }
            
            console.log('🔄 Fetching need-kwitansi data from:', url);
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            console.log('📦 API Response:', res.data);
            
            if (res.data.success) {
                console.log(`✅ Total kegiatan: ${res.data.data.length}`);
                
                const processedData = res.data.data.map(kegiatan => {
                    const pegawaiList = kegiatan.pegawai || [];
                    
                    const pegawaiWithFlag = pegawaiList.map(pegawai => {
                        const isCurrentUser = matchNip(pegawai.nip, currentUserNip) ||
                                              matchNip(pegawai.nip, currentUserUsername);
                        return {
                            ...pegawai,
                            isCurrentUser: isCurrentUser
                        };
                    });
                    
                    const isCreatorKegiatan = kegiatan.user_id === currentUserId;
                    
                    return {
                        ...kegiatan,
                        pegawai: pegawaiWithFlag,
                        isCreator: isCreatorKegiatan
                    };
                });
                
                const hasCreatorAccess = processedData.some(k => k.isCreator === true);
                setUserType(prev => ({
                    ...prev,
                    isCreator: hasCreatorAccess
                }));
                
                setKegiatanList(processedData);
                filterDataByTab(processedData, activeTab);
                setCurrentPage(1);
            } else {
                console.error('API returned success=false:', res.data);
            }
        } catch (error) {
            console.error('❌ Error fetching need kwitansi:', error);
            setNotificationMessage('Gagal memuat data: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
        }
    };
    
    const refreshData = async () => {
        await fetchNeedKwitansi();
        setRefreshKey(prev => prev + 1);
    };

    // Export XLSX gabungan Nominatif + LPD + Kwitansi (khusus Admin)
    const handleExportXlsx = async () => {
        if (!session?.accessToken) return;
        if (!userType.isAdmin) {
            setNotificationMessage('Export XLSX hanya dapat dilakukan oleh Admin');
            setModalOpen(true);
            return;
        }

        setExportingXlsx(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/export-xlsx`, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
                responseType: 'blob',
                timeout: 120000
            });

            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rekap_nominatif_lpd_kwitansi_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setNotificationMessage('Export XLSX berhasil');
            setModalOpen(true);
        } catch (error) {
            console.error('Error exporting XLSX:', error);
            let msg = 'Gagal mengexport XLSX. Silakan coba lagi.';
            if (error.response?.status === 403) {
                msg = error.response.data?.message || 'Anda tidak memiliki akses untuk export XLSX';
            }
            setNotificationMessage(msg);
            setModalOpen(true);
        } finally {
            setExportingXlsx(false);
        }
    };

    useEffect(() => {
        if (session?.accessToken && (currentUserNip || currentUserUsername)) {
            fetchNeedKwitansi();
        }
    }, [session, currentUserNip, currentUserUsername, activeTab]);
    
    useEffect(() => {
        if (kegiatanList.length > 0) {
            filterDataByTab(kegiatanList, activeTab);
        }
    }, [activeTab]);
    
    useEffect(() => {
        if (!searchTerm.trim()) {
            if (kegiatanList.length > 0) {
                filterDataByTab(kegiatanList, activeTab);
            }
        } else {
            const filtered = kegiatanList.filter(kegiatan => 
                kegiatan.kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kegiatan.no_st?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kegiatan.mak?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kegiatan.kota_kab_kecamatan?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            let result = [];
            if (activeTab === 'diri_sendiri') {
                result = filterSelfData(filtered);
            } else if (activeTab === 'pegawai_lain') {
                result = filterOtherData(filtered);
            } else if (activeTab === 'persetujuan_ppk') {
                result = filterPpkApprovalData(filtered);
            } else if (activeTab === 'riwayat_ppk') {
                result = filterPpkHistoryData(filtered);
            } else if (activeTab === 'persetujuan_bendahara') {
                result = filterBendaharaApprovalData(filtered);
            } else if (activeTab === 'riwayat_bendahara') {
                result = filterBendaharaHistoryData(filtered);
            }
            setFilteredKegiatan(result);
            
            const expanded = {};
            result.forEach(k => {
                if (k && k.id) {
                    expanded[k.id] = true;
                }
            });
            setExpandedKegiatan(expanded);
        }
        setCurrentPage(1);
    }, [searchTerm, kegiatanList, activeTab]);
    
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
            if (k && k.id) {
                expanded[k.id] = true;
            }
        });
        setExpandedKegiatan(expanded);
    };
    
    const collapseAll = () => {
        const expanded = {};
        paginatedKegiatan.forEach(k => {
            if (k && k.id) {
                expanded[k.id] = false;
            }
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
        if (!kwitansiId || kwitansiId === 'null' || kwitansiId === 'undefined') {
            console.log('No valid kwitansi ID provided, returning null');
            return null;
        }
        
        try {
            console.log(`🔍 Fetching kwitansi with ID: ${kwitansiId}`);
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/${kwitansiId}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            if (response.data.success && response.data.data) {
                console.log(`✅ Kwitansi found: ${response.data.data.id}`);
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching latest kwitansi:', error.message);
            if (error.response?.status === 404) {
                console.log('Kwitansi not found (404), returning null');
                return null;
            }
            return null;
        }
    };
    
    const handleViewDetail = async (pegawai, kegiatan) => {
        try {
            let latestKwitansi = null;
            
            if (pegawai.kwitansi_id) {
                latestKwitansi = await fetchLatestKwitansi(pegawai.kwitansi_id);
            }
            
            setSelectedKwitansi({
                ...pegawai,
                ...(latestKwitansi || {}),
                nama_kegiatan: kegiatan.kegiatan,
                no_st: kegiatan.no_st,
                mak: kegiatan.mak,
                kota_kab_kecamatan: kegiatan.kota_kab_kecamatan,
                kwitansi_id: pegawai.kwitansi_id,
                status_pegawai: latestKwitansi?.status_pegawai || pegawai.status_pegawai || 'belum',
                status_ppk: latestKwitansi?.status_ppk || pegawai.status_ppk || 'belum',
                status_bendahara: latestKwitansi?.status_bendahara || pegawai.status_bendahara || 'belum',
                tgl_ttd_pegawai: latestKwitansi?.tgl_ttd_pegawai || pegawai.tgl_ttd_pegawai,
                tgl_ttd_ppk: latestKwitansi?.tgl_ttd_ppk || pegawai.tgl_ttd_ppk,
                tgl_ttd_bendahara: latestKwitansi?.tgl_ttd_bendahara || pegawai.tgl_ttd_bendahara,
                catatan_pegawai: latestKwitansi?.catatan_pegawai || pegawai.catatan_pegawai,
                catatan_ppk: latestKwitansi?.catatan_ppk || pegawai.catatan_ppk,
                catatan_bendahara: latestKwitansi?.catatan_bendahara || pegawai.catatan_bendahara,
                ttd_pegawai_path: latestKwitansi?.ttd_pegawai_path || pegawai.ttd_pegawai_path,
                ttd_ppk_path: latestKwitansi?.ttd_ppk_path || pegawai.ttd_ppk_path,
                ttd_bendahara_path: latestKwitansi?.ttd_bendahara_path || pegawai.ttd_bendahara_path,
                bendahara_nama: kegiatan.bendahara_nama,
                bendahara_nip: kegiatan.bendahara_nip,
                ppk_nama: kegiatan.ppk_nama,
                ppk_nip: kegiatan.ppk_nip,
                total_biaya: pegawai.total_biaya || 0,
                biaya_list: pegawai.biaya_list || []
            });
            
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error preparing detail data:', error);
            setSelectedKwitansi({
                ...pegawai,
                nama_kegiatan: kegiatan.kegiatan,
                no_st: kegiatan.no_st,
                mak: kegiatan.mak,
                kota_kab_kecamatan: kegiatan.kota_kab_kecamatan,
                status_pegawai: pegawai.status_pegawai || 'belum',
                status_ppk: pegawai.status_ppk || 'belum',
                status_bendahara: pegawai.status_bendahara || 'belum',
                bendahara_nama: kegiatan.bendahara_nama,
                bendahara_nip: kegiatan.bendahara_nip,
                ppk_nama: kegiatan.ppk_nama,
                ppk_nip: kegiatan.ppk_nip,
                total_biaya: pegawai.total_biaya || 0
            });
            setShowDetailModal(true);
        }
    };
    
    const handlePrint = async (pegawai, kegiatan, kwitansiItem) => {
        try {
            let latestKwitansi = null;
            
            if (pegawai.kwitansi_id) {
                latestKwitansi = await fetchLatestKwitansi(pegawai.kwitansi_id);
            }
            
            let biayaData = {
                transportasi_detail: [],
                uang_harian_detail: [],
                penginapan_detail: [],
                transport_total: 0,
                uang_harian_total: 0,
                penginapan_total: 0,
                total_biaya: pegawai.total_biaya || 0
            };
            
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/pegawai/${pegawai.id}/biaya`, {
                    headers: { Authorization: `Bearer ${session.accessToken}` }
                });
                
                if (res.data.success) {
                    biayaData = res.data.data;
                    console.log('✅ Data biaya loaded:', biayaData);
                }
            } catch (err) {
                console.error('Gagal mengambil data biaya:', err.message);
                if (pegawai.biaya_list && pegawai.biaya_list.length > 0) {
                    biayaData.biaya_list = pegawai.biaya_list;
                }
            }
            
            setPrintData({
                item: {
                    ...kwitansiItem,
                    ...(latestKwitansi || {}),
                    no_lpd: pegawai.no_lpd || kwitansiItem?.no_lpd,
                    tgl_kwitansi: pegawai.tgl_kwitansi || kwitansiItem?.tgl_kwitansi,
                    status_pegawai: latestKwitansi?.status_pegawai || pegawai.status_pegawai || 'belum',
                    status_ppk: latestKwitansi?.status_ppk || pegawai.status_ppk || 'belum',
                    status_bendahara: latestKwitansi?.status_bendahara || pegawai.status_bendahara || 'belum'
                },
                kegiatan: kegiatan,
                pegawai: {
                    ...pegawai,
                    ...biayaData,
                    nama: pegawai.nama,
                    nip: pegawai.nip,
                    total_biaya: biayaData.total_biaya || pegawai.total_biaya
                }
            });
            setShowPrintModal(true);
            
        } catch (error) {
            console.error('Error preparing print data:', error);
            setNotificationMessage('Gagal mengambil data untuk dicetak: ' + (error.message || 'Unknown error'));
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
    
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchTerm('');
        setCurrentPage(1);
    };
    
    // ============ FUNGSI UNTUK MENENTUKAN APAKAH TOMBOL INPUT DITAMPILKAN ============
    const shouldShowInputButton = (kegiatan, pegawai) => {
        // Admin & creator selalu bisa
        if (userType.isAdmin) return true;
        if (kegiatan.isCreator === true) return true;
        
        // Pegawai: hanya bisa input/edit jika BELUM approve (status_pegawai masih 'belum')
        if (pegawai.isCurrentUser === true && pegawai.status_pegawai !== 'sudah') return true;
        
        if (kegiatan.can_input_kwitansi === true) return true;
        return false;
    };
    
    // ============ FUNGSI UNTUK MENENTUKAN APAKAH TOMBOL APPROVAL DITAMPILKAN ============
    const shouldShowApproveButton = (kegiatan, pegawai) => {
        if (userType.isAdmin) return true;
        
        if (pegawai.isCurrentUser && pegawai.status_pegawai === 'belum' && pegawai.kwitansi_status === 'sudah') {
            return true;
        }
        
        if (userType.isPPK && pegawai.status_ppk === 'belum' && pegawai.status_pegawai === 'sudah') {
            return true;
        }
        
        if (userType.isBendahara && pegawai.status_bendahara === 'belum' && pegawai.status_ppk === 'sudah') {
            return true;
        }
        
        return false;
    };
    
    // ============ FUNGSI UNTUK MENDAPATKAN TEKS TOMBOL APPROVAL ============
    const getApproveButtonText = (kegiatan, pegawai) => {
        if (pegawai.isCurrentUser && pegawai.status_pegawai === 'belum' && pegawai.kwitansi_status === 'sudah') {
            return 'Setujui Kwitansi';
        }
        if (userType.isPPK && pegawai.status_ppk === 'belum' && pegawai.status_pegawai === 'sudah') {
            return 'Setujui sebagai PPK';
        }
        if (userType.isBendahara && pegawai.status_bendahara === 'belum' && pegawai.status_ppk === 'sudah') {
            return 'Setujui sebagai Bendahara';
        }
        return 'Setujui / Tolak';
    };
    
    const canAccessPegawaiLain = userType.isAdmin || userType.isCreator;
    const canAccessPpkTabs = userType.isPPK || userType.isAdmin;
    const canAccessBendaharaTabs = userType.isBendahara || userType.isAdmin;
    
    if (status === 'loading') return <LoadingSpinner />;
    if (!session) return null;
    
    return (
        <div className="max-w-[95vw] mx-auto p-6 shadow-md rounded-lg overflow-x-auto bg-white dark:bg-gray-800" key={refreshKey}>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">KUITANSI PERJALANAN DINAS</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        User: {session.user?.name || session.user?.email || 'Unknown User'} | Role: {userRole || 'User'}
                        {userType.isAdmin && <span className="ml-2 text-blue-600 dark:text-blue-400">(Admin - Melihat Semua Data)</span>}
                        {userType.isPPK && <span className="ml-2 text-purple-600 dark:text-purple-400">(PPK - Approval Level 2)</span>}
                        {userType.isBendahara && <span className="ml-2 text-orange-600 dark:text-orange-400">(Bendahara - Approval Level 3)</span>}
                        {userType.isRegularUser && <span className="ml-2 text-green-600 dark:text-green-400">(Pegawai - Approval Level 1)</span>}
                        {userType.isCreator && <span className="ml-2 text-teal-600 dark:text-teal-400">(Creator - Dapat Input Kwitansi Pegawai Lain)</span>}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Alur Persetujuan: Pegawai → PPK → Bendahara</p>
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
                    {userType.isAdmin && (
                        <button
                            onClick={handleExportXlsx}
                            disabled={exportingXlsx}
                            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-2 disabled:opacity-60"
                            title="Export seluruh data Nominatif, LPD & Kwitansi ke file Excel (.xlsx) - khusus Admin"
                        >
                            {exportingXlsx ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            Export XLSX
                        </button>
                    )}
                </div>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-center text-sm dark:text-gray-200">
                    <svg className="h-5 w-5 text-blue-500 dark:text-blue-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-medium">Alur Persetujuan Berjenjang:</span>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                <span className="text-xs dark:text-gray-200">1. Pegawai</span>
                                <span className="text-gray-400 dark:text-gray-500">→</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                <span className="text-xs dark:text-gray-200">2. PPK</span>
                                <span className="text-gray-400 dark:text-gray-500">→</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                <span className="text-xs dark:text-gray-200">3. Bendahara</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Tab Menu */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-2 flex-wrap" aria-label="Tabs">
                    <button
                        onClick={() => handleTabChange('diri_sendiri')}
                        className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                            activeTab === 'diri_sendiri'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Diri Sendiri
                    </button>
                    
                    {/* Tab Pegawai Lain - Hanya untuk Admin atau Creator */}
                    {canAccessPegawaiLain && (
                        <button
                            onClick={() => handleTabChange('pegawai_lain')}
                            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                                activeTab === 'pegawai_lain'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Pegawai Lain
                            {userType.isCreator && !userType.isAdmin && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-teal-200 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 rounded-full">Creator</span>
                            )}
                        </button>
                    )}
                    
                    {/* Tab PPK - Hanya untuk role PPK dan Admin */}
                    {canAccessPpkTabs && (
                        <>
                            <button
                                onClick={() => handleTabChange('persetujuan_ppk')}
                                className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                                    activeTab === 'persetujuan_ppk'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Persetujuan PPK
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 dark:bg-yellow-600 text-white rounded-full">Menunggu</span>
                            </button>
                            
                            <button
                                onClick={() => handleTabChange('riwayat_ppk')}
                                className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                                    activeTab === 'riwayat_ppk'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Riwayat PPK
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full">Sudah</span>
                            </button>
                        </>
                    )}
                    
                    {/* Tab Bendahara - Hanya untuk role Bendahara dan Admin */}
                    {canAccessBendaharaTabs && (
                        <>
                            <button
                                onClick={() => handleTabChange('persetujuan_bendahara')}
                                className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                                    activeTab === 'persetujuan_bendahara'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Persetujuan Bendahara
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 dark:bg-yellow-600 text-white rounded-full">Menunggu</span>
                            </button>
                            
                            <button
                                onClick={() => handleTabChange('riwayat_bendahara')}
                                className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                                    activeTab === 'riwayat_bendahara'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Riwayat Bendahara
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full">Sudah</span>
                            </button>
                        </>
                    )}
                </nav>
            </div>
            
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="Cari berdasarkan Nama Kegiatan, No ST, MAK, atau Lokasi..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full md:w-1/2 p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            
            <div className="mb-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>Menampilkan {paginatedKegiatan.length} dari {filteredKegiatan.length} kegiatan</span>
                <div className="flex gap-2">
                    <button onClick={prevPage} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600">Previous</button>
                    <span className="px-3 py-1 dark:text-gray-300">Halaman {currentPage} dari {totalPages || 1}</span>
                    <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600">Next</button>
                </div>
            </div>
            
            {paginatedKegiatan.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                        {activeTab === 'diri_sendiri' && 'Belum ada kegiatan yang memerlukan input kwitansi untuk Anda.'}
                        {activeTab === 'pegawai_lain' && 'Belum ada kegiatan yang memerlukan input kwitansi untuk pegawai lain.'}
                        {activeTab === 'persetujuan_ppk' && 'Belum ada kwitansi yang menunggu persetujuan PPK.'}
                        {activeTab === 'riwayat_ppk' && 'Belum ada kwitansi yang sudah disetujui PPK.'}
                        {activeTab === 'persetujuan_bendahara' && 'Belum ada kwitansi yang menunggu persetujuan Bendahara.'}
                        {activeTab === 'riwayat_bendahara' && 'Belum ada kwitansi yang sudah disetujui Bendahara.'}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {activeTab === 'diri_sendiri' && 'Setelah kegiatan selesai, Anda dapat menginput kwitansi di sini.'}
                        {activeTab === 'pegawai_lain' && 'Setelah pegawai lain menyelesaikan kegiatan, kwitansi akan muncul di sini.'}
                        {activeTab === 'persetujuan_ppk' && 'Semua kwitansi sudah diproses atau belum ada yang memerlukan persetujuan PPK.'}
                        {activeTab === 'riwayat_ppk' && 'Kwitansi yang sudah disetujui PPK akan muncul di sini.'}
                        {activeTab === 'persetujuan_bendahara' && 'Semua kwitansi sudah diproses atau belum ada yang memerlukan persetujuan Bendahara.'}
                        {activeTab === 'riwayat_bendahara' && 'Kwitansi yang sudah disetujui Bendahara akan muncul di sini.'}
                    </p>
                </div>
            ) : (
                paginatedKegiatan.map((kegiatan) => (
                    <div key={kegiatan.id} className={`mb-4 rounded-lg overflow-hidden ${String(kegiatan.jenis_spm || '').toUpperCase() === 'KKP' ? 'border border-purple-300 dark:border-purple-700 border-l-4 border-l-purple-500' : 'border border-gray-200 dark:border-gray-700'}`}>
                        <div className={`p-4 border-b cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 ${
                            activeTab === 'persetujuan_ppk' 
                                ? 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/30' 
                                : activeTab === 'pegawai_lain'
                                ? 'bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/40 dark:to-teal-800/30'
                                : activeTab === 'riwayat_ppk'
                                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/30'
                                : activeTab === 'persetujuan_bendahara'
                                ? 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/30'
                                : activeTab === 'riwayat_bendahara'
                                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/30'
                                : 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/30'
                        }`} onClick={() => toggleExpand(kegiatan.id)}>
                            <div className="flex items-center gap-2">
                                <svg className={`h-5 w-5 ${
                                    activeTab === 'persetujuan_ppk' ? 'text-purple-600 dark:text-purple-400' : 
                                    activeTab === 'pegawai_lain' ? 'text-teal-600 dark:text-teal-400' : 
                                    activeTab === 'riwayat_ppk' ? 'text-green-600 dark:text-green-400' : 
                                    activeTab === 'persetujuan_bendahara' ? 'text-orange-600 dark:text-orange-400' :
                                    activeTab === 'riwayat_bendahara' ? 'text-green-600 dark:text-green-400' : 
                                    'text-blue-600 dark:text-blue-400'
                                } transform transition-transform ${expandedKegiatan[kegiatan.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <h3 className={`font-bold text-lg ${
                                    activeTab === 'persetujuan_ppk' ? 'text-purple-900 dark:text-purple-300' : 
                                    activeTab === 'pegawai_lain' ? 'text-teal-900 dark:text-teal-300' : 
                                    activeTab === 'riwayat_ppk' ? 'text-green-900 dark:text-green-300' : 
                                    activeTab === 'persetujuan_bendahara' ? 'text-orange-900 dark:text-orange-300' :
                                    activeTab === 'riwayat_bendahara' ? 'text-green-900 dark:text-green-300' : 
                                    'text-blue-900 dark:text-blue-300'
                                }`}>{kegiatan.kegiatan}</h3>
                                {renderJenisSpmBadge(kegiatan)}
                                {activeTab === 'diri_sendiri' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-full">Anda</span>
                                )}
                                {activeTab === 'persetujuan_ppk' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 rounded-full">Menunggu PPK</span>
                                )}
                                {activeTab === 'riwayat_ppk' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-full">Sudah Disetujui PPK</span>
                                )}
                                {activeTab === 'persetujuan_bendahara' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 rounded-full">Menunggu Bendahara</span>
                                )}
                                {activeTab === 'riwayat_bendahara' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-full">Sudah Disetujui Bendahara</span>
                                )}
                                {activeTab === 'pegawai_lain' && kegiatan.isCreator && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-200 rounded-full">Kegiatan Saya</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mt-2 ml-7 dark:text-gray-200">
                                <div><span className="font-medium">No ST:</span> {kegiatan.no_st || '-'}</div>
                                <div><span className="font-medium">MAK:</span> {kegiatan.mak}</div>
                                <div><span className="font-medium">Lokasi:</span> {kegiatan.kota_kab_kecamatan}</div>
                                <div><span className="font-medium">Progress Input:</span> <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">{kegiatan.sudah_input || 0} / {kegiatan.total_pegawai} sudah input</span></div>
                                <div>
                                    <span className="font-medium">Status Approval:</span> 
                                    {kegiatan.semua_bendahara_approve ? 
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">✓ Selesai</span> : 
                                        kegiatan.semua_ppk_approve ?
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">Menunggu Bendahara</span> :
                                        kegiatan.semua_pegawai_approve ?
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200">Menunggu PPK</span> :
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">Menunggu Pegawai</span>
                                    }
                                </div>
                            </div>
                            <div className="mt-2 ml-7 text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">ℹ️ Jumlah pegawai yang ditampilkan: {kegiatan.pegawai?.length || 0} orang</span>
                                {activeTab === 'diri_sendiri' && kegiatan.pegawai?.length === 1 && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">(Hanya menampilkan data Anda)</span>
                                )}
                                {activeTab === 'pegawai_lain' && (
                                    <span className="ml-2 text-teal-600 dark:text-teal-400">(Data pegawai lain dalam kegiatan yang Anda buat)</span>
                                )}
                                {activeTab === 'persetujuan_ppk' && (
                                    <span className="ml-2 text-purple-600 dark:text-purple-400">(Menunggu persetujuan PPK)</span>
                                )}
                                {activeTab === 'riwayat_ppk' && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">(Sudah disetujui PPK)</span>
                                )}
                                {activeTab === 'persetujuan_bendahara' && (
                                    <span className="ml-2 text-orange-600 dark:text-orange-400">(Menunggu persetujuan Bendahara)</span>
                                )}
                                {activeTab === 'riwayat_bendahara' && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">(Sudah disetujui Bendahara)</span>
                                )}
                            </div>
                        </div>
                        
                        {expandedKegiatan[kegiatan.id] && (
                            <div className="overflow-x-auto">
                                {kegiatan.pegawai && kegiatan.pegawai.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">No</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Nama Pegawai</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">NIP</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">Total Biaya</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Status Kwitansi</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Approval</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">No LPD</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">File</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {kegiatan.pegawai.map((pegawai, idx) => {
                                                const sudahInput = pegawai.kwitansi_status === 'sudah';
                                                const showInputBtn = shouldShowInputButton(kegiatan, pegawai);
                                                const showApproveBtn = shouldShowApproveButton(kegiatan, pegawai);
                                                const approveButtonText = getApproveButtonText(kegiatan, pegawai);
                                                
                                                return (
                                                    <tr key={pegawai.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-4 py-3 dark:text-gray-200">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-medium dark:text-gray-200">
                                                            {pegawai.nama}
                                                            {pegawai.isCurrentUser && (
                                                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded">Anda</span>
                                                            )}
                                                            {kegiatan.isCreator && !pegawai.isCurrentUser && (
                                                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-200 rounded">Pegawai Saya</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 dark:text-gray-200">{pegawai.nip || '-'}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">Rp {formatRupiah(pegawai.total_biaya)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {sudahInput ? 
                                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">✓ Sudah Input</span> : 
                                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">⊗ Belum Input</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {getApprovalBadge(pegawai.status_pegawai)}
                                                                    <span className="text-gray-600 dark:text-gray-400">Pegawai</span>
                                                                </div>
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {getApprovalBadge(pegawai.status_ppk)}
                                                                    <span className="text-gray-600 dark:text-gray-400">PPK</span>
                                                                </div>
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {getApprovalBadge(pegawai.status_bendahara)}
                                                                    <span className="text-gray-600 dark:text-gray-400">Bendahara</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-medium text-blue-600 dark:text-blue-400">{pegawai.no_lpd || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {sudahInput ? (
                                                                <button
                                                                    onClick={() => handleViewDetail(pegawai, kegiatan)}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800"
                                                                    title="Lihat file upload"
                                                                >
                                                                    📎 File
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-gray-500">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex justify-center gap-2 flex-wrap">
                                                                {!sudahInput ? (
                                                                    showInputBtn && (
                                                                        <button 
                                                                            onClick={() => handleInputKwitansi(kegiatan, pegawai)} 
                                                                            className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                                                        >
                                                                            Input Kwitansi
                                                                        </button>
                                                                    )
                                                                ) : (
                                                                    <>
                                                                        {/* Tombol Edit — tampil jika pegawai sendiri dan (belum approve atau ada yang ditolak) */}
                                                                        {pegawai.isCurrentUser && (pegawai.status_pegawai !== 'sudah' || pegawai.status_ppk === 'ditolak' || pegawai.status_bendahara === 'ditolak') && (
                                                                            <button 
                                                                                onClick={() => handleInputKwitansi(kegiatan, pegawai)} 
                                                                                className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                                                                            >
                                                                                ✏️ Edit
                                                                            </button>
                                                                        )}
                                                                        {showApproveBtn && (
                                                                            <button 
                                                                                onClick={() => handleViewDetail(pegawai, kegiatan)} 
                                                                                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                                                            >
                                                                                {approveButtonText}
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            onClick={() => handlePrint(pegawai, kegiatan, { no_lpd: pegawai.no_lpd, id: pegawai.kwitansi_id })} 
                                                                            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                                                                        >
                                                                            🖨️ Cetak
                                                                        </button>
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
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
            
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                    <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 dark:text-gray-200">Previous</button>
                    {[...Array(totalPages)].map((_, i) => <button key={i} onClick={() => goToPage(i + 1)} className={`px-3 py-1 rounded-md ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-200'}`}>{i + 1}</button>)}
                    <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 dark:text-gray-200">Next</button>
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
                    formatDateForDisplay={formatDateForDisplay} 
                    formatRupiah={formatRupiah}
                    onRefresh={refreshData}
                />
            )}
            
            {showPrintModal && printData && (
                <KwitansiPrint 
                    key={printData.item?.id + '_' + printData.item?.status_pegawai}
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