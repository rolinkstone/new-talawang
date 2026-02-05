import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

// Helper untuk debug token
const debugToken = (token, label = "Token") => {
  if (!token) {
    console.log(`❌ ${label}: No token provided`);
    return null;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log(`❌ ${label}: Invalid token format`);
      return null;
    }
    
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    console.log(`🔍 ===== ${label} DEBUG =====`);
    console.log(`🔍 Header:`, header);
    console.log(`🔍 Payload (simplified):`, {
      sub: payload.sub,
      preferred_username: payload.preferred_username,
      name: payload.name,
      email: payload.email,
      realm_access: payload.realm_access,
      resource_access: payload.resource_access,
      // Cek semua keys yang mengandung 'role'
      roleKeys: Object.keys(payload).filter(key => 
        key.toLowerCase().includes('role')
      ),
      allKeys: Object.keys(payload)
    });
    
    // Cari roles di semua tempat
    const foundRoles = [];
    const roleSources = [];
    
    // 1. Dari realm_access.roles
    if (payload.realm_access?.roles) {
      console.log(`✅ ${label}: Found in realm_access.roles:`, payload.realm_access.roles);
      foundRoles.push(...payload.realm_access.roles);
      roleSources.push('realm_access.roles');
    }
    
    // 2. Dari resource_access
    if (payload.resource_access) {
      Object.entries(payload.resource_access).forEach(([client, data]) => {
        if (data.roles) {
          console.log(`✅ ${label}: Found in resource_access.${client}.roles:`, data.roles);
          foundRoles.push(...data.roles);
          roleSources.push(`resource_access.${client}.roles`);
        }
      });
    }
    
    // 3. Cari di root payload
    Object.keys(payload).forEach(key => {
      if (key.toLowerCase().includes('role')) {
        const value = payload[key];
        console.log(`✅ ${label}: Found in payload.${key}:`, value);
        
        if (Array.isArray(value)) {
          foundRoles.push(...value);
        } else if (typeof value === 'string') {
          foundRoles.push(value);
        } else if (value && typeof value === 'object') {
          // Coba ekstrak dari object
          Object.values(value).forEach(v => {
            if (typeof v === 'string') foundRoles.push(v);
          });
        }
        
        roleSources.push(`payload.${key}`);
      }
    });
    
    console.log(`✅ ${label}: All unique roles found:`, [...new Set(foundRoles)]);
    console.log(`✅ ${label}: Role sources:`, roleSources);
    
    return {
      header,
      payload,
      roles: [...new Set(foundRoles)],
      roleSources,
      preferred_username: payload.preferred_username,
      name: payload.name,
      email: payload.email
    };
    
  } catch (error) {
    console.error(`❌ ${label}: Error parsing:`, error);
    return null;
  }
};

