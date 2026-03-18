const mongoose = require('mongoose');
const { getStockStatus } = require('../utils/calculations');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    barcode: {
      type: String,
      required: [true, 'Barcode is required'],
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
      index: true,
    },
    unit: {
      type: String,
      enum: ['kg', 'g', 'litre', 'ml', 'piece', 'dozen', 'box', 'pack'],
      required: [true, 'Unit is required'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stockQty: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
    },
    reorderThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Reorder threshold cannot be negative'],
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    batchNumber: {
      type: String,
      default: '',
    },
    images: [
      {
        url: { type: String },
        public_id: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: stockStatus
productSchema.virtual('stockStatus').get(function () {
  return getStockStatus(this.stockQty, this.reorderThreshold);
});

module.exports = mongoose.model('Product', productSchema);
