// utils/userHelpers.js

// Cache untuk data user
let userCache = {
    data: [],
    timestamp: 0,
    expiry: 10 * 60 * 1000 // 10 menit
};

// Helper untuk mendapatkan headers - gunakan token dari parameter (NextAuth session)
const getAuthHeaders = (token) => {
    if (!token) {
        console.warn('Token tidak tersedia');
        return {};
    }
    
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
};

// Fetch semua user dari API - membutuhkan accessToken dari session
export const fetchAllUsers = async (accessToken) => {
    const now = Date.now();
    
    // Cek cache
    if (userCache.data.length > 0 && (now - userCache.timestamp) < userCache.expiry) {
        console.log('Menggunakan data cache');
        return userCache.data;
    }
    
    // Fallback: coba ambil token dari sessionStorage jika tidak diberikan
    const token = accessToken || sessionStorage.getItem('token') || localStorage.getItem('token');
    
    if (!token) {
        console.warn('fetchAllUsers: Token tidak tersedia');
        return [];
    }
    
    try {
        // Coba endpoint yang berbeda
        const endpoints = [
            '/api/keycloak/users/all-simple',
            '/api/users/all-simple'
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`Mencoba fetch dari: ${endpoint}`);
                const response = await fetch(endpoint, {
                    headers: getAuthHeaders(token)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.success && Array.isArray(data.data)) {
                        userCache.data = data.data;
                        userCache.timestamp = now;
                        console.log(`Berhasil fetch ${data.data.length} user dari ${endpoint}`);
                        return userCache.data;
                    }
                }
            } catch (error) {
                console.warn(`Gagal fetch dari ${endpoint}:`, error.message);
            }
        }
        
        console.warn('Semua endpoint gagal, mengembalikan array kosong');
        return [];
        
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

// Search users untuk autocomplete
export const searchUsers = async (searchTerm, accessToken) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return await fetchAllUsers(accessToken);
    }
    
    try {
        // Gunakan endpoint search jika tersedia
        const searchEndpoint = '/api/keycloak/users/search';
        const response = await fetch(`${searchEndpoint}?q=${encodeURIComponent(searchTerm)}`, {
            headers: getAuthHeaders(accessToken)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return data.data;
            }
        }
        
        // Fallback ke client-side search
        console.log('Fallback ke client-side search');
        return await fallbackSearch(searchTerm, accessToken);
        
    } catch (error) {
        console.error('Error searching users:', error);
        return await fallbackSearch(searchTerm, accessToken);
    }
};

// Fallback client-side search
const fallbackSearch = async (searchTerm, accessToken) => {
    try {
        const allUsers = await fetchAllUsers(accessToken);
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) return allUsers;
        
        return allUsers.filter(user => {
            const searchableFields = [
                user.nama?.toLowerCase(),
                user.nip?.toLowerCase(),
                user.username?.toLowerCase(),
                user.jabatan?.toLowerCase(),
                user.email?.toLowerCase()
            ].filter(Boolean);
            
            return searchableFields.some(field => field.includes(term));
        });
    } catch (error) {
        console.error('Fallback search error:', error);
        return [];
    }
};

// Clear cache
export const clearUserCache = () => {
    userCache = { data: [], timestamp: 0, expiry: 10 * 60 * 1000 };
    console.log('User cache cleared');
};

// Force refresh cache
export const refreshUserCache = (accessToken) => {
    userCache.timestamp = 0;
    return fetchAllUsers(accessToken);
};