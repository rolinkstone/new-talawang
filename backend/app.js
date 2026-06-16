const express = require('express');
const session = require('express-session');
const passport = require('passport');
const KeycloakStrategy = require('passport-keycloak');
const cors = require('cors');
require('dotenv').config({ path: '.env.local' });

// Import routes
const authRoutes = require('./routes/auth');
const keycloakRoutes = require('./routes/keycloak');
const kegiatanRoutes = require('./routes/kegiatan');
const kwitansiRoutes = require('./routes/kwitansi');
const searchRoutes = require('./routes/search');
const lpdRoutes = require('./routes/lpd');
const laporanRoutes = require('./routes/laporan');
const notifikasiRoutes = require('./routes/notifikasi');
const app = express();

// ========== MIDDLEWARE SETUP ==========
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// ========== KEYCLOAK PASSPORT CONFIGURATION ==========
const KEYCLOAK_CONFIG = {
    serverUrl: process.env.KEYCLOAK_SERVER_URL,
    realm: process.env.KEYCLOAK_REALM,
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'nextjs-local',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET
};

passport.use(new KeycloakStrategy({
    host: KEYCLOAK_CONFIG.serverUrl,
    realm: KEYCLOAK_CONFIG.realm,
    clientID: KEYCLOAK_CONFIG.clientId,
    clientSecret: KEYCLOAK_CONFIG.clientSecret,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/keycloak/callback`,
    authorizationURL: `${KEYCLOAK_CONFIG.serverUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/auth`,
    tokenURL: `${KEYCLOAK_CONFIG.serverUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`,
    userInfoURL: `${KEYCLOAK_CONFIG.serverUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/userinfo`
}, (accessToken, refreshToken, profile, done) => {
    console.log('🔑 Keycloak profile received:', profile);
    
    // Simpan user data di session
    const user = {
        id: profile.id || profile.sub,
        username: profile.preferred_username || profile.username,
        email: profile.email,
        firstName: profile.given_name || profile.firstName,
        lastName: profile.family_name || profile.lastName,
        fullName: profile.name,
        nip: profile.nip,
        roles: profile.realm_access?.roles || [],
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile
    };
    
    return done(null, user);
}));

// Serialize user
passport.serializeUser((user, done) => {
    console.log('💾 Serializing user:', user.username);
    done(null, user);
});

// Deserialize user
passport.deserializeUser((user, done) => {
    console.log('📖 Deserializing user:', user.username);
    done(null, user);
});

// ========== ROUTES SETUP ==========
app.use('/api/auth', authRoutes);
app.use('/api/keycloak', keycloakRoutes);
app.use('/api/kegiatan', kegiatanRoutes);
app.use('/api/kwitansi', kwitansiRoutes);  // TAMBAHKAN INI (jika belum ada)
app.use('/api/search', searchRoutes);
app.use('/api/lpd', lpdRoutes);  // TAMBAHKAN INI
app.use('/api/laporan', laporanRoutes);
app.use('/api/notifikasi', notifikasiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: [
            '/api/auth',
            '/api/keycloak', 
            '/api/kegiatan',
            '/api/kwitansi',
            '/api/search',
            '/api/lpd',
            '/api/health'
        ]
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔑 Keycloak configured for realm: ${KEYCLOAK_CONFIG.realm}`);
    console.log(`🌐 Backend URL: ${process.env.BACKEND_URL || 'http://localhost:5000'}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`📋 LPD routes: /api/lpd`);
});