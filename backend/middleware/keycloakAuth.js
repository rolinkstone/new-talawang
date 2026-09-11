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

// ========== HELPER FUNGSI UNTUK MENDAPATKAN NIP ==========
const getUserNip = (user) => {
    if (!user) return '';
    
    console.log('🔍 Extracting NIP from user:', {
        hasNip: !!user.nip,
        hasNipRaw: !!user.nip_raw,
        hasPreferredUsername: !!user.preferred_username,
        hasAttributes: !!user.attributes
    });
    
    // Priority 1: langsung dari user.nip
    if (user.nip && user.nip !== '') {
        console.log('✅ Found NIP from user.nip:', user.nip);
        return user.nip;
    }
    
    // Priority 2: dari user.nip_raw
    if (user.nip_raw && user.nip_raw !== '') {
        console.log('✅ Found NIP from user.nip_raw:', user.nip_raw);
        return user.nip_raw;
    }
    
    // Priority 3: dari preferred_username (jika berupa angka/NIP)
    if (user.preferred_username && /^\d+$/.test(String(user.preferred_username).replace(/\s/g, ''))) {
        const nip = String(user.preferred_username).replace(/\s/g, '');
        console.log('✅ Found NIP from preferred_username:', nip);
        return nip;
    }
    
    // Priority 4: dari attributes.nip
    if (user.attributes) {
        if (user.attributes.nip) {
            const nip = Array.isArray(user.attributes.nip) ? user.attributes.nip[0] : user.attributes.nip;
            if (nip) {
                console.log('✅ Found NIP from attributes.nip:', nip);
                return nip;
            }
        }
        if (user.attributes.NIP) {
            const nip = Array.isArray(user.attributes.NIP) ? user.attributes.NIP[0] : user.attributes.NIP;
            if (nip) {
                console.log('✅ Found NIP from attributes.NIP:', nip);
                return nip;
            }
        }
        if (user.attributes.employeeId) {
            const nip = Array.isArray(user.attributes.employeeId) ? user.attributes.employeeId[0] : user.attributes.employeeId;
            if (nip) {
                console.log('✅ Found NIP from attributes.employeeId:', nip);
                return nip;
            }
        }
    }
    
    // Priority 5: dari user.username (jika berupa angka)
    if (user.username && /^\d+$/.test(String(user.username).replace(/\s/g, ''))) {
        const nip = String(user.username).replace(/\s/g, '');
        console.log('✅ Found NIP from username:', nip);
        return nip;
    }
    
    // Priority 6: dari user.id (jika berupa angka)
    if (user.id && /^\d+$/.test(String(user.id).replace(/\s/g, ''))) {
        const nip = String(user.id).replace(/\s/g, '');
        console.log('✅ Found NIP from user.id:', nip);
        return nip;
    }
    
    // Fallback: log warning
    console.warn(`⚠️ User ${getUsername(user)} tidak memiliki NIP, akan menggunakan username sebagai fallback`);
    return user.username || user.preferred_username || '';
};

// ========== KEYCLOAK AUTH MIDDLEWARE ==========
const keycloakAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized - Silakan login terlebih dahulu',
            code: 'UNAUTHORIZED'
        });
    }
    
    // Log raw user object untuk debugging
    console.log('📋 Raw user object received:', {
        id: req.user.id,
        sub: req.user.sub,
        username: req.user.username,
        preferred_username: req.user.preferred_username,
        email: req.user.email,
        nip: req.user.nip,
        role: req.user.role,
        roles: req.user.roles,
        attributes: req.user.attributes
    });
    
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
    
    // 4. PERBAIKAN: Ambil NIP dengan benar
    const extractedNip = getUserNip(req.user);
    req.user.nip = extractedNip;
    
    // 5. Identifikasi role khusus untuk akses data
    req.user.isAdmin = isUserAdmin(req.user);
    req.user.isPPK = isUserPPK(req.user);
    req.user.isKabalai = isUserKabalai(req.user);
    req.user.isRegularUser = isRegularUser(req.user);
    
    console.log(`🔐 User ${getUsername(req.user)} mengakses ${req.method} ${req.path}`);
    console.log(`   Roles: ${JSON.stringify(req.user.extractedRoles)}`);
    console.log(`   User ID: ${req.user.user_id}`);
    console.log(`   NIP: ${req.user.nip || '-'}`);
    console.log(`   isAdmin: ${req.user.isAdmin}, isPPK: ${req.user.isPPK}, isKabalai: ${req.user.isKabalai}, isRegularUser: ${req.user.isRegularUser}`);
    
    next();
};

// ========== FUNGSI UNTUK MEMBANGUN WHERE CLAUSE UNTUK SINGLE ITEM ==========
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
    
    // Regular User: cek apakah user terdaftar sebagai pegawai
    const normalizedNip = String(userNip || '').replace(/\s/g, '');
    console.log(`👤 Regular User: checking if user NIP ${normalizedNip} is registered in activity ${itemId}`);
    
    if (!normalizedNip) {
        console.warn(`⚠️ Regular user ${getUsername(user)} tidak memiliki NIP, akses ditolak`);
        return {
            where: `WHERE 1 = 0`,
            params: []
        };
    }
    
    return {
        where: `WHERE ${tableAlias}.id = ? AND EXISTS (
            SELECT 1 FROM accounting.nominatif_pegawai p 
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
    
    // Kabalai bisa lihat semua
    if (isKabalai) {
        return { where: '', params: [] };
    }
    
    // Regular User: hanya lihat kegiatan yang dirinya terdaftar sebagai pegawai
    const normalizedNip = String(userNip || '').replace(/\s/g, '');
    
    if (!normalizedNip) {
        console.warn(`⚠️ Regular user ${getUsername(user)} tidak memiliki NIP, tidak ada akses`);
        return {
            where: `WHERE 1 = 0`,
            params: []
        };
    }
    
    return {
        where: `WHERE EXISTS (
            SELECT 1 FROM accounting.nominatif_pegawai p 
            WHERE p.kegiatan_id = ${tableAlias}.id 
            AND REPLACE(p.nip, ' ', '') = ?
        )`,
        params: [normalizedNip]
    };
};

// ========== FUNGSI UNTUK VALIDASI AKSES ==========
const checkAccess = (user, kegiatan) => {
    const isAdmin = user?.isAdmin || false;
    const isPPK = user?.isPPK || false;
    const isKabalai = user?.isKabalai || false;
    const userId = user?.user_id || user?.id || user?.sub;
    const userNip = user?.nip || '';
    const normalizedUserNip = String(userNip || '').replace(/\s/g, '');
    
    // Admin: selalu punya akses
    if (isAdmin) {
        return true;
    }
    
    // PPK: hanya punya akses jika ppk_id sesuai
    if (isPPK && kegiatan.ppk_id === userId) {
        return true;
    }
    
    // Kabalai: selalu punya akses
    if (isKabalai) {
        return true;
    }
    
    // Regular User: hanya punya akses jika terdaftar sebagai pegawai
    if (kegiatan.pegawai) {
        const isPegawai = kegiatan.pegawai.some(p => 
            String(p.nip || '').replace(/\s/g, '') === normalizedUserNip
        );
        return isPegawai;
    }
    
    return false;
};

// Juga export fungsi getUserNip
module.exports = {
    keycloakAuth,
    buildSingleItemWhereClause,
    buildListWhereClause,
    checkAccess,
    getUserId,
    getUsername,
    getUserNip  // Pastikan ini diexport
};