import express from 'express';
import Vendor from '../models/Vendor.js';
import Offer from '../models/Offer.js';
import VerificationDocument from '../models/VerificationDocument.js';
import Student from '../models/Student.js';
import CouponPurchase from '../models/CouponPurchase.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

// Helper function to safely emit socket events without crashing the endpoint
function safeEmit(room, event, data) {
  try {
    if (io && io.to) {
      io.to(room).emit(event, data);
    }
  } catch (error) {
    console.warn(`Warning: Failed to emit socket event ${event} to ${room}:`, error.message);
  }
}

// ========== VENDOR DASHBOARD ==========

// Get vendor profile
router.get('/profile', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id).select('-password');
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get vendor statistics
    const totalOffers = await Offer.countDocuments({ vendor: req.user.id });
    const activeOffers = await Offer.countDocuments({ vendor: req.user.id, isActive: true });
    const totalRedemptions = await Offer.aggregate([
      { $match: { vendor: req.user.id } },
      { $group: { _id: null, total: { $sum: '$currentRedemptions' } } },
    ]);

    res.json({
      success: true,
      data: {
        ...vendor.toObject(),
        stats: {
          totalOffers,
          activeOffers,
          totalRedemptions: totalRedemptions[0]?.total || 0,
        }
      },
    });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor profile',
      error: error.message,
    });
  }
});

// Get vendor dashboard overview
router.get('/dashboard/overview', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const totalOffers = await Offer.countDocuments({ vendor: vendorId });
    const activeOffers = await Offer.countDocuments({ vendor: vendorId, isActive: true });
    
    const redemptionData = await Offer.aggregate([
      { $match: { vendor: vendorId } },
      { $group: { 
        _id: null, 
        totalRedemptions: { $sum: '$currentRedemptions' },
        totalDiscount: { $sum: { $multiply: ['$discountValue', '$currentRedemptions'] } }
      } },
    ]);

    // Fetch vendor revenue data
    const vendor = await Vendor.findById(vendorId).select('totalRevenue accountBalance totalCouponsAccepted totalCouponsRedeemed');
    
    const overview = {
      totalOffers,
      activeOffers,
      totalRedemptions: redemptionData[0]?.totalRedemptions || 0,
      totalDiscount: redemptionData[0]?.totalDiscount || 0,
      totalRevenue: vendor?.totalRevenue || 0,
      accountBalance: vendor?.accountBalance || 0,
      totalCouponsAccepted: vendor?.totalCouponsAccepted || 0,
      totalCouponsRedeemed: vendor?.totalCouponsRedeemed || 0,
      timestamp: new Date()
    };

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:overview:updated', overview);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error.message,
    });
  }
});

// Get vendor analytics
router.get('/analytics', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30' } = req.query;
    
    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const offers = await Offer.find({ 
      vendorId,
      createdAt: { $gte: startDate }
    }).lean();

    const analytics = {
      period: `Last ${daysBack} days`,
      totalOffers: offers.length,
      activeOffers: offers.filter(o => o.isActive).length,
      totalRedemptions: offers.reduce((sum, o) => sum + (o.currentRedemptions || 0), 0),
      totalDiscount: offers.reduce((sum, o) => sum + (o.discountValue || 0) * (o.currentRedemptions || 0), 0),
      offers: offers.map(o => ({
        _id: o._id,
        title: o.title,
        category: o.category,
        discount: o.discountValue,
        redemptions: o.currentRedemptions || 0,
        isActive: o.isActive,
        createdAt: o.createdAt
      })),
      timestamp: new Date()
    };

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:analytics:updated', analytics);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

// Get vendor revenue and earnings information
router.get('/revenue', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30' } = req.query;

    // Fetch vendor with revenue data
    const vendor = await Vendor.findById(vendorId).select(
      'totalRevenue accountBalance totalCouponsAccepted totalCouponsRedeemed totalCouponsPending revenueHistory'
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Calculate revenue for period
    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get purchases for this period
    const periodPurchases = await CouponPurchase.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          paidAt: { $gte: startDate },
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          totalPeriodRevenue: { $sum: '$platformSellingPrice' },
          totalPeriodCoupons: { $sum: 1 },
        },
      },
    ]);

    // Get payment breakdown by method
    const paymentMethodBreakdown = await CouponPurchase.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          paidAt: { $gte: startDate },
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$platformSellingPrice' },
        },
      },
    ]);

    const revenueData = {
      totalRevenue: vendor.totalRevenue || 0,
      accountBalance: vendor.accountBalance || 0,
      periodRevenue: periodPurchases[0]?.totalPeriodRevenue || 0,
      periodCoupons: periodPurchases[0]?.totalPeriodCoupons || 0,
      period: `Last ${daysBack} days`,
      statistics: {
        couponsAccepted: vendor.totalCouponsAccepted || 0,
        couponsRedeemed: vendor.totalCouponsRedeemed || 0,
        couponsPending: vendor.totalCouponsPending || 0,
      },
      paymentMethods: paymentMethodBreakdown.map(method => ({
        method: method._id || 'unknown',
        count: method.count,
        revenue: method.revenue,
      })),
      timestamp: new Date(),
    };

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:revenue:updated', revenueData);

    res.json({
      success: true,
      data: revenueData,
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue data',
      error: error.message,
    });
  }
});

