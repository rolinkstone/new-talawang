// components/DashboardLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  FaHome, FaCog, FaSignOutAlt, FaBell, FaClipboardList,
  FaTimesCircle, FaReceipt, FaFileAlt, FaChartBar, FaBook
} from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import { useNotifications } from '../hooks/useNotifications';
import ThemeToggle from './ThemeToggle';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loading = status === 'loading';
  
  // Ambil notifikasi
  const { notifications, loading: notifLoading, error: notifError, refresh: refreshNotif } = useNotifications();

  // ============ EVENT LISTENER UNTUK REFRESH NOTIFIKASI ============
  useEffect(() => {
    const handleRefreshNotifications = () => {
      console.log('🔔🔔🔔 Received refresh-notifications event, refreshing dashboard notifications... 🔔🔔🔔');
      if (refreshNotif) {
        refreshNotif();
      }
    };
    
    window.addEventListener('refresh-notifications', handleRefreshNotifications);
    window.refreshNotifications = refreshNotif;
    
    console.log('✅ DashboardLayout: Event listener untuk refresh-notifications telah terdaftar');
    
    return () => {
      window.removeEventListener('refresh-notifications', handleRefreshNotifications);
      delete window.refreshNotifications;
      console.log('🧹 DashboardLayout: Event listener dibersihkan');
    };
  }, [refreshNotif]);

  // Debug log untuk mengecek notifikasi
  useEffect(() => {
    if (notifications) {
      console.log('📊 Dashboard notifikasi state:', {
        lpd: notifications.lpd,
        kwitansi: notifications.kwitansi,
        total: notifications.total,
        loading: notifLoading,
        error: notifError
      });
    }
  }, [notifications, notifLoading, notifError]);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  // ============ FUNGSI CEK ROLE USER ============
  const hasPPKRole = () => {
    if (!session?.user) return false;
    if (session.user.roles) {
      const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
      if (roles.some(r => r.toLowerCase().includes('ppk'))) return true;
    }
    if (session.user.role && session.user.role.toLowerCase().includes('ppk')) return true;
    return false;
  };

  const hasBendaharaRole = () => {
    if (!session?.user) return false;
    if (session.user.roles) {
      const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
      if (roles.some(r => r.toLowerCase().includes('bendahara'))) return true;
    }
    if (session.user.role && session.user.role.toLowerCase().includes('bendahara')) return true;
    return false;
  };

  const hasAdminRole = () => {
    if (!session?.user) return false;
    if (session.user.roles) {
      const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
      if (roles.some(r => r.toLowerCase().includes('admin'))) return true;
    }
    if (session.user.role && session.user.role.toLowerCase().includes('admin')) return true;
    return false;
  };

  const hasKabagTuRole = () => {
    if (!session?.user) return false;
    if (session.user.roles) {
      const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
      if (roles.some(r => r.toLowerCase().includes('kabag_tu'))) return true;
    }
    if (session.user.role && session.user.role.toLowerCase().includes('kabag_tu')) return true;
    return false;
  };

  const hasKepalaBalaiRole = () => {
    if (!session?.user) return false;
    if (session.user.roles) {
      const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.roles];
      if (roles.some(r => r.toLowerCase().includes('kabalai') || r.toLowerCase().includes('kepala balai'))) return true;
    }
    const roleLower = session.user.role?.toLowerCase() || '';
    if (roleLower.includes('kabalai') || roleLower.includes('kepala balai')) return true;
    return false;
  };

  // Debug role session
  useEffect(() => {
    if (session?.user) {
      console.log('🔍 DEBUG Session User:', {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        roles: session.user.roles,
        hasPPK: hasPPKRole(),
        hasBendahara: hasBendaharaRole(),
        hasAdmin: hasAdminRole(),
        hasKabagTu: hasKabagTuRole(),
        hasKepalaBalai: hasKepalaBalaiRole()
      });
    }
  }, [session]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Hancurkan semua token di localStorage/sessionStorage
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('access_token');

      // 2. Hancurkan cache user
      try {
        if (window.clearUserCache) window.clearUserCache();
      } catch (_) {}

      // 3. SignOut NextAuth — ini trigger events.signOut di server untuk hancurkan SSO
      await signOut({ callbackUrl: '/login', redirect: false });
      
      // 4. Redirect manual ke Keycloak logout untuk hancurkan SSO session
      const idToken = session?.idToken;
      const origin = window.location.origin;
      const keycloakIssuer = 'https://auth.bbpompky.id/realms/master';
      const clientId = session?.clientId || 'nextjs-local';
      
      if (idToken) {
        const keycloakLogoutUrl = `${keycloakIssuer}/protocol/openid-connect/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${origin}/login&client_id=${clientId}`;
        window.location.href = keycloakLogoutUrl;
      } else {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const getUserName = () => {
    return session?.user?.name || 
           session?.user?.preferred_username || 
           session?.user?.email?.split('@')[0] || 
           'User';
  };

  const getUserEmail = () => {
    return session?.user?.email || 'user@example.com';
  };

  const getInitials = () => {
    const name = getUserName();
    return name.charAt(0).toUpperCase();
  };

  const getUserRoleDisplay = () => {
        if (session?.user?.roles && Array.isArray(session.user.roles) && session.user.roles.length > 0) {
            return session.user.roles.join(', ');
        }
        if (session?.user?.role) return session.user.role;
  };

  // ============ MENU DENGAN NOTIFIKASI ============
  // Cek apakah user bisa mengakses laporan (Admin, Kabag TU, atau Kepala Balai)
  const canAccessLaporan = hasAdminRole() || hasKabagTuRole() || hasKepalaBalaiRole();

  const menuGroups = [
    {
      title: 'Home',
      items: [
        { href: '/', label: 'Beranda', icon: <FaHome /> }
      ]
    },
    {
      title: 'Transaksi',
      items: [
        { href: '/kegiatan', label: 'Nominatif', icon: <FaClipboardList /> },
        { 
          href: '/lpd', 
          label: 'Laporan Perjadin', 
          icon: <FaFileAlt />,
          description: 'Laporan Perjalanan Dinas (LPD)',
          badge: notifications.lpd > 0 ? notifications.lpd : null,
          badgeColor: 'bg-orange-500'
        },
        { 
          href: '/kwitansi', 
          label: 'Kuitansi Perjadin', 
          icon: <FaReceipt />,
          description: 'Input kuitansi perjalanan dinas',
          badge: notifications.kwitansi > 0 ? notifications.kwitansi : null,
          badgeColor: 'bg-red-500'
        },
        ...(hasPPKRole() || hasAdminRole() ? [
          { 
            href: '/search', 
            label: 'Batalkan Nominatif', 
            icon: <FaTimesCircle />,
            description: 'Membatalkan kegiatan (PPK & Admin)',
            badge: hasAdminRole() ? 'Admin' : 'PPK',
            badgeColor: hasAdminRole() ? 'bg-red-500' : 'bg-yellow-500'
          }
        ] : [])
      ]
    },
    // MENU LAPORAN - untuk Admin, Kabag TU, dan Kepala Balai (Rekap Perjadin)
    ...(canAccessLaporan ? [{
      title: 'Laporan',
      items: [
        { 
          href: '/laporan', 
          label: 'Rekap Perjadin Pegawai', 
          icon: <FaChartBar />,
          description: 'Laporan rekap perjalanan dinas seluruh pegawai',
          badge: hasAdminRole() ? 'Admin' : 
                 hasKabagTuRole() ? 'Kabag TU' : 
                 hasKepalaBalaiRole() ? 'Ka. Balai' : null,
          badgeColor: hasAdminRole() ? 'bg-red-500' : 
                      hasKabagTuRole() ? 'bg-blue-500' : 
                      'bg-purple-500'
        }
      ]
    }] : []),
    // MENU MONEW - untuk Admin, Kabag TU, Kabalai, dan PPK
    ...(hasAdminRole() || hasKabagTuRole() || hasKepalaBalaiRole() || hasPPKRole() ? [{
      title: 'Monev',
      items: [
        { 
          href: '/monev', 
          label: 'Monev Perjadin', 
          icon: <FaChartBar />,
          description: 'Monitoring & Evaluasi perjalanan dinas per pegawai',
          badge: hasAdminRole() ? 'Admin' : 
                 hasKabagTuRole() ? 'Kabag TU' : 
                 hasPPKRole() ? 'PPK' :
                 hasKepalaBalaiRole() ? 'Ka. Balai' : null,
          badgeColor: hasAdminRole() ? 'bg-red-500' : 
                      hasKabagTuRole() ? 'bg-blue-500' : 
                      hasPPKRole() ? 'bg-yellow-500' :
                      'bg-purple-500'
        }
      ]
    }] : []),
    {
      title: 'Anggaran',
      items: [
        { 
          href: '/pagu', 
          label: 'Pagu & Realisasi', 
          icon: <FaBook />,
          description: 'Kelola pagu dan realisasi anggaran per MAK'
        }
      ]
    },
    {
      title: 'Pengaturan',
      items: [
        { href: '/profile', label: 'Profile', icon: <FaCog /> },
        { href: '/setting', label: 'Settings', icon: <FaCog /> }
      ]
    }
  ];

  // Role badge untuk user info
  const getUserRoleBadgeClass = () => {
    if (hasAdminRole()) return 'bg-red-50 text-red-700 border border-red-200';
    if (hasPPKRole()) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (hasBendaharaRole()) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (hasKabagTuRole()) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (hasKepalaBalaiRole()) return 'bg-purple-50 text-purple-700 border border-purple-200';
    return 'bg-gray-50 text-gray-600 border border-gray-200';
  };

  const getUserRoleBadgeText = () => {
    if (hasAdminRole()) return 'Admin';
    if (hasPPKRole()) return 'PPK';
    if (hasBendaharaRole()) return 'Bendahara';
    if (hasKabagTuRole()) return 'Kabag TU';
    if (hasKepalaBalaiRole()) return 'Ka. Balai';
    return 'User';
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={`
        flex flex-col transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-16'}
        bg-gray-800 dark:bg-gray-950 text-white
      `}>
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-700 dark:border-gray-800">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold">
              <Link href="/" className="hover:text-gray-300 transition-colors">
                Dashboard
              </Link>
            </h1>
          ) : (
            <div className="w-8 h-8" />
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="text-lg">☰</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {menuGroups.map((group, index) => (
            <div key={index} className="space-y-2">
              {isSidebarOpen && (
                <p className="text-xs font-semibold uppercase text-gray-400 px-2">
                  {group.title}
                </p>
              )}
              
              <div className="space-y-1">
                {group.items.map((item, itemIndex) => (
                  <Link
                    key={itemIndex}
                    href={item.href}
                    className={`
                      flex items-center py-3 px-3 rounded-lg relative
                      transition-all duration-200
                      ${router.pathname === item.href || router.pathname.startsWith(item.href + '/')
                        ? 'bg-blue-600 text-white' 
                        : 'hover:bg-gray-700 dark:hover:bg-gray-800'
                      }
                    `}
                    title={item.description || item.label}
                  >
                    <span className="text-lg relative">
                      {item.icon}
                      {!isSidebarOpen && item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </span>
                    
                    {isSidebarOpen && (
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium block">{item.label}</span>
                          {item.badge && (
                            <span className={`
                              text-xs px-2 py-0.5 rounded-full
                              ${typeof item.badge === 'number' 
                                ? (item.badgeColor || 'bg-red-500') + ' text-white' 
                                : item.badge === 'Admin' ? 'bg-red-500 text-white' :
                                  item.badge === 'Kabag TU' ? 'bg-blue-500 text-white' :
                                  item.badge === 'Ka. Balai' ? 'bg-purple-500 text-white' :
                                  item.badge === 'PPK' ? 'bg-yellow-500 text-white' :
                                  'bg-gray-500 text-white'
                              }
                            `}>
                              {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <span className="text-xs text-gray-400 block">
                            {item.description}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-700">
          {isSidebarOpen && (
            <div className="mb-4 p-3 bg-gray-700 dark:bg-gray-900 rounded-lg">
              <p className="text-sm font-semibold truncate">{getUserName()}</p>
              <p className="text-xs text-gray-400 truncate">{getUserEmail()}</p>
              <p className="text-xs text-gray-400 mt-1">
                <span className={`inline-block px-2 py-0.5 rounded text-xs ${getUserRoleBadgeClass()}`}>
                  {getUserRoleBadgeText()}
                </span>
              </p>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-center w-full py-3 px-3 rounded-lg
              hover:bg-red-600 bg-red-700 transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isSidebarOpen && <span className="ml-1 font-medium">Logging out...</span>}
              </>
            ) : (
              <>
                <FaSignOutAlt className="text-lg" />
                {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {router.pathname === '/' ? 'Dashboard' : 
                 router.pathname === '/kwitansi' ? 'Kwitansi Perjalanan Dinas' :
                 router.pathname === '/kegiatan' ? 'Nominatif Kegiatan' :
                 router.pathname === '/lpd' ? 'Laporan Perjalanan Dinas (LPD)' :
                 router.pathname === '/search' ? 'Batalkan Nominatif' :
                 router.pathname === '/laporan' ? 'Rekap Perjalanan Dinas Pegawai' :
                 router.pathname.startsWith('/lpd/') ? 'Laporan Perjalanan Dinas (LPD)' :
                 router.pathname === '/pagu' ? 'Pagu & Realisasi' :
                 'Aplikasi Nominatif'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              {/* Toggle Dark/Light Mode */}
              <ThemeToggle />

              {notifications.total > 0 && (
                <button 
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Notifications"
                  onClick={() => {
                    if (notifications.lpd > 0) router.push('/lpd');
                    else if (notifications.kwitansi > 0) router.push('/kwitansi');
                  }}
                >
                  <FaBell className="text-gray-600 dark:text-gray-300" />
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                    {notifications.total > 9 ? '9+' : notifications.total}
                  </span>
                </button>
              )}

              {process.env.NODE_ENV === 'development' && (
                <button 
                  onClick={() => {
                    console.log('🔍 DEBUG Notifications:', notifications);
                    console.log('🔍 DEBUG Session:', {
                      user: session?.user,
                      hasPPK: hasPPKRole(),
                      hasBendahara: hasBendaharaRole(),
                      hasAdmin: hasAdminRole(),
                      hasKabagTu: hasKabagTuRole(),
                      hasKepalaBalai: hasKepalaBalaiRole()
                    });
                    refreshNotif();
                    alert(`Notifikasi:\nLPD: ${notifications.lpd}\nKwitansi: ${notifications.kwitansi}\nTotal: ${notifications.total}\n\nLoading: ${notifLoading}\nError: ${notifError || 'Tidak ada'}`);
                  }}
                  className="px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800"
                >
                  Debug Notif
                </button>
              )}

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{getUserName()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded ${
                      getUserRoleBadgeClass()
                    }`}>
                      {getUserRoleDisplay()}
                    </span>
                  </p>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-gray-300">
                    {getInitials()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}