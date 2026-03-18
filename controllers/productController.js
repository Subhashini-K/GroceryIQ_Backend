const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

// @desc    Get all products (paginated, filtered, sorted)
// @route   GET /api/v1/products
// @access  Protected
const getProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    supplier,
    status,
    stockStatus,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) query.category = category;
  if (supplier) query.supplier = supplier;
  if (status) query.status = status;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (Number(page) - 1) * Number(limit);

  let products = await Product.find(query)
    .populate('category', 'name color icon')
    .populate('supplier', 'name contactPerson')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Filter by stockStatus (virtual, can't query directly)
  if (stockStatus) {
    const { getStockStatus } = require('../utils/calculations');
    products = products.filter(
      (p) => getStockStatus(p.stockQty, p.reorderThreshold) === stockStatus
    );
  }

  const total = await Product.countDocuments(query);

  return successResponse(res, 200, 'Products retrieved', products, {
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    limit: Number(limit),
  });
});

// @desc    Get single product by ID
// @route   GET /api/v1/products/:id
// @access  Protected
const getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('category')
    .populate('supplier');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const logs = await InventoryLog.find({ product: product._id })
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return successResponse(res, 200, 'Product retrieved', { ...product.toObject(), recentLogs: logs });
});

// @desc    Get product by barcode
// @route   GET /api/v1/products/barcode/:barcode
// @access  Protected
const getProductByBarcode = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ barcode: req.params.barcode })
    .populate('category')
    .populate('supplier');

  if (!product) {
    res.status(404);
    throw new Error('Product not found with that barcode');
  }

  return successResponse(res, 200, 'Product retrieved', product);
});

// @desc    Create a product
// @route   POST /api/v1/products
// @access  Protected (admin/manager)
const createProduct = asyncHandler(async (req, res, next) => {
  const body = { ...req.body, createdBy: req.user._id };

  // Handle uploaded images
  if (req.files && req.files.length > 0) {
    body.images = req.files.map((f) => ({
      url: `/uploads/products/${f.filename}`,
      public_id: f.filename,
    }));
  } else if (req.file) {
    body.images = [{ url: `/uploads/products/${req.file.filename}`, public_id: req.file.filename }];
  }

  const product = await Product.create(body);

  // If initial stock > 0, create a stock_in log
  if (product.stockQty > 0) {
    await InventoryLog.create({
      product: product._id,
      action: 'stock_in',
      quantityBefore: 0,
      quantityChanged: product.stockQty,
      quantityAfter: product.stockQty,
      reason: 'Initial stock',
      batchNumber: product.batchNumber || '',
      performedBy: req.user._id,
    });
  }

  return successResponse(res, 201, 'Product created successfully', product);
});

// @desc    Update a product
// @route   PUT /api/v1/products/:id
// @access  Protected (admin/manager)
const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const oldQty = product.stockQty;
  const newQty = req.body.stockQty !== undefined ? Number(req.body.stockQty) : oldQty;

  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Log stock change if quantity changed
  if (newQty !== oldQty) {
    await InventoryLog.create({
      product: updated._id,
      action: 'adjustment',
      quantityBefore: oldQty,
      quantityChanged: newQty - oldQty,
      quantityAfter: newQty,
      reason: req.body.reason || 'Manual update',
      performedBy: req.user._id,
    });
  }

  return successResponse(res, 200, 'Product updated successfully', updated);
});

// @desc    Soft delete a product
// @route   DELETE /api/v1/products/:id
// @access  Protected (admin)
const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  await Product.findByIdAndUpdate(req.params.id, { status: 'inactive' });

  return successResponse(res, 200, 'Product deactivated successfully');
});

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Protected
const getLowStockProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    status: 'active',
    $expr: { $lte: ['$stockQty', '$reorderThreshold'] },
  })
    .populate('category', 'name')
    .populate('supplier', 'name')
    .lean();

  // Sort by ratio asc
  products.sort((a, b) => {
    const ratioA = a.reorderThreshold ? a.stockQty / a.reorderThreshold : 0;
    const ratioB = b.reorderThreshold ? b.stockQty / b.reorderThreshold : 0;
    return ratioA - ratioB;
  });

  return successResponse(res, 200, 'Low stock products retrieved', products, { total: products.length });
});

// @desc    Get expiring products
// @route   GET /api/v1/products/expiring
// @access  Protected
const getExpiringProducts = asyncHandler(async (req, res, next) => {
  const days = parseInt(req.query.days) || 7;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const products = await Product.find({
    status: 'active',
    expiryDate: { $lte: futureDate },
  })
    .populate('category', 'name')
    .populate('supplier', 'name')
    .sort({ expiryDate: 1 })
    .lean();

  const { daysUntilExpiry, getExpiryStatus } = require('../utils/calculations');
  const enriched = products.map((p) => ({
    ...p,
    daysUntilExpiry: daysUntilExpiry(p.expiryDate),
    expiryStatus: getExpiryStatus(p.expiryDate),
  }));

  return successResponse(res, 200, 'Expiring products retrieved', enriched, { total: enriched.length });
});

module.exports = {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getExpiringProducts,
};
