// components/sptjm/SPTJMHotelForm.js
import React, { useState, useEffect } from 'react';

export default function SPTJMHotelForm({ 
    formData, setFormData, kegiatanList, pegawaiList, 
    isEditMode, formLoading, formError, onCancel, onSubmit, onFileChange 
}) {
    return (
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isEditMode ? 'Edit SPTJM Hotel' : 'Tambah SPTJM Hotel Baru'}
            </h3>
            
            {formError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    {formError}
                </div>
            )}
            
            <form onSubmit={onSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pilih Kegiatan <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.kegiatan_id}
                            onChange={(e) => setFormData({ ...formData, kegiatan_id: e.target.value, pegawai_id: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        >
                            <option value="">-- Pilih Kegiatan --</option>
                            {kegiatanList.map((k) => (
                                <option key={k.id} value={k.id}>
                                    {k.id} - {k.kegiatan} ({k.mak})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pilih Pegawai <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.pegawai_id}
                            onChange={(e) => setFormData({ ...formData, pegawai_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                            disabled={!formData.kegiatan_id}
                        >
                            <option value="">-- Pilih Pegawai --</option>
                            {pegawaiList.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nama} - {p.nip} ({p.jabatan})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            No SPD <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.no_spd}
                            onChange={(e) => setFormData({ ...formData, no_spd: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Contoh: PL.03.07.16A.02.25.51.69"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tanggal SPD <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={formData.tgl_spd}
                            onChange={(e) => setFormData({ ...formData, tgl_spd: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Hotel <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nama_hotel}
                            onChange={(e) => setFormData({ ...formData, nama_hotel: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Contoh: MaxOne Hotel Kramat"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alamat Hotel
                        </label>
                        <input
                            type="text"
                            value={formData.alamat_hotel}
                            onChange={(e) => setFormData({ ...formData, alamat_hotel: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Contoh: Jalan Kramat Raya No. 91, Jakarta"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nomor Kamar
                        </label>
                        <input
                            type="text"
                            value={formData.nomor_kamar}
                            onChange={(e) => setFormData({ ...formData, nomor_kamar: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Contoh: 615"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tanggal Menginap
                        </label>
                        <input
                            type="date"
                            value={formData.tgl_menginap}
                            onChange={(e) => setFormData({ ...formData, tgl_menginap: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tarif Hotel (Rp)
                        </label>
                        <input
                            type="number"
                            value={formData.tarif_hotel}
                            onChange={(e) => setFormData({ ...formData, tarif_hotel: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Contoh: 365565"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Upload Bukti (Kwitansi/Faktur)
                        </label>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={onFileChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max 5MB)</p>
                    </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition">
                        Batal
                    </button>
                    <button type="submit" disabled={formLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50">
                        {formLoading ? 'Menyimpan...' : (isEditMode ? 'Update' : 'Simpan')}
                    </button>
                </div>
            </form>
        </div>
    );
}