const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getExpiringProducts,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { productValidator } = require('../validators/productValidator');
const { uploadMultipleImages } = require('../middleware/uploadMiddleware');

// Specific paths BEFORE /:id
router.get('/low-stock', protect, getLowStockProducts);
router.get('/expiring', protect, getExpiringProducts);
router.get('/barcode/:barcode', protect, getProductByBarcode);

router.get('/', protect, getProducts);
router.post('/', protect, authorize('admin', 'manager'), uploadMultipleImages, productValidator, validate, createProduct);

router.get('/:id', protect, getProductById);
router.put('/:id', protect, authorize('admin', 'manager'), productValidator, validate, updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
