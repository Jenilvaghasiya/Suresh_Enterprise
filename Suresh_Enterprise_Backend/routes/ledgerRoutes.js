const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');

// Generate Ledger PDF
router.post('/pdf', ledgerController.generateLedgerPDF);

module.exports = router;
