const express = require('express');
const router = express.Router();
const {
  getRestockAlerts,
  createPurchaseOrder,
  getPurchaseOrders,
  updateOrderStatus,
} = require('../controllers/restockController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/alerts', protect, getRestockAlerts);
router.post('/purchase-order', protect, authorize('admin', 'manager'), createPurchaseOrder);
router.get('/purchase-orders', protect, getPurchaseOrders);
router.put('/purchase-orders/:id/status', protect, authorize('admin', 'manager'), updateOrderStatus);

module.exports = router;
