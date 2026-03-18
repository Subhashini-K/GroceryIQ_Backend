const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const Product = require('../models/Product');
const Category = require('../models/Category');
const InventoryLog = require('../models/InventoryLog');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const { daysUntilExpiry } = require('../utils/calculations');

// @desc    Stock summary report
// @route   GET /api/v1/reports/stock-summary
// @access  Protected
const stockSummary = asyncHandler(async (req, res, next) => {
  const [
    totalProducts,
    totalCategories,
    stockValueAgg,
    statusCounts,
    lowStockCount,
    outOfStockCount,
    top10,
  ] = await Promise.all([
    Product.countDocuments({ status: 'active' }),
    Category.countDocuments({ isActive: true }),
    Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$stockQty', '$costPrice'] } } } },
    ]),
    Product.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Product.countDocuments({
      status: 'active',
      $expr: { $and: [{ $gt: ['$stockQty', 0] }, { $lte: ['$stockQty', '$reorderThreshold'] }] },
    }),
    Product.countDocuments({ status: 'active', stockQty: 0 }),
    Product.aggregate([
      { $match: { status: 'active' } },
      { $addFields: { stockValue: { $multiply: ['$stockQty', '$costPrice'] } } },
      { $sort: { stockValue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $project: { name: 1, barcode: 1, stockQty: 1, costPrice: 1, stockValue: 1, 'category.name': 1 } },
    ]),
  ]);

  const totalStockValue = stockValueAgg[0]?.totalValue || 0;

  return successResponse(res, 200, 'Stock summary retrieved', {
    totalProducts,
    totalCategories,
    totalStockValue,
    productsByStatus: statusCounts,
    lowStockCount,
    outOfStockCount,
    top10ByValue: top10,
  });
});

// @desc    Stock movement report
// @route   GET /api/v1/reports/movement
// @access  Protected
const movementReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const match = {};

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  } else {
    // Default: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    match.createdAt = { $gte: thirtyDaysAgo };
  }

  const [dailyMovement, topProducts] = await Promise.all([
    InventoryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            action: '$action',
          },
          total: { $sum: { $abs: '$quantityChanged' } },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    InventoryLog.aggregate([
      { $match: match },
      { $group: { _id: '$product', totalMoved: { $sum: { $abs: '$quantityChanged' } } } },
      { $sort: { totalMoved: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { 'product.name': 1, 'product.barcode': 1, totalMoved: 1 } },
    ]),
  ]);

  return successResponse(res, 200, 'Movement report retrieved', { dailyMovement, topProducts });
});

// @desc    Expiry report
// @route   GET /api/v1/reports/expiry
// @access  Protected
const expiryReport = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const in3 = new Date(now); in3.setDate(now.getDate() + 3);
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);

  const [expired, exp3, exp7, exp30, expiringProducts] = await Promise.all([
    Product.countDocuments({ status: 'active', expiryDate: { $lt: now } }),
    Product.countDocuments({ status: 'active', expiryDate: { $gte: now, $lte: in3 } }),
    Product.countDocuments({ status: 'active', expiryDate: { $gte: now, $lte: in7 } }),
    Product.countDocuments({ status: 'active', expiryDate: { $gte: now, $lte: in30 } }),
    Product.find({ status: 'active', expiryDate: { $lte: in30 } })
      .sort({ expiryDate: 1 })
      .populate('category', 'name')
      .lean(),
  ]);

  const enriched = expiringProducts.map((p) => ({
    ...p,
    daysUntilExpiry: daysUntilExpiry(p.expiryDate),
    valueAtRisk: p.stockQty * p.sellingPrice,
  }));

  const totalValueAtRisk = enriched.reduce((s, p) => s + p.valueAtRisk, 0);

  return successResponse(res, 200, 'Expiry report retrieved', {
    counts: { expired, expiringIn3Days: exp3, expiringIn7Days: exp7, expiringIn30Days: exp30 },
    totalValueAtRisk,
    expiringProducts: enriched,
  });
});

// @desc    Supplier report
// @route   GET /api/v1/reports/supplier
// @access  Protected
const supplierReport = asyncHandler(async (req, res, next) => {
  const [supplierStats, avgLeadTime] = await Promise.all([
    Supplier.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'products',
          let: { suppId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$supplier', '$$suppId'] }, { $eq: ['$status', 'active'] }] } } },
            { $group: { _id: null, count: { $sum: 1 }, stockValue: { $sum: { $multiply: ['$stockQty', '$costPrice'] } } } },
          ],
          as: 'productData',
        },
      },
      {
        $lookup: {
          from: 'purchaseorders',
          let: { suppId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$supplier', '$$suppId'] }, { $eq: ['$status', 'pending'] }] } } },
            { $count: 'count' },
          ],
          as: 'pendingOrders',
        },
      },
      {
        $project: {
          name: 1,
          contactPerson: 1,
          email: 1,
          phone: 1,
          rating: 1,
          leadTimeDays: 1,
          productCount: { $ifNull: [{ $arrayElemAt: ['$productData.count', 0] }, 0] },
          totalStockValue: { $ifNull: [{ $arrayElemAt: ['$productData.stockValue', 0] }, 0] },
          pendingOrderCount: { $ifNull: [{ $arrayElemAt: ['$pendingOrders.count', 0] }, 0] },
        },
      },
    ]),
    Supplier.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgLeadTime: { $avg: '$leadTimeDays' } } },
    ]),
  ]);

  return successResponse(res, 200, 'Supplier report retrieved', {
    suppliers: supplierStats,
    averageLeadTimeDays: avgLeadTime[0]?.avgLeadTime || 0,
  });
});

module.exports = { stockSummary, movementReport, expiryReport, supplierReport };
