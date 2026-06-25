import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import axios from 'axios';

import KegiatanForm from './KegiatanForm';
import KegiatanTable from './KegiatanTable';
import FilterSection from './FilterSection';
import NotificationModal from '../common/NotificationModal';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';
import KirimPPKModal from './modals/KirimPPKModal';
import MengetahuiModal from './modals/MengetahuiModal';
import PersetujuanModal from './modals/PersetujuanModal';
import HistoriModal from './modals/HistoriModal';
import SuratTugasModal from './modals/SuratTugasModal';
import Status2Modal from './modals/Status2Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { handlePrint } from '../../utils/printUtils';
import { formatRupiah, formatDateForDisplay } from '../../utils/formatters';

const ITEMS_PER_PAGE = 10;

export default function KegiatanContainer({ session, status }) {
    const router = useRouter();
    
    // State utama
    const [kegiatanList, setKegiatanList] = useState([]);
    const [filteredKegiatan, setFilteredKegiatan] = useState([]);
    const [detailShown, setDetailShown] = useState({});
    const [detailData, setDetailData] = useState({});
    const [pegawaiDetailShown, setPegawaiDetailShown] = useState({});
    
    const isFilterChanging = useRef(false);
    const previousFilterString = useRef('');
    const formContainerRef = useRef(null);
    
    // State form
    const defaultFormData = {
        kegiatan: '',
        mak: '',
        realisasi_anggaran_sebelumnya: '',
        target_output_tahun: '',
        realisasi_output_sebelumnya: '',
        target_output_yg_akan_dicapai: '',
        kota_kab_kecamatan: '',
        rencana_tanggal_pelaksanaan: '',
        rencana_tanggal_pelaksanaan_akhir: '',
        user_id: ''
    };

    const defaultPegawaiList = [
        {
            nama: '',
            nip: '',
            pangkat: '',
            jabatan: '',
            total_biaya: 0,
            biaya: [{
                transportasi: [{ trans: '', harga: '', total: '' }],
                uang_harian_items: [{ jenis: '', qty: '', harga: '', total: '' }],
                penginapan_items: [{ jenis: '', qty: '', harga: '', total: '' }]
            }]
        }
    ];

    const [showForm, setShowForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [pegawaiList, setPegawaiList] = useState(defaultPegawaiList);
    
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    
    const [showFilter, setShowFilter] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterJenisSpm, setFilterJenisSpm] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterMak, setFilterMak] = useState('');
    const [filterLokasi, setFilterLokasi] = useState('');
    const [filterStatus2, setFilterStatus2] = useState('');
    const [filterCatatanStatus2, setFilterCatatanStatus2] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    
    const [showKirimPPKModal, setShowKirimPPKModal] = useState(false);
    const [selectedKegiatanForPPK, setSelectedKegiatanForPPK] = useState(null);
    const [showMengetahuiModal, setShowMengetahuiModal] = useState(false);
    const [selectedKegiatanForPersetujuan, setSelectedKegiatanForPersetujuan] = useState(null);
    const [showPersetujuanModal, setShowPersetujuanModal] = useState(false);
    const [selectedKegiatanForMengetahui, setSelectedKegiatanForMengetahui] = useState(null);
    
    const [showSuratTugasModal, setShowSuratTugasModal] = useState(false);
    const [selectedKegiatanForST, setSelectedKegiatanForST] = useState(null);
    
    const [showHistoriModal, setShowHistoriModal] = useState(false);
    const [selectedHistoriItem, setSelectedHistoriItem] = useState(null);

    const [showStatus2Modal, setShowStatus2Modal] = useState(false);
    const [selectedStatus2Item, setSelectedStatus2Item] = useState(null);
    const [status2Loading, setStatus2Loading] = useState(false);
    
    const [userRole, setUserRole] = useState('');
    const [userType, setUserType] = useState({
        isAdmin: false,
        isPPK: false,
        isKabalai: false,
        isRegularUser: false
    });

    const hasValidStatus2 = (status2) => {
        return status2 !== undefined && 
               status2 !== null && 
               status2 !== '' && 
               String(status2).trim().length > 0;
    };

    const getStatus2Color = (status2) => {
        if (!status2) return 'bg-gray-100 text-gray-600 border-gray-200';
        
        const statusLower = status2.toLowerCase();
        if (statusLower === 'selesai') {
            return 'bg-green-100 text-green-800 border-green-200';
        } else if (statusLower === 'diproses' || statusLower === 'proses') {
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else {
            return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const renderStatusBadge = (status, no_st = null, tgl_st = null) => {
        let bgColor = '';
        let textColor = '';
        let displayText = '';
        let icon = null;
        
        const hasNoST = no_st && String(no_st).trim().length > 0;
        const hasTglST = tgl_st && String(tgl_st).trim().length > 0;
        const isSuratTugasComplete = hasNoST && hasTglST;
        
        if (isSuratTugasComplete) {
            bgColor = 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300';
            textColor = 'text-green-800';
            displayText = 'Selesai';
            icon = (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            );
        } else {
            switch (status) {
                case 'draft':
                    bgColor = 'bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300';
                    textColor = 'text-gray-700';
                    displayText = 'Draft';
                    break;
                case 'diajukan':
                    bgColor = 'bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-300';
                    textColor = 'text-amber-800';
                    displayText = 'Diajukan';
                    break;
                case 'disetujui':
                    bgColor = 'bg-gradient-to-r from-blue-100 to-sky-100 border border-blue-300';
                    textColor = 'text-blue-800';
                    displayText = 'Disetujui';
                    break;
                case 'diketahui':
                    bgColor = 'bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-300';
                    textColor = 'text-indigo-800';
                    displayText = 'Diketahui';
                    break;
                case 'dikembalikan':
                    bgColor = 'bg-gradient-to-r from-rose-100 to-red-100 border border-rose-300';
                    textColor = 'text-rose-800';
                    displayText = 'Dikembalikan';
                    break;
                case 'selesai':
                    bgColor = 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300';
                    textColor = 'text-green-800';
                    displayText = 'Selesai';
                    break;
                default:
                    bgColor = 'bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300';
                    textColor = 'text-gray-700';
                    displayText = status || 'Draft';
            }
        }
        
        return (
            <span className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center ${bgColor} ${textColor} shadow-sm`}>
                {icon}
                {displayText}
            </span>
        );
    };

    const scrollToFormAndFocus = () => {
        setTimeout(() => {
            if (formContainerRef.current) {
                formContainerRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                setTimeout(() => {
                    const firstInput = document.querySelector('input[name="kegiatan"]');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 500);
            }
        }, 100);
    };

    const handleOpenHistoriModal = (item) => {
        setSelectedHistoriItem(item);
        setShowHistoriModal(true);
    };

    const handleCloseHistoriModal = () => {
        setShowHistoriModal(false);
        setSelectedHistoriItem(null);
    };

    const handleOpenStatus2Modal = (item) => {
        setSelectedStatus2Item(item);
        setShowStatus2Modal(true);
    };

    const handleCloseStatus2Modal = () => {
        setShowStatus2Modal(false);
        setSelectedStatus2Item(null);
        setStatus2Loading(false);
    };

    const handleSaveStatus2 = async (data) => {
        try {
            setStatus2Loading(true);
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${data.id}/status2`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    status_2: data.status_2,
                    catatan_status_2: data.catatan_status_2 || ''
                })
            });

            const result = await response.json();
            
            if (result.success) {
                setKegiatanList(prevItems => 
                    prevItems.map(item => 
                        item.id === data.id 
                            ? { 
                                ...item, 
                                status_2: data.status_2,
                                catatan_status_2: data.catatan_status_2,
                                updated_at: new Date().toISOString()
                            }
                            : item
                    )
                );
                
                setFilteredKegiatan(prevItems => 
                    prevItems.map(item => 
                        item.id === data.id 
                            ? { 
                                ...item, 
                                status_2: data.status_2,
                                catatan_status_2: data.catatan_status_2,
                                updated_at: new Date().toISOString()
                            }
                            : item
                    )
                );
                
                setNotificationMessage(`Status 2 berhasil diperbarui: "${data.status_2}"`);
                setModalOpen(true);
                handleCloseStatus2Modal();
            } else {
                setNotificationMessage(`Gagal update: ${result.message}`);
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Error saving status2:', error);
            setNotificationMessage('Terjadi kesalahan saat menyimpan status 2');
            setModalOpen(true);
        } finally {
            setStatus2Loading(false);
        }
    };

    // Calculate total nominatif
    const calculateTotalNominatif = async (id) => {
        try {
            let data = detailData[id];
            if (!data) {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${id}/detail`, {
                    headers: { 
                        Authorization: `Bearer ${session?.accessToken}` 
                    },
                });
                if (res.data.success) {
                    data = res.data.data;
                    setDetailData(prev => ({ ...prev, [id]: data }));
                }
            }

            if (data && data.pegawai) {
                let total = 0;
                const pegawaiListData = data.pegawai || [];
                
                for (const pegawai of pegawaiListData) {
                    if (pegawai.biaya_list) {
                        for (const biaya of pegawai.biaya_list) {
                            for (const t of biaya.transportasi || []) {
                                total += Number(t.total || 0);
                            }
                            for (const u of biaya.uang_harian || []) {
                                total += Number(u.total || 0);
                            }
                            for (const p of biaya.penginapan || []) {
                                total += Number(p.total || 0);
                            }
                        }
                    } else if (pegawai.biaya) {
                        for (const biaya of pegawai.biaya) {
                            for (const t of biaya.transportasi || []) {
                                total += Number(t.total || 0);
                            }
                            for (const u of biaya.uang_harian_items || []) {
                                total += Number(u.total || 0);
                            }
                            for (const p of biaya.penginapan_items || []) {
                                total += Number(p.total || 0);
                            }
                        }
                    }
                }

                setKegiatanList(prev =>
                    prev.map(k => (k.id === id ? { ...k, total_nominatif: total } : k))
                );
                setFilteredKegiatan(prev =>
                    prev.map(k => (k.id === id ? { ...k, total_nominatif: total } : k))
                );
            }
        } catch (error) {
            console.error('Error calculating total nominatif:', error);
            setNotificationMessage('Gagal menghitung total nominatif!');
            setModalOpen(true);
        }
    };

    const handleOpenKirimPPKModal = (id) => {
        setSelectedKegiatanForPPK(id);
        setShowKirimPPKModal(true);
    };

    const handleOpenMengetahuiModal = (id, kegiatanData) => {
        setSelectedKegiatanForPersetujuan({ id, ...kegiatanData });
        setShowMengetahuiModal(true);
    };

    const handleOpenPersetujuanModal = (id, kegiatanData) => {
        setSelectedKegiatanForMengetahui({ id, ...kegiatanData });
        setShowPersetujuanModal(true);
    };

    const handleOpenSuratTugasModal = (item) => {
        if (!userType.isRegularUser) {
            setNotificationMessage('Hanya user biasa yang dapat merekam surat tugas');
            setModalOpen(true);
            return;
        }
        
        if (item.status !== 'disetujui') {
            setNotificationMessage(`Kegiatan dengan status "${item.status}" tidak dapat direkam surat tugas.`);
            setModalOpen(true);
            return;
        }
        
        if (item.no_st && item.no_st.trim().length > 0) {
            setNotificationMessage('Surat Tugas sudah direkam sebelumnya');
            setModalOpen(true);
            return;
        }
        
        setSelectedKegiatanForST(item);
        setShowSuratTugasModal(true);
    };

    // Extract user info dari session
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
            const isKabalai = roles.some(role => role.toLowerCase().includes('kabalai'));
            const isRegularUser = !isAdmin && !isPPK && !isKabalai;
            
            setUserType({
                isAdmin,
                isPPK,
                isKabalai,
                isRegularUser
            });
        }
    }, [session]);

    // Fetch data kegiatan - hanya dijalankan sekali saat mount
    useEffect(() => {
        const fetchData = async () => {
            if (status === 'loading') {
                return;
            }
            
            if (!session) {
                router.push('/login');
                return;
            }
            
            await fetchKegiatan();
        };

        fetchData();
    }, [session, status]);

    // Fetch data kegiatan
    const fetchKegiatan = async (showLoading = false) => {
        if (!session?.accessToken) {
            console.error('No access token available');
            setNotificationMessage('Token tidak ditemukan. Silakan login kembali.');
            setModalOpen(true);
            router.push('/login');
            return;
        }

        if (showLoading) {
            setFormLoading(true);
        }

        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan`, {
                headers: { 
                    Authorization: `Bearer ${session.accessToken}` 
                },
                timeout: 10000
            });
            
            if (res.data.success && Array.isArray(res.data.data)) {
                const sortedData = [...res.data.data].sort((a, b) => {
                    return new Date(b.created_at || b.id) - new Date(a.created_at || a.id);
                });
                
                setKegiatanList(sortedData);
                setFilteredKegiatan(sortedData);
                setDetailData({});
                setDetailShown({});
                setPegawaiDetailShown({});
                
                if (showLoading) {
                    setCurrentPage(1);
                }
            } else {
                setKegiatanList([]);
                setFilteredKegiatan([]);
            }
        } catch (error) {
            console.error('Error fetching kegiatan:', error);
            
            if (error.response?.status === 401) {
                setNotificationMessage('Session expired. Silakan login kembali.');
                setModalOpen(true);
                localStorage.removeItem('token');
                localStorage.removeItem('access_token');
                sessionStorage.removeItem('token');
                await signOut({ callbackUrl: '/login' });
            } else {
                setNotificationMessage('Gagal memuat data kegiatan. Silakan coba lagi.');
                setModalOpen(true);
            }
            
            setKegiatanList([]);
            setFilteredKegiatan([]);
        } finally {
            if (showLoading) {
                setFormLoading(false);
            }
        }
    };

    const resetFormCompletely = () => {
        setFormData({ ...defaultFormData });
        setPegawaiList(JSON.parse(JSON.stringify(defaultPegawaiList)));
        setIsEditMode(false);
        setEditId(null);
        setFormError('');
        setFormLoading(false);
    };

    const resetForm = () => {
        resetFormCompletely();
        setShowForm(false);
    };

    const handleOpenNewForm = () => {
        if (showForm) {
            resetForm();
        } else {
            resetFormCompletely();
            setShowForm(true);
            scrollToFormAndFocus();
        }
    };

    // ========== PERBAIKAN UTAMA: handleSubmit dengan pangkat ==========
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        setFormLoading(true);
        setFormError('');

        try {
            if (!session?.accessToken) {
                setNotificationMessage('Token tidak ditemukan. Silakan login kembali.');
                setModalOpen(true);
                router.push('/login');
                return;
            }

            if (!formData.kegiatan.trim()) {
                setFormError('Nama Kegiatan wajib diisi');
                setFormLoading(false);
                return;
            }

            if (!formData.mak.trim()) {
                setFormError('MAK wajib diisi');
                setFormLoading(false);
                return;
            }

            // 🔥 PERBAIKAN: Tambahkan field pangkat ke setiap pegawai
            const payload = {
                ...formData,
                pegawai: pegawaiList.map(pegawai => ({
                    nama: pegawai.nama || '',
                    nip: pegawai.nip || '',
                    pangkat: pegawai.pangkat || '',  // ← TAMBAHKAN INI
                    jabatan: pegawai.jabatan || '',
                    total_biaya: pegawai.total_biaya || 0,
                    biaya: pegawai.biaya.map(biaya => ({
                        transportasi: (biaya.transportasi || [])
                            .filter(t => t.trans || t.harga || t.total)
                            .map(t => ({
                                trans: t.trans || '',
                                harga: Number(t.harga) || 0,
                                total: Number(t.total) || 0
                            })),
                        uang_harian_items: (biaya.uang_harian_items || [])
                            .filter(u => u.jenis || u.qty || u.harga || u.total)
                            .map(u => ({
                                jenis: u.jenis || '',
                                qty: Number(u.qty) || 0,
                                harga: Number(u.harga) || 0,
                                total: Number(u.total) || 0
                            })),
                        penginapan_items: (biaya.penginapan_items || [])
                            .filter(p => p.jenis || p.qty || p.harga || p.total)
                            .map(p => ({
                                jenis: p.jenis || '',
                                qty: Number(p.qty) || 0,
                                harga: Number(p.harga) || 0,
                                total: Number(p.total) || 0
                            }))
                    }))
                }))
            };

            let response;
            
            if (isEditMode && editId) {
                response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${editId}`, payload, {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan`, payload, {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            setNotificationMessage(response.data.message || (isEditMode ? 'Data berhasil diperbarui!' : 'Kegiatan berhasil ditambahkan!'));
            setModalOpen(true);
            resetForm();
            
            setTimeout(() => {
                fetchKegiatan(true);
            }, 500);
        } catch (error) {
            console.error('Error saving kegiatan:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan saat menyimpan data';
            setFormError(errorMsg);
        } finally {
            setFormLoading(false);
        }
    };

    // ========== PERBAIKAN: loadDataForEdit dengan pangkat ==========
    const loadDataForEdit = async (id) => {
        try {
            setFormLoading(true);
            setFormError('');
            
            if (!session?.accessToken) {
                setNotificationMessage('Token tidak ditemukan. Silakan login kembali.');
                setModalOpen(true);
                router.push('/login');
                return;
            }

            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${id}/edit`, {
                headers: { 
                    Authorization: `Bearer ${session.accessToken}` 
                }
            });

            if (response.data.success) {
                const data = response.data.data;
                
                setEditId(id);
                setIsEditMode(true);
                setShowForm(true);
                
                setFormData({
                    kegiatan: data.kegiatan || '',
                    mak: data.mak || '',
                    realisasi_anggaran_sebelumnya: data.realisasi_anggaran_sebelumnya || '',
                    target_output_tahun: data.target_output_tahun || '',
                    realisasi_output_sebelumnya: data.realisasi_output_sebelumnya || '',
                    target_output_yg_akan_dicapai: data.target_output_yg_akan_dicapai || '',
                    kota_kab_kecamatan: data.kota_kab_kecamatan || '',
                    rencana_tanggal_pelaksanaan: data.rencana_tanggal_pelaksanaan || '',
                    rencana_tanggal_pelaksanaan_akhir: data.rencana_tanggal_pelaksanaan_akhir || '',
                    user_id: data.user_id || '',
                });

                if (data.pegawai && data.pegawai.length > 0) {
                    const formattedPegawai = data.pegawai.map(p => ({
                        id: p.id,
                        nama: p.nama || '',
                        nip: p.nip || '',
                        pangkat: p.pangkat || '',  // ← TAMBAHKAN INI
                        jabatan: p.jabatan || '',
                        total_biaya: p.total_biaya || 0,
                        biaya: p.biaya && p.biaya.length > 0 ? p.biaya.map(b => {
                            return {
                                transportasi: b.transportasi && b.transportasi.length > 0 
                                    ? b.transportasi.map(t => ({
                                        trans: t.trans || '',
                                        harga: t.harga || 0,
                                        total: t.total || 0
                                    }))
                                    : [{ trans: '', harga: '', total: '' }],
                                uang_harian_items: b.uang_harian_items && b.uang_harian_items.length > 0
                                    ? b.uang_harian_items.map(u => ({
                                        jenis: u.jenis || '',
                                        qty: u.qty || 0,
                                        harga: u.harga || 0,
                                        total: u.total || 0
                                    }))
                                    : [{ jenis: '', qty: '', harga: '', total: '' }],
                                penginapan_items: b.penginapan_items && b.penginapan_items.length > 0
                                    ? b.penginapan_items.map(pg => ({
                                        jenis: pg.jenis || '',
                                        qty: pg.qty || 0,
                                        harga: pg.harga || 0,
                                        total: pg.total || 0
                                    }))
                                    : [{ jenis: '', qty: '', harga: '', total: '' }]
                            };
                        }) 
                        : [{
                            transportasi: [{ trans: '', harga: '', total: '' }],
                            uang_harian_items: [{ jenis: '', qty: '', harga: '', total: '' }],
                            penginapan_items: [{ jenis: '', qty: '', harga: '', total: '' }]
                        }]
                    }));
                    setPegawaiList(formattedPegawai);
                } else {
                    setPegawaiList(JSON.parse(JSON.stringify(defaultPegawaiList)));
                }
                
                scrollToFormAndFocus();
            }
        } catch (error) {
            console.error('Error loading data for edit:', error);
            setFormError('Gagal memuat data untuk edit');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = (id) => {
        loadDataForEdit(id);
    };

    const handleDelete = (id) => {
        setItemToDelete(id);
        setConfirmDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !session?.accessToken) {
            return;
        }
        
        setDeletingId(itemToDelete);
        
        try {
            const response = await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${itemToDelete}`, 
                {
                    headers: { 
                        Authorization: `Bearer ${session.accessToken}` 
                    },
                    timeout: 10000
                }
            );
            
            if (response.data.success) {
                setNotificationMessage(response.data.message || 'Kegiatan berhasil dihapus!');
                setConfirmDeleteModalOpen(false);
                fetchKegiatan();
            } else {
                throw new Error(response.data.message || 'Gagal menghapus kegiatan');
            }
        } catch (error) {
            console.error('Error details:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan saat menghapus kegiatan!';
            setNotificationMessage(errorMessage);
            setConfirmDeleteModalOpen(false);
        } finally {
            setDeletingId(null);
            setItemToDelete(null);
        }
        
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setConfirmDeleteModalOpen(false);
        setDeletingId(null);
        setItemToDelete(null);
    };

    // toggleDetail dengan endpoint yang benar
    const toggleDetail = async (id) => {
        const newDetailShown = { ...detailShown, [id]: !detailShown[id] };
        setDetailShown(newDetailShown);

        if (newDetailShown[id] && !detailData[id]) {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${id}/detail`, {
                    headers: { 
                        Authorization: `Bearer ${session?.accessToken}` 
                    },
                    timeout: 10000
                });
                
                if (res.data.success) {
                    setDetailData(prev => ({ ...prev, [id]: res.data.data }));
                } else {
                    console.error('API returned success false:', res.data);
                    setNotificationMessage(res.data.message || 'Gagal memuat detail kegiatan');
                    setModalOpen(true);
                }
            } catch (error) {
                console.error('Error fetching detail:', error);
                
                let errorMessage = 'Gagal memuat detail kegiatan';
                if (error.response?.status === 404) {
                    errorMessage = 'Endpoint API tidak ditemukan. Silakan hubungi administrator.';
                } else if (error.response?.status === 401) {
                    errorMessage = 'Session expired. Silakan refresh halaman.';
                } else if (error.code === 'ECONNABORTED') {
                    errorMessage = 'Timeout koneksi. Silakan coba lagi.';
                }
                
                setNotificationMessage(errorMessage);
                setModalOpen(true);
                
                setDetailShown(prev => ({ ...prev, [id]: false }));
            }
        }
    };

    const togglePegawaiDetail = (id) => {
        setPegawaiDetailShown(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePrintItem = async (item, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        try {
            await calculateTotalNominatif(item.id);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            let data = detailData[item.id];
            if (!data) {
                try {
                    const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${item.id}/detail`, {
                        headers: { 
                            Authorization: `Bearer ${session?.accessToken}` 
                        },
                        timeout: 10000
                    });
                    if (res.data.success) {
                        data = res.data.data;
                        setDetailData(prev => ({ ...prev, [item.id]: data }));
                    }
                } catch (error) {
                    console.error('Error mengambil detail data:', error);
                }
            }
            
            const pegawaiListData = data?.pegawai || [];
            setTimeout(() => {
                handlePrint(item, pegawaiListData);
            }, 100);
        } catch (error) {
            console.error('Error dalam proses print:', error);
            handlePrint(item, []);
        }
    };

    // PERBAIKAN: Filter effect dengan filter tanggal yang benar
    useEffect(() => {
        const filtered = kegiatanList.filter(item => {
            const matchesSearch = 
                item.kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.mak?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.no_st && item.no_st.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = !filterStatus || item.status === filterStatus;
            const matchesJenisSpm = !filterJenisSpm || item.jenis_spm === filterJenisSpm;
            const matchesMak = !filterMak || item.mak?.toLowerCase().includes(filterMak.toLowerCase());
            const matchesLokasi = !filterLokasi || item.kota_kab_kecamatan?.toLowerCase().includes(filterLokasi.toLowerCase());
            
            let matchesStatus2 = true;
            if (filterStatus2) {
                if (filterStatus2 === 'Belum diisi') {
                    matchesStatus2 = !item.status_2 || 
                                     item.status_2 === null || 
                                     item.status_2 === undefined || 
                                     String(item.status_2).trim() === '';
                } else {
                    matchesStatus2 = item.status_2 && 
                                     String(item.status_2).toUpperCase() === filterStatus2.toUpperCase();
                }
            }
            
            const matchesCatatanStatus2 = !filterCatatanStatus2 || 
                (item.catatan_status_2 && item.catatan_status_2.toLowerCase().includes(filterCatatanStatus2.toLowerCase()));
            
            // PERBAIKAN: Filter tanggal menggunakan rencana_tanggal_pelaksanaan
            let matchesDate = true;
            if (filterDateFrom || filterDateTo) {
                // Gunakan rencana_tanggal_pelaksanaan untuk filter
                const itemDate = item.rencana_tanggal_pelaksanaan ? new Date(item.rencana_tanggal_pelaksanaan) : null;
                const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
                const toDate = filterDateTo ? new Date(filterDateTo) : null;
                
                // Set waktu ke 00:00:00 untuk perbandingan yang akurat
                if (fromDate) {
                    fromDate.setHours(0, 0, 0, 0);
                }
                if (toDate) {
                    toDate.setHours(23, 59, 59, 999);
                }
                
                if (itemDate) {
                    itemDate.setHours(12, 0, 0, 0); // Set ke tengah hari untuk menghindari masalah timezone
                    
                    if (fromDate && toDate) {
                        matchesDate = itemDate >= fromDate && itemDate <= toDate;
                    } else if (fromDate) {
                        matchesDate = itemDate >= fromDate;
                    } else if (toDate) {
                        matchesDate = itemDate <= toDate;
                    }
                } else {
                    matchesDate = false; // Jika tidak ada tanggal, tidak masuk filter
                }
            }
            
            return matchesSearch && matchesStatus && matchesJenisSpm && matchesMak && matchesLokasi && matchesDate && matchesStatus2 && matchesCatatanStatus2;
        });
        
        setFilteredKegiatan(filtered);
        
        const currentFilterString = JSON.stringify({
            searchTerm, filterStatus, filterJenisSpm, filterDateFrom, filterDateTo,
            filterMak, filterLokasi, filterStatus2, filterCatatanStatus2
        });
        
        if (previousFilterString.current !== currentFilterString) {
            setCurrentPage(1);
            previousFilterString.current = currentFilterString;
        }
        
    }, [searchTerm, kegiatanList, filterStatus, filterJenisSpm, filterDateFrom, filterDateTo, filterMak, filterLokasi, filterStatus2, filterCatatanStatus2]);

    const resetFilter = () => {
        setFilterStatus('');
        setFilterJenisSpm('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterMak('');
        setFilterLokasi('');
        setFilterStatus2('');
        setFilterCatatanStatus2('');
        setCurrentPage(1);
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        const sorted = [...filteredKegiatan].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
            return 0;
        });
        setFilteredKegiatan(sorted);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
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

    return (
        <div className="max-w-[95vw] mx-auto p-6 shadow-md rounded-lg overflow-x-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Nominatif Kegiatan</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        User: {session.user?.name || session.user?.email || 'Unknown User'} | 
                        Role: {userRole || 'User'} | 
                        Type: {userType.isAdmin ? 'Admin' : userType.isPPK ? 'PPK' : userType.isKabalai ? 'Kabalai' : 'Regular User'}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filter
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage(1);
                            fetchKegiatan(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
                        disabled={formLoading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    {userType.isRegularUser && (
                        <button
                            onClick={handleOpenNewForm}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center"
                        >
                            {showForm ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Tutup Form
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Tambah Kegiatan Baru
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Section */}
            <FilterSection
                showFilter={showFilter}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterJenisSpm={filterJenisSpm}
                setFilterJenisSpm={setFilterJenisSpm}
                filterDateFrom={filterDateFrom}
                setFilterDateFrom={setFilterDateFrom}
                filterDateTo={filterDateTo}
                setFilterDateTo={setFilterDateTo}
                filterMak={filterMak}
                setFilterMak={setFilterMak}
                filterLokasi={filterLokasi}
                setFilterLokasi={setFilterLokasi}
                filterStatus2={filterStatus2}
                setFilterStatus2={setFilterStatus2}
                filterCatatanStatus2={filterCatatanStatus2}
                setFilterCatatanStatus2={setFilterCatatanStatus2}
                resetFilter={resetFilter}
                filteredKegiatan={filteredKegiatan}
                kegiatanList={kegiatanList}
            />

            {/* Form Container */}
            <div ref={formContainerRef}>
                {showForm && userType.isRegularUser && (
                    <KegiatanForm
                        editId={editId}
                        isEditMode={isEditMode}
                        formData={formData}
                        setFormData={setFormData}
                        pegawaiList={pegawaiList}
                        setPegawaiList={setPegawaiList}
                        session={session}
                        onCancel={resetForm}
                        onSubmit={handleSubmit}
                        formError={formError}
                        setFormError={setFormError}
                        formLoading={formLoading}
                        setFormLoading={setFormLoading}
                    />
                )}
            </div>

            {showForm && !userType.isRegularUser && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-red-700">
                            Hanya user biasa yang dapat membuat atau mengedit kegiatan.
                        </p>
                    </div>
                </div>
            )}

            {/* Search Box */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by Kegiatan, No ST, atau MAK"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full md:w-1/3 p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Informasi role user */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-center text-sm dark:text-gray-200">
                    <svg className="h-5 w-5 text-blue-500 dark:text-blue-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-medium">Akses saat ini:</span> 
                        {userType.isAdmin && ' Anda dapat melihat semua data sebagai Admin.'}
                        {userType.isPPK && ' Anda dapat melihat pengajuan yang ditujukan kepada PPK Anda.'}
                        {userType.isKabalai && ' Anda dapat mengisi form "Menyetujui" untuk kegiatan yang sudah disetujui PPK.'}
                        {userType.isRegularUser && ' Anda hanya dapat melihat dan mengelola data yang Anda buat sendiri.'}
                    </div>
                </div>
            </div>

            {/* Active Filters */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Filter Aktif:</div>
                <div className="flex flex-wrap gap-2">
                    {filterStatus && (
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm rounded-full">
                            Status: {filterStatus}
                        </span>
                    )}
                    {filterStatus2 && (
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-sm rounded-full">
                            Status Proses: {filterStatus2}
                        </span>
                    )}
                    {filterJenisSpm && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                            Jenis SPM: {filterJenisSpm}
                        </span>
                    )}
                    {filterDateFrom && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-sm rounded-full">
                            Dari: {filterDateFrom}
                        </span>
                    )}
                    {filterDateTo && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-sm rounded-full">
                            Sampai: {filterDateTo}
                        </span>
                    )}
                    {filterMak && (
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-sm rounded-full">
                            MAK: {filterMak}
                        </span>
                    )}
                    {filterLokasi && (
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-sm rounded-full">
                            Lokasi: {filterLokasi}
                        </span>
                    )}
                    {filterCatatanStatus2 && (
                        <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200 text-sm rounded-full">
                            No SPM: {filterCatatanStatus2}
                        </span>
                    )}
                </div>
            </div>

            <KegiatanTable
              paginatedItems={paginatedItems}
              detailShown={detailShown}
              detailData={detailData}
              pegawaiDetailShown={pegawaiDetailShown}
              userType={userType}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              ITEMS_PER_PAGE={ITEMS_PER_PAGE}
              formatDateForDisplay={formatDateForDisplay}
              formatRupiah={formatRupiah}
              renderStatusBadge={renderStatusBadge}
              hasValidStatus2={hasValidStatus2}
              getStatus2Color={getStatus2Color}
              onSort={handleSort}
              onEdit={handleEdit}
              onDelete={(id) => { setItemToDelete(id); setConfirmDeleteModalOpen(true); }}
              onPrint={handlePrintItem}
              onToggleDetail={toggleDetail}
              onTogglePegawaiDetail={togglePegawaiDetail}
              onOpenHistoriModal={handleOpenHistoriModal}
              onOpenStatus2Modal={handleOpenStatus2Modal}
              onOpenKirimPPKModal={handleOpenKirimPPKModal}
              onOpenMengetahuiModal={handleOpenMengetahuiModal}
              onOpenPersetujuanModal={handleOpenPersetujuanModal}
              onOpenSuratTugasModal={handleOpenSuratTugasModal}
              onCalculateTotal={calculateTotalNominatif}
              onPageChange={setCurrentPage}
            />

            {/* Modals */}
            <NotificationModal
                show={modalOpen}
                message={notificationMessage}
                onClose={closeModal}
            />

            <ConfirmDeleteModal
                show={confirmDeleteModalOpen}
                deletingId={deletingId}
                itemToDelete={itemToDelete}
                onClose={closeModal}
                onConfirm={confirmDelete}
            />

            <HistoriModal
                show={showHistoriModal}
                onClose={handleCloseHistoriModal}
                item={selectedHistoriItem}
                formatDateForDisplay={formatDateForDisplay}
            />

            <Status2Modal
                show={showStatus2Modal}
                onClose={handleCloseStatus2Modal}
                item={selectedStatus2Item}
                onSave={handleSaveStatus2}
                isLoading={status2Loading}
            />

            {showKirimPPKModal && (
                <KirimPPKModal
                    show={showKirimPPKModal}
                    kegiatanId={selectedKegiatanForPPK}
                    onClose={() => setShowKirimPPKModal(false)}
                    onSuccess={() => {
                        setShowKirimPPKModal(false);
                        fetchKegiatan();
                        setNotificationMessage('Kegiatan berhasil dikirim ke PPK');
                        setModalOpen(true);
                    }}
                />
            )}

            {showMengetahuiModal && (
                <MengetahuiModal
                    show={showMengetahuiModal}
                    kegiatan={selectedKegiatanForPersetujuan}
                    onClose={() => setShowMengetahuiModal(false)}
                    onSuccess={(customMessage) => {
                        setShowMengetahuiModal(false);
                        fetchKegiatan();
                        setNotificationMessage(customMessage || 'Mengetahui berhasil diproses');
                        setModalOpen(true);
                    }}
                />
            )}

            {showPersetujuanModal && (
                <PersetujuanModal
                    show={showPersetujuanModal}
                    kegiatan={selectedKegiatanForMengetahui}
                    onClose={() => setShowPersetujuanModal(false)}
                    onSuccess={() => {
                        setShowPersetujuanModal(false);
                        fetchKegiatan();
                        setNotificationMessage('Persetujuan Kabalai berhasil diproses');
                        setModalOpen(true);
                    }}
                />
            )}

            {showSuratTugasModal && (
                <SuratTugasModal
                    show={showSuratTugasModal}
                    kegiatan={selectedKegiatanForST}
                    onClose={() => {
                        setShowSuratTugasModal(false);
                        setSelectedKegiatanForST(null);
                    }}
                    onSuccess={() => {
                        setShowSuratTugasModal(false);
                        setSelectedKegiatanForST(null);
                        fetchKegiatan();
                        setNotificationMessage('Data surat tugas berhasil disimpan dan status berubah menjadi Selesai');
                        setModalOpen(true);
                    }}
                />
            )}
        </div>
    );
}