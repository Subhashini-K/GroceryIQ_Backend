const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { categoryValidator } = require('../validators/categoryValidator');

router.get('/', protect, getCategories);
router.post('/', protect, authorize('admin', 'manager'), categoryValidator, validate, createCategory);
router.get('/:id', protect, getCategoryById);
router.put('/:id', protect, authorize('admin', 'manager'), categoryValidator, validate, updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
