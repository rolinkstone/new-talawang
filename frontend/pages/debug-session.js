import { useSession, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function DebugSession({ serverSession }) {
  const { data: clientSession, status } = useSession();
  const [cookies, setCookies] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Set isClient hanya di client-side
  useEffect(() => {
    setIsClient(true);
    setCookies(document.cookie);
  }, []);

  const testSession = async () => {
    console.log('🔍 TESTING SESSION...');
    
    // Test 1: Client session
    console.log('1. Client Session:', clientSession);
    console.log('2. Client Session Status:', status);
    
    // Test 2: Server session from props
    console.log('3. Server Session from props:', serverSession);
    
    // Test 3: Get session via getSession()
    try {
      const freshSession = await getSession();
      console.log('4. Fresh getSession():', freshSession);
    } catch (error) {
      console.error('Error getting fresh session:', error);
    }
    
    // Test 4: Test API route
    try {
      const res = await fetch('/api/auth/session');
      const apiSession = await res.json();
      console.log('5. API /api/auth/session:', apiSession);
    } catch (error) {
      console.error('API test failed:', error);
    }
    
    // Test 5: Check cookies
    console.log('6. Cookies:', document.cookie);
    setCookies(document.cookie);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🔧 Debug Session NextAuth</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Status Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Status Session</h2>
          <div className="space-y-2">
            <p className="flex items-center">
              <span className="font-medium w-32">Status Auth:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'authenticated' ? 'bg-green-100 text-green-800' :
                status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {status}
              </span>
            </p>
            <p>
              <span className="font-medium w-32">Is Client:</span>
              <span>{isClient ? '✅ Yes' : '❌ No'}</span>
            </p>
          </div>
        </div>

        {/* Client Session Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-green-600">Client Session</h2>
          <div className="space-y-2">
            <p><span className="font-medium">User:</span> {clientSession?.user?.name || 'No user'}</p>
            <p><span className="font-medium">Email:</span> {clientSession?.user?.email || 'No email'}</p>
            <p><span className="font-medium">User ID:</span> {clientSession?.user?.id || 'No ID'}</p>
            <p><span className="font-medium">Roles:</span> {JSON.stringify(clientSession?.user?.roles || [])}</p>
            <p>
              <span className="font-medium">Token:</span> 
              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                clientSession?.accessToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {clientSession?.accessToken ? '✅ Exists' : '❌ Missing'}
              </span>
            </p>
          </div>
        </div>

        {/* Server Session Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-purple-600">Server Session (from getServerSideProps)</h2>
          <div className="space-y-2">
            <p><span className="font-medium">User:</span> {serverSession?.user?.name || 'No user'}</p>
            <p><span className="font-medium">Email:</span> {serverSession?.user?.email || 'No email'}</p>
            <p><span className="font-medium">User ID:</span> {serverSession?.user?.id || 'No ID'}</p>
            <p><span className="font-medium">Roles:</span> {JSON.stringify(serverSession?.user?.roles || [])}</p>
            <p>
              <span className="font-medium">Token:</span> 
              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                serverSession?.accessToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {serverSession?.accessToken ? '✅ Exists' : '❌ Missing'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-orange-600">Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={testSession}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              🔍 Test Session (Check Console)
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition font-medium"
            >
              🔄 Reload Page
            </button>
            
            <button 
              onClick={() => window.location.href = '/kegiatan'}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-medium"
            >
              🚀 Go to Kegiatan Page
            </button>
          </div>
        </div>
      </div>

      {/* Cookies Display */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4 text-red-600">🍪 Cookies (Client-side only)</h3>
        {isClient ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <span className="font-medium">Total Cookies:</span>
              <span className="bg-gray-100 px-3 py-1 rounded">
                {cookies.split(';').filter(c => c.trim()).length} cookies found
              </span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-bold mb-2">Raw Cookie String:</h4>
              <pre className="bg-gray-800 text-white p-4 rounded text-sm overflow-x-auto">
                {cookies || 'No cookies found'}
              </pre>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-bold mb-2">Parsed Cookies:</h4>
              <div className="space-y-2">
                {cookies.split(';').map((cookie, index) => {
                  const [name, ...valueParts] = cookie.trim().split('=');
                  const value = valueParts.join('=');
                  
                  if (!name) return null;
                  
                  return (
                    <div key={index} className="flex items-start space-x-2 p-2 bg-white rounded border">
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        name.includes('next-auth') ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-gray-600 truncate max-w-md">
                          {name.includes('next-auth') ? '🔐 ' : ''}
                          {value.substring(0, 50)}
                          {value.length > 50 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading cookies (client-side only)...</p>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-800 mb-2">📋 Debug Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Login terlebih dahulu melalui halaman login</li>
          <li>Klik "Test Session" untuk melihat log di Console (F12)</li>
          <li>Periksa apakah ada cookie "next-auth.session-token"</li>
          <li>Klik "Go to Kegiatan Page" untuk test navigasi</li>
          <li>Jika session hilang, lihat Console untuk error messages</li>
        </ol>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  console.log('🔍 DEBUG PAGE - getServerSideProps called');
  
  const session = await getSession(context);
  
  console.log('🔍 Session from getSession():', {
    exists: !!session,
    user: session?.user?.email || 'No user',
    token: session?.accessToken ? 'Exists' : 'Missing',
  });

  // Serialize session dengan aman
  const safeSession = session ? {
    user: {
      id: session.user?.id || '',
      name: session.user?.name || '',
      email: session.user?.email || '',
      preferred_username: session.user?.preferred_username || '',
      user_id: session.user?.user_id || session.user?.id || '',
      roles: session.user?.roles || [],
      role: session.user?.role || session.user?.roles?.[0] || 'user',
    },
    accessToken: session.accessToken || '',
    refreshToken: session.refreshToken || '',
    idToken: session.idToken || '',
    expires: session.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } : null;

  return {
    props: {
      serverSession: safeSession,
    },
  };
}