import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  verificationDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerificationDocument',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  suspensionReason: String,
  
  // Student specific
  universityId: String,
  universityName: String,
  graduationYear: Number,
  
  // Vendor specific
  businessName: String,
  businessCategory: String,
  businessRegistration: String,
  
  // Profile
  profilePicture: String,
  phoneNumber: String,
  bio: String,

  // Vendor Revenue and Earnings Tracking
  totalRevenue: {
    type: Number,
    default: 0,
    description: 'Total revenue earned from accepted coupon sales'
  },
  totalCouponsAccepted: {
    type: Number,
    default: 0,
    description: 'Total number of coupons accepted by vendor'
  },
  totalCouponsRedeemed: {
    type: Number,
    default: 0,
    description: 'Total number of coupons actually redeemed/used by customers'
  },
  totalCouponsPending: {
    type: Number,
    default: 0,
    description: 'Total number of coupons pending vendor approval'
  },
  totalCouponsRejected: {
    type: Number,
    default: 0,
    description: 'Total number of coupons rejected by vendor'
  },
  accountBalance: {
    type: Number,
    default: 0,
    description: 'Available balance for withdrawal'
  },
  revenueHistory: [{
    couponPurchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CouponPurchase',
    },
    amount: Number,
    type: {
      type: String,
      enum: ['accepted', 'redeemed'],
      description: 'Type of transaction - when coupon is accepted or redeemed'
    },
    acceptedAt: Date,
    redeemedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'credited'],
      default: 'pending'
    },
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('User', userSchema);
