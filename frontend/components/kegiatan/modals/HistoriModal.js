// components/kegiatan/HistoriModal.js - VERSI PROFESIONAL
import React, { useMemo } from 'react';

const HistoriModal = ({ 
  show, 
  onClose, 
  item,
  formatDateForDisplay 
}) => {
  // Pastikan modal tidak dirender jika tidak show atau tidak ada item
  if (!show || !item) {
    return null;
  }

  // Format tanggal default
  const defaultFormatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // Handle berbagai format tanggal
      let date;
      
      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        const cleanString = dateString.trim();
        
        // Cek format MySQL datetime: YYYY-MM-DD HH:MM:SS
        const mysqlPattern = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
        const mysqlMatch = cleanString.match(mysqlPattern);
        
        if (mysqlMatch) {
          const [_, year, month, day, hour, minute, second] = mysqlMatch;
          date = new Date(year, month - 1, day, hour, minute, second);
        } 
        // Cek format MySQL date: YYYY-MM-DD
        else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanString)) {
          const [year, month, day] = cleanString.split('-');
          date = new Date(year, month - 1, day);
        }
        // Coba parse dengan Date.parse untuk format standar
        else {
          const parsed = Date.parse(cleanString);
          if (!isNaN(parsed)) {
            date = new Date(parsed);
          } else {
            return cleanString;
          }
        }
      } else if (typeof dateString === 'number') {
        date = new Date(dateString);
      } else {
        return String(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString || '-';
      }
      
      // Format berdasarkan apakah ada time component
      const hasTimeComponent = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
      
      if (hasTimeComponent) {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '');
      } else {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      return dateString || '-';
    }
  };

  const formatDate = formatDateForDisplay || defaultFormatDate;

  // Status mapping termasuk status selesai
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-200 text-gray-800' },
    diajukan: { label: 'Diajukan', color: 'bg-yellow-200 text-yellow-800' },
   diketahui: { label: 'Diketahui', color: 'bg-blue-200 text-blue-800' },
    dikembalikan: { label: 'Dikembalikan', color: 'bg-red-200 text-red-800' },
     disetujui: { label: 'Disetujui', color: 'bg-green-200 text-green-800' },
    selesai: { label: 'Selesai (ST Terbit)', color: 'bg-purple-200 text-purple-800' }
  };

  // Timeline items configuration
  const timelineItems = useMemo(() => {
    const items = [];
    const currentStatus = item.status || 'draft';
    
    // Helper untuk cek data
    const hasValue = (field) => {
      if (!field) return false;
      const str = String(field).trim();
      return str !== '' && str !== 'null' && str !== 'undefined';
    };
    
    const hasNoST = hasValue(item.no_st);
    const hasTglST = hasValue(item.tgl_st);
    
    // 1. Draft - always show
    items.push({
      id: 'draft',
      title: 'Dibuat sebagai Draft',
      date: item.created_at,
      icon: 'clock',
      iconColor: 'bg-gray-200 text-gray-600',
      description: 'Kegiatan dibuat oleh user'
    });

    // 2. Diajukan ke PPK - hanya jika ada tanggal_diajukan
    if (item.tanggal_diajukan && item.ppk_nama) {
      items.push({
        id: 'diketahui',
        title: 'Diajukan ke PPK',
        date: item.tanggal_diajukan,
        icon: 'send',
        iconColor: 'bg-yellow-200 text-yellow-600',
        description: `Diajukan kepada: ${item.ppk_nama}`,
        note: item.catatan && currentStatus !== 'selesai' ? item.catatan : null
      });
    }

    // 3. Diketahui oleh PPK - hanya jika ada tanggal_disetujui atau status sudah di atas diajukan
    if (item.tanggal_disetujui || ['diketahui', 'disetujui', 'selesai'].includes(currentStatus)) {
      items.push({
        id: 'diketahui',
        title: 'Diketahui oleh PPK',
        date: item.tanggal_disetujui || item.updated_at,
        icon: 'check',
        iconColor: 'bg-blue-200 text-blue-600',
        description: `Diketahui oleh: ${item.ppk_nama || 'PPK'}`,
        note: item.catatan && currentStatus !== 'selesai' ? item.catatan : null
      });
    }

    // 4. Disetujui oleh Kabalai - hanya jika ada tanggal_diketahui atau status sudah di atas disetujui
    if (item.tanggal_diketahui || ['disetujui', 'selesai'].includes(currentStatus)) {
      items.push({
        id: 'disetujui',
        title: 'Disetujui oleh Kepala Balai',
        date: item.tanggal_diketahui || item.updated_at,
        icon: 'verify',
        iconColor: ' bg-green-200 text-green-600',
       
        description: `Disetujui oleh: ${item.nama_kabalai || item.diketahui_oleh || 'Kepala Balai'}`,
        note: item.catatan_kabalai
      });
    }

    // 5. Surat Tugas Terbit
    const shouldShowSuratTugas = currentStatus === 'selesai' || hasNoST;
    
    if (shouldShowSuratTugas) {
      let displayDate = null;
      let note = null;
      let showWarning = false;
      
      if (hasTglST) {
        displayDate = item.tgl_st;
        // Validasi format
        try {
          const date = new Date(item.tgl_st);
          if (isNaN(date.getTime())) {
            note = 'Format tanggal tidak valid';
            showWarning = true;
          }
        } catch (e) {
          note = 'Error parsing tanggal';
          showWarning = true;
        }
      } else {
        // Cari tanggal alternatif
        if (item.tanggal_diketahui) {
          displayDate = item.tanggal_diketahui;
          note = 'Tanggal menggunakan tanggal diketahui';
        } else if (item.tanggal_disetujui) {
          displayDate = item.tanggal_disetujui;
          note = 'Tanggal menggunakan tanggal disetujui';
        } else if (item.tanggal_diajukan) {
          displayDate = item.tanggal_diajukan;
          note = 'Tanggal menggunakan tanggal diajukan';
        } else if (item.updated_at) {
          displayDate = item.updated_at;
          note = 'Tanggal menggunakan tanggal update';
        } else {
          displayDate = item.created_at;
          note = 'Tanggal menggunakan tanggal pembuatan';
        }
        showWarning = true;
      }
      
      items.push({
        id: 'surat-tugas',
        title: currentStatus === 'selesai' ? 'Proses Selesai' : 'Surat Tugas Terbit',
        date: displayDate,
        icon: 'document',
        iconColor: 'bg-purple-200 text-purple-600',
        description: hasNoST ? `No. Surat Tugas: ${item.no_st}` : 'Surat Tugas (nomor belum diisi)',
        note: note,
        isComplete: currentStatus === 'selesai',
        showWarning: showWarning,
        hasValidTglST: hasTglST
      });
    }

    // 6. Dikembalikan oleh PPK - khusus untuk status dikembalikan
    if (currentStatus === 'dikembalikan') {
      items.push({
        id: 'dikembalikan',
        title: 'Dikembalikan oleh PPK',
        date: item.updated_at,
        icon: 'return',
        iconColor: 'bg-red-200 text-red-600',
        description: `Dikembalikan oleh: ${item.ppk_nama || 'PPK'}`,
        note: item.catatan
      });
    }

    return items;
  }, [item]);

  // Icon components
  const icons = {
    clock: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    send: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    check: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    verify: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.4141.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    document: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
    return: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    )
  };

  // Get modal title based on status
  const getModalTitle = () => {
    const currentStatus = item.status || 'draft';
    
    const statusMap = {
      diketahui: `Histori Persetujuan - Diketahui oleh ${item.nama_kabalai || 'Kepala Balai'}`,
      disetujui: `Histori Persetujuan - Disetujui oleh ${item.ppk_nama || 'PPK'}`,
      diajukan: `Histori Pengajuan - Diajukan untuk ${item.ppk_nama || 'PPK'}`,
      dikembalikan: `Histori Pengembalian - Dikembalikan oleh ${item.ppk_nama || 'PPK'}`,
      draft: 'Histori Status - Draft',
      selesai: `Histori Lengkap - Selesai`
    };
    
    return statusMap[currentStatus] || 'Histori Status Kegiatan';
  };

  // Cek validitas tgl_st
  const hasValidTglST = () => {
    if (!item.tgl_st) return false;
    const str = String(item.tgl_st).trim();
    return str !== '' && str !== 'null' && str !== 'undefined';
  };

  const validTglST = hasValidTglST();
  const showSuratTugasInfo = item.status === 'selesai' || (item.no_st && item.no_st.trim() !== '');

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${show ? 'block' : 'hidden'}`}>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {getModalTitle()}
              </h3>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  ID Kegiatan: {item.id}
                </span>
                <span className="text-sm text-gray-500 truncate max-w-xs">
                  {item.kegiatan}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Status Badge dan Info ST */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusConfig[item.status]?.color || 'bg-gray-200 text-gray-800'
                }`}>
                  {statusConfig[item.status]?.label || item.status}
                </span>
                <span className="text-sm text-gray-500">
                  Terakhir diperbarui: {formatDate(item.updated_at)}
                </span>
              </div>
              {showSuratTugasInfo && (
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {item.no_st || 'No. ST belum diisi'}
                  </div>
                  {validTglST ? (
                    <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                      {icons.calendar}
                      <span>Tanggal: {formatDate(item.tgl_st)}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-600 flex items-center justify-end gap-1">
                      {icons.warning}
                      <span>Tanggal ST belum diisi</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Riwayat Status</h4>
              <div className="space-y-6">
                {timelineItems.map((timelineItem) => (
                  <div key={timelineItem.id} className="flex items-start">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${timelineItem.iconColor}`}>
                      {icons[timelineItem.icon]}
                    </div>
                    
                    {/* Content */}
                    <div className="ml-4 flex-1">
                      <div className="font-medium text-gray-900">{timelineItem.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {formatDate(timelineItem.date)}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {timelineItem.description}
                      </div>
                      
                      {/* Catatan */}
                      {timelineItem.note && !timelineItem.hasValidTglST && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          <span className="font-medium">Catatan: </span>{timelineItem.note}
                        </div>
                      )}
                      
                      {/* Warning untuk ST */}
                      {timelineItem.showWarning && !timelineItem.hasValidTglST && (
                        <div className="mt-3 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          {icons.warning}
                          <div className="ml-2">
                            <span className="text-sm font-medium text-yellow-700">
                              {item.tgl_st ? 'Format tanggal ST tidak valid' : 'Tanggal ST belum diisi'}
                            </span>
                            {timelineItem.isSelesaiStatus && (
                              <div className="text-xs text-yellow-600 mt-1">
                                Untuk status "Selesai", mohon lengkapi tanggal ST
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      
                      
                
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t">
            <div className="text-sm text-gray-600">
                {item.status === 'selesai' ? (
                    <div className="flex items-center">
                        <div className="w-4 h-4 mr-2 text-green-500">
                            {icons.success}
                        </div>
                        <span className="font-medium text-green-600">Proses telah selesai</span>
                    </div>
                ) : item.status === 'dibatalkan' ? (
                    <div className="flex items-center">
                        <div className="w-4 h-4 mr-2 text-red-500">
                            {/* Icon silang (X) atau cancel */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium text-red-600">Status dibatalkan</span>
                    </div>
                ) : (
                    <div className="flex items-center">
                        <div className="w-4 h-4 mr-2 text-yellow-500">
                            {icons.clock}
                        </div>
                        <span>Proses masih berlangsung</span>
                    </div>
                )}
            </div>
            <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                onClick={onClose}
            >
                Tutup
            </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default HistoriModal;