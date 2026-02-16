import express from 'express';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';
import Offer from '../models/Offer.js';
import Coupon from '../models/Coupon.js';
import CouponPurchase from '../models/CouponPurchase.js';
import VerificationDocument from '../models/VerificationDocument.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { io } from '../server.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to safely emit socket events without crashing the endpoint
function safeEmit(room, event, data) {
  try {
    if (io) {
      if (room === null) {
        // Global emit
        io.emit(event, data);
      } else {
        // Room-specific emit
        io.to(room).emit(event, data);
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to emit socket event ${event}:`, error.message);
  }
}

// DEBUG: Check if students exist in database
router.get('/debug/students-count', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    const students = await Student.find().select('email name approvalStatus verificationStatus createdAt').limit(10);
    res.json({
      totalStudents: count,
      recentStudents: students,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      error: error.message,
      totalStudents: 0
    });
  }
});

// Get admin profile (all admin information)
router.get('/profile', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const admin = await Admin.findById(adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Fetch platform statistics for admin dashboard
    const totalStudents = await Student.countDocuments();
    const totalOffers = await Offer.countDocuments({ isActive: true });
    const totalAdmins = await Admin.countDocuments();
    
    const totalRedemptions = await Offer.aggregate([
      { $group: { _id: null, total: { $sum: '$currentRedemptions' } } },
    ]);

    res.json({
      success: true,
      data: {
        ...admin.toObject(),
        stats: {
          totalStudents,
          totalOffers,
          totalAdmins,
          totalRedemptions: totalRedemptions[0]?.total || 0,
        }
      },
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin profile',
      error: error.message,
    });
  }
});

// Get admin dashboard
router.get('/dashboard', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalOffers = await Offer.countDocuments({ isActive: true });
    const totalRedemptions = await Offer.aggregate([
      { $group: { _id: null, total: { $sum: '$currentRedemptions' } } },
    ]);

    res.json({
      totalStudents,
      totalOffers,
      totalRedemptions: totalRedemptions[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard', error: error.message });
  }
});

// Get all admins
router.get('/all-admins', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const admins = await Admin.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Admin.countDocuments(filter);

    res.json({
      success: true,
      admins,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total,
        totalPages: Math.ceil(total / limit)
      },
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch admins', 
      error: error.message 
    });
  }
});

// Get all students
router.get('/students', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, verificationStatus = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await Student.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments(filter);

    res.json({
      students,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
});

// Get student details by ID
router.get('/students/:studentId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .select('-password')
      .populate('verificationDocuments');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student details', error: error.message });
  }
});

// Verify student (check documents and verify them)
router.post('/students/:studentId/verify', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const updateData = { verificationStatus: status, updatedAt: new Date() };
    
    // If verified by admin, also set isVerified to true
    if (status === 'verified') {
      updateData.isVerified = true;
    }

    const student = await Student.findByIdAndUpdate(
      req.params.studentId,
      updateData,
      { new: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Broadcast real-time update
    safeEmit(null, 'student:verification-updated', {
      studentId: req.params.studentId,
      verificationStatus: status,
      student,
      changedBy: req.user.id,
      timestamp: new Date()
    });

    res.json({ 
      success: true,
      message: `Student ${status} successfully`, 
      student 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify student', 
      error: error.message 
    });
  }
});

// Approve/Reject student account (final approval after document verification)
router.post('/students/:studentId/approval', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { approvalStatus, remarks } = req.body;

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ 
        success: false,
        message: 'approvalStatus must be "approved" or "rejected"'
      });
    }

    const updateData = { 
      approvalStatus, 
      approvalRemarks: remarks || '',
      updatedAt: new Date() 
    };
    
    if (approvalStatus === 'approved') {
      updateData.approvedAt = new Date();
    }

    const student = await Student.findByIdAndUpdate(
      req.params.studentId,
      updateData,
      { new: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    // Broadcast real-time update to all connected admins
    const io = req.io;
    if (io) {
      // Emit to admins
      io.to('admins').emit('student:status-updated', {
        studentId: req.params.studentId,
        approvalStatus,
        student,
        changedBy: req.user.id,
        timestamp: new Date()
      });

      // Emit to student
      io.to(`student:${req.params.studentId}`).emit('student:approval-status:updated', {
        status: approvalStatus,
        message: approvalStatus === 'approved' ? 
          'Congratulations! Your account has been approved.' : 
          'Your account has been rejected.',
        remarks,
        timestamp: new Date()
      });

      console.log(`📡 Student ${req.params.studentId} approval status changed to ${approvalStatus}`);
    }

    // Email notifications removed

    res.json({ 
      success: true,
      message: `Student account ${approvalStatus} successfully`, 
      student 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update student approval status', 
      error: error.message 
    });
  }
});

// Get fraud reports
router.get('/fraud-reports', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Placeholder for fraud reports
    res.json({
      reports: [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fraud reports', error: error.message });
  }
});

// Mark as fraudulent
router.post('/discounts/:discountId/mark-fraudulent', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      req.params.discountId,
      { isActive: false },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.json({ message: 'Offer marked as fraudulent', offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark fraudulent', error: error.message });
  }
});

// Get platform analytics
router.get('/analytics', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const students = await Student.countDocuments();
    const offers = await Offer.countDocuments({ isActive: true });
    const redemptions = await Offer.aggregate([
      { $group: { _id: null, total: { $sum: '$currentRedemptions' } } },
    ]);

    res.json({
      totalStudents: students,
      totalOffers: offers,
      totalRedemptions: redemptions[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Update user role (deprecated - users cannot change roles)
router.put('/users/:userId/role', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    res.status(400).json({
      message: 'Cannot change user role. Users are stored in role-specific databases.',
      note: 'Deletes and recreate user with different role'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
});

// Get active users stats
router.get('/active-users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalUsers = totalStudents;
    
    // Assuming online status is tracked - using login sessions as proxy
    // For now, returning estimates based on recent activity
    const onlineUsers = Math.floor(totalUsers * 0.3); // 30% online estimate
    const offlineUsers = totalUsers - onlineUsers;
    
    const stats = {
      totalUsers,
      onlineUsers,
      offlineUsers,
      students: {
        total: totalStudents,
        online: Math.floor(totalStudents * 0.35),
        offline: totalStudents - Math.floor(totalStudents * 0.35),
      },
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch active users stats', error: error.message });
  }
});

// Get all offers (for admin dashboard)
router.get('/offers', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const offers = await Offer.find(filter)
      .populate('vendor', 'name businessName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Offer.countDocuments(filter);

    res.json({
      offers,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total,
        totalPages: Math.ceil(total / limit)
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
});

// Delete an offer
router.delete('/offers/:offerId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.offerId);

    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: 'Offer not found' 
      });
    }

    // Notify vendor that their offer was deleted
    safeEmit(`vendor:${offer.vendor}`, 'admin:offer-deleted', {
      offerId: offer._id,
      title: offer.title,
      reason: 'Offer deleted by admin',
      timestamp: new Date()
    });

    res.json({ 
      success: true,
      message: 'Offer deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete offer', 
      error: error.message 
    });
  }
});

// Toggle offer status (active/inactive)
router.patch('/offers/:offerId/toggle', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId);

    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: 'Offer not found' 
      });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    // Notify vendor about status change
    safeEmit(`vendor:${offer.vendor}`, 'admin:offer-status-changed', {
      offerId: offer._id,
      title: offer.title,
      isActive: offer.isActive,
      changedBy: req.user.id,
      timestamp: new Date()
    });

    // Notify students if offer is activated
    if (offer.isActive) {
      safeEmit(null, 'student:offer-activated', {
        offerId: offer._id,
        title: offer.title,
        discount: offer.discount,
        discountType: offer.discountType,
        timestamp: new Date()
      });
    }

    res.json({ 
      success: true,
      message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: offer.isActive }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to toggle offer status', 
      error: error.message 
    });
  }
});

// Get offers stats
router.get('/offers-stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const activeOffers = await Offer.countDocuments({ isActive: true });
    const totalOffers = await Offer.countDocuments();
    const inactiveOffers = totalOffers - activeOffers;
    
    // Calculate percentage change (comparing active to total)
    const changePercentage = totalOffers > 0 
      ? `${Math.round((activeOffers / totalOffers) * 100)}%`
      : '0%';

    res.json({
      activeOffers,
      totalOffers,
      inactiveOffers,
      changePercentage,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers stats', error: error.message });
  }
});

// Get vendor stats
router.get('/vendor-stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalVendors = await Vendor.countDocuments();
    const liveVendors = Math.floor(totalVendors * 0.4); // 40% live estimate
    const offlineVendors = totalVendors - liveVendors;

    res.json({
      totalVendors,
      liveVendors,
      offlineVendors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vendor stats', error: error.message });
  }
});

// Delete user
router.delete('/users/:userId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Try to find and delete from Student collection
    let user = await Student.findByIdAndDelete(req.params.userId);
    
    // If not found, try Vendor collection
    if (!user) {
      user = await Vendor.findByIdAndDelete(req.params.userId);
    }
    
    // If not found, try Admin collection
    if (!user) {
      user = await Admin.findByIdAndDelete(req.params.userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Broadcast real-time deletion to all connected admins
    safeEmit(null, 'user:deleted', {
      userId: req.params.userId,
      userType: user.role || 'student',
      deletedBy: req.user.id,
      timestamp: new Date()
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// ==================== COUPON APPROVAL ROUTES ====================

// Get all pending coupons for admin approval
router.get('/coupons/pending', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const pendingCoupons = await Coupon.find({ approvalStatus: 'pending' })
      .populate('vendor', 'name businessName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: pendingCoupons.length,
      coupons: pendingCoupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending coupons',
      error: error.message,
    });
  }
});

// Get all coupons with their approval status
router.get('/coupons/all', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('vendor', 'name businessName email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
      error: error.message,
    });
  }
});

// Approve a coupon
router.post('/coupons/:couponId/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.couponId);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    if (coupon.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Coupon is already ${coupon.approvalStatus}`,
      });
    }

    coupon.approvalStatus = 'approved';
    coupon.approvedBy = req.user.id;
    coupon.approvalDate = new Date();
    await coupon.save();

    // Add coupon to vendor's coupons array
    await Vendor.findByIdAndUpdate(
      coupon.vendor,
      { $addToSet: { coupons: coupon._id } },
      { new: true }
    );

    // Broadcast approval event
    safeEmit(null, 'coupon:approved', {
      couponId: coupon._id,
      code: coupon.code,
      vendor: coupon.vendor,
      approvedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Coupon approved successfully',
      coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve coupon',
      error: error.message,
    });
  }
});

