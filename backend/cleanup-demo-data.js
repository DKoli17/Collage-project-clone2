#!/usr/bin/env node

/**
 * Cleanup Script - Remove Demo Vendors and Offers
 * Run: node cleanup-demo-data.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import Vendor from './models/Vendor.js';
import Offer from './models/Offer.js';
import Coupon from './models/Coupon.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_app';

async function cleanupDemoData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete demo vendors
    console.log('\n🗑️  Removing demo vendors...');
    const vendorDeleteResult = await Vendor.deleteMany({ 
      email: { $regex: /test-vendor|Pizza|Fashion|Electronics|Tech/ } 
    });
    console.log(`✅ Deleted ${vendorDeleteResult.deletedCount} demo vendors`);

    // Delete demo offers
    console.log('\n🗑️  Removing demo offers...');
    const offerDeleteResult = await Offer.deleteMany({ 
      title: { $regex: /Test Offer|Pizza|Fashion|Electronics|50%|30%|25%|40%|100/ } 
    });
    console.log(`✅ Deleted ${offerDeleteResult.deletedCount} demo offers`);

    // Delete demo coupons
    console.log('\n🗑️  Removing demo coupons...');
    const couponDeleteResult = await Coupon.deleteMany({ 
      code: { $regex: /OFFER-|TEST/ } 
    });
    console.log(`✅ Deleted ${couponDeleteResult.deletedCount} demo coupons`);

    console.log('\n✨ Demo data cleanup completed!');

    // Show remaining count
    const vendorCount = await Vendor.countDocuments();
    const offerCount = await Offer.countDocuments();
    const couponCount = await Coupon.countDocuments();

    console.log('\n📊 Remaining data:');
    console.log(`   Vendors: ${vendorCount}`);
    console.log(`   Offers: ${offerCount}`);
    console.log(`   Coupons: ${couponCount}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    process.exit(1);
  }
}

cleanupDemoData();
