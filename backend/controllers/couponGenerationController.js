import Coupon from '../models/Coupon.js';
import Offer from '../models/Offer.js';
import Student from '../models/Student.js';
import Vendor from '../models/Vendor.js';
import { generateCouponCode } from '../utils/helpers.js';
import { io } from '../server.js';

/**
 * Get all vendors with their approved coupons
 * - Students see only approved, active vendors with approved coupons
 * - Admins see all vendors with all coupons (with status indicators)
 * - Vendors see all approved vendors plus their own profile
 */
export const getAllVendors = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10, sort = 'newest' } = req.query;
    
    // Determine user role: admin, vendor, or student (unauthenticated)
    const userRole = req.user?.role || 'student';
    const userId = req.user?.id;

    let vendorFilter = {};

    // Role-based filtering
    if (userRole === 'admin') {
      // Admins see all vendors (no approval filter)
      // Empty filter means all vendors
    } else if (userRole === 'vendor') {
      // Vendors see all approved vendors (for comparison) plus their own
      vendorFilter.isActive = true;
      // They can also see their own unverified profile
    } else {
      // Students see only approved, active vendors
      vendorFilter.approvalStatus = 'approved';
      vendorFilter.isActive = true;
    }

    if (search) {
      vendorFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { businessDescription: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      vendorFilter.businessType = category;
    }

    const skip = (page - 1) * limit;

    // Determine sort order
    let sortOptions = { createdAt: -1 }; // default: newest
    if (sort === 'rating') {
      sortOptions = { rating: -1 };
    } else if (sort === 'offers') {
      sortOptions = { _id: 1 }; // Will be sorted by offer count later
    }

    const vendors = await Vendor.find(vendorFilter)
      .select('_id name businessName businessLogo businessDescription businessType city locality email rating createdAt approvalStatus isActive verificationStatus')
      .populate({
        path: 'coupons',
        match: userRole === 'admin' 
          ? {} // Admins see all coupons
          : { 
              status: 'active',
              approvalStatus: 'approved',
              isActive: true
            },
        select: '_id code discount discountType description category isActive status approvalStatus startDate endDate',
        options: { limit: 5 } // Show top 5 coupons in list view
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort(sortOptions)
      .lean();

    const total = await Vendor.countDocuments(vendorFilter);

    // Get coupon counts for each vendor (with all active coupons, not just top 5)
    const vendorsWithCoupons = await Promise.all(
      vendors.map(async (vendor) => {
        // Filter based on role
        let couponQuery = {
          vendor: vendor._id,
        };

        if (userRole !== 'admin') {
          couponQuery.status = 'active';
          couponQuery.approvalStatus = 'approved';
          couponQuery.isActive = true;
        }

        // Get total count of coupons for this vendor
        const totalActiveCoupons = await Coupon.countDocuments(couponQuery);

        // Format coupons for display
        const formattedCoupons = (vendor.coupons || []).map(coupon => ({
          _id: coupon._id,
          code: coupon.code,
          discount: coupon.discount,
          discountType: coupon.discountType,
          discount_display: coupon.discountType === 'percentage' ? `${coupon.discount}%` : `₹${coupon.discount}`,
          description: coupon.description,
          category: coupon.category,
          status: coupon.status,
          approvalStatus: coupon.approvalStatus,
        }));

        // Get average discount from coupons
        const avgDiscount = formattedCoupons.length > 0
          ? (formattedCoupons.reduce((sum, c) => sum + c.discount, 0) / formattedCoupons.length).toFixed(1)
          : 0;

        const baseVendor = {
          _id: vendor._id,
          name: vendor.name,
          businessName: vendor.businessName,
          businessLogo: vendor.businessLogo,
          businessDescription: vendor.businessDescription,
          businessType: vendor.businessType,
          city: vendor.city,
          locality: vendor.locality,
          email: vendor.email,
          rating: vendor.rating || 0,
          availableOffers: totalActiveCoupons,
          avgDiscount,
          bestDiscount: formattedCoupons.length > 0 ? Math.max(...formattedCoupons.map(c => c.discount)) : 0,
          offers: formattedCoupons,
        };

        // Add admin-specific fields
        if (userRole === 'admin') {
          baseVendor.approvalStatus = vendor.approvalStatus;
          baseVendor.verificationStatus = vendor.verificationStatus;
          baseVendor.isActive = vendor.isActive;
          baseVendor.createdAt = vendor.createdAt;
        }

        // Add vendor-specific fields if viewing as a vendor
        if (userRole === 'vendor' && vendor._id.toString() === userId) {
          baseVendor.isOwnProfile = true;
        }

        return baseVendor;
      })
    );

    // Sort by offers count if requested
    if (sort === 'offers') {
      vendorsWithCoupons.sort((a, b) => b.availableOffers - a.availableOffers);
    }

    // If vendor is viewing and wants to see their own first
    let responseVendors = vendorsWithCoupons;
    if (userRole === 'vendor' && userId) {
      const ownVendor = responseVendors.find(v => v._id.toString() === userId);
      if (ownVendor) {
        responseVendors = [ownVendor, ...responseVendors.filter(v => v._id.toString() !== userId)];
      }
    }

    res.json({
      success: true,
      vendors: responseVendors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      filters: {
        available: true,
        category: category || 'all',
        sort: sort || 'newest',
      },
      userRole,
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message,
    });
  }
};


/**
 * Get vendor details with all their approved coupons
 * Returns comprehensive vendor profile with all available offers/coupons for students
 */
export const getVendorDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { category, page = 1, limit = 20 } = req.query;

    // Get vendor by ID with full approval status check
    const vendor = await Vendor.findById(vendorId)
      .select('_id name businessName businessLogo businessDescription businessType city locality email contactNumber approvalStatus isActive')
      .lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.approvalStatus !== 'approved' || !vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This vendor is not currently available',
      });
    }

    const skip = (page - 1) * limit;
    let couponFilter = {
      vendor: vendorId,
      status: 'active',
      approvalStatus: 'approved',
      isActive: true,
    };

    if (category) {
      couponFilter.category = category;
    }

    // Get all approved active coupons from this vendor
    const coupons = await Coupon.find(couponFilter)
      .select('_id code description category discount discountType startDate endDate maxRedemptions currentRedemptions createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const totalCoupons = await Coupon.countDocuments(couponFilter);

    // Get vendor statistics
    const totalActiveCoupons = await Coupon.countDocuments({
      vendor: vendorId,
      status: 'active',
      approvalStatus: 'approved',
      isActive: true,
    });

    const totalStudentCoupons = await Coupon.countDocuments({
      vendor: vendorId,
      couponType: 'student-generated',
    });

    const totalRedemptions = await Coupon.countDocuments({
      vendor: vendorId,
      status: 'used',
    });

    // Format coupons with additional details
    const formattedCoupons = coupons.map(coupon => ({
      _id: coupon._id,
      code: coupon.code,
      description: coupon.description,
      category: coupon.category,
      discount: coupon.discount,
      discountType: coupon.discountType,
      discount_value: coupon.discountType === 'percentage' ? `${coupon.discount}%` : `₹${coupon.discount}`,
      maxRedemptions: coupon.maxRedemptions,
      currentRedemptions: coupon.currentRedemptions,
      redemptionProgress: coupon.maxRedemptions ? Math.round((coupon.currentRedemptions / coupon.maxRedemptions) * 100) : null,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isExpired: coupon.endDate && new Date(coupon.endDate) < new Date(),
    }));

    res.json({
      success: true,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName,
        businessLogo: vendor.businessLogo,
        businessDescription: vendor.businessDescription,
        businessType: vendor.businessType,
        city: vendor.city,
        locality: vendor.locality,
        email: vendor.email,
        contactNumber: vendor.contactNumber,
        stats: {
          totalActiveCoupons: totalActiveCoupons,
          totalStudentCoupons,
          totalRedemptions,
          averageDiscount: formattedCoupons.length > 0 
            ? (formattedCoupons.reduce((sum, c) => sum + c.discount, 0) / formattedCoupons.length).toFixed(1)
            : 0,
        },
      },
      coupons: formattedCoupons,
      pagination: {
        total: totalCoupons,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalOffers / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor details',
      error: error.message,
    });
  }
};

