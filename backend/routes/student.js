import express from 'express';
import Offer from '../models/Offer.js';
import Student from '../models/Student.js';
import Coupon from '../models/Coupon.js';
import Vendor from '../models/Vendor.js';
import { authenticateToken, authorizeRole, verifyStudentApproval } from '../middleware/auth.js';

const router = express.Router();

// Get student dashboard
router.get('/dashboard', authenticateToken, authorizeRole('student'), verifyStudentApproval, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const activeOffers = await Offer.find({ isActive: true }).limit(5);
    const savedOffers = await Offer.find({ savedBy: req.user.id }).limit(5);

    res.json({
      student,
      activeOffers,
      savedOffers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard', error: error.message });
  }
});

// Get student's discounts
router.get('/discounts', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Only show active and approved offers to students
    const offers = await Offer.find({ isActive: true, status: 'active' })
      .skip(skip)
      .limit(limit)
      .populate('vendor', 'name businessName businessCategory');

    const total = await Offer.countDocuments({ isActive: true, status: 'active' });

    res.json({
      offers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch discounts', error: error.message });
  }
});

// Get active coupons (only approved ones for students)
router.get('/coupons', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find({ 
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'  // Only show approved coupons to students
    })
      .skip(skip)
      .limit(limit)
      .populate('vendor', 'name businessName');

    const total = await Coupon.countDocuments({ 
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'
    });

    res.json({
      success: true,
      coupons,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch coupons', 
      error: error.message 
    });
  }
});

// Search offers
router.get('/search', authenticateToken, authorizeRole('student'), verifyStudentApproval, async (req, res) => {
  try {
    const { query, category } = req.query;
    // Only show active and approved offers to students
    let filter = { isActive: true, status: 'active' };

    if (category) {
      filter.category = category;
    }

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    const offers = await Offer.find(filter).populate('vendor', 'name businessName');
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search offers', error: error.message });
  }
});

// Redeem offer
router.post('/offers/redeem', authenticateToken, authorizeRole('student'), verifyStudentApproval, async (req, res) => {
  try {
    const { offerId, redemptionType } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (!offer.isActive) {
      return res.status(400).json({ message: 'This offer is not available' });
    }

    const alreadyRedeemed = offer.redemptions.some(
      r => r.student.toString() === req.user.id
    );
    if (alreadyRedeemed) {
      return res.status(400).json({ message: 'You have already redeemed this offer' });
    }

    const redemptionCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    offer.redemptions.push({
      student: req.user.id,
      redeemedAt: new Date(),
      redemptionCode,
      isOnline: redemptionType === 'online',
    });
    offer.currentRedemptions += 1;

    await offer.save();

    res.json({
      message: 'Offer redeemed successfully',
      redemptionCode,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to redeem offer', error: error.message });
  }
});

// Save offer
router.post('/offers/save', authenticateToken, authorizeRole('student'), verifyStudentApproval, async (req, res) => {
  try {
    const { offerId } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (!offer.savedBy.includes(req.user.id)) {
      offer.savedBy.push(req.user.id);
      await offer.save();
    }

    res.json({ message: 'Offer saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save offer', error: error.message });
  }
});

// Unsave offer
router.post('/offers/unsave', authenticateToken, authorizeRole('student'), verifyStudentApproval, async (req, res) => {
  try {
    const { offerId } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      offerId,
      { $pull: { savedBy: req.user.id } },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.json({ message: 'Offer unsaved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unsave offer', error: error.message });
  }
});

// Get saved offers
router.get('/offers/saved', authenticateToken, authorizeRole('student'), verifyStudentApproval, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const offers = await Offer.find({ savedBy: req.user.id })
      .skip(skip)
      .limit(limit)
      .populate('vendor', 'name businessName');

    const total = await Offer.countDocuments({ savedBy: req.user.id });

    res.json({
      offers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch saved offers', error: error.message });
  }
});

// Get verification status
router.get('/verification-status', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    res.json({
      isVerified: student.isVerified,
      verificationStatus: student.verificationStatus,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch verification status', error: error.message });
  }
});

// Get coupons with vendor location information
router.get('/coupons-with-location', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find({ 
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'
    })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'vendor',
        select: 'name businessName businessType city state latitude longitude location businessLogo businessAddress locality postalCode businessDescription'
      });

    const total = await Coupon.countDocuments({ 
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'
    });

    res.json({
      success: true,
      coupons,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch coupons with location', 
      error: error.message 
    });
  }
});

