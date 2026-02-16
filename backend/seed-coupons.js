#!/usr/bin/env node

/**
 * Seed Data Script for Coupon System Testing
 * 
 * This script creates sample data for testing the coupon purchase and validation system.
 * Run: node seed-coupons.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { hashPassword } from './utils/helpers.js';

dotenv.config();

// Import models
import Student from './models/Student.js';
import Vendor from './models/Vendor.js';
import Offer from './models/Offer.js';
import CouponPurchase from './models/CouponPurchase.js';
import User from './models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_app';

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional)
    console.log('\n🗑️  Clearing existing test data...');
    await Student.deleteMany({ email: /test-student/ });
    await Vendor.deleteMany({ email: /test-vendor/ });
    await Offer.deleteMany({ title: /Test Offer/ });
    await CouponPurchase.deleteMany({ couponCode: /TEST/ });
    console.log('✅ Cleared existing test data');

    // ============================================
    // CREATE TEST STUDENTS
    // ============================================
    console.log('\n👨‍🎓 Creating test students...');
    
    const hashedPassword = await hashPassword('password123');
    
    const students = await Student.insertMany([
      {
        name: 'Test Student 1',
        email: 'test-student1@example.com',
        password: hashedPassword,
        role: 'student',
        approvalStatus: 'approved',
        studentId: 'STU001',
        collegeName: 'Test College',
        courseName: 'B.Tech',
        yearOfStudy: 'Third',
        enrollmentNumber: 'EN001',
        mobileNumber: '9999999999',
        city: 'Bangalore',
        state: 'Karnataka',
      },
      {
        name: 'Test Student 2',
        email: 'test-student2@example.com',
        password: hashedPassword,
        role: 'student',
        approvalStatus: 'approved',
        studentId: 'STU002',
        collegeName: 'Test College',
        courseName: 'B.E.',
        yearOfStudy: 'Second',
        enrollmentNumber: 'EN002',
        mobileNumber: '8888888888',
        city: 'Bangalore',
        state: 'Karnataka',
      },
    ]);
    
    console.log(`✅ Created ${students.length} test students`);
    console.log('   - Email: test-student1@example.com');
    console.log('   - Email: test-student2@example.com');
    console.log('   - Password: password123');

    // ============================================
    // CREATE TEST VENDORS
    // ============================================
    console.log('\n🏪 Creating test vendors...');
    
    const vendors = await Vendor.insertMany([
      {
        name: 'Pizza Vendor',
        email: 'test-vendor1@pizzahut.com',
        password: hashedPassword,
        role: 'vendor',
        approvalStatus: 'approved',
        businessName: 'Pizza Hut India',
        businessType: 'Food & Beverage',
        gstNumber: 'GST123456',
        businessEmail: 'business@pizzahut.com',
        businessAddress: '123 Pizza Street, Bangalore',
        mobileNumber: '9876543210',
        city: 'Bangalore',
        state: 'Karnataka',
      },
      {
        name: 'Clothing Vendor',
        email: 'test-vendor2@fashion.com',
        password: hashedPassword,
        role: 'vendor',
        approvalStatus: 'approved',
        businessName: 'Fashion Store',
        businessType: 'Retail',
        gstNumber: 'GST789012',
        businessEmail: 'business@fashion.com',
        businessAddress: '456 Fashion Avenue, Bangalore',
        mobileNumber: '9876543211',
        city: 'Bangalore',
        state: 'Karnataka',
      },
    ]);
    
    console.log(`✅ Created ${vendors.length} test vendors`);
    console.log('   - Email: test-vendor1@pizzahut.com (Food)');
    console.log('   - Email: test-vendor2@fashion.com (Retail)');
    console.log('   - Password: password123');

    // ============================================
    // CREATE TEST OFFERS
    // ============================================
    console.log('\n🎁 Creating test offers...');
    
    const offers = await Offer.insertMany([
      {
        title: 'Test Offer - 50% Off Pizzas',
        description: 'Get 50% discount on all pizzas at Pizza Hut',
        category: 'food',
        discount: 50,
        discountType: 'percentage',
        platformSellingPrice: 100,
        vendor: vendors[0]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        isActive: true,
        approvalStatus: 'approved',
        maxRedemptions: 1000,
        currentRedemptions: 0,
      },
      {
        title: 'Test Offer - 30% Off Clothing',
        description: 'Get 30% discount on all clothing items',
        category: 'retail',
        discount: 30,
        discountType: 'percentage',
        platformSellingPrice: 150,
        vendor: vendors[1]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        approvalStatus: 'approved',
        maxRedemptions: 500,
        currentRedemptions: 0,
      },
      {
        title: 'Test Offer - Flat ₹100 Off',
        description: 'Get ₹100 off on any order above ₹500',
        category: 'food',
        discount: 100,
        discountType: 'fixed',
        platformSellingPrice: 50,
        vendor: vendors[0]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        approvalStatus: 'approved',
        maxRedemptions: 2000,
        currentRedemptions: 0,
      },
    ]);
    
    console.log(`✅ Created ${offers.length} test offers`);
    offers.forEach((offer, idx) => {
      console.log(`   ${idx + 1}. ${offer.title}`);
    });

    // ============================================
    // CREATE TEST COUPON PURCHASES
    // ============================================
    console.log('\n🎫 Creating test coupon purchases...');
    
    const coupons = await CouponPurchase.insertMany([
      {
        couponCode: 'TEST_PIZZA_50_001',
        studentId: students[0]._id,
        vendorId: vendors[0]._id,
        offerId: offers[0]._id,
        discountType: 'percentage',
        discountValue: 50,
        originalValue: 500,
        platformSellingPrice: 100,
        transactionId: 'TXN_TEST_001',
        paymentStatus: 'completed',
        paymentMethod: 'upi',
        paidAt: new Date(),
        status: 'active',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        quantity: 1,
        purchasedAt: new Date(),
      },
      {
        couponCode: 'TEST_PIZZA_50_002',
        studentId: students[0]._id,
        vendorId: vendors[0]._id,
        offerId: offers[0]._id,
        discountType: 'percentage',
        discountValue: 50,
        originalValue: 500,
        platformSellingPrice: 100,
        transactionId: 'TXN_TEST_002',
        paymentStatus: 'completed',
        paymentMethod: 'card',
        paidAt: new Date(),
        status: 'used',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        usedByVendor: vendors[0]._id,
        redemptionNotes: 'Customer purchased 2 pizzas',
        quantity: 1,
        purchasedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        couponCode: 'TEST_FASHION_30_001',
        studentId: students[1]._id,
        vendorId: vendors[1]._id,
        offerId: offers[1]._id,
        discountType: 'percentage',
        discountValue: 30,
        originalValue: 500,
        platformSellingPrice: 150,
        transactionId: 'TXN_TEST_003',
        paymentStatus: 'completed',
        paymentMethod: 'wallet',
        paidAt: new Date(),
        status: 'active',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        quantity: 1,
        purchasedAt: new Date(),
      },
      {
        couponCode: 'TEST_FLAT_100_001',
        studentId: students[1]._id,
        vendorId: vendors[0]._id,
        offerId: offers[2]._id,
        discountType: 'fixed',
        discountValue: 100,
        originalValue: 100,
        platformSellingPrice: 50,
        transactionId: 'TXN_TEST_004',
        paymentStatus: 'completed',
        paymentMethod: 'netbanking',
        paidAt: new Date(),
        status: 'expired',
        expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired 1 day ago
        quantity: 1,
        purchasedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      },
    ]);
    
    console.log(`✅ Created ${coupons.length} test coupon purchases`);
    console.log('   Coupon Codes:');
    coupons.forEach(coupon => {
      console.log(`   - ${coupon.couponCode} (Status: ${coupon.status})`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED DATA CREATED SUCCESSFULLY');
    console.log('='.repeat(60));
    
    console.log('\n📊 CREATED DATA SUMMARY:');
    console.log(`   ✓ Students: ${students.length}`);
    console.log(`   ✓ Vendors: ${vendors.length}`);
    console.log(`   ✓ Offers: ${offers.length}`);
    console.log(`   ✓ Coupon Purchases: ${coupons.length}`);

    console.log('\n🧪 TEST CREDENTIALS:');
    console.log('\n   STUDENT 1:');
    console.log('   Email: test-student1@example.com');
    console.log('   Password: password123');
    console.log('   Status: Approved ✅');
    console.log('   Active Coupons: 1');
    
    console.log('\n   STUDENT 2:');
    console.log('   Email: test-student2@example.com');
    console.log('   Password: password123');
    console.log('   Status: Approved ✅');
    console.log('   Active Coupons: 1');

    console.log('\n   VENDOR 1 (Pizza Hut):');
    console.log('   Email: test-vendor1@pizzahut.com');
    console.log('   Password: password123');
    console.log('   Status: Approved ✅');
    console.log('   Offers: 2');
    
    console.log('\n   VENDOR 2 (Fashion Store):');
    console.log('   Email: test-vendor2@fashion.com');
    console.log('   Password: password123');
    console.log('   Status: Approved ✅');
    console.log('   Offers: 1');

    console.log('\n💡 QUICK TEST IDEAS:');
    console.log('   1. Login as Student 1 and view "My Purchases"');
    console.log('   2. Login as Vendor 1 and validate coupon: TEST_PIZZA_50_001');
    console.log('   3. Try to validate expired coupon: TEST_FLAT_100_001');
    console.log('   4. Try to validate used coupon: TEST_PIZZA_50_002');
    console.log('   5. Purchase new coupon as Student 2');
    console.log('   6. Browse available offers as public user');

    console.log('\n📚 API ENDPOINTS TO TEST:');
    console.log('   GET  /api/coupon-purchase/available-offers');
    console.log('   POST /api/coupon-purchase/buy');
    console.log('   GET  /api/coupon-purchase/my-purchases');
    console.log('   POST /api/coupon-purchase/validate');
    console.log('   GET  /api/coupon-purchase/vendor-coupons');

    console.log('\n' + '='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run seed
seedDatabase();
