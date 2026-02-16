import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  discount: {
    type: Number,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  // Student who generated this coupon
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
  },
  // Amount paid by student to vendor
  amountPaid: {
    type: Number,
    default: null,
  },
  // Coupon type: 'vendor-created' or 'student-generated'
  couponType: {
    type: String,
    enum: ['vendor-created', 'student-generated'],
    default: 'vendor-created',
  },
  startDate: Date,
  endDate: Date,
  issueDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  },
  originalPrice: Number,
  discountedPrice: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active',
  },
  // Approval workflow fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  approvalDate: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  maxRedemptions: Number,
  currentRedemptions: {
    type: Number,
    default: 0,
  },
  redeemedBy: [
    {
      student: mongoose.Schema.Types.ObjectId,
      redeemedAt: Date,
    },
  ],
  category: String,
  termsAndConditions: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Coupon', couponSchema);
