const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { supplierValidator } = require('../validators/supplierValidator');

router.get('/', protect, getSuppliers);
router.post('/', protect, authorize('admin', 'manager'), supplierValidator, validate, createSupplier);
router.get('/:id', protect, getSupplierById);
router.put('/:id', protect, authorize('admin', 'manager'), supplierValidator, validate, updateSupplier);
router.delete('/:id', protect, authorize('admin'), deleteSupplier);

module.exports = router;
