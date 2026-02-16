import mongoose from 'mongoose';

const MongoDB_URI = 'mongodb://localhost:27017/collage-platform';

async function test() {
  try {
    const conn = await mongoose.connect(MongoDB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected');
    const db = conn.connection.db;
    const couponCount = await db.collection('coupons').countDocuments();
    const vendorCount = await db.collection('vendors').countDocuments();
    console.log(`Coupons: ${couponCount}, Vendors: ${vendorCount}`);
    
    // Get first coupon
    const coupon = await db.collection('coupons').findOne({});
    if (coupon) {
      console.log('Coupon:', {
        code: coupon.code,
        status: coupon.status,
        approvalStatus: coupon.approvalStatus,
        isActive: coupon.isActive,
        vendor: coupon.vendor
      });
    }
    
    // Get first vendor
    const vendor = await db.collection('vendors').findOne({});
    if (vendor) {
      console.log('Vendor:', {
        name: vendor.name,
        couponsArray: vendor.coupons?.length || 0
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

test();
