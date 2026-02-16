import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
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
    default: 'vendor',
    enum: ['vendor'],
  },
  
  // Document verification status
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  
  // Admin approval status
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvalRemarks: String,
  approvedAt: Date,
  
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
  
  // Vendor specific fields
  businessName: {
    type: String,
    required: true,
  },
  businessType: String,
  businessRegistration: String,
  gstNumber: String,
  businessEmail: String,
  businessAddress: String,
  
  // Contact information
  mobileNumber: String,
  phoneNumber: String,
  city: String,
  state: String,
  
  // Location information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
  },
  latitude: Number,
  longitude: Number,
  locality: String,
  postalCode: String,
  mapUrl: String,
  
  // Profile
  businessLogo: String,
  businessDescription: String,
  website: String,
  
  // Account metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0,
  },
  
  // Offers and discounts
  offers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
  }],
  
  // Coupons
  coupons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  }],

  // Revenue and Earnings Tracking
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
});

// Update the updatedAt field before saving
vendorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create 2dsphere index for geospatial queries
vendorSchema.index({ 'location': '2dsphere' });

export default mongoose.model('Vendor', vendorSchema);
