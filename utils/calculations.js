/**
 * Utility calculation functions for inventory management.
 */

/**
 * Determine stock status based on qty and reorder threshold.
 * @param {number} qty
 * @param {number} threshold
 * @returns {'Out of Stock'|'Low Stock'|'In Stock'}
 */
const getStockStatus = (qty, threshold) => {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= threshold) return 'Low Stock';
  return 'In Stock';
};

/**
 * Get human-readable expiry status.
 * @param {Date} expiryDate
 * @returns {'Expired'|'Today'|'3 Days'|'7 Days'|'Safe'}
 */
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return 'Safe';
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Today';
  if (diffDays <= 3) return '3 Days';
  if (diffDays <= 7) return '7 Days';
  return 'Safe';
};

/**
 * Number of days until expiry (negative if expired).
 * @param {Date} expiryDate
 * @returns {number}
 */
const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return Infinity;
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

/**
 * Calculate total order amount from items array.
 * @param {Array<{quantityOrdered: number, unitPrice: number}>} items
 * @returns {number}
 */
const calculateOrderTotal = (items) => {
  return items.reduce((sum, item) => sum + item.quantityOrdered * item.unitPrice, 0);
};

module.exports = { getStockStatus, getExpiryStatus, daysUntilExpiry, calculateOrderTotal };
