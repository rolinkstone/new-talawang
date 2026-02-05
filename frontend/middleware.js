// middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const hostname = req.nextUrl.hostname;
    
    console.log("🛡️ Middleware - Path:", path);
    console.log("🛡️ Middleware - Hostname:", hostname);
    console.log("🛡️ Middleware - Has token:", !!token);
    
    if (token) {
      console.log("🛡️ Middleware - User:", token.user?.name);
      console.log("🛡️ Middleware - Roles:", token.user?.roles);
      console.log("🛡️ Middleware - Token expires:", token.expiresAt ? new Date(token.expiresAt * 1000).toISOString() : "N/A");
    }
    
    // Token ada, lanjutkan
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const hostname = req.nextUrl.hostname;
        
        console.log(`🔐 Auth check [${hostname}${path}]:`, !!token);
        
        // Public paths yang tidak perlu auth
        const publicPaths = [
          '/login',
          '/api/auth',
          '/_next',
          '/favicon.ico',
          '/public',
          '/images',
          '/search', // Tambahkan /search ke public paths
        ];
        
        // Cek jika path adalah public
        const isPublicPath = publicPaths.some(p => path.startsWith(p));
        
        if (isPublicPath) {
          console.log(`✅ ${path} is public path, allowing access`);
          return true;
        }
        
        // Untuk protected paths, butuh token
        if (!token) {
          console.log(`🚫 Access denied for ${path} - No token`);
          return false;
        }
        
        // Cek jika token expired
        if (token.expiresAt && Date.now() > token.expiresAt * 1000) {
          console.log(`⏰ Token expired for ${path}`);
          return false;
        }
        
        console.log(`✅ Access granted for ${path}`);
        return true;
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/kegiatan/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/api/protected/:path*",
  ],
};