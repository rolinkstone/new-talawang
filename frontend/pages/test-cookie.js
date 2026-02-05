import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function TestCookies() {
  const { data: session, status } = useSession();
  const [cookies, setCookies] = useState('');
  const [cookieDetails, setCookieDetails] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCookies(document.cookie);
      
      // Parse cookies
      const cookieArray = document.cookie.split(';').map(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        const value = valueParts.join('=');
        return { name, value: value.substring(0, 100) };
      }).filter(cookie => cookie.name);
      
      setCookieDetails(cookieArray);
    }
  }, []);

  const setTestCookie = () => {
    document.cookie = "test_cookie=hello_world; path=/; max-age=3600; SameSite=Lax";
    setCookies(document.cookie);
    alert('Test cookie set!');
  };

  const clearCookies = () => {
    // Clear all cookies
    document.cookie.split(";").forEach(cookie => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    setCookies(document.cookie);
    setCookieDetails([]);
    alert('All cookies cleared!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">🍪 Cookie Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Session Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Session Status</h2>
          <p><strong>Status:</strong> <span className={`px-2 py-1 rounded ${status === 'authenticated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{status}</span></p>
          <p><strong>User:</strong> {session?.user?.name || 'No user'}</p>
          <p><strong>Email:</strong> {session?.user?.email || 'No email'}</p>
          
          <div className="mt-4 space-x-2">
            {status !== 'authenticated' ? (
              <button onClick={() => signIn('keycloak')} className="bg-blue-500 text-white px-4 py-2 rounded">
                Sign In
              </button>
            ) : (
              <button onClick={() => signOut()} className="bg-red-500 text-white px-4 py-2 rounded">
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Cookie Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Cookie Actions</h2>
          <div className="space-y-2">
            <button onClick={setTestCookie} className="w-full bg-green-500 text-white px-4 py-2 rounded">
              Set Test Cookie
            </button>
            <button onClick={clearCookies} className="w-full bg-red-500 text-white px-4 py-2 rounded">
              Clear All Cookies
            </button>
            <button onClick={() => window.location.reload()} className="w-full bg-gray-500 text-white px-4 py-2 rounded">
              Reload Page
            </button>
          </div>
        </div>
      </div>

      {/* Cookie Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Cookie Details</h2>
        
        <div className="mb-4">
          <h3 className="font-bold mb-2">Raw Cookie String:</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {cookies || 'No cookies found'}
          </pre>
        </div>

        <div>
          <h3 className="font-bold mb-2">Parsed Cookies ({cookieDetails.length} found):</h3>
          {cookieDetails.length === 0 ? (
            <p className="text-red-500">⚠️ No cookies found! This is the problem.</p>
          ) : (
            <div className="space-y-2">
              {cookieDetails.map((cookie, index) => (
                <div key={index} className={`p-3 rounded border ${cookie.name.includes('next-auth') ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${cookie.name.includes('next-auth') ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <div className="font-bold">{cookie.name}</div>
                      <div className="text-sm text-gray-600 truncate">{cookie.value}</div>
                      {cookie.name.includes('next-auth') && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block">
                          NextAuth Cookie
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-2">🔧 Troubleshooting Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-yellow-700">
          <li>Klik "Set Test Cookie" - Jika muncul, berarti browser bisa set cookies</li>
          <li>Login dengan "Sign In" button</li>
          <li>Refresh halaman - Cookie next-auth.session-token harus muncul</li>
          <li>Jika tidak muncul, ada masalah dengan NextAuth cookie configuration</li>
          <li>Coba buka halaman di tab incognito/private</li>
        </ol>
      </div>
    </div>
  );
}