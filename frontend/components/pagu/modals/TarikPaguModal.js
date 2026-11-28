// components/pagu/modals/TarikPaguModal.js
import React, { useState } from 'react';
import { formatRupiah } from '../../../utils/formatters';

export default function TarikPaguModal({ show, onClose, session, onSuccess }) {
  const [token, setToken] = useState('');
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!show) return null;

  const handleClose = () => {
    if (loading) return;
    setToken('');
    setError('');
    setResult(null);
    onClose();
  };

  const handleTarik = async () => {
    if (!token.trim()) {
      setError('Token API wajib diisi');
      return;
    }

    const tahunAngka = parseInt(tahun, 10);
    if (!Number.isInteger(tahunAngka) || tahunAngka < 2000 || tahunAngka > 2100) {
      setError('Tahun anggaran tidak valid');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pagu/tarik`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ token: token.trim(), tahun: tahunAngka })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
        setToken('');
        if (onSuccess) onSuccess(data.message);
      } else {
        setError(data.message || 'Gagal menarik data');
      }
    } catch (err) {
      setError(err.message || 'Gagal menarik data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Atur Token API</h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Masukkan <strong>token API</strong> dan <strong>tahun anggaran</strong>. Token disimpan
                terenkripsi agar halaman ini bisa mengambil data terbaru langsung dari Jendela Kinerja
                setiap kali dibuka. <strong>Data pagu tidak disimpan</strong> di database.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Token API
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(''); }}
                placeholder="Tempel token API di sini"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Tahun Anggaran
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={tahun}
                onChange={(e) => { setTahun(e.target.value); setError(''); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
              </div>
            )}

            {result && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-200 font-medium">Token berhasil disimpan</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {result.imported} MAK tahun {result.tahun} berhasil dibaca
                  {result.total ? ` — total pagu Rp ${formatRupiah(result.total.pagu)}` : ''}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Data akan selalu diambil langsung dari aplikasi sumber saat halaman ini dibuka.
                </p>
                {result.terpotong && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Data sumber terpotong; tidak semua MAK ikut terkirim.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                Tutup
              </button>
              <button
                onClick={handleTarik}
                disabled={loading || !token.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Menyimpan...
                  </span>
                ) : 'Simpan Token'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