// Reject a coupon
router.post('/coupons/:couponId/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const coupon = await Coupon.findById(req.params.couponId);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    if (coupon.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Coupon is already ${coupon.approvalStatus}`,
      });
    }

    coupon.approvalStatus = 'rejected';
    coupon.approvedBy = req.user.id;
    coupon.approvalDate = new Date();
    coupon.rejectionReason = rejectionReason || 'Rejected by admin';
    await coupon.save();

    // Broadcast rejection event
    safeEmit(null, 'coupon:rejected', {
      couponId: coupon._id,
      code: coupon.code,
      vendor: coupon.vendor,
      reason: coupon.rejectionReason,
      rejectedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Coupon rejected',
      coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject coupon',
      error: error.message,
    });
  }
});

// Admin: Delete any coupon
router.delete('/coupons/:couponId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.couponId);
    
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }

    res.json({
      success: true,
      message: `Coupon ${coupon.code} deleted successfully`,
      coupon: coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon',
      error: error.message
    });
  }
});

// ========== OFFER APPROVAL ENDPOINTS ==========

// Approve an offer
router.post('/offers/:offerId/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    if (offer.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Offer is already approved',
      });
    }

    offer.approvalStatus = 'approved';
    offer.approvedBy = req.user.id;
    offer.approvedAt = new Date();
    await offer.save();

    // Populate vendor info for broadcast
    await offer.populate('vendor', 'name');

    // Broadcast approval event to all parties
    const io = req.io;
    if (io) {
      // Emit to vendor
      io.to(`vendor:${offer.vendor._id}`).emit('vendor:notification:offer-approved', {
        offerId: offer._id,
        title: offer.title,
        message: `Your offer "${offer.title}" has been approved`,
        timestamp: new Date(),
        status: 'success'
      });

      // Notify all students about the newly approved offer
      io.to('all-students').emit('student:offer-approved', {
        offerId: offer._id,
        title: offer.title,
        discount: offer.discount,
        discountType: offer.discountType,
        category: offer.category,
        timestamp: new Date()
      });

      // Notify all admins about the approval
      io.to('admins').emit('admin:offer-approval-changed', {
        offerId: offer._id,
        vendorId: offer.vendor._id,
        vendorName: offer.vendor.name,
        offerTitle: offer.title,
        action: 'approved',
        approvedBy: req.user.id,
        timestamp: new Date()
      });

      console.log(`📡 Offer ${offer._id} approved - events emitted to vendor, students, and admins`);
    }

    res.json({
      success: true,
      message: 'Offer approved successfully',
      data: { offerId: offer._id, title: offer.title, approvalStatus: offer.approvalStatus }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve offer',
      error: error.message,
    });
  }
});

