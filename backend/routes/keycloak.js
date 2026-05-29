const express = require('express');
const router = express.Router();
const { keycloakAuth, getUsername } = require('../middleware/keycloakAuth');
const { 
    getPPKUsersFromKeycloak, 
    getAllUsersAndFilterPPK,
    getBendaharaUsersFromKeycloak,
    getAllUsersAndFilterBendahara
} = require('../utils/keycloakHelpers');

// ========== PPK MANAGEMENT ROUTES ==========

// GET - Daftar PPK dari Keycloak
router.get('/ppk/list', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📋 ${username} mengakses daftar PPK`);
    
    try {
        console.log('🔐 Attempting to get PPK list from Keycloak...');
        
        let ppkUsers;
        try {
            ppkUsers = await getPPKUsersFromKeycloak();
        } catch (primaryError) {
            console.warn('⚠️ Primary method failed:', primaryError.message);
            
            try {
                console.log('🔄 Trying fallback method...');
                ppkUsers = await getAllUsersAndFilterPPK();
            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError.message);
                throw new Error(`Gagal mendapatkan daftar PPK dari Keycloak. ${fallbackError.message}`);
            }
        }
        
        if (!ppkUsers || ppkUsers.length === 0) {
            console.log('⚠️ Tidak ada user PPK ditemukan di Keycloak');
            return res.status(200).json({
                success: true,
                message: 'Tidak ada user dengan role PPK ditemukan di sistem',
                data: [],
                count: 0,
                source: 'keycloak'
            });
        }
        
        console.log(`✅ Successfully retrieved ${ppkUsers.length} PPK users`);
        
        const formattedUsers = ppkUsers.map(user => ({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            nama: user.nama,
            nip: user.nip,
            jabatan: user.jabatan || 'PPK',
            unit_kerja: user.unit_kerja || '',
            enabled: user.enabled,
            email_verified: user.email_verified
        }));
        
        return res.status(200).json({
            success: true,
            message: 'Daftar PPK berhasil diambil dari Keycloak',
            data: formattedUsers,
            count: formattedUsers.length,
            source: 'keycloak'
        });
        
    } catch (error) {
        console.error('❌ Error fetching PPK list:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar PPK dari Keycloak',
            error: error.message
        });
    }
});

// GET - Search PPK berdasarkan nama atau NIP
router.get('/ppk/search', keycloakAuth, async (req, res) => {
    const { query } = req.query;
    const username = getUsername(req.user);
    
    console.log(`🔍 ${username} mencari PPK dengan query: ${query}`);
    
    if (!query || query.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Query pencarian minimal 2 karakter'
        });
    }
    
    try {
        let ppkUsers;
        try {
            ppkUsers = await getPPKUsersFromKeycloak();
        } catch (error) {
            console.warn('⚠️ Primary method failed, trying fallback:', error.message);
            ppkUsers = await getAllUsersAndFilterPPK();
        }
        
        if (!ppkUsers || ppkUsers.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Tidak ada data PPK ditemukan',
                data: [],
                count: 0
            });
        }
        
        const searchTerm = query.toLowerCase();
        const filteredPPK = ppkUsers.filter(ppk => 
            ppk.nama.toLowerCase().includes(searchTerm) ||
            (ppk.nip && ppk.nip.toLowerCase().includes(searchTerm)) ||
            (ppk.email && ppk.email.toLowerCase().includes(searchTerm)) ||
            (ppk.jabatan && ppk.jabatan.toLowerCase().includes(searchTerm))
        );
        
        console.log(`✅ Found ${filteredPPK.length} PPK matching search`);
        
        res.status(200).json({
            success: true,
            message: 'Pencarian PPK berhasil',
            data: filteredPPK,
            count: filteredPPK.length,
            search_query: query
        });
        
    } catch (error) {
        console.error('❌ Error searching PPK:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan pencarian PPK',
            error: error.message
        });
    }
});

// GET - Detail PPK berdasarkan ID
router.get('/ppk/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    
    console.log(`👤 ${username} mengakses detail PPK ID: ${id}`);
    
    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'ID PPK tidak valid'
        });
    }
    
    try {
        let ppkUsers;
        try {
            ppkUsers = await getPPKUsersFromKeycloak();
        } catch (error) {
            console.warn('⚠️ Primary method failed, trying fallback:', error.message);
            ppkUsers = await getAllUsersAndFilterPPK();
        }
        
        const foundPPK = ppkUsers.find(ppk => ppk.user_id === id);
        
        if (!foundPPK) {
            return res.status(404).json({
                success: false,
                message: 'PPK tidak ditemukan'
            });
        }
        
        console.log(`✅ Found PPK: ${foundPPK.nama}`);
        
        res.status(200).json({
            success: true,
            message: 'Detail PPK berhasil diambil',
            data: foundPPK
        });
        
    } catch (error) {
        console.error('❌ Error fetching PPK detail:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail PPK',
            error: error.message
        });
    }
});

// ========== BENDAHARA MANAGEMENT ROUTES ==========

// GET - Daftar Bendahara dari Keycloak
router.get('/bendahara/list', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`📋 ${username} mengakses daftar Bendahara`);
    
    try {
        console.log('🔐 Attempting to get Bendahara list from Keycloak...');
        
        let bendaharaUsers;
        try {
            // Coba metode utama
            bendaharaUsers = await getBendaharaUsersFromKeycloak();
        } catch (primaryError) {
            console.warn('⚠️ Primary method failed:', primaryError.message);
            
            // Coba metode fallback
            try {
                console.log('🔄 Trying fallback method...');
                bendaharaUsers = await getAllUsersAndFilterBendahara();
            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError.message);
                // Return empty array instead of error
                bendaharaUsers = [];
            }
        }
        
        if (!bendaharaUsers || bendaharaUsers.length === 0) {
            console.log('⚠️ Tidak ada user Bendahara ditemukan di Keycloak');
            return res.status(200).json({
                success: true,
                message: 'Tidak ada user dengan role Bendahara ditemukan di sistem',
                data: [],
                count: 0,
                source: 'keycloak',
                suggestion: 'Pastikan ada user yang diberikan role "bendahara" di Keycloak'
            });
        }
        
        console.log(`✅ Successfully retrieved ${bendaharaUsers.length} Bendahara users`);
        
        // Log contoh data
        bendaharaUsers.slice(0, 3).forEach((user, idx) => {
            console.log(`${idx + 1}. ${user.nama} (${user.username}) - NIP: ${user.nip || '-'}`);
        });
        
        const formattedUsers = bendaharaUsers.map(user => ({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            nama: user.nama,
            nip: user.nip || '',
            jabatan: user.jabatan || 'Bendahara',
            unit_kerja: user.unit_kerja || '',
            enabled: user.enabled,
            email_verified: user.email_verified
        }));
        
        return res.status(200).json({
            success: true,
            message: 'Daftar Bendahara berhasil diambil dari Keycloak',
            data: formattedUsers,
            count: formattedUsers.length,
            source: 'keycloak'
        });
        
    } catch (error) {
        console.error('❌ Error fetching Bendahara list:', error.message);
        
        // Return empty array instead of error to prevent frontend crash
        return res.status(200).json({
            success: true,
            message: 'Gagal mengambil daftar Bendahara, menggunakan data kosong',
            data: [],
            count: 0,
            error: error.message
        });
    }
});

// GET - Search Bendahara berdasarkan nama atau NIP
router.get('/bendahara/search', keycloakAuth, async (req, res) => {
    const { query } = req.query;
    const username = getUsername(req.user);
    
    console.log(`🔍 ${username} mencari Bendahara dengan query: ${query}`);
    
    if (!query || query.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Query pencarian minimal 2 karakter'
        });
    }
    
    try {
        let bendaharaUsers;
        try {
            bendaharaUsers = await getBendaharaUsersFromKeycloak();
        } catch (error) {
            console.warn('⚠️ Primary method failed, trying fallback:', error.message);
            bendaharaUsers = await getAllUsersAndFilterBendahara();
        }
        
        if (!bendaharaUsers || bendaharaUsers.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Tidak ada data Bendahara ditemukan',
                data: [],
                count: 0
            });
        }
        
        const searchTerm = query.toLowerCase();
        const filteredBendahara = bendaharaUsers.filter(bendahara => 
            bendahara.nama.toLowerCase().includes(searchTerm) ||
            (bendahara.nip && bendahara.nip.toLowerCase().includes(searchTerm)) ||
            (bendahara.email && bendahara.email.toLowerCase().includes(searchTerm))
        );
        
        console.log(`✅ Found ${filteredBendahara.length} Bendahara matching search`);
        
        res.status(200).json({
            success: true,
            message: 'Pencarian Bendahara berhasil',
            data: filteredBendahara,
            count: filteredBendahara.length,
            search_query: query
        });
        
    } catch (error) {
        console.error('❌ Error searching Bendahara:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan pencarian Bendahara',
            error: error.message
        });
    }
});

// GET - Detail Bendahara berdasarkan ID
router.get('/bendahara/:id', keycloakAuth, async (req, res) => {
    const { id } = req.params;
    const username = getUsername(req.user);
    
    console.log(`👤 ${username} mengakses detail Bendahara ID: ${id}`);
    
    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'ID Bendahara tidak valid'
        });
    }
    
    try {
        let bendaharaUsers;
        try {
            bendaharaUsers = await getBendaharaUsersFromKeycloak();
        } catch (error) {
            console.warn('⚠️ Primary method failed, trying fallback:', error.message);
            bendaharaUsers = await getAllUsersAndFilterBendahara();
        }
        
        const foundBendahara = bendaharaUsers.find(bendahara => 
            bendahara.user_id === id || bendahara.id === id
        );
        
        if (!foundBendahara) {
            return res.status(404).json({
                success: false,
                message: 'Bendahara tidak ditemukan'
            });
        }
        
        console.log(`✅ Found Bendahara: ${foundBendahara.nama}`);
        
        res.status(200).json({
            success: true,
            message: 'Detail Bendahara berhasil diambil',
            data: foundBendahara
        });
        
    } catch (error) {
        console.error('❌ Error fetching Bendahara detail:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail Bendahara',
            error: error.message
        });
    }
});

// ========== USER MANAGEMENT ROUTES ==========

// GET - Daftar semua user dari Keycloak (hanya admin)
router.get('/users', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`👥 ${username} mengakses daftar semua user`);
    
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Hanya admin yang dapat mengakses daftar semua user'
        });
    }
    
    try {
        const { getAdminCliToken } = require('../utils/keycloakHelpers');
        const adminToken = await getAdminCliToken();
        
        const usersUrl = `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`;
        
        const response = await axios.get(usersUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            params: {
                max: 100
            }
        });
        
        const users = response.data.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            enabled: user.enabled,
            emailVerified: user.emailVerified,
            createdTimestamp: user.createdTimestamp
        }));
        
        res.status(200).json({
            success: true,
            message: 'Daftar user berhasil diambil',
            data: users,
            count: users.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching users:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar user',
            error: error.message
        });
    }
});

// GET - Daftar semua user simple (untuk autocomplete pegawai)
router.get('/users/all-simple', keycloakAuth, async (req, res) => {
    const username = getUsername(req.user);
    
    console.log(`👥 ${username} mengakses daftar semua user (simple)`);
    
    try {
        const axios = require('axios');
        const { getAdminCliToken } = require('../utils/keycloakHelpers');
        
        const adminToken = await getAdminCliToken();
        
        const usersUrl = `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`;
        console.log('🌐 Fetching users from:', usersUrl);
        
        const response = await axios.get(usersUrl, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            params: {
                max: 1000
            }
        });
        
        const allUsers = response.data;
        console.log(`📊 Total users found: ${allUsers.length}`);
        
        const getAttribute = (user, attributeName) => {
            if (!user.attributes || !user.attributes[attributeName]) return '';
            const value = user.attributes[attributeName];
            return Array.isArray(value) ? (value[0] || '') : (String(value) || '');
        };
        
        const formattedUsers = allUsers
            .filter(user => user.enabled !== false)
            .map(user => {
                let nama = '';
                
                if (user.firstName || user.lastName) {
                    nama = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                } else if (getAttribute(user, 'nama')) {
                    nama = getAttribute(user, 'nama');
                } else {
                    nama = user.username || '';
                }
                
                return {
                    id: user.id,
                    user_id: user.id,
                    nama: nama,
                    nip: getAttribute(user, 'nip') || '',
                    pangkat: getAttribute(user, 'pangkat') || '',
                    jabatan: getAttribute(user, 'jabatan') || 'Staf',
                    username: user.username || '',
                    email: user.email || '',
                    enabled: user.enabled
                };
            })
            .filter(user => user.nama && user.nama !== '')
            .sort((a, b) => a.nama.localeCompare(b.nama));
        
        console.log(`✅ ${formattedUsers.length} users formatted`);
        
        // Log sample data untuk debug
        if (formattedUsers.length > 0) {
            console.log('📋 Sample user data (first 3):');
            formattedUsers.slice(0, 3).forEach((user, idx) => {
                console.log(`${idx + 1}. Nama: ${user.nama}, NIP: ${user.nip}, Pangkat: ${user.pangkat || '-'}`);
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Daftar semua user berhasil diambil',
            data: formattedUsers,
            count: formattedUsers.length
        });
        
    } catch (error) {
        console.error('❌ Error in /users/all-simple:', error.message);
        
        return res.status(200).json({
            success: false,
            message: 'Gagal mengambil daftar user: ' + error.message,
            data: [],
            count: 0
        });
    }
});

module.exports = router;