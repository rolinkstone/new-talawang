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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-5">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Sistem Nominatif</h1>
                <p className="text-gray-500 mt-1">Sistem Pengelolaan Kegiatan dan Perjalanan Dinas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userInfo.role)}`}>
                  {userInfo.role}
                </div>
              </div>
            </div>
            
            {/* Progress Bar Session */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Session: {userInfo.sessionRemaining}</span>
                <span>{userInfo.sessionPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${getSessionColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)}`} style={{ width: `${userInfo.sessionPercentage}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Welcome Banner dengan NIP dan Pangkat/Golongan */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Selamat Datang, {userInfo.fullName}!</h2>
                <p className="text-blue-100 mt-1">Anda telah berhasil login ke sistem</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="bg-white/20 rounded-lg px-3 py-1 text-sm">
                    NIP: <span className="font-mono font-bold">{userInfo.nip}</span>
                  </div>
                  <div className="bg-white/20 rounded-lg px-3 py-1 text-sm">
                    {userInfo.jabatan}
                  </div>
                  {pangkatGolonganDisplay !== '-' && (
                    <div className="bg-white/20 rounded-lg px-3 py-1 text-sm">
                      Pangkat/Golongan: <span className="font-medium">{pangkatGolonganDisplay}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <span>{userInfo.sessionRemaining}</span>
              </div>
            </div>
          </div>

          {/* Kartu Informasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Kartu Kiri - Informasi Pribadi */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Nama Lengkap</span>
                  <span className="font-medium">{userInfo.fullName}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">NIP</span>
                  <span className="font-mono font-bold text-blue-600 text-lg">{userInfo.nip}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Pangkat / Golongan</span>
                  <span className="font-medium">{pangkatGolonganDisplay}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Jabatan</span>
                  <span className="font-medium">{userInfo.jabatan}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Email</span>
                  <span>{userInfo.email}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Username</span>
                  <span className="font-mono text-sm">{userInfo.username}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Login Time</span>
                  <span className="text-sm">{userInfo.loginTime}</span>
                </div>
                {userInfo.nipSource !== 'Not found' && (
                  <div className="text-xs text-gray-400 text-right">
                    Sumber NIP: {userInfo.nipSource}
                  </div>
                )}
              </div>
            </div>

            {/* Kartu Kanan - Informasi Sistem */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Informasi Sistem</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <div className={`text-2xl font-bold ${userInfo.isSessionExpiring ? 'text-red-600' : 'text-purple-600'}`}>
                      {userInfo.sessionRemaining}
                    </div>
                    <div className="text-sm text-gray-500">Sisa Waktu Session</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full ${getSessionColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)}`} style={{ width: `${userInfo.sessionPercentage}%` }}></div>
                  </div>
                  <div className="text-center text-xs text-gray-500">
                    Session berakhir: {userInfo.sessionExpires}
                  </div>
                </div>
                
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">Metode Login</span>
                  <span>Keycloak SSO</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-500">User ID</span>
                  <span className="font-mono text-xs">{userInfo.userId.substring(0, 30)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/kegiatan" className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 text-center transition border border-blue-200">
                <div className="font-medium text-blue-700">Nominatif Kegiatan</div>
                <p className="text-xs text-gray-500 mt-1">Buat & kelola kegiatan</p>
              </a>
              <a href="/kwitansi" className="bg-green-50 hover:bg-green-100 rounded-lg p-4 text-center transition border border-green-200">
                <div className="font-medium text-green-700">Kwitansi Perjadin</div>
                <p className="text-xs text-gray-500 mt-1">Input kwitansi</p>
              </a>
              <a href="/lpd" className="bg-yellow-50 hover:bg-yellow-100 rounded-lg p-4 text-center transition border border-yellow-200">
                <div className="font-medium text-yellow-700">Laporan Perjalanan Dinas</div>
                <p className="text-xs text-gray-500 mt-1">Buat & kelola LPD</p>
              </a>
              <a href="/profile" className="bg-purple-50 hover:bg-purple-100 rounded-lg p-4 text-center transition border border-purple-200">
                <div className="font-medium text-purple-700">Profil Saya</div>
                <p className="text-xs text-gray-500 mt-1">Kelola profil</p>
              </a>
              <button onClick={() => router.push('/api/auth/signout')} className="bg-red-50 hover:bg-red-100 rounded-lg p-4 text-center transition border border-red-200">
                <div className="font-medium text-red-700">Keluar</div>
                <p className="text-xs text-gray-500 mt-1">Akhiri session</p>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Sistem Nominatif Kegiatan v1.0 • {userInfo.fullName} • NIP: <span className="font-mono font-bold text-blue-600">{userInfo.nip}</span> • {pangkatGolonganDisplay !== '-' ? pangkatGolonganDisplay + ' • ' : ''}{userInfo.jabatan}</p>
            <p className="text-xs text-gray-400 mt-1">Hak akses: {userInfo.role} • Session: {userInfo.sessionRemaining}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;