/**
 * Generate a coupon code when student pays vendor directly
 * Creates a student-generated coupon entry
 */
export const generateStudentCoupon = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { vendorId, amountPaid, offerId, discount, discountType, description } = req.body;

    // Validate input
    if (!vendorId || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: 'vendor ID and amount paid are required',
      });
    }

    if (amountPaid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount paid must be greater than 0',
      });
    }

    // Verify student exists and is approved
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Verify vendor exists and is approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.approvalStatus !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or not approved',
      });
    }

    // Check if an offer is referenced
    let offerDetails = {};
    if (offerId) {
      const offer = await Coupon.findById(offerId)
        .select('discount discountType description originalPrice discountedPrice')
        .lean();
      if (offer) {
        offerDetails = {
          description: offer.description,
          discount: offer.discount,
          discountType: offer.discountType,
          originalPrice: offer.originalPrice,
          discountedPrice: offer.discountedPrice,
        };
      }
    } else if (discount !== undefined && discountType) {
      // Use custom discount provided by student
      offerDetails = {
        discount: parseFloat(discount),
        discountType,
        description: description || undefined,
      };
    }

    // Generate unique coupon code
    const couponCode = generateCouponCode();

    // Calculate expiry date (90 days from now)
    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setDate(expiryDate.getDate() + 90);

    // Create coupon
    const coupon = new Coupon({
      code: couponCode,
      vendor: vendorId,
      student: studentId,
      amountPaid,
      couponType: 'student-generated',
      status: 'active',
      approvalStatus: 'approved', // Auto-approve student-generated coupons
      issueDate,
      expiryDate,
      isActive: true,
      ...offerDetails,
    });

    await coupon.save();

    // Add coupon to vendor's coupons array
    await Vendor.findByIdAndUpdate(
      vendorId,
      { $addToSet: { coupons: coupon._id } },
      { new: true }
    );

    // Emit real-time update to all connected clients (broadcast)
    try {
      if (io) {
        const couponData = {
          _id: coupon._id,
          code: coupon.code,
          vendorId: coupon.vendor,
          vendorName: vendor.businessName,
          studentId: studentId,
          amountPaid: coupon.amountPaid,
          issueDate: coupon.issueDate,
          expiryDate: coupon.expiryDate,
          status: coupon.status,
          discount: coupon.discount,
          discountType: coupon.discountType,
          description: coupon.description,
          timestamp: new Date(),
        };

        // Broadcast to all connected clients
        io.emit('coupon:created', couponData);
        console.log('📡 Broadcasted coupon:created to all clients');

        // Send to specific vendor room
        io.to(`vendor:${vendorId}`).emit('vendor:coupon:created', {
          coupon: couponData,
          action: 'created',
          timestamp: new Date(),
        });
        console.log(`📡 Emitted vendor:coupon:created to vendor:${vendorId}`);

        // Send to specific student room
        io.to(`student:${studentId}`).emit('student:coupon:created', {
          coupon: couponData,
          action: 'created',
          timestamp: new Date(),
        });
        console.log(`📡 Emitted student:coupon:created to student:${studentId}`);
      }
    } catch (error) {
      console.warn('Failed to emit Socket.io event:', error.message);
    }

    res.json({
      success: true,
      message: 'Coupon generated successfully',
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        vendorId: coupon.vendor,
        vendorName: vendor.businessName,
        amountPaid: coupon.amountPaid,
        issueDate: coupon.issueDate,
        expiryDate: coupon.expiryDate,
        status: coupon.status,
        ...offerDetails,
      },
    });
  } catch (error) {
    console.error('Error generating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate coupon',
      error: error.message,
    });
  }
};

