// routes/notifikasi.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { keycloakAuth, getUserId, getUsername } = require('../middleware/keycloakAuth');

// ============ TAMBAHKAN FUNGSI NORMALIZE NIP ============
function normalizeNip(nip) {
    if (!nip) return '';
    return String(nip).replace(/\s/g, '');
}

// Helper untuk mengecek role user
function getUserRoleInfo(user) {
    const roles = user.extractedRoles || user.role || [];
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const normalizedRoles = roleArray.map(r => String(r).toLowerCase());
    
    return {
        isAdmin: normalizedRoles.includes('admin'),
        isPPK: normalizedRoles.includes('ppk'),
        isBendahara: normalizedRoles.includes('bendahara'),
        isKabalai: normalizedRoles.some(r => r.includes('kabalai')),
        isKabagTu: normalizedRoles.some(r => r.includes('kabag_tu')),
        isKatim: normalizedRoles.some(r => r.includes('katim'))
    };
}

// GET - Hitung notifikasi untuk dashboard
router.get('/count', keycloakAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = getUserId(user);
        const userNip = user?.nip || '';
        const normalizedUserNip = normalizeNip(userNip);
        const roleInfo = getUserRoleInfo(user);
        
        console.log('🔔 Fetching notifications for user:', {
            userId,
            userNip: normalizedUserNip,
            isKatim: roleInfo.isKatim,
            isKabagTu: roleInfo.isKabagTu,
            isKabalai: roleInfo.isKabalai,
            isPPK: roleInfo.isPPK,
            isBendahara: roleInfo.isBendahara
        });
        
        let notifikasiLpd = 0;
        let notifikasiKwitansi = 0;
        
        // ============ 1. NOTIFIKASI LPD UNTUK KATIM/KABAG TU ============
        if (roleInfo.isKatim || roleInfo.isKabagTu) {
            // Hitung LPD yang menunggu persetujuan Katim/Kabag TU
            const [lpdMenunggu] = await db.query(`
                SELECT COUNT(*) as count 
                FROM lpd_status 
                WHERE lpd_status = 'menunggu_katim'
            `);
            notifikasiLpd += lpdMenunggu[0]?.count || 0;
            console.log(`📋 LPD menunggu Katim/Kabag TU: ${notifikasiLpd}`);
        }
        
        // ============ 2. NOTIFIKASI LPD UNTUK KABALAI ============
        if (roleInfo.isKabalai) {
            const [lpdMenungguKabalai] = await db.query(`
                SELECT COUNT(*) as count 
                FROM lpd_status 
                WHERE lpd_status = 'menunggu_kabalai'
            `);
            notifikasiLpd += lpdMenungguKabalai[0]?.count || 0;
            console.log(`👔 LPD menunggu Kabalai: ${notifikasiLpd}`);
        }
        
        // ============ 3. NOTIFIKASI KUITANSI UNTUK PPK ============
        if (roleInfo.isPPK) {
            const [kwitansiMenungguPPK] = await db.query(`
                SELECT COUNT(*) as count 
                FROM kwitansi_perjadin k
                JOIN nominatif_pegawai p ON k.pegawai_id = p.id
                JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
                WHERE k.status_pegawai = 'sudah' 
                AND k.status_ppk = 'belum'
                AND (n.ppk_id = ? OR REPLACE(n.ppk_nip, ' ', '') = ?)
            `, [userId, normalizedUserNip]);
            notifikasiKwitansi += kwitansiMenungguPPK[0]?.count || 0;
            console.log(`📋 Kwitansi menunggu PPK: ${notifikasiKwitansi}`);
        }
        
        // ============ 4. NOTIFIKASI KUITANSI UNTUK BENDAHARA ============
        if (roleInfo.isBendahara) {
            const [kwitansiMenungguBendahara] = await db.query(`
                SELECT COUNT(*) as count 
                FROM kwitansi_perjadin k
                JOIN nominatif_pegawai p ON k.pegawai_id = p.id
                JOIN nominatif_kegiatan n ON k.kegiatan_id = n.id
                WHERE k.status_pegawai = 'sudah' 
                AND k.status_ppk = 'sudah'
                AND k.status_bendahara = 'belum'
                AND (n.bendahara_id = ? OR REPLACE(n.bendahara_nip, ' ', '') = ?)
            `, [userId, normalizedUserNip]);
            notifikasiKwitansi += kwitansiMenungguBendahara[0]?.count || 0;
            console.log(`💰 Kwitansi menunggu Bendahara: ${notifikasiKwitansi}`);
        }
        
        // ============ 5. NOTIFIKASI KUITANSI UNTUK PEGAWAI ============
        // Hitung kwitansi yang belum diinput oleh pegawai yang bersangkutan
        const [pegawaiBelumInput] = await db.query(`
            SELECT COUNT(*) as count 
            FROM nominatif_pegawai p
            JOIN nominatif_kegiatan n ON p.kegiatan_id = n.id
            LEFT JOIN kwitansi_perjadin k ON p.id = k.pegawai_id AND n.id = k.kegiatan_id
            WHERE n.status = 'selesai'
            AND UPPER(n.status_2) = 'SELESAI'
            AND EXISTS (
                SELECT 1 FROM lpd_status l 
                WHERE l.kegiatan_id = n.id 
                AND l.lpd_status = 'selesai'
            )
            AND k.id IS NULL
            AND REPLACE(p.nip, ' ', '') = ?
        `, [normalizedUserNip]);
        notifikasiKwitansi += pegawaiBelumInput[0]?.count || 0;
        console.log(`👤 Kwitansi belum input oleh pegawai: ${notifikasiKwitansi}`);
        
        const totalNotifikasi = notifikasiLpd + notifikasiKwitansi;
        
        console.log(`✅ Total notifikasi: LPD=${notifikasiLpd}, Kwitansi=${notifikasiKwitansi}, Total=${totalNotifikasi}`);
        
        res.status(200).json({
            success: true,
            data: {
                lpd: notifikasiLpd,
                kwitansi: notifikasiKwitansi,
                total: totalNotifikasi
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            data: { lpd: 0, kwitansi: 0, total: 0 }
        });
    }
});

module.exports = router;