// Get vendor orders (redemptions)
router.get('/orders', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 10, status = 'all' } = req.query;
    
    const skip = (page - 1) * limit;
    let filter = { vendor: vendorId };
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const total = await Offer.countDocuments(filter);
    const orders = await Offer.find(filter)
      .select('title category discountValue currentRedemptions maxRedemptions isActive createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:orders:updated', {
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        orders: orders.map(o => ({
          id: o._id,
          title: o.title,
          category: o.category,
          originalPrice: o.originalPrice || 0,
          discount: o.discountValue,
          redemptions: o.currentRedemptions || 0,
          maxRedemptions: o.maxRedemptions || 0,
          status: o.isActive ? 'active' : 'inactive',
          createdAt: o.createdAt
        })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
        timestamp: new Date()
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
});

// Get vendor products/offers
router.get('/products', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 10, search = '', category = 'all' } = req.query;
    
    const skip = (page - 1) * limit;
    let filter = { vendor: vendorId };
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    
    if (category !== 'all') {
      filter.category = category;
    }

    const total = await Offer.countDocuments(filter);
    const products = await Offer.find(filter)
      .select('title category discountValue isActive createdAt description')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:products:updated', {
      products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        products: products.map(p => ({
          id: p._id,
          name: p.title,
          category: p.category,
          price: p.discountValue,
          status: p.isActive ? 'active' : 'inactive',
          description: p.description,
          createdAt: p.createdAt
        })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
        timestamp: new Date()
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
});

// Get vendor coupon purchases (student transactions)
router.get('/coupon-purchases', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 10, status = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { vendorId: vendorId };
    if (status !== 'all') {
      filter.status = status;
    }

    // Add search filter for coupon code, student name, or email
    if (search) {
      const studentIds = await Student.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [
        { couponCode: { $regex: search, $options: 'i' } },
        { studentId: { $in: studentIds.map(s => s._id) } },
      ];
    }

    // Fetch purchases with student and offer details
    const purchases = await CouponPurchase.find(filter)
      .populate('studentId', 'name email')
      .populate('offerId', 'title')
      .select('couponCode studentId offerId discountType discountValue originalValue platformSellingPrice purchasedAt expiryDate status vendorApprovalStatus')
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await CouponPurchase.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Calculate stats - build aggregation pipeline correctly
    let statsFilter = { vendorId: vendorId };
    if (status !== 'all') {
      statsFilter.status = status;
    }
    
    const stats = await CouponPurchase.aggregate([
      { $match: statsFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$platformSellingPrice' },
          totalPurchases: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      purchases: purchases,
      total: total,
      totalPages: totalPages,
      page: parseInt(page),
      limit: parseInt(limit),
      stats: stats[0] || { totalRevenue: 0, totalPurchases: 0 },
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

// Get vendor discounts
router.get('/discounts', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const discounts = await Offer.find({ vendor: vendorId })
      .select('title discountValue discountType isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:discounts:updated', {
      discounts: discounts.map(d => ({
        id: d._id,
        name: d.title,
        discount: d.discountValue,
        type: d.discountType || 'percentage',
        status: d.isActive ? 'active' : 'inactive',
        createdAt: d.createdAt
      })),
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        discounts: discounts.map(d => ({
          id: d._id,
          name: d.title,
          discount: d.discountValue,
          type: d.discountType || 'percentage',
          status: d.isActive ? 'active' : 'inactive',
          createdAt: d.createdAt
        })),
        timestamp: new Date()
      },
    });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discounts',
      error: error.message,
    });
  }
});

// Get vendor notifications
router.get('/notifications', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;

    // Get recent offers for notification context
    const recentOffers = await Offer.find({ vendor: vendorId })
      .select('title isActive approvalStatus createdAt updatedAt')
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .lean();

    const notifications = recentOffers.map(offer => ({
      id: offer._id,
      type: offer.approvalStatus === 'approved' ? 'success' : offer.approvalStatus === 'pending' ? 'pending' : 'warning',
      title: offer.title,
      message: `Offer status: ${offer.approvalStatus}`,
      timestamp: offer.updatedAt || offer.createdAt,
      read: false
    }));

    // Broadcast to vendor room
    safeEmit(`vendor:${vendorId}`, 'vendor:notifications:updated', {
      notifications,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: recentOffers.length },
        timestamp: new Date()
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
});