// Reject an offer
router.post('/offers/:offerId/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const offer = await Offer.findById(req.params.offerId);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    if (offer.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Offer is already rejected',
      });
    }

    offer.approvalStatus = 'rejected';
    offer.approvedBy = req.user.id;
    offer.approvedAt = new Date();
    await offer.save();

    // Populate vendor info for broadcast
    await offer.populate('vendor', 'name');

    // Broadcast rejection event to vendor
    safeEmit(`vendor:${offer.vendor._id}`, 'vendor:notification:offer-rejected', {
      offerId: offer._id,
      title: offer.title,
      message: `Your offer "${offer.title}" has been rejected`,
      reason: rejectionReason || 'Rejected by admin',
      timestamp: new Date(),
      status: 'error'
    });

    res.json({
      success: true,
      message: 'Offer rejected successfully',
      data: { offerId: offer._id, title: offer.title, approvalStatus: offer.approvalStatus }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject offer',
      error: error.message,
    });
  }
});

// ========== VENDOR MANAGEMENT ENDPOINTS ==========

// Get all vendors
router.get('/vendors', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, approvalStatus = 'all', verificationStatus = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (approvalStatus !== 'all') {
      filter.approvalStatus = approvalStatus;
    }
    if (verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
      ];
    }

    const vendors = await Vendor.find(filter)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Vendor.countDocuments(filter);

    res.json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message,
    });
  }
});

