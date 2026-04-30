// middleware/keycloakAuth.js
const { 
    extractUserRoles, 
    isUserAdmin, 
    isUserPPK, 
    isUserKabalai, 
    isRegularUser,
    getUserId,
    getUsername 
} = require('../utils/keycloakHelpers');

// ========== KEYCLOAK AUTH MIDDLEWARE ==========
const keycloakAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized - Silakan login terlebih dahulu',
            code: 'UNAUTHORIZED'
        });
    }
    
    // 1. Ekstrak roles dari berbagai kemungkinan lokasi di Keycloak
    req.user.extractedRoles = extractUserRoles(req.user);
    
    // 2. Tambahkan ke req.user.role untuk kompatibilitas
    if (req.user.extractedRoles && req.user.extractedRoles.length > 0) {
        req.user.role = req.user.extractedRoles;
    }
    
    // 3. Tambahkan user_id jika belum ada
    if (!req.user.user_id && req.user.id) {
        req.user.user_id = req.user.id;
    }
    if (!req.user.user_id && req.user.sub) {
        req.user.user_id = req.user.sub;
    }
    
    // 4. Tambahkan NIP dari preferred_username jika belum ada
    if (!req.user.nip && req.user.preferred_username) {
        req.user.nip = req.user.preferred_username;
    }
    
    // 5. Identifikasi role khusus untuk akses data
    req.user.isAdmin = isUserAdmin(req.user);
    req.user.isPPK = isUserPPK(req.user);
    req.user.isKabalai = isUserKabalai(req.user);
    req.user.isRegularUser = isRegularUser(req.user);
    
    console.log(`🔐 User ${getUsername(req.user)} mengakses ${req.method} ${req.path}`, {
        roles: req.user.extractedRoles,
        user_id: req.user.user_id,
        nip: req.user.nip,
        isAdmin: req.user.isAdmin,
        isPPK: req.user.isPPK,
        isKabalai: req.user.isKabalai,
        isRegularUser: req.user.isRegularUser
    });
    
    next();
};

// ========== FUNGSI UNTUK MEMBANGUN WHERE CLAUSE ==========
// middleware/keycloakAuth.js

const buildSingleItemWhereClause = (user, itemId, tableAlias = 'k') => {
    const isAdmin = user?.isAdmin || false;
    const isPPK = user?.isPPK || false;
    const isKabalai = user?.isKabalai || false;
    const userId = user?.user_id || user?.id || user?.sub;
    const userNip = user?.nip || '';
    
    console.log('🔧 Building single item WHERE clause:', {
        user: getUsername(user),
        roles: user?.extractedRoles,
        userId: userId,
        userNip: userNip,
        isAdmin: isAdmin,
        isPPK: isPPK,
        isKabalai: isKabalai,
        itemId: itemId,
        tableAlias: tableAlias
    });
    
    // Admin bisa lihat semua
    if (isAdmin) {
        console.log('👑 Admin: can access all data');
        return { 
            where: `WHERE ${tableAlias}.id = ?`, 
            params: [itemId] 
        };
    }
    
    // PPK bisa lihat kegiatan yang ppk_id = user_id
    if (isPPK && userId) {
        console.log('📋 PPK: can access own ppk data');
        return {
            where: `WHERE ${tableAlias}.id = ? AND ${tableAlias}.ppk_id = ?`,
            params: [itemId, userId]
        };
    }
    
    // Kabalai bisa lihat semua data
    if (isKabalai) {
        console.log('🏢 Kabalai: can access all data');
        return { 
            where: `WHERE ${tableAlias}.id = ?`, 
            params: [itemId] 
        };
    }
    
    // PERBAIKAN UNTUK REGULAR USER
    // Cek apakah user terdaftar sebagai pegawai di kegiatan tersebut
    const normalizedNip = String(userNip || '').replace(/\s/g, '');
    console.log(`👤 Regular User: checking if user NIP ${normalizedNip} is registered in activity ${itemId}`);
    
    return {
        where: `WHERE ${tableAlias}.id = ? AND EXISTS (
            SELECT 1 FROM nominatif_pegawai p 
            WHERE p.kegiatan_id = ${tableAlias}.id 
            AND REPLACE(p.nip, ' ', '') = ?
        )`,
        params: [itemId, normalizedNip]
    };
};

// ========== FUNGSI UNTUK MEMBANGUN WHERE CLAUSE UNTUK LIST ==========
const buildListWhereClause = (user, tableAlias = 'k') => {
    const isAdmin = user?.isAdmin || false;
    const isPPK = user?.isPPK || false;
    const isKabalai = user?.isKabalai || false;
    const userId = user?.user_id || user?.id || user?.sub;
    const userNip = user?.nip || '';
    
    // Admin bisa lihat semua
    if (isAdmin) {
        return { where: '', params: [] };
    }
    
    // PPK bisa lihat kegiatan yang ppk_id = user_id
    if (isPPK && userId) {
        return {
            where: `WHERE ${tableAlias}.ppk_id = ?`,
            params: [userId]
        };
    }
    
    // Kabalai bisa lihat semua (atau sesuai kebutuhan)
    if (isKabalai) {
        return { where: '', params: [] };
    }
    
    // Regular User: hanya lihat kegiatan yang dirinya terdaftar sebagai pegawai
    const normalizedNip = String(userNip || '').replace(/\s/g, '');
    return {
        where: `WHERE EXISTS (
            SELECT 1 FROM nominatif_pegawai p 
            WHERE p.kegiatan_id = ${tableAlias}.id 
            AND REPLACE(p.nip, ' ', '') = ?
        )`,
        params: [normalizedNip]
    };
};

module.exports = {
    keycloakAuth,
    buildSingleItemWhereClause,
    buildListWhereClause,
    getUserId,
    getUsername
};