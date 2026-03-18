const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { users, categories, suppliers, getProducts } = require('./seedData');

const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const PurchaseOrder = require('../models/PurchaseOrder');
const Settings = require('../models/Settings');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected for seeding...');
};

// ─── Import (seed) ────────────────────────────────────────────────────────────
const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Supplier.deleteMany();
    await Product.deleteMany();
    await InventoryLog.deleteMany();
    await PurchaseOrder.deleteMany();
    await Settings.deleteMany();

    console.log('🗑️  Cleared existing data');

    // Seed Users (need to hash passwords manually since seeder bypasses pre-save hook?)
    // Actually User.create() triggers pre-save — use insertMany map via User.create
    const createdUsers = [];
    for (const u of users) {
      const created = await User.create(u);
      createdUsers.push(created);
    }
    console.log(`✅ Inserted ${createdUsers.length} users`);

    const adminUser = createdUsers.find((u) => u.role === 'admin');

    // Seed Categories
    const createdCategories = await Category.insertMany(
      categories.map((c) => ({ ...c, createdBy: adminUser._id }))
    );
    console.log(`✅ Inserted ${createdCategories.length} categories`);

    // Build category map: name -> _id
    const catMap = {};
    createdCategories.forEach((c) => { catMap[c.name] = c._id; });

    // Seed Suppliers
    const createdSuppliers = await Supplier.insertMany(
      suppliers.map((s) => ({ ...s, createdBy: adminUser._id }))
    );
    console.log(`✅ Inserted ${createdSuppliers.length} suppliers`);

    // Build supplier map: name -> _id
    const supMap = {};
    createdSuppliers.forEach((s) => { supMap[s.name] = s._id; });

    // Seed Products
    const productData = getProducts(catMap, supMap);
    const createdProducts = await Product.insertMany(
      productData.map((p) => ({ ...p, createdBy: adminUser._id }))
    );
    console.log(`✅ Inserted ${createdProducts.length} products`);

    // Seed InventoryLogs — 30 entries spanning last 30 days
    const actions = ['stock_in', 'stock_out', 'adjustment', 'wastage', 'stock_in'];
    const staffUser = createdUsers.find((u) => u.role === 'staff') || adminUser;
    const logs = [];

    for (let i = 0; i < 30; i++) {
      const product = createdProducts[i % createdProducts.length];
      const daysAgo = 30 - i;
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - daysAgo);

      const action = actions[i % actions.length];
      const change = action === 'stock_out' || action === 'wastage' ? -Math.floor(Math.random() * 10 + 1) : Math.floor(Math.random() * 50 + 5);
      const before = Math.abs(Math.floor(Math.random() * 100 + 10));
      const after = Math.max(0, before + change);

      logs.push({
        product: product._id,
        action,
        quantityBefore: before,
        quantityChanged: change,
        quantityAfter: after,
        reason: `Seeded ${action} entry`,
        performedBy: staffUser._id,
        createdAt: logDate,
        updatedAt: logDate,
      });
    }

    await InventoryLog.insertMany(logs);
    console.log(`✅ Inserted ${logs.length} inventory logs`);

    // Seed default settings
    await Settings.create({
      storeName: 'GroceryIQ Walmart Store',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      lowStockThresholdPercent: 20,
      expiryAlertDays: 7,
      updatedBy: adminUser._id,
    });
    console.log('✅ Inserted default settings');

    console.log('\n🎉 Database seeded successfully!');
    console.log('─────────────────────────────────────');
    console.log('Admin Login:   admin@groceryiq.com / Admin@123');
    console.log('Manager Login: manager@groceryiq.com / Manager@123');
    console.log('Staff Login:   staff@groceryiq.com / Staff@123');
    console.log('─────────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

// ─── Destroy ──────────────────────────────────────────────────────────────────
const destroyData = async () => {
  try {
    await connectDB();

    await User.deleteMany();
    await Category.deleteMany();
    await Supplier.deleteMany();
    await Product.deleteMany();
    await InventoryLog.deleteMany();
    await PurchaseOrder.deleteMany();
    await Settings.deleteMany();

    console.log('🗑️  All data destroyed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Destroy failed:', err.message);
    process.exit(1);
  }
};

// ─── CLI entry ────────────────────────────────────────────────────────────────
const arg = process.argv[2];
if (arg === '--import') {
  importData();
} else if (arg === '--destroy') {
  destroyData();
} else {
  console.log('Usage: node seeds/seeder.js --import | --destroy');
  process.exit(1);
}
