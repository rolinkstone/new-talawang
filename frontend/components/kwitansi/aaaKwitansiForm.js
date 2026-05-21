// components/kwitansi/KwitansiForm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function KwitansiForm({ onSuccess, onCancel }) {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [existingKwitansi, setExistingKwitansi] = useState({});
    const [selectedPegawai, setSelectedPegawai] = useState(null);
    const [showFormPegawai, setShowFormPegawai] = useState(false);
    const [isLoadingKegiatan, setIsLoadingKegiatan] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    
    const [formData, setFormData] = useState({
        kegiatan_id: '',
        pegawai_id: '',
        no_lpd: '',
        tgl_kwitansi: '',
        upload_kwitansi: null
    });
    
    // Format Rupiah
    const formatRupiah = (number) => {
        if (!number) return '0';
        return new Intl.NumberFormat('id-ID').format(number);
    };
    
    // Search kegiatan by No ST
    const handleSearchKegiatan = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        
        if (!session?.accessToken) {
            console.error('No access token available');
            return;
        }
        
        setIsLoadingKegiatan(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            if (res.data.success) {
                const filtered = res.data.data.filter(item => 
                    item.no_st && item.no_st.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setSearchResults(filtered);
                setShowResults(filtered.length > 0);
            }
        } catch (error) {
            console.error('Error searching kegiatan:', error);
        } finally {
            setIsLoadingKegiatan(false);
        }
    };
    
    // Pilih kegiatan
    const selectKegiatan = async (kegiatan) => {
        setSelectedKegiatan(kegiatan);
        setSearchTerm(kegiatan.no_st);
        setShowResults(false);
        setShowFormPegawai(false);
        setSelectedPegawai(null);
        
        try {
            // Fetch detail kegiatan untuk mendapatkan pegawai
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kegiatan/${kegiatan.id}/detail`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            
            if (res.data.success && res.data.data.pegawai) {
                setPegawaiList(res.data.data.pegawai);
                
                // Check existing kwitansi untuk setiap pegawai
                const kwitansiRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/kegiatan/${kegiatan.id}`, {
                    headers: { Authorization: `Bearer ${session.accessToken}` }
                });
                
                const existingMap = {};
                if (kwitansiRes.data.success) {
                    kwitansiRes.data.data.forEach(k => {
                        existingMap[k.pegawai_id] = k;
                    });
                }
                setExistingKwitansi(existingMap);
            }
        } catch (error) {
            console.error('Error fetching pegawai:', error);
        }
    };
    
    // Pilih pegawai untuk input kwitansi
    const handlePilihPegawai = (pegawai) => {
        const existing = existingKwitansi[pegawai.id];
        if (existing) {
            alert(`Pegawai ${pegawai.nama} sudah memiliki kwitansi dengan No LPD: ${existing.no_lpd}`);
            return;
        }
        
        setSelectedPegawai(pegawai);
        setFormData({
            kegiatan_id: selectedKegiatan.id,
            pegawai_id: pegawai.id,
            no_lpd: '',
            tgl_kwitansi: '',
            upload_kwitansi: null
        });
        setShowFormPegawai(true);
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('kegiatan_id', formData.kegiatan_id);
            formDataToSend.append('pegawai_id', formData.pegawai_id);
            formDataToSend.append('no_lpd', formData.no_lpd);
            formDataToSend.append('tgl_kwitansi', formData.tgl_kwitansi);
            
            if (formData.upload_kwitansi) {
                formDataToSend.append('upload_kwitansi', formData.upload_kwitansi);
            }
            
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi`, formDataToSend, {
                headers: { 
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.success) {
                alert('Kwitansi berhasil disimpan');
                setShowFormPegawai(false);
                setSelectedPegawai(null);
                // Refresh pegawai list to update status
                selectKegiatan(selectedKegiatan);
                onSuccess();
            } else {
                setFormError(response.data.message);
            }
        } catch (error) {
            console.error('Error saving kwitansi:', error);
            setFormError(error.response?.data?.message || 'Terjadi kesalahan');
        } finally {
            setFormLoading(false);
        }
    };
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, upload_kwitansi: file });
        }
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchKegiatan();
        }
    };
    
    return (
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
                Input Kwitansi Perjalanan Dinas
            </h3>
            
            {/* Step 1: Search by No ST */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Step 1: Cari Kegiatan Berdasarkan No ST / Surat Tugas
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Masukkan No ST"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="button"
                        onClick={handleSearchKegiatan}
                        disabled={isLoadingKegiatan}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        {isLoadingKegiatan ? 'Mencari...' : 'Cari'}
                    </button>
                    {selectedKegiatan && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedKegiatan(null);
                                setSearchTerm('');
                                setPegawaiList([]);
                                setShowFormPegawai(false);
                            }}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
                        >
                            Clear
                        </button>
                    )}
                </div>
                
                {showResults && searchResults.length > 0 && (
                    <div className="mt-3 border border-gray-300 rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                            Hasil Pencarian ({searchResults.length}):
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {searchResults.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => selectKegiatan(item)}
                                    className="px-3 py-2 border-b border-gray-200 hover:bg-blue-100 cursor-pointer"
                                >
                                    <div className="font-medium">No ST: {item.no_st}</div>
                                    <div className="text-sm">Kegiatan: {item.kegiatan}</div>
                                    <div className="text-sm text-gray-500">MAK: {item.mak} | Lokasi: {item.kota_kab_kecamatan}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Step 2: Display Kegiatan Info and Pegawai List */}
            {selectedKegiatan && !showFormPegawai && (
                <div className="mb-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                        <h4 className="font-semibold text-green-800 mb-2">Kegiatan Terpilih:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">No ST:</span> {selectedKegiatan.no_st}</div>
                            <div><span className="font-medium">Kegiatan:</span> {selectedKegiatan.kegiatan}</div>
                            <div><span className="font-medium">MAK:</span> {selectedKegiatan.mak}</div>
                            <div><span className="font-medium">Lokasi:</span> {selectedKegiatan.kota_kab_kecamatan}</div>
                        </div>
                    </div>
                    
                    <h4 className="font-semibold text-gray-700 mb-3">Step 2: Pilih Pegawai untuk Input Kwitansi</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left">No</th>
                                    <th className="px-4 py-2 text-left">Nama Pegawai</th>
                                    <th className="px-4 py-2 text-left">NIP</th>
                                    <th className="px-4 py-2 text-left">Jabatan</th>
                                    <th className="px-4 py-2 text-right">Total Biaya</th>
                                    <th className="px-4 py-2 text-center">Status</th>
                                    <th className="px-4 py-2 text-center">Aksi</th>
                                 </tr>
                            </thead>
                            <tbody>
                                {pegawaiList.map((pegawai, idx) => {
                                    const sudahInput = existingKwitansi[pegawai.id];
                                    return (
                                        <tr key={pegawai.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{idx + 1}</td>
                                            <td className="px-4 py-2 font-medium">{pegawai.nama}</td>
                                            <td className="px-4 py-2">{pegawai.nip || '-'}</td>
                                            <td className="px-4 py-2">{pegawai.jabatan || '-'}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-green-600">
                                                Rp {formatRupiah(pegawai.total_biaya)}
                                              </td>
                                            <td className="px-4 py-2 text-center">
                                                {sudahInput ? (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                        Sudah Input (LPD: {sudahInput.no_lpd})
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                                        Belum Input
                                                    </span>
                                                )}
                                              </td>
                                            <td className="px-4 py-2 text-center">
                                                {!sudahInput && (
                                                    <button
                                                        onClick={() => handlePilihPegawai(pegawai)}
                                                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                                    >
                                                        Input Kwitansi
                                                    </button>
                                                )}
                                              </td>
                                          </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Step 3: Form Input Kwitansi per Pegawai */}
            {showFormPegawai && selectedPegawai && (
                <div className="mt-6 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="font-semibold text-indigo-800">
                                Input Kwitansi untuk: {selectedPegawai.nama} ({selectedPegawai.nip})
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Total Biaya dari Nominatif: <span className="font-bold text-green-600">Rp {formatRupiah(selectedPegawai.total_biaya)}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFormPegawai(false)}
                            className="text-red-500 hover:text-red-700"
                        >
                            Batal
                        </button>
                    </div>
                    
                    {formError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                            {formError}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    No LPD <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.no_lpd}
                                    onChange={(e) => setFormData({ ...formData, no_lpd: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                    placeholder="Contoh: LPD-001/2024"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tanggal Kwitansi
                                </label>
                                <input
                                    type="date"
                                    value={formData.tgl_kwitansi}
                                    onChange={(e) => setFormData({ ...formData, tgl_kwitansi: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Upload Kwitansi
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max 5MB)</p>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowFormPegawai(false)}
                                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {formLoading ? 'Menyimpan...' : 'Simpan Kwitansi'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {!selectedKegiatan && !showResults && (
                <div className="text-center text-gray-500 py-4">
                    Masukkan No ST untuk mencari kegiatan
                </div>
            )}
            
            {selectedKegiatan && !showFormPegawai && pegawaiList.length === 0 && (
                <div className="text-center text-yellow-500 py-4">
                    Tidak ada pegawai dalam kegiatan ini
                </div>
            )}
            
            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                    Tutup Form
                </button>
            </div>
        </div>
    );
}