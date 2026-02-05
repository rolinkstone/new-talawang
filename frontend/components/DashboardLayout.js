// components/DashboardLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  FaHome, FaBox, FaUsers, FaShoppingCart, FaCog, FaSignOutAlt, 
  FaTruck, FaListAlt, FaCreditCard, FaBell, FaClipboardList, FaSearch  
} from 'react-icons/fa';

import { useSession, signOut, getSession } from 'next-auth/react';

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

   // Fungsi untuk cek apakah user memiliki role PPK
  const hasPPKRole = () => {
    if (!session?.user?.roles) return false;
    
    // Cek beberapa kemungkinan format role
    const userRoles = session.user.roles;
    
    // Jika roles adalah array
    if (Array.isArray(userRoles)) {
      return userRoles.some(role => 
        role.toLowerCase().includes('ppk') || 
        role === 'PPK' ||
        role === 'ppk'
      );
    }
    
    // Jika roles adalah string (dipisah koma atau format lain)
    if (typeof userRoles === 'string') {
      return userRoles.toLowerCase().includes('ppk');
    }
    
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
          { href: '/search', label: 'Batalkan Nominatif', icon: <FaSearch /> }
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
                  >
                    <span className="text-lg">{item.icon}</span>
                    {isSidebarOpen && (
                      <span className="ml-3 font-medium">{item.label}</span>
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
              <p className="text-xs text-gray-500 mt-1">
                User ID: {session?.user?.id?.substring(0, 8)}...
              </p>
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
                {router.pathname === '/' ? 'Dashboard' : 'Aplikasi Keuangan'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
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
                    {session?.user?.roles?.length > 0 
                      ? `Roles: ${session.user.roles.join(', ')}`
                      : 'Keycloak SSO User'}
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