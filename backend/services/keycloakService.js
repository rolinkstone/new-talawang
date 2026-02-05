const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const KEYCLOAK_CONFIG = {
    serverUrl: process.env.KEYCLOAK_SERVER_URL,
    realm: process.env.KEYCLOAK_REALM,
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'nextjs-local',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD
};

class KeycloakService {
    /**
     * Mendapatkan admin-cli token dari Keycloak
     */
    static async getAdminCliToken() {
        try {
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
     * Mendapatkan daftar user dengan role PPK dari Keycloak
     */
    static async getPPKUsersFromKeycloak() {
        let adminToken;
        try {
            adminToken = await this.getAdminCliToken();
            
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
            
            // 2. Ambil user yang memiliki role PPK
            const usersWithRoleUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${encodeURIComponent(ppkRole.name)}/users`;
            
            const usersResponse = await axios.get(usersWithRoleUrl, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                params: {
                    max: 100
                }
            });
            
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
                        
                        // Format nama
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
                            email_verified: userData.emailVerified
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
    static async getAllUsersAndFilterPPK() {
        let adminToken;
        try {
            adminToken = await this.getAdminCliToken();
            
            const usersUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users`;
            
            const response = await axios.get(usersUrl, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                params: {
                    max: 200
                }
            });
            
            const activeUsers = response.data.filter(user => user.enabled);
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
                            enabled: user.enabled
                        });
                    }
                } catch (userError) {
                    console.warn(`⚠️ Error checking roles for user ${user.id}:`, userError.message);
                    continue;
                }
            }
            
            return ppkUsers;
            
        } catch (error) {
            console.error('❌ Error in fallback method:', error.message);
            throw error;
        }
    }

    /**
     * Get PPK users (try primary method, fallback to secondary)
     */
    static async getPPKUsers() {
        try {
            return await this.getPPKUsersFromKeycloak();
        } catch (primaryError) {
            console.warn('⚠️ Primary method failed:', primaryError.message);
            try {
                return await this.getAllUsersAndFilterPPK();
            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError.message);
                throw new Error(`Gagal mendapatkan daftar PPK dari Keycloak. ${fallbackError.message}`);
            }
        }
    }
}

module.exports = KeycloakService;