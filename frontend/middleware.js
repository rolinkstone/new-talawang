// middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    console.log("🛡️ Middleware - Path:", path);
    console.log("🛡️ Middleware - Hostname:", req.nextUrl.hostname);
    console.log("🛡️ Middleware - Token present:", !!token);
    
    if (token) {
      console.log("🛡️ Middleware - User:", token.name);
      console.log("🛡️ Middleware - Role:", token.role);
      
      // You can add role-based access control here
      if (path.startsWith('/admin') && token.role !== 'admin') {
        const url = new URL('/unauthorized', req.url);
        return NextResponse.redirect(url);
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
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
        
        const isPublicPath = publicPaths.some(publicPath => 
          path.startsWith(publicPath) || path.includes('.')
        );
        
        if (isPublicPath) {
          console.log("🛡️ Middleware - Public path:", path);
          return true;
        }
        
        // Home page - allow both authenticated and unauthenticated
        if (path === '/') {
          console.log("🛡️ Middleware - Home page, allowing access");
          return true;
        }
        
        // Protected paths require authentication - return boolean, redirect handled by withAuth
        if (!token) {
          console.log("🛡️ Middleware - No token, access denied");
          return false;
        }
        
        console.log(`✅ Access granted for ${path} - User: ${token.name}, Role: ${token.role}`);
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};