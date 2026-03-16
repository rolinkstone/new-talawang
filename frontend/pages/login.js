// pages/login.js
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const { error: queryError } = router.query;

  useEffect(() => {
    // Handle authentication errors from callback
    if (queryError) {
      switch (queryError) {
        case 'AccessDenied':
          setError('Akses ditolak. Periksa kredensial Anda atau hubungi administrator.');
          break;
        case 'Configuration':
          setError('Terdapat masalah dengan konfigurasi server.');
          break;
        case 'Verification':
          setError('Link verifikasi tidak valid atau telah kadaluarsa.');
          break;
        default:
          setError('Terjadi kesalahan saat autentikasi. Silakan coba lagi.');
      }
    }
  }, [queryError]);

  const handleKeycloakLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signIn('keycloak', {
        callbackUrl: '/',
        redirect: true
      });
    } catch (err) {
      setError('Gagal memulai login SSO. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | Talawang - BBPOM di Palangka Raya</title>
        <meta name="description" content="Sistem Pengelolaan Perjalanan Dinas BBPOM di Palangka Raya" />
      </Head>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/bg.png')",
            }}
          />
          {/* Dark Overlay untuk meningkatkan keterbacaan */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-indigo-900/80" />
          
          {/* Pattern Overlay halus */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.635 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.395 0L10.2 6.485 11.6 7.9l7.9-7.9h-3.105zM43.14 0L52.6 9.455l-1.414 1.415L40.313 0h2.828zM17.047 0L7.585 9.455 9 10.87 19.86 0h-2.813zM30 0l8.657 8.657-1.414 1.414L30 2.827 22.757 10.07 21.343 8.657 30 0z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }} />
          </div>1.0
        </div>

        <div className="relative z-10 max-w-md w-full">
          {/* Header dengan Logo Talawang */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                {/* Logo Container Premium */}
                <div className="w-28 h-28 bg-gradient-to-br from-white to-blue-50 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border-2 border-white/30">
                  <div className="relative w-20 h-20">
                    <Image
                      src="/images/talawang-dayak-borneo-png.webp"
                      alt="Talawang Logo - Perisai Dayak"
                      fill
                      className="object-contain drop-shadow-2xl"
                      priority
                      sizes="(max-width: 768px) 80px, 80px"
                    />
                  </div>
                </div>
                
                {/* Decorative Rings */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition duration-500"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-0 group-hover:opacity-75 blur-2xl transition duration-500"></div>
              </div>
            </div>

            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
              TALAWANG
            </h1>
            
            <div className="flex items-center justify-center space-x-2 text-blue-100/90 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>BBPOM di Palangka Raya</span>
            </div>

            {/* Badge Keamanan Premium */}
            <div className="mt-6 inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg">
              <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-white text-sm font-medium tracking-wide">Sistem Terintegrasi SSO BBPOM</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Error Message dengan Desain Premium */}
          {error && (
            <div className="mb-6 bg-red-500/10 backdrop-blur-md p-4 rounded-xl border border-red-500/20 shadow-lg animate-slideDown">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Card Premium dengan Efek Kaca */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            {/* Card Header Accent */}
            <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
            
            <div className="p-8">
              {/* Welcome Message */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                  Selamat Datang
                </h2>
                <p className="text-blue-100/80 text-sm">
                  Silakan login menggunakan akun SSO Anda
                </p>
              </div>

              {/* SSO Login Button Premium */}
              <div className="space-y-4">
                <button
                  onClick={handleKeycloakLogin}
                  disabled={isLoading}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-[2px] hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-blue-900 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <div className="relative flex items-center justify-center px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '20px 20px'
                      }} />
                    </div>
                    
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="font-semibold">Mengarahkan ke Portal SSO...</span>
                      </>
                    ) : (
                      <>
                        <div className="relative w-8 h-8 mr-4">
                          <Image
                            src="/images/talawang-dayak-borneo-png.webp"
                            alt="Talawang Icon"
                            fill
                            className="object-contain brightness-0 invert"
                          />
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-lg tracking-wide">Login dengan SSO</span>
                          <span className="block text-xs text-blue-100 mt-0.5 opacity-90">Gunakan akun SSO BBPOM di Palangka Raya</span>
                        </div>
                        <svg className="w-5 h-5 ml-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>

                {/* Info SSO */}
                <div className="text-center">
                  <p className="text-xs text-blue-100/60">
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Terhubung dengan Keycloak SSO
                    </span>
                  </p>
                </div>
              </div>

              {/* Security Features Premium */}
              <div className="mt-8 grid grid-cols-3 gap-3 pt-6 border-t border-white/10">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full mb-2 border border-white/20">
                    <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-white/80">Terenskripsi</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full mb-2 border border-white/20">
                    <svg className="w-5 h-5 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-white/80">Terverifikasi</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full mb-2 border border-white/20">
                    <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-white/80">Aman</p>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="bg-black/20 backdrop-blur-sm px-8 py-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-white/60">
                  <svg className="w-4 h-4 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Sistem Perjalanan Dinas v2.0</span>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-blue-300 hover:text-white transition-colors flex items-center space-x-1 group"
                >
                  <span>Sekilas Tentang Talawang</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-white/60">
              © {new Date().getFullYear()} Talawang. Hak cipta dilindungi.
            </p>
            <div className="mt-2 flex items-center justify-center space-x-3 text-xs text-white/40">
              <span>BBPOM di Palangka Raya</span>
              <span className="w-1 h-1 bg-white/20 rounded-full"></span>
              <span>BADAN POM RI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Sekilas Tentang Talawang dengan Desain Premium */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform animate-slideUp">
            {/* Modal Header dengan Logo */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl p-2 backdrop-blur-sm flex items-center justify-center">
                    <div className="relative w-10 h-10">
                      <Image
                        src="/images/talawang-dayak-borneo-png.webp"
                        alt="Talawang Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Talawang</h2>
                    <p className="text-blue-100 text-sm">Sistem Pengelolaan Perjalanan Dinas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content - Konten Tentang Talawang LENGKAP */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-6">
                {/* Pengantar */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Sekilas Tentang Talawang
                  </h3>
                  <p className="text-gray-600 mb-4">
                    <strong>Talawang</strong> merupakan sistem pengelolaan perjalanan dinas yang dirancang untuk memastikan setiap perjalanan dinas di BBPOM Palangka Raya dilaksanakan sesuai dengan prinsip-prinsip pengelolaan keuangan negara yang baik.
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <p className="text-blue-800 font-medium italic">
                      "Perjalanan dinas dilaksanakan secara tertib, sah secara hukum, hemat anggaran, dapat dipertanggungjawabkan, dan memberikan manfaat nyata bagi organisasi."
                    </p>
                  </div>
                </div>

                {/* Makna Talawang */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Makna & Filosofi Talawang
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                      <h5 className="font-bold text-blue-700 mb-2">Talawang</h5>
                      <p className="text-sm text-gray-600">Dalam bahasa Dayak, Talawang berarti <strong>perisai</strong>. Sistem ini berfungsi sebagai perisai untuk melindungi integritas dan akuntabilitas pengelolaan perjalanan dinas.</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                      <h5 className="font-bold text-green-700 mb-2">Prinsip Dasar</h5>
                      <p className="text-sm text-gray-600">Mengacu pada asas-asas pengelolaan keuangan negara: Tertib, Legal, Efisien, Efektif, Akurat, Wajar, Akuntabel, Nyata, dan Bermanfaat.</p>
                    </div>
                  </div>
                </div>

                {/* 9 Prinsip Talawang */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    9 Prinsip Talawang (TALAWANG)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Tertib */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-blue-600 font-bold">T</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Tertib Administrasi</h5>
                          <p className="text-sm text-gray-600 mt-1">Prosedur dan dokumen lengkap sesuai ketentuan.</p>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        Disiplin Prosedur
                      </div>
                    </div>

                    {/* Efektif */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-green-600 font-bold">E</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Efektif</h5>
                          <p className="text-sm text-gray-600 mt-1">Tercapainya tujuan dengan hasil maksimal.</p>
                        </div>
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Tujuan Tercapai
                      </div>
                    </div>

                    {/* Legal */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-purple-600 font-bold">L</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Legal</h5>
                          <p className="text-sm text-gray-600 mt-1">Sesuai peraturan perundang-undangan.</p>
                        </div>
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        Sesuai Hukum
                      </div>
                    </div>

                    {/* Akurat */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-yellow-600 font-bold">A</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Akurat</h5>
                          <p className="text-sm text-gray-600 mt-1">Data dan informasi tepat, benar, dan dapat dipertanggungjawabkan.</p>
                        </div>
                      </div>
                      <div className="text-xs text-yellow-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        Data Tepat
                      </div>
                    </div>

                    {/* Wajar */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-orange-600 font-bold">W</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Wajar</h5>
                          <p className="text-sm text-gray-600 mt-1">Masuk akal dan sesuai kebutuhan riil.</p>
                        </div>
                      </div>
                      <div className="text-xs text-orange-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                        Masuk Akal
                      </div>
                    </div>

                    {/* Akuntabel */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-red-600 font-bold">A</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Akuntabel</h5>
                          <p className="text-sm text-gray-600 mt-1">Dapat dipertanggungjawabkan secara transparan.</p>
                        </div>
                      </div>
                      <div className="text-xs text-red-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Transparan
                      </div>
                    </div>

                    {/* Nyata */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-indigo-600 font-bold">N</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Nyata</h5>
                          <p className="text-sm text-gray-600 mt-1">Konkrit dan dapat dibuktikan kebenarannya.</p>
                        </div>
                      </div>
                      <div className="text-xs text-indigo-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Konkrit
                      </div>
                    </div>

                    {/* Guna */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-teal-600 font-bold">G</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Guna</h5>
                          <p className="text-sm text-gray-600 mt-1">Memberikan manfaat nyata bagi organisasi.</p>
                        </div>
                      </div>
                      <div className="text-xs text-teal-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                        Bermanfaat
                      </div>
                    </div>

                    {/* Efisien */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow col-span-1 md:col-span-2 lg:col-span-1">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-emerald-600 font-bold">E*</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">Efisien</h5>
                          <p className="text-sm text-gray-600 mt-1">Penggunaan sumber daya optimal dengan biaya minimal.</p>
                        </div>
                      </div>
                      <div className="text-xs text-emerald-600 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.2 6.5 10.266a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                        Optimal
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tujuan Sistem */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                    </svg>
                    Tujuan Sistem Talawang
                  </h4>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Digitalisasi proses pengajuan dan pelaporan perjalanan dinas</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Meningkatkan efisiensi dan transparansi pengelolaan anggaran</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Memastikan kepatuhan terhadap regulasi keuangan negara</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Menyediakan data real-time untuk pengambilan keputusan</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Mengurangi beban administrasi dan waktu proses</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Manfaat */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    Manfaat Menggunakan Talawang
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <h5 className="font-bold text-gray-800">Keamanan Data</h5>
                      </div>
                      <p className="text-sm text-gray-600">Data terenkripsi dan terlindungi dengan sistem keamanan berlapis.</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h5 className="font-bold text-gray-800">Proses Cepat</h5>
                      </div>
                      <p className="text-sm text-gray-600">Waktu proses pengajuan dan persetujuan lebih efisien.</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h5 className="font-bold text-gray-800">Laporan Real-time</h5>
                      </div>
                      <p className="text-sm text-gray-600">Monitoring dan pelaporan real-time untuk pengambilan keputusan.</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h5 className="font-bold text-gray-800">Kepatuhan Regulasi</h5>
                      </div>
                      <p className="text-sm text-gray-600">Otomatisasi validasi sesuai peraturan yang berlaku.</p>
                    </div>
                  </div>
                </div>

                {/* Footer Modal */}
                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Sistem Talawang dikembangkan untuk mendukung good governance dalam pengelolaan perjalanan dinas.
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                    <span>BBPOM di Palangka Raya</span>
                    <span>•</span>
                    <span>Kementerian Kesehatan RI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={handleKeycloakLogin}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
                >
                  Login ke Talawang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default LoginPage;