// Get vendor details by ID
router.get('/vendors/:vendorId/details', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId)
      .select('-password')
      .populate('offers', 'title isActive createdAt')
      .populate('coupons', 'code discount createdAt');

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Count active and pending offers
    const offers = await Offer.find({ vendor: req.params.vendorId });
    const activeOffers = offers.filter(o => o.isActive).length;
    const pendingOffers = offers.filter(o => !o.isActive).length;

    res.json({
      success: true,
      data: {
        ...vendor.toObject(),
        numberOfOffersActive: activeOffers,
        numberOfOffersPending: pendingOffers,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch vendor details', error: error.message });
  }
});

// Get vendor stats
router.get('/vendors/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const total = await Vendor.countDocuments();
    const approved = await Vendor.countDocuments({ approvalStatus: 'approved' });
    const pending = await Vendor.countDocuments({ approvalStatus: 'pending' });
    const rejected = await Vendor.countDocuments({ approvalStatus: 'rejected' });
    const verified = await Vendor.countDocuments({ verificationStatus: 'verified' });
    const suspended = await Vendor.countDocuments({ isSuspended: true });

    res.json({
      success: true,
      data: {
        totalVendors: total,
        approvedVendors: approved,
        pendingVendors: pending,
        rejectedVendors: rejected,
        verifiedVendors: verified,
        suspendedVendors: suspended,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor stats',
      error: error.message,
    });
  }
});

// Approve vendor
router.put('/vendors/:vendorId/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { remarks = '' } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      {
        approvalStatus: 'approved',
        approvalRemarks: remarks,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Broadcast real-time notification
    safeEmit(null, 'admin:vendor-approval:updated', {
      vendorId: vendor._id,
      vendorName: vendor.name,
      status: 'approved',
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Vendor approved successfully',
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve vendor',
      error: error.message,
    });
  }
});

// Reject vendor
router.put('/vendors/:vendorId/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { remarks = '' } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      {
        approvalStatus: 'rejected',
        approvalRemarks: remarks,
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Broadcast real-time notification
    safeEmit(null, 'admin:vendor-approval:updated', {
      vendorId: vendor._id,
      vendorName: vendor.name,
      status: 'rejected',
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Vendor rejected successfully',
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject vendor',
      error: error.message,
    });
  }
});

// Suspend vendor
router.put('/vendors/:vendorId/suspend', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reason = '' } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      {
        isSuspended: true,
        suspensionReason: reason,
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Broadcast real-time notification
    safeEmit(null, 'admin:vendor-suspension:updated', {
      vendorId: vendor._id,
      vendorName: vendor.name,
      suspended: true,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Vendor suspended successfully',
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suspend vendor',
      error: error.message,
    });
  }
});

