// components/monitoringTtd/Container.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { FaCopy, FaCheck, FaExternalLinkAlt, FaSearch, FaSignature } from 'react-icons/fa';

const ITEMS_PER_PAGE = 20;

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

export default function MonitoringTtdContainer({ session, status }) {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ total: 0, sudah_ttd: 0, belum_ttd: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('sudah');
    const [currentPage, setCurrentPage] = useState(1);
    const [copiedId, setCopiedId] = useState(null);
    const [preview, setPreview] = useState(null);
    const searchTimerRef = useRef(null);

    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchTerm]);

    const fetchData = useCallback(async () => {
        if (!session?.accessToken) return;

        try {
            setLoading(true);
            setError('');

            const query = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/profile/ttd-monitoring${query}`,
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );

            if (response.data.success) {
                setRows(response.data.data || []);
                setSummary(response.data.summary || { total: 0, sudah_ttd: 0, belum_ttd: 0 });
            }
        } catch (err) {
            console.error('Error fetching TTD monitoring:', err);
            setError(err.response?.data?.message || 'Gagal memuat data monitoring TTD');
        } finally {
            setLoading(false);
        }
    }, [session, debouncedSearch]);

    useEffect(() => {
        if (status === 'authenticated') fetchData();
    }, [fetchData, status]);

    const filteredRows = useMemo(() => {
        if (statusFilter === 'semua') return rows;
        if (statusFilter === 'belum') return rows.filter(row => !row.has_ttd);
        return rows.filter(row => row.has_ttd);
    }, [rows, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredRows.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredRows, currentPage]);

    const handleCopy = async (item) => {
        if (!item.ttd_url) return;
        try {
            await copyText(item.ttd_url);
            setCopiedId(item.user_id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Gagal menyalin link:', err);
            setError('Gagal menyalin link. Salin manual dari kolom Link TTD.');
        }
    };

    const filterTabs = [
        { key: 'sudah', label: `Sudah TTD (${summary.sudah_ttd})` },
        { key: 'belum', label: `Belum TTD (${summary.belum_ttd})` },
        { key: 'semua', label: `Semua (${summary.total})` }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FaSignature />
                        Monitoring Tanda Tangan (TTD)
                    </h1>
                    <p className="text-indigo-100 mt-1">
                        Daftar user yang sudah upload TTD beserta link yang bisa dipakai aplikasi lain.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Link TTD bersifat publik (tanpa login).</p>
                        <p className="mt-1">
                            Salin link pada kolom <strong>Link TTD</strong> dan gunakan langsung di aplikasi lain.
                            Bila domain publik backend berbeda, atur <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">PUBLIC_BASE_URL</code> di backend.
                        </p>
                    </div>

                    {/* Ringkasan */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total User</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{summary.total}</p>
                        </div>
                        <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <p className="text-sm text-green-700 dark:text-green-300">Sudah TTD</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{summary.sudah_ttd}</p>
                        </div>
                        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                            <p className="text-sm text-amber-700 dark:text-amber-300">Belum TTD</p>
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.belum_ttd}</p>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                            {filterTabs.map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setStatusFilter(tab.key)}
                                    className={`px-4 py-2 text-sm font-medium transition ${
                                        statusFilter === tab.key
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 md:max-w-sm">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari nama, username, atau NIP..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={fetchData}
                            disabled={loading}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            Muat Ulang
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-16 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
                            <p className="mt-3 text-gray-500 dark:text-gray-400">Memuat data TTD...</p>
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                            Tidak ada data yang cocok dengan filter.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">No</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Pegawai</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Jabatan / Unit</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Tanggal Upload</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Link TTD</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {paginatedRows.map((item, index) => (
                                            <tr key={item.user_id || `${item.username}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        {item.nama_lengkap || item.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {item.username}
                                                        {item.nip ? ` • NIP ${item.nip}` : ''}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                    <p>{item.jabatan || '-'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.unit_kerja || '-'}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        item.has_ttd
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                                    }`}>
                                                        {item.has_ttd ? 'Sudah TTD' : 'Belum TTD'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {item.has_ttd ? formatDateTime(item.ttd_uploaded_at) : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.has_ttd && item.ttd_url ? (
                                                        <div className="flex items-center gap-2 min-w-[320px]">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={item.ttd_url}
                                                                onFocus={(e) => e.target.select()}
                                                                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 rounded"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(item)}
                                                                title="Salin link"
                                                                className={`px-2.5 py-1.5 text-xs rounded inline-flex items-center gap-1 ${
                                                                    copiedId === item.user_id
                                                                        ? 'bg-green-600 text-white'
                                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                                }`}
                                                            >
                                                                {copiedId === item.user_id ? <FaCheck /> : <FaCopy />}
                                                                {copiedId === item.user_id ? 'Tersalin' : 'Salin'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreview(item)}
                                                                title="Pratinjau TTD"
                                                                className="px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-1"
                                                            >
                                                                <FaExternalLinkAlt />
                                                                Lihat
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Belum ada link</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <p>
                                    Menampilkan {paginatedRows.length} dari {filteredRows.length} user
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Sebelumnya
                                    </button>
                                    <span>Halaman {currentPage} / {totalPages}</span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal pratinjau TTD */}
            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setPreview(null)}></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Pratinjau TTD</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{preview.nama_lengkap || preview.username}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreview(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                                aria-label="Tutup"
                            >
                                ×
                            </button>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 text-center">
                            <img
                                src={preview.ttd_url}
                                alt={`TTD ${preview.nama_lengkap || preview.username}`}
                                className="max-h-64 mx-auto object-contain"
                            />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={preview.ttd_url}
                                onFocus={(e) => e.target.select()}
                                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 rounded"
                            />
                            <button
                                type="button"
                                onClick={() => handleCopy(preview)}
                                className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1"
                            >
                                {copiedId === preview.user_id ? <FaCheck /> : <FaCopy />}
                                {copiedId === preview.user_id ? 'Tersalin' : 'Salin'}
                            </button>
                            <a
                                href={preview.ttd_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-1"
                            >
                                <FaExternalLinkAlt />
                                Buka
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
