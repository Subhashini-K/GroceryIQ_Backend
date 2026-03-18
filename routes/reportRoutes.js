const express = require('express');
const router = express.Router();
const { stockSummary, movementReport, expiryReport, supplierReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stock-summary', protect, stockSummary);
router.get('/movement', protect, movementReport);
router.get('/expiry', protect, expiryReport);
router.get('/supplier', protect, supplierReport);

module.exports = router;
