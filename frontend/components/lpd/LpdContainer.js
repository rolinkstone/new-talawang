// components/lpd/LpdContainer.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import axios from 'axios';

import LpdForm from './LpdForm';
import LpdModal from './LpdModal';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';
import KirimKeKatimModal from './modals/KirimKeKatimModal';
import PersetujuanKatimModal from './modals/PersetujuanKatimModal';
import PersetujuanKabalaiModal from './modals/PersetujuanKabalaiModal';
import LihatLPDModal from './modals/LihatLPDModal';
import { formatDateForDisplay } from '../../utils/formatters';
import { printLPD } from './lpdPrint';


const ITEMS_PER_PAGE = 10;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function LpdContainer({ session, status }) {
    const router = useRouter();
    
    // State utama
    const [kegiatanList, setKegiatanList] = useState([]);
    const [filteredKegiatan, setFilteredKegiatan] = useState([]);
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    
    // State filter
    const [showFilter, setShowFilter] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterMak, setFilterMak] = useState('');
    const [filterLokasi, setFilterLokasi] = useState('');
    
    // State modal
    const [modalOpen, setModalOpen] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    
    // State untuk modal persetujuan LPD
    const [showKirimKeKatimModal, setShowKirimKeKatimModal] = useState(false);
    const [selectedKegiatanForKirim, setSelectedKegiatanForKirim] = useState(null);
    const [showPersetujuanKatimModal, setShowPersetujuanKatimModal] = useState(false);
    const [selectedKegiatanForKatim, setSelectedKegiatanForKatim] = useState(null);
    const [showPersetujuanKabalaiModal, setShowPersetujuanKabalaiModal] = useState(false);
    const [selectedKegiatanForKabalai, setSelectedKegiatanForKabalai] = useState(null);
    
    // State untuk modal Lihat LPD
    const [showLihatLPDModal, setShowLihatLPDModal] = useState(false);
    const [selectedKegiatanForLihat, setSelectedKegiatanForLihat] = useState(null);
    
    // State user role
    const [userRole, setUserRole] = useState('');
    const [userType, setUserType] = useState({
        isAdmin: false,
        isPPK: false,
        isKabalai: false,
        isKatim: false,
        isRegularUser: false
    });
    
    // State untuk tab
    const [activeTab, setActiveTab] = useState('milik_saya');
    const [userNip, setUserNip] = useState('');
    const [pegawaiInfo, setPegawaiInfo] = useState({});
    const [expandedPegawai, setExpandedPegawai] = useState({});
    const [dokumentasiPreview, setDokumentasiPreview] = useState({});

    const previousFilterString = useRef('');

    // Extract user info dari session
    useEffect(() => {
        if (session) {
            const userData = session.user || {};
            const nip = userData.nip || userData.NIP || '';
            setUserNip(nip);
            
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
            const isKabalai = roles.some(role => role.toLowerCase().includes('kabalai'));
            const isKatim = roles.some(role => role.toLowerCase().includes('katim') || role.toLowerCase().includes('kabag'));
            const isRegularUser = !isAdmin && !isPPK && !isKabalai && !isKatim;
            
            setUserType({
                isAdmin,
                isPPK,
                isKabalai,
                isKatim,
                isRegularUser
            });
        }
    }, [session]);

    // Fetch data kegiatan
    const fetchKegiatanList = async () => {
        if (!session?.accessToken) {
            console.error('No access token available');
            setNotificationMessage('Token tidak ditemukan. Silakan login kembali.');
            setModalOpen(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
            return;
        }

        try {
            setLoading(true);
            const url = `${API_BASE_URL}/lpd/daftar-kegiatan`;
            
            const res = await axios.get(url, {
                headers: { 
                    'Authorization': `Bearer ${session.accessToken}` 
                },
                timeout: 10000
            });
            
            if (res.data.success && Array.isArray(res.data.data)) {
                const sortedData = [...res.data.data].sort((a, b) => {
                    return new Date(b.created_at || b.id) - new Date(a.created_at || a.id);
                });
                setKegiatanList(sortedData);
                
                await Promise.all([
                    fetchPegawaiInfoForKegiatan(sortedData),
                    fetchDokumentasiPreviewForKegiatan(sortedData)
                ]);
            } else {
                setKegiatanList([]);
                setFilteredKegiatan([]);
                if (res.data.message) {
                    setNotificationMessage(res.data.message);
                    setModalOpen(true);
                }
            }
        } catch (error) {
            console.error('Error fetching kegiatan:', error);
            
            if (error.code === 'ECONNABORTED') {
                setNotificationMessage('Timeout koneksi. Pastikan backend berjalan di ' + API_BASE_URL);
            } else if (error.response?.status === 401) {
                setNotificationMessage('Session expired. Silakan login kembali.');
                localStorage.removeItem('token');
                localStorage.removeItem('access_token');
                sessionStorage.removeItem('token');
                setTimeout(() => {
                    signOut({ callbackUrl: '/login' });
                }, 2000);
            } else if (error.response?.status === 404) {
                setNotificationMessage(`Endpoint API tidak ditemukan: ${API_BASE_URL}/lpd/daftar-kegiatan. Pastikan backend berjalan.`);
            } else if (error.response?.status === 500) {
                setNotificationMessage('Server error. Silakan coba lagi nanti.');
            } else {
                setNotificationMessage('Gagal memuat data kegiatan: ' + (error.response?.data?.message || error.message));
            }
            setModalOpen(true);
            setKegiatanList([]);
            setFilteredKegiatan([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch informasi pegawai untuk setiap kegiatan
    const fetchPegawaiInfoForKegiatan = async (kegiatanData) => {
        const pegawaiMap = {};
        
        for (const kegiatan of kegiatanData) {
            try {
                const url = `${API_BASE_URL}/lpd/kegiatan/${kegiatan.id}`;
                const response = await axios.get(url, {
                    headers: { 
                        'Authorization': `Bearer ${session?.accessToken}`
                    }
                });
                
                if (response.data.success && response.data.data.petugas_pelaksana) {
                    pegawaiMap[kegiatan.id] = response.data.data.petugas_pelaksana;
                } else {
                    pegawaiMap[kegiatan.id] = [];
                }
            } catch (error) {
                console.error(`Error fetching pegawai for kegiatan ${kegiatan.id}:`, error);
                pegawaiMap[kegiatan.id] = [];
            }
        }
        
        setPegawaiInfo(pegawaiMap);
    };

    // Fetch dokumentasi preview untuk setiap kegiatan
    const fetchDokumentasiPreviewForKegiatan = async (kegiatanData) => {
        const previewMap = {};
        
        for (const kegiatan of kegiatanData) {
            try {
                const url = `${API_BASE_URL}/lpd/kegiatan/${kegiatan.id}`;
                const response = await axios.get(url, {
                    headers: { 
                        'Authorization': `Bearer ${session?.accessToken}`
                    }
                });
                
                if (response.data.success && response.data.data.dokumentasi && response.data.data.dokumentasi.length > 0) {
                    const imageDocs = response.data.data.dokumentasi.filter(doc => 
                        doc.file_type && doc.file_type.startsWith('image/')
                    );
                    
                    if (imageDocs.length > 0) {
                        previewMap[kegiatan.id] = imageDocs[0];
                    } else {
                        previewMap[kegiatan.id] = response.data.data.dokumentasi[0];
                    }
                } else {
                    previewMap[kegiatan.id] = null;
                }
            } catch (error) {
                console.error(`Error fetching dokumentasi for kegiatan ${kegiatan.id}:`, error);
                previewMap[kegiatan.id] = null;
            }
        }
        
        setDokumentasiPreview(previewMap);
    };

    const fetchLpdData = async (kegiatanId) => {
        try {
            setLoading(true);
            const url = `${API_BASE_URL}/lpd/kegiatan/${kegiatanId}`;
            
            const response = await axios.get(url, {
                headers: { 
                    'Authorization': `Bearer ${session?.accessToken}`
                }
            });

            if (response.data.success) {
                setSelectedKegiatan(response.data.data);
                setShowForm(true);
            } else {
                setNotificationMessage(response.data.message || 'Gagal mengambil data LPD');
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching LPD:', error);
            setNotificationMessage('Gagal mengambil data LPD: ' + (error.response?.data?.message || error.message));
            setModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        await fetchKegiatanList();
        if (selectedKegiatan) {
            await fetchLpdData(selectedKegiatan.kegiatan_id);
        }
    };

    useEffect(() => {
        if (session?.accessToken) {
            fetchKegiatanList();
        }
    }, [session]);

    // Filter effect dengan tab
    useEffect(() => {
        let filtered = [...kegiatanList];
        
        if (activeTab === 'milik_saya') {
            filtered = filtered.filter(item => item.created_by_me === true);
        } 
        else if (activeTab === 'pegawai_lain') {
            filtered = filtered.filter(item => 
                item.is_pegawai_in_kegiatan === true && 
                item.created_by_me !== true
            );
        } 
        else if (activeTab === 'approval_katim') {
            filtered = filtered.filter(item => 
                item.lpd_status === 'menunggu_katim' || item.lpd_status === 'menunggu_kabalai'
            );
        } 
        else if (activeTab === 'approval_kabalai') {
            filtered = filtered.filter(item => 
                item.lpd_status === 'menunggu_kabalai' || item.lpd_status === 'selesai'
            );
        }
        
        if (searchTerm) {
            filtered = filtered.filter(item => 
                item.kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.no_st?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.mak?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.tempat?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (filterStatus) {
            filtered = filtered.filter(item => item.status === filterStatus);
        }
        
        if (filterMak) {
            filtered = filtered.filter(item => item.mak?.toLowerCase().includes(filterMak.toLowerCase()));
        }
        
        if (filterLokasi) {
            filtered = filtered.filter(item => item.tempat?.toLowerCase().includes(filterLokasi.toLowerCase()));
        }
        
        if (filterDateFrom || filterDateTo) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.tgl_st || item.created_at);
                const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
                const toDate = filterDateTo ? new Date(filterDateTo) : null;
                
                if (fromDate && toDate) {
                    return itemDate >= fromDate && itemDate <= toDate;
                } else if (fromDate) {
                    return itemDate >= fromDate;
                } else if (toDate) {
                    return itemDate <= toDate;
                }
                return true;
            });
        }
        
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        setFilteredKegiatan(filtered);
        
        const currentFilterString = JSON.stringify({
            activeTab, searchTerm, filterStatus, filterDateFrom, filterDateTo, filterMak, filterLokasi
        });
        
        if (previousFilterString.current !== currentFilterString) {
            setCurrentPage(1);
            previousFilterString.current = currentFilterString;
        }
        
    }, [activeTab, searchTerm, kegiatanList, filterStatus, filterDateFrom, filterDateTo, filterMak, filterLokasi, sortConfig]);

    const resetFilter = () => {
        setFilterStatus('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterMak('');
        setFilterLokasi('');
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleBackToList = () => {
        setShowForm(false);
        setSelectedKegiatan(null);
        fetchKegiatanList();
    };

    const openModal = (type, item = null) => {
        setModalType(type);
        setSelectedItem(item);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedItem(null);
        setModalType('');
        refreshData();
    };

    const closeNotificationModal = () => {
        setModalOpen(false);
        setNotificationMessage('');
    };

    // Handler untuk kirim ke Katim
    const handleKirimKeKatim = (kegiatan) => {
        setSelectedKegiatanForKirim(kegiatan);
        setShowKirimKeKatimModal(true);
    };

    // Handler untuk persetujuan Katim
    const handlePersetujuanKatim = (kegiatan) => {
        setSelectedKegiatanForKatim(kegiatan);
        setShowPersetujuanKatimModal(true);
    };

    // Handler untuk persetujuan Kabalai
    const handlePersetujuanKabalai = (kegiatan) => {
        setSelectedKegiatanForKabalai(kegiatan);
        setShowPersetujuanKabalaiModal(true);
    };

    // Handler untuk Lihat LPD
    const handleLihatLPD = (kegiatan) => {
        setSelectedKegiatanForLihat(kegiatan);
        setShowLihatLPDModal(true);
    };

    // Handler untuk cetak LPD
    const handlePrintLPD = async (kegiatan) => {
        try {
            setLoading(true);
            await printLPD(kegiatan.id, kegiatan, session, API_BASE_URL);
        } catch (error) {
            console.error('Error printing LPD:', error);
            setNotificationMessage('Gagal mencetak LPD: ' + (error.message || 'Terjadi kesalahan'));
            setModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRincian = async (rincianList) => {
        try {
            const url = `${API_BASE_URL}/lpd/rincian`;
            
            const response = await axios.post(url, {
                kegiatan_id: parseInt(selectedKegiatan.kegiatan_id),
                rincian_list: rincianList
            }, {
                headers: { 
                    'Authorization': `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                setNotificationMessage('Rincian kegiatan berhasil disimpan');
                setModalOpen(true);
                await fetchLpdData(selectedKegiatan.kegiatan_id);
                setShowModal(false);
                return { success: true };
            } else {
                setNotificationMessage(response.data.message || 'Gagal menyimpan rincian');
                setModalOpen(true);
                return { success: false, message: response.data.message };
            }
        } catch (err) {
            console.error('Error saving rincian:', err);
            const errorMsg = err.response?.data?.message || err.message;
            setNotificationMessage('Gagal menyimpan rincian: ' + errorMsg);
            setModalOpen(true);
            return { success: false, message: errorMsg };
        }
    };

    const handleUploadDokumentasi = async (files, keteranganList) => {
        try {
            const formData = new FormData();
            
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            
            const keteranganArray = keteranganList.map(item => {
                if (typeof item === 'object' && item.keterangan) {
                    return item.keterangan;
                }
                return item || '';
            });
            
            formData.append('keterangan_list', JSON.stringify(keteranganArray));

            const url = `${API_BASE_URL}/lpd/dokumentasi/${selectedKegiatan.kegiatan_id}`;
            
            const response = await axios.post(url, formData, {
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setNotificationMessage('Dokumentasi berhasil diupload');
                setModalOpen(true);
                await fetchLpdData(selectedKegiatan.kegiatan_id);
                setShowModal(false);
                return { success: true };
            } else {
                setNotificationMessage(response.data.message || 'Gagal upload dokumentasi');
                setModalOpen(true);
                return { success: false, message: response.data.message };
            }
        } catch (err) {
            console.error('Error uploading dokumentasi:', err);
            const errorMsg = err.response?.data?.message || err.message;
            setNotificationMessage('Gagal upload dokumentasi: ' + errorMsg);
            setModalOpen(true);
            return { success: false, message: errorMsg };
        }
    };

    const handleDeleteDokumentasi = async (dokumentasiId) => {
        try {
            const url = `${API_BASE_URL}/lpd/dokumentasi/${dokumentasiId}`;
            
            const response = await axios.delete(url, {
                headers: { 
                    'Authorization': `Bearer ${session?.accessToken}`
                }
            });

            if (response.data.success) {
                setNotificationMessage('Dokumentasi berhasil dihapus');
                setModalOpen(true);
                await fetchLpdData(selectedKegiatan.kegiatan_id);
                setShowModal(false);
                return { success: true };
            } else {
                setNotificationMessage(response.data.message || 'Gagal menghapus dokumentasi');
                setModalOpen(true);
                return { success: false, message: response.data.message };
            }
        } catch (err) {
            console.error('Error deleting dokumentasi:', err);
            const errorMsg = err.response?.data?.message || err.message;
            setNotificationMessage('Gagal menghapus dokumentasi: ' + errorMsg);
            setModalOpen(true);
            return { success: false, message: errorMsg };
        }
    };

    const getStatusBadge = (kegiatan) => {
        const lpdStatus = kegiatan.lpd_status || 'draft';
        
        if (lpdStatus === 'selesai') {
            return { text: 'Selesai', color: 'bg-green-100 text-green-800' };
        } else if (lpdStatus === 'menunggu_kabalai') {
            return { text: 'Menunggu Persetujuan Kabalai', color: 'bg-purple-100 text-purple-800' };
        } else if (lpdStatus === 'menunggu_katim') {
            return { text: 'Menunggu Verifikasi Kabag TU / Katim', color: 'bg-yellow-100 text-yellow-800' };
        } else if (lpdStatus === 'ditolak_katim') {
            return { text: 'Ditolak Katim - Perbaiki', color: 'bg-red-100 text-red-800' };
        } else if (lpdStatus === 'ditolak_kabalai') {
            return { text: 'Ditolak Kabalai - Perbaiki', color: 'bg-red-100 text-red-800' };
        } else if (kegiatan.has_rincian && kegiatan.has_dokumentasi) {
            return { text: 'Siap Kirim', color: 'bg-blue-100 text-blue-800' };
        } else if (kegiatan.has_rincian) {
            return { text: 'Rincian Ada', color: 'bg-yellow-100 text-yellow-800' };
        } else if (kegiatan.has_dokumentasi) {
            return { text: 'Dokumentasi Ada', color: 'bg-cyan-100 text-cyan-800' };
        } else {
            return { text: 'Belum Diisi', color: 'bg-gray-100 text-gray-600' };
        }
    };

    const toggleExpandPegawai = (kegiatanId) => {
        setExpandedPegawai(prev => ({
            ...prev,
            [kegiatanId]: !prev[kegiatanId]
        }));
    };

    const formatPegawaiList = (kegiatanId, isExpanded) => {
        const pegawai = pegawaiInfo[kegiatanId] || [];
        if (pegawai.length === 0) return '-';
        
        if (isExpanded) {
            return (
                <div className="space-y-2">
                    {pegawai.map((p, idx) => (
                        <div key={idx} className="text-sm border-b border-gray-100 pb-1 last:border-0">
                            <div className="font-medium text-gray-800">{p.nama || '-'}</div>
                            {p.nip && <div className="text-xs text-gray-500 dark:text-gray-400">NIP: {p.nip}</div>}
                            {p.jabatan && <div className="text-xs text-gray-500 dark:text-gray-400">{p.jabatan}</div>}
                            {p.pangkat_golongan && <div className="text-xs text-gray-400">{p.pangkat_golongan}</div>}
                        </div>
                    ))}
                    <button
                        onClick={() => toggleExpandPegawai(kegiatanId)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                        Sembunyikan
                    </button>
                </div>
            );
        } else {
            const previewCount = Math.min(3, pegawai.length);
            const previewNames = pegawai.slice(0, previewCount).map(p => p.nama).filter(n => n);
            const remainingCount = pegawai.length - previewCount;
            
            return (
                <div>
                    <div className="space-y-1">
                        {previewNames.map((name, idx) => (
                            <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">{name}</div>
                        ))}
                        {remainingCount > 0 && (
                            <div className="text-sm text-blue-600">
                                + {remainingCount} pegawai lainnya
                            </div>
                        )}
                    </div>
                    {pegawai.length > 3 && (
                        <button
                            onClick={() => toggleExpandPegawai(kegiatanId)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                        >
                            Lihat semua ({pegawai.length} orang)
                        </button>
                    )}
                </div>
            );
        }
    };

    // Render preview foto dokumentasi
    const renderDokumentasiPreview = (kegiatanId) => {
        const preview = dokumentasiPreview[kegiatanId];
        
        if (!preview || !preview.file_path) {
            return (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            );
        }

        const filename = preview.file_path.split('/').pop();
        const imageUrl = `${BACKEND_URL}/uploads/lpd-dokumentasi/${filename}`;
        const isImage = preview.file_type?.startsWith('image/');
        
        if (isImage) {
            return (
                <img 
                    src={imageUrl}
                    alt={preview.keterangan || preview.file_name || 'Preview'}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                    onError={(e) => {
                        console.error(`Image failed to load: ${imageUrl}`);
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23999"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /%3E%3C/svg%3E';
                    }}
                />
            );
        } else {
            const fileExtension = preview.file_name?.split('.').pop()?.toUpperCase() || 'FILE';
            return (
                <div 
                    className="w-16 h-16 bg-blue-50 rounded-lg flex flex-col items-center justify-center border border-blue-200 cursor-pointer hover:bg-blue-100 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                >
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-blue-600 font-medium mt-1">{fileExtension}</span>
                </div>
            );
        }
    };

    if (status === 'loading') {
        return <LoadingSpinner />;
    }

    if (!session) {
        return null;
    }

    const totalItems = filteredKegiatan.length;
    const paginatedItems = filteredKegiatan.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (showForm && selectedKegiatan) {
        return (
            <div className="max-w-[95vw] mx-auto p-6 shadow-md rounded-lg overflow-x-auto">
                <button
                    onClick={handleBackToList}
                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali ke Daftar Kegiatan
                </button>

                <LpdForm 
                    lpdData={selectedKegiatan}
                    session={session}
                    apiBaseUrl={API_BASE_URL}
                    onRefresh={() => fetchLpdData(selectedKegiatan.kegiatan_id)}
                    onOpenModal={openModal}
                />

                <LpdModal
                    isOpen={showModal && modalType === 'rincian'}
                    onClose={closeModal}
                    type="rincian"
                    title="Rincian Hasil Kegiatan"
                    kegiatanId={selectedKegiatan.kegiatan_id}
                    existingData={selectedKegiatan?.rincian_kegiatan || []}
                    onSave={handleSaveRincian}
                />

                <LpdModal
                    isOpen={showModal && modalType === 'dokumentasi'}
                    onClose={closeModal}
                    type="dokumentasi"
                    title="Upload Dokumentasi Kegiatan"
                    kegiatanId={selectedKegiatan.kegiatan_id}
                    existingData={selectedKegiatan?.dokumentasi || []}
                    onSave={handleUploadDokumentasi}
                    onDelete={handleDeleteDokumentasi}
                />

                <LpdModal
                    isOpen={showModal && modalType === 'delete'}
                    onClose={closeModal}
                    type="delete"
                    title="Hapus Dokumentasi"
                    selectedItem={selectedItem}
                    onDelete={handleDeleteDokumentasi}
                />

                <NotificationModal show={modalOpen} message={notificationMessage} onClose={closeNotificationModal} />
            </div>
        );
    }

    const myKegiatanCount = kegiatanList.filter(item => item.created_by_me === true).length;
    
    const otherKegiatanCount = kegiatanList.filter(item => 
        item.is_pegawai_in_kegiatan === true && 
        item.created_by_me !== true
    ).length;
    
    const pendingKatimCount = kegiatanList.filter(item => 
        item.lpd_status === 'menunggu_katim'
    ).length;
    
    const pendingKabalaiCount = kegiatanList.filter(item => 
        item.lpd_status === 'menunggu_kabalai'
    ).length;
    
    const totalKabalaiData = kegiatanList.filter(item => 
        item.lpd_status === 'menunggu_kabalai' || item.lpd_status === 'selesai'
    ).length;

    return (
        <div className="max-w-[95vw] mx-auto p-6 shadow-md rounded-lg overflow-x-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Laporan Perjalanan Dinas (LPD)</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        User: {session.user?.name || session.user?.email || 'Unknown User'} | 
                        Role: {userRole || 'User'} | 
                        Type: {userType.isAdmin ? 'Admin' : userType.isPPK ? 'PPK' : userType.isKatim ? 'Katim/Kabag TU' : userType.isKabalai ? 'Kabalai' : 'Regular User'}
                    </p>
                    {userNip && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">NIP: {userNip}</p>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filter
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage(1);
                            refreshData();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center text-sm">
                    <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-medium text-green-800">Alur Persetujuan LPD:</span>
                        <p className="text-green-700 mt-1">
                            1. Isi Rincian Kegiatan dan Upload Dokumentasi → 
                            2. Kirim ke Katim/Kabag TU → 
                            3. Katim/Kabag TU Setujui → 
                            4. Kabalai Setujui → Selesai
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('milik_saya')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'milik_saya' 
                                ? 'border-blue-500 text-blue-600' 
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        Kegiatan Saya
                        {myKegiatanCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                                {myKegiatanCount}
                            </span>
                        )}
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('pegawai_lain')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'pegawai_lain' 
                                ? 'border-teal-500 text-teal-600' 
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        Kegiatan Saya & Pegawai Lain
                        {otherKegiatanCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-600">
                                {otherKegiatanCount}
                            </span>
                        )}
                    </button>
                    
                    {(userType.isKatim || userType.isAdmin) && (
                        <button
                            onClick={() => setActiveTab('approval_katim')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'approval_katim' 
                                    ? 'border-yellow-500 text-yellow-600' 
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            📋 Persetujuan Kabag TU/Katim
                            {pendingKatimCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-600">
                                    {pendingKatimCount}
                                </span>
                            )}
                        </button>
                    )}
                    
                    {(userType.isKabalai || userType.isAdmin) && (
                        <button
                            onClick={() => setActiveTab('approval_kabalai')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'approval_kabalai' 
                                    ? 'border-purple-500 text-purple-600' 
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            👔 Persetujuan Kabalai
                            {pendingKabalaiCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-600">
                                    {pendingKabalaiCount}
                                </span>
                            )}
                            {totalKabalaiData > pendingKabalaiCount && pendingKabalaiCount === 0 && totalKabalaiData > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                                    {totalKabalaiData}
                                </span>
                            )}
                        </button>
                    )}
                </nav>
            </div>

            {/* Info Tab */}
            <div className="mb-4 p-3 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center text-sm dark:text-gray-200">
                    <svg className="h-5 w-5 text-blue-500 dark:text-blue-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        {activeTab === 'milik_saya' && ' Menampilkan kegiatan yang Anda buat. Anda dapat mengisi dan mengedit LPD untuk kegiatan ini.'}
                        {activeTab === 'pegawai_lain' && ' Menampilkan kegiatan dari pegawai lain di mana Anda terdaftar sebagai pelaksana.'}
                        {activeTab === 'approval_katim' && ' Menampilkan kegiatan yang menunggu persetujuan Anda sebagai Katim/Kabag TU.'}
                        {activeTab === 'approval_kabalai' && ' Menampilkan kegiatan yang menunggu persetujuan Anda sebagai Kabalai dan riwayat kegiatan yang sudah selesai.'}
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            {showFilter && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status LPD</label>
                            <select 
                                value={filterStatus} 
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md"
                            >
                                <option value="">Semua</option>
                                <option value="selesai">Selesai</option>
                                <option value="menunggu_katim">Menunggu Verifikasi Kabag TU/Katim</option>
                                <option value="menunggu_kabalai">Menunggu Persetujuan Kabalai</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dari Tanggal ST</label>
                            <input 
                                type="date" 
                                value={filterDateFrom} 
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sampai Tanggal ST</label>
                            <input 
                                type="date" 
                                value={filterDateTo} 
                                onChange={(e) => setFilterDateTo(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MAK</label>
                            <input 
                                type="text" 
                                placeholder="Cari MAK..." 
                                value={filterMak} 
                                onChange={(e) => setFilterMak(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi</label>
                            <input 
                                type="text" 
                                placeholder="Cari Lokasi..." 
                                value={filterLokasi} 
                                onChange={(e) => setFilterLokasi(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <button onClick={resetFilter} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition">
                            Reset Filter
                        </button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{filteredKegiatan.length} data ditemukan</span>
                    </div>
                </div>
            )}

            {/* Search Box */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Cari berdasarkan Nama Kegiatan, No ST, MAK, atau Lokasi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/2 p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-300 dark:border-gray-600">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-tight cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('id')}>ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-tight cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('kegiatan')}>Kegiatan & MAK</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-tight">Pegawai Pelaksana</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-tight cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('tempat')}>Lokasi & Tanggal</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-tight cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('lpd_status')}>Status LPD</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-tight bg-gradient-to-r from-blue-600 to-blue-700">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedItems.length > 0 ? (
                                    paginatedItems.map(item => {
                                        const status = getStatusBadge(item);
                                        const isMine = item.created_by_me === true;
                                        const isExpanded = expandedPegawai[item.id] || false;
                                        const lpdStatus = item.lpd_status || 'draft';
                                        const isReadyToSend = item.has_rincian && item.has_dokumentasi && 
                                            (lpdStatus === 'draft' || lpdStatus === null || lpdStatus === 'ditolak_katim' || lpdStatus === 'ditolak_kabalai');
                                        const isWaitingKatim = lpdStatus === 'menunggu_katim';
                                        const isWaitingKabalai = lpdStatus === 'menunggu_kabalai';
                                        const isSelesai = lpdStatus === 'selesai';
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-4 py-4 align-top">{item.id}</td>
                                                
                                                <td className="px-4 py-4 align-top">
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.kegiatan || '-'}</div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">MAK: {item.mak || '-'}</div>
                                                        {item.no_st && <div className="text-xs text-gray-500">No ST: {item.no_st}</div>}
                                                        {!isMine && (activeTab === 'pegawai_lain' || activeTab === 'approval_katim' || activeTab === 'approval_kabalai') && (
                                                            <div className="text-xs text-purple-600 mt-1">Dibuat oleh: Pegawai Lain</div>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-4 py-4 align-top">{formatPegawaiList(item.id, isExpanded)}</td>
                                                
                                                <td className="px-4 py-4 align-top">
                                                    <div className="space-y-1">
                                                        <div className="text-sm">{item.tempat || '-'}</div>
                                                        <div className="text-xs text-gray-500">{item.tgl_st && `ST: ${formatDateForDisplay(item.tgl_st)}`}</div>
                                                        {(item.tgl_mulai || item.tgl_selesai) && (
                                                            <div className="text-xs text-gray-500">
                                                                Pelaksanaan: {item.tgl_mulai && formatDateForDisplay(item.tgl_mulai)}
                                                                {item.tgl_selesai && ` - ${formatDateForDisplay(item.tgl_selesai)}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-4 py-4 text-center align-top">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${status.color}`}>{status.text}</span>
                                                        {lpdStatus === 'menunggu_katim' && item.katim_nama && <span className="text-xs text-gray-500">Kepada: {item.katim_nama}</span>}
                                                        {lpdStatus === 'menunggu_kabalai' && item.kabalai_nama && <span className="text-xs text-gray-500 dark:text-gray-400">Kepada: {item.kabalai_nama}</span>}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-4 py-4 text-center align-top">
                                                    <div className="flex flex-col gap-2">
                                                        {/* TOMBOL LIHAT LPD */}
                                                        <button 
                                                            onClick={() => handleLihatLPD(item)} 
                                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center gap-1 mx-auto text-sm"
                                                            title="Lihat detail LPD"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            Lihat LPD
                                                        </button>
                                                        
                                                        {/* TOMBOL CETAK LPD */}
                                                        <button 
                                                            onClick={() => handlePrintLPD(item)} 
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-1 mx-auto text-sm"
                                                            title="Cetak LPD"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                            Cetak LPD
                                                        </button>
                                                        
                                                        {(activeTab === 'milik_saya' || activeTab === 'pegawai_lain') && (isMine || userType.isAdmin || item.is_pegawai_in_kegiatan) ? (
                                                            <>
                                                                {lpdStatus !== 'menunggu_katim' && (
                                                                    <button onClick={() => fetchLpdData(item.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center gap-1 mx-auto text-sm">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                        </svg>
                                                                        {isSelesai ? 'Lihat Laporan' : (isReadyToSend ? 'Isi LPD' : 'Lanjutkan Isi')}
                                                                    </button>
                                                                )}
                                                                
                                                                {isReadyToSend && lpdStatus !== 'menunggu_katim' && (
                                                                    <button onClick={() => handleKirimKeKatim(item)} className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center gap-1 mx-auto text-sm">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                        </svg>
                                                                        Kirim ke Katim
                                                                    </button>
                                                                )}
                                                                
                                                                {lpdStatus === 'menunggu_katim' && (
                                                                    <div className="text-center text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">
                                                                        ⏳ Menunggu Persetujuan Kabag TU / Katim
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (activeTab === 'milik_saya' || activeTab === 'pegawai_lain') ? (
                                                            <button onClick={() => fetchLpdData(item.id)} className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition flex items-center gap-1 mx-auto text-sm">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                Lihat Laporan
                                                            </button>
                                                        ) : null}
                                                        
                                                        {activeTab === 'approval_katim' && item.lpd_status === 'menunggu_katim' && (
                                                            <button onClick={() => handlePersetujuanKatim(item)} className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition flex items-center gap-1 mx-auto text-sm">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Setujui / Tolak LPD (Katim)
                                                            </button>
                                                        )}

                                                        {activeTab === 'approval_katim' && item.lpd_status === 'menunggu_kabalai' && (
                                                            <div className="text-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                                                ✓ Sudah disetujui, menunggu persetujuan Kabalai
                                                            </div>
                                                        )}

                                                        {activeTab === 'approval_katim' && item.lpd_status === 'selesai' && (
                                                            <div className="text-center text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                                                ✓ LPD Selesai
                                                            </div>
                                                        )}
                                                        
                                                        {activeTab === 'approval_kabalai' && item.lpd_status === 'menunggu_kabalai' && (
                                                            <button onClick={() => handlePersetujuanKabalai(item)} className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center gap-1 mx-auto text-sm">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Setujui / Tolak LPD (Kabalai)
                                                            </button>
                                                        )}

                                                        {activeTab === 'approval_kabalai' && item.lpd_status === 'selesai' && (
                                                            <div className="text-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-md mx-auto">
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    ✓ LPD Selesai
                                                                </div>
                                                                {item.kabalai_tgl_ttd && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        Disetujui: {formatDateForDisplay(item.kabalai_tgl_ttd)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <svg className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>
                                                {activeTab === 'milik_saya' && 'Belum ada kegiatan yang Anda buat dengan status Selesai'}
                                                {activeTab === 'pegawai_lain' && 'Belum ada kegiatan dari pegawai lain di mana Anda terdaftar sebagai pelaksana.'}
                                                {activeTab === 'approval_katim' && 'Tidak ada kegiatan yang menunggu persetujuan Katim'}
                                                {activeTab === 'approval_kabalai' && 'Tidak ada kegiatan yang menunggu persetujuan Kabalai'}
                                            </p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                {activeTab === 'approval_katim' && 'Kegiatan yang sudah dikirim akan muncul di sini (menunggu_katim).'}
                                                {activeTab === 'approval_kabalai' && 'Kegiatan yang sudah disetujui Katim akan muncul di sini.'}
                                                {(activeTab === 'milik_saya' || activeTab === 'pegawai_lain') && 'Kegiatan dengan status "Selesai" akan muncul di sini setelah LPD diisi.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} kegiatan
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 dark:text-gray-200">Previous</button>
                                <span className="px-3 py-2 dark:text-gray-300">Halaman {currentPage} dari {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 dark:text-gray-200">Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            <LihatLPDModal
                show={showLihatLPDModal}
                onClose={() => {
                    setShowLihatLPDModal(false);
                    setSelectedKegiatanForLihat(null);
                }}
                kegiatanId={selectedKegiatanForLihat?.id}
                kegiatanNama={selectedKegiatanForLihat?.kegiatan}
                session={session}
            />

            <KirimKeKatimModal
                show={showKirimKeKatimModal}
                onClose={() => {
                    setShowKirimKeKatimModal(false);
                    setSelectedKegiatanForKirim(null);
                }}
                kegiatanId={selectedKegiatanForKirim?.id}
                kegiatanNama={selectedKegiatanForKirim?.kegiatan}
                onSuccess={(message) => {
                    setNotificationMessage(message);
                    setModalOpen(true);
                    refreshData();
                }}
                session={session}
            />

            <PersetujuanKatimModal
                show={showPersetujuanKatimModal}
                onClose={() => {
                    setShowPersetujuanKatimModal(false);
                    setSelectedKegiatanForKatim(null);
                }}
                kegiatanId={selectedKegiatanForKatim?.id}
                kegiatanNama={selectedKegiatanForKatim?.kegiatan}
                onSuccess={(message) => {
                    setNotificationMessage(message);
                    setModalOpen(true);
                    refreshData();
                }}
                session={session}
            />

            <PersetujuanKabalaiModal
                show={showPersetujuanKabalaiModal}
                onClose={() => {
                    setShowPersetujuanKabalaiModal(false);
                    setSelectedKegiatanForKabalai(null);
                }}
                kegiatanId={selectedKegiatanForKabalai?.id}
                kegiatanNama={selectedKegiatanForKabalai?.kegiatan}
                onSuccess={(message) => {
                    setNotificationMessage(message);
                    setModalOpen(true);
                    refreshData();
                }}
                session={session}
            />

            <NotificationModal show={modalOpen} message={notificationMessage} onClose={closeNotificationModal} />
        </div>
    );
}