// Activate vendor
router.put('/vendors/:vendorId/activate', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      {
        isSuspended: false,
        suspensionReason: '',
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Broadcast real-time notification
    safeEmit(null, 'admin:vendor-suspension:updated', {
      vendorId: vendor._id,
      vendorName: vendor.name,
      suspended: false,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Vendor activated successfully',
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to activate vendor',
      error: error.message,
    });
  }
});

// Verify vendor documents
router.put('/vendors/:vendorId/verify', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { verificationStatus = 'verified', remarks = '' } = req.body;

    if (!['verified', 'pending', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status',
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      {
        verificationStatus,
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Broadcast real-time notification
    safeEmit(null, 'admin:vendor-verification:updated', {
      vendorId: vendor._id,
      vendorName: vendor.name,
      verificationStatus,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Vendor ${verificationStatus} successfully`,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify vendor',
      error: error.message,
    });
  }
});

// Get single vendor details
router.get('/vendors/:vendorId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message,
    });
  }
});

// ==================== COUPON CREATION ROUTES ====================

// Create a new vendor coupon
router.post('/coupons', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { code, description, discount, discountType, vendorId, startDate, endDate, maxRedemptions, category, termsAndConditions, isActive } = req.body;

    // Validate required fields
    if (!code || !discount || !vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, discount, vendorId',
      });
    }

    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists',
      });
    }

    // Create the coupon
    const newCoupon = new Coupon({
      code,
      description,
      discount,
      discountType: discountType || 'percentage',
      vendor: vendorId,
      couponType: 'vendor-created',
      status: 'active', // Mark as active
      isActive: isActive !== false, // Default to true if not specified
      approvalStatus: 'approved', // Admin-created coupons are auto-approved
      approvedBy: req.user.id,
      approvalDate: new Date(),
      startDate,
      endDate,
      maxRedemptions,
      category,
      termsAndConditions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedCoupon = await newCoupon.save();

    // Add coupon to vendor's coupons array
    await Vendor.findByIdAndUpdate(
      vendorId,
      { $addToSet: { coupons: savedCoupon._id } },
      { new: true }
    );

    // Emit socket event for real-time updates
    safeEmit(null, 'coupon:created', {
      couponId: savedCoupon._id,
      vendorId: vendorId,
      code: savedCoupon.code,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: savedCoupon,
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coupon',
      error: error.message,
    });
  }
});

// Update a vendor coupon
router.put('/coupons/:couponId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { couponId } = req.params;
    const { description, discount, discountType, startDate, endDate, maxRedemptions, category, isActive } = req.body;

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        description,
        discount,
        discountType,
        startDate,
        endDate,
        maxRedemptions,
        category,
        isActive,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon',
      error: error.message,
    });
  }
});

// Delete a vendor coupon
router.delete('/coupons/:couponId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    // Emit socket event for real-time updates
    safeEmit(null, 'coupon:deleted', {
      couponId: coupon._id,
      vendorId: coupon.vendor,
    });

    res.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon',
      error: error.message,
    });
  }
});


// ============================================
// COUPON PURCHASE APPROVAL ENDPOINTS
// ============================================

/**
 * GET /admin/coupon-purchases/pending-approval
 * Get all coupon purchases pending admin approval
 * Auth required: Admin
 */
router.get('/coupon-purchases/pending-approval', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const purchases = await CouponPurchase.find({
      adminApprovalStatus: 'pending',
      vendorApprovalStatus: 'accepted' // Only show if vendor has accepted
    })
      .populate('studentId', 'name email enrollmentNumber collegeName')
      .populate('vendorId', 'name businessName')
      .populate('offerId', 'title description discountValue')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ purchasedAt: -1 });

    const total = await CouponPurchase.countDocuments({
      adminApprovalStatus: 'pending',
      vendorApprovalStatus: 'accepted'
    });

    res.json({
      success: true,
      message: 'Pending coupon purchases retrieved',
      coupons: purchases,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pending coupon purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending coupon purchases',
      error: error.message,
    });
  }
});

/**
 * GET /admin/coupon-purchases
 * Get all coupon purchases with filters
 * Auth required: Admin
 */
router.get('/coupon-purchases', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { adminApprovalStatus, vendorApprovalStatus, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (adminApprovalStatus) filter.adminApprovalStatus = adminApprovalStatus;
    if (vendorApprovalStatus) filter.vendorApprovalStatus = vendorApprovalStatus;

    const purchases = await CouponPurchase.find(filter)
      .populate('studentId', 'name email enrollmentNumber collegeName')
      .populate('vendorId', 'name businessName')
      .populate('offerId', 'title description')
      .populate('adminApprovedBy', 'name email')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ purchasedAt: -1 });

    const total = await CouponPurchase.countDocuments(filter);

    res.json({
      success: true,
      message: 'Coupon purchases retrieved',
      coupons: purchases,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching coupon purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon purchases',
      error: error.message,
    });
  }
});

/**
 * POST /admin/coupon-purchases/:couponPurchaseId/approve
 * Admin approves a coupon purchase for student to use
 * Auth required: Admin
 * Body: { approvalRemarks: string (optional) }
 */
router.post('/coupon-purchases/:couponPurchaseId/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { couponPurchaseId } = req.params;
    const adminId = req.user.id;
    const { approvalRemarks } = req.body;

    // Validate coupon purchase exists
    const couponPurchase = await CouponPurchase.findById(
      new mongoose.Types.ObjectId(couponPurchaseId)
    ).session(session);

    if (!couponPurchase) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Coupon purchase not found',
      });
    }

    // Check authorization - must have vendor acceptance first
    if (couponPurchase.vendorApprovalStatus !== 'accepted') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Vendor must accept the coupon before admin approval',
        vendorStatus: couponPurchase.vendorApprovalStatus,
      });
    }

    // Check if already approved/rejected
    if (couponPurchase.adminApprovalStatus !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Coupon is already ${couponPurchase.adminApprovalStatus}`,
      });
    }

    // Update coupon approval status
    couponPurchase.adminApprovalStatus = 'approved';
    couponPurchase.adminApprovedAt = new Date();
    couponPurchase.adminApprovedBy = new mongoose.Types.ObjectId(adminId);
    if (approvalRemarks) {
      couponPurchase.adminApprovalRemarks = approvalRemarks;
    }

    await couponPurchase.save({ session });
    await session.commitTransaction();

    // Emit real-time notification
    safeEmit(null, 'coupon:admin-approved', {
      couponPurchaseId: couponPurchase._id,
      couponCode: couponPurchase.couponCode,
      studentId: couponPurchase.studentId,
      vendorId: couponPurchase.vendorId,
      approvedAt: couponPurchase.adminApprovedAt,
    });

    res.json({
      success: true,
      message: '✅ Coupon has been approved! Student can now use this coupon.',
      coupon: {
        _id: couponPurchase._id,
        couponCode: couponPurchase.couponCode,
        adminApprovalStatus: couponPurchase.adminApprovalStatus,
        approvedAt: couponPurchase.adminApprovedAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error approving coupon purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve coupon purchase',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
});

/**
 * POST /admin/coupon-purchases/:couponPurchaseId/reject
 * Admin rejects a coupon purchase
 * Auth required: Admin
 * Body: { rejectionReason: string (required) }
 */
router.post('/coupon-purchases/:couponPurchaseId/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { couponPurchaseId } = req.params;
    const adminId = req.user.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    // Validate coupon purchase exists
    const couponPurchase = await CouponPurchase.findById(
      new mongoose.Types.ObjectId(couponPurchaseId)
    ).session(session);

    if (!couponPurchase) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Coupon purchase not found',
      });
    }

    // Check if already approved/rejected
    if (couponPurchase.adminApprovalStatus !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Coupon is already ${couponPurchase.adminApprovalStatus}`,
      });
    }

    // Update coupon status to rejected
    couponPurchase.adminApprovalStatus = 'rejected';
    couponPurchase.adminApprovedAt = new Date();
    couponPurchase.adminApprovedBy = new mongoose.Types.ObjectId(adminId);
    couponPurchase.adminRejectionReason = rejectionReason;

    await couponPurchase.save({ session });
    await session.commitTransaction();

    // Emit real-time notification
    safeEmit(null, 'coupon:admin-rejected', {
      couponPurchaseId: couponPurchase._id,
      couponCode: couponPurchase.couponCode,
      studentId: couponPurchase.studentId,
      rejectionReason: rejectionReason,
    });

    res.json({
      success: true,
      message: '❌ Coupon has been rejected.',
      coupon: {
        _id: couponPurchase._id,
        couponCode: couponPurchase.couponCode,
        adminApprovalStatus: couponPurchase.adminApprovalStatus,
        rejectionReason: couponPurchase.adminRejectionReason,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error rejecting coupon purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject coupon purchase',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
});

export default router;
