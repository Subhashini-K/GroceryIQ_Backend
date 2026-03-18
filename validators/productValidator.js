const { body } = require('express-validator');

const productValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('barcode')
    .trim()
    .notEmpty().withMessage('Barcode is required'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Category must be a valid MongoDB ID'),
  body('supplier')
    .notEmpty().withMessage('Supplier is required')
    .isMongoId().withMessage('Supplier must be a valid MongoDB ID'),
  body('unit')
    .notEmpty().withMessage('Unit is required')
    .isIn(['kg', 'g', 'litre', 'ml', 'piece', 'dozen', 'box', 'pack'])
    .withMessage('Unit must be one of: kg, g, litre, ml, piece, dozen, box, pack'),
  body('costPrice')
    .notEmpty().withMessage('Cost price is required')
    .isNumeric().withMessage('Cost price must be a number')
    .isFloat({ min: 0 }).withMessage('Cost price cannot be negative'),
  body('sellingPrice')
    .notEmpty().withMessage('Selling price is required')
    .isNumeric().withMessage('Selling price must be a number')
    .isFloat({ min: 0 }).withMessage('Selling price cannot be negative'),
  body('stockQty')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('reorderThreshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder threshold must be a non-negative integer'),
  body('expiryDate')
    .optional()
    .isISO8601().withMessage('Expiry date must be a valid ISO date'),
];

module.exports = { productValidator };
