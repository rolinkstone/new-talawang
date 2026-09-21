// proxy.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// ============================================================
// PROXY API (/backend/...)
// ============================================================
// Tujuan: token Keycloak TIDAK pernah sampai ke browser.
//
//   Browser  ->  /backend/kegiatan          (tanpa header Authorization)
//   Next.js  ->  <BACKEND_ORIGIN>/api/kegiatan + Authorization: Bearer <token dari cookie>
//   Backend  ->  balasan diteruskan apa adanya
//
// Cara mengaktifkan: set NEXT_PUBLIC_API_URL=/backend (build-time) dan
// BACKEND_ORIGIN=https://<host-api> (runtime, tanpa awalan /api).
// Selama NEXT_PUBLIC_API_URL masih berupa URL penuh, komponen memanggil
// backend langsung seperti sebelumnya — jadi pemasangan ini tidak mengubah
// perilaku aplikasi sampai env-nya dipindah.
const API_PROXY_PREFIX = '/backend';

function backendOrigin() {
  return String(process.env.BACKEND_ORIGIN || '').trim().replace(/\/+$/, '');
}

function buildBackendUrl(req, path) {
  const origin = backendOrigin();
  if (!origin) return null;
  const rest = path.slice(API_PROXY_PREFIX.length); // "/kegiatan" | "/uploads/..."
  return `${origin}/api${rest}${req.nextUrl.search || ''}`;
}

async function handleApiProxy(req, path) {
  const target = buildBackendUrl(req, path);
  if (!target) {
    console.error('❌ Proxy - BACKEND_ORIGIN belum diisi, request ditolak:', path);
    return withSecurityHeaders(NextResponse.json({
      success: false,
      error: 'Proxy belum dikonfigurasi',
      message: 'BACKEND_ORIGIN belum diisi di environment frontend'
    }, { status: 503 }));
  }

  // File upload disajikan backend sebagai statis (perilaku lama, tanpa token),
  // dan /health memang route publik backend — berguna untuk uji konektivitas
  // proxy dari luar tanpa login.
  const isFileRequest = path.startsWith(`${API_PROXY_PREFIX}/uploads/`);
  const isPublicBackendRoute = path === `${API_PROXY_PREFIX}/health`;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: false });

  if (!token && !isFileRequest && !isPublicBackendRoute) {
    console.log('🛡️ Proxy - API tanpa sesi, ditolak:', path);
    return withSecurityHeaders(NextResponse.json({
      success: false,
      error: 'Unauthorized',
      message: 'Sesi tidak ditemukan'
    }, { status: 401 }));
  }

  // Header dari browser TIDAK dipercaya: Authorization & Cookie dibuang,
  // Authorization diisi ulang dari token di cookie httpOnly.
  const headers = new Headers(req.headers);
  headers.delete('authorization');
  headers.delete('cookie');
  headers.delete('host');
  headers.delete('accept-encoding');
  if (token?.accessToken) {
    headers.set('authorization', `Bearer ${token.accessToken}`);
  }

  console.log(`🔁 Proxy - ${req.method} ${path} -> backend${token ? ' (token disuntik)' : ' (file publik)'}`);
  return withSecurityHeaders(NextResponse.rewrite(new URL(target), { request: { headers } }));
}

/**
 * Menambahkan security headers ke response
 */
function withSecurityHeaders(response) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  return response;
}

export async function proxy(req) {
  const path = req.nextUrl.pathname;

  // Proxy API: /backend/... -> backend (token disuntik dari cookie httpOnly)
  if (path === API_PROXY_PREFIX || path.startsWith(`${API_PROXY_PREFIX}/`)) {
    return handleApiProxy(req, path);
  }
  
  // Public paths - no auth required
  const publicPaths = [
    '/login',
    '/api/auth',
    '/api/uploads',
    '/_next',
    '/favicon.ico',
    '/images',
    '/css',
    '/js',
    '/public'
  ];
  
  // Check if it's a public path
  const isPublicPath = publicPaths.some(publicPath => 
    path.startsWith(publicPath) || path.includes('.')
  );
  
  if (isPublicPath) {
    console.log("🛡️ Proxy - Public path:", path);
    
    // Rewrite /api/uploads ke backend
    if (path.startsWith('/api/uploads')) {
      // Format lama (URL backend langsung). Utamakan BACKEND_ORIGIN supaya
      // tetap benar walau NEXT_PUBLIC_API_URL sudah berupa path relatif.
      const origin = backendOrigin() ||
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '').replace(/\/api$/, '');
      const targetUrl = origin + path.replace('/api/uploads', '/uploads');
      return withSecurityHeaders(NextResponse.rewrite(targetUrl));
    }
    
    return withSecurityHeaders(NextResponse.next());
  }
  
  // Home page - allow both authenticated and unauthenticated
  if (path === '/') {
    console.log("🛡️ Proxy - Home page, allowing access");
    return withSecurityHeaders(NextResponse.next());
  }
  
  // Decode token from cookie explicitly
  console.log("🛡️ Proxy - Path:", path);
  console.log("🛡️ Proxy - Hostname:", req.nextUrl.hostname);
  
  const secret = process.env.NEXTAUTH_SECRET;
  // Nama cookie berubah kalau diakses via https (prefiks __Secure-),
  // jadi cek keduanya. Ini hanya untuk logging — getToken() menentukan
  // nama cookie sendiri.
  const rawCookie =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;
  
  console.log("🛡️ Proxy - Cookie present:", !!rawCookie);
  console.log("🛡️ Proxy - NEXTAUTH_SECRET defined:", !!secret);
  
  const token = await getToken({ 
    req, 
    secret,
    raw: false
  });
  
  console.log("🛡️ Proxy - Token decoded:", !!token);
  
  if (!token) {
    console.log("🛡️ Proxy - No token, access denied for:", path);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(path));
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }
  
  console.log(`✅ Access granted for ${path} - User: ${token.name}, Role: ${token.role}`);
  
  // Role-based access control
  if (path.startsWith('/admin') && token.role !== 'admin') {
    const url = new URL('/unauthorized', req.url);
    return withSecurityHeaders(NextResponse.redirect(url));
  }
  
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (Next.js internal data requests)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|_next/data|favicon.ico).*)',
  ],
};
