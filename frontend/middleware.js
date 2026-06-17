// middleware.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  
  // Public paths - no auth required
  const publicPaths = [
    '/login',
    '/api/auth',
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
    console.log("🛡️ Middleware - Public path:", path);
    return NextResponse.next();
  }
  
  // Home page - allow both authenticated and unauthenticated
  if (path === '/') {
    console.log("🛡️ Middleware - Home page, allowing access");
    return NextResponse.next();
  }
  
  // Decode token from cookie explicitly
  console.log("🛡️ Middleware - Path:", path);
  console.log("🛡️ Middleware - Hostname:", req.nextUrl.hostname);
  
  const secret = process.env.NEXTAUTH_SECRET;
  const cookieName = "next-auth.session-token";
  const rawCookie = req.cookies.get(cookieName)?.value;
  
  console.log("🛡️ Middleware - Cookie present:", !!rawCookie);
  console.log("🛡️ Middleware - NEXTAUTH_SECRET defined:", !!secret);
  
  const token = await getToken({ 
    req, 
    secret,
    raw: false
  });
  
  console.log("🛡️ Middleware - Token decoded:", !!token);
  
  if (!token) {
    console.log("🛡️ Middleware - No token, access denied for:", path);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(path));
    return NextResponse.redirect(loginUrl);
  }
  
  console.log(`✅ Access granted for ${path} - User: ${token.name}, Role: ${token.role}`);
  
  // Role-based access control
  if (path.startsWith('/admin') && token.role !== 'admin') {
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
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