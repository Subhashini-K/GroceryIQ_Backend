const bcrypt = require('bcryptjs');

// ─── Users ────────────────────────────────────────────────────────────────────
const users = [
  {
    name: 'Admin User',
    email: 'admin@groceryiq.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'Store Manager',
    email: 'manager@groceryiq.com',
    password: 'Manager@123',
    role: 'manager',
    isActive: true,
  },
  {
    name: 'Staff Member',
    email: 'staff@groceryiq.com',
    password: 'Staff@123',
    role: 'staff',
    isActive: true,
  },
];

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = [
  { name: 'Dairy', description: 'Milk, cheese, yogurt and dairy products', icon: '🥛', color: '#3B82F6' },
  { name: 'Grains', description: 'Rice, wheat, flour and grain products', icon: '🌾', color: '#F59E0B' },
  { name: 'Beverages', description: 'Juices, sodas, water and drinks', icon: '🥤', color: '#8B5CF6' },
  { name: 'Snacks', description: 'Chips, biscuits and snack items', icon: '🍿', color: '#EF4444' },
  { name: 'Vegetables', description: 'Fresh and frozen vegetables', icon: '🥦', color: '#10B981' },
  { name: 'Frozen', description: 'Frozen foods and ice cream', icon: '🧊', color: '#06B6D4' },
];

