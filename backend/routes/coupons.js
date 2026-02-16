import express from 'express';
import Coupon from '../models/Coupon.js';
import { authenticateToken, authorizeRole, verifyStudentApproval } from '../middleware/auth.js';
import { generateCouponCode } from '../utils/helpers.js';
import { io } from '../server.js';
import {
  getAllVendors,
  getVendorDetails,
  generateStudentCoupon,
  getStudentCoupons,
  getCouponById,
  getStudentVendorConnections,
  getStudentVendorCouponHistory,
} from '../controllers/couponGenerationController.js';

const router = express.Router();

// ========== STUDENT DISCOUNT MARKETPLACE ROUTES ==========

// Get all vendors with available coupons
router.get('/vendors', async (req, res) => {
  try {
    return getAllVendors(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors',
      error: error.message,
    });
  }
});

// Get vendor details with their approved coupons
router.get('/vendors/:vendorId', async (req, res) => {
  try {
    return getVendorDetails(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor details',
      error: error.message,
    });
  }
});

// Generate coupon when student pays vendor
router.post('/generate', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    return generateStudentCoupon(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating coupon',
      error: error.message,
    });
  }
});

// Get all coupons for current student
router.get('/student/my-coupons', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    return getStudentCoupons(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student coupons',
      error: error.message,
    });
  }
});

// Get student's vendor connections - all vendors student has purchased from
router.get('/student/vendor-connections', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    return getStudentVendorConnections(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor connections',
      error: error.message,
    });
  }
});

// Get detailed coupon history for specific student-vendor pair
router.get('/student/vendor/:vendorId/history', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    return getStudentVendorCouponHistory(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching coupon history',
      error: error.message,
    });
  }
});

// Get vendor's coupons with redemption details
// NOTE: This MUST come before /:couponId to avoid route matching conflicts
router.get('/my-coupons', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const coupons = await Coupon.find({ vendor: req.user.id })
      .populate('redeemedBy.student', 'name email')
      .sort({ createdAt: -1 });
    
    const couponsWithStats = coupons.map(coupon => ({
      _id: coupon._id,
      code: coupon.code,
      description: coupon.description,
      discount: coupon.discount,
      discountType: coupon.discountType,
      category: coupon.category,
      approvalStatus: coupon.approvalStatus,
      isActive: coupon.isActive,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      maxRedemptions: coupon.maxRedemptions,
      currentRedemptions: coupon.currentRedemptions,
      redemptionPercentage: coupon.maxRedemptions 
        ? ((coupon.currentRedemptions / coupon.maxRedemptions) * 100).toFixed(2)
        : 'Unlimited',
      redeemedBy: coupon.redeemedBy,
      uniqueStudents: coupon.redeemedBy.length,
      createdAt: coupon.createdAt,
    }));

    res.json({
      success: true,
      coupons: couponsWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch coupons', error: error.message });
  }
});

// Get vendor coupon analytics
// NOTE: This MUST come before /:couponId to avoid route matching conflicts
router.get('/analytics/overview', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const coupons = await Coupon.find({ vendor: req.user.id });
    
    const stats = {
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter(c => c.isActive && c.approvalStatus === 'approved').length,
      pendingCoupons: coupons.filter(c => c.approvalStatus === 'pending').length,
      rejectedCoupons: coupons.filter(c => c.approvalStatus === 'rejected').length,
      totalRedemptions: coupons.reduce((sum, c) => sum + c.currentRedemptions, 0),
      uniqueStudents: new Set(
        coupons.flatMap(c => c.redeemedBy.map(r => r.student.toString()))
      ).size,
      averageRedemptionsPerCoupon: coupons.length > 0
        ? (coupons.reduce((sum, c) => sum + c.currentRedemptions, 0) / coupons.length).toFixed(2)
        : 0,
    };

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch analytics', 
      error: error.message 
    });
  }
});

