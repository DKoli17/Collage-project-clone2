#!/usr/bin/env node

/**
 * Simplified Seed Script for Vendors and Offers
 * This creates test vendors and offers for the coupon marketplace
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { hashPassword } from './utils/helpers.js';
import Vendor from './models/Vendor.js';
import Offer from './models/Offer.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_app';

async function seedVendorsAndOffers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing vendors and offers
    console.log('\n🗑️  Clearing existing test data...');
    await Vendor.deleteMany({ email: /test-vendor/ });
    await Offer.deleteMany({ title: /Test Offer/ });
    console.log('✅ Cleared existing test data');

    const hashedPassword = await hashPassword('password123');

    // Create test vendors
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
        businessDescription: 'Delicious pizzas and Italian food',
        businessRegistration: 'BR-PIZZA-001',
        gstNumber: 'GST123456',
        businessEmail: 'business@pizzahut.com',
        businessAddress: '123 Pizza Street, Bangalore',
        mobileNumber: '9876543210',
        city: 'Bangalore',
        state: 'Karnataka',
        locality: 'Indiranagar',
        latitude: 13.3347,
        longitude: 77.6245,
        location: {
          type: 'Point',
          coordinates: [77.6245, 13.3347]
        },
        isActive: true,
        isVerified: true,
        verificationStatus: 'verified',
      },
      {
        name: 'Clothing Vendor',
        email: 'test-vendor2@fashion.com',
        password: hashedPassword,
        role: 'vendor',
        approvalStatus: 'approved',
        businessName: 'Fashion Store',
        businessType: 'Retail',
        businessDescription: 'Latest fashion and clothing',
        businessRegistration: 'BR-FASHION-001',
        gstNumber: 'GST789012',
        businessEmail: 'business@fashion.com',
        businessAddress: '456 Fashion Avenue, Bangalore',
        mobileNumber: '9876543211',
        city: 'Bangalore',
        state: 'Karnataka',
        locality: 'Koramangala',
        latitude: 12.9352,
        longitude: 77.6246,
        location: {
          type: 'Point',
          coordinates: [77.6246, 12.9352]
        },
        isActive: true,
        isVerified: true,
        verificationStatus: 'verified',
      },
      {
        name: 'Electronics Vendor',
        email: 'test-vendor3@electronics.com',
        password: hashedPassword,
        role: 'vendor',
        approvalStatus: 'approved',
        businessName: 'Tech Store',
        businessType: 'Electronics',
        businessDescription: 'Latest gadgets and electronics',
        businessRegistration: 'BR-TECH-001',
        gstNumber: 'GST345678',
        businessEmail: 'business@techstore.com',
        businessAddress: '789 Tech Street, Bangalore',
        mobileNumber: '9876543212',
        city: 'Bangalore',
        state: 'Karnataka',
        locality: 'Whitefield',
        latitude: 13.0196,
        longitude: 77.7099,
        location: {
          type: 'Point',
          coordinates: [77.7099, 13.0196]
        },
        isActive: true,
        isVerified: true,
        verificationStatus: 'verified',
      },
    ]);

    console.log(`✅ Created ${vendors.length} test vendors`);
    vendors.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.businessName} (${v.email})`);
    });

    // Create test offers
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
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        approvalStatus: 'approved',
        maxRedemptions: 1000,
        currentRedemptions: 0,
        status: 'active',
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
        status: 'active',
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
        status: 'active',
      },
      {
        title: 'Electronics Sale - 25% Off',
        description: '25% discount on select electronics',
        category: 'technology',
        discount: 25,
        discountType: 'percentage',
        platformSellingPrice: 200,
        vendor: vendors[2]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        approvalStatus: 'approved',
        maxRedemptions: 300,
        currentRedemptions: 0,
        status: 'active',
      },
      {
        title: 'Fashion Week Special - 40% Off',
        description: 'Fashion week special - 40% off on all items',
        category: 'retail',
        discount: 40,
        discountType: 'percentage',
        platformSellingPrice: 120,
        vendor: vendors[1]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        approvalStatus: 'approved',
        maxRedemptions: 600,
        currentRedemptions: 0,
        status: 'active',
      },
    ]);

    console.log(`✅ Created ${offers.length} test offers`);
    offers.forEach((offer, idx) => {
      const vendor = vendors.find(v => v._id.toString() === offer.vendor.toString());
      console.log(`   ${idx + 1}. ${offer.title} (Vendor: ${vendor?.businessName})`);
    });

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Offers: ${offers.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
}

seedVendorsAndOffers();
