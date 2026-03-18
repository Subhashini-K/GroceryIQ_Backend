const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryLog = require('../models/InventoryLog');
const { calculateOrderTotal } = require('../utils/calculations');

// @desc    Get restock alerts grouped by critical/low
// @route   GET /api/v1/restock/alerts
// @access  Protected
const getRestockAlerts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    status: 'active',
    $expr: { $lte: ['$stockQty', '$reorderThreshold'] },
  })
    .populate('supplier', 'name contactPerson phone email leadTimeDays')
    .populate('category', 'name')
    .lean();

  const critical = products.filter((p) => p.stockQty === 0);
  const low = products.filter((p) => p.stockQty > 0);

  return successResponse(res, 200, 'Restock alerts retrieved', {
    critical,
    low,
    totalAlerts: products.length,
  });
});

// @desc    Create purchase order
// @route   POST /api/v1/restock/purchase-order
// @access  Protected (admin/manager)
const createPurchaseOrder = asyncHandler(async (req, res, next) => {
  const { supplierId, items, notes } = req.body;

  if (!supplierId || !items || items.length === 0) {
    res.status(400);
    throw new Error('supplierId and items are required');
  }

  const orderItems = items.map((i) => ({
    product: i.productId,
    quantityOrdered: Number(i.quantity),
    unitPrice: Number(i.unitPrice),
    quantityReceived: 0,
  }));

  const totalAmount = calculateOrderTotal(orderItems);

  const order = await PurchaseOrder.create({
    supplier: supplierId,
    items: orderItems,
    totalAmount,
    notes: notes || '',
    orderedBy: req.user._id,
  });

  await order.populate(['supplier', { path: 'items.product', select: 'name barcode' }]);

  return successResponse(res, 201, 'Purchase order created', order);
});

// @desc    Get all purchase orders
// @route   GET /api/v1/restock/purchase-orders
// @access  Protected
const getPurchaseOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status, supplier } = req.query;
  const query = {};
  if (status) query.status = status;
  if (supplier) query.supplier = supplier;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query)
      .populate('supplier', 'name contactPerson')
      .populate('items.product', 'name barcode')
      .populate('orderedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    PurchaseOrder.countDocuments(query),
  ]);

  return successResponse(res, 200, 'Purchase orders retrieved', orders, {
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// @desc    Update purchase order status
// @route   PUT /api/v1/restock/purchase-orders/:id/status
// @access  Protected (admin/manager)
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'ordered', 'received', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  const order = await PurchaseOrder.findById(req.params.id).populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found');
  }

  const prevStatus = order.status;
  order.status = status;

  if (status === 'approved') {
    order.approvedBy = req.user._id;
  }

  if (status === 'ordered') {
    order.orderedAt = new Date();
  }

  if (status === 'received' && prevStatus !== 'received') {
    order.receivedAt = new Date();

    // Auto stock-in for each item
    const stockInPromises = order.items.map(async (item) => {
      const product = await Product.findById(item.product._id || item.product);
      if (!product) return;

      const qty = item.quantityOrdered;
      const before = product.stockQty;
      product.stockQty += qty;
      item.quantityReceived = qty;
      await product.save();

      await InventoryLog.create({
        product: product._id,
        action: 'stock_in',
        quantityBefore: before,
        quantityChanged: qty,
        quantityAfter: product.stockQty,
        reason: `Purchase order received: ${order.orderNumber}`,
        performedBy: req.user._id,
      });
    });

    await Promise.all(stockInPromises);
  }

  await order.save();

  return successResponse(res, 200, 'Purchase order status updated', order);
});

module.exports = { getRestockAlerts, createPurchaseOrder, getPurchaseOrders, updateOrderStatus };
