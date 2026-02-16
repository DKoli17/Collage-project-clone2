import mongoose from 'mongoose';
import Coupon from './models/Coupon.js';
import Vendor from './models/Vendor.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collage-platform';

async function checkCoupons() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('‚úÖ Connected to MongoDB');

    // Check vendors with coupons
    const vendors = await Vendor.find().select('name coupons').lean();
    console.log(`\nÌ≥ä Total Vendors: ${vendors.length}`);
    
    vendors.forEach(v => {
      console.log(`  - ${v.name}: ${v.coupons?.length || 0} coupons`);
    });

    // Check all coupons
    const allCoupons = await Coupon.find().lean();
    console.log(`\nÌ≥ä Total Coupons: ${allCoupons.length}`);

    // Check active coupons
    const activeCoupons = await Coupon.find({
      status: 'active',
      approvalStatus: 'approved',
      isActive: true
    }).lean();
    console.log(`‚úÖ Active & Approved Coupons: ${activeCoupons.length}`);

    // Show sample coupons
    if (activeCoupons.length > 0) {
      console.log(`\nÌ≥ã Sample Active Coupon:`);
      const sample = activeCoupons[0];
      console.log(`  Code: ${sample.code}`);
      console.log(`  Vendor: ${sample.vendor}`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  ApprovalStatus: ${sample.approvalStatus}`);
      console.log(`  IsActive: ${sample.isActive}`);
    }

    // Check coupons-vendor relationship
    console.log(`\nÌ¥ó Checking coupons-vendor relationships...`);
    const vendorsWithPopulated = await Vendor.find()
      .populate({
        path: 'coupons',
        match: { 
          status: 'active',
          approvalStatus: 'approved',
          isActive: true
        },
      })
      .lean();

    vendorsWithPopulated.forEach(v => {
      if (v.coupons && v.coupons.length > 0) {
        console.log(`  ${v.name}: ${v.coupons.length} active coupons`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('‚ùå Error:', error.message);
    process.exit(1);
  }
}

checkCoupons();
