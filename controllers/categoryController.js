const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories with product count
// @route   GET /api/v1/categories
// @access  Protected
const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'products',
        let: { catId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$category', '$$catId'] }, { $eq: ['$status', 'active'] }] } } },
        ],
        as: 'products',
      },
    },
    { $addFields: { productCount: { $size: '$products' } } },
    { $project: { products: 0 } },
    { $sort: { name: 1 } },
  ]);

  return successResponse(res, 200, 'Categories retrieved', categories);
});

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Protected
const getCategoryById = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const products = await Product.find({ category: category._id, status: 'active' })
    .select('name barcode stockQty sellingPrice unit')
    .lean();

  return successResponse(res, 200, 'Category retrieved', { ...category.toObject(), products });
});

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Protected (admin/manager)
const createCategory = asyncHandler(async (req, res, next) => {
  const exists = await Category.findOne({ name: { $regex: `^${req.body.name}$`, $options: 'i' } });
  if (exists) {
    res.status(400);
    throw new Error('Category with this name already exists');
  }

  const category = await Category.create({ ...req.body, createdBy: req.user._id });
  return successResponse(res, 201, 'Category created successfully', category);
});

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Protected (admin/manager)
const updateCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  return successResponse(res, 200, 'Category updated successfully', category);
});

// @desc    Delete category (only if no active products)
// @route   DELETE /api/v1/categories/:id
// @access  Protected (admin)
const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const activeProductCount = await Product.countDocuments({
    category: req.params.id,
    status: 'active',
  });

  if (activeProductCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete category. It has ${activeProductCount} active product(s) linked to it.`
    );
  }

  await Category.findByIdAndDelete(req.params.id);
  return successResponse(res, 200, 'Category deleted successfully');
});

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
