const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');

// @desc    Get inventory logs (paginated, filtered)
// @route   GET /api/v1/inventory-logs
// @access  Protected
const getLogs = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, product, action, startDate, endDate, performedBy } = req.query;

  const query = {};
  if (product) query.product = product;
  if (action) query.action = action;
  if (performedBy) query.performedBy = performedBy;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    InventoryLog.find(query)
      .populate('product', 'name barcode')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    InventoryLog.countDocuments(query),
  ]);

  return successResponse(res, 200, 'Inventory logs retrieved', logs, {
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// @desc    Stock In
// @route   POST /api/v1/inventory-logs/stock-in
// @access  Protected
const stockIn = asyncHandler(async (req, res, next) => {
  const { productId, quantity, reason, batchNumber } = req.body;

  if (!productId || !quantity) {
    res.status(400);
    throw new Error('productId and quantity are required');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const qty = Number(quantity);
  const before = product.stockQty;
  product.stockQty += qty;
  if (batchNumber) product.batchNumber = batchNumber;
  await product.save();

  const log = await InventoryLog.create({
    product: product._id,
    action: 'stock_in',
    quantityBefore: before,
    quantityChanged: qty,
    quantityAfter: product.stockQty,
    reason: reason || 'Stock in',
    batchNumber: batchNumber || '',
    performedBy: req.user._id,
  });

  return successResponse(res, 201, 'Stock in recorded', { product, log });
});

// @desc    Stock Out
// @route   POST /api/v1/inventory-logs/stock-out
// @access  Protected
const stockOut = asyncHandler(async (req, res, next) => {
  const { productId, quantity, reason } = req.body;

  if (!productId || !quantity) {
    res.status(400);
    throw new Error('productId and quantity are required');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const qty = Number(quantity);
  if (product.stockQty < qty) {
    res.status(400);
    throw new Error(`Insufficient stock. Available: ${product.stockQty}, Requested: ${qty}`);
  }

  const before = product.stockQty;
  product.stockQty -= qty;
  await product.save();

  const log = await InventoryLog.create({
    product: product._id,
    action: 'stock_out',
    quantityBefore: before,
    quantityChanged: -qty,
    quantityAfter: product.stockQty,
    reason: reason || 'Stock out',
    performedBy: req.user._id,
  });

  return successResponse(res, 201, 'Stock out recorded', { product, log });
});

// @desc    Adjustment
// @route   POST /api/v1/inventory-logs/adjustment
// @access  Protected (admin/manager)
const adjustment = asyncHandler(async (req, res, next) => {
  const { productId, newQuantity, reason } = req.body;

  if (!productId || newQuantity === undefined) {
    res.status(400);
    throw new Error('productId and newQuantity are required');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const before = product.stockQty;
  const newQty = Number(newQuantity);
  const changed = newQty - before;

  product.stockQty = newQty;
  await product.save();

  const log = await InventoryLog.create({
    product: product._id,
    action: 'adjustment',
    quantityBefore: before,
    quantityChanged: changed,
    quantityAfter: newQty,
    reason: reason || 'Manual adjustment',
    performedBy: req.user._id,
  });

  return successResponse(res, 201, 'Adjustment recorded', { product, log });
});

// @desc    Wastage
// @route   POST /api/v1/inventory-logs/wastage
// @access  Protected
const wastage = asyncHandler(async (req, res, next) => {
  const { productId, quantity, reason } = req.body;

  if (!productId || !quantity) {
    res.status(400);
    throw new Error('productId and quantity are required');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const qty = Number(quantity);
  if (product.stockQty < qty) {
    res.status(400);
    throw new Error(`Insufficient stock for wastage. Available: ${product.stockQty}`);
  }

  const before = product.stockQty;
  product.stockQty -= qty;
  await product.save();

  const log = await InventoryLog.create({
    product: product._id,
    action: 'wastage',
    quantityBefore: before,
    quantityChanged: -qty,
    quantityAfter: product.stockQty,
    reason: reason || 'Wastage',
    performedBy: req.user._id,
  });

  return successResponse(res, 201, 'Wastage recorded', { product, log });
});

module.exports = { getLogs, stockIn, stockOut, adjustment, wastage };