// Update vendor profile
router.put('/profile/update', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const { businessName, businessType, mobileNumber, businessEmail, businessAddress, city, state, businessDescription, website, latitude, longitude, locality, postalCode, mapUrl } = req.body;
    
    // Prepare update object
    const updateData = {
      businessName,
      businessType,
      mobileNumber,
      businessEmail,
      businessAddress,
      city,
      state,
      businessDescription,
      website,
      latitude,
      longitude,
      locality,
      postalCode,
      mapUrl,
      updatedAt: new Date(),
    };

    // If latitude and longitude are provided, create a GeoJSON Point for geospatial queries
    if (latitude && longitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // [longitude, latitude]
      };
    }
    
    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    // Broadcast profile update
    safeEmit(`vendor:${req.user.id}`, 'vendor:profile:updated', {
      vendor: updatedVendor,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedVendor,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

// POST endpoint for updating vendor location in real-time
router.post('/update-location', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const updateData = {
      latitude: lat,
      longitude: lng,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      updatedAt: new Date()
    };

    const vendor = await Vendor.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    // Emit real-time location update via socket
    try {
      if (io) {
        // Emit to student rooms for location tracking
        io.emit('vendor:location:updated', {
          vendorId: req.user.id,
          latitude: lat,
          longitude: lng,
          accuracy,
          timestamp: new Date()
        });

        // Emit to vendor's own room
        io.to(`vendor:${req.user.id}`).emit('location:updated', {
          latitude: lat,
          longitude: lng,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('Failed to emit socket event:', err.message);
    }

    res.json({
      success: true,
      message: 'Store location updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error updating vendor location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Get pending student verifications (documents requiring review)
router.get('/pending-verifications', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get pending verification documents
    const verificationDocuments = await VerificationDocument.find({ status: 'pending' })
      .populate({
        path: 'user',
        select: 'name email university verificationStatus',
        model: 'Student',
        match: { verificationStatus: 'pending' }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await VerificationDocument.countDocuments({ status: 'pending' });

    const pendingVerifications = verificationDocuments
      .filter(doc => doc.user) // Only include docs where user is still pending
      .map(doc => ({
        id: doc._id,
        studentName: doc.user?.name || 'Unknown',
        email: doc.user?.email || 'N/A',
        university: doc.user?.university || 'Not specified',
        documentType: doc.documentType,
        submittedAt: new Date(doc.createdAt).toLocaleString(),
        status: 'pending',
        documentUrl: doc.fileUrl,
        fileName: doc.fileName
      }));

    // Broadcast to vendor room if needed
    safeEmit(`vendor:${req.user.id}`, 'vendor:verifications:updated', {
      verifications: pendingVerifications,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        verifications: pendingVerifications,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
        timestamp: new Date()
      },
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending verifications',
      error: error.message,
    });
  }
});

// Find nearby students for vendor (based on vendor's location)
router.get('/location/nearby-students', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);

    if (!vendor || !vendor.latitude || !vendor.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Vendor location not set. Please update your location first.'
      });
    }

    const { radius = 10, page = 1, limit = 10 } = req.query;
    const lat = vendor.latitude;
    const lon = vendor.longitude;
    const radiusKm = parseFloat(radius);
    const radiusInMeters = radiusKm * 1000;

    const skip = (page - 1) * limit;

    try {
      // Try geospatial query
      // Use $geoWithin instead of $near to avoid sorting requirement
      const students = await Student.find({
        location: {
          $geoWithin: {
            $centerSphere: [[lon, lat], radiusInMeters / 6371000] // radius in radians
          }
        },
        isActive: true,
        approvalStatus: 'approved'
      })
        .skip(skip)
        .limit(parseInt(limit))
        .select('name email mobileNumber latitude longitude locality city state collegeName enrollmentNumber');

      const total = await Student.countDocuments({
        location: {
          $geoWithin: {
            $centerSphere: [[lon, lat], radiusInMeters / 6371000] // radius in radians
          }
        },
        isActive: true,
        approvalStatus: 'approved'
      });

      return res.json({
        success: true,
        vendorLocation: {
          latitude: vendor.latitude,
          longitude: vendor.longitude,
          businessAddress: vendor.businessAddress,
          city: vendor.city,
          state: vendor.state
        },
        students: students.map(s => ({
          ...s.toObject(),
          distance: calculateDistance(lat, lon, s.latitude, s.longitude)
        })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
      });
    } catch (geoError) {
      console.warn('Geospatial query failed, using fallback:', geoError.message);

      // Fallback: manual distance calculation
      const students = await Student.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      })
        .skip(skip)
        .limit(parseInt(limit))
        .select('name email mobileNumber latitude longitude locality city state collegeName enrollmentNumber');

      const studentsWithDistance = students
        .map(s => ({
          ...s.toObject(),
          distance: calculateDistance(lat, lon, s.latitude, s.longitude)
        }))
        .filter(s => parseFloat(s.distance) <= radiusKm)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      const allStudentsWithDistance = await Student.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      });

      const totalFiltered = allStudentsWithDistance
        .map(s => ({
          distance: calculateDistance(lat, lon, s.latitude, s.longitude)
        }))
        .filter(s => parseFloat(s.distance) <= radiusKm).length;

      return res.json({
        success: true,
        vendorLocation: {
          latitude: vendor.latitude,
          longitude: vendor.longitude,
          businessAddress: vendor.businessAddress,
          city: vendor.city,
          state: vendor.state
        },
        students: studentsWithDistance,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: totalFiltered },
        method: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in nearby-students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby students',
      error: error.message
    });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return null;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // Distance in km
}

// Health check for vendor endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Vendor API is healthy',
    timestamp: new Date()
  });
});

export default router;
