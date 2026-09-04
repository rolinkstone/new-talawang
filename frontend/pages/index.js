// pages/index.js — Dashboard
// Keamanan: hanya menampilkan informasi minimal (nama). Nama role tidak dirender
// ke client — hanya fitur yang bisa diakses. Detail pribadi di halaman /profile.
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { isAdmin, isKabagTu, isKabalai } from '../utils/roleChecks';

const Home = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';

  // Redirect ke login bila sesi belum ada
  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  // Catatan: auto-logout + countdown saat session habis ditangani secara global
  // oleh komponen SessionExpiryWatcher yang dipasang di _app.js.

  const displayName =
    session?.user?.name ||
    session?.user?.preferred_username ||
    session?.user?.email?.split('@')[0] ||
    'Pengguna';

  // Tautan aksi cepat hanya untuk pengguna yang berhak (konsisten dengan sidebar).
  // Nama role TIDAK dirender ke client — hanya fitur yang bisa diakses.
  const canAccessLaporan = isAdmin(session) || isKabagTu(session) || isKabalai(session);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sistem Pengelolaan Kegiatan &amp; Perjalanan Dinas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Welcome */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold">Selamat Datang, {displayName}!</h2>
                <p className="text-blue-200 mt-1">
                  Gunakan menu di samping untuk mengelola kegiatan, LPD, dan kwitansi perjalanan dinas.
                </p>
              </div>
              <a
                href="/profile"
                className="inline-flex items-center gap-2 self-start md:self-auto bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Lihat Profil Saya
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aksi Cepat</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <a href="/kegiatan" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/30 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-blue-200 dark:border-blue-800">
                <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div className="font-semibold text-sm text-blue-700 dark:text-blue-300">Kegiatan</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nominatif Kegiatan</p>
              </a>
              <a href="/kwitansi" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/30 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-green-200 dark:border-green-800">
                <div className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="font-semibold text-sm text-green-700 dark:text-green-300">Kwitansi</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kwitansi Perjadin</p>
              </a>
              <a href="/lpd" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-yellow-900/40 dark:to-yellow-800/30 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-yellow-200 dark:border-yellow-800">
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="font-semibold text-sm text-amber-700 dark:text-amber-300">LPD</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Laporan Perjadin</p>
              </a>
              <a href="/profile" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/30 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-purple-200 dark:border-purple-800">
                <div className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div className="font-semibold text-sm text-purple-700 dark:text-purple-300">Profil</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kelola Profil</p>
              </a>
              {canAccessLaporan && (
                <a href="/laporan" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-red-100 dark:from-red-900/40 dark:to-red-800/30 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-red-200 dark:border-red-800">
                  <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <div className="font-semibold text-sm text-rose-700 dark:text-rose-300">Laporan</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rekap Perjadin</p>
                </a>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Sistem Nominatif Kegiatan v1.0
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;