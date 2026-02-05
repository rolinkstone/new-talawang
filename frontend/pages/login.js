// pages/login.js
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

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
        <title>Login | Talawang</title>
        <meta name="description" content="Login ke Sistem Pengelolaan Perjalanan Dinas BBPOM di Palangka Raya" />
      </Head>

      <div className="min-h-screen flex items-center justify-center p-4">
        {/* Background dengan Overlay Gelap */}
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/business-travel-bg.jpg')",
              backgroundBlendMode: 'overlay',
              backgroundColor: 'rgba(0, 0, 0, 0.4)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-indigo-900/70" />
        </div>

        <div className="relative z-10 max-w-md w-full">
          {/* Header dengan Logo Perusahaan */}
          <div className="text-center mb-10">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-4 transform hover:scale-105 transition-transform">
                <div className="relative">
                  <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">
                TALAWANG<span className="text-blue-300"></span>
              </h1>
             
            </div>
            
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-white text-sm">Login Aman dengan SSO </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50/90 backdrop-blur-sm p-4 rounded-xl border border-red-200 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8">
              {/* Welcome Message */}
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Selamat Datang
                </h2>
               
              </div>

              {/* SSO Login Button */}
              <div className="mb-8">
                <button
                  onClick={handleKeycloakLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-6 py-4 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-3 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-lg">Mengarahkan ke Portal SSO BBPOM di Palangka Raya</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-7 h-7 mr-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 13h-5v5h-2v-5h-5v-2h5v-5h2v5h5v2z" />
                      </svg>
                      <div className="text-left">
                        <div className="text-lg">Login dengan SSO</div>
                        <div className="text-sm font-normal opacity-90">Gunakan akun SSO BBPOM di Palangka Raya</div>
                      </div>
                    </>
                  )}
                </button>
              </div>

             

              {/* Security Info */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Sistem Terenkripsi</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Single Sign-On</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50/80 px-8 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between text-sm">
                <div className="flex items-center text-gray-600 mb-2 sm:mb-0">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Sistem Perjalanan Dinas v1.0</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowModal(true)}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm"
                  >
                    Sekilas Tentang Talawang
                  </button>
                 
                </div>
              </div>
            </div>
          </div>

          {/* Copyright & Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-white/80">
              &copy; {new Date().getFullYear()} Talawang. Hak cipta dilindungi.
            </p>
            <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-white/60">
              <span>BBPOM di Palangka Raya</span>
              <span>•</span>
              <span>BADAN POM RI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Sekilas Tentang Talawang */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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

            {/* Modal Content */}
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
                <div>
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
    </>
  );
};

export default LoginPage;