export const authOptions = {
  trustHost: true,

  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,

      authorization: {
        params: {
          scope: "openid profile email"  // Tidak perlu 'roles' secara explicit
        }
      },

      profile(profile, tokens) {
        console.log("📋 ===== PROFILE CALLBACK =====");
        console.log("📋 Profile keys:", Object.keys(profile));
        
        // Debug access token juga
        if (tokens?.access_token) {
          debugToken(tokens.access_token, "Profile Callback Token");
        }
        
        let roles = [];
        const roleSources = [];

        // 1. Ambil dari profile.realm_access
        if (profile.realm_access?.roles) {
          console.log("📝 Realm roles:", profile.realm_access.roles);
          roles.push(...profile.realm_access.roles);
          roleSources.push('profile.realm_access.roles');
        }

        // 2. Ambil dari profile.resource_access
        if (profile.resource_access) {
          console.log("📝 Resource access clients:", Object.keys(profile.resource_access));
          
          Object.entries(profile.resource_access).forEach(([clientName, client]) => {
            console.log(`📝 Client "${clientName}":`, client);
            if (client?.roles) {
              roles.push(...client.roles);
              roleSources.push(`profile.resource_access.${clientName}.roles`);
            }
          });
        }

        console.log("📝 Roles found in profile:", roles);
        console.log("📝 Role sources:", roleSources);
        
        // Jika tidak ada roles, coba dari token
        if (roles.length === 0 && tokens?.access_token) {
          console.log("⚠️ No roles in profile, checking token...");
          const tokenDebug = debugToken(tokens.access_token, "Fallback Token Check");
          if (tokenDebug?.roles?.length > 0) {
            roles = tokenDebug.roles;
          }
        }

        // Identifier user
        const user_id = profile.preferred_username || profile.username || profile.sub;
        const name = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.preferred_username;

        return {
          id: profile.sub,
          name,
          email: profile.email || `${user_id}@placeholder.com`,
          preferred_username: profile.preferred_username,
          given_name: profile.given_name,
          family_name: profile.family_name,
          roles: [...new Set(roles)],  // Hapus duplikat
          user_id,
          _raw: profile,
          _debug: {
            roleSources,
            hasRoles: roles.length > 0
          }
        };
      },

      client: { token_endpoint_auth_method: "client_secret_post" },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 ===== SIGN IN CALLBACK =====");
      console.log("🔐 User email:", user?.email);
      console.log("🔐 Account provider:", account?.provider);
      
      // Debug token saat sign in
      if (account?.access_token) {
        console.log("🔐 Debugging access token on sign in:");
        debugToken(account.access_token, "SignIn Access Token");
      }
      
      return true;
    },

    async jwt({ token, user, account, profile }) {
      console.log("🔄 ===== JWT CALLBACK =====");
      
      if (user && account) {
        console.log("🔄 Initial sign in");
        console.log("🔄 User from profile callback:", user);
        
        // Debug semua token
        if (account.access_token) {
          const accessTokenDebug = debugToken(account.access_token, "Access Token");
          console.log("🔄 Access token roles:", accessTokenDebug?.roles);
        }
        
        if (account.id_token) {
          debugToken(account.id_token, "ID Token");
        }
        
        // Kumpulkan roles dari semua sumber
        let allRoles = [];
        
        // 1. Dari user (profile callback)
        if (user.roles) {
          allRoles.push(...user.roles);
          console.log("🔄 Roles from user object:", user.roles);
        }
        
        // 2. Dari access token
        if (account.access_token) {
          try {
            const payload = JSON.parse(atob(account.access_token.split('.')[1]));
            
            if (payload.realm_access?.roles) {
              console.log("🔄 Roles from access_token.realm_access:", payload.realm_access.roles);
              allRoles.push(...payload.realm_access.roles);
            }
            
            if (payload.resource_access) {
              Object.values(payload.resource_access).forEach(client => {
                if (client?.roles) {
                  console.log("🔄 Roles from access_token.resource_access:", client.roles);
                  allRoles.push(...client.roles);
                }
              });
            }
          } catch (e) {
            console.error("🔄 Error parsing access token:", e);
          }
        }
        
        // 3. Hapus duplikat
        allRoles = [...new Set(allRoles)];
        
        console.log("🔄 ALL UNIQUE ROLES COLLECTED:", allRoles);
        
        // Tentukan flags
        const isKabalai = allRoles.includes("kabalai");
        const isAdmin = allRoles.includes("admin") || allRoles.includes("administrator");
        const isPPK = allRoles.includes("ppk");
        const isUser = allRoles.includes("user");
        
        console.log("🔄 Role Flags - Kabalai:", isKabalai, "Admin:", isAdmin, "PPK:", isPPK, "User:", isUser);

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ? Math.floor(account.expires_at) : null,
          idToken: account.id_token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            preferred_username: user.preferred_username,
            given_name: user.given_name,
            family_name: user.family_name,
            roles: allRoles,  // Simpan SEMUA roles
            user_id: user.user_id,
            isKabalai,
            isAdmin,
            isPPK,
            isUser,
            _raw: user._raw,
            _debug: user._debug
          },
          provider: account.provider,
        };
      }

      // Update token dengan data terbaru jika ada
      if (token.accessToken) {
        const tokenDebug = debugToken(token.accessToken, "Existing Token Refresh");
        if (tokenDebug?.roles?.length > 0 && 
            (!token.user?.roles || token.user.roles.length === 0)) {
          console.log("🔄 Updating roles from existing token");
          token.user.roles = tokenDebug.roles;
          
          // Update flags
          token.user.isKabalai = tokenDebug.roles.includes("kabalai");
          token.user.isAdmin = tokenDebug.roles.includes("admin") || tokenDebug.roles.includes("administrator");
          token.user.isPPK = tokenDebug.roles.includes("ppk");
          token.user.isUser = tokenDebug.roles.includes("user");
        }
      }

      return token;
    },

    async session({ session, token }) {
      console.log("💼 ===== SESSION CALLBACK =====");
      
      if (token?.user) {
        console.log("💼 Token user roles:", token.user.roles);
        console.log("💼 Token user flags:", {
          isKabalai: token.user.isKabalai,
          isAdmin: token.user.isAdmin,
          isPPK: token.user.isPPK,
          isUser: token.user.isUser
        });
        
        // Pastikan roles ada
        const userRoles = token.user.roles || [];
        
        // Debug tambahan
        if (userRoles.length === 0) {
          console.warn("⚠️ WARNING: No roles found in token.user!");
          console.log("💼 Checking access token for roles...");
          
          if (token.accessToken) {
            const tokenDebug = debugToken(token.accessToken, "Session Check Access Token");
            if (tokenDebug?.roles?.length > 0) {
              console.log("💼 Found roles in access token:", tokenDebug.roles);
              userRoles.push(...tokenDebug.roles);
            }
          }
        }
        
        // Update session dengan data dari token
        session.user = {
          ...session.user,
          id: token.user.id,
          name: token.user.name,
          email: token.user.email,
          preferred_username: token.user.preferred_username,
          given_name: token.user.given_name,
          family_name: token.user.family_name,
          roles: [...new Set(userRoles)],  // Hapus duplikat
          user_id: token.user.user_id,
          isKabalai: token.user.isKabalai || userRoles.includes("kabalai"),
          isAdmin: token.user.isAdmin || userRoles.includes("admin") || userRoles.includes("administrator"),
          isPPK: token.user.isPPK || userRoles.includes("ppk"),
          isUser: token.user.isUser || userRoles.includes("user"),
          _raw: token.user._raw,
        };
        
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.idToken = token.idToken;
        session.expires = token.expiresAt ? new Date(token.expiresAt * 1000).toISOString() : null;
        session.provider = token.provider;
        
        // Log akhir
        console.log("💼 Final session roles:", session.user.roles);
        console.log("💼 Is Kabalai in session:", session.user.isKabalai);
        console.log("💼 ==============================");
      }
      
      return session;
    },
  },

  events: {
    async signIn({ user, isNewUser }) { 
      console.log("🎉 ===== SIGN IN EVENT =====");
      console.log("🎉 User roles:", user?.roles);
      console.log("🎉 Is new user:", isNewUser);
    },
  },

  pages: { 
    signIn: '/auth/signin', 
    signOut: '/auth/signout', 
    error: '/auth/error' 
  },

  session: { 
    strategy: 'jwt', 
    maxAge: 8 * 60 * 60 
  },

  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) { 
      console.error(`🔴 [${code}]`, metadata); 
    },
    warn(code) { 
      console.warn(`🟡 [${code}]`); 
    },
    debug(code, metadata) { 
      console.log(`🔵 [${code}]`, metadata); 
    },
  },
};

export default NextAuth(authOptions);