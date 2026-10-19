// components/profile/TotpSecurityCard.js
// Kartu pengelolaan Google Authenticator (TOTP) di halaman Profil.
// Secret TOTP dipakai server sebagai gerbang untuk membuka lokasi nominatif
// yang terenkripsi (lihat backend/routes/lpd.js).

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import axios from 'axios';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('id-ID') : '-');

export default function TotpSecurityCard({ apiBaseUrl, session, onNotify }) {
    const [status, setStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [setup, setSetup] = useState(null);
    const [token, setToken] = useState('');
    const [showDisable, setShowDisable] = useState(false);
    const [disableToken, setDisableToken] = useState('');
    const [copied, setCopied] = useState(false);
    const setupInFlight = useRef(false);

    const accessToken = session?.accessToken;

    const authConfig = useCallback(() => ({
        headers: { Authorization: `Bearer ${accessToken || ''}` }
    }), [accessToken]);

    const fetchStatus = useCallback(async () => {
        if (!accessToken) return;

        try {
            setStatusLoading(true);
            const response = await axios.get(`${apiBaseUrl}/profile/totp`, authConfig());
            if (response.data?.success) {
                setStatus(response.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat status authenticator');
        } finally {
            setStatusLoading(false);
        }
    }, [apiBaseUrl, accessToken, authConfig]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleSetup = async (regenerate = false) => {
        if (setupInFlight.current) return;
        setupInFlight.current = true;
        setBusy(true);
        setError('');
        setCopied(false);

        try {
            const response = await axios.post(
                `${apiBaseUrl}/profile/totp/setup`,
                { regenerate: regenerate === true },
                authConfig()
            );
            if (response.data?.success) {
                setSetup(response.data.data);
            } else {
                setError(response.data?.message || 'Gagal menyiapkan authenticator');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyiapkan authenticator');
        } finally {
            setupInFlight.current = false;
            setBusy(false);
        }
    };

    const handleVerify = async (event) => {
        event?.preventDefault();
        const value = token.trim();

        if (!/^\d{6}$/.test(value)) {
            setError('Masukkan 6 digit kode dari aplikasi authenticator');
            return;
        }

        setBusy(true);
        setError('');

        try {
            const response = await axios.post(
                `${apiBaseUrl}/profile/totp/verify`,
                { token: value },
                authConfig()
            );

            if (response.data?.success) {
                setSetup(null);
                setToken('');
                await fetchStatus();
                onNotify?.('Google Authenticator berhasil diaktifkan');
            } else {
                setError(response.data?.message || 'Kode authenticator salah');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Kode authenticator salah atau sudah kedaluwarsa');
        } finally {
            setBusy(false);
        }
    };

    const handleDisable = async (event) => {
        event?.preventDefault();
        const value = disableToken.trim();

        if (!/^\d{6}$/.test(value)) {
            setError('Masukkan 6 digit kode authenticator untuk menonaktifkan');
            return;
        }

        setBusy(true);
        setError('');

        try {
            const response = await axios.delete(`${apiBaseUrl}/profile/totp`, {
                ...authConfig(),
                data: { token: value }
            });

            if (response.data?.success) {
                setShowDisable(false);
                setDisableToken('');
                await fetchStatus();
                onNotify?.('Google Authenticator dinonaktifkan');
            } else {
                setError(response.data?.message || 'Gagal menonaktifkan authenticator');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Kode authenticator salah atau sudah kedaluwarsa');
        } finally {
            setBusy(false);
        }
    };

    const copySecret = async () => {
        try {
            await navigator.clipboard?.writeText(setup?.secret || '');
            setCopied(true);
        } catch (err) {
            setError('Gagal menyalin secret. Salin manual dari teks di atas.');
        }
    };

    const enabled = !!status?.enabled;

    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b dark:border-gray-700 pb-2">
                Keamanan &amp; Google Authenticator
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Setelah diaktifkan, lokasi kegiatan yang Anda enkripsi dapat dibuka dengan kode 6 digit
                    dari aplikasi Google Authenticator — tanpa perlu menyalin kode enkripsi 16 karakter.
                </p>

                {statusLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Memuat status authenticator...</p>
                ) : enabled ? (
                    <div className="space-y-3">
                        <div className="flex items-center text-green-600 dark:text-green-400">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">Authenticator aktif</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Diaktifkan: {formatDateTime(status?.verified_at)}</p>
                            <p>Terakhir dipakai: {formatDateTime(status?.last_used_at)}</p>
                        </div>

                        {!showDisable ? (
                            <button
                                type="button"
                                onClick={() => { setShowDisable(true); setError(''); }}
                                className="px-4 py-2 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                                Nonaktifkan Authenticator
                            </button>
                        ) : (
                            <form onSubmit={handleDisable} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Masukkan 6 digit dari aplikasi authenticator
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={disableToken}
                                        onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-32 px-3 py-2 text-center font-mono tracking-widest border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {busy ? 'Memproses...' : 'Nonaktifkan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowDisable(false); setDisableToken(''); }}
                                        className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : setup ? (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                            <div className="bg-white p-3 rounded-lg border border-gray-200 self-center md:self-start">
                                <Image
                                    src={setup.qr_data_url}
                                    alt="QR code Google Authenticator"
                                    width={220}
                                    height={220}
                                    unoptimized
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                    1. Buka Google Authenticator → tambah akun → pindai QR code ini.
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Tidak bisa memindai? Masukkan secret berikut secara manual:
                                </p>
                                <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
                                    <code className="select-all text-xs font-mono break-all text-gray-900 dark:text-gray-100">
                                        {setup.secret}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={copySecret}
                                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                                    >
                                        {copied ? 'Tersalin' : 'Salin'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                2. Masukkan 6 digit kode yang tampil di aplikasi
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-32 px-3 py-2 text-center font-mono tracking-widest border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {busy ? 'Memverifikasi...' : 'Aktifkan'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetup(true)}
                                    disabled={busy}
                                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    Buat QR baru
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setSetup(null); setToken(''); setCopied(false); }}
                                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    Batal
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Kode berganti setiap 30 detik. Jika kode selalu ditolak, pastikan tanggal &amp; jam
                                di ponsel diset otomatis, lalu tekan &quot;Buat QR baru&quot; dan pindai ulang QR-nya.
                            </p>
                        </form>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => handleSetup(false)}
                        disabled={busy}
                        className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {busy ? 'Menyiapkan...' : 'Hubungkan Google Authenticator'}
                    </button>
                )}

                {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
            </div>
        </div>
    );
}
