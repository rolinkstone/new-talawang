// routes/profile.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { keycloakAuth, getUsername, getUserId, getUserNip } = require('../middleware/keycloakAuth');

// Setup upload directory for TTD
const uploadDir = path.join(__dirname, '../public/uploads/ttd');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ TTD upload directory created:', uploadDir);
}

// Configure multer for TTD upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = getUserId(req.user);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `ttd-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`;
        console.log('📁 Saving TTD file:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (jpeg, jpg, png) yang diperbolehkan untuk TTD'));
        }
    }
});

// Helper function to clean file path
function cleanFilePath(filePath) {
    if (!filePath) return null;
    let clean = filePath.replace(/^\/api/, '');
    clean = clean.replace(/^\/public/, '');
    if (!clean.startsWith('/uploads')) {
        clean = `/uploads/ttd/${path.basename(clean)}`;
    }
    return clean;
}

// ============ PROFILE ROUTES ============

// GET - Get user profile
router.get('/', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const username = getUsername(user);
        const userNip = getUserNip(user);
        
        console.log(`📋 ${username} mengakses profile`);
        
        // Get profile from database
       // routes/profile.js - Pastikan ttd_path yang dikembalikan adalah relative path

// Di endpoint GET /profile, pastikan ttd_path dikembalikan sebagai relative path
const [profileRows] = await db.query(`
    SELECT 
        id,
        user_id,
        username,
        nama_lengkap,
        nip,
        jabatan,
        unit_kerja,
        email,
        ttd_path,
        DATE_FORMAT(ttd_uploaded_at, '%Y-%m-%d %H:%i:%s') as ttd_uploaded_at,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
    FROM user_profiles
    WHERE user_id = ?
`, [userId]);

// ttd_path akan bernilai seperti: "/uploads/ttd/ttd-xxx-1234567890.png"
        
        let profile = null;
        
        if (profileRows.length > 0) {
            profile = profileRows[0];
            if (profile.ttd_path) {
                profile.ttd_path = cleanFilePath(profile.ttd_path);
            }
        } else {
            // Create default profile if not exists
            const [insertResult] = await db.query(`
                INSERT INTO user_profiles (user_id, username, nip, nama_lengkap, email)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, username, userNip, username, user.email || '']);
            
            profile = {
                id: insertResult.insertId,
                user_id: userId,
                username: username,
                nama_lengkap: username,
                nip: userNip,
                jabatan: null,
                unit_kerja: null,
                email: user.email,
                ttd_path: null,
                ttd_uploaded_at: null,
                created_at: new Date(),
                updated_at: new Date()
            };
        }
        
        // Get user roles from session
        const roles = user.extractedRoles || user.role || [];
        
        res.status(200).json({
            success: true,
            message: 'Profile berhasil diambil',
            data: {
                ...profile,
                roles: Array.isArray(roles) ? roles : [roles],
                isAdmin: user.isAdmin,
                isPPK: user.isPPK,
                isKabalai: user.isKabalai,
                isBendahara: user.isBendahara || false
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil profile',
            error: error.message
        });
    }
});

// PUT - Update user profile
router.put('/', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const username = getUsername(user);
        
        const { nama_lengkap, jabatan, unit_kerja, email } = req.body;
        
        console.log(`✏️ ${username} mengupdate profile`);
        
        // Check if profile exists
        const [existingProfile] = await db.query(
            'SELECT id FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        
        let result;
        
        if (existingProfile.length > 0) {
            // Update existing profile
            [result] = await db.query(`
                UPDATE user_profiles 
                SET 
                    nama_lengkap = COALESCE(?, nama_lengkap),
                    jabatan = COALESCE(?, jabatan),
                    unit_kerja = COALESCE(?, unit_kerja),
                    email = COALESCE(?, email),
                    updated_at = NOW()
                WHERE user_id = ?
            `, [nama_lengkap, jabatan, unit_kerja, email, userId]);
        } else {
            // Insert new profile
            [result] = await db.query(`
                INSERT INTO user_profiles (user_id, username, nip, nama_lengkap, jabatan, unit_kerja, email)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, username, user.nip || '', nama_lengkap || username, jabatan, unit_kerja, email]);
        }
        
        // Get updated profile
        const [updatedProfile] = await db.query(`
            SELECT * FROM user_profiles WHERE user_id = ?
        `, [userId]);
        
        res.status(200).json({
            success: true,
            message: 'Profile berhasil diperbarui',
            data: updatedProfile[0]
        });
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate profile',
            error: error.message
        });
    }
});

