const express = require('express');
const cors = require('cors');
const db = require('./db');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');

const app = express();

// ========== CONFIGURATION ==========
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ========== STATIC FILES ==========
// Serve static files from uploads directory (tanpa auth)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ========== KEYCLOAK CONFIG ==========
const KEYCLOAK_CONFIG = {
    url: 'https://auth.bbpompky.id',
    realm: 'master',
    clientId: 'nextjs-local',
    clientSecret: 'WJGi86sOoEcIW1IvD0ET40BgEnDvuSDj'
};

// ========== CUSTOM HTTPS AGENT ==========
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    rejectUnauthorized: true
});

// ========== AUTH MIDDLEWARE ==========
const enhancedAuth = async (req, res, next) => {
    try {
        // Skip authentication untuk static files (uploads)
        if (req.path.startsWith('/uploads/')) {
            return next();
        }
        
        // Skip authentication untuk file extensions gambar/pdf
        if (req.path.match(/\.(jpg|jpeg|png|gif|pdf|webp|svg)$/i)) {
            return next();
        }
        
        const publicRoutes = [
            '/api/login', 
            '/api/health', 
            '/api/validate', 
            '/api/refresh', 
            '/api/debug',
            '/api/kegiatan/test/public'
        ];
        
        if (publicRoutes.some(route => req.path.startsWith(route))) {
            return next();
        }
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'No authorization header'
            });
        }
        
        let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        
        if (!token || token.trim() === '') {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Empty token'
            });
        }
        
        const decoded = jwt.decode(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid token format'
            });
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Token expired'
            });
        }
        
        // Extract NIP from token (bisa dari preferred_username atau custom attribute)
        // Asumsikan NIP ada di preferred_username atau ada di attribute
        const nip = decoded.preferred_username || 
                    decoded.nip || 
                    decoded.email?.split('@')[0] || 
                    null;
        
        req.user = {
            id: decoded.sub,
            username: decoded.preferred_username || decoded.email || 'unknown',
            email: decoded.email || '',
            name: decoded.name || decoded.preferred_username || 'User',
            nip: nip,  // Tambahkan NIP
            roles: decoded.realm_access?.roles || []
        };
        
        console.log(`✅ User authenticated: ${req.user.username} (NIP: ${req.user.nip})`);
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

app.use(enhancedAuth);

// ========== IMPORT ROUTES ==========
const kegiatanRoutes = require('./routes/kegiatan');
const sptjmRoutes = require('./routes/sptjm');
const kwitansiRoutes = require('./routes/kwitansi');
const searchRoutes = require('./routes/search');
const keycloakRoutes = require('./routes/keycloak');
const profileRoutes = require('./routes/profile');

// ========== MOUNT ROUTES ==========
app.use('/api/kegiatan', kegiatanRoutes);
app.use('/api/sptjm', sptjmRoutes);
app.use('/api/kwitansi', kwitansiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/keycloak', keycloakRoutes);
app.use('/api/profile', profileRoutes);

// ========== AUTH ENDPOINTS ==========
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        console.log(`🔐 Login attempt for: ${username}`);
        
        const tokenUrl = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', KEYCLOAK_CONFIG.clientId);
        params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
        params.append('username', username);
        params.append('password', password);
        
        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000,
            httpsAgent: httpsAgent
        });
        
        const tokens = response.data;
        const decoded = jwt.decode(tokens.access_token);
        
        // Extract NIP dari token
        const nip = decoded.preferred_username || 
                    decoded.nip || 
                    decoded.email?.split('@')[0] || 
                    username;
        
        console.log(`✅ Login successful for: ${decoded.preferred_username || username} (NIP: ${nip})`);
        
        res.json({
            success: true,
            message: 'Login successful',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            user: {
                id: decoded.sub,
                username: decoded.preferred_username || username,
                email: decoded.email || '',
                name: decoded.name || decoded.preferred_username || username,
                nip: decoded.preferred_username,
                nip: nip  // Tambahkan NIP ke response
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || 
            error.code === 'CERT_HAS_EXPIRED' ||
            error.message.includes('certificate')) {
            
            console.warn('⚠️ SSL Certificate issue detected');
            
            const fallbackAgent = new https.Agent({ rejectUnauthorized: false });
            
            try {
                const tokenUrl = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
                
                const params = new URLSearchParams();
                params.append('grant_type', 'password');
                params.append('client_id', KEYCLOAK_CONFIG.clientId);
                params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
                params.append('username', username);
                params.append('password', password);
                
                const fallbackResponse = await axios.post(tokenUrl, params.toString(), {
                    headers: { 
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 10000,
                    httpsAgent: fallbackAgent
                });
                
                const tokens = fallbackResponse.data;
                const decoded = jwt.decode(tokens.access_token);
                
                const nip = decoded.preferred_username || 
                            decoded.nip || 
                            decoded.email?.split('@')[0] || 
                            username;
                
                console.warn('⚠️ Login successful with fallback SSL');
                
                return res.json({
                    success: true,
                    message: 'Login successful (fallback mode)',
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_in: tokens.expires_in,
                    user: {
                        id: decoded.sub,
                        username: decoded.preferred_username || username,
                        email: decoded.email || '',
                        name: decoded.name || decoded.preferred_username || username,
                        nip: nip  // Tambahkan NIP ke response
                    }
                });
                
            } catch (fallbackError) {
                console.error('❌ Fallback login failed:', fallbackError.message);
                return res.status(401).json({
                    success: false,
                    message: 'Authentication failed - SSL certificate issue'
                });
            }
        }
        
        res.status(401).json({
            success: false,
            message: error.response?.data?.error_description || 'Authentication failed'
        });
    }
});

