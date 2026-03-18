const { body } = require('express-validator');

const supplierValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Supplier name is required'),
  body('contactPerson')
    .trim()
    .notEmpty().withMessage('Contact person is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('leadTimeDays')
    .optional()
    .isInt({ min: 1 }).withMessage('Lead time must be a positive integer'),
];

module.exports = { supplierValidator };
