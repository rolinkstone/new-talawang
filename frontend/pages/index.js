// pages/home.js
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

const Home = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';
  
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
    department: '',
    nipSource: '',
    rawUsername: '',
    rawPreferredUsername: '',
    rawName: '',
    hasAttributes: false,
    attributeKeys: []
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

  // Get user data from session
  useEffect(() => {
    if (session?.user) {
      console.log("📊 ===== DEBUG SESSION DATA =====");
      console.log("📊 Full Session Object:", session);
      console.log("📊 Session User Object:", session.user);
      console.log("📊 Session User Keys:", Object.keys(session.user));
      
      if (session.user.attributes) {
        console.log("📊 User Attributes Keys:", Object.keys(session.user.attributes));
        console.log("📊 User Attributes Full:", session.user.attributes);
      }
      
      // Log token untuk debugging
      if (session.accessToken) {
        try {
          const payload = JSON.parse(atob(session.accessToken.split('.')[1]));
          console.log("📊 Token Payload:", payload);
        } catch (e) {
          console.log("📊 Cannot parse token");
        }
      }
      
      extractUserInfoFromSession(session);
    }
  }, [session]);

  // Extract user information from session
  const extractUserInfoFromSession = (session) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = session.user;
      
      // Debug: Tampilkan semua field yang tersedia
      const debugData = {
        allUserKeys: Object.keys(user),
        userObject: user,
        rawAttributes: user.attributes,
        preferred_username: user.preferred_username,
        name: user.name,
        email: user.email,
        hasToken: !!session.accessToken
      };
      
      setDebugInfo(debugData);

      console.log("🔍 ===== EXTRACTING FROM KEYCLOAK =====");
      console.log("🔍 User object:", user);
      console.log("🔍 User attributes:", user.attributes);
      
      // 1. Username - ambil dari preferred_username (ini adalah NIP di screenshot)
      const username = user.preferred_username || 
                      user.username || 
                      user.email?.split('@')[0] || 
                      'User';
      
      console.log("🔍 Username (from preferred_username):", username);
      
      // 2. Email
      const email = user.email || 'No email';
      
      // 3. User ID
      const userId = user.id || user.sub || 'N/A';
      
      // 4. Full Name - gabungkan first name dan last name jika ada
      let fullName = user.name || 'User';
      
      // Coba dapatkan dari atribut jika name tidak lengkap
      if (user.attributes) {
        if (user.attributes.givenName || user.attributes.familyName) {
          const givenName = Array.isArray(user.attributes.givenName) 
            ? user.attributes.givenName[0] 
            : user.attributes.givenName;
          const familyName = Array.isArray(user.attributes.familyName) 
            ? user.attributes.familyName[0] 
            : user.attributes.familyName;
          
          if (givenName && familyName) {
            fullName = `${givenName} ${familyName}`;
          } else if (givenName) {
            fullName = givenName;
          }
        }
        
        // Coba dari atribut lain
        if (user.attributes.name && !fullName.includes(user.attributes.name)) {
          const nameAttr = Array.isArray(user.attributes.name) 
            ? user.attributes.name[0] 
            : user.attributes.name;
          if (nameAttr && nameAttr !== fullName) {
            fullName = nameAttr;
          }
        }
      }
      
      console.log("🔍 Full Name:", fullName);
      
      // 5. Roles from session
      const userRoles = user.roles || [];
      
      // 6. Determine role based on roles
      let role = 'User';
      
      if (userRoles.includes('admin') || userRoles.includes('administrator')) {
        role = 'Administrator';
      } else if (userRoles.includes('ppk')) {
        role = 'Pejabat Pembuat Komitmen (PPK)';
      } else if (userRoles.includes('kabalai')) {
        role = 'Kepala Balai';
      } else if (userRoles.includes('bendahara')) {
        role = 'Bendahara';
      } else if (userRoles.includes('supervisor')) {
        role = 'Supervisor';
      } else if (userRoles.includes('user')) {
        role = 'Pegawai';
      } else if (userRoles.length > 0) {
        role = userRoles[0];
      }
      
      // 7. Extract NIP - CARI DARI BERBAGAI SUMBER (PRIORITAS)
      let nip = 'N/A';
      let nipSource = 'Not found';
      
      console.log("🔍 === SEARCHING FOR NIP ===");
      
      // SUMBER 1: preferred_username (dari screenshot, ini adalah NIP)
      if (user.preferred_username) {
        // Cek apakah numeric NIP (18 digit biasanya)
        const nipRegex = /^\d{18}$/;
        if (nipRegex.test(user.preferred_username)) {
          nip = user.preferred_username;
          nipSource = 'preferred_username (18-digit NIP)';
          console.log("✅ NIP found in preferred_username (18-digit):", nip);
        } else {
          // Coba numeric apa saja
          const anyNumericRegex = /^\d+$/;
          if (anyNumericRegex.test(user.preferred_username)) {
            nip = user.preferred_username;
            nipSource = 'preferred_username (numeric)';
            console.log("✅ NIP found in preferred_username (numeric):", nip);
          } else {
            nip = user.preferred_username;
            nipSource = 'preferred_username (non-numeric)';
            console.log("⚠️ Using preferred_username as NIP (non-numeric):", nip);
          }
        }
      }
      // SUMBER 2: username
      else if (user.username) {
        const anyNumericRegex = /^\d+$/;
        if (anyNumericRegex.test(user.username)) {
          nip = user.username;
          nipSource = 'username (numeric)';
          console.log("✅ NIP found in username:", nip);
        } else {
          nip = user.username;
          nipSource = 'username (non-numeric)';
          console.log("⚠️ Using username as NIP (non-numeric):", nip);
        }
      }
      // SUMBER 3: atribut NIP (langsung)
      else if (user.attributes?.nip) {
        nip = Array.isArray(user.attributes.nip) ? user.attributes.nip[0] : user.attributes.nip;
        nipSource = 'user.attributes.nip';
        console.log("✅ NIP found in user.attributes.nip:", nip);
      }
      // SUMBER 4: atribut employeeNumber
      else if (user.attributes?.employeeNumber) {
        nip = Array.isArray(user.attributes.employeeNumber) 
          ? user.attributes.employeeNumber[0] 
          : user.attributes.employeeNumber;
        nipSource = 'user.attributes.employeeNumber';
        console.log("✅ NIP found in employeeNumber:", nip);
      }
      // SUMBER 5: atribut custom
      else if (user.attributes) {
        // Cari semua atribut yang mungkin mengandung NIP
        const nipKeys = Object.keys(user.attributes).filter(key => 
          key.toLowerCase().includes('nip') || 
          key.toLowerCase() === 'nip'
        );
        
        if (nipKeys.length > 0) {
          const firstKey = nipKeys[0];
          nip = Array.isArray(user.attributes[firstKey]) 
            ? user.attributes[firstKey][0] 
            : user.attributes[firstKey];
          nipSource = `user.attributes.${firstKey}`;
          console.log("✅ NIP found in custom attribute:", nip, "key:", firstKey);
        }
      }
      
      // Jika masih N/A, coba ambil dari username/pengguna (non-numeric)
      if (nip === 'N/A' && user.preferred_username) {
        nip = user.preferred_username;
        nipSource = 'preferred_username (fallback)';
        console.log("⚠️ Using preferred_username as NIP (fallback):", nip);
      }
      
      console.log("✅ FINAL NIP:", nip);
      console.log("✅ NIP Source:", nipSource);
      
      // 8. Jabatan dari atribut Keycloak (SAMA SEPERTI NIP PENCARIAN)
      let jabatan = 'Pegawai';
      let jabatanSource = 'Default';
      
      console.log("🔍 === SEARCHING FOR JABATAN ===");
      
      // SUMBER 1: atribut jabatan (langsung)
      if (user.attributes?.jabatan) {
        jabatan = Array.isArray(user.attributes.jabatan) 
          ? user.attributes.jabatan[0] 
          : user.attributes.jabatan;
        jabatanSource = 'user.attributes.jabatan';
        console.log("✅ Jabatan found in user.attributes.jabatan:", jabatan);
      }
      // SUMBER 2: atribut position
      else if (user.attributes?.position) {
        jabatan = Array.isArray(user.attributes.position) 
          ? user.attributes.position[0] 
          : user.attributes.position;
        jabatanSource = 'user.attributes.position';
        console.log("✅ Jabatan found in position:", jabatan);
      }
      // SUMBER 3: atribut title
      else if (user.attributes?.title) {
        jabatan = Array.isArray(user.attributes.title) 
          ? user.attributes.title[0] 
          : user.attributes.title;
        jabatanSource = 'user.attributes.title';
        console.log("✅ Jabatan found in title:", jabatan);
      }
      // SUMBER 4: atribut custom lainnya
      else if (user.attributes) {
        // Cari semua atribut yang mungkin mengandung jabatan
        const jabatanKeys = Object.keys(user.attributes).filter(key => 
          key.toLowerCase().includes('jabatan') || 
          key.toLowerCase().includes('posisi') ||
          key.toLowerCase().includes('position') ||
          key.toLowerCase().includes('title') ||
          key.toLowerCase().includes('job')
        );
        
        if (jabatanKeys.length > 0) {
          const firstKey = jabatanKeys[0];
          jabatan = Array.isArray(user.attributes[firstKey]) 
            ? user.attributes[firstKey][0] 
            : user.attributes[firstKey];
          jabatanSource = `user.attributes.${firstKey}`;
          console.log("✅ Jabatan found in custom attribute:", jabatan, "key:", firstKey);
        }
      }
      
      console.log("✅ FINAL JABATAN:", jabatan);
      console.log("✅ Jabatan Source:", jabatanSource);
      
      // 9. Login time
      const loginTime = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // 10. Department/Unit Kerja
      let department = 'Balai Besar Pengawasan Obat dan Makanan di Palangka Raya';
      
      if (user.attributes?.department) {
        department = Array.isArray(user.attributes.department) 
          ? user.attributes.department[0] 
          : user.attributes.department;
      } else if (user.attributes?.organization) {
        department = Array.isArray(user.attributes.organization) 
          ? user.attributes.organization[0] 
          : user.attributes.organization;
      } else if (user.attributes?.company) {
        department = Array.isArray(user.attributes.company) 
          ? user.attributes.company[0] 
          : user.attributes.company;
      }
      
      // Data akhir
      const userInfoData = {
        username,
        email,
        role,
        userId,
        fullName,
        jabatan,
        nip,
        loginTime,
        roles: userRoles,
        department,
        nipSource,
        jabatanSource,
        rawUsername: user.username,
        rawPreferredUsername: user.preferred_username,
        rawName: user.name,
        hasAttributes: !!user.attributes,
        attributeKeys: user.attributes ? Object.keys(user.attributes) : []
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
      console.log("✅ Role:", role);
      console.log("✅ Roles:", userRoles);
      console.log("✅ Department:", department);
      console.log("✅ Login Time:", loginTime);
      console.log("✅ ===============================");
      
    } catch (error) {
      console.error('❌ Error extracting user info:', error);
      console.error('❌ Error stack:', error.stack);
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'kepala balai':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'bendahara':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'supervisor':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Loading state
  if (loading || isLoading) {
    return (
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
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => extractUserInfoFromSession(session)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
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
                <div className="text-sm text-gray-500">
                  Login: {userInfo.loginTime}
                </div>
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
                <div className="mt-4 md:mt-0">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                    <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white font-medium">Sesi Aktif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DEBUG PANEL */}
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Debug Information - Keycloak Data
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg border border-yellow-100">
                <h4 className="font-medium text-gray-900 mb-2">Data dari Keycloak</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Username:</span>
                    <span className="font-mono">{userInfo.rawUsername || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preferred Username:</span>
                    <span className="font-mono font-bold">{userInfo.rawPreferredUsername || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama di Token:</span>
                    <span className="font-medium">{userInfo.rawName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{userInfo.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-xs">{userInfo.userId}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-yellow-100">
                <h4 className="font-medium text-gray-900 mb-2">Informasi Pegawai</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama Lengkap:</span>
                    <span className="font-medium">{userInfo.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NIP:</span>
                    <span className="font-mono font-bold text-blue-700 text-lg">{userInfo.nip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NIP Source:</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {userInfo.nipSource || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jabatan:</span>
                    <span className="font-medium">{userInfo.jabatan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jabatan Source:</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {userInfo.jabatanSource || 'Default'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-yellow-100">
                <h4 className="font-medium text-gray-900 mb-2">Role & System Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(userInfo.role)}`}>
                      {userInfo.role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Kerja:</span>
                    <span className="font-medium text-right">{userInfo.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jumlah Roles:</span>
                    <span className="font-medium">{userInfo.roles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Has Attributes:</span>
                    <span className={`px-2 py-1 rounded ${userInfo.hasAttributes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {userInfo.hasAttributes ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Button untuk melihat data mentah */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log("🔍 Debug Info:", debugInfo);
                  console.log("🔍 User Info:", userInfo);
                  console.log("🔍 Session:", session);
                  alert("Data debug telah dicetak ke console. Buka Developer Tools (F12) untuk melihat.");
                }}
                className="text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Lihat Data Mentah di Console
              </button>
              
              <button
                onClick={() => extractUserInfoFromSession(session)}
                className="text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1 rounded flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>

          {/* User Info Cards - Hanya 2 card sekarang */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Personal Information Card - DIKEMBANGKAN */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
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
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userInfo.role)}`}>
                        {userInfo.role}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* NIP Section - HIGHLIGHT */}
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
                    {userInfo.nipSource && userInfo.nipSource !== 'Unknown' && (
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
                      <span className="text-sm font-medium text-gray-500">Total Roles</span>
                      <span className="text-sm text-gray-900">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                          {userInfo.roles.length} roles
                        </span>
                      </span>
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
                {/* Roles Section */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Daftar Peran yang Dimiliki</h4>
                  <div className="flex flex-wrap gap-2">
                    {userInfo.roles.length > 0 ? (
                      userInfo.roles.map((role, index) => (
                        <span 
                          key={index} 
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Tidak ada peran spesifik</span>
                    )}
                  </div>
                </div>
                
                {/* Hak Akses Section */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-3">Hak Akses yang Dimiliki</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {userInfo.role.toLowerCase().includes('admin') || userInfo.role.toLowerCase().includes('administrator') ? (
                      <>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Akses penuh ke semua modul
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Kelola pengguna dan peran
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Konfigurasi sistem
                        </li>
                      </>
                    ) : userInfo.role.toLowerCase().includes('ppk') ? (
                      <>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Menyetujui pengajuan kegiatan
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Monitoring anggaran
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Membuat Surat Tugas
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Membuat pengajuan kegiatan
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Melihat kegiatan sendiri
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                          </svg>
                          Akses terbatas berdasarkan peran
                        </li>
                      </>
                    )}
                  </ul>
                </div>
                
                {/* Session Info */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-3">Status Sesi</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-600">Waktu Login</span>
                      </div>
                      <p className="text-sm text-gray-900">{userInfo.loginTime}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-600">Status</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm text-gray-900">Aktif</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
                        </svg>
                        <span className="text-xs font-medium text-gray-600">Autentikasi</span>
                      </div>
                      <p className="text-sm text-gray-900">Keycloak SSO</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-600">Total Peran</span>
                      </div>
                      <p className="text-sm text-gray-900">{userInfo.roles.length}</p>
                    </div>
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
                onClick={() => router.push('/logout')}
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
              Hak akses: {userInfo.role} • Login: {userInfo.loginTime}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;