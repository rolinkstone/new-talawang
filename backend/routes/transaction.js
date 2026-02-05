// routes/transaction.js
const express = require('express');
const router = express.Router();
const { requirePINVerification, checkPINStatus } = require('../middleware/pinAuth');

// Example transaction routes that require PIN

// POST /api/transaction/approve-kegiatan - Approve kegiatan with PIN
router.post('/approve-kegiatan', checkPINStatus, requirePINVerification, async (req, res) => {
    try {
        const { kegiatan_id, catatan } = req.body;
        
        // Your approve logic here...
        
        res.json({
            success: true,
            message: 'Kegiatan berhasil disetujui dengan verifikasi PIN',
            data: {
                kegiatan_id,
                approved_at: new Date().toISOString(),
                verified_with: 'pin'
            }
        });
    } catch (error) {
        console.error('Error approving kegiatan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menyetujui kegiatan'
        });
    }
});

// POST /api/transaction/reject-kegiatan - Reject kegiatan with PIN
router.post('/reject-kegiatan', checkPINStatus, requirePINVerification, async (req, res) => {
    try {
        const { kegiatan_id, catatan } = req.body;
        
        // Your reject logic here...
        
        res.json({
            success: true,
            message: 'Kegiatan berhasil ditolak dengan verifikasi PIN',
            data: {
                kegiatan_id,
                rejected_at: new Date().toISOString(),
                verified_with: 'pin'
            }
        });
    } catch (error) {
        console.error('Error rejecting kegiatan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menolak kegiatan'
        });
    }
});

// POST /api/transaction/transfer - Transfer funds with PIN
router.post('/transfer', checkPINStatus, requirePINVerification, async (req, res) => {
    try {
        const { amount, to_account, description } = req.body;
        
        // Your transfer logic here...
        
        res.json({
            success: true,
            message: 'Transfer berhasil dengan verifikasi PIN',
            data: {
                amount,
                to_account,
                transaction_id: 'TX-' + Date.now(),
                verified_with: 'pin'
            }
        });
    } catch (error) {
        console.error('Error transferring funds:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan transfer'
        });
    }
});

module.exports = router;