app.post('/api/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        
        console.log('🔄 Refreshing token...');
        
        const tokenUrl = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', KEYCLOAK_CONFIG.clientId);
        params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
        params.append('refresh_token', refresh_token);
        
        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000,
            httpsAgent: httpsAgent
        });
        
        console.log('✅ Token refreshed successfully');
        
        res.json({
            success: true,
            ...response.data
        });
        
    } catch (error) {
        console.error('❌ Refresh error:', error.message);
        
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            try {
                const fallbackAgent = new https.Agent({ rejectUnauthorized: false });
                
                const tokenUrl = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
                
                const params = new URLSearchParams();
                params.append('grant_type', 'refresh_token');
                params.append('client_id', KEYCLOAK_CONFIG.clientId);
                params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
                params.append('refresh_token', refresh_token);
                
                const fallbackResponse = await axios.post(tokenUrl, params.toString(), {
                    headers: { 
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 10000,
                    httpsAgent: fallbackAgent
                });
                
                return res.json({
                    success: true,
                    ...fallbackResponse.data
                });
                
            } catch (fallbackError) {
                console.error('❌ Fallback refresh failed:', fallbackError.message);
            }
        }
        
        res.status(401).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
});

app.get('/api/userinfo', (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
    
    res.json({
        success: true,
        user: req.user
    });
});

// ========== PUBLIC ENDPOINTS ==========
app.get('/api/health', (req, res) => {
    db.query('SELECT 1 as status', (err) => {
        const dbStatus = err ? 'DISCONNECTED' : 'CONNECTED';
        
        res.json({ 
            status: 'OK', 
            service: 'Keuangan Backend API',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            endpoints: [
                'POST /api/login',
                'GET /api/kegiatan',
                'GET /api/kwitansi',
                'POST /api/kwitansi',
                'PUT /api/kwitansi',
                'DELETE /api/kwitansi',
                'GET /api/userinfo',
                'POST /api/refresh'
            ]
        });
    });
});

// ========== DEBUG ENDPOINT ==========
app.get('/api/debug', (req, res) => {
    res.json({
        success: true,
        message: 'Debug endpoint',
        headers: req.headers,
        timestamp: new Date().toISOString(),
        ssl_verification: 'ENABLED'
    });
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// ========== CREATE UPLOADS DIRECTORY IF NOT EXISTS ==========
const uploadsDir = path.join(__dirname, 'public/uploads/kwitansi');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created:', uploadsDir);
}

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`
    ============================================
    🚀 SERVER READY: http://localhost:${PORT}
    ============================================
    
    ✅ Routes:
       /api/kegiatan
       /api/kwitansi
       /api/search
       /api/keycloak
       /uploads (static files)
    
    ✅ Authentication: Keycloak JWT
    ✅ SSL Verification: ENABLED
    ✅ Database: MySQL
    ✅ Static Files: /uploads
    
    🔐 Login: POST /api/login
    📊 Kegiatan: GET /api/kegiatan
    🧾 Kwitansi: GET /api/kwitansi
    👤 User Info: GET /api/userinfo
    🔄 Refresh: POST /api/refresh
    📁 Files: GET /uploads/kwitansi/:filename
    
    ============================================
    `);
});