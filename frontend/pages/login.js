// pages/login.js
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import TentangTalawangModal from '../components/TentangTalawangModal';

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
          </div>
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

      <TentangTalawangModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onLogin={handleKeycloakLogin}
      />

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