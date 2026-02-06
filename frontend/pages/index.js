// pages/home.js
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';

const Home = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';
  
  // Ref untuk timer interval
  const sessionTimerRef = useRef(null);
  
  const [userInfo, setUserInfo] = useState({
    username: '',
    nip: '',
    role: '',
    userId: '',
    fullName: '',
    jabatan: '',
    loginTime: '',
    email: '',
    roles: [],
    department: 'Balai Besar Pengawasan Obat dan Makanan di Palangka Raya',
    nipSource: '',
    rawUsername: '',
    rawName: '',
    hasToken: false,
    tokenInfo: {},
    // Session timer fields
    sessionExpires: '',
    sessionRemaining: '', // Format: "2 jam 30 menit"
    sessionPercentage: 0, // 0-100%
    sessionTimeLeft: 0, // Dalam milidetik
    isSessionExpiring: false, // Flag jika session hampir habis
    sessionMaxHours: 8, // Default 8 jam
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Authentication effect
  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  // Function to calculate session time
  const calculateSessionTime = (expiresDate) => {
    const now = new Date();
    const expires = new Date(expiresDate);
    const totalSessionMs = 8 * 60 * 60 * 1000; // 8 jam dalam milidetik
    const timeLeftMs = expires.getTime() - now.getTime();
    
    // Jika session sudah expired
    if (timeLeftMs <= 0) {
      return {
        timeLeftMs: 0,
        formatted: 'Session expired',
        percentage: 0,
        isExpiring: true
      };
    }
    
    // Hitung waktu tersisa
    const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
    
    // Format waktu
    let formatted = '';
    if (hoursLeft > 0) {
      formatted += `${hoursLeft} jam `;
    }
    if (minutesLeft > 0) {
      formatted += `${minutesLeft} menit `;
    }
    if (hoursLeft === 0 && minutesLeft < 5) {
      formatted += `${secondsLeft} detik`;
    }
    
    // Hitung persentase
    const percentage = Math.max(0, Math.min(100, (timeLeftMs / totalSessionMs) * 100));
    
    // Flag jika sisa waktu kurang dari 30 menit
    const isExpiring = timeLeftMs < 30 * 60 * 1000;
    
    return {
      timeLeftMs,
      formatted: formatted.trim(),
      percentage,
      isExpiring,
      hoursLeft,
      minutesLeft,
      secondsLeft
    };
  };

  // Update session timer setiap detik
  useEffect(() => {
    if (session?.expires) {
      // Update pertama kali
      updateSessionTimer();
      
      // Set interval untuk update setiap detik
      sessionTimerRef.current = setInterval(updateSessionTimer, 1000);
      
      return () => {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
        }
      };
    }
  }, [session?.expires]);

  const updateSessionTimer = () => {
    if (!session?.expires) return;
    
    const sessionTime = calculateSessionTime(session.expires);
    
    setUserInfo(prev => ({
      ...prev,
      sessionTimeLeft: sessionTime.timeLeftMs,
      sessionRemaining: sessionTime.formatted,
      sessionPercentage: sessionTime.percentage,
      isSessionExpiring: sessionTime.isExpiring,
      sessionExpires: new Date(session.expires).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }));
    
    // Jika session expired, redirect ke login
    if (sessionTime.timeLeftMs <= 0) {
      console.log("⏰ Session expired, redirecting to login");
      router.push('/login');
    }
  };

  // Get user data from session
  useEffect(() => {
    if (session?.user) {
      console.log("📊 ===== DEBUG SESSION DATA =====");
      console.log("📊 Full Session Object:", session);
      console.log("📊 Session User Object:", session.user);
      console.log("📊 Session User Keys:", Object.keys(session.user));
      
      // Parse JWT token untuk mendapatkan data lengkap dari Keycloak
      let tokenPayload = {};
      if (session.accessToken) {
        try {
          const base64Payload = session.accessToken.split('.')[1];
          const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf8');
          tokenPayload = JSON.parse(decodedPayload);
          console.log("📊 Token Payload from Keycloak:", tokenPayload);
        } catch (e) {
          console.log("📊 Cannot parse token:", e.message);
        }
      }
      
      extractUserInfoFromSession(session, tokenPayload);
    }
  }, [session]);

  // Extract user information from session AND token
  const extractUserInfoFromSession = (session, tokenPayload = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = session.user;
      
      // Debug: Tampilkan semua data yang tersedia
      const debugData = {
        sessionUser: user,
        tokenPayload: tokenPayload,
        allTokenKeys: Object.keys(tokenPayload),
        preferred_username: tokenPayload.preferred_username || user.preferred_username,
        name: tokenPayload.name || user.name,
        email: tokenPayload.email || user.email,
        hasToken: !!session.accessToken,
        sessionExpires: session.expires
      };
      
      setDebugInfo(debugData);

      console.log("🔍 ===== EXTRACTING USER INFO =====");
      console.log("🔍 Session User:", user);
      console.log("🔍 Token Payload (Keycloak):", tokenPayload);
      
      // 1. Username - PRIORITAS dari token payload (Keycloak)
      const username = tokenPayload.preferred_username || 
                      user.preferred_username || 
                      user.name || 
                      user.email?.split('@')[0] || 
                      'User';
      
      console.log("🔍 Username:", username);
      
      // 2. Email
      const email = tokenPayload.email || user.email || 'No email';
      
      // 3. User ID - dari token atau session
      const userId = tokenPayload.sub || user.id || 'N/A';
      
      // 4. Full Name - PRIORITAS dari token payload (Keycloak)
      const fullName = tokenPayload.name || 
                      user.name || 
                      username;
      
      console.log("🔍 Full Name:", fullName);
      
      // 5. Role dari session (sudah di-mapping di NextAuth)
      const userRole = user.role || 'User';
      
      // 6. Extract NIP - CARI DARI TOKEN PAYLOAD (Keycloak)
      let nip = 'N/A';
      let nipSource = 'Not found';
      
      console.log("🔍 === SEARCHING FOR NIP ===");
      
      // SUMBER 1: preferred_username dari token (sering NIP)
      if (tokenPayload.preferred_username) {
        const nipRegex = /^\d+$/;
        if (nipRegex.test(tokenPayload.preferred_username)) {
          nip = tokenPayload.preferred_username;
          nipSource = 'token.preferred_username';
          console.log("✅ NIP found in token.preferred_username:", nip);
        }
      }
      
      // SUMBER 2: username dari token
      if (nip === 'N/A' && tokenPayload.username) {
        const nipRegex = /^\d+$/;
        if (nipRegex.test(tokenPayload.username)) {
          nip = tokenPayload.username;
          nipSource = 'token.username';
          console.log("✅ NIP found in token.username:", nip);
        }
      }
      
      // SUMBER 3: atribut "nip" dari token
      if (nip === 'N/A' && tokenPayload.nip) {
        nip = tokenPayload.nip;
        nipSource = 'token.nip';
        console.log("✅ NIP found in token.nip:", nip);
      }
      
      // SUMBER 4: atribut "employeeNumber" dari token
      if (nip === 'N/A' && tokenPayload.employeeNumber) {
        nip = tokenPayload.employeeNumber;
        nipSource = 'token.employeeNumber';
        console.log("✅ NIP found in token.employeeNumber:", nip);
      }
      
      // SUMBER 5: Cari di semua atribut token (Keycloak menyimpan di resource_access dll)
      if (nip === 'N/A') {
        // Keycloak sering menyimpan custom attributes di token
        const allTokenValues = Object.values(tokenPayload);
        for (const value of allTokenValues) {
          if (typeof value === 'string' && /^\d{18}$/.test(value)) {
            nip = value;
            nipSource = 'token.custom_attribute';
            console.log("✅ NIP found in custom token attribute:", nip);
            break;
          }
        }
      }
      
      // Fallback: Gunakan username sebagai NIP
      if (nip === 'N/A') {
        const numericPart = username.match(/\d+/);
        if (numericPart) {
          nip = numericPart[0];
          nipSource = 'username (fallback numeric)';
          console.log("⚠️ Using numeric part of username as NIP:", nip);
        } else {
          nip = username;
          nipSource = 'username (fallback)';
          console.log("⚠️ Using username as NIP (fallback):", nip);
        }
      }
      
      console.log("✅ FINAL NIP:", nip);
      console.log("✅ NIP Source:", nipSource);
      
      // 7. Jabatan - CARI DARI TOKEN PAYLOAD
      let jabatan = 'Pegawai';
      let jabatanSource = 'Default';
      
      console.log("🔍 === SEARCHING FOR JABATAN ===");
      
      // SUMBER 1: atribut jabatan dari token
      if (tokenPayload.jabatan) {
        jabatan = tokenPayload.jabatan;
        jabatanSource = 'token.jabatan';
        console.log("✅ Jabatan found in token.jabatan:", jabatan);
      }
      // SUMBER 2: atribut position dari token
      else if (tokenPayload.position) {
        jabatan = tokenPayload.position;
        jabatanSource = 'token.position';
        console.log("✅ Jabatan found in token.position:", jabatan);
      }
      // SUMBER 3: atribut title dari token
      else if (tokenPayload.title) {
        jabatan = tokenPayload.title;
        jabatanSource = 'token.title';
        console.log("✅ Jabatan found in token.title:", jabatan);
      }
      // SUMBER 4: dari role
      else {
        switch(userRole.toLowerCase()) {
          case 'admin':
          case 'administrator':
            jabatan = 'Administrator Sistem';
            jabatanSource = 'role-based';
            break;
          case 'ppk':
            jabatan = 'Pejabat Pembuat Komitmen';
            jabatanSource = 'role-based';
            break;
          case 'kabalai':
            jabatan = 'Kepala Balai';
            jabatanSource = 'role-based';
            break;
          case 'bendahara':
            jabatan = 'Bendahara';
            jabatanSource = 'role-based';
            break;
          default:
            jabatan = 'Pegawai';
            jabatanSource = 'default';
        }
        console.log("✅ Jabatan from role:", jabatan);
      }
      
      console.log("✅ FINAL JABATAN:", jabatan);
      console.log("✅ Jabatan Source:", jabatanSource);
      
      // 8. Login time
      const loginTime = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // 9. Roles dari Keycloak (jika ada di token)
      const realmRoles = tokenPayload.realm_access?.roles || [];
      const resourceRoles = [];
      
      if (tokenPayload.resource_access) {
        Object.values(tokenPayload.resource_access).forEach(client => {
          if (client?.roles) {
            resourceRoles.push(...client.roles);
          }
        });
      }
      
      const allRoles = [...realmRoles, ...resourceRoles];
      
      // 10. Session timer info
      let sessionExpires = '';
      let sessionRemaining = 'Menghitung...';
      let sessionPercentage = 100;
      let sessionTimeLeft = 8 * 60 * 60 * 1000; // 8 jam default
      let isSessionExpiring = false;
      
      if (session.expires) {
        const sessionTime = calculateSessionTime(session.expires);
        sessionExpires = new Date(session.expires).toLocaleString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        sessionRemaining = sessionTime.formatted;
        sessionPercentage = sessionTime.percentage;
        sessionTimeLeft = sessionTime.timeLeftMs;
        isSessionExpiring = sessionTime.isExpiring;
      }
      
      // Data akhir
      const userInfoData = {
        username,
        email,
        role: userRole,
        userId,
        fullName,
        jabatan,
        nip,
        loginTime,
        roles: allRoles,
        department: 'Balai Besar Pengawasan Obat dan Makanan di Palangka Raya',
        nipSource,
        jabatanSource,
        rawUsername: username,
        rawName: fullName,
        hasToken: !!session.accessToken,
        tokenInfo: {
          hasPayload: !!tokenPayload,
          payloadKeys: Object.keys(tokenPayload)
        },
        // Session timer data
        sessionExpires,
        sessionRemaining,
        sessionPercentage,
        sessionTimeLeft,
        isSessionExpiring,
        sessionMaxHours: 8
      };
      
      setUserInfo(userInfoData);
      
      console.log("✅ ===== EXTRACTED USER INFO =====");
      console.log("✅ Username:", username);
      console.log("✅ Full Name:", fullName);
      console.log("✅ NIP:", nip);
      console.log("✅ NIP Source:", nipSource);
      console.log("✅ Jabatan:", jabatan);
      console.log("✅ Jabatan Source:", jabatanSource);
      console.log("✅ Email:", email);
      console.log("✅ User ID:", userId);
      console.log("✅ Role:", userRole);
      console.log("✅ Total Roles:", allRoles.length);
      console.log("✅ Session Expires:", sessionExpires);
      console.log("✅ Session Remaining:", sessionRemaining);
      console.log("✅ Session Percentage:", sessionPercentage.toFixed(1) + '%');
      console.log("✅ ===============================");
      
    } catch (error) {
      console.error('❌ Error extracting user info:', error);
      setError('Gagal mengambil informasi pengguna: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Get role badge color
  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pejabat pembuat komitmen (ppk)':
      case 'ppk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'kepala balai':
      case 'kabalai':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'bendahara':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get session progress bar color
  const getSessionProgressColor = (percentage, isExpiring) => {
    if (isExpiring) return 'bg-red-500';
    if (percentage < 30) return 'bg-yellow-500';
    if (percentage < 60) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Refresh session manually
  const handleRefreshSession = async () => {
    try {
      console.log("🔄 Refreshing session...");
      // You can implement session refresh logic here
      // For now, just reload the page
      window.location.reload();
    } catch (error) {
      console.error("❌ Error refreshing session:", error);
    }
  };

  // Format waktu untuk progress bar tooltip
  const formatSessionTooltip = () => {
    if (!userInfo.sessionRemaining) return 'Session aktif';
    
    return `Sisa waktu: ${userInfo.sessionRemaining}\nBerakhir: ${userInfo.sessionExpires}`;
  };

  // Loading state
  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-6 text-gray-600 font-medium">Memuat Informasi Pengguna...</p>
            <p className="text-sm text-gray-500 mt-2">Menyiapkan sesi Anda</p>
            <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Sistem Nominatif</h1>
                <p className="text-gray-600 mt-2">Sistem Pengelolaan Kegiatan dan Perjalanan Dinas</p>
              </div>
              
              <div className="mt-4 lg:mt-0 flex flex-wrap items-center gap-4">
                {/* Session Timer Display */}
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  userInfo.isSessionExpiring 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex-shrink-0">
                    <svg className={`w-5 h-5 ${userInfo.isSessionExpiring ? 'text-red-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {userInfo.isSessionExpiring ? '⏰ ' : ''}
                      {userInfo.sessionRemaining || 'Session aktif'}
                    </div>
                    {userInfo.isSessionExpiring && (
                      <div className="text-xs text-red-600">Session hampir habis!</div>
                    )}
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userInfo.role)}`}>
                  {userInfo.role}
                </div>
              </div>
            </div>
            
            {/* Session Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Status Session</span>
                <span className="text-sm font-medium text-gray-700">
                  {userInfo.sessionPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-1000 ${
                    getSessionProgressColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)
                  }`}
                  style={{ width: `${userInfo.sessionPercentage}%` }}
                  title={formatSessionTooltip()}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Login: {userInfo.loginTime}</span>
                <span>Expires: {userInfo.sessionExpires}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-8 md:px-8 md:py-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang, {userInfo.fullName}!</h2>
                  <p className="text-blue-100 max-w-2xl">
                    Anda telah berhasil login ke Sistem Nominatif Kegiatan dan Perjalanan Dinas.
                    Sistem ini membantu Anda dalam mengelola pengajuan, persetujuan, dan pelaporan kegiatan.
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                    <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white font-medium">
                      {userInfo.sessionRemaining || 'Session aktif'}
                    </span>
                  </div>
                  {userInfo.isSessionExpiring && (
                    <button
                      onClick={handleRefreshSession}
                      className="inline-flex items-center px-3 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Session
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Personal Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
                <div className="flex items-center space-x-2">
                  {/* Session Indicator */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    userInfo.isSessionExpiring 
                      ? 'bg-red-100 text-red-800 animate-pulse' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {userInfo.isSessionExpiring ? '⏰ Hampir Habis' : 'Aktif'}
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Profil Header */}
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                    {userInfo.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{userInfo.fullName}</h4>
                    <p className="text-sm text-gray-600">{userInfo.email}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userInfo.role)}`}>
                        {userInfo.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        • Session: {Math.floor(userInfo.sessionPercentage)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Session Info Mini */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-700">Waktu Session</span>
                    </div>
                    <div className={`text-sm font-medium ${
                      userInfo.isSessionExpiring ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {userInfo.sessionRemaining}
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        getSessionProgressColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)
                      }`}
                      style={{ width: `${userInfo.sessionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex justify-between">
                    <span>Login: {userInfo.loginTime}</span>
                    <span>Expires: {userInfo.sessionExpires}</span>
                  </div>
                </div>
                
                {/* NIP Section */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700">Nomor Induk Pegawai (NIP)</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 tracking-wider font-mono">
                    {userInfo.nip}
                  </div>
                  <div className="text-xs text-blue-600 mt-1 flex justify-between items-center">
                    <span>Identitas resmi sebagai Pegawai Negeri Sipil</span>
                    {userInfo.nipSource && userInfo.nipSource !== 'Not found' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {userInfo.nipSource}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Jabatan Section */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-green-700">Jabatan</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {userInfo.jabatan}
                  </div>
                  <div className="text-xs text-green-600 mt-1 flex justify-between items-center">
                    <span>Posisi dan tanggung jawab dalam organisasi</span>
                    {userInfo.jabatanSource && userInfo.jabatanSource !== 'Default' && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {userInfo.jabatanSource}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Detail Informasi */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h5 className="text-md font-medium text-gray-900">Detail Informasi</h5>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Username</span>
                      <span className="text-sm text-gray-900 font-mono">{userInfo.username}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">User ID</span>
                      <span className="text-sm text-gray-900 font-mono text-xs">{userInfo.userId}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Unit Kerja</span>
                      <span className="text-sm text-gray-900 text-right">{userInfo.department}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Login Time</span>
                      <span className="text-sm text-gray-900">{userInfo.loginTime}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Session Status</span>
                      <div className="text-right">
                        <div className={`text-sm ${
                          userInfo.isSessionExpiring ? 'text-red-600 font-medium' : 'text-green-600'
                        }`}>
                          {userInfo.sessionRemaining}
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.floor(userInfo.sessionPercentage)}% remaining
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Informasi Sistem</h3>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Session Timer Detailed */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Timer Session
                  </h4>
                  
                  <div className="text-center mb-4">
                    <div className={`text-3xl font-bold mb-2 ${
                      userInfo.isSessionExpiring ? 'text-red-600 animate-pulse' : 'text-purple-600'
                    }`}>
                      {userInfo.sessionRemaining}
                    </div>
                    <div className="text-sm text-gray-600">
                      Session akan berakhir dalam
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                      className={`h-4 rounded-full transition-all duration-1000 ${
                        getSessionProgressColor(userInfo.sessionPercentage, userInfo.isSessionExpiring)
                      }`}
                      style={{ width: `${userInfo.sessionPercentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-700">Mulai</div>
                      <div className="text-gray-600">{userInfo.loginTime.split(',')[0]}</div>
                      <div className="text-xs text-gray-500">{userInfo.loginTime.split(',')[1]}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-700">Berakhir</div>
                      <div className="text-gray-600">{userInfo.sessionExpires.split(',')[0]}</div>
                      <div className="text-xs text-gray-500">{userInfo.sessionExpires.split(',')[1]}</div>
                    </div>
                  </div>
                  
                  {userInfo.isSessionExpiring && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-red-800 font-medium">Session hampir habis!</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        Segera simpan pekerjaan Anda. Session akan berakhir otomatis.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Authentication Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informasi Autentikasi</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-600">Metode Login</span>
                        <p className="text-sm font-medium">Keycloak SSO</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Token Status</span>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            userInfo.hasToken ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium">
                            {userInfo.hasToken ? 'Valid' : 'Invalid'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">User ID</span>
                        <p className="text-sm font-mono truncate">{userInfo.userId}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Session Status</span>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            userInfo.isSessionExpiring ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          <span className={`text-sm font-medium ${
                            userInfo.isSessionExpiring ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {userInfo.isSessionExpiring ? 'Hampir Habis' : 'Aktif'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hak Akses Section */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-3">Hak Akses Berdasarkan Peran</h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRoleColor(userInfo.role)}`}>
                          <span className="text-xs font-bold">{userInfo.role.charAt(0)}</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-sm font-medium text-gray-900">{userInfo.role}</h5>
                        <p className="text-xs text-gray-600 mt-1">
                          {userInfo.role.toLowerCase().includes('admin') ? 'Akses penuh ke semua modul sistem' :
                           userInfo.role.toLowerCase().includes('ppk') ? 'Dapat menyetujui pengajuan dan membuat surat tugas' :
                           userInfo.role.toLowerCase().includes('kabalai') ? 'Dapat memonitor semua kegiatan dan anggaran' :
                           'Dapat membuat dan melihat pengajuan kegiatan sendiri'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleRefreshSession}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Session
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log("🔍 User Info:", userInfo);
                        console.log("🔍 Session:", session);
                        console.log("🔍 Debug Info:", debugInfo);
                        alert("Data debug telah dicetak ke console.");
                      }}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Debug Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a 
                href="/nominatif" 
                className="group bg-blue-50 hover:bg-blue-100 rounded-lg p-4 transition-colors border border-blue-200"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="text-blue-600 font-medium group-hover:text-blue-800">Buat Nominatif</div>
                <p className="text-sm text-gray-600 mt-1">Buat pengajuan kegiatan baru</p>
              </a>
              
              <a 
                href="/nominatif/list" 
                className="group bg-green-50 hover:bg-green-100 rounded-lg p-4 transition-colors border border-green-200"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="text-green-600 font-medium group-hover:text-green-800">Daftar Kegiatan</div>
                <p className="text-sm text-gray-600 mt-1">Lihat semua kegiatan</p>
              </a>
              
              <a 
                href="/profile" 
                className="group bg-purple-50 hover:bg-purple-100 rounded-lg p-4 transition-colors border border-purple-200"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-purple-600 font-medium group-hover:text-purple-800">Profil Saya</div>
                <p className="text-sm text-gray-600 mt-1">Kelola informasi pribadi</p>
              </a>
              
              <button 
                onClick={() => router.push('/api/auth/signout')}
                className="group bg-red-50 hover:bg-red-100 rounded-lg p-4 transition-colors border border-red-200 text-left"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                </div>
                <div className="text-red-600 font-medium group-hover:text-red-800">Keluar</div>
                <p className="text-sm text-gray-600 mt-1">Akhiri sesi login</p>
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Sistem Nominatif Kegiatan v1.0 • {userInfo.fullName} • NIP: {userInfo.nip} • {userInfo.jabatan}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Hak akses: {userInfo.role} • Session: {userInfo.sessionRemaining} • Login: {userInfo.loginTime}
            </p>
            {userInfo.isSessionExpiring && (
              <div className="mt-2 inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs animate-pulse">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Session akan berakhir dalam {userInfo.sessionRemaining}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;