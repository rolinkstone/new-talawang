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
 * Helper untuk mendapatkan NIP user secara konsisten
 */
function getUserNip(user) {
    if (!user) return '';
    
    // Priority 1: langsung dari user.nip
    if (user.nip) return user.nip;
    
    // Priority 2: dari preferred_username (jika berupa angka/NIP)
    if (user.preferred_username && /^\d+$/.test(user.preferred_username)) {
        return user.preferred_username;
    }
    
    // Priority 3: dari attributes
    if (user.attributes) {
        if (user.attributes.nip) {
            return Array.isArray(user.attributes.nip) ? user.attributes.nip[0] : user.attributes.nip;
        }
        if (user.attributes.NIP) {
            return Array.isArray(user.attributes.NIP) ? user.attributes.NIP[0] : user.attributes.NIP;
        }
        if (user.attributes.employeeId) {
            return Array.isArray(user.attributes.employeeId) ? user.attributes.employeeId[0] : user.attributes.employeeId;
        }
        if (user.attributes.nomor_induk) {
            return Array.isArray(user.attributes.nomor_induk) ? user.attributes.nomor_induk[0] : user.attributes.nomor_induk;
        }
    }
    
    // Priority 4: dari user.id (jika berupa angka)
    if (user.id && /^\d+$/.test(user.id)) {
        return user.id;
    }
    
    // Priority 5: dari user.sub (jika berupa angka)
    if (user.sub && /^\d+$/.test(user.sub)) {
        return user.sub;
    }
    
    // Fallback ke username (tapi log warning)
    console.warn(`⚠️ Tidak dapat menemukan NIP untuk user ${getUsername(user)}, menggunakan username sebagai fallback`);
    return user.username || user.preferred_username || '';
}

/**
 * Mendapatkan daftar user dengan role PPK dari Keycloak menggunakan admin-cli
 */
