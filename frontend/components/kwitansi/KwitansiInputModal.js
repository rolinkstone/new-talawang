// components/kwitansi/KwitansiInputModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function KwitansiInputModal({ kegiatan, pegawai, onClose, onSuccess }) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    
    // Mode edit jika sudah ada kwitansi_id
    const isEdit = !!pegawai?.kwitansi_id;
    
    // Form data — pre-fill jika edit
    const [formData, setFormData] = useState({
        no_lpd: pegawai?.no_lpd || '',
        tgl_kwitansi: pegawai?.tgl_kwitansi 
            ? new Date(pegawai.tgl_kwitansi).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
        tgl_spd: pegawai?.tgl_spd 
            ? new Date(pegawai.tgl_spd).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0]
    });
    
    // SPTJM Transport data - bisa multiple entries dengan file
    const [sptjmList, setSptjmList] = useState([
        {
            id: Date.now(),
            jenis_transport: '',
            nama_maskapai: '',
            kode_penerbangan: '',
            nomor_kursi: '',
            files: []
        }
    ]);
    
    // SPTJM Penginapan data - bisa multiple entries dengan file
    const [penginapanList, setPenginapanList] = useState([
        {
            id: Date.now(),
            nama_penginapan: '',
            alamat_penginapan: '',
            nomor_kamar: '',
            tarif_hotel: '',
            tgl_menginap: '',
            files: []
        }
    ]);
    
    // Load existing SPTJM data saat edit
    useEffect(() => {
        if (!isEdit || !pegawai?.kwitansi_id || !session?.accessToken) return;
        
        const loadExistingData = async () => {
            setDataLoading(true);
            try {
                const headers = { Authorization: `Bearer ${session.accessToken}` };
                const kwitansiId = pegawai.kwitansi_id;
                
                // Load SPTJM Transport
                const [transportRes, penginapanRes] = await Promise.all([
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-transport/${kwitansiId}`, { headers }),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-penginapan/${kwitansiId}`, { headers })
                ]);
                
                if (transportRes.data.success && transportRes.data.data.length > 0) {
                    setSptjmList(transportRes.data.data.map(item => ({
                        id: item.id || Date.now(),
                        jenis_transport: item.jenis_transport || '',
                        nama_maskapai: item.nama_maskapai || '',
                        kode_penerbangan: item.kode_penerbangan || '',
                        nomor_kursi: item.nomor_kursi || '',
                        files: (item.files || []).map(f => ({
                            // Normalisasi: bungkus dalam objek { file, preview, name } seperti upload baru
                            file: {
                                name: f.file_name || '',
                                type: f.file_type || 'application/octet-stream',
                                size: f.file_size || 0,
                                lastModified: null
                            },
                            preview: f.file_path 
                                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}${f.file_path}`
                                : null,
                            name: f.file_name || '',
                            id: f.id,
                            isExisting: true
                        }))
                    })));
                }
                
                if (penginapanRes.data.success && penginapanRes.data.data.length > 0) {
                    setPenginapanList(penginapanRes.data.data.map(item => ({
                        id: item.id || Date.now(),
                        nama_penginapan: item.nama_penginapan || '',
                        alamat_penginapan: item.alamat_penginapan || '',
                        nomor_kamar: item.nomor_kamar || '',
                        tarif_hotel: item.tarif_hotel || '',
                        tgl_menginap: item.tgl_menginap 
                            ? new Date(item.tgl_menginap).toISOString().split('T')[0] 
                            : '',
                        files: (item.files || []).map(f => ({
                            file: {
                                name: f.file_name || '',
                                type: f.file_type || 'application/octet-stream',
                                size: f.file_size || 0,
                                lastModified: null
                            },
                            preview: f.file_path 
                                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}${f.file_path}`
                                : null,
                            name: f.file_name || '',
                            id: f.id,
                            isExisting: true
                        }))
                    })));
                }
            } catch (err) {
                console.error('Error loading existing SPTJM data:', err);
            } finally {
                setDataLoading(false);
            }
        };
        
        loadExistingData();
    }, [isEdit, pegawai?.kwitansi_id, session]);
    
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
    
    // Fungsi untuk format Rupiah
    const formatRupiah = (value) => {
        if (!value || value === 0) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };
    
    // Parse biaya_list dari kegiatan
    const parseBiayaList = () => {
        let biayaData = null;
        
        if (kegiatan.pegawai && kegiatan.pegawai.length > 0) {
            const selectedPegawai = kegiatan.pegawai.find(p => p.id === pegawai.id);
            if (selectedPegawai && selectedPegawai.biaya_list && selectedPegawai.biaya_list.length > 0) {
                biayaData = selectedPegawai.biaya_list[0];
            }
        }
        
        if (!biayaData && kegiatan.biaya_list && kegiatan.biaya_list.length > 0) {
            biayaData = kegiatan.biaya_list[0];
        }
        
        return {
            transport: biayaData?.transportasi || [],
            penginapan: biayaData?.penginapan || []
        };
    };
    
    const { transport, penginapan } = parseBiayaList();
    
    // Hitung total transportasi
    const totalTransportasi = transport.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    // Hitung total penginapan
    const totalPenginapan = penginapan.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    // Total keseluruhan
    const totalKeseluruhan = totalTransportasi + totalPenginapan;
    
    // ============ Fungsi untuk SPTJM Transport ============
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
    
    const removeSptjmEntry = (id) => {
        if (sptjmList.length === 1) {
            setMessage('Minimal harus ada satu data transport');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setSptjmList(sptjmList.filter(item => item.id !== id));
    };
    
    const updateSptjmEntry = (id, field, value) => {
        setSptjmList(sptjmList.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };
    
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
    
    const removeFileFromSptjm = (sptjmId, fileIndex) => {
        setSptjmList(sptjmList.map(item => 
            item.id === sptjmId 
                ? { ...item, files: item.files.filter((_, idx) => idx !== fileIndex) }
                : item
        ));
    };
    
    // ============ Fungsi untuk SPTJM Penginapan ============
    const addPenginapanEntry = () => {
        setPenginapanList([
            ...penginapanList,
            {
                id: Date.now(),
                nama_penginapan: '',
                alamat_penginapan: '',
                nomor_kamar: '',
                tarif_hotel: '',
                tgl_menginap: '',
                files: []
            }
        ]);
    };
    
    const removePenginapanEntry = (id) => {
        if (penginapanList.length === 1) {
            setMessage('Minimal harus ada satu data penginapan');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setPenginapanList(penginapanList.filter(item => item.id !== id));
    };
    
    const updatePenginapanEntry = (id, field, value) => {
        setPenginapanList(penginapanList.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };
    
    const addFileToPenginapan = (penginapanId, file) => {
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                setMessage('Hanya file JPG, JPEG, PNG, atau PDF yang diperbolehkan');
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
            
            setPenginapanList(penginapanList.map(item => 
                item.id === penginapanId 
                    ? { ...item, files: [...item.files, { file, preview: URL.createObjectURL(file), name: file.name }] }
                    : item
            ));
        }
    };
    
    const removeFileFromPenginapan = (penginapanId, fileIndex) => {
        setPenginapanList(penginapanList.map(item => 
            item.id === penginapanId 
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
        
        if (!formData.tgl_spd) {
            setMessage('Tanggal SPD wajib diisi');
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
            // 1. Simpan kwitansi (POST = baru, PUT = update)
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/kwitansi`;
            const payload = {
                kegiatan_id: kegiatan.id,
                pegawai_id: pegawai.id,
                no_lpd: formData.no_lpd,
                tgl_kwitansi: formData.tgl_kwitansi,
                tgl_spd: formData.tgl_spd
            };
            
            let response;
            if (isEdit && pegawai.kwitansi_id) {
                response = await axios.put(
                    `${apiUrl}/${pegawai.kwitansi_id}`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } else {
                response = await axios.post(
                    apiUrl,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }
            
            if (response.data.success) {
                const kwitansiId = response.data.data.id;
                
                // 2. Simpan SPTJM Transport
                const validSptjm = sptjmList.filter(item => item.jenis_transport !== '');
                
                if (validSptjm.length > 0) {
                    const formDataToSend = new FormData();
                    
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
                    
                    for (const item of validSptjm) {
                        for (const fileObj of item.files) {
                            // Hanya kirim file baru (bukan existing dari database)
                            if (!fileObj.isExisting && fileObj.file instanceof File) {
                                formDataToSend.append('files', fileObj.file);
                            }
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
                
                // 3. Simpan SPTJM Penginapan
                const validPenginapan = penginapanList.filter(item => 
                    item.nama_penginapan !== '' || 
                    item.alamat_penginapan !== '' || 
                    item.nomor_kamar !== '' || 
                    item.tarif_hotel !== '' || 
                    item.tgl_menginap !== '' ||
                    item.files.length > 0
                );
                
                if (validPenginapan.length > 0) {
                    const formDataPenginapan = new FormData();
                    
                    const penginapanData = validPenginapan.map(item => ({
                        nama_penginapan: item.nama_penginapan,
                        alamat_penginapan: item.alamat_penginapan,
                        nomor_kamar: item.nomor_kamar,
                        tarif_hotel: item.tarif_hotel ? parseFloat(item.tarif_hotel) : null,
                        tgl_menginap: item.tgl_menginap,
                        files: item.files.map(f => ({ file_name: f.name }))
                    }));
                    
                    formDataPenginapan.append('penginapan_list', JSON.stringify(penginapanData));
                    formDataPenginapan.append('kegiatan_id', kegiatan.id);
                    formDataPenginapan.append('pegawai_id', pegawai.id);
                    
                    for (const item of validPenginapan) {
                        for (const fileObj of item.files) {
                            if (!fileObj.isExisting && fileObj.file instanceof File) {
                                formDataPenginapan.append('files', fileObj.file);
                            }
                        }
                    }
                    
                    await axios.post(
                        `${process.env.NEXT_PUBLIC_API_URL}/kwitansi/sptjm-penginapan/${kwitansiId}`,
                        formDataPenginapan,
                        {
                            headers: {
                                Authorization: `Bearer ${session.accessToken}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                }
                
                if (onSuccess) {
                    onSuccess('Kwitansi, SPTJM Transport, dan SPTJM Penginapan berhasil disimpan');
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
                <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4 sticky top-0 bg-white dark:bg-gray-800">
                        <h3 className="text-lg font-medium dark:text-gray-100">
                            {isEdit ? '✏️ Edit Kwitansi' : 'Input Kwitansi'} - {pegawai.nama}
                            {dataLoading && <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">Memuat data...</span>}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg ${
                            messageType === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                        }`}>
                            {message}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        {/* Info Kegiatan */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Informasi Kegiatan</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="font-medium dark:text-gray-200">Kegiatan:</span> <span className="dark:text-gray-300">{kegiatan.kegiatan}</span></div>
                                <div><span className="font-medium dark:text-gray-200">No ST:</span> <span className="dark:text-gray-300">{kegiatan.no_st || '-'}</span></div>
                                <div><span className="font-medium dark:text-gray-200">MAK:</span> <span className="dark:text-gray-300">{kegiatan.mak}</span></div>
                                <div><span className="font-medium dark:text-gray-200">Pegawai:</span> <span className="dark:text-gray-300">{pegawai.nama}</span></div>
                            </div>
                        </div>
                        
                        {/* KOMPONEN NOMINATIF - TABEL RINCIAN BIAYA */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 overflow-x-auto">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Rincian Biaya Perjalanan Dinas
                            </h4>
                            
                            {/* Tabel 2 Kolom: Transportasi dan Penginapan */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Kolom Transportasi */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                                    <div className="bg-blue-600 text-white p-2 text-center font-semibold text-sm">
                                        Transportasi
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="p-2 text-left">Jenis</th>
                                                <th className="p-2 text-right">Harga</th>
                                                <th className="p-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transport.length > 0 ? (
                                                transport.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                                        <td className="p-2 dark:text-gray-200">{item.jenis || '-'}</td>
                                                        <td className="p-2 text-right dark:text-gray-200">{formatRupiah(item.harga_satuan)}</td>
                                                        <td className="p-2 text-right font-medium dark:text-gray-200">{formatRupiah(item.total)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="p-4 text-center text-gray-400 dark:text-gray-500">
                                                        Tidak ada data transportasi
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="bg-blue-50 dark:bg-blue-900/40 font-semibold">
                                                <td className="p-2 dark:text-gray-200">Total Transportasi</td>
                                                <td className="p-2 text-right" colSpan="2">
                                                    {formatRupiah(totalTransportasi)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Kolom Penginapan */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                                    <div className="bg-purple-600 text-white p-2 text-center font-semibold text-sm">
                                        Penginapan
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="p-2 text-left">Jenis</th>
                                                <th className="p-2 text-center">Qty</th>
                                                <th className="p-2 text-right">Harga</th>
                                                <th className="p-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {penginapan.length > 0 ? (
                                                penginapan.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                                        <td className="p-2 dark:text-gray-200">{item.jenis || item.nama_hotel || '-'}</td>
                                                        <td className="p-2 text-center dark:text-gray-200">{item.qty || item.jumlah_malam || '-'}</td>
                                                        <td className="p-2 text-right dark:text-gray-200">{formatRupiah(item.harga_satuan)}</td>
                                                        <td className="p-2 text-right font-medium dark:text-gray-200">{formatRupiah(item.total)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="p-4 text-center text-gray-400 dark:text-gray-500">
                                                        Tidak ada data penginapan
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="bg-purple-50 dark:bg-purple-900/40 font-semibold">
                                                <td colSpan="3" className="p-2 dark:text-gray-200">Total Penginapan</td>
                                                <td className="p-2 text-right">{formatRupiah(totalPenginapan)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Grand Total */}
                            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex justify-between items-center">
                                <span className="font-bold text-lg dark:text-gray-100">TOTAL KESELURUHAN</span>
                                <span className="font-bold text-2xl text-red-600 dark:text-red-400">{formatRupiah(totalKeseluruhan)}</span>
                            </div>
                        </div>
                        
                        {/* Data Kwitansi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">No SPD *</label>
                                <input
                                    type="text"
                                    value={formData.no_lpd}
                                    onChange={(e) => setFormData({ ...formData, no_lpd: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Masukkan No SPD"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal SPD *</label>
                                <input
                                    type="date"
                                    value={formData.tgl_spd}
                                    onChange={(e) => setFormData({ ...formData, tgl_spd: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal Kwitansi *</label>
                                <input
                                    type="date"
                                    value={formData.tgl_kwitansi}
                                    onChange={(e) => setFormData({ ...formData, tgl_kwitansi: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                        
                        {/* SPTJM Transport Section */}
                        <div className="border-t dark:border-gray-700 pt-4 mt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">SPTJM Transport</h4>
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
                            
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Isi data transportasi yang digunakan selama perjalanan dinas.
                            </p>
                            
                            {sptjmList.map((item, index) => (
                                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 relative">
                                    <div className="absolute top-2 right-2">
                                        <button
                                            type="button"
                                            onClick={() => removeSptjmEntry(item.id)}
                                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                            title="Hapus"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3m-9 0h12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                Jenis Transport {index === 0 ? '*' : ''}
                                            </label>
                                            <select
                                                value={item.jenis_transport}
                                                onChange={(e) => updateSptjmEntry(item.id, 'jenis_transport', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                {jenisTransportOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Maskapai / Perusahaan</label>
                                            <input
                                                type="text"
                                                value={item.nama_maskapai}
                                                onChange={(e) => updateSptjmEntry(item.id, 'nama_maskapai', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Contoh: Garuda Indonesia, Arjuna Express"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kode Penerbangan / No. Polisi</label>
                                            <input
                                                type="text"
                                                value={item.kode_penerbangan}
                                                onChange={(e) => updateSptjmEntry(item.id, 'kode_penerbangan', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Contoh: GA-123, B-1234 AB"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nomor Kursi / Kabin</label>
                                            <input
                                                type="text"
                                                value={item.nomor_kursi}
                                                onChange={(e) => updateSptjmEntry(item.id, 'nomor_kursi', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Contoh: 12A, Eksekutif"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* File Upload untuk Transport */}
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
                                                className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-200 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800/50"
                                            />
                                        </div>
                                        
                                        {item.files.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {item.files.map((fileObj, fileIdx) => (
                                                    <div key={fileIdx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                                                        <div className="flex items-center gap-2">
                                                            {fileObj.file.type.startsWith('image/') && fileObj.preview && (
                                                                <img src={fileObj.preview} alt="preview" className="w-8 h-8 object-cover rounded" />
                                                            )}
                                                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">{fileObj.file.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFileFromSptjm(item.id, fileIdx)}
                                                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                        
                        {/* SPTJM Penginapan Section */}
                        <div className="border-t dark:border-gray-700 pt-4 mt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">SPTJM Penginapan</h4>
                                <button
                                    type="button"
                                    onClick={addPenginapanEntry}
                                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Tambah Penginapan
                                </button>
                            </div>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Isi data penginapan selama perjalanan dinas (jika ada).
                            </p>
                            
                            {penginapanList.map((item, index) => (
                                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 relative">
                                    <div className="absolute top-2 right-2">
                                        <button
                                            type="button"
                                            onClick={() => removePenginapanEntry(item.id)}
                                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                            title="Hapus"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3m-9 0h12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                Nama Hotel/Penginapan
                                            </label>
                                            <input
                                                type="text"
                                                value={item.nama_penginapan}
                                                onChange={(e) => updatePenginapanEntry(item.id, 'nama_penginapan', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Contoh: Hotel Santika, RedDoorz"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                Alamat Penginapan
                                            </label>
                                            <input
                                                type="text"
                                                value={item.alamat_penginapan}
                                                onChange={(e) => updatePenginapanEntry(item.id, 'alamat_penginapan', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Alamat lengkap hotel"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                Nomor Kamar
                                            </label>
                                            <input
                                                type="text"
                                                value={item.nomor_kamar}
                                                onChange={(e) => updatePenginapanEntry(item.id, 'nomor_kamar', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Contoh: 301, Suite Room"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                Tarif Hotel (Rp)
                                            </label>
                                            <input
                                                type="number"
                                                value={item.tarif_hotel}
                                                onChange={(e) => updatePenginapanEntry(item.id, 'tarif_hotel', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="0"
                                            />
                                            {item.tarif_hotel && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {formatRupiah(item.tarif_hotel)}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                Tanggal Menginap
                                            </label>
                                            <input
                                                type="date"
                                                value={item.tgl_menginap}
                                                onChange={(e) => updatePenginapanEntry(item.id, 'tgl_menginap', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* File Upload untuk Penginapan */}
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                            File Pendukung (bukti booking, invoice, dll)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        addFileToPenginapan(item.id, e.target.files[0]);
                                                    }
                                                    e.target.value = '';
                                                }}
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/40 file:text-purple-700 dark:file:text-purple-200 hover:file:bg-purple-100 dark:hover:file:bg-purple-800/50"
                                            />
                                        </div>
                                        
                                        {item.files.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {item.files.map((fileObj, fileIdx) => (
                                                    <div key={fileIdx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                                                        <div className="flex items-center gap-2">
                                                            {fileObj.file.type.startsWith('image/') && fileObj.preview && (
                                                                <img src={fileObj.preview} alt="preview" className="w-8 h-8 object-cover rounded" />
                                                            )}
                                                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">{fileObj.file.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFileFromPenginapan(item.id, fileIdx)}
                                                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                        
                        <div className="flex gap-3 pt-4 border-t dark:border-gray-700 mt-4 sticky bottom-0 bg-white dark:bg-gray-800">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : isEdit ? '💾 Update Kwitansi' : '💾 Simpan Kwitansi'}
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