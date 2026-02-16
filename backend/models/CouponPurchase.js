import mongoose from 'mongoose';

const couponPurchaseSchema = new mongoose.Schema({
  // Unique coupon code generated for this purchase
  couponCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Links to other entities
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true,
  },

  // Offer/Coupon details
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
  },

  // Discount information
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },

  discountValue: {
    type: Number,
    required: true,
  },

  // Pricing information
  originalValue: {
    type: Number,
    required: true,
    description: 'Original discount value (e.g., ₹100)'
  },

  platformSellingPrice: {
    type: Number,
    required: true,
    description: 'Amount student pays to platform (e.g., ₹30)'
  },

  // Transaction details
  transactionId: {
    type: String,
    sparse: true,
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet'],
    sparse: true,
  },

  paidAt: {
    type: Date,
    sparse: true,
  },

  // Coupon status
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled'],
    default: 'active',
  },

  // Vendor Approval Status - Vendor must accept/approve the coupon sale
  vendorApprovalStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    description: 'Vendor approval status for the coupon purchase'
  },

  vendorApprovedAt: {
    type: Date,
    sparse: true,
    description: 'Timestamp when vendor accepted the coupon'
  },

  vendorRejectionReason: {
    type: String,
    sparse: true,
    description: 'Reason provided by vendor if rejecting the coupon'
  },

  // Admin Approval Status - Admin must verify coupon before student can use it
  adminApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    description: 'Admin verification status for the coupon purchase'
  },

  adminApprovedAt: {
    type: Date,
    sparse: true,
    description: 'Timestamp when admin approved the coupon'
  },

  adminApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    sparse: true,
    description: 'Admin who approved the coupon'
  },

  adminRejectionReason: {
    type: String,
    sparse: true,
    description: 'Reason provided by admin if rejecting the coupon'
  },

  adminApprovalRemarks: {
    type: String,
    sparse: true,
    description: 'Additional remarks from admin'
  },

  // Revenue tracking flag
  revenueRecorded: {
    type: Boolean,
    default: false,
    description: 'Whether revenue has been recorded in vendor account'
  },

  // Expiry information
  expiryDate: {
    type: Date,
    required: true,
  },

  // Usage tracking
  usedAt: {
    type: Date,
    sparse: true,
  },

  usedByVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    description: 'Vendor who validated/redeemed this coupon'
  },

  // Notes from vendor when redeeming
  redemptionNotes: {
    type: String,
    sparse: true,
  },

  // Quantity purchased in single transaction
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },

  // Timestamps
  purchasedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // Metadata
  notes: String,
});

// Indexes for common queries
couponPurchaseSchema.index({ studentId: 1, status: 1 });
couponPurchaseSchema.index({ vendorId: 1, status: 1 });
couponPurchaseSchema.index({ expiryDate: 1, status: 1 });
couponPurchaseSchema.index({ vendorId: 1, vendorApprovalStatus: 1 });
couponPurchaseSchema.index({ vendorApprovalStatus: 1 });
couponPurchaseSchema.index({ adminApprovalStatus: 1 });
couponPurchaseSchema.index({ studentId: 1, adminApprovalStatus: 1 });
couponPurchaseSchema.index({ adminApprovalStatus: 1, vendorApprovalStatus: 1 });

// Pre-save hook to update updatedAt
couponPurchaseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('CouponPurchase', couponPurchaseSchema);
