// components/profile/ProfileContainer.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Image from 'next/image';
import LoadingSpinner from '../common/LoadingSpinner';
import NotificationModal from '../common/NotificationModal';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';
import ProfileForm from './ProfileForm';
import UploadTTDModal from './modals/UploadTTDModal';
import ViewTTDModal from './modals/ViewTTDModal';

export default function ProfileContainer() {
    const { data: session, status, update } = useSession();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showUploadTTDModal, setShowUploadTTDModal] = useState(false);
    const [showViewTTDModal, setShowViewTTDModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [ttdUrl, setTtdUrl] = useState(null);
    const [hasTtd, setHasTtd] = useState(false);

    // Fetch profile data
    // components/profile/ProfileContainer.js
// Perbaiki bagian fetchProfile untuk TTD URL

const fetchProfile = async () => {
    if (!session?.accessToken) return;

    try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
            headers: {
                Authorization: `Bearer ${session.accessToken}`
            }
        });

        if (response.data.success) {
            const profileData = response.data.data;
            setProfile(profileData);
            setHasTtd(!!profileData?.ttd_path);
            
            // Proses TTD URL seperti pola kwitansi
            if (profileData?.ttd_path) {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                let cleanPath = profileData.ttd_path;
                
                // Hapus /api jika ada
                if (cleanPath.startsWith('/api/')) {
                    cleanPath = cleanPath.replace('/api', '');
                }
                
                if (!cleanPath.startsWith('/uploads')) {
                    cleanPath = `/uploads/ttd/${cleanPath.split('/').pop()}`;
                }
                
                const ttdFullUrl = `${apiUrl}${cleanPath}`;
                setTtdUrl(ttdFullUrl);
                console.log('TTD URL:', ttdFullUrl);
            } else {
                setTtdUrl(null);
            }
            setError('');
        } else {
            setError(response.data.message || 'Gagal mengambil data profile');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error.response?.data?.message || 'Gagal mengambil data profile');
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        if (session?.accessToken) {
            fetchProfile();
        }
    }, [session]);

    // Update profile
    const handleUpdateProfile = async (formData) => {
        try {
            setLoading(true);
            const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/profile`, formData, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                setProfile(response.data.data);
                setNotificationMessage('Profile berhasil diperbarui');
                setModalOpen(true);
                setShowEditForm(false);
                fetchProfile(); // Refresh data
            } else {
                setError(response.data.message || 'Gagal mengupdate profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error.response?.data?.message || 'Gagal mengupdate profile');
        } finally {
            setLoading(false);
        }
    };

    // Upload TTD
    const handleUploadTTD = async (file) => {
        const formData = new FormData();
        formData.append('ttd_image', file);

        try {
            setUploading(true);
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/profile/upload-ttd`, formData, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setHasTtd(true);
                setTtdUrl(response.data.data.ttd_path);
                setNotificationMessage('TTD berhasil diupload');
                setModalOpen(true);
                setShowUploadTTDModal(false);
                fetchProfile();
            } else {
                setError(response.data.message || 'Gagal upload TTD');
            }
        } catch (error) {
            console.error('Error uploading TTD:', error);
            setError(error.response?.data?.message || 'Gagal upload TTD');
        } finally {
            setUploading(false);
        }
    };

    // Delete TTD
    const handleDeleteTTD = async () => {
        try {
            setDeleting(true);
            const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/profile/ttd`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`
                }
            });

            if (response.data.success) {
                setHasTtd(false);
                setTtdUrl(null);
                setNotificationMessage('TTD berhasil dihapus');
                setModalOpen(true);
                setShowDeleteConfirm(false);
                fetchProfile();
            } else {
                setError(response.data.message || 'Gagal menghapus TTD');
            }
        } catch (error) {
            console.error('Error deleting TTD:', error);
            setError(error.response?.data?.message || 'Gagal menghapus TTD');
        } finally {
            setDeleting(false);
        }
    };

    // View TTD
    const handleViewTTD = () => {
        setShowViewTTDModal(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setError('');
    };

    if (status === 'loading' || loading) {
        return <LoadingSpinner />;
    }

    if (!session) {
        return null;
    }

    const userRoles = profile?.roles || [];
    const roleBadge = () => {
        if (userRoles.includes('admin')) return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200';
        if (userRoles.includes('ppk')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200';
        if (userRoles.includes('kabalai')) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200';
        if (userRoles.includes('bendahara')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    };

    const roleName = () => {
        if (userRoles.includes('admin')) return 'Administrator';
        if (userRoles.includes('ppk')) return 'Pejabat Pembuat Komitmen (PPK)';
        if (userRoles.includes('kabalai')) return 'Kepala Balai';
        if (userRoles.includes('bendahara')) return 'Bendahara';
        return 'User';
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profil Saya</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola informasi profil dan tanda tangan digital Anda</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-red-700 dark:text-red-300">{error}</span>
                    </div>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {/* Profile Header with Avatar */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
                    <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-white">
                            <h2 className="text-xl font-semibold">{profile?.nama_lengkap || profile?.username || '-'}</h2>
                            <p className="text-blue-100">{roleName()}</p>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${roleBadge()}`}>
                                {userRoles.join(', ')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Content */}
                <div className="p-6 space-y-6">
                    {/* Informasi Dasar */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b dark:border-gray-700 pb-2">Informasi Dasar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="Username" value={profile?.username} />
                            <InfoItem label="Nama Lengkap" value={profile?.nama_lengkap} />
                            <InfoItem label="NIP" value={profile?.nip} />
                            <InfoItem label="Email" value={profile?.email} />
                            <InfoItem label="Jabatan" value={profile?.jabatan || '-'} />
                            <InfoItem label="Unit Kerja" value={profile?.unit_kerja || '-'} />
                            <InfoItem label="Terdaftar Sejak" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID') : '-'} />
                        </div>
                    </div>

                    {/* Tanda Tangan Digital */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b dark:border-gray-700 pb-2">Tanda Tangan Digital</h3>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Status Tanda Tangan:</p>
                                    {hasTtd ? (
                                        <div className="flex items-center text-green-600">
                                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-medium">Sudah diupload</span>
                                            {profile?.ttd_uploaded_at && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                    (Upload: {new Date(profile.ttd_uploaded_at).toLocaleDateString('id-ID')})
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-yellow-600">
                                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-medium">Belum diupload</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    {!hasTtd ? (
                                        <button
                                            onClick={() => setShowUploadTTDModal(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload TTD
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleViewTTD}
                                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Lihat TTD
                                            </button>
                                            <button
                                                onClick={() => setShowUploadTTDModal(true)}
                                                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Ganti TTD
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center"
                                                disabled={deleting}
                                            >
                                                {deleting ? (
                                                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                                Hapus TTD
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {hasTtd && (
                                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                    Format yang didukung: JPG, JPEG, PNG (maks 2MB)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-4 border-t">
                        {!showEditForm ? (
                            <button
                                onClick={() => setShowEditForm(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536L12 14H9v-3z" />
                                </svg>
                                Edit Profil
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setShowEditForm(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                                >
                                    Batal
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Edit Form */}
                    {showEditForm && (
                        <ProfileForm
                            profile={profile}
                            onSubmit={handleUpdateProfile}
                            onCancel={() => setShowEditForm(false)}
                            loading={loading}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <NotificationModal
                show={modalOpen}
                message={notificationMessage}
                onClose={closeModal}
            />

            <ConfirmDeleteModal
                show={showDeleteConfirm}
                deletingId={deleting}
                itemToDelete="TTD"
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteTTD}
            />

            <UploadTTDModal
                show={showUploadTTDModal}
                onClose={() => setShowUploadTTDModal(false)}
                onUpload={handleUploadTTD}
                uploading={uploading}
                currentTtd={hasTtd}
            />

            <ViewTTDModal
                show={showViewTTDModal}
                onClose={() => setShowViewTTDModal(false)}
                ttdUrl={ttdUrl}
                userName={profile?.nama_lengkap || profile?.username}
            />
        </div>
    );
}

// Helper component untuk info item
function InfoItem({ label, value }) {
    return (
        <div className="border-b dark:border-gray-700 pb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{value || '-'}</p>
        </div>
    );
}