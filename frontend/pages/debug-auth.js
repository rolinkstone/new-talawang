// pages/debug-auth.js - FIXED VERSION
import { useSession, getSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function DebugAuthPage({ serverSession }) {
  const { data: clientSession, status } = useSession();

  useEffect(() => {
    console.log('=== CLIENT DEBUG ===');
    console.log('Status:', status);
    console.log('Client Session:', clientSession);
    console.log('Server Session:', serverSession);
    console.log('Cookies:', document.cookie);
    console.log('URL:', window.location.href);
    
    // Check session via API
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => console.log('API Session:', data))
      .catch(err => console.error('API Error:', err));
  }, [clientSession, status, serverSession]);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>🔍 NextAuth Debug Page</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Open browser console (F12) to see detailed debug logs
      </p>
      
      {/* Status Card */}
      <div style={{ 
        margin: '20px 0', 
        padding: '20px', 
        background: status === 'authenticated' ? '#e8f5e9' : 
                   status === 'loading' ? '#fff3e0' : '#ffebee',
        borderRadius: '8px',
        border: `2px solid ${status === 'authenticated' ? '#4caf50' : 
                          status === 'loading' ? '#ff9800' : '#f44336'}`
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>
          Auth Status: <span style={{ 
            color: status === 'authenticated' ? '#2e7d32' : 
                   status === 'loading' ? '#e65100' : '#c62828',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            {status.toUpperCase()}
          </span>
        </h2>
        <p style={{ margin: 0 }}>
          {status === 'authenticated' ? '✅ You are logged in' :
           status === 'loading' ? '⏳ Checking session...' :
           '❌ You are not logged in'}
        </p>
      </div>

      {/* Session Comparison */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Client Session */}
        <div style={{ 
          padding: '20px', 
          background: '#e3f2fd', 
          borderRadius: '8px',
          border: '1px solid #90caf9'
        }}>
          <h3 style={{ marginTop: 0, color: '#1565c0' }}>👤 Client Session</h3>
          {clientSession ? (
            <>
              <div style={{ marginBottom: '10px' }}>
                <strong>User:</strong> {clientSession.user?.name || 'N/A'}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Email:</strong> {clientSession.user?.email || 'N/A'}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Access Token:</strong> {clientSession.accessToken ? '✅ Present' : '❌ Missing'}
              </div>
              <details>
                <summary style={{ cursor: 'pointer', color: '#0d47a1' }}>View Full Session</summary>
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto',
                  background: 'rgba(255,255,255,0.5)',
                  padding: '10px',
                  borderRadius: '4px',
                  marginTop: '10px'
                }}>
                  {JSON.stringify(clientSession, null, 2)}
                </pre>
              </details>
            </>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No client session</p>
          )}
        </div>
        
        {/* Server Session */}
        <div style={{ 
          padding: '20px', 
          background: '#f3e5f5', 
          borderRadius: '8px',
          border: '1px solid #ce93d8'
        }}>
          <h3 style={{ marginTop: 0, color: '#7b1fa2' }}>🖥️ Server Session</h3>
          {serverSession ? (
            <>
              <div style={{ marginBottom: '10px' }}>
                <strong>User:</strong> {serverSession.user?.name || 'N/A'}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Email:</strong> {serverSession.user?.email || 'N/A'}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Access Token:</strong> {serverSession.accessToken ? '✅ Present' : '❌ Missing'}
              </div>
              <details>
                <summary style={{ cursor: 'pointer', color: '#4a148c' }}>View Full Session</summary>
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto',
                  background: 'rgba(255,255,255,0.5)',
                  padding: '10px',
                  borderRadius: '4px',
                  marginTop: '10px'
                }}>
                  {JSON.stringify(serverSession, null, 2)}
                </pre>
              </details>
            </>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No server session</p>
          )}
        </div>
      </div>

      {/* Environment Info - TANPA hydration error */}
      <div style={{ 
        padding: '20px', 
        background: '#212121', 
        borderRadius: '8px',
        color: 'white',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: '#bb86fc' }}>🔧 Environment Configuration</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          fontSize: '14px'
        }}>
          <div>
            <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
          </div>
          <div>
            <strong>NEXTAUTH_URL:</strong> {process.env.NEXT_PUBLIC_NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'Not set'}
          </div>
          <div>
            <strong>KEYCLOAK_ISSUER:</strong> {process.env.KEYCLOAK_ISSUER ? '✅ Set' : '❌ Not set'}
          </div>
          <div>
            <strong>KEYCLOAK_CLIENT_ID:</strong> {process.env.KEYCLOAK_CLIENT_ID ? '✅ Set' : '❌ Not set'}
          </div>
          <div>
            <strong>Has NEXTAUTH_SECRET:</strong> {process.env.NEXTAUTH_SECRET ? '✅ Yes' : '❌ No'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        padding: '20px', 
        background: '#fff3e0', 
        borderRadius: '8px',
        border: '1px solid #ffb74d'
      }}>
        <h3 style={{ marginTop: 0, color: '#e65100' }}>⚡ Quick Actions</h3>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '10px',
          marginBottom: '15px'
        }}>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{ 
              padding: '12px 20px', 
              background: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔐 Go to Login
          </button>
          <button 
            onClick={() => window.location.href = '/api/auth/signout'}
            style={{ 
              padding: '12px 20px', 
              background: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚪 Force Sign Out
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '12px 20px', 
              background: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔄 Reload Page
          </button>
          <button 
            onClick={() => window.location.href = '/kegiatan'}
            style={{ 
              padding: '12px 20px', 
              background: '#9c27b0', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚀 Test Kegiatan Page
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '10px'
        }}>
          <button 
            onClick={() => {
              // Clear cookies
              document.cookie.split(";").forEach(c => {
                document.cookie = c
                  .replace(/^ +/, "")
                  .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
              });
              alert('Cookies cleared! Reloading...');
              window.location.reload();
            }}
            style={{ 
              padding: '10px 15px', 
              background: '#ff9800', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            🍪 Clear Cookies
          </button>
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/auth/session');
                const data = await res.json();
                alert('API Session:\n' + JSON.stringify(data, null, 2));
                console.log('API Session Response:', data);
              } catch (error) {
                alert('Error checking session API');
              }
            }}
            style={{ 
              padding: '10px 15px', 
              background: '#00bcd4', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            📡 Check Session API
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '15px', 
        background: '#e8f5e9', 
        borderRadius: '8px',
        fontSize: '14px',
        marginTop: '20px'
      }}>
        <h4 style={{ marginTop: 0, color: '#2e7d32' }}>📋 Troubleshooting Steps:</h4>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Open browser console (F12) to see debug logs</li>
          <li>Check if cookies are being set properly</li>
          <li>Verify environment variables are correct</li>
          <li>Try clearing cookies and logging in again</li>
          <li>Check the Network tab for API requests</li>
        </ol>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  // Halaman debug hanya untuk environment development
  if (process.env.NODE_ENV !== 'development') {
    return { notFound: true };
  }

  const session = await getSession(context);

  // Halaman debug tetap butuh sesi login
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Serialize sesi TANPA membocorkan token ke client
  return {
    props: {
      serverSession: {
        user: {
          id: session.user?.id || '',
          name: session.user?.name || '',
          email: session.user?.email || '',
          roles: session.user?.roles || [],
        },
        accessToken: !!session.accessToken,
        expires: session.expires || null,
      },
    },
  };
}