// components/pagu/modals/PaguModal.js
import React, { useState, useEffect } from 'react';

export default function PaguModal({ show, onClose, onSave, editItem }) {
  const [formData, setFormData] = useState({
    mak: '',
    pagu: '',
    realisasi: '',
    tahun_anggaran: new Date().getFullYear()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sisa, setSisa] = useState(0);

  useEffect(() => {
    if (editItem) {
      setFormData({
        mak: editItem.mak || '',
        pagu: editItem.pagu || '',
        realisasi: editItem.realisasi || '',
        tahun_anggaran: editItem.tahun_anggaran || new Date().getFullYear()
      });
    } else {
      setFormData({
        mak: '',
        pagu: '',
        realisasi: '',
        tahun_anggaran: new Date().getFullYear()
      });
    }
    setError('');
    setSisa(0);
  }, [editItem, show]);

  useEffect(() => {
    const paguVal = parseFloat(formData.pagu) || 0;
    const realisasiVal = parseFloat(formData.realisasi) || 0;
    setSisa(paguVal - realisasiVal);
  }, [formData.pagu, formData.realisasi]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.mak.trim()) {
      setError('MAK wajib diisi');
      return;
    }

    if (!formData.tahun_anggaran) {
      setError('Tahun anggaran wajib diisi');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        mak: formData.mak.trim(),
        pagu: parseFloat(formData.pagu) || 0,
        realisasi: parseFloat(formData.realisasi) || 0,
        tahun_anggaran: parseInt(formData.tahun_anggaran)
      });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  // Generate tahun options (5 tahun ke belakang, 5 tahun ke depan)
  const currentYear = new Date().getFullYear();
  const tahunOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const formatRupiah = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('id-ID');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editItem ? 'Edit Pagu' : 'Tambah Pagu'}
            </h3>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">MAK *</label>
              <input
                type="text"
                name="mak"
                value={formData.mak}
                onChange={handleChange}
                placeholder="Contoh: 123.01.01.01.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Pagu (Rp)</label>
                <input
                  type="number"
                  name="pagu"
                  value={formData.pagu}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Realisasi (Rp)</label>
                <input
                  type="number"
                  name="realisasi"
                  value={formData.realisasi}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sisa Anggaran:</span>
                <span className={`font-bold ${sisa < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  Rp {formatRupiah(sisa)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tahun Anggaran *</label>
              <select
                name="tahun_anggaran"
                value={formData.tahun_anggaran}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {tahunOptions.map(tahun => (
                  <option key={tahun} value={tahun}>{tahun}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : editItem ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
