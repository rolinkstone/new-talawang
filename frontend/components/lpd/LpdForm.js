// components/lpd/LpdForm.js
import React, { useState } from 'react';
import { 
  FaFileAlt, 
  FaPlus, 
  FaTrash, 
  FaDownload,
  FaCamera,
  FaImage,
  FaFilePdf,
  FaFileWord
} from 'react-icons/fa';

export default function LpdForm({ lpdData, session, onRefresh, onOpenModal }) {
  const [imageErrors, setImageErrors] = useState({});

  const formatTanggal = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // Jika sudah dalam format DD-MM-YYYY
      if (typeof dateString === 'string' && dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        return dateString;
      }
      
      // Handle format YYYY-MM-DD
      let date;
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleDownload = async (dokumentasiId, fileName) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/lpd/dokumentasi/${dokumentasiId}/download`;
      console.log('📥 Downloading from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(urlBlob);
        document.body.removeChild(a);
      } else {
        console.error('Download failed:', response.status);
        alert('Gagal mendownload file');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Terjadi kesalahan saat mendownload file');
    }
  };

  const handleImageError = (docId) => {
    setImageErrors(prev => ({ ...prev, [docId]: true }));
  };

  const getFileIcon = (fileType, fileName) => {
    if (fileType?.startsWith('image/') && !imageErrors[fileName]) {
      return <FaImage className="text-4xl text-green-500" />;
    }
    if (fileType === 'application/pdf') {
      return <FaFilePdf className="text-4xl text-red-500" />;
    }
    if (fileType?.includes('word') || fileName?.match(/\.(doc|docx)$/i)) {
      return <FaFileWord className="text-4xl text-blue-500" />;
    }
    return <FaFileAlt className="text-4xl text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* A. Dasar Pelaksanaan Kegiatan */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">A. Dasar Pelaksanaan Kegiatan</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surat Perintah Tugas (ST)
              </label>
              <div className="text-gray-900">
                {lpdData?.dasar_pelaksanaan?.nomor_st || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal ST
              </label>
              <div className="text-gray-900">
                {formatTanggal(lpdData?.dasar_pelaksanaan?.tanggal_st)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B. Petugas Pelaksana */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">B. Petugas Pelaksana</h2>
        </div>
        <div className="p-6">
          {lpdData?.petugas_pelaksana?.length > 0 ? (
            <div className="space-y-4">
              {lpdData.petugas_pelaksana.map((petugas, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm text-gray-500">Nama</span>
                      <p className="font-medium">{petugas.nama || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">NIP</span>
                      <p className="font-medium">{petugas.nip || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Pangkat / Golongan</span>
                      <p className="font-medium">{petugas.pangkat_golongan || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Jabatan</span>
                      <p className="font-medium">{petugas.jabatan || '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Tidak ada data petugas</p>
          )}
        </div>
      </div>

      {/* C. Waktu dan Tempat Pelaksanaan */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">C. Waktu dan Tempat Pelaksanaan</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lama Perjalanan
              </label>
              <div className="text-gray-900">
                {lpdData?.waktu_tempat?.lama_perjalanan || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Pelaksanaan
              </label>
              <div className="text-gray-900">
                {formatTanggal(lpdData?.waktu_tempat?.tanggal_mulai)} 
                {lpdData?.waktu_tempat?.tanggal_selesai && ` s.d ${formatTanggal(lpdData.waktu_tempat.tanggal_selesai)}`}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tempat Pelaksanaan
              </label>
              <div className="text-gray-900">
                {lpdData?.waktu_tempat?.tempat_pelaksanaan || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* D. Pembiayaan */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">D. Pembiayaan</h2>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DIPA / MAK
            </label>
            <div className="text-gray-900">
              {lpdData?.pembiayaan?.mak || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* E. Rincian Hasil Kegiatan */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">E. Rincian Hasil Kegiatan</h2>
          <button
            onClick={() => onOpenModal('rincian')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus size={14} />
            <span className="text-sm">Tambah/Edit Rincian</span>
          </button>
        </div>
        <div className="p-6">
          {lpdData?.rincian_kegiatan?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kegiatan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lpdData.rincian_kegiatan.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTanggal(item.tanggal)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.kegiatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FaFileAlt className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Belum ada rincian kegiatan</p>
              <button
                onClick={() => onOpenModal('rincian')}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Klik untuk menambahkan rincian
              </button>
            </div>
          )}
        </div>
      </div>

      {/* F. Dokumentasi Kegiatan */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">F. Dokumentasi Kegiatan</h2>
          <button
            onClick={() => onOpenModal('dokumentasi')}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaCamera size={14} />
            <span className="text-sm">Upload Dokumentasi</span>
          </button>
        </div>
        <div className="p-6">
          {lpdData?.dokumentasi?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lpdData.dokumentasi.map((doc) => {
                const isImage = doc.file_type?.startsWith('image/');
                const hasError = imageErrors[doc.id];
                const showImage = isImage && !hasError;
                const fullImageUrl = `${process.env.NEXT_PUBLIC_API_URL}${doc.file_path}`;
                
                return (
                  <div key={doc.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gray-100 p-4 flex items-center justify-center h-32">
                      {showImage ? (
                        <img 
                          src={fullImageUrl}
                          alt={doc.file_name}
                          className="max-h-full max-w-full object-contain"
                          onError={() => handleImageError(doc.id)}
                        />
                      ) : (
                        getFileIcon(doc.file_type, doc.file_name)
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-800 truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      {doc.keterangan && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.keterangan}</p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.file_name)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                        >
                          <FaDownload size={12} />
                          Download
                        </button>
                        <button
                          onClick={() => onOpenModal('delete', doc)}
                          className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          <FaTrash size={12} />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaCamera className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Belum ada dokumentasi</p>
              <button
                onClick={() => onOpenModal('dokumentasi')}
                className="mt-2 text-green-600 hover:text-green-700 text-sm"
              >
                Klik untuk upload dokumentasi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}