// Get nearby vendors (within specified radius)
// Query params: latitude, longitude, radius (in km), limit, page
router.get('/vendors-by-location', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, page = 1, limit = 10 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    const radiusInMeters = radiusKm * 1000; // Convert km to meters

    const skip = (page - 1) * limit;

    try {
      // Try geospatial query first (requires 2dsphere index)
      // Use $geoWithin instead of $near to avoid sorting requirement
      const vendors = await Vendor.find({
        location: {
          $geoWithin: {
            $centerSphere: [[lon, lat], radiusInMeters / 6371000] // radius in radians (meters / Earth radius)
          }
        },
        isActive: true,
        approvalStatus: 'approved'
      })
        .skip(skip)
        .limit(parseInt(limit));

      // Get coupons for these vendors
      const vendorIds = vendors.map(v => v._id);
      const coupons = await Coupon.find({
        vendor: { $in: vendorIds },
        status: 'active',
        isActive: true,
        approvalStatus: 'approved'
      })
        .populate({
          path: 'vendor',
          select: 'name businessName businessType city state latitude longitude location businessLogo businessAddress locality postalCode businessDescription'
        });

      const total = await Vendor.countDocuments({
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
        vendors: vendors.map(v => ({
          ...v.toObject(),
          distance: v.location && v.latitude && v.longitude ? calculateDistance(lat, lon, v.latitude, v.longitude) : null
        })),
        coupons,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      });
    } catch (geoError) {
      // Fallback: if geospatial query fails, use manual distance calculation
      console.warn('Geospatial query failed, using fallback method:', geoError.message);
      
      const vendors = await Vendor.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      })
        .skip(skip)
        .limit(parseInt(limit));

      // Filter by distance manually
      const vendorsWithDistance = vendors
        .map(v => ({
          ...v.toObject(),
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        }))
        .filter(v => parseFloat(v.distance) <= radiusKm)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      // Get coupons for these vendors
      const vendorIds = vendorsWithDistance.map(v => v._id);
      const coupons = await Coupon.find({
        vendor: { $in: vendorIds },
        status: 'active',
        isActive: true,
        approvalStatus: 'approved'
      })
        .populate({
          path: 'vendor',
          select: 'name businessName businessType city state latitude longitude location businessLogo businessAddress locality postalCode businessDescription'
        });

      const allVendorsWithDistance = await Vendor.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      });

      const totalFiltered = allVendorsWithDistance
        .map(v => ({
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        }))
        .filter(v => parseFloat(v.distance) <= radiusKm).length;

      return res.json({
        success: true,
        vendors: vendorsWithDistance,
        coupons,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: totalFiltered },
        method: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in vendors-by-location:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch vendors by location', 
      error: error.message 
    });
  }
});

// Get vendor details with location and their coupons
router.get('/vendors/:vendorId/location', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId).select(
      'name businessName businessType city state latitude longitude location businessLogo businessAddress locality postalCode businessDescription businessEmail mobileNumber website'
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get vendor's active coupons
    const coupons = await Coupon.find({
      vendor: req.params.vendorId,
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'
    });

    res.json({
      success: true,
      vendor,
      coupons
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch vendor details', 
      error: error.message 
    });
  }
});

