// pages/test.js
import { useSession, getSession } from 'next-auth/react';

export default function TestPage() {
  const { data: session, status } = useSession();
  
  const checkSession = async () => {
    const session = await getSession();
    console.log('📋 Session from getSession():', session);
    
    // Check cookies
    console.log('🍪 Cookies:', document.cookie);
    
    // Test API endpoint
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    console.log('🔗 API Session:', data);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Session</h1>
      <div className="mb-6">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>User:</strong> {session?.user?.name || 'No user'}</p>
        <p><strong>Email:</strong> {session?.user?.email || 'No email'}</p>
      </div>
      <button 
        onClick={checkSession}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Check Session
      </button>
    </div>
  );
}