import CouponPurchase from '../models/CouponPurchase.js';
import Offer from '../models/Offer.js';
import Student from '../models/Student.js';
import Vendor from '../models/Vendor.js';
import { generateCouponCode } from '../utils/helpers.js';
import mongoose from 'mongoose';

/**
 * Get all available offers that can be purchased
 * Filter by category, vendor, active status
 */
export const getAvailableOffers = async (req, res) => {
  try {
    const { category, vendorId, search, limit = 20, page = 1 } = req.query;

    let filter = {
      isActive: true,
      approvalStatus: 'approved',
    };

    if (category) {
      filter.category = category;
    }

    if (vendorId) {
      filter.vendor = new mongoose.Types.ObjectId(vendorId);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const offers = await Offer.find(filter)
      .populate('vendor', 'name businessName email category')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Offer.countDocuments(filter);

    res.json({
      success: true,
      offers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available offers',
      error: error.message,
    });
  }
};

/**
 * Get coupon purchase history for a student
 */
export const getMyPurchases = async (req, res) => {
  try {
    const { status, vendorId, limit = 20, page = 1 } = req.query;
    const studentId = req.user.id;

    let filter = { studentId: new mongoose.Types.ObjectId(studentId) };

    if (status) {
      filter.status = status;
    }

    if (vendorId) {
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const skip = (page - 1) * limit;

    const purchases = await CouponPurchase.find(filter)
      .populate('vendorId', 'name businessName email')
      .populate('offerId', 'title description category discount discountType')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ purchasedAt: -1 });

    const total = await CouponPurchase.countDocuments(filter);

    // Categorize coupons
    const active = purchases.filter(p => p.status === 'active');
    const used = purchases.filter(p => p.status === 'used');
    const expired = purchases.filter(p => p.status === 'expired');

    res.json({
      success: true,
      purchases,
      stats: {
        total,
        active: active.length,
        used: used.length,
        expired: expired.length,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase history',
      error: error.message,
    });
  }
};

/**
 * Purchase coupon(s) - Student pays platform, generates unique codes
 * Step 1: Validate student is approved
 * Step 2: Validate offer exists and is approved
 * Step 3: Generate unique coupon codes
 * Step 4: Process payment
 * Step 5: Save purchases to database
 */
export const purchaseCoupon = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const studentId = req.user.id;
    const { offerId, quantity = 1, transactionId, paymentMethod } = req.body;

    // Validate inputs
    if (!offerId || quantity < 1) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID or quantity',
      });
    }

    // Step 1: Verify student is approved
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (student.approvalStatus !== 'approved') {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You must be approved by admin before purchasing coupons',
        currentStatus: student.approvalStatus,
      });
    }

    // Step 2: Get and validate offer
    const offer = await Offer.findById(offerId).session(session);
    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    if (offer.approvalStatus !== 'approved' || !offer.isActive) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This offer is not available for purchase',
      });
    }

    // Step 3: Verify vendor exists and is active
    const vendor = await Vendor.findById(offer.vendor).session(session);
    if (!vendor || vendor.approvalStatus !== 'approved') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Vendor is not active or approved',
      });
    }

    // Calculate platform selling price
    // This should be configured per offer, for now using a default
    // Example: Original value ₹100, Platform sells for ₹30
    const platformSellingPrice = offer.platformSellingPrice || Math.floor(offer.discount * 0.3);
    const totalPrice = platformSellingPrice * quantity;

    // Step 4: Create coupon purchases
    // In real implementation, verify payment before creating records
    // For now, creating with 'completed' status assuming payment is processed
    const couponPurchases = [];

    for (let i = 0; i < quantity; i++) {
      const uniqueCouponCode = generateCouponCode() + Date.now() + Math.random().toString(36).slice(2, 5);

      const purchase = new CouponPurchase({
        couponCode: uniqueCouponCode.toUpperCase(),
        studentId,
        vendorId: offer.vendor,
        offerId,
        discountType: offer.discountType,
        discountValue: offer.discount,
        originalValue: offer.discount,
        platformSellingPrice,
        transactionId,
        paymentStatus: 'completed', // In real implementation, verify with payment gateway
        paymentMethod,
        paidAt: new Date(),
        status: 'active',
        expiryDate: offer.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        quantity: 1,
      });

      couponPurchases.push(purchase);
    }

    // Step 5: Save all purchases to database
    const savedPurchases = await CouponPurchase.insertMany(couponPurchases, { session });

    // Step 6: Update vendor's pending coupon count
    if (vendor) {
      vendor.totalCouponsPending = (vendor.totalCouponsPending || 0) + quantity;
      await vendor.save({ session });
    }

    // Step 7: Record vendor revenue immediately when student pays
    // (prevents delay in vendor receiving funds). Mark purchases as revenueRecorded
    try {
      if (vendor) {
        const revenueAmount = platformSellingPrice * quantity;
        vendor.totalRevenue = (vendor.totalRevenue || 0) + revenueAmount;
        vendor.accountBalance = (vendor.accountBalance || 0) + revenueAmount;

        if (!vendor.revenueHistory) vendor.revenueHistory = [];
        vendor.revenueHistory.push({
          couponPurchaseIds: savedPurchases.map(p => p._id),
          amount: revenueAmount,
          type: 'paid',
          paidAt: new Date(),
          status: 'credited',
        });

        await vendor.save({ session });

        // Mark saved purchases as revenueRecorded so vendor acceptance won't double-count
        await CouponPurchase.updateMany(
          { _id: { $in: savedPurchases.map(p => p._id) } },
          { $set: { revenueRecorded: true } },
          { session }
        );
      }
    } catch (revErr) {
      console.error('Failed to record vendor revenue at purchase time (non-fatal):', revErr.message);
      // Do not abort transaction for revenue recording issues; purchases should succeed
    }

    await session.commitTransaction();

    // Emit real-time event to notify vendor of purchase
    try {
      const io = req.io; // Socket.io instance attached to request
      if (io) {
        const vendorId = offer.vendor.toString();
        const totalPrice = platformSellingPrice * quantity;
        
        // ========== EMIT TO VENDOR ==========
        io.to(`vendor:${vendorId}`).emit('vendor:coupon-purchased', {
          studentId,
          vendorId,
          offerId,
          offerTitle: offer.title,
          quantity,
          totalPrice,
          platformSellingPrice,
          timestamp: new Date(),
          purchases: savedPurchases.map(p => ({
            _id: p._id,
            couponCode: p.couponCode,
            status: p.status,
            expiryDate: p.expiryDate,
            discountValue: p.discountValue,
            discountType: p.discountType,
            platformSellingPrice: p.platformSellingPrice,
          })),
        });
        console.log(`📡 Real-time event emitted to vendor ${vendorId}: ${quantity} coupon(s) purchased`);

        // Emit revenue update event to vendor
        if (vendor) {
          io.to(`vendor:${vendorId}`).emit('vendor:revenue:updated', {
            totalRevenue: vendor.totalRevenue,
            accountBalance: vendor.accountBalance,
            revenueAdded: platformSellingPrice * quantity,
            couponCount: quantity,
            timestamp: new Date(),
          });
          console.log(`📈 Real-time revenue update emitted to vendor ${vendorId}: +₹${platformSellingPrice * quantity}`);
        }

        // ========== EMIT TO STUDENT ==========
        io.to(`student:${studentId}`).emit('student:coupon-purchased', {
          success: true,
          message: `Successfully purchased ${quantity} coupon(s)`,
          offerId,
          offerTitle: offer.title,
          quantity,
          totalPrice,
          platformSellingPrice,
          vendorName: vendor?.name || 'Unknown Vendor',
          timestamp: new Date(),
          purchases: savedPurchases.map(p => ({
            _id: p._id,
            couponCode: p.couponCode,
            status: p.status,
            expiryDate: p.expiryDate,
            discountValue: p.discountValue,
            discountType: p.discountType,
          })),
        });
        
        // Emit notification to student
        io.to(`student:${studentId}`).emit('student:notification:purchase-success', {
          id: `purchase-${Date.now()}`,
          type: 'success',
          title: '✅ Purchase Successful',
          message: `You've purchased ${quantity} coupon(s) for ${offer.title}. Total: ₹${totalPrice}`,
          timestamp: new Date(),
          read: false,
        });
        console.log(`📡 Purchase confirmation emitted to student ${studentId}`);

        // ========== EMIT TO ADMINS ==========
        io.to('admins').emit('admin:coupon-purchased', {
          studentId,
          studentName: student?.name || 'Unknown Student',
          vendorId,
          vendorName: vendor?.name || 'Unknown Vendor',
          offerId,
          offerTitle: offer.title,
          quantity,
          totalRevenue: platformSellingPrice * quantity,
          timestamp: new Date(),
        });
        console.log(`📡 Purchase update emitted to all admins`);
      }
    } catch (socketError) {
      console.error('Failed to emit socket event (non-critical):', socketError.message);
      // Don't fail the request if socket emit fails
    }

    res.status(201).json({
      success: true,
      message: `Successfully purchased ${quantity} coupon(s)`,
      totalPrice,
      priceBreakdown: {
        originalValue: offer.discount,
        platformSellingPrice,
        quantity,
        total: totalPrice,
      },
      purchases: savedPurchases.map(p => ({
        _id: p._id,
        couponCode: p.couponCode,
        status: p.status,
        expiryDate: p.expiryDate,
        discountValue: p.discountValue,
        discountType: p.discountType,
      })),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error purchasing coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase coupon',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Vendor validates and marks coupon as used
 * System checks:
 * - Is coupon valid?
 * - Is it expired?
 * - Is it already used?
 * - Is it assigned to this vendor?
 * Step 4: Mark as used if all checks pass
 */
export const validateAndRedeemCoupon = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { couponCode, redemptionNotes } = req.body;

    // Validate input
    if (!couponCode || !couponCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
        errorType: 'MISSING_CODE',
      });
    }

    // Step 1: Find coupon by code (case-insensitive)
    const coupon = await CouponPurchase.findOne({
      couponCode: couponCode.toUpperCase().trim(),
    })
      .populate('studentId', 'name email studentId')
      .populate('offerId', 'title description discount discountType');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon code not found in system',
        errorType: 'COUPON_NOT_FOUND',
        providedCode: couponCode.toUpperCase(),
      });
    }

    // Step 2: Verify coupon is assigned to this vendor
    if (coupon.vendorId.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'This coupon is not assigned to your vendor account',
        errorType: 'VENDOR_MISMATCH',
        couponCode: coupon.couponCode,
        assignedToVendorId: coupon.vendorId,
      });
    }

    // Step 2.5: Check admin approval (CRITICAL - Coupon must be admin approved before use)
    if (coupon.adminApprovalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'This coupon is awaiting admin verification. Please try again after it is approved.',
        errorType: 'PENDING_ADMIN_APPROVAL',
        couponCode: coupon.couponCode,
        adminApprovalStatus: coupon.adminApprovalStatus,
        statusDisplay: coupon.adminApprovalStatus === 'pending' ? '⏳ Awaiting Admin Approval' : '❌ Admin Rejected',
      });
    }

    // Step 3: Check validity - all conditions must pass
    const now = new Date();
    const isExpired = now > coupon.expiryDate;
    const isAlreadyUsed = coupon.status === 'used';
    const isCancelled = coupon.status === 'cancelled';

    // Check if coupon is already used
    if (isAlreadyUsed) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has already been used',
        errorType: 'COUPON_ALREADY_USED',
        couponCode: coupon.couponCode,
        usedAt: coupon.usedAt,
        usedByVendor: coupon.usedByVendor,
        studentName: coupon.studentId.name,
      });
    }

    // Check if coupon is cancelled
    if (isCancelled) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has been cancelled and cannot be redeemed',
        errorType: 'COUPON_CANCELLED',
        couponCode: coupon.couponCode,
      });
    }

    // Check if coupon is expired
    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has expired and can no longer be redeemed',
        errorType: 'COUPON_EXPIRED',
        couponCode: coupon.couponCode,
        expiryDate: coupon.expiryDate,
        daysExpired: Math.floor((now - coupon.expiryDate) / (1000 * 60 * 60 * 24)),
      });
    }

    // Verify coupon is in active status
    if (coupon.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Coupon cannot be redeemed. Current status: ${coupon.status}`,
        errorType: 'INVALID_STATUS',
        couponCode: coupon.couponCode,
        currentStatus: coupon.status,
      });
    }

    // All validations passed - Mark as used
    coupon.status = 'used';
    coupon.usedAt = new Date();
    coupon.usedByVendor = vendorId;
    coupon.redemptionNotes = redemptionNotes || '';

    await coupon.save();

    // Update vendor's redeemed count
    const vendor = await Vendor.findById(vendorId);
    if (vendor) {
      vendor.totalCouponsRedeemed = (vendor.totalCouponsRedeemed || 0) + 1;
      await vendor.save();
    }

    // Emit real-time event to notify student and vendor
    try {
      const io = req.io; // Socket.io instance attached to request
      if (io) {
        io.emit('coupon:redeemed', {
          couponCode: coupon.couponCode,
          couponId: coupon._id,
          studentId: coupon.studentId._id,
          vendorId: coupon.vendorId,
          discountValue: coupon.discountValue,
          discountType: coupon.discountType,
          usedAt: coupon.usedAt,
        });
        console.log(`📡 Real-time event emitted: Coupon ${coupon.couponCode} redeemed by vendor ${vendorId}`);
      }
    } catch (socketError) {
      console.error('Failed to emit socket event (non-critical):', socketError.message);
      // Don't fail the request if socket emit fails
    }

    res.json({
      success: true,
      message: '✅ Coupon validated successfully and marked as used',
      coupon: {
        couponCode: coupon.couponCode,
        couponId: coupon._id,
        studentName: coupon.studentId.name,
        studentEmail: coupon.studentId.email,
        studentId: coupon.studentId._id,
        discountValue: coupon.discountValue,
        discountType: coupon.discountType,
        discountLabel: `${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : '₹' + coupon.discountValue} off`,
        offerTitle: coupon.offerId.title,
        status: coupon.status,
        purchasedAt: coupon.purchasedAt,
        usedAt: coupon.usedAt,
        expiryDate: coupon.expiryDate,
        redemptionNotes: coupon.redemptionNotes,
      },
      message2: 'Please apply the discount to this purchase',
    });
  } catch (error) {
    console.error('❌ Error validating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon due to system error',
      errorType: 'SYSTEM_ERROR',
      error: error.message,
    });
  }
};

/**
 * Vendor gets all coupons purchased from their offers
 */
export const getVendorPurchasedCoupons = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, limit = 20, page = 1 } = req.query;

    let filter = { vendorId: new mongoose.Types.ObjectId(vendorId) };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const coupons = await CouponPurchase.find(filter)
      .populate('studentId', 'name email studentId')
      .populate('offerId', 'title category')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ purchasedAt: -1 });

    const total = await CouponPurchase.countDocuments(filter);

    // Get statistics
    const stats = await CouponPurchase.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach(s => {
      statsMap[s._id] = s.count;
    });

    res.json({
      success: true,
      coupons,
      stats: {
        total,
        active: statsMap.active || 0,
        used: statsMap.used || 0,
        expired: statsMap.expired || 0,
        cancelled: statsMap.cancelled || 0,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor coupons',
      error: error.message,
    });
  }
};

/**
 * Get all vendors with their active offers/coupons for student browsing
 * Groups offers by vendor for better UX
 */
export const getAllVendorsWithOffers = async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;

    let vendorFilter = {
      approvalStatus: 'approved',
      isActive: true,
    };

    let offerFilter = {
      isActive: true,
      approvalStatus: 'approved',
    };

    if (search) {
      vendorFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { businessDescription: { $regex: search, $options: 'i' } },
      ];

      offerFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Get all vendors with their offers
    const vendors = await Vendor.find(vendorFilter)
      .select('_id name businessName businessDescription businessType mobileNumber businessAddress city state latitude longitude')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // For each vendor, get their active offers
    const vendorsWithOffers = await Promise.all(
      vendors.map(async (vendor) => {
        const offers = await Offer.find({
          ...offerFilter,
          vendor: vendor._id,
        })
          .select('_id title description category discount discountType platformSellingPrice maxRedemptions currentRedemptions')
          .sort({ createdAt: -1 });

        return {
          _id: vendor._id,
          name: vendor.name,
          businessName: vendor.businessName,
          businessDescription: vendor.businessDescription,
          businessType: vendor.businessType,
          mobileNumber: vendor.mobileNumber,
          businessAddress: vendor.businessAddress,
          city: vendor.city,
          state: vendor.state,
          latitude: vendor.latitude,
          longitude: vendor.longitude,
          offersCount: offers.length,
          offers: offers,
          averageDiscount: offers.length > 0
            ? Math.round(offers.reduce((sum, o) => sum + o.discount, 0) / offers.length)
            : 0,
        };
      })
    );

    const totalVendors = await Vendor.countDocuments(vendorFilter);

    res.json({
      success: true,
      vendors: vendorsWithOffers,
      pagination: {
        total: totalVendors,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalVendors / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vendors with offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors with offers',
      error: error.message,
    });
  }
};

/**
 * Get coupon details by code
 */
export const getCouponByCode = async (req, res) => {
  try {
    const { couponCode } = req.params;

    const coupon = await CouponPurchase.findOne({
      couponCode: couponCode.toUpperCase(),
    })
      .populate('studentId', 'name email')
      .populate('vendorId', 'name businessName')
      .populate('offerId', 'title description discount');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.json({
      success: true,
      coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon details',
      error: error.message,
    });
  }
};

/**
 * Get pending coupons awaiting vendor approval
 * Vendor sees coupons they need to accept/reject
 */
export const getPendingCouponApprovals = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const coupons = await CouponPurchase.find({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      vendorApprovalStatus: 'pending',
    })
      .populate('studentId', 'name email studentId')
      .populate('offerId', 'title description category discount')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ purchasedAt: -1 });

    const total = await CouponPurchase.countDocuments({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      vendorApprovalStatus: 'pending',
    });

    res.json({
      success: true,
      message: 'Pending coupon approvals retrieved',
      coupons,
      stats: {
        totalPending: total,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message,
    });
  }
};

/**
 * Vendor accepts a coupon purchase and records revenue
 * Step 1: Find coupon purchase
 * Step 2: Verify it's pending approval
 * Step 3: Update coupon status to accepted
 * Step 4: Update vendor revenue and account balance
 * Step 5: Emit notification event
 */
export const acceptCoupon = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user.id;
    const { couponPurchaseId } = req.body;

    // Validate input
    if (!couponPurchaseId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Coupon purchase ID is required',
      });
    }

    // Step 1: Find coupon purchase
    const coupon = await CouponPurchase.findById(
      new mongoose.Types.ObjectId(couponPurchaseId)
    ).session(session);

    if (!coupon) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Coupon purchase not found',
      });
    }

    // Step 2: Verify coupon is assigned to this vendor and pending approval
    if (coupon.vendorId.toString() !== vendorId) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This coupon does not belong to your vendor account',
      });
    }

    if (coupon.vendorApprovalStatus !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Coupon is already ${coupon.vendorApprovalStatus}`,
      });
    }

    // Step 3: Update coupon approval status
    coupon.vendorApprovalStatus = 'accepted';
    coupon.vendorApprovedAt = new Date();
    await coupon.save({ session });

    // Step 4: Update vendor revenue
    const vendor = await Vendor.findById(new mongoose.Types.ObjectId(vendorId)).session(session);

    if (vendor) {
      // Only add revenue here if it wasn't already recorded at purchase time
      const alreadyRecorded = !!coupon.revenueRecorded;
      if (!alreadyRecorded) {
        vendor.totalRevenue = (vendor.totalRevenue || 0) + coupon.platformSellingPrice;
        vendor.accountBalance = (vendor.accountBalance || 0) + coupon.platformSellingPrice;

        if (!vendor.revenueHistory) vendor.revenueHistory = [];
        vendor.revenueHistory.push({
          couponPurchaseId: coupon._id,
          amount: coupon.platformSellingPrice,
          type: 'accepted',
          acceptedAt: new Date(),
          status: 'credited',
        });
      }

      vendor.totalCouponsAccepted = (vendor.totalCouponsAccepted || 0) + 1;
      vendor.totalCouponsPending = Math.max((vendor.totalCouponsPending || 0) - 1, 0);

      await vendor.save({ session });

      // If revenue was not recorded before, mark coupon as recorded
      if (!alreadyRecorded) {
        coupon.revenueRecorded = true;
        await coupon.save({ session });
      }
    }

    await session.commitTransaction();

    // Emit real-time notification
    try {
      const io = req.io;
      if (io) {
        io.emit('coupon:vendor-accepted', {
          couponPurchaseId: coupon._id,
          couponCode: coupon.couponCode,
          vendorId,
          amount: coupon.platformSellingPrice,
          acceptedAt: coupon.vendorApprovedAt,
        });
      }
    } catch (socketError) {
      console.error('Failed to emit socket event (non-critical):', socketError.message);
    }

    res.json({
      success: true,
      message: '✅ Coupon accepted successfully! Revenue has been added to your account.',
      coupon: {
        couponPurchaseId: coupon._id,
        couponCode: coupon.couponCode,
        status: coupon.vendorApprovalStatus,
        revenueAdded: coupon.platformSellingPrice,
        approvedAt: coupon.vendorApprovedAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error accepting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept coupon',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Vendor rejects a coupon purchase
 * Step 1: Find coupon purchase
 * Step 2: Verify it's pending approval
 * Step 3: Update coupon status to rejected
 * Step 4: Update vendor rejection count
 */
export const rejectCoupon = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user.id;
    const { couponPurchaseId, rejectionReason } = req.body;

    // Validate input
    if (!couponPurchaseId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Coupon purchase ID is required',
      });
    }

    // Step 1: Find coupon purchase
    const coupon = await CouponPurchase.findById(
      new mongoose.Types.ObjectId(couponPurchaseId)
    ).session(session);

    if (!coupon) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Coupon purchase not found',
      });
    }

    // Step 2: Verify coupon is assigned to this vendor and pending approval
    if (coupon.vendorId.toString() !== vendorId) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This coupon does not belong to your vendor account',
      });
    }

    if (coupon.vendorApprovalStatus !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Coupon is already ${coupon.vendorApprovalStatus}`,
      });
    }

    // Step 3: Update coupon status to rejected
    coupon.vendorApprovalStatus = 'rejected';
    coupon.vendorRejectionReason = rejectionReason || 'No reason provided';
    await coupon.save({ session });

    // Step 4: Update vendor rejection count
    const vendor = await Vendor.findById(new mongoose.Types.ObjectId(vendorId)).session(session);

    if (vendor) {
      vendor.totalCouponsRejected = (vendor.totalCouponsRejected || 0) + 1;
      vendor.totalCouponsPending = Math.max((vendor.totalCouponsPending || 0) - 1, 0);
      await vendor.save({ session });
    }

    await session.commitTransaction();

    // Emit real-time notification
    try {
      const io = req.io;
      if (io) {
        io.emit('coupon:vendor-rejected', {
          couponPurchaseId: coupon._id,
          couponCode: coupon.couponCode,
          vendorId,
          rejectionReason: coupon.vendorRejectionReason,
        });
      }
    } catch (socketError) {
      console.error('Failed to emit socket event (non-critical):', socketError.message);
    }

    res.json({
      success: true,
      message: '❌ Coupon has been rejected.',
      coupon: {
        couponPurchaseId: coupon._id,
        couponCode: coupon.couponCode,
        status: coupon.vendorApprovalStatus,
        rejectionReason: coupon.vendorRejectionReason,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error rejecting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject coupon',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get vendor revenue dashboard with summary statistics
 */
export const getVendorRevenueData = async (req, res) => {
  try {
    const vendorId = req.user.id;
    console.log('📊 Fetching revenue data for vendor:', vendorId);

    // Get vendor details
    const vendor = await Vendor.findById(new mongoose.Types.ObjectId(vendorId));

    if (!vendor) {
      console.warn('⚠️ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get coupon statistics
    const couponStats = await CouponPurchase.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$vendorApprovalStatus',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$platformSellingPrice' },
        },
      },
    ]);

    const statsMap = {};
    let totalPotentialRevenue = 0;

    couponStats.forEach(stat => {
      statsMap[stat._id] = {
        count: stat.count,
        totalRevenue: stat.totalRevenue,
      };
      if (stat._id === 'accepted' || stat._id === 'redeemed') {
        totalPotentialRevenue += stat.totalRevenue;
      }
    });

    // Get recent transactions
    const recentTransactions = vendor.revenueHistory
      ? vendor.revenueHistory.slice(-10).reverse()
      : [];

    console.log('✅ Revenue data retrieved successfully for vendor:', vendorId);
    res.json({
      success: true,
      message: 'Vendor revenue data retrieved',
      dashboard: {
        vendorName: vendor.name,
        businessName: vendor.businessName,
        accountBalance: vendor.accountBalance || 0,
        totalRevenue: vendor.totalRevenue || 0,
        totalCouponsAccepted: vendor.totalCouponsAccepted || 0,
        totalCouponsRedeemed: vendor.totalCouponsRedeemed || 0,
        totalCouponsPending: vendor.totalCouponsPending || 0,
        totalCouponsRejected: vendor.totalCouponsRejected || 0,
      },
      couponBreakdown: {
        pending: statsMap.pending || { count: 0, totalRevenue: 0 },
        accepted: statsMap.accepted || { count: 0, totalRevenue: 0 },
        rejected: statsMap.rejected || { count: 0, totalRevenue: 0 },
      },
      recentTransactions: recentTransactions.map(t => ({
        amount: t.amount,
        type: t.type,
        status: t.status,
        timestamp: t.acceptedAt || t.redeemedAt,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching revenue data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue data',
      error: error.message,
    });
  }
};

/**
 * Get all coupon approval history for vendor
 */
export const getCouponApprovalHistory = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, limit = 20, page = 1 } = req.query;

    let filter = { vendorId: new mongoose.Types.ObjectId(vendorId) };

    if (status) {
      filter.vendorApprovalStatus = status;
    }

    const skip = (page - 1) * limit;

    const coupons = await CouponPurchase.find(filter)
      .populate('studentId', 'name email')
      .populate('offerId', 'title description')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ vendorApprovedAt: -1 });

    const total = await CouponPurchase.countDocuments(filter);

    res.json({
      success: true,
      message: 'Approval history retrieved',
      coupons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history',
      error: error.message,
    });
  }
};
