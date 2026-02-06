// components/DashboardLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  FaHome, FaBox, FaUsers, FaShoppingCart, FaCog, FaSignOutAlt, 
  FaTruck, FaListAlt, FaCreditCard, FaBell, FaClipboardList, FaSearch,
  FaTimesCircle  
} from 'react-icons/fa';

import { useSession, signOut } from 'next-auth/react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loading = status === 'loading';

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  // Fungsi untuk cek apakah user memiliki role PPK - DIPERBAIKI
  const hasPPKRole = () => {
    console.log("🔍 Checking PPK role in session:", session);
    
    if (!session?.user) return false;
    
    // DEBUG: Tampilkan semua data user
    console.log("🔍 User data:", session.user);
    console.log("🔍 User role:", session.user.role);
    
    // Check 1: Role langsung dari user.role
    if (session.user.role) {
      const role = session.user.role.toLowerCase();
      console.log("🔍 Checking role:", role);
      
      if (role.includes('ppk')) {
        console.log("✅ User has PPK role (from user.role)");
        return true;
      }
    }
    
    // Check 2: Check dari roles array (jika ada)
    if (session.user.roles && Array.isArray(session.user.roles)) {
      const hasRole = session.user.roles.some(role => 
        role.toLowerCase().includes('ppk')
      );
      if (hasRole) {
        console.log("✅ User has PPK role (from user.roles array)");
        return true;
      }
    }
    
    // Check 3: Check dari roles string (jika ada)
    if (session.user.roles && typeof session.user.roles === 'string') {
      if (session.user.roles.toLowerCase().includes('ppk')) {
        console.log("✅ User has PPK role (from user.roles string)");
        return true;
      }
    }
    
    console.log("❌ User does NOT have PPK role");
    console.log("❌ Available user data:", {
      role: session.user?.role,
      roles: session.user?.roles,
      allUserData: session.user
    });
    
    return false;
  };

  const handleLogout = async () => {
    try {
      console.log("🚪 Logout via NextAuth");
      await signOut({
        callbackUrl: "/login"
      });
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Component akan redirect otomatis
  }

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
    if (session?.user?.role) {
      return session.user.role;
    }
    if (session?.user?.roles) {
      if (Array.isArray(session.user.roles)) {
        return session.user.roles.join(', ');
      }
      return session.user.roles;
    }
    return 'User';
  };

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
        // Menu Cari hanya ditampilkan jika user memiliki role PPK
        ...(hasPPKRole() ? [
          { 
            href: '/search', 
            label: 'Batalkan Nominatif', 
            icon: <FaTimesCircle />, // Ganti icon yang lebih sesuai
            description: 'Hanya untuk PPK' 
          }
        ] : [])
      ]
    },
    {
      title: 'Pengaturan',
      items: [
        { href: '/profile', label: 'Profile', icon: <FaCog /> },
        { href: '/settings', label: 'Settings', icon: <FaCog /> }
      ]
    }
  ];

  // DEBUG: Tambahkan display untuk role di header
  const debugInfo = {
    hasPPK: hasPPKRole(),
    userRole: session?.user?.role,
    userRoles: session?.user?.roles,
    isArray: Array.isArray(session?.user?.roles),
    allUserData: session?.user
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-16'}
        bg-gray-800 text-white
      `}>
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
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
                      flex items-center py-3 px-3 rounded-lg
                      transition-all duration-200
                      ${router.pathname === item.href 
                        ? 'bg-blue-600 text-white' 
                        : 'hover:bg-gray-700'
                      }
                    `}
                    title={item.description || item.label}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {isSidebarOpen && (
                      <div className="ml-3">
                        <span className="font-medium block">{item.label}</span>
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
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm font-semibold truncate">{getUserName()}</p>
              <p className="text-xs text-gray-400 truncate">{getUserEmail()}</p>
              
            </div>
          )}
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="
              flex items-center justify-center w-full py-3 px-3 rounded-lg
              hover:bg-red-600 bg-red-700 transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
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
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {router.pathname === '/' ? 'Dashboard' : 'Aplikasi Nominatif'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              {/* Debug Info Button - hanya di development */}
              {process.env.NODE_ENV === 'development' && (
                <button 
                  onClick={() => {
                    console.log("🔍 DEBUG Session Info:", debugInfo);
                    alert(`User Role: ${session?.user?.role}\nHas PPK: ${hasPPKRole() ? 'Yes' : 'No'}\n\nCheck console for details.`);
                  }}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
                >
                  Debug Role
                </button>
              )}

              <button 
                className="
                  relative p-2 rounded-full 
                  hover:bg-gray-100 transition-colors
                "
                aria-label="Notifications"
              >
                <FaBell className="text-gray-600" />
                <span className="
                  absolute top-1 right-1
                  w-2 h-2 bg-red-500 rounded-full
                "></span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{getUserName()}</p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.role && (
                      <span className={`px-2 py-1 rounded ${
                        session.user.role.includes('admin') ? 'bg-red-100 text-red-800' :
                        session.user.role.includes('ppk') ? 'bg-yellow-100 text-yellow-800' :
                        session.user.role.includes('kabalai') ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getUserRoleDisplay()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-gray-300">
                    {getInitials()}
                  </div>
                  <span className="
                    absolute bottom-0 right-0
                    w-3 h-3 bg-green-500 rounded-full
                    border-2 border-white
                  "></span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}