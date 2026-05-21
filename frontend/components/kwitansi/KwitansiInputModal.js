// components/kwitansi/KwitansiInputModal.js
import React, { useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function KwitansiInputModal({ kegiatan, pegawai, onClose, onSuccess }) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    
    // Form data
    const [formData, setFormData] = useState({
        no_lpd: '',
        tgl_kwitansi: new Date().toISOString().split('T')[0]
    });
    
    // SPTJM Transport data - bisa multiple entries dengan file
    const [sptjmList, setSptjmList] = useState([
        {
            id: Date.now(),
            jenis_transport: '',
            nama_maskapai: '',
            kode_penerbangan: '',
            nomor_kursi: '',
            files: [] // Array untuk menyimpan file
        }
    ]);
    
    // Jenis transport options
    const jenisTransportOptions = [
        { value: '', label: 'Pilih Jenis Transport' },
        { value: 'Pesawat', label: '✈️ Pesawat' },
        { value: 'Kereta Api', label: '🚆 Kereta Api' },
        { value: 'Bus', label: '🚌 Bus' },
        { value: 'Travel', label: '🚐 Travel' },
        { value: 'Taksi', label: '🚕 Taksi' },
        { value: 'Kapal/Laut', label: '⛴️ Kapal Laut' },
        { value: 'Mobil Dinas', label: '🚗 Mobil Dinas' },
        { value: 'Kendaraan Pribadi', label: '🏍️ Kendaraan Pribadi' },
        { value: 'Ojek', label: '🏍️ Ojek' },
        { value: 'Lainnya', label: '📦 Lainnya' }
    ];
    
    // Add new SPTJM entry
    const addSptjmEntry = () => {
        setSptjmList([
            ...sptjmList,
            {
                id: Date.now(),
                jenis_transport: '',
                nama_maskapai: '',
                kode_penerbangan: '',
                nomor_kursi: '',
                files: []
            }
        ]);
    };
    
    // Remove SPTJM entry
    const removeSptjmEntry = (id) => {
        if (sptjmList.length === 1) {
            setMessage('Minimal harus ada satu data transport');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setSptjmList(sptjmList.filter(item => item.id !== id));
    };
    
    // Update SPTJM entry
    const updateSptjmEntry = (id, field, value) => {
        setSptjmList(sptjmList.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };
    
    // Add file to SPTJM entry
    const addFileToSptjm = (sptjmId, file) => {
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setMessage('Hanya file JPG, JPEG, PNG, PDF, atau Word yang diperbolehkan');
                setMessageType('error');
                setTimeout(() => setMessage(''), 3000);
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                setMessage('Ukuran file maksimal 10MB');
                setMessageType('error');
                setTimeout(() => setMessage(''), 3000);
                return;
            }
            
            setSptjmList(sptjmList.map(item => 
                item.id === sptjmId 
                    ? { ...item, files: [...item.files, { file, preview: URL.createObjectURL(file), name: file.name }] }
                    : item
            ));
        }
    };
    
    // Remove file from SPTJM entry
    const removeFileFromSptjm = (sptjmId, fileIndex) => {
        setSptjmList(sptjmList.map(item => 
            item.id === sptjmId 
                ? { ...item, files: item.files.filter((_, idx) => idx !== fileIndex) }
                : item
        ));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.no_lpd.trim()) {
            setMessage('No SPD wajib diisi');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        
        if (!formData.tgl_kwitansi) {
            setMessage('Tanggal kwitansi wajib diisi');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        
        // Validasi SPTJM Transport
        const invalidSptjm = sptjmList.some(item => 
            item.jenis_transport === '' && 
            (item.nama_maskapai !== '' || item.kode_penerbangan !== '' || item.nomor_kursi !== '' || item.files.length > 0)
        );
        
        if (invalidSptjm) {
            setMessage('Jenis transport harus diisi jika mengisi data transport lainnya atau upload file');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        
        setLoading(true);
        setMessage('');
        
        try {
            // 1. Simpan kwitansi
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/kwitansi`,
                {
                    kegiatan_id: kegiatan.id,
                    pegawai_id: pegawai.id,
                    no_lpd: formData.no_lpd,
                    tgl_kwitansi: formData.tgl_kwitansi
                },
                {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data.success) {
                const kwitansiId = response.data.data.id;
                
                // 2. Siapkan data SPTJM Transport untuk dikirim
                const validSptjm = sptjmList.filter(item => item.jenis_transport !== '');
                
                if (validSptjm.length > 0) {
                    // Siapkan FormData untuk upload files
                    const formDataToSend = new FormData();
                    
                    // Tambahkan data sptjm_list sebagai JSON
                    const sptjmData = validSptjm.map(item => ({
                        jenis_transport: item.jenis_transport,
                        nama_maskapai: item.nama_maskapai,
                        kode_penerbangan: item.kode_penerbangan,
                        nomor_kursi: item.nomor_kursi,
                        files: item.files.map(f => ({ file_name: f.name }))
                    }));
                    
                    formDataToSend.append('sptjm_list', JSON.stringify(sptjmData));
                    formDataToSend.append('kegiatan_id', kegiatan.id);
                    formDataToSend.append('pegawai_id', pegawai.id);
                    
                    // Tambahkan semua files
                    let fileIndex = 0;
                    for (const item of validSptjm) {
                        for (const fileObj of item.files) {
                            formDataToSend.append('files', fileObj.file);
                            fileIndex++;
                        }
                    }
                    
                    await axios.post(
                        `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-transport/${kwitansiId}`,
                        formDataToSend,
                        {
                            headers: {
                                Authorization: `Bearer ${session.accessToken}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                }
                
                if (onSuccess) {
                    onSuccess('Kwitansi dan SPTJM Transport berhasil disimpan');
                }
                onClose();
            } else {
                setMessage(response.data.message || 'Gagal menyimpan data');
                setMessageType('error');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error saving kwitansi:', error);
            setMessage(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white">
                        <h3 className="text-lg font-medium">
                            Input Kwitansi - {pegawai.nama}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg ${
                            messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {message}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        {/* Info Kegiatan */}
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Informasi Kegiatan</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="font-medium">Kegiatan:</span> {kegiatan.kegiatan}</div>
                                <div><span className="font-medium">No ST:</span> {kegiatan.no_st || '-'}</div>
                                <div><span className="font-medium">MAK:</span> {kegiatan.mak}</div>
                                <div><span className="font-medium">Pegawai:</span> {pegawai.nama}</div>
                            </div>
                        </div>
                        
                        {/* Data Kwitansi */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">No SPD *</label>
                            <input
                                type="text"
                                value={formData.no_lpd}
                                onChange={(e) => setFormData({ ...formData, no_lpd: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Masukkan No SPD"
                                required
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kwitansi *</label>
                            <input
                                type="date"
                                value={formData.tgl_kwitansi}
                                onChange={(e) => setFormData({ ...formData, tgl_kwitansi: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        
                        {/* SPTJM Transport Section */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-700">SPTJM Transport</h4>
                                <button
                                    type="button"
                                    onClick={addSptjmEntry}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Tambah Transport
                                </button>
                            </div>
                            
                            <p className="text-xs text-gray-500 mb-3">
                                Isi data transportasi yang digunakan selama perjalanan dinas. Anda bisa menambahkan beberapa transport dan upload file pendukung.
                            </p>
                            
                            {sptjmList.map((item, index) => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-4 mb-3 relative">
                                    <div className="absolute top-2 right-2">
                                        <button
                                            type="button"
                                            onClick={() => removeSptjmEntry(item.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Hapus"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3m-9 0h12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Jenis Transport {index === 0 ? '*' : ''}
                                            </label>
                                            <select
                                                value={item.jenis_transport}
                                                onChange={(e) => updateSptjmEntry(item.id, 'jenis_transport', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                {jenisTransportOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Maskapai / Perusahaan</label>
                                            <input
                                                type="text"
                                                value={item.nama_maskapai}
                                                onChange={(e) => updateSptjmEntry(item.id, 'nama_maskapai', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Contoh: Garuda Indonesia, Arjuna Express"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Penerbangan / No. Polisi</label>
                                            <input
                                                type="text"
                                                value={item.kode_penerbangan}
                                                onChange={(e) => updateSptjmEntry(item.id, 'kode_penerbangan', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Contoh: GA-123, B-1234 AB"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Kursi / Kabin</label>
                                            <input
                                                type="text"
                                                value={item.nomor_kursi}
                                                onChange={(e) => updateSptjmEntry(item.id, 'nomor_kursi', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Contoh: 12A, Eksekutif"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* File Upload Section */}
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            File Pendukung (tiket, boarding pass, dll)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        addFileToSptjm(item.id, e.target.files[0]);
                                                    }
                                                    e.target.value = '';
                                                }}
                                                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                                className="flex-1 text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                            />
                                        </div>
                                        
                                        {/* List Files */}
                                        {item.files.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {item.files.map((fileObj, fileIdx) => (
                                                    <div key={fileIdx} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                                        <div className="flex items-center gap-2">
                                                            {fileObj.file.type.startsWith('image/') && fileObj.preview && (
                                                                <img src={fileObj.preview} alt="preview" className="w-8 h-8 object-cover rounded" />
                                                            )}
                                                            {fileObj.file.type === 'application/pdf' && (
                                                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                            )}
                                                            {fileObj.file.type.includes('word') && (
                                                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            )}
                                                            <span className="text-sm text-gray-600 truncate max-w-xs">{fileObj.file.name}</span>
                                                            <span className="text-xs text-gray-400">
                                                                ({(fileObj.file.size / 1024).toFixed(1)} KB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFileFromSptjm(item.id, fileIdx)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3m-9 0h12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t mt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : '💾 Simpan Kwitansi'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}