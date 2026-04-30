// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

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
          } else if (profile.realm_access.roles.includes('ppk')) {
            role = 'ppk';
          } else if (profile.realm_access.roles.includes('bendahara')) {
            role = 'bendahara';
          }
        }
        
        // Extract NIP from preferred_username or other fields
        // preferred_username biasanya berisi NIP tanpa spasi (contoh: 198701042009121003)
        let nip = profile.preferred_username || '';
        
        // Jika NIP dari database ada spasi, Anda bisa menyimpannya dalam format asli
        // Tapi untuk session, kita simpan tanpa spasi agar mudah dibandingkan
        // Atau simpan keduanya: nip (tanpa spasi) dan nip_raw (dengan spasi)
        
        console.log("📋 Profile data:", {
          sub: profile.sub,
          preferred_username: profile.preferred_username,
          email: profile.email,
          name: profile.name,
          nip: nip
        });
        
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          role: role,
          nip: nip,  // ← TAMBAHKAN NIP
          username: profile.preferred_username,  // ← TAMBAHKAN username sebagai alternatif
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        console.log("🔄 JWT - Storing user in token");
        
        // Store user data directly on token (not in nested object)
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.nip = user.nip;  // ← TAMBAHKAN NIP ke token
        token.username = user.username;  // ← TAMBAHKAN username ke token
        token.accessToken = account.access_token;
        token.expiresAt = account.expires_at;
      }
      
      console.log("🔄 JWT - Token has nip:", !!token.nip);
      return token;
    },

    async session({ session, token }) {
      console.log("💼 SESSION - Building from token");
      
      // Pass token data to session
      if (token) {
        session.user = {
          id: token.id,
          name: token.name,
          email: token.email,
          role: token.role,
          nip: token.nip,  // ← TAMBAHKAN NIP ke session.user
          username: token.username,  // ← TAMBAHKAN username ke session.user
        };
        
        session.accessToken = token.accessToken;
        session.expires = token.expiresAt ? 
          new Date(token.expiresAt * 1000).toISOString() : null;
      }
      
      console.log("💼 SESSION - User:", session.user?.name, "Role:", session.user?.role, "Has NIP:", !!session.user?.nip);
      console.log("💼 SESSION - NIP value:", session.user?.nip);
      console.log("💼 SESSION - Size:", JSON.stringify(session).length);
      
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

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token', // Use default name for compatibility
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 4 * 60 * 60,
      }
    }
  },

  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export default NextAuth(authOptions);