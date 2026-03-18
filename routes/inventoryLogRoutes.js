const express = require('express');
const router = express.Router();
const { getLogs, stockIn, stockOut, adjustment, wastage } = require('../controllers/inventoryLogController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getLogs);
router.post('/stock-in', protect, stockIn);
router.post('/stock-out', protect, stockOut);
router.post('/adjustment', protect, authorize('admin', 'manager'), adjustment);
router.post('/wastage', protect, wastage);

module.exports = router;
