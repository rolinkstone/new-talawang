// components/kegiatan/PegawaiForm.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatRupiah } from '../../utils/formatters';

const PegawaiForm = ({ 
    pegawaiList, 
    setPegawaiList, 
    formLoading,
    pegawaiSuggestions = [],
    loadingPegawai = false,
    jenisSPM = 'LS' // Default LS, bisa 'LS' atau 'KKP'
}) => {
    
    const [showSuggestions, setShowSuggestions] = useState(Array(pegawaiList.length).fill(false));
    const [searchTerms, setSearchTerms] = useState(Array(pegawaiList.length).fill(''));
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const suggestionRefs = useRef([]);

    // Filter suggestions untuk menghapus pegawai yang sudah dipilih
    const availableSuggestions = useMemo(() => {
        console.log('🔄 Filtering available suggestions...');
        
        if (!Array.isArray(pegawaiSuggestions) || pegawaiSuggestions.length === 0) {
            return [];
        }
        
        // Kumpulkan semua pegawai_id yang sudah dipilih
        const selectedPegawaiIds = new Set();
        const selectedUsernames = new Set();
        const selectedNips = new Set();
        
        pegawaiList.forEach(pegawai => {
            if (pegawai.pegawai_id) {
                selectedPegawaiIds.add(pegawai.pegawai_id);
            }
            if (pegawai.username) {
                selectedUsernames.add(pegawai.username.toLowerCase());
            }
            if (pegawai.nip) {
                selectedNips.add(pegawai.nip);
            }
        });
        
        console.log('📋 Already selected:', {
            ids: Array.from(selectedPegawaiIds),
            usernames: Array.from(selectedUsernames),
            nips: Array.from(selectedNips)
        });
        
        // Filter out yang sudah dipilih
        const filtered = pegawaiSuggestions.filter(suggestion => {
            // Skip jika sudah dipilih berdasarkan ID
            if (selectedPegawaiIds.has(suggestion.id)) {
                console.log(`🚫 Skipping ${suggestion.nama} - already selected by ID`);
                return false;
            }
            
            // Skip jika sudah dipilih berdasarkan username (case-insensitive)
            if (suggestion.username && selectedUsernames.has(suggestion.username.toLowerCase())) {
                console.log(`🚫 Skipping ${suggestion.nama} - already selected by username`);
                return false;
            }
            
            // Skip jika sudah dipilih berdasarkan NIP
            if (suggestion.nip && selectedNips.has(suggestion.nip)) {
                console.log(`🚫 Skipping ${suggestion.nama} - already selected by NIP`);
                return false;
            }
            
            // Skip jika nama sama persis (case-insensitive)
            const currentNames = pegawaiList.map(p => p.nama.toLowerCase());
            if (suggestion.nama && currentNames.includes(suggestion.nama.toLowerCase())) {
                console.log(`🚫 Skipping ${suggestion.nama} - already selected by name`);
                return false;
            }
            
            return true;
        });
        
        console.log(`✅ Filtered suggestions: ${filtered.length} available (from ${pegawaiSuggestions.length} total)`);
        
        return filtered;
    }, [pegawaiSuggestions, pegawaiList]);

    // Debug log untuk melihat data yang diterima
    useEffect(() => {
        console.log('🔍 PegawaiForm - Props received:');
        console.log('- Total suggestions:', pegawaiSuggestions?.length || 0);
        console.log('- Available suggestions:', availableSuggestions.length);
        console.log('- Current pegawaiList:', pegawaiList.length);
        console.log('- loadingPegawai:', loadingPegawai);
        console.log('- Jenis SPM:', jenisSPM); // Debug jenis SPM
        
        if (availableSuggestions.length > 0) {
            console.log('📋 Available suggestions (first 5):');
            availableSuggestions.slice(0, 5).forEach((p, idx) => {
                console.log(`${idx + 1}. Nama: ${p.nama}, NIP: ${p.nip}, Jabatan: ${p.jabatan}`);
            });
        }
    }, [availableSuggestions, loadingPegawai, pegawaiList.length, pegawaiSuggestions?.length, jenisSPM]);

    // Initialize arrays when pegawaiList changes
    useEffect(() => {
        if (pegawaiList.length !== searchTerms.length) {
            setSearchTerms(Array(pegawaiList.length).fill(''));
            setShowSuggestions(Array(pegawaiList.length).fill(false));
            suggestionRefs.current = Array(pegawaiList.length).fill(null);
        }
    }, [pegawaiList.length]);

    // Handle perubahan data pegawai
    const handlePegawaiChange = (index, field, value) => {
        console.log(`✏️ Pegawai ${index + 1} - Field ${field} changed to: ${value}`);
        
        const newList = [...pegawaiList];
        
        // Jika mengubah nama, reset data yang terkait
        if (field === 'nama') {
            // Jika nama dihapus atau diubah manual, reset data autocomplete
            if (!value || value !== newList[index].nama) {
                newList[index] = {
                    ...newList[index],
                    nama: value,
                    nip: '', // Reset NIP
                    jabatan: '', // Reset jabatan
                    username: '', // Reset username
                    pegawai_id: '', // Reset ID
                    email: '', // Reset email
                    // Tetap pertahankan data biaya dan total biaya
                    total_biaya: newList[index].total_biaya || 0,
                    biaya: newList[index].biaya || [{
                        transportasi: [{ trans: '', harga: '', total: '' }],
                        uang_harian_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : [],
                        penginapan_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : []
                    }]
                };
            } else {
                newList[index][field] = value;
            }
        } else {
            newList[index][field] = value;
        }
        
        setPegawaiList(newList);

        // Update search term untuk nama
        if (field === 'nama') {
            const newSearchTerms = [...searchTerms];
            newSearchTerms[index] = value;
            setSearchTerms(newSearchTerms);
            
            // Show suggestions when typing
            if (value.length > 0) {
                const newShowSuggestions = [...showSuggestions];
                newShowSuggestions[index] = true;
                setShowSuggestions(newShowSuggestions);
                setSelectedIndex(-1);
            }
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e, index) => {
        const filtered = getFilteredSuggestions(index);
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < filtered.length - 1) {
                    setSelectedIndex(prev => prev + 1);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    setSelectedIndex(prev => prev - 1);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && filtered[selectedIndex]) {
                    handleSelectPegawai(index, filtered[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                const newShowSuggestions = [...showSuggestions];
                newShowSuggestions[index] = false;
                setShowSuggestions(newShowSuggestions);
                setSelectedIndex(-1);
                break;
        }
    };

    // Handle pilih dari autocomplete
    const handleSelectPegawai = (index, pegawai) => {
        console.log(`✅ Selected pegawai for index ${index + 1}:`, pegawai);
        
        const newList = [...pegawaiList];
        
        // Simpan data biaya yang sudah ada
        const existingBiaya = newList[index].biaya || [{
            transportasi: [{ trans: '', harga: '', total: '' }],
            uang_harian_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : [],
            penginapan_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : []
        }];
        
        const existingTotalBiaya = newList[index].total_biaya || 0;
        
        newList[index] = {
            ...newList[index],
            nama: pegawai.nama || '',
            nip: pegawai.nip || '',
            jabatan: pegawai.jabatan || '',
            username: pegawai.username || '',
            pegawai_id: pegawai.id || '',
            email: pegawai.email || '',
            // Pertahankan data biaya yang sudah ada
            total_biaya: existingTotalBiaya,
            biaya: existingBiaya
        };
        
        setPegawaiList(newList);

        // Sembunyikan suggestions
        const newShowSuggestions = [...showSuggestions];
        newShowSuggestions[index] = false;
        setShowSuggestions(newShowSuggestions);

        // Reset search term
        const newSearchTerms = [...searchTerms];
        newSearchTerms[index] = '';
        setSearchTerms(newSearchTerms);
        setSelectedIndex(-1);
        
        // Log perubahan
        console.log(`📝 Pegawai ${index + 1} updated:`, {
            nama: pegawai.nama,
            nip: pegawai.nip,
            jabatan: pegawai.jabatan,
            id: pegawai.id,
            biaya: existingBiaya.length,
            total_biaya: existingTotalBiaya,
            jenisSPM: jenisSPM
        });
    };

    // Filter suggestions berdasarkan input untuk index tertentu
    const getFilteredSuggestions = (index) => {
        if (!Array.isArray(availableSuggestions) || availableSuggestions.length === 0) {
            console.log(`⚠️ No available suggestions for index ${index + 1}`);
            return [];
        }
        
        const searchTerm = searchTerms[index]?.toLowerCase() || '';
        
        console.log(`🔍 Filtering suggestions for pegawai ${index + 1}, search term: "${searchTerm}"`);
        console.log(`📊 Available suggestions: ${availableSuggestions.length}`);
        
        if (searchTerm.length < 1) {
            console.log(`🔍 Search term too short for index ${index + 1}, showing all (limited to 8)`);
            return availableSuggestions.slice(0, 8);
        }
        
        const filtered = availableSuggestions.filter(pegawai => {
            const namaMatch = pegawai.nama?.toLowerCase().includes(searchTerm);
            const nipMatch = pegawai.nip?.toLowerCase().includes(searchTerm);
            const usernameMatch = pegawai.username?.toLowerCase().includes(searchTerm);
            const jabatanMatch = pegawai.jabatan?.toLowerCase().includes(searchTerm);
            
            return namaMatch || nipMatch || usernameMatch || jabatanMatch;
        }).slice(0, 8); // Limit to 8 results
        
        console.log(`✅ Found ${filtered.length} filtered suggestions for index ${index + 1}`);
        return filtered;
    };

    // Hitung total biaya per pegawai berdasarkan jenis SPM
    const calculateTotalBiaya = (pIndex) => {
        const newList = [...pegawaiList];
        const pegawai = newList[pIndex];
        
        let total = 0;
        
        if (pegawai.biaya && Array.isArray(pegawai.biaya)) {
            pegawai.biaya.forEach(biaya => {
                if (biaya.transportasi && Array.isArray(biaya.transportasi)) {
                    total += biaya.transportasi.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
                }
                
                // Hanya hitung uang harian jika jenis SPM adalah LS
                if (jenisSPM === 'LS' && biaya.uang_harian_items && Array.isArray(biaya.uang_harian_items)) {
                    total += biaya.uang_harian_items.reduce((sum, u) => sum + (Number(u.total) || 0), 0);
                }
                
                // Hanya hitung penginapan jika jenis SPM adalah LS
                if (jenisSPM === 'LS' && biaya.penginapan_items && Array.isArray(biaya.penginapan_items)) {
                    total += biaya.penginapan_items.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
                }
            });
        }
        
        newList[pIndex].total_biaya = total;
        setPegawaiList(newList);
    };

    // Handle perubahan biaya detail dengan auto-calculate total
    const handleBiayaChange = (pIndex, bIndex, type, dIndex, field, value) => {
        const newList = [...pegawaiList];
        
        if (!newList[pIndex].biaya || !newList[pIndex].biaya[bIndex]) {
            return;
        }
        
        if (!newList[pIndex].biaya[bIndex][type]) {
            newList[pIndex].biaya[bIndex][type] = [];
        }
        
        if (!newList[pIndex].biaya[bIndex][type][dIndex]) {
            if (type === 'transportasi') {
                newList[pIndex].biaya[bIndex][type][dIndex] = { trans: '', harga: '', total: '' };
            } else {
                newList[pIndex].biaya[bIndex][type][dIndex] = { jenis: '', qty: '', harga: '', total: '' };
            }
        }
        
        newList[pIndex].biaya[bIndex][type][dIndex][field] = value;
        
        if (field === 'harga' || field === 'qty') {
            const item = newList[pIndex].biaya[bIndex][type][dIndex];
            
            if (type === 'transportasi') {
                const harga = Number(item.harga) || 0;
                newList[pIndex].biaya[bIndex][type][dIndex].total = harga;
            } else {
                const qty = Number(item.qty) || 0;
                const harga = Number(item.harga) || 0;
                newList[pIndex].biaya[bIndex][type][dIndex].total = qty * harga;
            }
        }
        
        setPegawaiList(newList);
        calculateTotalBiaya(pIndex);
    };

    // Tambah pegawai baru
    const addPegawai = () => {
        console.log('➕ Adding new pegawai');
        
        const newPegawai = {
            nama: '',
            nip: '',
            jabatan: '',
            username: '',
            pegawai_id: '',
            email: '',
            total_biaya: 0,
            biaya: [{
                transportasi: [{ trans: '', harga: '', total: '' }],
                uang_harian_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : [],
                penginapan_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : []
            }]
        };
        
        setPegawaiList([...pegawaiList, newPegawai]);
        setSearchTerms([...searchTerms, '']);
        setShowSuggestions([...showSuggestions, false]);
        
        console.log(`📊 Total pegawai now: ${pegawaiList.length + 1}`);
        console.log(`📋 Available suggestions after add: ${availableSuggestions.length}`);
        console.log(`📝 Jenis SPM: ${jenisSPM}`);
    };

    // Hapus pegawai
    const removePegawai = (index) => {
        if (pegawaiList.length > 1) {
            console.log(`🗑️ Removing pegawai at index ${index + 1}`);
            
            const removedPegawai = pegawaiList[index];
            console.log(`Removed: ${removedPegawai.nama} (ID: ${removedPegawai.pegawai_id})`);
            
            const newList = [...pegawaiList];
            newList.splice(index, 1);
            setPegawaiList(newList);
            
            const newSearchTerms = [...searchTerms];
            newSearchTerms.splice(index, 1);
            setSearchTerms(newSearchTerms);
            
            const newShowSuggestions = [...showSuggestions];
            newShowSuggestions.splice(index, 1);
            setShowSuggestions(newShowSuggestions);
            
            console.log(`📊 Total pegawai now: ${newList.length}`);
        }
    };

    // Tambah item biaya (hanya untuk jenis yang sesuai dengan SPM)
    const addBiayaItem = (pIndex, bIndex, type) => {
        // Jika jenis SPM KKP, hanya izinkan transportasi
        if (jenisSPM === 'KKP' && (type === 'uang_harian_items' || type === 'penginapan_items')) {
            console.log(`⚠️ Jenis SPM ${jenisSPM} tidak mengizinkan ${type}`);
            return;
        }
        
        const newList = [...pegawaiList];
        
        if (!newList[pIndex].biaya) {
            newList[pIndex].biaya = [];
        }
        
        if (!newList[pIndex].biaya[bIndex]) {
            newList[pIndex].biaya[bIndex] = {
                transportasi: [],
                uang_harian_items: jenisSPM === 'LS' ? [] : [],
                penginapan_items: jenisSPM === 'LS' ? [] : []
            };
        }
        
        if (type === 'transportasi') {
            newList[pIndex].biaya[bIndex][type].push({ trans: '', harga: '', total: '' });
        } else {
            newList[pIndex].biaya[bIndex][type].push({ jenis: '', qty: '', harga: '', total: '' });
        }
        
        setPegawaiList(newList);
        calculateTotalBiaya(pIndex);
    };

    // Hapus item biaya
    const removeBiayaItem = (pIndex, bIndex, type, dIndex) => {
        const newList = [...pegawaiList];
        
        if (newList[pIndex].biaya && 
            newList[pIndex].biaya[bIndex] && 
            newList[pIndex].biaya[bIndex][type] && 
            newList[pIndex].biaya[bIndex][type].length > 1) {
            
            newList[pIndex].biaya[bIndex][type].splice(dIndex, 1);
            setPegawaiList(newList);
            calculateTotalBiaya(pIndex);
        }
    };

    // Handle focus pada input nama
    const handleNamaFocus = (index) => {
        console.log(`🎯 Focus on nama input at index ${index + 1}`);
        console.log(`📋 Available suggestions: ${availableSuggestions.length}`);
        
        const newShowSuggestions = [...showSuggestions];
        newShowSuggestions[index] = true;
        setShowSuggestions(newShowSuggestions);
        setSelectedIndex(-1);
    };

    // Handle blur pada input nama (with delay untuk allow selection)
    const handleNamaBlur = (index) => {
        setTimeout(() => {
            const newShowSuggestions = [...showSuggestions];
            newShowSuggestions[index] = false;
            setShowSuggestions(newShowSuggestions);
            setSelectedIndex(-1);
        }, 200);
    };

    // Clear pegawai data (reset ke empty)
    const clearPegawaiData = (index) => {
        const newList = [...pegawaiList];
        
        // Simpan data biaya yang sudah ada
        const existingBiaya = newList[index].biaya || [{
            transportasi: [{ trans: '', harga: '', total: '' }],
            uang_harian_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : [],
            penginapan_items: jenisSPM === 'LS' ? [{ jenis: '', qty: '', harga: '', total: '' }] : []
        }];
        
        const existingTotalBiaya = newList[index].total_biaya || 0;
        
        // Reset hanya data pribadi, pertahankan biaya
        newList[index] = {
            nama: '',
            nip: '',
            jabatan: '',
            username: '',
            pegawai_id: '',
            email: '',
            total_biaya: existingTotalBiaya, // Pertahankan total biaya
            biaya: existingBiaya // Pertahankan data biaya
        };
        
        setPegawaiList(newList);
        
        const newSearchTerms = [...searchTerms];
        newSearchTerms[index] = '';
        setSearchTerms(newSearchTerms);
        
        console.log(`🧹 Cleared personal data for pegawai ${index + 1}, kept biaya data`);
        console.log('Biaya tetap:', existingBiaya);
        console.log('Total tetap:', existingTotalBiaya);
        console.log('Jenis SPM:', jenisSPM);
    };

    // Hitung total keseluruhan
    const grandTotal = pegawaiList.reduce((sum, pegawai) => sum + (pegawai.total_biaya || 0), 0);

    // Info banner berdasarkan jenis SPM
    const spmInfo = jenisSPM === 'LS' 
        ? 'LS (Langsung): Transport, Uang Harian & Penginapan'
        : 'KKP (Kartu Kredit Pemerintah): Transport saja';

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="text-lg font-medium text-gray-800">Data Pegawai</h4>
                    <div className={`text-sm px-3 py-1 rounded-full mt-1 inline-block ${
                        jenisSPM === 'LS' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {spmInfo}
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                        Total: <span className="font-bold text-green-700">Rp {formatRupiah(grandTotal)}</span>
                    </div>
                    <button
                        type="button"
                        onClick={addPegawai}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
                        disabled={formLoading}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Pegawai
                    </button>
                </div>
            </div>

            {/* Info banner untuk KKP */}
            {jenisSPM === 'KKP' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 mr-2 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <div className="text-sm font-medium text-purple-800">Mode KKP (Kartu Kredit Pemerintah)</div>
                            <div className="text-sm text-purple-700">
                                Hanya menghitung Transport. Inputan Uang Harian dan Penginapan akan diabaikan.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {pegawaiList.map((pegawai, pIndex) => (
                <div key={pIndex} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h5 className="font-medium text-gray-700">
                                Pegawai {pIndex + 1}
                                {pegawai.pegawai_id && (
                                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        ✓ Dipilih dari sistem
                                    </span>
                                )}
                                {jenisSPM === 'KKP' && (
                                    <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                        KKP
                                    </span>
                                )}
                            </h5>
                            <div className="text-sm text-gray-500">
                                Total Biaya: <span className="font-bold text-green-700">Rp {formatRupiah(pegawai.total_biaya)}</span>
                                {jenisSPM === 'KKP' && (
                                    <span className="ml-2 text-xs text-purple-600">
                                        (Hanya Transport)
                                    </span>
                                )}
                            </div>
                        </div>
                        {pegawaiList.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removePegawai(pIndex)}
                                className="px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition flex items-center"
                                disabled={formLoading}
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Pegawai
                            </button>
                        )}
                    </div>

                    {/* Data Diri Pegawai */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama *
                                <span className="ml-2 text-xs text-gray-500">
                                    (Ketik untuk mencari)
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={pegawai.nama}
                                    onChange={(e) => handlePegawaiChange(pIndex, 'nama', e.target.value)}
                                    onFocus={() => handleNamaFocus(pIndex)}
                                    onBlur={() => handleNamaBlur(pIndex)}
                                    onKeyDown={(e) => handleKeyDown(e, pIndex)}
                                    className={`w-full px-3 py-2 border rounded-md pr-10 focus:outline-none focus:ring-2 ${
                                        pegawai.pegawai_id 
                                            ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                                            : 'border-gray-300 focus:ring-indigo-500'
                                    }`}
                                    placeholder={pegawai.pegawai_id ? "Pegawai sudah dipilih" : "Cari nama pegawai..."}
                                    disabled={formLoading}
                                    required
                                    autoComplete="off"
                                    readOnly={pegawai.pegawai_id}
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                                    {loadingPegawai ? (
                                        <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : pegawai.pegawai_id ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => clearPegawaiData(pIndex)}
                                                className="mr-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                                                disabled={formLoading}
                                                title="Hapus pilihan pegawai"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </>
                                    ) : (
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            
                            {/* Status info */}
                            <div className="mt-1 text-xs text-gray-500">
                                {pegawai.pegawai_id ? (
                                    <span className="text-green-600 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Data dari sistem. Tidak akan muncul di daftar pegawai lain.
                                    </span>
                                ) : showSuggestions[pIndex] ? (
                                    <span>
                                        Menampilkan {getFilteredSuggestions(pIndex).length} dari {availableSuggestions.length} pegawai tersedia
                                    </span>
                                ) : null}
                            </div>
                            
                            {/* Autocomplete Suggestions */}
                            {showSuggestions[pIndex] && !pegawai.pegawai_id && availableSuggestions && (
                                <div 
                                    ref={el => suggestionRefs.current[pIndex] = el}
                                    className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                                >
                                    {getFilteredSuggestions(pIndex).length > 0 ? (
                                        <>
                                            <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                                                Pilih pegawai ({getFilteredSuggestions(pIndex).length} tersedia)
                                            </div>
                                            {getFilteredSuggestions(pIndex).map((suggestion, idx) => (
                                                <div
                                                    key={`${pIndex}-${idx}`}
                                                    className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-indigo-50 ${
                                                        selectedIndex === idx ? 'bg-indigo-100' : ''
                                                    }`}
                                                    onClick={() => handleSelectPegawai(pIndex, suggestion)}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onMouseEnter={() => setSelectedIndex(idx)}
                                                >
                                                    <div className="font-medium text-gray-900">{suggestion.nama}</div>
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        {suggestion.nip && (
                                                            <span className="inline-block mr-2 px-2 py-0.5 bg-gray-100 rounded">
                                                                NIP: {suggestion.nip}
                                                            </span>
                                                        )}
                                                        {suggestion.jabatan && (
                                                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                                                {suggestion.jabatan}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {suggestion.username && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Username: {suggestion.username}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="px-3 py-3 text-gray-500 text-center">
                                            {searchTerms[pIndex]?.length >= 1 ? (
                                                <div>
                                                    <svg className="w-6 h-6 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Tidak ditemukan untuk "{searchTerms[pIndex]}"
                                                    <div className="text-xs mt-1">
                                                        Pegawai mungkin sudah dipilih atau tidak tersedia
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <svg className="w-6 h-6 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                    </svg>
                                                    Ketik nama, NIP, atau username untuk mencari
                                                    {availableSuggestions.length > 0 && (
                                                        <div className="text-xs mt-1">
                                                            {availableSuggestions.length} pegawai tersedia
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                NIP
                            </label>
                            <input
                                type="text"
                                value={pegawai.nip}
                                onChange={(e) => handlePegawaiChange(pIndex, 'nip', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                                    pegawai.pegawai_id 
                                        ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                                        : 'border-gray-300 focus:ring-indigo-500'
                                }`}
                                disabled={formLoading || pegawai.pegawai_id}
                                placeholder={pegawai.pegawai_id ? "Terisi otomatis" : "Akan terisi otomatis"}
                                readOnly={pegawai.pegawai_id}
                            />
                            {pegawai.pegawai_id && (
                                <div className="mt-1 text-xs text-green-600 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Terisi dari sistem
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Jabatan
                            </label>
                            <input
                                type="text"
                                value={pegawai.jabatan}
                                onChange={(e) => handlePegawaiChange(pIndex, 'jabatan', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                                    pegawai.pegawai_id 
                                        ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                                        : 'border-gray-300 focus:ring-indigo-500'
                                }`}
                                disabled={formLoading || pegawai.pegawai_id}
                                placeholder={pegawai.pegawai_id ? "Terisi otomatis" : "Akan terisi otomatis"}
                                readOnly={pegawai.pegawai_id}
                            />
                        </div>
                    </div>

                    {/* Hidden fields */}
                    <input type="hidden" name={`pegawai[${pIndex}][pegawai_id]`} value={pegawai.pegawai_id || ''} />
                    <input type="hidden" name={`pegawai[${pIndex}][username]`} value={pegawai.username || ''} />
                    <input type="hidden" name={`pegawai[${pIndex}][email]`} value={pegawai.email || ''} />

                    {/* Info jika pegawai sudah dipilih */}
                    {pegawai.pegawai_id && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-green-700">
                                    <span className="font-medium">Pegawai sudah dipilih dari sistem.</span> 
                                    <span className="ml-1">Tidak akan muncul di daftar pencarian untuk pegawai lain.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rincian Biaya */}
                    <div className="space-y-6 mt-6">
                        {/* Transportasi */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h6 className="font-medium text-gray-700 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Transportasi
                                </h6>
                                <button
                                    type="button"
                                    onClick={() => addBiayaItem(pIndex, 0, 'transportasi')}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    disabled={formLoading}
                                >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Tambah Transportasi
                                </button>
                            </div>
                            {pegawai.biaya[0].transportasi.map((transport, tIndex) => (
                                <div key={tIndex} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 last:mb-0">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Jenis</label>
                                        <input
                                            type="text"
                                            placeholder="Berangkat/Pulang/Pesawat/dll"
                                            value={transport.trans}
                                            onChange={(e) => handleBiayaChange(pIndex, 0, 'transportasi', tIndex, 'trans', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                            disabled={formLoading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Harga (Rp)</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={transport.harga}
                                            onChange={(e) => handleBiayaChange(pIndex, 0, 'transportasi', tIndex, 'harga', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                            disabled={formLoading}
                                        />
                                    </div>
                                    <div className="flex items-end space-x-2">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-600 mb-1">Total</label>
                                            <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium">
                                                Rp {formatRupiah(transport.total)}
                                            </div>
                                        </div>
                                        {pegawai.biaya[0].transportasi.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeBiayaItem(pIndex, 0, 'transportasi', tIndex)}
                                                className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                                                disabled={formLoading}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Uang Harian - Hanya untuk LS */}
                        {jenisSPM === 'LS' && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h6 className="font-medium text-gray-700 flex items-center">
                                       <svg className="w-4 h-4 mr-2 text-green-500" viewBox="0 0 24 24">
                                            <text x="0" y="18" fontFamily="Arial" fontSize="18" fontWeight="bold">Rp</text>
                                        </svg>
                                        Uang Harian
                                    </h6>
                                    <button
                                        type="button"
                                        onClick={() => addBiayaItem(pIndex, 0, 'uang_harian_items')}
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                        disabled={formLoading}
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Tambah Uang Harian
                                    </button>
                                </div>
                                {pegawai.biaya[0].uang_harian_items.map((uh, uIndex) => (
                                    <div key={uIndex} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 last:mb-0">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Jenis</label>
                                            <input
                                                type="text"
                                                placeholder="UH Biasa, UH Diklat, UH 8 Jam"
                                                value={uh.jenis}
                                                onChange={(e) => handleBiayaChange(pIndex, 0, 'uang_harian_items', uIndex, 'jenis', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                disabled={formLoading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Qty</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={uh.qty}
                                                onChange={(e) => handleBiayaChange(pIndex, 0, 'uang_harian_items', uIndex, 'qty', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                disabled={formLoading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Harga (Rp)</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={uh.harga}
                                                onChange={(e) => handleBiayaChange(pIndex, 0, 'uang_harian_items', uIndex, 'harga', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                disabled={formLoading}
                                            />
                                        </div>
                                        <div className="flex items-end space-x-2">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-600 mb-1">Total</label>
                                                <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium">
                                                    Rp {formatRupiah(uh.total)}
                                                </div>
                                            </div>
                                            {pegawai.biaya[0].uang_harian_items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBiayaItem(pIndex, 0, 'uang_harian_items', uIndex)}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                                                    disabled={formLoading}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Penginapan - Hanya untuk LS */}
                        {jenisSPM === 'LS' && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h6 className="font-medium text-gray-700 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Penginapan
                                    </h6>
                                    <button
                                        type="button"
                                        onClick={() => addBiayaItem(pIndex, 0, 'penginapan_items')}
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                        disabled={formLoading}
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Tambah Penginapan
                                    </button>
                                </div>
                                {pegawai.biaya[0].penginapan_items.map((penginapan, pIdx) => (
                                    <div key={pIdx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 last:mb-0">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Jenis</label>
                                            <input
                                                type="text"
                                                placeholder="Hotel/Penginapan"
                                                value={penginapan.jenis}
                                                onChange={(e) => handleBiayaChange(pIndex, 0, 'penginapan_items', pIdx, 'jenis', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                disabled={formLoading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Qty (Malam)</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={penginapan.qty}
                                                onChange={(e) => handleBiayaChange(pIndex, 0, 'penginapan_items', pIdx, 'qty', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                disabled={formLoading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Harga (Rp)</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={penginapan.harga}
                                                onChange={(e) => handleBiayaChange(pIndex, 0, 'penginapan_items', pIdx, 'harga', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                disabled={formLoading}
                                            />
                                        </div>
                                        <div className="flex items-end space-x-2">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-600 mb-1">Total</label>
                                                <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium">
                                                    Rp {formatRupiah(penginapan.total)}
                                                </div>
                                            </div>
                                            {pegawai.biaya[0].penginapan_items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBiayaItem(pIndex, 0, 'penginapan_items', pIdx)}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                                                    disabled={formLoading}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Informasi untuk KKP */}
                        {jenisSPM === 'KKP' && (
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-purple-700">
                                        <span className="font-medium">Mode KKP Aktif:</span> Hanya Transportasi yang dihitung. Uang Harian dan Penginapan tidak tersedia untuk jenis SPM ini.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Empty State */}
            {pegawaiList.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623a10.953 10.953 0 01-.665 3.257m0 0a8.97 8.97 0 01-3.395.77m3.395-.77a8.97 8.97 0 00-1.286-.203m1.286.203a8.971 8.971 0 01-1.286.203" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data pegawai</h3>
                    <p className="text-gray-500 mb-4">Tambahkan pegawai untuk mulai mengisi data kegiatan</p>
                    <button
                        type="button"
                        onClick={addPegawai}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                        disabled={formLoading}
                    >
                        Tambah Pegawai Pertama
                    </button>
                </div>
            )}
        </div>
    );
};

export default PegawaiForm;