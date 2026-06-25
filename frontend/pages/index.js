// pages/home.js
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';

const Home = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';
  
  const sessionTimerRef = useRef(null);
  
  const [userInfo, setUserInfo] = useState({
    username: '',
    nip: '',
    role: '',
    userId: '',
    fullName: '',
    jabatan: '',
    pangkat: '',
    golongan: '',
    loginTime: '',
    email: '',
    roles: [],
    department: 'Balai Besar Pengawasan Obat dan Makanan di Palangka Raya',
    nipSource: '',
    sessionExpires: '',
    sessionRemaining: '',
    sessionPercentage: 0,
    isSessionExpiring: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  // Fungsi untuk memformat NIP dari 18 digit tanpa spasi menjadi format dengan spasi
  const formatNipWithSpasi = (rawNip) => {
    if (!rawNip) return null;
    // Hapus spasi yang sudah ada
    const cleanNip = String(rawNip).replace(/\s/g, '');
    // Cek apakah panjangnya 18 digit dan hanya angka
    if (cleanNip.length === 18 && /^\d+$/.test(cleanNip)) {
      return `${cleanNip.substring(0, 8)} ${cleanNip.substring(8, 14)} ${cleanNip.substring(14, 15)} ${cleanNip.substring(15, 18)}`;
    }
    // Jika sudah memiliki spasi dan formatnya benar
    if (/^\d{4}\s\d{6}\s\d{1,2}\s\d{3}$/.test(rawNip)) {
      return rawNip;
    }
    return rawNip;
  };

  // Format pangkat dan golongan
  const formatPangkatGolongan = (pangkat, golongan) => {
    if (pangkat && golongan) {
      return `${pangkat} (${golongan})`;
    }
    if (pangkat) return pangkat;
    if (golongan) return golongan;
    return '-';
  };

  const calculateSessionTime = (expiresDate) => {
    const now = new Date();
    const expires = new Date(expiresDate);
    const totalSessionMs = 8 * 60 * 60 * 1000;
    const timeLeftMs = expires.getTime() - now.getTime();
    
    if (timeLeftMs <= 0) {
      return { timeLeftMs: 0, formatted: 'Session expired', percentage: 0, isExpiring: true };
    }
    
    const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
    
    let formatted = '';
    if (hoursLeft > 0) formatted += `${hoursLeft} jam `;
    if (minutesLeft > 0) formatted += `${minutesLeft} menit `;
    if (hoursLeft === 0 && minutesLeft < 5) formatted += `${secondsLeft} detik`;
    
    const percentage = Math.max(0, Math.min(100, (timeLeftMs / totalSessionMs) * 100));
    const isExpiring = timeLeftMs < 30 * 60 * 1000;
    
    return { timeLeftMs, formatted: formatted.trim(), percentage, isExpiring };
  };

  useEffect(() => {
    if (session?.expires) {
      const updateTimer = () => {
        const sessionTime = calculateSessionTime(session.expires);
        setUserInfo(prev => ({
          ...prev,
          sessionRemaining: sessionTime.formatted,
          sessionPercentage: sessionTime.percentage,
          isSessionExpiring: sessionTime.isExpiring,
          sessionExpires: new Date(session.expires).toLocaleString('id-ID')
        }));
        if (sessionTime.timeLeftMs <= 0) router.push('/login');
      };
      updateTimer();
      sessionTimerRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(sessionTimerRef.current);
    }
  }, [session?.expires, router]);

  useEffect(() => {
    if (session?.user) {
      let tokenPayload = {};
      if (session.accessToken) {
        try {
          const base64Payload = session.accessToken.split('.')[1];
          tokenPayload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
          console.log("📊 Token Payload:", tokenPayload);
        } catch (e) {}
      }
      extractUserInfo(session, tokenPayload);
    }
  }, [session]);

  const extractUserInfo = (session, tokenPayload = {}) => {
    try {
      setIsLoading(true);
      const user = session.user;
      
      setDebugInfo({ tokenPayload, sessionUser: user });
      
      const username = tokenPayload.preferred_username || user.preferred_username || user.name || user.email?.split('@')[0] || 'User';
      const email = tokenPayload.email || user.email || 'No email';
      const userId = tokenPayload.sub || user.id || 'N/A';
      const fullName = tokenPayload.name || user.name || username;
      const userRole = user.role || 'User';
      
      // ========== EKSTRAKSI NIP (dengan spasi) ==========
      let nip = 'Tidak tersedia';
      let nipSource = 'Not found';
      let rawNip = null;
      
      console.log("🔍 Mencari NIP di token payload...");
      console.log("🔍 preferred_username:", tokenPayload.preferred_username);
      console.log("🔍 username:", tokenPayload.username);
      
      if (tokenPayload.preferred_username) {
        rawNip = tokenPayload.preferred_username;
        nipSource = 'token.preferred_username';
        const formattedNip = formatNipWithSpasi(rawNip);
        if (formattedNip) {
          nip = formattedNip;
          nipSource = 'token.preferred_username (formatted)';
        } else {
          nip = rawNip;
        }
      } else if (tokenPayload.username) {
        rawNip = tokenPayload.username;
        nipSource = 'token.username';
        const formattedNip = formatNipWithSpasi(rawNip);
        if (formattedNip) {
          nip = formattedNip;
          nipSource = 'token.username (formatted)';
        } else {
          nip = rawNip;
        }
      } else if (tokenPayload.nip) {
        rawNip = tokenPayload.nip;
        nipSource = 'token.nip';
        const formattedNip = formatNipWithSpasi(rawNip);
        nip = formattedNip || rawNip;
        if (formattedNip) nipSource += ' (formatted)';
      } else if (user.nip) {
        rawNip = user.nip;
        nipSource = 'session.user.nip';
        const formattedNip = formatNipWithSpasi(rawNip);
        nip = formattedNip || rawNip;
      }
      
      console.log("🏁 FINAL NIP:", nip);
      
      // ========== EKSTRAKSI PANGKAT DAN GOLONGAN ==========
      let pangkat = '-';
      let golongan = '-';
      let pangkatSource = 'Not found';
      
      console.log("🔍 Mencari pangkat/golongan di token payload...");
      console.log("🔍 tokenPayload.pangkat:", tokenPayload.pangkat);
      console.log("🔍 tokenPayload.golongan:", tokenPayload.golongan);
      console.log("🔍 tokenPayload.attributes:", tokenPayload.attributes);
      
      // SUMBER 1: Langsung dari token payload
      if (tokenPayload.pangkat) {
        pangkat = tokenPayload.pangkat;
        pangkatSource = 'token.pangkat';
        console.log("✅ Pangkat from token.pangkat:", pangkat);
      }
      
      if (tokenPayload.golongan) {
        golongan = tokenPayload.golongan;
        pangkatSource += ', token.golongan';
        console.log("✅ Golongan from token.golongan:", golongan);
      }
      
      // SUMBER 2: Dari attributes di Keycloak
      if (tokenPayload.attributes) {
        if (tokenPayload.attributes.pangkat && tokenPayload.attributes.pangkat[0]) {
          pangkat = tokenPayload.attributes.pangkat[0];
          pangkatSource = 'token.attributes.pangkat';
          console.log("✅ Pangkat from attributes:", pangkat);
        }
        if (tokenPayload.attributes.golongan && tokenPayload.attributes.golongan[0]) {
          golongan = tokenPayload.attributes.golongan[0];
          pangkatSource += ', token.attributes.golongan';
          console.log("✅ Golongan from attributes:", golongan);
        }
        if (tokenPayload.attributes.pangkat_golongan && tokenPayload.attributes.pangkat_golongan[0]) {
          const pangkatGolongan = tokenPayload.attributes.pangkat_golongan[0];
          console.log("✅ Pangkat Golongan from attributes:", pangkatGolongan);
          // Coba pisahkan jika formatnya "Pangkat (Golongan)"
          const match = pangkatGolongan.match(/^(.+?)\s*\((.+?)\)$/);
          if (match) {
            pangkat = match[1];
            golongan = match[2];
            console.log("✅ Parsed pangkat:", pangkat, "golongan:", golongan);
          } else {
            pangkat = pangkatGolongan;
          }
        }
      }
      
      // SUMBER 3: Dari user session
      if (user.pangkat) {
        pangkat = user.pangkat;
        pangkatSource = 'session.user.pangkat';
      }
      if (user.golongan) {
        golongan = user.golongan;
        pangkatSource += ', session.user.golongan';
      }
      
      console.log("🏁 FINAL Pangkat:", pangkat);
      console.log("🏁 FINAL Golongan:", golongan);
      
      // ========== JABATAN ==========
      let jabatan = 'Pegawai';
      let jabatanSource = 'Default';
      
      if (tokenPayload.jabatan) {
        jabatan = tokenPayload.jabatan;
        jabatanSource = 'token.jabatan';
      } else if (tokenPayload.position) {
        jabatan = tokenPayload.position;
        jabatanSource = 'token.position';
      } else if (tokenPayload.attributes?.jabatan?.[0]) {
        jabatan = tokenPayload.attributes.jabatan[0];
        jabatanSource = 'token.attributes.jabatan';
      } else {
        switch(userRole.toLowerCase()) {
          case 'admin': jabatan = 'Administrator Sistem'; jabatanSource = 'role-based'; break;
          case 'ppk': jabatan = 'Pejabat Pembuat Komitmen'; jabatanSource = 'role-based'; break;
          case 'kabalai': jabatan = 'Kepala Balai'; jabatanSource = 'role-based'; break;
          default: jabatan = 'Pegawai'; break;
        }
      }
      
      const loginTime = new Date().toLocaleString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      
      const allRoles = [...(tokenPayload.realm_access?.roles || [])];
      
      let sessionExpires = '', sessionRemaining = 'Menghitung...', sessionPercentage = 100, isSessionExpiring = false;
      if (session.expires) {
        const st = calculateSessionTime(session.expires);
        sessionExpires = new Date(session.expires).toLocaleString('id-ID');
        sessionRemaining = st.formatted;
        sessionPercentage = st.percentage;
        isSessionExpiring = st.isExpiring;
      }
      
      setUserInfo({
        username, email, role: userRole, userId, fullName, jabatan, 
        pangkat, golongan, nip,
        loginTime, roles: allRoles, nipSource, jabatanSource,
        department: 'Balai Besar Pengawasan Obat dan Makanan di Palangka Raya',
        sessionExpires, sessionRemaining, sessionPercentage, isSessionExpiring
      });
      
      console.log("✅ User Info Loaded:", { fullName, nip, pangkat, golongan, jabatan });
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'ppk': return 'bg-yellow-100 text-yellow-800';
      case 'kabalai': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionColor = (percentage, isExpiring) => {
    if (isExpiring) return 'bg-red-500';
    if (percentage < 30) return 'bg-yellow-500';
    if (percentage < 60) return 'bg-orange-500';
    return 'bg-green-500';
  };

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat data pengguna...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const pangkatGolonganDisplay = formatPangkatGolongan(userInfo.pangkat, userInfo.golongan);

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
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getRoleColor(userInfo.role)}`}>
                  {userInfo.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-blue-200 text-sm">Active Session</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold">Selamat Datang, {userInfo.fullName}!</h2>
                  <p className="text-blue-200 mt-1">{userInfo.department}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm">
                      <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11a3 3 0 10-6 0" /></svg>
                      {userInfo.jabatan}
                    </span>
                    {pangkatGolonganDisplay !== '-' && (
                      <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm">
                        <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {pangkatGolonganDisplay}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-mono">
                      <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11a3 3 0 10-6 0" /></svg>
                      NIP: {userInfo.nip}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 min-w-[180px]">
                  <span className="text-2xl font-bold">{userInfo.sessionPercentage.toFixed(0)}%</span>
                  <span className="text-xs text-blue-200 mt-0.5">Sisa Session</span>
                  <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full transition-all ${getSessionColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)}`} style={{ width: `${userInfo.sessionPercentage}%` }}></div>
                  </div>
                  <span className="text-xs text-blue-200 mt-1">{userInfo.sessionRemaining}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1 capitalize">{userInfo.role}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Login</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">Keycloak SSO</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NIP</p>
                  <p className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 mt-1 truncate max-w-[160px]" title={userInfo.nip}>{userInfo.nip}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Login</p>
                  <p className="text-xs text-gray-900 dark:text-gray-100 mt-1">{userInfo.loginTime}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Kartu Informasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kartu Kiri - Informasi Pribadi */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Informasi Pribadi</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nama Lengkap</span>
                  <span className="text-sm font-semibold dark:text-gray-100">{userInfo.fullName}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">NIP</span>
                  <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{userInfo.nip}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Pangkat / Golongan</span>
                  <span className="text-sm font-medium dark:text-gray-100">{pangkatGolonganDisplay}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Jabatan</span>
                  <span className="text-sm font-medium dark:text-gray-100">{userInfo.jabatan}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
                  <span className="text-sm dark:text-gray-100">{userInfo.email}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Username</span>
                  <span className="text-sm font-mono dark:text-gray-100">{userInfo.username}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Login Time</span>
                  <span className="text-sm dark:text-gray-100">{userInfo.loginTime}</span>
                </div>
              </div>
            </div>

            {/* Kartu Kanan - Informasi Sistem */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Informasi Sistem</h3>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${userInfo.isSessionExpiring ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                      {userInfo.sessionRemaining || 'Menghitung...'}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sisa Waktu Session</p>
                  </div>
                  <div className="w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-2 my-3">
                    <div className={`h-2 rounded-full transition-all duration-1000 ${getSessionColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)}`} style={{ width: `${userInfo.sessionPercentage}%` }}></div>
                  </div>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Berakhir: {userInfo.sessionExpires}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Metode Login</span>
                  <span className="text-sm font-medium dark:text-gray-100">Keycloak SSO</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">User ID</span>
                  <span className="text-xs font-mono dark:text-gray-100 truncate max-w-[180px]" title={userInfo.userId}>{userInfo.userId.substring(0, 25)}...</span>
                </div>
              </div>
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
              <a href="/laporan" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-red-100 dark:from-red-900/40 dark:to-red-800/30 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-red-200 dark:border-red-800">
                <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div className="font-semibold text-sm text-rose-700 dark:text-rose-300">Laporan</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rekap Perjadin</p>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Sistem Nominatif Kegiatan v1.0 • {userInfo.fullName}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;