// Get redemption details for a specific coupon
// NOTE: This MUST come before /:couponId to avoid route matching conflicts
router.get('/:couponId/redemptions', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.couponId)
      .populate({
        path: 'redeemedBy.student',
        select: 'name email collegeName enrollmentNumber'
      });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Verify vendor owns this coupon
    if (coupon.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this coupon' });
    }

    const redemptions = coupon.redeemedBy.map(redemption => ({
      _id: redemption._id,
      studentId: redemption.student._id,
      studentName: redemption.student.name,
      studentEmail: redemption.student.email,
      collegeName: redemption.student.collegeName,
      enrollmentNumber: redemption.student.enrollmentNumber,
      redeemedAt: redemption.redeemedAt,
    }));

    res.json({
      success: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discount: coupon.discount,
        discountType: coupon.discountType,
        totalRedemptions: coupon.currentRedemptions,
        maxRedemptions: coupon.maxRedemptions,
      },
      redemptions,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch redemption details', 
      error: error.message 
    });
  }
});

// Create coupon
router.post('/create', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const { description, discount, discountType, startDate, endDate, maxRedemptions, category, termsAndConditions } = req.body;

    const code = generateCouponCode();

    const coupon = new Coupon({
      code,
      description,
      discount,
      discountType,
      vendor: req.user.id,
      startDate,
      endDate,
      maxRedemptions,
      category,
      termsAndConditions,
      approvalStatus: 'pending',
    });

    await coupon.save();
    res.status(201).json({ 
      success: true,
      message: 'Coupon created successfully and is pending admin approval', 
      coupon 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to create coupon', 
      error: error.message 
    });
  }
});

// Get coupon by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate('vendor', 'name businessName');
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch coupon', error: error.message });
  }
});

// Get coupon by code (public)
router.get('/code/:code', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code }).populate('vendor', 'name businessName');
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch coupon', error: error.message });
  }
});

// Update coupon
router.put('/update/:id', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (coupon.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this coupon' });
    }

    Object.assign(coupon, req.body);
    await coupon.save();

    res.json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update coupon', error: error.message });
  }
});

// Delete coupon
router.delete('/:id', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (coupon.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this coupon' });
    }

    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete coupon', error: error.message });
  }
});

// Redeem coupon - ONLY APPROVED STUDENTS CAN REDEEM
router.post('/redeem', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { code } = req.body;

    // Import Student model to check approval status
    const Student = (await import('../models/Student.js')).default;

    // Check if student exists
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ 
        success: false,
        message: 'This coupon is no longer active' 
      });
    }

    if (coupon.maxRedemptions && coupon.currentRedemptions >= coupon.maxRedemptions) {
      return res.status(400).json({ 
        success: false,
        message: 'This coupon has reached max redemptions' 
      });
    }

    // Check if already redeemed
    const alreadyRedeemed = coupon.redeemedBy.some(
      r => r.student.toString() === req.user.id
    );
    if (alreadyRedeemed) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already redeemed this coupon' 
      });
    }

    coupon.redeemedBy.push({
      student: req.user.id,
      redeemedAt: new Date(),
    });
    coupon.currentRedemptions += 1;

    await coupon.save();

    // Emit real-time event to vendor about coupon redemption
    try {
      io.to(`vendor:${coupon.vendor.toString()}`).emit('vendor:coupon:claimed', {
        couponId: coupon._id,
        couponCode: coupon.code,
        studentId: req.user.id,
        studentName: student.name,
        studentEmail: student.email,
        discount: coupon.discount,
        discountType: coupon.discountType,
        totalClaims: coupon.currentRedemptions,
        maxRedemptions: coupon.maxRedemptions,
        claimedAt: new Date(),
        timestamp: new Date(),
        message: `${student.name} claimed your coupon: ${coupon.code}`
      });

      console.log(`📢 Notifying vendor ${coupon.vendor} about coupon claim - Total claims: ${coupon.currentRedemptions}`);
    } catch (error) {
      console.error('Error emitting coupon claim event:', error);
    }

    res.json({ 
      success: true,
      message: 'Coupon redeemed successfully', 
      coupon 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to redeem coupon', 
      error: error.message 
    });
  }
});

// Get coupon stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true });
    const totalCoupons = coupons.length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + c.currentRedemptions, 0);
    const avgDiscount = coupons.length > 0
      ? (coupons.reduce((sum, c) => sum + c.discount, 0) / coupons.length).toFixed(2)
      : 0;

    res.json({
      totalCoupons,
      totalRedemptions,
      avgDiscount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch coupon stats', error: error.message });
  }
});

// Get coupon by ID
// NOTE: This MUST come last, after all specific routes like /my-coupons, /stats, etc.
router.get('/:couponId', authenticateToken, async (req, res) => {
  try {
    return getCouponById(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching coupon',
      error: error.message,
    });
  }
});

export default router;
