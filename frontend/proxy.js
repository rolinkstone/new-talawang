// proxy.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

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
      const targetUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '') + path.replace('/api/uploads', '/uploads');
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
  const cookieName = "next-auth.session-token";
  const rawCookie = req.cookies.get(cookieName)?.value;
  
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
