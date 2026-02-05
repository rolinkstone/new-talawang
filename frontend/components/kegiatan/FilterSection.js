// components/kegiatan/FilterSection.js
import React from 'react';

const FilterSection = ({
    showFilter,
    filterStatus,
    setFilterStatus,
    filterJenisSpm,
    setFilterJenisSpm,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterMak,
    setFilterMak,
    filterLokasi,
    setFilterLokasi,
    resetFilter,
    filteredKegiatan,
    kegiatanList
}) => {
    if (!showFilter) return null;

    return (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filter Data</h3>
                <button
                    onClick={resetFilter}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Filter
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filter Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                    </label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="diajukan">Diajukan</option>
                        <option value="disetujui">Disetujui</option>
                        <option value="dikembalikan">Dikembalikan</option>
                        <option value="diketahui">Diketahui</option>
                        <option value="selesai">Selesai</option>
                    </select>
                </div>
                
                {/* Filter Jenis SPM */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jenis SPM
                    </label>
                    <select
                        value={filterJenisSpm}
                        onChange={(e) => setFilterJenisSpm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Semua Jenis</option>
                        <option value="LS">LS (Langsung)</option>
                        <option value="KKP">KKP (Kartu Kredit Pemerintah)</option>
                       
                    </select>
                </div>
                
                {/* Filter Tanggal Dari */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal ST Dari
                    </label>
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                {/* Filter Tanggal Sampai */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal ST Sampai
                    </label>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                {/* Filter MAK */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        MAK (Kode Anggaran)
                    </label>
                    <input
                        type="text"
                        value={filterMak}
                        onChange={(e) => setFilterMak(e.target.value)}
                        placeholder="Contoh: 052.01.01.0001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                {/* Filter Lokasi */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lokasi Kegiatan
                    </label>
                    <input
                        type="text"
                        value={filterLokasi}
                        onChange={(e) => setFilterLokasi(e.target.value)}
                        placeholder="Contoh: Jakarta, Bandung, dll"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                {/* Filter Tambahan jika diperlukan */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pencarian Cepat
                    </label>
                    <input
                        type="text"
                        placeholder="Cari berdasarkan kegiatan, no ST, dll..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onChange={(e) => {
                            // Implementasi search cepat jika diperlukan
                        }}
                    />
                </div>
            </div>
            
            {/* Info Jumlah Data */}
            <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    Menampilkan <span className="font-semibold">{filteredKegiatan.length}</span> dari <span className="font-semibold">{kegiatanList.length}</span> kegiatan
                </div>
                
                {/* Tampilkan filter aktif */}
                <div className="flex flex-wrap gap-2">
                    {filterStatus && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center gap-1">
                            Status: {filterStatus}
                            <button 
                                onClick={() => setFilterStatus('')}
                                className="text-indigo-600 hover:text-indigo-800"
                            >
                                ×
                            </button>
                        </span>
                    )}
                    
                    {filterJenisSpm && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                            SPM: {filterJenisSpm}
                            <button 
                                onClick={() => setFilterJenisSpm('')}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                ×
                            </button>
                        </span>
                    )}
                    
                    {filterDateFrom && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                            Dari: {filterDateFrom}
                            <button 
                                onClick={() => setFilterDateFrom('')}
                                className="text-green-600 hover:text-green-800"
                            >
                                ×
                            </button>
                        </span>
                    )}
                    
                    {filterDateTo && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                            Sampai: {filterDateTo}
                            <button 
                                onClick={() => setFilterDateTo('')}
                                className="text-green-600 hover:text-green-800"
                            >
                                ×
                            </button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterSection;