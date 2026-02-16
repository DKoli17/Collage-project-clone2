#!/usr/bin/env node

/**
 * Migration Script: Link existing coupons to vendors
 * This fixes the issue where coupons exist but aren't linked in vendor.coupons array
 */

import mongoose from 'mongoose';
import Coupon from './models/Coupon.js';
import Vendor from './models/Vendor.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collage-platform';

async function fixCouponLinks() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all coupons
    const coupons = await Coupon.find({}).lean();
    console.log(`📋 Found ${coupons.length} total coupons in database\n`);

    if (coupons.length === 0) {
      console.log('❌ No coupons found in database.');
      console.log('💡 Please create some coupons via the admin dashboard first.\n');
      process.exit(0);
    }

    // Group coupons by vendor
    const couponsByVendor = {};
    coupons.forEach(coupon => {
      const vendorId = coupon.vendor?.toString();
      if (vendorId) {
        if (!couponsByVendor[vendorId]) {
          couponsByVendor[vendorId] = [];
        }
        couponsByVendor[vendorId].push(coupon._id);
      }
    });

    console.log(`🔗 Coupons by vendor:\n`);
    let totalLinked = 0;

    // Update each vendor with their coupons
    for (const vendorId of Object.keys(couponsByVendor)) {
      const couponIds = couponsByVendor[vendorId];
      
      // Get vendor info for logging
      const vendor = await Vendor.findById(vendorId).select('name').lean();
      if (vendor) {
        console.log(`   ${vendor.name}: ${couponIds.length} coupon(s)`);
        
        // Add all coupons to vendor's coupons array (prevents duplicates with $addToSet)
        await Vendor.findByIdAndUpdate(
          vendorId,
          { 
            $addToSet: { 
              coupons: { $each: couponIds }
            }
          },
          { new: true }
        );
        
        totalLinked += couponIds.length;
      }
    }

    console.log(`\n✅ Successfully linked ${totalLinked} coupons to vendors!\n`);

    // Show current state
    const activeCoupons = await Coupon.countDocuments({
      status: 'active',
      approvalStatus: 'approved',
      isActive: true
    });

    console.log(`📊 Database Summary:`);
    console.log(`   Total Coupons: ${coupons.length}`);
    console.log(`   Active Coupons: ${activeCoupons}`);
    console.log(`   Linked to Vendors: ${totalLinked}\n`);

    // Verify the links
    console.log(`🔍 Verifying vendor-coupon links...\n`);
    const vendors = await Vendor.find().populate({
      path: 'coupons',
      match: {
        status: 'active',
        approvalStatus: 'approved',
        isActive: true
      }
    }).lean();

    let vendorsWithCoupons = 0;
    vendors.forEach(vendor => {
      if (vendor.coupons && vendor.coupons.length > 0) {
        console.log(`   ✅ ${vendor.name}: ${vendor.coupons.length} active coupon(s)`);
        vendorsWithCoupons++;
      }
    });

    if (vendorsWithCoupons === 0) {
      console.log(`   ⚠️ No vendors with active coupons!`);
      console.log(`   💡 Make sure coupons have:`);
      console.log(`      - status: "active"`);
      console.log(`      - approvalStatus: "approved"`);
      console.log(`      - isActive: true`);
    }

    console.log(`\n   Total vendors with active coupons: ${vendorsWithCoupons}/${vendors.length}\n`);

    console.log('✨ Migration complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
fixCouponLinks();
