// components/lpd/LpdModal.js
import React, { useState, useRef } from 'react';
import { 
  FaTimes, 
  FaPlus, 
  FaTrash, 
  FaUpload, 
  FaFile, 
  FaImage,
  FaFilePdf,
  FaFileWord
} from 'react-icons/fa';

export default function LpdModal({ 
  isOpen, 
  onClose, 
  type, 
  title, 
  kegiatanId, 
  existingData = [], 
  selectedItem = null,
  onSave, 
  onDelete 
}) {
  const [rincianList, setRincianList] = useState(
    existingData.length > 0 
      ? existingData.map((item, index) => ({
          id: item.id,
          tanggal: item.tanggal,
          kegiatan: item.kegiatan,
          no: item.no,
          urutan: item.urutan || index + 1
        }))
      : [{ id: null, tanggal: '', kegiatan: '', urutan: 1 }]
  );
  const [files, setFiles] = useState([]);
  const [keteranganList, setKeteranganList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const formatTanggalInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleAddRincian = () => {
    setRincianList([...rincianList, { id: null, tanggal: '', kegiatan: '', urutan: rincianList.length + 1 }]);
  };

  const handleRemoveRincian = (index) => {
    const newList = rincianList.filter((_, i) => i !== index);
    // Update urutan
    newList.forEach((item, idx) => {
      item.urutan = idx + 1;
      item.no = idx + 1;
    });
    setRincianList(newList);
  };

  const handleRincianChange = (index, field, value) => {
    const newList = [...rincianList];
    newList[index][field] = value;
    setRincianList(newList);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setKeteranganList(selectedFiles.map(() => ''));
  };

  const handleKeteranganChange = (index, value) => {
    const newList = [...keteranganList];
    newList[index] = value;
    setKeteranganList(newList);
  };

  const handleRemoveFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newKeterangan = keteranganList.filter((_, i) => i !== index);
    setFiles(newFiles);
    setKeteranganList(newKeterangan);
  };

  const handleSaveRincian = async () => {
    // Validasi
    const invalidItems = rincianList.filter(item => !item.tanggal || !item.kegiatan);
    if (invalidItems.length > 0) {
      alert('Harap isi semua tanggal dan kegiatan');
      return;
    }

    setSaving(true);
    const result = await onSave(rincianList);
    setSaving(false);

    if (result.success) {
      onClose();
    } else {
      alert(result.message || 'Gagal menyimpan data');
    }
  };

  const handleUploadDokumentasi = async () => {
    if (files.length === 0) {
        alert('Pilih file terlebih dahulu');
        return;
    }

    setUploading(true);
    
    // Format keterangan dengan benar
    const keteranganData = keteranganList.map((k, index) => ({
        index: index,
        keterangan: k || ''
    }));
    
    const result = await onSave(files, keteranganData);
    setUploading(false);

    if (result.success) {
        setFiles([]);
        setKeteranganList([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    } else {
        alert(result.message || 'Gagal upload dokumentasi');
    }
};

  const handleDeleteDokumentasi = async () => {
    if (!selectedItem) return;

    setDeleting(true);
    const result = await onDelete(selectedItem.id);
    setDeleting(false);

    if (result.success) {
      onClose();
    } else {
      alert(result.message || 'Gagal menghapus dokumentasi');
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className="text-red-500" />;
    if (ext === 'doc' || ext === 'docx') return <FaFileWord className="text-blue-500" />;
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') return <FaImage className="text-green-500" />;
    return <FaFile className="text-gray-500" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {type === 'rincian' && (
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {rincianList.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 relative">
                      <div className="absolute top-2 right-2">
                        {rincianList.length > 1 && (
                          <button
                            onClick={() => handleRemoveRincian(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash size={14} />
                          </button>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tanggal
                        </label>
                        <input
                          type="date"
                          value={formatTanggalInput(item.tanggal)}
                          onChange={(e) => handleRincianChange(index, 'tanggal', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kegiatan
                        </label>
                        <textarea
                          value={item.kegiatan}
                          onChange={(e) => handleRincianChange(index, 'kegiatan', e.target.value)}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Deskripsi kegiatan..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddRincian}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <FaPlus size={14} />
                  <span>Tambah Baris</span>
                </button>
              </div>
            )}

            {type === 'dokumentasi' && (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FaUpload className="text-3xl text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Klik atau drag file untuk upload</p>
                  <p className="text-xs text-gray-400 mt-1">Maksimal 10MB per file (JPG, PNG, PDF, DOC, DOCX)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h4 className="font-medium text-gray-700">File yang dipilih:</h4>
                    {files.map((file, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.name)}
                            <span className="text-sm text-gray-600 truncate">{file.name}</span>
                            <span className="text-xs text-gray-400">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Keterangan (opsional)
                          </label>
                          <input
                            type="text"
                            value={keteranganList[index] || ''}
                            onChange={(e) => handleKeteranganChange(index, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                            placeholder="Deskripsi foto/dokumen..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {type === 'delete' && selectedItem && (
              <div className="text-center py-4">
                <div className="mb-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <FaTrash className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Hapus Dokumentasi
                  </h3>
                  <p className="text-gray-500">
                    Apakah Anda yakin ingin menghapus dokumentasi "{selectedItem.file_name}"?
                  </p>
                  <p className="text-xs text-red-500 mt-2">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            {type === 'rincian' && (
              <button
                onClick={handleSaveRincian}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            )}
            {type === 'dokumentasi' && (
              <button
                onClick={handleUploadDokumentasi}
                disabled={uploading || files.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Mengupload...' : 'Upload'}
              </button>
            )}
            {type === 'delete' && (
              <button
                onClick={handleDeleteDokumentasi}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}