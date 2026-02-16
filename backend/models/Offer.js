import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: [
      'food',
      'retail',
      'entertainment',
      'technology',
      'travel',
      'education',
      'health',
      'sports',
      'other',
    ],
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
  },
  platformSellingPrice: {
    type: Number,
    description: 'Amount students pay to platform for this coupon (e.g., if discount is ₹100, platform sells for ₹30)',
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  startDate: Date,
  endDate: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  maxRedemptions: Number,
  currentRedemptions: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  redemptions: [{
    student: mongoose.Schema.Types.ObjectId,
    redeemedAt: Date,
    redemptionCode: String,
    isOnline: Boolean,
  }],
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected', 'expired'],
    default: 'active',
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  approvedAt: Date,
  image: String,
  termsAndConditions: String,
  savedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Offer', offerSchema);
