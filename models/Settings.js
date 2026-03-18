const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'GroceryIQ Store',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    lowStockThresholdPercent: {
      type: Number,
      default: 20,
      min: [1, 'Threshold must be at least 1%'],
      max: [100, 'Threshold cannot exceed 100%'],
    },
    expiryAlertDays: {
      type: Number,
      default: 7,
      min: [1, 'Alert days must be at least 1'],
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
    autoReorderEnabled: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
