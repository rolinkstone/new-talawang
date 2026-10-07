// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { CLIENT_ACCESS_TOKEN_PLACEHOLDER } from "../../../utils/roleChecks";

// Fungsi untuk memformat NIP dengan spasi
function formatNipWithSpaces(nip) {
    if (!nip) return '';
    
    // Hapus spasi yang ada
    const cleanNip = String(nip).replace(/\s/g, '');
    
    // Jika panjang 18 digit, format jadi 8 6 1 3
    if (cleanNip.length === 18 && /^\d+$/.test(cleanNip)) {
        return `${cleanNip.substring(0, 8)} ${cleanNip.substring(8, 14)} ${cleanNip.substring(14, 15)} ${cleanNip.substring(15, 18)}`;
    }
    
    // Jika sudah ada spasi, kembalikan asli
    if (nip.includes(' ')) {
        return nip;
    }
    
    return cleanNip;
}

// Access token Keycloak (default ±5 menit) disegarkan 60 detik sebelum
// kedaluwarsa. Margin ini harus lebih besar dari interval polling session di
// _app.js (30 detik) supaya token yang dipakai komponen selalu masih valid.
const ACCESS_TOKEN_REFRESH_MARGIN_SECONDS = 60;

// Perbarui access token memakai refresh token yang tersimpan di JWT httpOnly
// (refresh token tidak pernah dikirim ke browser). Dipanggil dari callback jwt
// hanya ketika access token sudah/hampir kedaluwarsa.
async function refreshAccessToken(token) {
  const issuer = String(process.env.KEYCLOAK_ISSUER || '').replace(/\/+$/, '');
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    refresh_token: token.refreshToken,
  });

  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const refreshed = await response.json();

  if (!response.ok || !refreshed.access_token) {
    throw refreshed;
  }

  console.log('🔄 JWT - Access token Keycloak disegarkan');
  return {
    ...token,
    accessToken: refreshed.access_token,
    idToken: refreshed.id_token || token.idToken,
    refreshToken: refreshed.refresh_token || token.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (Number(refreshed.expires_in) || 300),
    error: null,
  };
}

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      idToken: true,
      httpOptions: {
        timeout: 15000,
      },
      
      authorization: {
        params: {
          scope: "openid profile email"
        }
      },
      
      profile(profile) {
        console.log("🔐 Profile for:", profile.preferred_username);
        
        // Determine ALL roles — user bisa punya multiple roles (ppk + katim, dll)
        const realmRoles = profile.realm_access?.roles || [];
        const recognizedRoles = ['admin', 'ppk', 'kabalai', 'kabag_tu', 'katim', 'bendahara'];
        const roles = realmRoles.filter(r => recognizedRoles.includes(r));
        const primaryRole = roles.length > 0 ? roles[0] : 'user';
        
        // Ambil NIP dari berbagai sumber
        let nipRaw = '';
        let nipClean = '';
        
        // 1. Coba dari attributes
        if (profile.attributes?.nip) {
          nipRaw = Array.isArray(profile.attributes.nip) ? profile.attributes.nip[0] : profile.attributes.nip;
          nipClean = nipRaw.replace(/\s/g, '');
        }
        // 2. Coba dari preferred_username
        else if (profile.preferred_username) {
          nipClean = profile.preferred_username;
          nipRaw = formatNipWithSpaces(nipClean);
        }
        
        console.log("📋 Profile data:", {
          sub: profile.sub,
          preferred_username: profile.preferred_username,
          email: profile.email,
          name: profile.name,
          nip_raw: nipRaw,
          nip_clean: nipClean,
          roles: roles,
          primaryRole: primaryRole
        });
        
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          role: primaryRole,       // Role utama (untuk backward compatibility)
          roles: roles,            // SEMUA roles (array) — untuk multi-role
          nip: nipClean,           // NIP tanpa spasi (untuk filter)
          nip_raw: nipRaw,         // NIP dengan spasi (untuk display & database)
          username: profile.preferred_username,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        console.log("🔄 JWT - Storing user, NIP_raw:", user.nip_raw);
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.roles = user.roles;     // SEMUA roles (array)
        token.nip = user.nip;         // NIP tanpa spasi
        token.nip_raw = user.nip_raw; // NIP dengan spasi
        token.username = user.username;
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.error = null;
      } else if (
        token.expiresAt &&
        Date.now() >= (token.expiresAt - ACCESS_TOKEN_REFRESH_MARGIN_SECONDS) * 1000
      ) {
        // Access token sudah/hampir kedaluwarsa → segarkan di server. Tanpa ini
        // token tetap basi sampai user terlempar ke halaman login (dan isian
        // form yang sedang dikerjakan ikut hilang).
        if (!token.refreshToken) {
          // Sesi lama (login sebelum refresh token disimpan) atau refresh token
          // dimatikan di Keycloak: access token tidak bisa diperpanjang, jadi
          // tandai sesi bermasalah agar user diminta login ulang.
          console.warn('⚠️ JWT - Refresh token tidak tersedia, sesi harus login ulang');
          return { ...token, error: 'RefreshAccessTokenError' };
        }
        try {
          return await refreshAccessToken(token);
        } catch (error) {
          console.error('❌ JWT - Gagal menyegarkan token Keycloak:', error?.error || error?.message || error);
          return { ...token, error: 'RefreshAccessTokenError' };
        }
      }
      
      console.log("🔄 JWT - Token has nip_raw:", !!token.nip_raw, "| has idToken:", !!token.idToken);
      return token;
    },

    async session({ session, token }) {
      console.log("💼 SESSION - Building from token");
      
      if (token) {
        session.user = {
          id: token.id,
          name: token.name,
          email: token.email,
          role: token.role,
          roles: token.roles,       // SEMUA roles (array)
          nip: token.nip,           // NIP tanpa spasi
          nip_raw: token.nip_raw,   // NIP dengan spasi
          username: token.username,
        };
        
        // Kalau API dipanggil lewat proxy Next (/backend/...), token Keycloak
        // TIDAK perlu ada di browser: proxy menyuntikkan token dari cookie.
        // Komponen tetap memakai session.accessToken sebagai penanda & header,
        // jadi di mode proxy nilainya diganti placeholder (bukan rahasia) dan
        // header itu dibuang lagi oleh proxy sebelum diteruskan ke backend.
        // idToken & clientId tidak pernah dikirim ke browser (idToken dipakai
        // server-side di events.signOut).
        const viaProxy = String(process.env.NEXT_PUBLIC_API_URL || '').startsWith('/');
        session.accessToken = viaProxy ? CLIENT_ACCESS_TOKEN_PLACEHOLDER : token.accessToken;
        // `session.expires` sengaja TIDAK diisi dari umur access token Keycloak.
        // Nilai dari NextAuth (session.maxAge, bergulir) adalah umur sesi yang
        // sebenarnya; access token tetap diperpanjang otomatis lewat refresh.
        session.error = token.error || null;
      }
      
      console.log("💼 SESSION - NIP_raw value:", session.user?.nip_raw);
      console.log("💼 SESSION - Role:", session.user?.role);
      
      return session;
    },
  },

  events: {
    async signOut({ token }) {
      // Hancurkan Keycloak SSO session saat NextAuth logout
      if (token?.idToken) {
        const issuer = process.env.KEYCLOAK_ISSUER;
        const clientId = process.env.KEYCLOAK_CLIENT_ID || 'nextjs-local';
        const logoutUrl = `${issuer}/protocol/openid-connect/logout?id_token_hint=${token.idToken}&post_logout_redirect_uri=${process.env.NEXTAUTH_URL}/login&client_id=${clientId}`;
        try {
          await fetch(logoutUrl);
          console.log("🚪 LOGOUT - Keycloak SSO session destroyed via events.signOut");
        } catch (error) {
          console.error('❌ LOGOUT - Keycloak SSO logout error:', error);
        }
      }
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 4 * 60 * 60,
  },

  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export default NextAuth(authOptions);