const axios = require('axios');
const KEYCLOAK_CONFIG = require('../config/keycloak');

/**
 * Mendapatkan admin-cli token dari Keycloak menggunakan username/password
 */
async function getAdminCliToken() {
    try {
        console.log('👑 Getting admin-cli token...');
        
        if (!KEYCLOAK_CONFIG.adminUsername || !KEYCLOAK_CONFIG.adminPassword) {
            throw new Error('Admin username dan password harus dikonfigurasi');
        }
        
        const tokenUrl = `${KEYCLOAK_CONFIG.serverUrl}/realms/master/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', 'admin-cli');
        params.append('username', KEYCLOAK_CONFIG.adminUsername);
        params.append('password', KEYCLOAK_CONFIG.adminPassword);
        
        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000
        });
        
        console.log('✅ admin-cli token obtained');
        return response.data.access_token;
        
    } catch (error) {
        console.error('❌ Error getting admin-cli token:', error.message);
        if (error.response) {
            console.error('Keycloak response:', error.response.data);
        }
        throw new Error(`Gagal mendapatkan admin token: ${error.message}`);
    }
}

/**
 * Mendapatkan daftar user dengan role PPK dari Keycloak menggunakan admin-cli
 */
async function getPPKUsersFromKeycloak() {
    let adminToken;
    try {
        // Dapatkan admin token menggunakan admin-cli
        adminToken = await getAdminCliToken();
        
        console.log('🔍 Getting PPK users from Keycloak...');
        
        // 1. Cari role "ppk" di realm
        const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`;
        
        const rolesResponse = await axios.get(rolesUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        // Cari role PPK (case insensitive)
        const ppkRole = rolesResponse.data.find(role => 
            role.name.toLowerCase() === 'ppk' || 
            role.name.toLowerCase().includes('ppk')
        );
        
        if (!ppkRole) {
            console.log('⚠️ Role "ppk" tidak ditemukan di Keycloak');
            return [];
        }
        
        console.log(`✅ Found PPK role: ${ppkRole.name} (ID: ${ppkRole.id})`);
        
        // 2. Ambil user yang memiliki role PPK
        const usersWithRoleUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${encodeURIComponent(ppkRole.name)}/users`;
        
        const usersResponse = await axios.get(usersWithRoleUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            params: {
                max: 100 // Batasi jumlah user
            }
        });
        
        console.log(`✅ Found ${usersResponse.data.length} users with PPK role`);
        
        // 3. Ambil detail untuk setiap user
        const usersWithDetails = await Promise.all(
            usersResponse.data.map(async (user) => {
                try {
                    const userDetailUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${user.id}`;
                    
                    const userDetailResponse = await axios.get(userDetailUrl, {
                        headers: {
                            'Authorization': `Bearer ${adminToken}`
                        }
                    });
                    
                    const userData = userDetailResponse.data;
                    
                    // Gunakan firstName dan lastName sebagai nama, fallback ke username
                    let nama = '';
                    
                    // Prioritas 1: firstName + lastName
                    if (userData.firstName || userData.lastName) {
                        nama = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    }
                    // Prioritas 2: attributes.nama_lengkap (jika ada di attributes)
                    else if (userData.attributes?.nama_lengkap?.[0]) {
                        nama = userData.attributes.nama_lengkap[0];
                    }
                    // Prioritas 3: attributes.displayName (jika ada)
                    else if (userData.attributes?.displayName?.[0]) {
                        nama = userData.attributes.displayName[0];
                    }
                    // Prioritas 4: attributes.name (jika ada)
                    else if (userData.attributes?.name?.[0]) {
                        nama = userData.attributes.name[0];
                    }
                    // Fallback: username
                    else {
                        nama = userData.username || userData.email || 'N/A';
                    }
                    
                    return {
                        user_id: userData.id,
                        username: userData.username,
                        email: userData.email,
                        nama: nama,
                        nip: userData.attributes?.nip?.[0] || 
                             userData.attributes?.employee_id?.[0] || 
                             userData.attributes?.nomor_induk?.[0] || '',
                        jabatan: userData.attributes?.jabatan?.[0] || 
                                userData.attributes?.position?.[0] || 
                                userData.attributes?.title?.[0] || 'PPK',
                        unit_kerja: userData.attributes?.unit_kerja?.[0] || 
                                   userData.attributes?.department?.[0] || 
                                   userData.attributes?.organisasi?.[0] || '',
                        enabled: userData.enabled,
                        email_verified: userData.emailVerified,
                        // Tambahan atribut untuk debugging
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        attributes: userData.attributes
                    };
                    
                } catch (userError) {
                    console.error(`❌ Error fetching details for user ${user.id}:`, userError.message);
                    return null;
                }
            })
        );
        
        // Filter null results dan hanya user yang aktif
        const activeUsers = usersWithDetails
            .filter(user => user !== null && user.enabled)
            .sort((a, b) => a.nama.localeCompare(b.nama));
        
        console.log(`✅ Returning ${activeUsers.length} active PPK users`);
        
        return activeUsers;
        
    } catch (error) {
        console.error('❌ Error getting PPK users from Keycloak:', error.message);
        
        if (error.response) {
            console.error('Keycloak API Error:', {
                status: error.response.status,
                data: error.response.data
            });
            
            if (error.response.status === 401) {
                throw new Error('Kredensial admin salah atau token expired');
            }
        }
        
        throw error;
    }
}

/**
 * Fallback: Ambil semua user dan filter yang memiliki role PPK
 */
