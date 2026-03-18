const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantityOrdered: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        unitPrice: {
          type: Number,
          required: true,
          min: [0, 'Unit price cannot be negative'],
        },
        quantityReceived: {
          type: Number,
          default: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    orderedAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Pre-save: auto-generate orderNumber as "PO-YYYYMMDD-XXXX"
purchaseOrderSchema.pre('save', async function (next) {
  if (this.orderNumber) return next();

  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  const count = await mongoose.model('PurchaseOrder').countDocuments({
    orderNumber: new RegExp(`^PO-${dateStr}-`),
  });

  const seq = String(count + 1).padStart(4, '0');
  this.orderNumber = `PO-${dateStr}-${seq}`;
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