// POST - Upload TTD (Tanda Tangan)
router.post('/upload-ttd', keycloakAuth, (req, res) => {
    upload.single('ttd_image')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'Gagal upload file'
            });
        }
        
        try {
            const user = req.user;
            const userId = getUserId(user);
            const username = getUsername(user);
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'File TTD harus diupload'
                });
            }
            
            const ttdPath = `/uploads/ttd/${req.file.filename}`;
            
            console.log(`📤 ${username} upload TTD: ${ttdPath}`);
            
            // Check if profile exists
            const [existingProfile] = await db.query(
                'SELECT id FROM user_profiles WHERE user_id = ?',
                [userId]
            );
            
            // Delete old TTD file if exists
            if (existingProfile.length > 0) {
                const [oldProfile] = await db.query(
                    'SELECT ttd_path FROM user_profiles WHERE user_id = ?',
                    [userId]
                );
                
                if (oldProfile[0]?.ttd_path) {
                    const oldFilename = path.basename(oldProfile[0].ttd_path);
                    const oldPath = path.join(uploadDir, oldFilename);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                        console.log('🗑️ Old TTD deleted:', oldPath);
                    }
                }
            }
            
            // Save TTD path to database
            if (existingProfile.length > 0) {
                await db.query(`
                    UPDATE user_profiles 
                    SET ttd_path = ?, ttd_uploaded_at = NOW(), updated_at = NOW()
                    WHERE user_id = ?
                `, [ttdPath, userId]);
            } else {
                await db.query(`
                    INSERT INTO user_profiles (user_id, username, nip, ttd_path, ttd_uploaded_at)
                    VALUES (?, ?, ?, ?, NOW())
                `, [userId, username, user.nip || '', ttdPath]);
            }
            
            res.status(200).json({
                success: true,
                message: 'TTD berhasil diupload',
                data: {
                    ttd_path: cleanFilePath(ttdPath),
                    ttd_uploaded_at: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Error uploading TTD:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menyimpan TTD',
                error: error.message
            });
        }
    });
});

// DELETE - Delete TTD
router.delete('/ttd', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const username = getUsername(user);
        
        console.log(`🗑️ ${username} menghapus TTD`);
        
        // Get current TTD path
        const [profile] = await db.query(
            'SELECT ttd_path FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        
        if (profile.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profile tidak ditemukan'
            });
        }
        
        if (profile[0].ttd_path) {
            const filename = path.basename(profile[0].ttd_path);
            const fullPath = path.join(uploadDir, filename);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('🗑️ TTD file deleted:', fullPath);
            }
        }
        
        // Update database
        await db.query(`
            UPDATE user_profiles 
            SET ttd_path = NULL, ttd_uploaded_at = NULL, updated_at = NOW()
            WHERE user_id = ?
        `, [userId]);
        
        res.status(200).json({
            success: true,
            message: 'TTD berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting TTD:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus TTD',
            error: error.message
        });
    }
});

// GET - Get TTD image
router.get('/ttd', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        
        const [profile] = await db.query(
            'SELECT ttd_path FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        
        if (profile.length === 0 || !profile[0].ttd_path) {
            return res.status(404).json({
                success: false,
                message: 'TTD tidak ditemukan'
            });
        }
        
        const ttdPath = profile[0].ttd_path;
        const filename = path.basename(ttdPath);
        const fullPath = path.join(uploadDir, filename);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: 'File TTD tidak ditemukan'
            });
        }
        
        res.sendFile(fullPath);
        
    } catch (error) {
        console.error('❌ Error fetching TTD:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil TTD',
            error: error.message
        });
    }
});

// GET - Search users by name or NIP (for admin)
router.get('/users/search', keycloakAuth, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Hanya admin yang dapat mencari user'
            });
        }
        
        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Query minimal 2 karakter'
            });
        }
        
        const searchTerm = `%${query}%`;
        
        const [users] = await db.query(`
            SELECT 
                user_id,
                username,
                nama_lengkap,
                nip,
                jabatan,
                unit_kerja,
                email,
                ttd_path,
                created_at
            FROM user_profiles
            WHERE nama_lengkap LIKE ? OR nip LIKE ? OR username LIKE ?
            ORDER BY nama_lengkap ASC
            LIMIT 20
        `, [searchTerm, searchTerm, searchTerm]);
        
        res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
        
    } catch (error) {
        console.error('❌ Error searching users:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;