async function getAllUsersAndFilterPPK() {
    let adminToken;
    try {
        console.log('🔄 Fallback: Getting all users and filtering...');
        
        // Dapatkan admin token menggunakan admin-cli
        adminToken = await getAdminCliToken();
        
        const usersUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users`;
        
        const response = await axios.get(usersUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            params: {
                max: 200
            }
        });
        
        console.log(`✅ Found ${response.data.length} total users`);
        
        // Filter user yang aktif
        const activeUsers = response.data.filter(user => user.enabled);
        console.log(`✅ ${activeUsers.length} users are active`);
        
        // Cek role untuk setiap user
        const ppkUsers = [];
        
        for (const user of activeUsers) {
            try {
                // Ambil realm roles untuk user ini
                const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${user.id}/role-mappings/realm`;
                
                const rolesResponse = await axios.get(rolesUrl, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                
                const userRoles = rolesResponse.data.map(role => role.name.toLowerCase());
                
                // Cek apakah user memiliki role PPK
                if (userRoles.some(role => role === 'ppk' || role.includes('ppk'))) {
                    let nama = '';
                    
                    if (user.firstName || user.lastName) {
                        nama = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    }
                    else if (user.attributes?.nama_lengkap?.[0]) {
                        nama = user.attributes.nama_lengkap[0];
                    }
                    else if (user.attributes?.displayName?.[0]) {
                        nama = user.attributes.displayName[0];
                    }
                    else {
                        nama = user.username || user.email || 'N/A';
                    }
                    
                    ppkUsers.push({
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                        nama: nama,
                        nip: user.attributes?.nip?.[0] || 
                             user.attributes?.employee_id?.[0] || '',
                        jabatan: user.attributes?.jabatan?.[0] || 
                                user.attributes?.position?.[0] || 'PPK',
                        unit_kerja: user.attributes?.unit_kerja?.[0] || 
                                   user.attributes?.department?.[0] || '',
                        enabled: user.enabled,
                        first_name: user.firstName,
                        last_name: user.lastName
                    });
                }
            } catch (userError) {
                console.warn(`⚠️ Error checking roles for user ${user.id}:`, userError.message);
                continue;
            }
        }
        
        console.log(`✅ Found ${ppkUsers.length} PPK users via fallback method`);
        
        return ppkUsers;
        
    } catch (error) {
        console.error('❌ Error in fallback method:', error.message);
        throw error;
    }
}

/**
 * Helper untuk mengekstrak roles dari user object Keycloak
 */
function extractUserRoles(user) {
    console.log('🔍 Extracting roles from user object...');
    
    let roles = [];
    
    // 1. Dari user.role langsung
    if (user.role) {
        console.log('📌 Found roles in user.role:', user.role);
        roles = Array.isArray(user.role) ? user.role : [user.role];
    }
    // 2. Dari user.roles
    else if (user.roles && Array.isArray(user.roles)) {
        console.log('📌 Found roles in user.roles:', user.roles);
        roles = user.roles;
    }
    // 3. Dari resource_access (Keycloak standard)
    else if (user.resource_access) {
        console.log('📌 Found resource_access:', JSON.stringify(user.resource_access));
        
        // Cari di semua client
        for (const clientId in user.resource_access) {
            const client = user.resource_access[clientId];
            if (client && client.roles && Array.isArray(client.roles)) {
                console.log(`📌 Found roles in resource_access.${clientId}:`, client.roles);
                roles = roles.concat(client.roles);
            }
        }
    }
    // 4. Dari realm_access (Keycloak realm roles)
    else if (user.realm_access && user.realm_access.roles) {
        console.log('📌 Found roles in realm_access:', user.realm_access.roles);
        roles = roles.concat(user.realm_access.roles);
    }
    
    // 5. Jika masih kosong, cari di semua properti
    if (roles.length === 0) {
        console.log('🔍 Searching for roles in all properties...');
        for (const key in user) {
            const value = user[key];
            if (Array.isArray(value)) {
                const possibleRoles = value.filter(item => 
                    typeof item === 'string' && 
                    ['admin', 'ppk', 'kabalai', 'user'].some(role => 
                        item.toLowerCase().includes(role.toLowerCase())
                    )
                );
                if (possibleRoles.length > 0) {
                    console.log(`📌 Found possible roles in ${key}:`, possibleRoles);
                    roles = possibleRoles;
                    break;
                }
            }
        }
    }
    
    console.log('✅ Final extracted roles:', roles);
    return roles;
}

/**
 * Helper untuk menentukan role user
 */
function isUserAdmin(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.some(role => role.toLowerCase() === 'admin');
}

function isUserPPK(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.some(role => role.toLowerCase() === 'ppk');
}

function isUserKabalai(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.some(role => role.toLowerCase().includes('kabalai'));
}

function isRegularUser(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return !isUserAdmin(user) && !isUserPPK(user) && !isUserKabalai(user);
}

/**
 * Helper untuk mendapatkan user ID secara konsisten
 */
function getUserId(user) {
    return user.user_id || user.id || user.sub;
}

/**
 * Helper untuk mendapatkan username
 */
function getUsername(user) {
    return user.username || user.preferred_username || user.email || 'Unknown';
}

module.exports = {
    getAdminCliToken,
    getPPKUsersFromKeycloak,
    getAllUsersAndFilterPPK,
    extractUserRoles,
    isUserAdmin,
    isUserPPK,
    isUserKabalai,
    isRegularUser,
    getUserId,
    getUsername
};