async function getPPKUsersFromKeycloak() {
    let adminToken;
    try {
        adminToken = await getAdminCliToken();
        
        console.log('🔍 Getting PPK users from Keycloak...');
        
        const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`;
        
        const rolesResponse = await axios.get(rolesUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const ppkRole = rolesResponse.data.find(role => 
            role.name.toLowerCase() === 'ppk' || 
            role.name.toLowerCase().includes('ppk')
        );
        
        if (!ppkRole) {
            console.log('⚠️ Role "ppk" tidak ditemukan di Keycloak');
            return [];
        }
        
        console.log(`✅ Found PPK role: ${ppkRole.name} (ID: ${ppkRole.id})`);
        
        const usersWithRoleUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${encodeURIComponent(ppkRole.name)}/users`;
        
        const usersResponse = await axios.get(usersWithRoleUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            params: {
                max: 100
            }
        });
        
        console.log(`✅ Found ${usersResponse.data.length} users with PPK role`);
        
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
                    
                    let nama = '';
                    
                    if (userData.firstName || userData.lastName) {
                        nama = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    }
                    else if (userData.attributes?.nama_lengkap?.[0]) {
                        nama = userData.attributes.nama_lengkap[0];
                    }
                    else if (userData.attributes?.displayName?.[0]) {
                        nama = userData.attributes.displayName[0];
                    }
                    else if (userData.attributes?.name?.[0]) {
                        nama = userData.attributes.name[0];
                    }
                    else {
                        nama = userData.username || userData.email || 'N/A';
                    }
                    
                    // PERBAIKAN: Ambil NIP dari berbagai sumber
                    let nip = '';
                    if (userData.attributes?.nip?.[0]) nip = userData.attributes.nip[0];
                    else if (userData.attributes?.NIP?.[0]) nip = userData.attributes.NIP[0];
                    else if (userData.attributes?.employee_id?.[0]) nip = userData.attributes.employee_id[0];
                    else if (userData.attributes?.nomor_induk?.[0]) nip = userData.attributes.nomor_induk[0];
                    else if (userData.preferred_username && /^\d+$/.test(userData.preferred_username)) nip = userData.preferred_username;
                    
                    return {
                        user_id: userData.id,
                        username: userData.username,
                        email: userData.email,
                        nama: nama,
                        nip: nip,
                        jabatan: userData.attributes?.jabatan?.[0] || 
                                userData.attributes?.position?.[0] || 
                                userData.attributes?.title?.[0] || 'PPK',
                        unit_kerja: userData.attributes?.unit_kerja?.[0] || 
                                   userData.attributes?.department?.[0] || 
                                   userData.attributes?.organisasi?.[0] || '',
                        enabled: userData.enabled,
                        email_verified: userData.emailVerified,
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
 * Mendapatkan daftar user dengan role Bendahara dari Keycloak
 */
async function getBendaharaUsersFromKeycloak() {
    let adminToken;
    try {
        adminToken = await getAdminCliToken();
        
        console.log('🔍 Getting Bendahara users from Keycloak...');
        
        const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`;
        
        const rolesResponse = await axios.get(rolesUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const bendaharaRole = rolesResponse.data.find(role => 
            role.name.toLowerCase() === 'bendahara' || 
            role.name.toLowerCase().includes('bendahara')
        );
        
        if (!bendaharaRole) {
            console.log('⚠️ Role "bendahara" tidak ditemukan di Keycloak');
            return [];
        }
        
        console.log(`✅ Found Bendahara role: ${bendaharaRole.name} (ID: ${bendaharaRole.id})`);
        
        const usersWithRoleUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${encodeURIComponent(bendaharaRole.name)}/users`;
        
        const usersResponse = await axios.get(usersWithRoleUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            params: {
                max: 100
            }
        });
        
        console.log(`✅ Found ${usersResponse.data.length} users with Bendahara role`);
        
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
                    
                    let nama = '';
                    
                    if (userData.firstName || userData.lastName) {
                        nama = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    }
                    else if (userData.attributes?.nama_lengkap?.[0]) {
                        nama = userData.attributes.nama_lengkap[0];
                    }
                    else if (userData.attributes?.displayName?.[0]) {
                        nama = userData.attributes.displayName[0];
                    }
                    else if (userData.attributes?.name?.[0]) {
                        nama = userData.attributes.name[0];
                    }
                    else {
                        nama = userData.username || userData.email || 'N/A';
                    }
                    
                    // PERBAIKAN: Ambil NIP dari berbagai sumber
                    let nip = '';
                    if (userData.attributes?.nip?.[0]) nip = userData.attributes.nip[0];
                    else if (userData.attributes?.NIP?.[0]) nip = userData.attributes.NIP[0];
                    else if (userData.attributes?.employee_id?.[0]) nip = userData.attributes.employee_id[0];
                    else if (userData.attributes?.nomor_induk?.[0]) nip = userData.attributes.nomor_induk[0];
                    else if (userData.preferred_username && /^\d+$/.test(userData.preferred_username)) nip = userData.preferred_username;
                    
                    return {
                        user_id: userData.id,
                        username: userData.username,
                        email: userData.email,
                        nama: nama,
                        nip: nip,
                        jabatan: userData.attributes?.jabatan?.[0] || 
                                userData.attributes?.position?.[0] || 
                                userData.attributes?.title?.[0] || 'Bendahara',
                        unit_kerja: userData.attributes?.unit_kerja?.[0] || 
                                   userData.attributes?.department?.[0] || 
                                   userData.attributes?.organisasi?.[0] || '',
                        enabled: userData.enabled,
                        email_verified: userData.emailVerified,
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
        
        const activeUsers = usersWithDetails
            .filter(user => user !== null && user.enabled)
            .sort((a, b) => a.nama.localeCompare(b.nama));
        
        console.log(`✅ Returning ${activeUsers.length} active Bendahara users`);
        
        return activeUsers;
        
    } catch (error) {
        console.error('❌ Error getting Bendahara users from Keycloak:', error.message);
        
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
        
        const activeUsers = response.data.filter(user => user.enabled);
        console.log(`✅ ${activeUsers.length} users are active`);
        
        const ppkUsers = [];
        
        for (const user of activeUsers) {
            try {
                const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${user.id}/role-mappings/realm`;
                
                const rolesResponse = await axios.get(rolesUrl, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                
                const userRoles = rolesResponse.data.map(role => role.name.toLowerCase());
                
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
                    
                    let nip = '';
                    if (user.attributes?.nip?.[0]) nip = user.attributes.nip[0];
                    else if (user.attributes?.NIP?.[0]) nip = user.attributes.NIP[0];
                    else if (user.attributes?.employee_id?.[0]) nip = user.attributes.employee_id[0];
                    
                    ppkUsers.push({
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                        nama: nama,
                        nip: nip,
                        jabatan: user.attributes?.jabatan?.[0] || 'PPK',
                        unit_kerja: user.attributes?.unit_kerja?.[0] || '',
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
 * Fallback: Ambil semua user dan filter yang memiliki role Bendahara
 */
async function getAllUsersAndFilterBendahara() {
    let adminToken;
    try {
        console.log('🔄 Fallback: Getting all users and filtering for Bendahara...');
        
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
        
        const activeUsers = response.data.filter(user => user.enabled);
        console.log(`✅ ${activeUsers.length} users are active`);
        
        const bendaharaUsers = [];
        
        for (const user of activeUsers) {
            try {
                const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${user.id}/role-mappings/realm`;
                
                const rolesResponse = await axios.get(rolesUrl, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                
                const userRoles = rolesResponse.data.map(role => role.name.toLowerCase());
                
                if (userRoles.some(role => role === 'bendahara' || role.includes('bendahara'))) {
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
                    
                    let nip = '';
                    if (user.attributes?.nip?.[0]) nip = user.attributes.nip[0];
                    else if (user.attributes?.NIP?.[0]) nip = user.attributes.NIP[0];
                    else if (user.attributes?.employee_id?.[0]) nip = user.attributes.employee_id[0];
                    
                    bendaharaUsers.push({
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                        nama: nama,
                        nip: nip,
                        jabatan: user.attributes?.jabatan?.[0] || 'Bendahara',
                        unit_kerja: user.attributes?.unit_kerja?.[0] || '',
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
        
        console.log(`✅ Found ${bendaharaUsers.length} Bendahara users via fallback method`);
        
        return bendaharaUsers;
        
    } catch (error) {
        console.error('❌ Error in fallback method for Bendahara:', error.message);
        throw error;
    }
}

/**
 * Helper untuk mengekstrak roles dari user object Keycloak
 */
function extractUserRoles(user) {
    console.log('🔍 Extracting roles from user object...');
    
    let roles = [];
    
    if (user.role) {
        console.log('📌 Found roles in user.role:', user.role);
        roles = Array.isArray(user.role) ? user.role : [user.role];
    }
    else if (user.roles && Array.isArray(user.roles)) {
        console.log('📌 Found roles in user.roles:', user.roles);
        roles = user.roles;
    }
    else if (user.resource_access) {
        console.log('📌 Found resource_access:', JSON.stringify(user.resource_access));
        
        for (const clientId in user.resource_access) {
            const client = user.resource_access[clientId];
            if (client && client.roles && Array.isArray(client.roles)) {
                console.log(`📌 Found roles in resource_access.${clientId}:`, client.roles);
                roles = roles.concat(client.roles);
            }
        }
    }
    else if (user.realm_access && user.realm_access.roles) {
        console.log('📌 Found roles in realm_access:', user.realm_access.roles);
        roles = roles.concat(user.realm_access.roles);
    }
    
    if (roles.length === 0) {
        console.log('🔍 Searching for roles in all properties...');
        for (const key in user) {
            const value = user[key];
            if (Array.isArray(value)) {
                const possibleRoles = value.filter(item => 
                    typeof item === 'string' && 
                    ['admin', 'ppk', 'kabalai', 'bendahara', 'user'].some(role => 
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

function isUserBendahara(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.some(role => role.toLowerCase() === 'bendahara');
}

function isRegularUser(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return !isUserAdmin(user) && !isUserPPK(user) && !isUserKabalai(user) && !isUserBendahara(user);
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
    getBendaharaUsersFromKeycloak,
    getAllUsersAndFilterPPK,
    getAllUsersAndFilterBendahara,
    extractUserRoles,
    isUserAdmin,
    isUserPPK,
    isUserKabalai,
    isUserBendahara,
    isRegularUser,
    getUserId,
    getUsername,
    getUserNip  // TAMBAHKAN fungsi getUserNip ke exports
};