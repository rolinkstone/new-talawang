// components/kegiatan/KegiatanForm.js
import React, { useState, useEffect } from 'react';
import PegawaiForm from './PegawaiForm';
import { formatRupiah, formatDateForBackend } from '../../utils/formatters';
import { validateMakFormat, getMakPlaceholder, formatMakInput } from '../../utils/validators';

const KegiatanForm = ({
    editId,
    isEditMode,
    formData,
    setFormData,
    pegawaiList,
    setPegawaiList,
    session,
    onCancel,
    onSubmit,
    formError,
    setFormError,
    formLoading,
    setFormLoading
}) => {
    // State untuk data daerah
    const [provinsiList, setProvinsiList] = useState([]);
    const [kabupatenList, setKabupatenList] = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [selectedProvinsi, setSelectedProvinsi] = useState('');
    const [selectedKabupaten, setSelectedKabupaten] = useState('');
    const [selectedKecamatan, setSelectedKecamatan] = useState('');
    const [loadingDaerah, setLoadingDaerah] = useState(false);
    
    // State untuk autocomplete pegawai
    const [pegawaiSuggestions, setPegawaiSuggestions] = useState([]);
    const [loadingPegawai, setLoadingPegawai] = useState(false);
    const [fetchError, setFetchError] = useState('');

    // State untuk Jenis SPM
    const [jenisSPM, setJenisSPM] = useState(formData.jenis_spm || '');

    // Set user_id dari session user saat komponen mount
    useEffect(() => {
        if (session?.user?.id && !isEditMode) {
            // Hanya set user_id saat mode tambah baru (bukan edit)
            setFormData(prev => ({
                ...prev,
                user_id: session.user.id
            }));
        }
    }, [session, isEditMode, setFormData]);

    // Load data provinsi saat komponen mount
    useEffect(() => {
        fetchProvinsi();
        
        // Jika edit mode, jangan reset user_id
        if (isEditMode && formData.user_id) {
            // Biarkan user_id yang sudah ada
        } else if (session?.user?.id) {
            // Set user_id untuk mode tambah baru
            setFormData(prev => ({
                ...prev,
                user_id: session.user.id
            }));
        }
    }, [session, isEditMode]);

    // Fetch pegawai suggestions saat komponen mount
    useEffect(() => {
        fetchPegawaiSuggestions();
    }, []); // Hanya sekali saat mount

    // Handle perubahan jenis SPM
    const handleJenisSPMChange = (value) => {
        setJenisSPM(value);
        setFormData(prev => ({
            ...prev,
            jenis_spm: value
        }));
    };

    const fetchProvinsi = async () => {
        try {
            setLoadingDaerah(true);
            const response = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
            const data = await response.json();
            setProvinsiList(data);
        } catch (error) {
            console.error('Error fetching provinsi:', error);
            setProvinsiList([
                { id: '62', name: 'KALIMANTAN TENGAH' },
                { id: '63', name: 'KALIMANTAN SELATAN' },
                { id: '64', name: 'KALIMANTAN TIMUR' },
                { id: '65', name: 'KALIMANTAN UTARA' },
                { id: '66', name: 'KALIMANTAN BARAT' }
            ]);
        } finally {
            setLoadingDaerah(false);
        }
    };

    const fetchKabupaten = async (provinsiId) => {
        try {
            setLoadingDaerah(true);
            setKabupatenList([]);
            setKecamatanList([]);
            setSelectedKabupaten('');
            setSelectedKecamatan('');
            
            const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinsiId}.json`);
            const data = await response.json();
            setKabupatenList(data);
        } catch (error) {
            console.error('Error fetching kabupaten:', error);
        } finally {
            setLoadingDaerah(false);
        }
    };

    const fetchKecamatan = async (kabupatenId) => {
        try {
            setLoadingDaerah(true);
            setKecamatanList([]);
            setSelectedKecamatan('');
            
            const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${kabupatenId}.json`);
            const data = await response.json();
            setKecamatanList(data);
        } catch (error) {
            console.error('Error fetching kecamatan:', error);
        } finally {
            setLoadingDaerah(false);
        }
    };

    // Fungsi untuk mengambil data pegawai dari API
    const fetchPegawaiSuggestions = async () => {
        try {
            console.log('🔍 Starting fetchPegawaiSuggestions...');
            setLoadingPegawai(true);
            setFetchError('');
            
            // Debug session
            console.log('👤 Session data:', {
                user: session?.user,
                hasToken: !!session?.accessToken,
                user_id: session?.user?.id
            });
            
            // Gunakan endpoint dengan port yang benar (biasanya 3000 untuk React dev server)
            // Coba beberapa kemungkinan URL
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const possibleUrls = [
                `${API_BASE_URL}/keycloak/users/all-simple`
            ];
            
            let response = null;
            let lastError = null;
            
            // Coba semua URL sampai ada yang berhasil
            for (const apiUrl of possibleUrls) {
                try {
                    console.log('🔄 Trying URL:', apiUrl);
                    
                    response = await fetch(apiUrl, {
                        headers: {
                            'Authorization': `Bearer ${session?.accessToken || ''}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin' // Gunakan same-origin untuk menghindari CORS
                    });
                    
                    console.log('📡 Response for', apiUrl, 'status:', response?.status);
                    
                    if (response && response.ok) {
                        console.log('✅ Success with URL:', apiUrl);
                        break;
                    }
                } catch (err) {
                    console.log('❌ Failed with URL:', apiUrl, 'error:', err.message);
                    lastError = err;
                    response = null;
                    continue;
                }
            }
            
            if (!response) {
                throw new Error(`Tidak dapat terhubung ke server. ${lastError?.message || ''}`);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ API Response success:', data.success);
            console.log('📊 Data count:', data.data?.length || 0);
            
            if (data.success) {
                console.log(`📊 Successfully fetched ${data.data?.length || 0} pegawai suggestions`);
                setPegawaiSuggestions(data.data || []);
                
                // Log sample data
                if (data.data && data.data.length > 0) {
                    console.log('📋 Sample data (first 3):');
                    data.data.slice(0, 3).forEach((item, idx) => {
                        console.log(`${idx + 1}. Nama: ${item.nama}, NIP: ${item.nip}, Jabatan: ${item.jabatan}`);
                    });
                }
            } else {
                console.warn('⚠️ API returned success: false', data);
                setFetchError(data.message || 'Gagal mengambil data pegawai');
                setPegawaiSuggestions([]);
            }
        } catch (error) {
            console.error('❌ Error fetching pegawai suggestions:', error);
            console.error('Error stack:', error.stack);
            
            setFetchError(`Gagal memuat data pegawai: ${error.message}`);
            setPegawaiSuggestions([]);
            
            // Fallback data untuk testing
            console.log('🔄 Using fallback data for development');
            setPegawaiSuggestions([
                {
                    nama: 'John Doe',
                    nip: '198012345678910',
                    jabatan: 'Staf Administrasi',
                    username: 'johndoe',
                    id: '1',
                    email: 'john.doe@example.com'
                },
                {
                    nama: 'Jane Smith',
                    nip: '198512345678911',
                    jabatan: 'Analis Data',
                    username: 'janesmith',
                    id: '2',
                    email: 'jane.smith@example.com'
                },
                {
                    nama: 'Robert Johnson',
                    nip: '199012345678912',
                    jabatan: 'Supervisor',
                    username: 'robertj',
                    id: '3',
                    email: 'robert.j@example.com'
                },
                {
                    nama: 'Sarah Williams',
                    nip: '199212345678913',
                    jabatan: 'Manager',
                    username: 'sarahw',
                    id: '4',
                    email: 'sarah.w@example.com'
                },
                {
                    nama: 'Michael Brown',
                    nip: '198812345678914',
                    jabatan: 'Koordinator',
                    username: 'michaelb',
                    id: '5',
                    email: 'michael.b@example.com'
                }
            ]);
        } finally {
            setLoadingPegawai(false);
        }
    };

    const handleProvinsiChange = (e) => {
        const provinsiId = e.target.value;
        const provinsiName = e.target.options[e.target.selectedIndex].text;
        
        setSelectedProvinsi(provinsiId);
        
        setFormData(prev => ({
            ...prev,
            provinsi: provinsiName
        }));
        
        setKabupatenList([]);
        setKecamatanList([]);
        setSelectedKabupaten('');
        setSelectedKecamatan('');
        
        if (provinsiId) {
            fetchKabupaten(provinsiId);
        }
    };

    const handleKabupatenChange = (e) => {
        const kabupatenId = e.target.value;
        const kabupatenName = e.target.options[e.target.selectedIndex].text;
        
        setSelectedKabupaten(kabupatenId);
        
        setFormData(prev => ({
            ...prev,
            kabupaten_tujuan: kabupatenName,
            kota_kab_kecamatan: kabupatenName
        }));
        
        setKecamatanList([]);
        setSelectedKecamatan('');
        
        if (kabupatenId) {
            fetchKecamatan(kabupatenId);
        }
    };

    const handleKecamatanChange = (e) => {
        const kecamatanName = e.target.options[e.target.selectedIndex].text;
        
        setSelectedKecamatan(e.target.value);
        
        setFormData(prev => ({
            ...prev,
            kota_kab_kecamatan: `${kecamatanName}, ${prev.kabupaten_tujuan}`
        }));
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        
        // Jika field user_id diubah secara manual, kita tetap izinkan
        if (name === 'user_id') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        setFormError('');
    };

    const handleMakChange = (e) => {
        const value = formatMakInput(e.target.value);
        setFormData(prev => ({
            ...prev,
            mak: value
        }));
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        
        // Validasi jenis SPM harus dipilih
        if (!formData.jenis_spm) {
            setFormError('Jenis SPM harus dipilih');
            return;
        }
        
        // Validasi user_id harus diisi
        if (!formData.user_id) {
            setFormError('User ID harus diisi');
            return;
        }
        
        // Validasi minimal satu pegawai
        if (pegawaiList.length === 0) {
            setFormError('Minimal harus ada satu pegawai');
            return;
        }
        
        // Validasi data pegawai
        const invalidPegawai = pegawaiList.find(p => !p.nama || p.nama.trim() === '');
        if (invalidPegawai) {
            setFormError('Nama pegawai harus diisi untuk semua pegawai');
            return;
        }
        
        onSubmit(e); // Panggil fungsi onSubmit dari parent
    };

    const [isOtherActivity, setIsOtherActivity] = useState(false);

    // Helper untuk mendapatkan display value dropdown
    const getDropdownValue = (value, isOther = false) => {
        if (isOther) return "lainnya";
        if (!value) return "";
        
        const lowerValue = value.toLowerCase();
        
        if (lowerValue.includes("sampling")) return "sampling";
        if (lowerValue.includes("pemeriksaan sarana produksi")) return "sarana_produksi";
        if (lowerValue.includes("pemeriksaan sarana distribusi")) return "sarana_distribusi";
        if (lowerValue.includes("pengawasan iklan")) return "iklan";
        if (lowerValue.includes("pjas") || lowerValue.includes("umkm")) return "pjas";
        if (lowerValue.includes("penyelesaian perkara")) return "perkara";
        if (lowerValue.includes("fasilitasi sarana")) return "sertifikasi";
        if (lowerValue.includes("pemberian kie")) return "kie";
        
        return "";
    };

    const extractNumber = (value) => {
        if (!value) return "";
        // Cari angka dalam string (tanpa tanda kurung)
        const match = value.match(/(\d+)\s*(sampel|sarana|iklan)/);
        return match ? match[1] : "";
    };

    const grandTotal = pegawaiList.reduce((sum, pegawai) => sum + (pegawai.total_biaya || 0), 0);

    return (
        <div className="mb-8 bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
                {isEditMode ? `Edit Kegiatan (ID: ${editId})` : 'Form Tambah Kegiatan + Pegawai'}
            </h3>
            
            {/* Error Messages */}
            {formError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {formError}
                    </div>
                </div>
            )}
            
            {fetchError && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md border border-yellow-200">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {fetchError}
                        <button 
                            onClick={fetchPegawaiSuggestions}
                            className="ml-3 text-sm underline hover:text-yellow-800"
                        >
                            Coba lagi
                        </button>
                    </div>
                </div>
            )}

            {/* Jenis SPM Section - Paling Atas */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="mb-2">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm10 7a1 1 0 100-2 1 1 0 000 2zm3 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        Jenis SPM *
                    </h4>
                    <p className="text-sm text-gray-600">Pilih jenis Surat Permintaan Pembayaran untuk kegiatan ini</p>
                    
                </div>
                
                <div className="flex flex-wrap gap-4">
                    {/* Radio Button LS */}
                    <div 
                        className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-200 ${jenisSPM === 'LS' ? 'bg-white border-2 border-blue-500 shadow-md' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                        onClick={() => handleJenisSPMChange('LS')}
                    >
                        <div className="flex items-center justify-center w-6 h-6 mr-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${jenisSPM === 'LS' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                                {jenisSPM === 'LS' && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="font-medium text-gray-800">LS (Langsung)</div>
                            <div className="text-sm text-gray-600 mt-1">Digunakan untuk pembayaran Transport, Uang Harian dan Penginapan</div>
                        </div>
                    </div>
                    
                    {/* Radio Button KKP */}
                    <div 
                        className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-200 ${jenisSPM === 'KKP' ? 'bg-white border-2 border-blue-500 shadow-md' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                        onClick={() => handleJenisSPMChange('KKP')}
                    >
                        <div className="flex items-center justify-center w-6 h-6 mr-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${jenisSPM === 'KKP' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                                {jenisSPM === 'KKP' && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="font-medium text-gray-800">KKP (Kartu Kredit Pemerintah)</div>
                            <div className="text-sm text-gray-600 mt-1">Digunakan untuk pembayaran Transport saja (Uang Harian & Penginapan dihilangkan)</div>
                        </div>
                    </div>
                </div>
                
                {/* Selected Value Display */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-blue-800">Jenis SPM yang dipilih:</span>
                        <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${jenisSPM === 'LS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {jenisSPM === 'LS' ? 'LS (Langsung)' : 'KKP (Kartu Kredit Pemerintah)'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Total Biaya Keseluruhan */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-sm text-green-700">Total Biaya Keseluruhan</div>
                        <div className="text-2xl font-bold text-green-800">Rp {formatRupiah(grandTotal)}</div>
                    </div>
                    <div className="text-sm text-green-700">
                        {pegawaiList.length} Pegawai
                    </div>
                </div>
                {jenisSPM === 'KKP' && (
                    <div className="mt-2 text-sm text-purple-700 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Mode KKP: Hanya menghitung Transport
                    </div>
                )}
            </div>
            
            <form onSubmit={handleSubmitForm} className="space-y-6">
                {/* Data Kegiatan */}
                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-800 border-b pb-2">Data Kegiatan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama Kegiatan *
                            </label>
                            <input
                                type="text"
                                name="kegiatan"
                                value={formData.kegiatan}
                                onChange={handleFormChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Contoh: Pengambilan sampling pangan segar"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                MAK *
                                <span className="text-xs text-gray-500 ml-2">
                                    Format: XXXX.XXX.XXX.XXX.XXXXXX.X
                                </span>
                            </label>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    name="mak"
                                    value={formData.mak}
                                    onChange={handleMakChange}
                                    placeholder={getMakPlaceholder()}
                                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-lg"
                                    required
                                    maxLength={29}
                                />
                                
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                
                                {formData.mak && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, mak: '' }))}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                                
                                {formData.mak && (
                                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                        {validateMakFormat(formData.mak) ? (
                                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-2">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-xs text-gray-500">
                                        Panjang: <span className="font-medium">{formData.mak.replace(/\./g, '').length}</span>/20 karakter
                                    </div>
                                    <div className="text-xs font-mono text-gray-600">
                                        {formData.mak ? formData.mak : 'XXXX.XXX.XXX.XXX.XXXXXX.X'}
                                    </div>
                                </div>
                                
                                {formData.mak && !validateMakFormat(formData.mak) && (
                                    <div className="mt-2 text-xs text-red-600">
                                        Format tidak valid. Pastikan sesuai pola: <span className="font-mono">XXXX.XXX.XXX.XXX.XXXXXX.X</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Realisasi Anggaran Sebelumnya
                            </label>
                            <input
                                type="number"
                                name="realisasi_anggaran_sebelumnya"
                                value={formData.realisasi_anggaran_sebelumnya}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Target Output Tahun
                            </label>
                            <input
                                type="number"
                                name="target_output_tahun"
                                value={formData.target_output_tahun}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Realisasi Output Sebelumnya
                            </label>
                            <input
                                type="number"
                                name="realisasi_output_sebelumnya"
                                value={formData.realisasi_output_sebelumnya}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Target Output Dicapai
                            </label>
                            
                            {/* Pilihan utama */}
                            <select
                                name="target_output_yg_akan_dicapai"
                                value={getDropdownValue(formData.target_output_yg_akan_dicapai, isOtherActivity)}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    
                                    if (selectedValue === "lainnya") {
                                        // Set flag bahwa user memilih lainnya
                                        setIsOtherActivity(true);
                                        // Kosongkan value untuk input manual
                                        setFormData(prev => ({
                                            ...prev,
                                            target_output_yg_akan_dicapai: ""
                                        }));
                                    } else {
                                        // Reset flag
                                        setIsOtherActivity(false);
                                        
                                        let newValue = "";
                                        switch(selectedValue) {
                                            case "sampling": newValue = "Sampling"; break;
                                            case "sarana_produksi": newValue = "Pemeriksaan Sarana Produksi"; break;
                                            case "sarana_distribusi": newValue = "Pemeriksaan Sarana Distribusi"; break;
                                            case "iklan": newValue = "Pengawasan Iklan"; break;
                                            case "pjas": newValue = "Pemenuhan Tahapan Kegiatan PJAS/Desa/Pasar/UMKM"; break;
                                            case "perkara": newValue = "Pemenuhan Tahapan Penyelesaian Perkara"; break;
                                            case "sertifikasi": newValue = "Fasilitasi Sarana Dalam Rangka Sertifikasi"; break;
                                            case "kie": newValue = "Pemberian KIE"; break;
                                            default: newValue = "";
                                        }
                                        
                                        setFormData(prev => ({
                                            ...prev,
                                            target_output_yg_akan_dicapai: newValue
                                        }));
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                            >
                                <option value="">Pilih target output</option>
                                <option value="sampling">Sampling</option>
                                <option value="sarana_produksi">Pemeriksaan sarana produksi</option>
                                <option value="sarana_distribusi">Pemeriksaan sarana distribusi</option>
                                <option value="iklan">Pengawasan iklan</option>
                                <option value="pjas">Pemenuhan tahapan kegiatan PJAS/desa/pasar/UMKM</option>
                                <option value="perkara">Pemenuhan tahapan penyelesaian perkara</option>
                                <option value="sertifikasi">Fasilitasi sarana dalam rangka sertifikasi</option>
                                <option value="kie">Pemberian KIE</option>
                                <option value="lainnya">Kegiatan lainnya</option>
                            </select>
                            
                            {/* Input untuk kegiatan lainnya */}
                            {isOtherActivity && (
                                <input
                                    type="text"
                                    value={formData.target_output_yg_akan_dicapai || ""}
                                    onChange={(e) => {
                                        // Simpan langsung teks yang diketik, TANPA kata "lainnya"
                                        setFormData(prev => ({
                                            ...prev,
                                            target_output_yg_akan_dicapai: e.target.value
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"
                                    placeholder="Ketik kegiatan lainnya..."
                                    autoFocus
                                />
                            )}
                            
                            {/* Input tambahan untuk sampling */}
                            {formData.target_output_yg_akan_dicapai?.toLowerCase().includes("sampling") && !isOtherActivity && (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={extractNumber(formData.target_output_yg_akan_dicapai) || ""}
                                        onChange={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? "" : parseInt(inputValue) || "";
                                            
                                            let newValue;
                                            if (!count || count <= 0) {
                                                newValue = "Sampling";
                                            } else {
                                                newValue = `Sampling ${count} sampel`;
                                            }
                                            
                                            setFormData(prev => ({
                                                ...prev,
                                                target_output_yg_akan_dicapai: newValue
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? 0 : parseInt(inputValue) || 0;
                                            
                                            if (count <= 0) {
                                                const newValue = "Sampling 1 sampel";
                                                setFormData(prev => ({
                                                    ...prev,
                                                    target_output_yg_akan_dicapai: newValue
                                                }));
                                            }
                                        }}
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Jumlah"
                                    />
                                    <span className="text-gray-600">sampel</span>
                                </div>
                            )}
                            
                            {/* Input tambahan untuk sarana produksi */}
                            {formData.target_output_yg_akan_dicapai?.toLowerCase().includes("pemeriksaan sarana produksi") && !isOtherActivity && (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={extractNumber(formData.target_output_yg_akan_dicapai) || ""}
                                        onChange={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? "" : parseInt(inputValue) || "";
                                            
                                            let newValue;
                                            if (!count || count <= 0) {
                                                newValue = "Pemeriksaan Sarana Produksi";
                                            } else {
                                                newValue = `Pemeriksaan Sarana Produksi ${count} sarana`;
                                            }
                                            
                                            setFormData(prev => ({
                                                ...prev,
                                                target_output_yg_akan_dicapai: newValue
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? 0 : parseInt(inputValue) || 0;
                                            
                                            if (count <= 0) {
                                                const newValue = "Pemeriksaan Sarana Produksi 1 sarana";
                                                setFormData(prev => ({
                                                    ...prev,
                                                    target_output_yg_akan_dicapai: newValue
                                                }));
                                            }
                                        }}
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Jumlah"
                                    />
                                    <span className="text-gray-600">sarana</span>
                                </div>
                            )}
                            
                            {/* Input tambahan untuk sarana distribusi */}
                            {formData.target_output_yg_akan_dicapai?.toLowerCase().includes("pemeriksaan sarana distribusi") && !isOtherActivity && (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={extractNumber(formData.target_output_yg_akan_dicapai) || ""}
                                        onChange={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? "" : parseInt(inputValue) || "";
                                            
                                            let newValue;
                                            if (!count || count <= 0) {
                                                newValue = "Pemeriksaan Sarana Distribusi";
                                            } else {
                                                newValue = `Pemeriksaan Sarana Distribusi ${count} sarana`;
                                            }
                                            
                                            setFormData(prev => ({
                                                ...prev,
                                                target_output_yg_akan_dicapai: newValue
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? 0 : parseInt(inputValue) || 0;
                                            
                                            if (count <= 0) {
                                                const newValue = "Pemeriksaan Sarana Distribusi 1 sarana";
                                                setFormData(prev => ({
                                                    ...prev,
                                                    target_output_yg_akan_dicapai: newValue
                                                }));
                                            }
                                        }}
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Jumlah"
                                    />
                                    <span className="text-gray-600">sarana</span>
                                </div>
                            )}
                            
                            {/* Input tambahan untuk pengawasan iklan */}
                            {formData.target_output_yg_akan_dicapai?.toLowerCase().includes("pengawasan iklan") && !isOtherActivity && (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={extractNumber(formData.target_output_yg_akan_dicapai) || ""}
                                        onChange={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? "" : parseInt(inputValue) || "";
                                            
                                            let newValue;
                                            if (!count || count <= 0) {
                                                newValue = "Pengawasan Iklan";
                                            } else {
                                                newValue = `Pengawasan Iklan ${count} iklan`;
                                            }
                                            
                                            setFormData(prev => ({
                                                ...prev,
                                                target_output_yg_akan_dicapai: newValue
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                                            const count = inputValue === "" ? 0 : parseInt(inputValue) || 0;
                                            
                                            if (count <= 0) {
                                                const newValue = "Pengawasan Iklan 1 Iklan";
                                                setFormData(prev => ({
                                                    ...prev,
                                                    target_output_yg_akan_dicapai: newValue
                                                }));
                                            }
                                        }}
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Jumlah"
                                    />
                                    <span className="text-gray-600">iklan</span>
                                </div>
                            )}
                        </div>

                        {/* Form Lokasi Bertingkat */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lokasi Kegiatan
                            </label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Kolom 1: Dropdowns */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Provinsi
                                        </label>
                                        <select
                                            value={selectedProvinsi}
                                            onChange={handleProvinsiChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            disabled={loadingDaerah}
                                        >
                                            <option value="">Pilih Provinsi</option>
                                            {provinsiList.map(provinsi => (
                                                <option key={provinsi.id} value={provinsi.id}>
                                                    {provinsi.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Kabupaten/Kota *
                                        </label>
                                        <select
                                            value={selectedKabupaten}
                                            onChange={handleKabupatenChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            disabled={!selectedProvinsi || loadingDaerah}
                                            required
                                        >
                                            <option value="">Pilih Kabupaten/Kota</option>
                                            {kabupatenList.map(kabupaten => (
                                                <option key={kabupaten.id} value={kabupaten.id}>
                                                    {kabupaten.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Kecamatan (Opsional)
                                        </label>
                                        <select
                                            value={selectedKecamatan}
                                            onChange={handleKecamatanChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            disabled={!selectedKabupaten || loadingDaerah}
                                        >
                                            <option value="">Pilih Kecamatan</option>
                                            {kecamatanList.map(kecamatan => (
                                                <option key={kecamatan.id} value={kecamatan.id}>
                                                    {kecamatan.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Kolom 2: Preview */}
                                <div>
                                    <div className="h-full flex flex-col">
                                        <div className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-md">
                                            <div className="text-sm font-medium text-gray-700 mb-2">Preview Lokasi:</div>
                                            <div className="text-gray-900 mb-3 min-h-[60px] flex items-center">
                                                {formData.kota_kab_kecamatan ? (
                                                    <div className="font-medium text-gray-800">
                                                        {formData.kota_kab_kecamatan}
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-500 italic">Belum memilih lokasi</div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Custom Lokasi / Lokasi yang disimpan ke database: <span className="font-medium">{formData.kota_kab_kecamatan || '-'}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="kota_kab_kecamatan"
                                                    value={formData.kota_kab_kecamatan}
                                                    onChange={handleFormChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    placeholder="Ketik manual jika perlu"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rencana Tanggal Pelaksanaan
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="date"
                                    name="rencana_tanggal_pelaksanaan"
                                    value={formData.rencana_tanggal_pelaksanaan}
                                    onChange={handleFormChange}
                                    className="w-5/12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Tanggal Awal"
                                />
                                <div className="mx-2 text-gray-500 font-medium text-sm">s/d</div>
                                <input
                                    type="date"
                                    name="rencana_tanggal_pelaksanaan_akhir"
                                    value={formData.rencana_tanggal_pelaksanaan_akhir}
                                    onChange={handleFormChange}
                                    min={formData.rencana_tanggal_pelaksanaan} // Validasi: tanggal akhir tidak boleh sebelum tanggal awal
                                    className="w-5/12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Tanggal Akhir"
                                />
                            </div>
                            {formData.rencana_tanggal_pelaksanaan_akhir && 
                             formData.rencana_tanggal_pelaksanaan && 
                             new Date(formData.rencana_tanggal_pelaksanaan_akhir) < new Date(formData.rencana_tanggal_pelaksanaan) && (
                                <p className="mt-1 text-sm text-red-600">
                                    Tanggal akhir tidak boleh sebelum tanggal awal
                                </p>
                            )}
                        </div>
                        
                        {/* User ID Field - Readonly atau Hidden */}
                        <div className="md:col-span-2">
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">User ID (Pembuat Data)</div>
                                        <div className="flex items-center space-x-2">
                                            <div className="px-3 py-2 bg-white border border-gray-300 rounded-md font-mono text-sm">
                                                {formData.user_id || 'Belum ditetapkan'}
                                            </div>
                                            {session?.user?.id && (
                                                <div className="text-sm text-green-600 flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    User yang login: {session.user.id}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!isEditMode && (
                                        <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            Diisi otomatis
                                        </div>
                                    )}
                                </div>
                                {isEditMode && (
                                    <div className="mt-2 text-xs text-yellow-600">
                                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        User ID tidak dapat diubah saat edit. Data ini tetap milik pembuat asli.
                                    </div>
                                )}
                            </div>
                            
                            {/* Input hidden untuk user_id */}
                            <input
                                type="hidden"
                                name="user_id"
                                value={formData.user_id || ''}
                                onChange={handleFormChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Data Pegawai */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            {loadingPegawai ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memuat data pegawai...
                                </span>
                            ) : (
                                <span className="text-green-600">
                                    ✓ {pegawaiSuggestions.length} pegawai tersedia
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Pass jenisSPM ke PegawaiForm */}
                    <PegawaiForm 
                        pegawaiList={pegawaiList}
                        setPegawaiList={setPegawaiList}
                        formLoading={formLoading}
                        pegawaiSuggestions={pegawaiSuggestions}
                        loadingPegawai={loadingPegawai}
                        jenisSPM={jenisSPM} 
                    />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                        disabled={formLoading}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        disabled={formLoading || !formData.user_id}
                    >
                        {formLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? 'Memperbarui...' : 'Menyimpan...'}
                            </>
                        ) : isEditMode ? 'Perbarui Data' : 'Simpan Kegiatan & Pegawai'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default KegiatanForm;