// ─── Suppliers ────────────────────────────────────────────────────────────────
const suppliers = [
  {
    name: 'FreshFarm Co.',
    contactPerson: 'Ramesh Kumar',
    email: 'ramesh@freshfarm.com',
    phone: '+91-9876543210',
    address: { street: '12 Farmer Lane', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    rating: 5,
    leadTimeDays: 3,
    notes: 'Premium fresh produce supplier',
  },
  {
    name: 'GrainMaster Pvt Ltd',
    contactPerson: 'Suresh Shah',
    email: 'suresh@grainmaster.com',
    phone: '+91-9876543211',
    address: { street: '45 Mill Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
    rating: 4,
    leadTimeDays: 5,
    notes: 'Bulk grains and flour supplier',
  },
  {
    name: 'Beverage Kings',
    contactPerson: 'Priya Nair',
    email: 'priya@beveragekings.com',
    phone: '+91-9876543212',
    address: { street: '78 Drink Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    rating: 4,
    leadTimeDays: 2,
    notes: 'Authorized distributor for major beverage brands',
  },
  {
    name: 'Snack World Distributors',
    contactPerson: 'Ankit Sharma',
    email: 'ankit@snackworld.com',
    phone: '+91-9876543213',
    address: { street: '22 Munch Road', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    rating: 3,
    leadTimeDays: 7,
    notes: 'Wide range of packaged snacks',
  },
  {
    name: 'ColdChain Logistics',
    contactPerson: 'Meena Pillai',
    email: 'meena@coldchain.com',
    phone: '+91-9876543214',
    address: { street: '99 Freeze Ave', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
    rating: 5,
    leadTimeDays: 1,
    notes: 'Frozen and chilled goods specialist',
  },
];

// ─── Product builder helper ───────────────────────────────────────────────────
const makeProduct = (overrides) => ({
  description: '',
  batchNumber: `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  images: [],
  status: 'active',
  ...overrides,
});

// Products will be built dynamically in seeder after IDs are known
const getProducts = (catMap, supMap) => {
  const now = new Date();
  const daysFromNow = (d) => { const dt = new Date(now); dt.setDate(dt.getDate() + d); return dt; };

  return [
    // ── Dairy ──
    makeProduct({ name: 'Full Cream Milk 1L', barcode: 'DAI-001', category: catMap['Dairy'], supplier: supMap['FreshFarm Co.'], unit: 'litre', costPrice: 50, sellingPrice: 60, stockQty: 200, reorderThreshold: 50, expiryDate: daysFromNow(5) }),
    makeProduct({ name: 'Amul Butter 500g', barcode: 'DAI-002', category: catMap['Dairy'], supplier: supMap['FreshFarm Co.'], unit: 'g', costPrice: 220, sellingPrice: 260, stockQty: 80, reorderThreshold: 20, expiryDate: daysFromNow(30) }),
    makeProduct({ name: 'Curd 400g Cup', barcode: 'DAI-003', category: catMap['Dairy'], supplier: supMap['FreshFarm Co.'], unit: 'g', costPrice: 40, sellingPrice: 50, stockQty: 5, reorderThreshold: 20, expiryDate: daysFromNow(2) }),  // low stock + expiring
    makeProduct({ name: 'Paneer 200g', barcode: 'DAI-004', category: catMap['Dairy'], supplier: supMap['FreshFarm Co.'], unit: 'g', costPrice: 90, sellingPrice: 110, stockQty: 0, reorderThreshold: 15, expiryDate: daysFromNow(-2) }),  // out of stock + expired
    makeProduct({ name: 'Cheese Slices 200g', barcode: 'DAI-005', category: catMap['Dairy'], supplier: supMap['FreshFarm Co.'], unit: 'g', costPrice: 130, sellingPrice: 160, stockQty: 45, reorderThreshold: 20, expiryDate: daysFromNow(14) }),

    // ── Grains ──
    makeProduct({ name: 'Basmati Rice 5kg', barcode: 'GRN-001', category: catMap['Grains'], supplier: supMap['GrainMaster Pvt Ltd'], unit: 'kg', costPrice: 350, sellingPrice: 420, stockQty: 150, reorderThreshold: 30 }),
    makeProduct({ name: 'Wheat Flour 10kg', barcode: 'GRN-002', category: catMap['Grains'], supplier: supMap['GrainMaster Pvt Ltd'], unit: 'kg', costPrice: 280, sellingPrice: 340, stockQty: 8, reorderThreshold: 25 }),  // low stock
    makeProduct({ name: 'Toor Dal 1kg', barcode: 'GRN-003', category: catMap['Grains'], supplier: supMap['GrainMaster Pvt Ltd'], unit: 'kg', costPrice: 110, sellingPrice: 135, stockQty: 90, reorderThreshold: 20 }),
    makeProduct({ name: 'Poha 500g', barcode: 'GRN-004', category: catMap['Grains'], supplier: supMap['GrainMaster Pvt Ltd'], unit: 'g', costPrice: 40, sellingPrice: 55, stockQty: 60, reorderThreshold: 15 }),
    makeProduct({ name: 'Semolina (Rava) 1kg', barcode: 'GRN-005', category: catMap['Grains'], supplier: supMap['GrainMaster Pvt Ltd'], unit: 'kg', costPrice: 55, sellingPrice: 70, stockQty: 0, reorderThreshold: 10 }),  // out of stock

    // ── Beverages ──
    makeProduct({ name: 'Tropicana Orange Juice 1L', barcode: 'BEV-001', category: catMap['Beverages'], supplier: supMap['Beverage Kings'], unit: 'litre', costPrice: 90, sellingPrice: 110, stockQty: 120, reorderThreshold: 30, expiryDate: daysFromNow(60) }),
    makeProduct({ name: 'Sprite 2L Bottle', barcode: 'BEV-002', category: catMap['Beverages'], supplier: supMap['Beverage Kings'], unit: 'litre', costPrice: 60, sellingPrice: 75, stockQty: 3, reorderThreshold: 20, expiryDate: daysFromNow(7) }),  // low stock + expiring
    makeProduct({ name: 'Bisleri Water 1L', barcode: 'BEV-003', category: catMap['Beverages'], supplier: supMap['Beverage Kings'], unit: 'litre', costPrice: 15, sellingPrice: 20, stockQty: 500, reorderThreshold: 100 }),
    makeProduct({ name: 'Red Bull 250ml', barcode: 'BEV-004', category: catMap['Beverages'], supplier: supMap['Beverage Kings'], unit: 'ml', costPrice: 95, sellingPrice: 115, stockQty: 48, reorderThreshold: 20 }),
    makeProduct({ name: 'Green Tea Box 25 bags', barcode: 'BEV-005', category: catMap['Beverages'], supplier: supMap['Beverage Kings'], unit: 'box', costPrice: 80, sellingPrice: 100, stockQty: 35, reorderThreshold: 10, expiryDate: daysFromNow(180) }),

    // ── Snacks ──
    makeProduct({ name: "Lay's Classic Chips 90g", barcode: 'SNK-001', category: catMap['Snacks'], supplier: supMap['Snack World Distributors'], unit: 'g', costPrice: 20, sellingPrice: 30, stockQty: 200, reorderThreshold: 50, expiryDate: daysFromNow(45) }),
    makeProduct({ name: 'Britannia Good Day Biscuits', barcode: 'SNK-002', category: catMap['Snacks'], supplier: supMap['Snack World Distributors'], unit: 'pack', costPrice: 30, sellingPrice: 40, stockQty: 10, reorderThreshold: 30, expiryDate: daysFromNow(3) }),  // low stock + expiring
    makeProduct({ name: 'Maggi Noodles 70g', barcode: 'SNK-003', category: catMap['Snacks'], supplier: supMap['Snack World Distributors'], unit: 'pack', costPrice: 12, sellingPrice: 15, stockQty: 300, reorderThreshold: 80, expiryDate: daysFromNow(-5) }),  // expired
    makeProduct({ name: 'Kurkure Masala 80g', barcode: 'SNK-004', category: catMap['Snacks'], supplier: supMap['Snack World Distributors'], unit: 'g', costPrice: 18, sellingPrice: 25, stockQty: 150, reorderThreshold: 40 }),
    makeProduct({ name: 'Oreo Cookies 120g', barcode: 'SNK-005', category: catMap['Snacks'], supplier: supMap['Snack World Distributors'], unit: 'pack', costPrice: 55, sellingPrice: 70, stockQty: 75, reorderThreshold: 20 }),

    // ── Vegetables ──
    makeProduct({ name: 'Tomatoes 1kg', barcode: 'VEG-001', category: catMap['Vegetables'], supplier: supMap['FreshFarm Co.'], unit: 'kg', costPrice: 30, sellingPrice: 45, stockQty: 50, reorderThreshold: 20, expiryDate: daysFromNow(6) }),
    makeProduct({ name: 'Onions 2kg Bag', barcode: 'VEG-002', category: catMap['Vegetables'], supplier: supMap['FreshFarm Co.'], unit: 'kg', costPrice: 25, sellingPrice: 40, stockQty: 80, reorderThreshold: 25 }),
    makeProduct({ name: 'Capsicum 500g', barcode: 'VEG-003', category: catMap['Vegetables'], supplier: supMap['FreshFarm Co.'], unit: 'g', costPrice: 40, sellingPrice: 60, stockQty: 0, reorderThreshold: 10, expiryDate: daysFromNow(-1) }),  // out of stock + expired

    // ── Frozen ──
    makeProduct({ name: 'McCain French Fries 1kg', barcode: 'FRZ-001', category: catMap['Frozen'], supplier: supMap['ColdChain Logistics'], unit: 'kg', costPrice: 160, sellingPrice: 200, stockQty: 60, reorderThreshold: 15, expiryDate: daysFromNow(90) }),
    makeProduct({ name: 'Amul Ice Cream Vanilla 500ml', barcode: 'FRZ-002', category: catMap['Frozen'], supplier: supMap['ColdChain Logistics'], unit: 'ml', costPrice: 130, sellingPrice: 165, stockQty: 40, reorderThreshold: 10, expiryDate: daysFromNow(120) }),
  ];
};

module.exports = { users, categories, suppliers, getProducts };
