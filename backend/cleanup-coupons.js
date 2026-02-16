#!/usr/bin/env node

/**
 * Cleanup Script: Remove test coupons from database
 * Run: node cleanup-coupons.js
 */

import mongoose from 'mongoose';
import Coupon from './models/Coupon.js';
import Vendor from './models/Vendor.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collage-platform';

async function cleanupCoupons() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // Count before
    const couponsBefore = await Coupon.countDocuments();
    console.log(`📋 Coupons before cleanup: ${couponsBefore}`);

    // Delete all coupons
    const result = await Coupon.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} coupons\n`);

    // Clear coupons from vendors
    const vendorResult = await Vendor.updateMany(
      {},
      { $set: { coupons: [] } }
    );
    console.log(`✅ Cleared coupons array from ${vendorResult.modifiedCount} vendors\n`);

    const couponsAfter = await Coupon.countDocuments();
    console.log(`📋 Coupons after cleanup: ${couponsAfter}`);
    console.log('\n✨ Cleanup complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupCoupons();
