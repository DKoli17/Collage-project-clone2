#!/usr/bin/env node

/**
 * Quick Test: Create a sample coupon
 * Run: node create-test-coupon.js
 */

import mongoose from 'mongoose';
import Coupon from './models/Coupon.js';
import Vendor from './models/Vendor.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collage-platform';

async function createTestCoupon() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // Get first vendor
    const vendor = await Vendor.findOne({ approvalStatus: 'approved' });
    
    if (!vendor) {
      console.log('❌ No approved vendors found!');
      console.log('💡 Please create vendor first via admin dashboard\n');
      process.exit(1);
    }

    console.log(`📌 Creating coupon for vendor: ${vendor.businessName}\n`);

    // Create test coupon
    const coupon = new Coupon({
      code: `TEST-${Date.now().toString().slice(-6)}`,
      vendor: vendor._id,
      discount: 25,
      discountType: 'percentage',
      description: 'Test coupon for student discounts',
      category: 'General',
      couponType: 'vendor-created',
      status: 'active',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date(),
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      maxRedemptions: 100,
      currentRedemptions: 0,
    });

    const savedCoupon = await coupon.save();
    console.log('✅ Coupon created:');
    console.log(`   Code: ${savedCoupon.code}`);
    console.log(`   Discount: ${savedCoupon.discount}%`);
    console.log(`   Status: ${savedCoupon.status}`);
    console.log(`   ApprovalStatus: ${savedCoupon.approvalStatus}`);
    console.log(`   IsActive: ${savedCoupon.isActive}\n`);

    // Add to vendor's coupons array
    const updated = await Vendor.findByIdAndUpdate(
      vendor._id,
      { $addToSet: { coupons: savedCoupon._id } },
      { new: true }
    );

    console.log(`✅ Coupon linked to vendor`);
    console.log(`   Total coupons for ${vendor.businessName}: ${updated.coupons.length}\n`);

    // Verify it shows up when populated
    const verifyVendor = await Vendor.findById(vendor._id).populate({
      path: 'coupons',
      match: {
        status: 'active',
        approvalStatus: 'approved',
        isActive: true
      }
    });

    console.log(`🔍 Verification:`);
    console.log(`   Active coupons for ${verifyVendor.businessName}: ${verifyVendor.coupons.length}`);
    if (verifyVendor.coupons.length > 0) {
      console.log(`   ✅ Coupons are populating correctly!\n`);
    }

    console.log('✨ Test complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

createTestCoupon();
