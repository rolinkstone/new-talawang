// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

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

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      
      authorization: {
        params: {
          scope: "openid profile email"
        }
      },
      
      profile(profile) {
        console.log("🔐 Profile for:", profile.preferred_username);
        
        // Determine role
        let role = 'user';
        if (profile.realm_access?.roles) {
          if (profile.realm_access.roles.includes('admin')) {
            role = 'admin';
          } else if (profile.realm_access.roles.includes('kabalai')) {
            role = 'kabalai';
          } else if (profile.realm_access.roles.includes('kabag_tu')) {
            role = 'kabag_tu';
          } else if (profile.realm_access.roles.includes('katim')) {
            role = 'katim';
          } else if (profile.realm_access.roles.includes('ppk')) {
            role = 'ppk';
          } else if (profile.realm_access.roles.includes('bendahara')) {
            role = 'bendahara';
          }
        }
        
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
          role: role
        });
        
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          role: role,
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
        token.nip = user.nip;         // NIP tanpa spasi
        token.nip_raw = user.nip_raw; // NIP dengan spasi
        token.username = user.username;
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }
      
      console.log("🔄 JWT - Token has nip_raw:", !!token.nip_raw);
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
          nip: token.nip,           // NIP tanpa spasi
          nip_raw: token.nip_raw,   // NIP dengan spasi
          username: token.username,
        };
        
        session.accessToken = token.accessToken;
        session.idToken = token.idToken;
        session.expires = token.expiresAt ? 
          new Date(token.expiresAt * 1000).toISOString() : null;
      }
      
      console.log("💼 SESSION - NIP_raw value:", session.user?.nip_raw);
      console.log("💼 SESSION - Role:", session.user?.role);
      
      return session;
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