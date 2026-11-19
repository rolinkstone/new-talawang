// components/perbaikanNominatif/Container.js
// Fitur terpisah dari modul Nominatif: PERBAIKAN NOMINATIF (khusus Admin).
// Alur: cari nominatif berdasarkan nama nominatif atau nomor surat tugas,
// lalu perbaiki data nominatif yang ditemukan.
import React, { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { FaEdit, FaRedo, FaSearch, FaTimes } from 'react-icons/fa';
import KegiatanForm from '../kegiatan/KegiatanForm';
import { formatRupiah, formatDateForDisplay } from '../../utils/formatters';

const emptyBiayaRow = () => ({
    transportasi: [{ trans: '', harga: '', total: '' }],
    uang_harian_items: [{ jenis: '', qty: '', harga: '', total: '' }],
    penginapan_items: [{ jenis: '', qty: '', harga: '', total: '' }]
});

const defaultFormData = {
    kegiatan: '',
    mak: '',
    realisasi_anggaran_sebelumnya: '',
    target_output_tahun: '',
    realisasi_output_sebelumnya: '',
    target_output_yg_akan_dicapai: '',
    kota_kab_kecamatan: '',
    kota_kab_kecamatan_encrypted: 0,
    can_view_lokasi_code: false,
    encrypt_kota_kab_kecamatan: false,
    rencana_tanggal_pelaksanaan: '',
    rencana_tanggal_pelaksanaan_akhir: '',
    jenis_spm: '',
    bendahara_id: '',
    bendahara_nama: '',
    bendahara_nip: '',
    user_id: ''
};

const buildDefaultPegawaiList = () => ([
    {
        nama: '',
        nip: '',
        pangkat: '',
        jabatan: '',
        total_biaya: 0,
        biaya: [emptyBiayaRow()]
    }
]);

const mapPegawaiForForm = (pegawai) => ({
    id: pegawai.id,
    nama: pegawai.nama || '',
    nip: pegawai.nip || '',
    pangkat: pegawai.pangkat || '',
    jabatan: pegawai.jabatan || '',
    total_biaya: pegawai.total_biaya || 0,
    biaya: Array.isArray(pegawai.biaya) && pegawai.biaya.length > 0
        ? pegawai.biaya.map((biaya) => ({
            id: biaya.id,
            transportasi: biaya.transportasi?.length > 0
                ? biaya.transportasi.map((t) => ({ trans: t.trans || '', harga: t.harga || 0, total: t.total || 0 }))
                : [{ trans: '', harga: '', total: '' }],
            uang_harian_items: biaya.uang_harian_items?.length > 0
                ? biaya.uang_harian_items.map((u) => ({ jenis: u.jenis || '', qty: u.qty || 0, harga: u.harga || 0, total: u.total || 0 }))
                : [{ jenis: '', qty: '', harga: '', total: '' }],
            penginapan_items: biaya.penginapan_items?.length > 0
                ? biaya.penginapan_items.map((p) => ({ jenis: p.jenis || '', qty: p.qty || 0, harga: p.harga || 0, total: p.total || 0 }))
                : [{ jenis: '', qty: '', harga: '', total: '' }]
        }))
        : [emptyBiayaRow()]
});

const mapPegawaiForPayload = (pegawai) => ({
    id: pegawai.id || undefined,
    nama: pegawai.nama || '',
    nip: pegawai.nip || '',
    pangkat: pegawai.pangkat || '',
    jabatan: pegawai.jabatan || '',
    total_biaya: pegawai.total_biaya || 0,
    biaya: (pegawai.biaya || []).map((biaya) => ({
        transportasi: (biaya.transportasi || [])
            .filter((t) => t.trans || t.harga || t.total)
            .map((t) => ({ trans: t.trans || '', harga: Number(t.harga) || 0, total: Number(t.total) || 0 })),
        uang_harian_items: (biaya.uang_harian_items || [])
            .filter((u) => u.jenis || u.qty || u.harga || u.total)
            .map((u) => ({ jenis: u.jenis || '', qty: Number(u.qty) || 0, harga: Number(u.harga) || 0, total: Number(u.total) || 0 })),
        penginapan_items: (biaya.penginapan_items || [])
            .filter((p) => p.jenis || p.qty || p.harga || p.total)
            .map((p) => ({ jenis: p.jenis || '', qty: Number(p.qty) || 0, harga: Number(p.harga) || 0, total: Number(p.total) || 0 }))
    }))
});

export default function PerbaikanNominatifContainer({ session }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [searching, setSearching] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [pegawaiList, setPegawaiList] = useState(buildDefaultPegawaiList);
    const [formLoading, setFormLoading] = useState(false);
    const [openingId, setOpeningId] = useState(null);
    const [formError, setFormError] = useState('');

    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const formSectionRef = useRef(null);

    const notify = (message, type = 'info') => setNotification({ show: true, message, type });

    const resolveApiUrl = () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            throw new Error('API URL tidak ditemukan. Periksa konfigurasi environment.');
        }
        return apiUrl;
    };

    const runSearch = useCallback(async (term, { silent = false } = {}) => {
        if (!session?.accessToken) {
            notify('Sesi tidak ditemukan. Silakan login kembali.', 'error');
            return;
        }

        try {
            setSearching(true);
            if (!silent) {
                setNotification((prev) => ({ ...prev, show: false }));
            }

            const response = await axios.get(`${resolveApiUrl()}/nominatif-perbaikan`, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
                params: { q: term, limit: 100 }
            });

            const rows = response.data?.data || [];
            setResults(rows);
            setHasSearched(true);
            setActiveSearchTerm(term);

            if (rows.length === 0 && !silent) {
                notify(`Tidak ada nominatif yang cocok dengan "${term}"`, 'info');
            }
        } catch (error) {
            console.error('Error searching nominatif:', error);
            setResults([]);
            setHasSearched(true);
            setActiveSearchTerm(term);
            if (!silent) {
                notify(error.response?.data?.message || 'Gagal mencari data nominatif', 'error');
            }
        } finally {
            setSearching(false);
        }
    }, [session]);

    const handleSearch = (e) => {
        e?.preventDefault();
        const term = searchTerm.trim();

        if (!term) {
            notify('Masukkan nama nominatif atau nomor surat tugas terlebih dahulu', 'warning');
            return;
        }

        runSearch(term);
    };

    const handleOpenForm = async (id) => {
        if (!session?.accessToken) {
            notify('Sesi tidak ditemukan. Silakan login kembali.', 'error');
            return;
        }

        try {
            setOpeningId(id);
            setNotification((prev) => ({ ...prev, show: false }));

            const response = await axios.get(`${resolveApiUrl()}/nominatif-perbaikan/${id}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });

            const data = response.data?.data;
            if (!data) {
                throw new Error('Data nominatif tidak ditemukan');
            }

            setFormData({
                kegiatan: data.kegiatan || '',
                mak: data.mak || '',
                realisasi_anggaran_sebelumnya: data.realisasi_anggaran_sebelumnya ?? '',
                target_output_tahun: data.target_output_tahun ?? '',
                realisasi_output_sebelumnya: data.realisasi_output_sebelumnya ?? '',
                target_output_yg_akan_dicapai: data.target_output_yg_akan_dicapai ?? '',
                kota_kab_kecamatan: data.kota_kab_kecamatan || '',
                kota_kab_kecamatan_encrypted: data.kota_kab_kecamatan_encrypted || 0,
                can_view_lokasi_code: false,
                encrypt_kota_kab_kecamatan: Boolean(data.lokasi_terenkripsi),
                rencana_tanggal_pelaksanaan: data.rencana_tanggal_pelaksanaan || '',
                rencana_tanggal_pelaksanaan_akhir: data.rencana_tanggal_pelaksanaan_akhir || '',
                jenis_spm: data.jenis_spm || '',
                bendahara_id: data.bendahara_id || '',
                bendahara_nama: data.bendahara_nama || '',
                bendahara_nip: data.bendahara_nip || '',
                user_id: data.user_id || ''
            });

            setPegawaiList(
                Array.isArray(data.pegawai) && data.pegawai.length > 0
                    ? data.pegawai.map(mapPegawaiForForm)
                    : buildDefaultPegawaiList()
            );

            setFormError('');
            setEditId(id);
            setShowForm(true);

            setTimeout(() => {
                formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error) {
            console.error('Error loading nominatif for perbaikan:', error);
            notify(error.response?.data?.message || 'Gagal memuat data nominatif', 'error');
        } finally {
            setOpeningId(null);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditId(null);
        setFormData({ ...defaultFormData });
        setPegawaiList(buildDefaultPegawaiList());
        setFormError('');
        setFormLoading(false);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!editId) return;

        if (!session?.accessToken) {
            notify('Sesi tidak ditemukan. Silakan login kembali.', 'error');
            return;
        }

        if (!String(formData.kegiatan || '').trim()) {
            setFormError('Nama nominatif (kegiatan) wajib diisi');
            return;
        }

        if (!String(formData.mak || '').trim()) {
            setFormError('MAK wajib diisi');
            return;
        }

        setFormLoading(true);
        setFormError('');

        try {
            const payload = {
                ...formData,
                pegawai: pegawaiList.map(mapPegawaiForPayload)
            };

            const response = await axios.put(
                `${resolveApiUrl()}/nominatif-perbaikan/${editId}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            closeForm();

            if (activeSearchTerm) {
                await runSearch(activeSearchTerm, { silent: true });
            }

            notify(response.data?.message || 'Perbaikan nominatif berhasil disimpan', 'success');
        } catch (error) {
            console.error('Error saving perbaikan nominatif:', error);
            const message = error.response?.data?.message || error.message || 'Gagal menyimpan perbaikan nominatif';
            setFormError(message);
            notify(message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const notificationStyles = {
        error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200',
        warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
        success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-200',
        info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    };

    const renderStatus = (item) => {
        if (item.no_st && item.tgl_st) return 'Selesai';
        if (!item.status) return '-';
        return item.status.charAt(0).toUpperCase() + item.status.slice(1);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FaEdit />
                        Perbaikan Nominatif
                    </h1>
                    <p className="text-indigo-100 mt-1">
                        Cari nominatif berdasarkan nama nominatif atau nomor surat tugas, lalu perbaiki datanya.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Fitur khusus Admin.</p>
                        <p className="mt-1">
                            Perbaikan tidak mengubah status nominatif maupun ID pegawai, sehingga kuitansi, LPD,
                            dan SPTJM yang sudah terhubung tetap utuh. Nominatif berstatus <strong>dibatalkan</strong> tidak ditampilkan.
                        </p>
                    </div>

                    {notification.show && (
                        <div className={`p-4 border rounded-lg text-sm ${notificationStyles[notification.type] || notificationStyles.info}`}>
                            {notification.message}
                        </div>
                    )}

                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nama nominatif atau nomor surat tugas..."
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={searching}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={searching || !searchTerm.trim()}
                            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {searching ? 'Mencari...' : (<><FaSearch /> Cari</>)}
                        </button>
                        {hasSearched && (
                            <button
                                type="button"
                                onClick={() => runSearch(activeSearchTerm)}
                                disabled={searching || !activeSearchTerm}
                                className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <FaRedo /> Muat Ulang
                            </button>
                        )}
                    </form>

                    {hasSearched && (
                        results.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                Tidak ada nominatif yang cocok dengan kata kunci tersebut.
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Ditemukan <span className="font-semibold text-gray-900 dark:text-gray-100">{results.length}</span> nominatif
                                    untuk kata kunci <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeSearchTerm}</span>.
                                </p>
                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">No</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nama Nominatif</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">No. Surat Tugas</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">MAK</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Pegawai</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Total Biaya</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {results.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 align-top">
                                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
                                                        <p className="font-medium">{item.kegiatan}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatDateForDisplay(item.rencana_tanggal_pelaksanaan)}
                                                            {item.rencana_tanggal_pelaksanaan_akhir ? ` s/d ${formatDateForDisplay(item.rencana_tanggal_pelaksanaan_akhir)}` : ''}
                                                            {item.kota_kab_kecamatan ? ` • ${item.kota_kab_kecamatan}` : ''}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                        <p>{item.no_st || '-'}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {item.tgl_st ? formatDateForDisplay(item.tgl_st) : '-'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.mak || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                            {renderStatus(item)}
                                                        </span>
                                                        {item.status_2 ? (
                                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.status_2}</p>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.jumlah_pegawai ?? 0} orang</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Rp {formatRupiah(item.total_biaya)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenForm(item.id)}
                                                            disabled={openingId === item.id}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                        >
                                                            <FaEdit />
                                                            {openingId === item.id ? 'Memuat...' : 'Perbaiki'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )
                    )}

                    {!hasSearched && (
                        <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                            Masukkan kata kunci lalu tekan <strong>Cari</strong> untuk mulai perbaikan.
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <div ref={formSectionRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Form Perbaikan Nominatif</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ID Nominatif: {editId}</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <FaTimes /> Tutup
                        </button>
                    </div>

                    <div className="p-6">
                        <KegiatanForm
                            editId={editId}
                            isEditMode={true}
                            formData={formData}
                            setFormData={setFormData}
                            pegawaiList={pegawaiList}
                            setPegawaiList={setPegawaiList}
                            session={session}
                            onCancel={closeForm}
                            onSubmit={handleSubmit}
                            formError={formError}
                            setFormError={setFormError}
                            formLoading={formLoading}
                            setFormLoading={setFormLoading}
                            lokasiReadOnly={Boolean(formData.kota_kab_kecamatan_encrypted)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