/**
 * Get all coupons for a student
 */
export const getStudentCoupons = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {
      student: studentId,
      couponType: 'student-generated',
    };

    if (status && ['active', 'used', 'expired'].includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find(filter)
      .populate('vendor', 'name businessName businessLogo city locality')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ issueDate: -1 });

    const total = await Coupon.countDocuments(filter);

    // Format coupon data for frontend
    const formattedCoupons = coupons.map((coupon) => ({
      _id: coupon._id,
      code: coupon.code,
      vendorName: coupon.vendor?.businessName || coupon.vendor?.name,
      vendorLogo: coupon.vendor?.businessLogo,
      vendorCity: coupon.vendor?.city,
      amountPaid: coupon.amountPaid,
      issueDate: coupon.issueDate,
      expiryDate: coupon.expiryDate,
      status: coupon.status,
      daysRemaining: Math.ceil((coupon.expiryDate - new Date()) / (1000 * 60 * 60 * 24)),
      description: coupon.description,
    }));

    res.json({
      success: true,
      coupons: formattedCoupons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching student coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
      error: error.message,
    });
  }
};

/**
 * Get a specific coupon by ID
 */
export const getCouponById = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId)
      .populate('vendor', 'name businessName businessLogo city locality')
      .lean();

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
    console.error('Error fetching coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon',
      error: error.message,
    });
  }
};

/**
 * Get vendor-coupon connection for students
 * Shows all vendors a student has purchased coupons from or can purchase from
 * Includes student's coupon history with each vendor
 */
