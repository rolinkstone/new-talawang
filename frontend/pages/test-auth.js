// pages/auth-test.js
import { useSession, getSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function AuthTestPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.accessToken) {
      // Parse JWT token untuk debugging
      try {
        const payload = JSON.parse(
          Buffer.from(session.accessToken.split('.')[1], 'base64').toString()
        );
        console.log('🔐 Parsed Access Token:', payload);
        console.log('Roles from access token:', payload.realm_access?.roles);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, [session]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-bold mb-2">User Info</h2>
        <pre className="text-sm">
          {JSON.stringify(session.user, null, 2)}
        </pre>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-xl font-bold mb-2">Token Info</h2>
        <p>Has Access Token: {session.accessToken ? 'Yes' : 'No'}</p>
        <p>Roles in session: {session.user?.roles?.length || 0}</p>
        {session.user?.roles && (
          <div>
            <p>Roles: {session.user.roles.join(', ')}</p>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-yellow-50 rounded">
        <h2 className="text-xl font-bold mb-2">Debug Info</h2>
        <button 
          onClick={() => console.log('Session:', session)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Log Session to Console
        </button>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  return {
    props: { session },
  };
}