// routes/pagu.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// Setup upload directory
const uploadDir = path.join(__dirname, '../public/uploads/pagu');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Pagu upload directory created:', uploadDir);
}

// Konfigurasi multer
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'pagu-' + uniqueSuffix + '.xlsx');
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(xlsx|xls)$/i;
        if (allowed.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file Excel (.xlsx / .xls) yang diperbolehkan'));
        }
    }
});

// Helper untuk mengecek role user
function getUserRoleInfo(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const normalizedRoles = roleArray.map(r => String(r).toLowerCase());
    
    return {
        isAdmin: normalizedRoles.includes('admin'),
        isPPK: normalizedRoles.includes('ppk'),
        isKabalai: normalizedRoles.some(r => r.includes('kabalai')),
        isRegularUser: !normalizedRoles.includes('admin') && 
                       !normalizedRoles.includes('ppk') && 
                       !normalizedRoles.some(r => r.includes('kabalai'))
    };
}

// Middleware: hanya admin yang bisa akses
const requireAdmin = (req, res, next) => {
    const roleInfo = getUserRoleInfo(req.user);
    if (!roleInfo.isAdmin) {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini' });
    }
    next();
};

// ============ POST - Upload XLSX Pagu ============
router.post('/upload', keycloakAuth, requireAdmin, upload.single('file'), async (req, res) => {
    try {
        const user = req.user;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
        }
        
        console.log(`📤 Uploading pagu XLSX by: ${getUsername(user)}, file: ${req.file.originalname}`);
        
        // Baca file Excel — tanpa header, mapping posisi kolom:
        // Kolom A = MAK, Kolom B = Pagu, Kolom C = Realisasi, Kolom D = Tahun (opsional)
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        console.log(`📊 Found ${rows.length} rows in Excel`);
        console.log('📋 First 3 rows (raw):', rows.slice(0, 3));
        
        if (rows.length === 0) {
            // Hapus file jika tidak ada data
            try { fs.unlinkSync(req.file.path); } catch (_) {}
            return res.status(400).json({ success: false, message: 'File Excel kosong' });
        }
        
        let imported = 0;
        let skipped = 0;
        let errors = [];
        const currentYear = new Date().getFullYear();
        
        // Hapus semua data lama, lalu insert ulang
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // Kosongkan tabel
            await connection.query('DELETE FROM pagu_realisasi');
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const mak = String(row[0] || '').trim();       // Kolom A
                
                if (!mak) {
                    skipped++;
                    continue;
                }
                
                const pagu = parseFloat(String(row[1] || '0').replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;   // Kolom B
                const realisasi = parseFloat(String(row[2] || '0').replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0; // Kolom C
                const tahun = parseInt(row[3]) || currentYear;   // Kolom D (opsional)
                const sisa = pagu - realisasi;
                
                try {
                    await connection.query(
                        'INSERT INTO pagu_realisasi (mak, pagu, realisasi, sisa, tahun_anggaran) VALUES (?, ?, ?, ?, ?)',
                        [mak, pagu, realisasi, sisa, tahun]
                    );
                    imported++;
                } catch (err) {
                    errors.push(`Baris ${i + 1}: ${err.message}`);
                    console.error(`❌ Error row ${i + 1}:`, err.message);
                }
            }
            
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
        
        // Hapus file setelah diproses
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        
        console.log(`✅ Import selesai: ${imported} berhasil, ${skipped} dilewati, ${errors.length} error`);
        
        res.status(200).json({
            success: true,
            message: `Import selesai: ${imported} data berhasil diimpor${skipped > 0 ? `, ${skipped} baris kosong dilewati` : ''}${errors.length > 0 ? `, ${errors.length} error` : ''}`,
            data: { imported, skipped, errors }
        });
    } catch (error) {
        console.error('❌ Error uploading pagu:', error);
        // Hapus file jika error
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ GET - List semua pagu ============
router.get('/', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const roleInfo = getUserRoleInfo(user);
        
        console.log(`📊 Pagu list accessed by: ${getUsername(user)}`);
        
        let query = `
            SELECT 
                id, mak, pagu, realisasi, sisa, tahun_anggaran,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM pagu_realisasi
            ORDER BY tahun_anggaran DESC, mak ASC
        `;
        
        const [list] = await db.query(query);
        
        console.log(`✅ ${list.length} pagu records found`);
        
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        console.error('❌ Error fetching pagu list:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ GET - Detail pagu by ID ============
router.get('/:id', keycloakAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.query(`
            SELECT id, mak, pagu, realisasi, sisa, tahun_anggaran,
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                   DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM pagu_realisasi WHERE id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pagu tidak ditemukan' });
        }
        
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('❌ Error fetching pagu detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ POST - Tambah pagu ============
router.post('/', keycloakAuth, requireAdmin, async (req, res) => {
    try {
        const user = req.user;
        const { mak, pagu, realisasi, tahun_anggaran } = req.body;
        
        console.log(`📝 Creating pagu by: ${getUsername(user)}`);
        
        if (!mak || !mak.trim()) {
            return res.status(400).json({ success: false, message: 'MAK wajib diisi' });
        }
        
        if (!tahun_anggaran) {
            return res.status(400).json({ success: false, message: 'Tahun anggaran wajib diisi' });
        }
        
        const paguValue = parseFloat(pagu) || 0;
        const realisasiValue = parseFloat(realisasi) || 0;
        const sisaValue = paguValue - realisasiValue;
        
        // Cek duplikasi MAK + tahun
        const [existing] = await db.query(
            'SELECT id FROM pagu_realisasi WHERE mak = ? AND tahun_anggaran = ?',
            [mak.trim(), tahun_anggaran]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `MAK "${mak.trim()}" sudah ada untuk tahun anggaran ${tahun_anggaran}`
            });
        }
        
        const [result] = await db.query(`
            INSERT INTO pagu_realisasi (mak, pagu, realisasi, sisa, tahun_anggaran)
            VALUES (?, ?, ?, ?, ?)
        `, [mak.trim(), paguValue, realisasiValue, sisaValue, tahun_anggaran]);
        
        console.log(`✅ Pagu created with ID: ${result.insertId}`);
        
        res.status(201).json({
            success: true,
            message: 'Pagu berhasil ditambahkan',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('❌ Error creating pagu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ PUT - Update pagu ============
router.put('/:id', keycloakAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { mak, pagu, realisasi, tahun_anggaran } = req.body;
        
        console.log(`📝 Updating pagu ${id} by: ${getUsername(user)}`);
        
        const [existing] = await db.query('SELECT id FROM pagu_realisasi WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Pagu tidak ditemukan' });
        }
        
        const paguValue = parseFloat(pagu) || 0;
        const realisasiValue = parseFloat(realisasi) || 0;
        const sisaValue = paguValue - realisasiValue;
        
        // Cek duplikasi MAK + tahun (kecuali dirinya sendiri)
        if (mak) {
            const [duplicate] = await db.query(
                'SELECT id FROM pagu_realisasi WHERE mak = ? AND tahun_anggaran = ? AND id != ?',
                [mak.trim(), tahun_anggaran, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `MAK "${mak.trim()}" sudah ada untuk tahun anggaran ${tahun_anggaran}`
                });
            }
        }
        
        await db.query(`
            UPDATE pagu_realisasi 
            SET mak = ?, pagu = ?, realisasi = ?, sisa = ?, tahun_anggaran = ?
            WHERE id = ?
        `, [
            mak?.trim() || existing[0].mak,
            paguValue,
            realisasiValue,
            sisaValue,
            tahun_anggaran || existing[0].tahun_anggaran,
            id
        ]);
        
        console.log(`✅ Pagu ${id} updated`);
        
        res.status(200).json({ success: true, message: 'Pagu berhasil diperbarui' });
    } catch (error) {
        console.error('❌ Error updating pagu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ DELETE - Hapus pagu ============
router.delete('/:id', keycloakAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        console.log(`🗑️ Deleting pagu ${id} by: ${getUsername(user)}`);
        
        const [existing] = await db.query('SELECT id FROM pagu_realisasi WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Pagu tidak ditemukan' });
        }
        
        await db.query('DELETE FROM pagu_realisasi WHERE id = ?', [id]);
        
        console.log(`✅ Pagu ${id} deleted`);
        
        res.status(200).json({ success: true, message: 'Pagu berhasil dihapus' });
    } catch (error) {
        console.error('❌ Error deleting pagu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
