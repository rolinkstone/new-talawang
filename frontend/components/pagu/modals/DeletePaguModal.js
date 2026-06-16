// components/pagu/modals/DeletePaguModal.js
import React from 'react';

export default function DeletePaguModal({ show, onClose, onConfirm, deletingId, item }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hapus Pagu</h3>
            <p className="text-sm text-gray-500 mb-1">
              Apakah Anda yakin ingin menghapus data pagu berikut?
            </p>
            {item && (
              <div className="p-3 bg-gray-50 rounded-md mb-4">
                <p className="text-sm font-medium text-gray-900">{item.mak}</p>
                <p className="text-xs text-gray-500">Tahun: {item.tahun_anggaran}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={deletingId === item?.id}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-50"
            >
              {deletingId === item?.id ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
