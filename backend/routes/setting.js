// routes/setting.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId } = require('../middleware/keycloakAuth');

// Helper untuk cek role admin
function isAdmin(user) {
    const roles = user.extractedRoles || (user.role ? [user.role] : []);
    return roles.some(r => r.toLowerCase() === 'admin');
}

// GET /api/settings — ambil semua settings (hanya admin)
router.get('/', keycloakAuth, async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengakses pengaturan' });
        }
        
        // Pastikan tabel ada
        await db.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Insert default jika belum ada
        await db.query(`
            INSERT IGNORE INTO app_settings (setting_key, setting_value)
            VALUES ('lpd_cutoff_date', '2026-07-01')
        `);
        
        const [rows] = await db.query('SELECT setting_key, setting_value, updated_at FROM app_settings ORDER BY setting_key');
        
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = {
                value: row.setting_value,
                updated_at: row.updated_at
            };
        });
        
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/settings/:key — update setting (hanya admin)
router.put('/:key', keycloakAuth, async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah pengaturan' });
        }
        
        const { key } = req.params;
        const { value } = req.body;
        
        if (!value) {
            return res.status(400).json({ success: false, message: 'Nilai tidak boleh kosong' });
        }
        
        await db.query(
            'INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()',
            [key, value, value]
        );
        
        res.json({ success: true, message: 'Pengaturan berhasil diperbarui' });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
