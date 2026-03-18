const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');

// @desc    Get all suppliers (paginated, searchable)
// @route   GET /api/v1/suppliers
// @access  Protected
const getSuppliers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search } = req.query;
  const query = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [suppliers, total] = await Promise.all([
    Supplier.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
    Supplier.countDocuments(query),
  ]);

  return successResponse(res, 200, 'Suppliers retrieved', suppliers, {
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// @desc    Get single supplier with products and order history
// @route   GET /api/v1/suppliers/:id
// @access  Protected
const getSupplierById = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  const [products, orders] = await Promise.all([
    Product.find({ supplier: supplier._id, status: 'active' })
      .select('name barcode stockQty unit sellingPrice')
      .lean(),
    PurchaseOrder.find({ supplier: supplier._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return successResponse(res, 200, 'Supplier retrieved', {
    ...supplier.toObject(),
    products,
    purchaseOrders: orders,
  });
});

// @desc    Create supplier
// @route   POST /api/v1/suppliers
// @access  Protected (admin/manager)
const createSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.create({ ...req.body, createdBy: req.user._id });
  return successResponse(res, 201, 'Supplier created successfully', supplier);
});

// @desc    Update supplier
// @route   PUT /api/v1/suppliers/:id
// @access  Protected (admin/manager)
const updateSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  return successResponse(res, 200, 'Supplier updated successfully', supplier);
});

// @desc    Soft delete supplier
// @route   DELETE /api/v1/suppliers/:id
// @access  Protected (admin)
const deleteSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  return successResponse(res, 200, 'Supplier deactivated successfully');
});

module.exports = { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
