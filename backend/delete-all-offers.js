#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from './models/Offer.js';

dotenv.config();

async function deleteAllOffers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college_app');
    console.log('✅ Connected');

    const result = await Offer.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} offers`);

    await mongoose.connection.close();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAllOffers();
