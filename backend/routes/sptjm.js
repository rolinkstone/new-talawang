// routes/sptjm.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Setup upload directory
const uploadDir = path.join(__dirname, '../public/uploads/sptjm');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'sptjm-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (jpeg, jpg, png) dan PDF yang diperbolehkan'));
        }
    }
});

// ========== SPTJM HOTEL ROUTES ==========

// GET all SPTJM Hotel
router.get('/hotel', async (req, res) => {
    try {
        const query = `
            SELECT h.*, 
                   k.kegiatan as nama_kegiatan,
                   p.nama as nama_pegawai,
                   p.nip
            FROM sptjm_hotel h
            JOIN nominatif_kegiatan k ON h.kegiatan_id = k.id
            JOIN nominatif_pegawai p ON h.pegawai_id = p.id
            ORDER BY h.created_at DESC
        `;
        const [results] = await db.query(query);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching SPTJM hotel:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET SPTJM Hotel by ID
router.get('/hotel/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT h.*, 
                   k.kegiatan as nama_kegiatan,
                   p.nama as nama_pegawai,
                   p.nip
            FROM sptjm_hotel h
            JOIN nominatif_kegiatan k ON h.kegiatan_id = k.id
            JOIN nominatif_pegawai p ON h.pegawai_id = p.id
            WHERE h.id = ?
        `;
        const [results] = await db.query(query, [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.status(200).json({ success: true, data: results[0] });
    } catch (error) {
        console.error('Error fetching SPTJM hotel:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create SPTJM Hotel
router.post('/hotel', (req, res) => {
    upload.single('upload_bukti')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { kegiatan_id, pegawai_id, no_spd, tgl_spd, nama_hotel, alamat_hotel, nomor_kamar, tgl_menginap, tarif_hotel } = req.body;
            const upload_bukti = req.file ? `/public/uploads/sptjm/${req.file.filename}` : null;
            
            const query = `
                INSERT INTO sptjm_hotel (kegiatan_id, pegawai_id, no_spd, tgl_spd, nama_hotel, alamat_hotel, nomor_kamar, tgl_menginap, tarif_hotel, upload_bukti)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.query(query, [kegiatan_id, pegawai_id, no_spd, tgl_spd, nama_hotel, alamat_hotel, nomor_kamar, tgl_menginap, tarif_hotel, upload_bukti]);
            
            res.status(201).json({ success: true, data: { id: result.insertId }, message: 'SPTJM Hotel berhasil disimpan' });
        } catch (error) {
            console.error('Error creating SPTJM hotel:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// DELETE SPTJM Hotel
router.delete('/hotel/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT upload_bukti FROM sptjm_hotel WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].upload_bukti) {
            const filePath = path.join(__dirname, '..', rows[0].upload_bukti);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await db.query('DELETE FROM sptjm_hotel WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'SPTJM Hotel berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting SPTJM hotel:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========== SPTJM TRANSPORT ROUTES ==========

// GET all SPTJM Transport
router.get('/transport', async (req, res) => {
    try {
        const query = `
            SELECT t.*, 
                   k.kegiatan as nama_kegiatan,
                   p.nama as nama_pegawai,
                   p.nip
            FROM sptjm_transport t
            JOIN nominatif_kegiatan k ON t.kegiatan_id = k.id
            JOIN nominatif_pegawai p ON t.pegawai_id = p.id
            ORDER BY t.created_at DESC
        `;
        const [results] = await db.query(query);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching SPTJM transport:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create SPTJM Transport
router.post('/transport', (req, res) => {
    upload.single('upload_bukti')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        
        try {
            const { kegiatan_id, pegawai_id, no_spd, tgl_spd, jenis_transport, rute_berangkat, rute_pulang, nama_maskapai, no_penerbangan, kelas, harga_tiket } = req.body;
            const upload_bukti = req.file ? `/public/uploads/sptjm/${req.file.filename}` : null;
            
            const query = `
                INSERT INTO sptjm_transport (kegiatan_id, pegawai_id, no_spd, tgl_spd, jenis_transport, rute_berangkat, rute_pulang, nama_maskapai, no_penerbangan, kelas, harga_tiket, upload_bukti)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.query(query, [kegiatan_id, pegawai_id, no_spd, tgl_spd, jenis_transport, rute_berangkat, rute_pulang, nama_maskapai, no_penerbangan, kelas, harga_tiket, upload_bukti]);
            
            res.status(201).json({ success: true, data: { id: result.insertId }, message: 'SPTJM Transport berhasil disimpan' });
        } catch (error) {
            console.error('Error creating SPTJM transport:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// DELETE SPTJM Transport
router.delete('/transport/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT upload_bukti FROM sptjm_transport WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].upload_bukti) {
            const filePath = path.join(__dirname, '..', rows[0].upload_bukti);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await db.query('DELETE FROM sptjm_transport WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'SPTJM Transport berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting SPTJM transport:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;