export const getStudentVendorConnections = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    // Get all coupons for this student
    const studentCoupons = await Coupon.find({
      student: studentId,
      ...filter,
    })
      .populate('vendor', '_id name businessName businessLogo city locality email')
      .sort({ issueDate: -1 })
      .lean();

    // Group coupons by vendor
    const vendorMap = new Map();
    studentCoupons.forEach(coupon => {
      if (coupon.vendor) {
        const vendorId = coupon.vendor._id.toString();
        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendor: coupon.vendor,
            coupons: [],
            totalCoupons: 0,
            activeCoupons: 0,
            usedCoupons: 0,
            expiredCoupons: 0,
            totalSpent: 0,
          });
        }
        const vendorData = vendorMap.get(vendorId);
        vendorData.coupons.push({
          _id: coupon._id,
          code: coupon.code,
          amountPaid: coupon.amountPaid || 0,
          status: coupon.status,
          issueDate: coupon.issueDate,
          expiryDate: coupon.expiryDate,
          description: coupon.description,
        });
        vendorData.totalCoupons += 1;
        vendorData.totalSpent += coupon.amountPaid || 0;

        if (coupon.status === 'active') vendorData.activeCoupons += 1;
        else if (coupon.status === 'used') vendorData.usedCoupons += 1;
        else if (coupon.status === 'expired') vendorData.expiredCoupons += 1;
      }
    });

    // Convert map to array and paginate
    const vendorConnections = Array.from(vendorMap.values());
    const paginatedConnections = vendorConnections.slice(skip, skip + parseInt(limit));

    // Format response
    const formattedConnections = paginatedConnections.map(vc => ({
      vendor: {
        _id: vc.vendor._id,
        name: vc.vendor.name,
        businessName: vc.vendor.businessName,
        businessLogo: vc.vendor.businessLogo,
        city: vc.vendor.city,
        locality: vc.vendor.locality,
        email: vc.vendor.email,
      },
      stats: {
        totalCoupons: vc.totalCoupons,
        activeCoupons: vc.activeCoupons,
        usedCoupons: vc.usedCoupons,
        expiredCoupons: vc.expiredCoupons,
        totalSpent: vc.totalSpent,
      },
      recentCoupons: vc.coupons.slice(0, 5), // Show recent 5 coupons
      allCouponsCount: vc.coupons.length,
    }));

    res.json({
      success: true,
      vendors: formattedConnections,
      pagination: {
        total: vendorConnections.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(vendorConnections.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor connections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor connections',
      error: error.message,
    });
  }
};

/**
 * Get detailed coupon history for specific student-vendor pair
 */
export const getStudentVendorCouponHistory = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { vendorId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Verify student exists
    const student = await Student.findById(studentId).select('_id name email');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId).select('_id name businessName businessLogo businessDescription city locality email approvalStatus');
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const skip = (page - 1) * limit;
    let filter = {
      student: studentId,
      vendor: vendorId,
    };

    if (status) {
      filter.status = status;
    }

    // Get coupons between this student and vendor
    const coupons = await Coupon.find(filter)
      .select('code discount discountType description amountPaid status issueDate expiryDate createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ issueDate: -1 })
      .lean();

    const total = await Coupon.countDocuments(filter);

    // Calculate stats
    const allCoupons = await Coupon.find({
      student: studentId,
      vendor: vendorId,
    }).lean();

    const stats = {
      totalCoupons: allCoupons.length,
      activeCoupons: allCoupons.filter(c => c.status === 'active').length,
      usedCoupons: allCoupons.filter(c => c.status === 'used').length,
      expiredCoupons: allCoupons.filter(c => c.status === 'expired').length,
      totalAmountSpent: allCoupons.reduce((sum, c) => sum + (c.amountPaid || 0), 0),
    };

    res.json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName,
        businessLogo: vendor.businessLogo,
        businessDescription: vendor.businessDescription,
        city: vendor.city,
        locality: vendor.locality,
        email: vendor.email,
      },
      stats,
      coupons: coupons.map(c => ({
        _id: c._id,
        code: c.code,
        discount: c.discount,
        discountType: c.discountType,
        description: c.description,
        amountPaid: c.amountPaid,
        status: c.status,
        issueDate: c.issueDate,
        expiryDate: c.expiryDate,
        daysRemaining: c.expiryDate ? Math.ceil((new Date(c.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor-student coupon history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon history',
      error: error.message,
    });
  }
};