// Update student location
router.put('/update-location', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { latitude, longitude, locality, postalCode, city, state } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const updateData = {
      latitude: lat,
      longitude: lon,
      locality,
      postalCode,
      city,
      state,
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      updatedAt: new Date()
    };

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error updating student location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// POST endpoint for updating location (alias to PUT for convenience)
router.post('/update-location', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { latitude, longitude, locality, postalCode, city, state, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const updateData = {
      latitude: lat,
      longitude: lon,
      locality,
      postalCode,
      city,
      state,
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      updatedAt: new Date()
    };

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    // Emit real-time location update via socket
    try {
      const { io } = await import('../server.js');
      if (io) {
        // Emit to admin room for tracking
        io.to('admins').emit('student:location:updated', {
          studentId: req.user.id,
          latitude: lat,
          longitude: lon,
          locality,
          city,
          state,
          accuracy,
          timestamp: new Date()
        });

        // Emit to student's own room
        io.to(`student:${req.user.id}`).emit('location:updated', {
          latitude: lat,
          longitude: lon,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('Failed to emit socket event:', err.message);
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error updating student location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Get student location
router.get('/location', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select(
      'name email latitude longitude location locality postalCode city state mobileNumber collegeName'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student location',
      error: error.message
    });
  }
});

// Find nearby vendors for student (based on student's location)
router.get('/nearby-vendors-for-claim', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    // Get student's location
    const student = await Student.findById(req.user.id);

    if (!student || !student.latitude || !student.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Student location not set. Please update your location first.'
      });
    }

    const { radius = 10, page = 1, limit = 10 } = req.query;
    const lat = student.latitude;
    const lon = student.longitude;
    const radiusKm = parseFloat(radius);
    const radiusInMeters = radiusKm * 1000;

    const skip = (page - 1) * limit;

    try {
      // Try geospatial query
      // Use $geoWithin instead of $near to avoid sorting requirement
      const vendors = await Vendor.find({
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
        .select('name businessName businessType city state latitude longitude businessLogo businessAddress locality postalCode businessDescription');

      // Get coupons for these vendors
      const vendorIds = vendors.map(v => v._id);
      const coupons = await Coupon.find({
        vendor: { $in: vendorIds },
        status: 'active',
        isActive: true,
        approvalStatus: 'approved'
      }).populate({
        path: 'vendor',
        select: 'name businessName businessType city state latitude longitude businessLogo businessAddress locality postalCode'
      });

      const total = await Vendor.countDocuments({
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
        studentLocation: {
          latitude: student.latitude,
          longitude: student.longitude,
          locality: student.locality,
          city: student.city,
          state: student.state
        },
        vendors: vendors.map(v => ({
          ...v.toObject(),
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        })),
        coupons,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
      });
    } catch (geoError) {
      console.warn('Geospatial query failed, using fallback:', geoError.message);

      // Fallback: manual distance calculation
      const vendors = await Vendor.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      })
        .skip(skip)
        .limit(parseInt(limit))
        .select('name businessName businessType city state latitude longitude businessLogo businessAddress locality postalCode businessDescription');

      const vendorsWithDistance = vendors
        .map(v => ({
          ...v.toObject(),
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        }))
        .filter(v => parseFloat(v.distance) <= radiusKm)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      const vendorIds = vendorsWithDistance.map(v => v._id);
      const coupons = await Coupon.find({
        vendor: { $in: vendorIds },
        status: 'active',
        isActive: true,
        approvalStatus: 'approved'
      }).populate({
        path: 'vendor',
        select: 'name businessName businessType city state latitude longitude businessLogo businessAddress locality postalCode'
      });

      const allVendorsWithDistance = await Vendor.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      });

      const totalFiltered = allVendorsWithDistance
        .map(v => ({
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        }))
        .filter(v => parseFloat(v.distance) <= radiusKm).length;

      return res.json({
        success: true,
        studentLocation: {
          latitude: student.latitude,
          longitude: student.longitude,
          locality: student.locality,
          city: student.city,
          state: student.state
        },
        vendors: vendorsWithDistance,
        coupons,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: totalFiltered },
        method: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in nearby-vendors-for-claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby vendors',
      error: error.message
    });
  }
});

// Get nearby vendors using student's saved location (mirrors vendor's nearby-students endpoint)
router.get('/location/nearby-vendors', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    if (!student || !student.latitude || !student.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Student location not set. Please update your location first.'
      });
    }

    const { radius = 10, page = 1, limit = 10 } = req.query;
    const lat = student.latitude;
    const lon = student.longitude;
    const radiusKm = parseFloat(radius);
    const radiusInMeters = radiusKm * 1000;

    const skip = (page - 1) * limit;

    try {
      // Try geospatial query
      // Use $geoWithin instead of $near to avoid sorting requirement
      const vendors = await Vendor.find({
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
        .select('name businessName businessType city state latitude longitude businessLogo businessAddress locality postalCode businessDescription');

      const total = await Vendor.countDocuments({
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
        studentLocation: {
          latitude: student.latitude,
          longitude: student.longitude,
          locality: student.locality,
          city: student.city,
          state: student.state
        },
        vendors: vendors.map(v => ({
          ...v.toObject(),
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
      });
    } catch (geoError) {
      console.warn('Geospatial query failed, using fallback:', geoError.message);

      // Fallback: manual distance calculation
      const vendors = await Vendor.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      })
        .skip(skip)
        .limit(parseInt(limit))
        .select('name businessName businessType city state latitude longitude businessLogo businessAddress locality postalCode businessDescription');

      const vendorsWithDistance = vendors
        .map(v => ({
          ...v.toObject(),
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        }))
        .filter(v => parseFloat(v.distance) <= radiusKm)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      const allVendorsWithDistance = await Vendor.find({
        isActive: true,
        approvalStatus: 'approved',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      });

      const totalFiltered = allVendorsWithDistance
        .map(v => ({
          distance: calculateDistance(lat, lon, v.latitude, v.longitude)
        }))
        .filter(v => parseFloat(v.distance) <= radiusKm).length;

      return res.json({
        success: true,
        studentLocation: {
          latitude: student.latitude,
          longitude: student.longitude,
          locality: student.locality,
          city: student.city,
          state: student.state
        },
        vendors: vendorsWithDistance,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: totalFiltered },
        method: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in nearby-vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby vendors',
      error: error.message
    });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
// Update student location in real-time
router.post('/update-location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, locality } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      {
        latitude,
        longitude,
        locality: locality || '',
        location: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
        },
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    // Broadcast location update to admins
    req.io.to('admins').emit('student:location-updated', {
      studentId: req.user.id,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        latitude: student.latitude,
        longitude: student.longitude,
        locality: student.locality,
      },
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      student,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
});

// Get nearby students (within X km)
router.get('/nearby', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { maxDistance = 5 } = req.query; // distance in km
    const student = await Student.findById(req.user.id);

    if (!student || !student.latitude || !student.longitude) {
      return res.status(400).json({ message: 'Student location not found' });
    }

    const nearbyStudents = await Student.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [student.longitude, student.latitude],
          },
          $maxDistance: maxDistance * 1000, // Convert km to meters
        },
      },
      _id: { $ne: req.user.id },
    }).select('name email latitude longitude locality');

    res.json({
      success: true,
      students: nearbyStudents,
      count: nearbyStudents.length,
    });
  } catch (error) {
    console.error('Error fetching nearby students:', error);
    res.status(500).json({ message: 'Failed to fetch nearby students', error: error.message });
  }
});

// Get all student locations (admin only)
router.get('/all-locations', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const students = await Student.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
    }).select('_id name email latitude longitude locality city state').lean();

    res.json({
      success: true,
      students,
      count: students.length,
    });
  } catch (error) {
    console.error('Error fetching student locations:', error);
    res.status(500).json({ message: 'Failed to fetch student locations', error: error.message });
  }
});

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

export default router;
