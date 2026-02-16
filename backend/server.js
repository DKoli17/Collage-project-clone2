import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: `${__dirname}/.env` });

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('\n❌ CRITICAL ERROR: JWT_SECRET environment variable is not set!');
  console.error('Please add JWT_SECRET to your .env file.');
  process.exit(1);
}

if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
  console.warn('\n⚠️  WARNING: MongoDB connection string not found in environment variables');
  console.warn('Expected: MONGODB_URI or MONGO_URI');
}

// Import routes
import authRoutes from './routes/auth.js';
import loginRoutes from './routes/login.js';
import offersRoutes from './routes/offers.js';
import couponsRoutes from './routes/coupons.js';
import couponPurchaseRoutes from './routes/coupon-purchase.js';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import vendorRoutes from './routes/vendor.js';
import verificationRoutes from './routes/verification.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware to attach io instance to requests
// NOTE: Do NOT extract userId/userRole from JWT without verification!
// Let the authenticateToken middleware handle proper JWT verification
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Track active admin connections and rooms
const adminConnections = new Map();
const vendorConnections = new Map();

io.on('connection', (socket) => {
  console.log('📡 New socket connection:', socket.id);

  // ========== ADMIN CONNECTIONS ==========
  socket.on('admin:join', (adminId) => {
    socket.join(`admin:${adminId}`);
    socket.join('admins');
    adminConnections.set(socket.id, adminId);
    console.log(`✅ Admin ${adminId} joined real-time updates`);
    socket.emit('connection:status', { connected: true, message: 'Connected to real-time updates', userType: 'admin' });
    // Notify other admins
    socket.broadcast.to('admins').emit('admin:joined', { adminId, timestamp: new Date() });
  });

  // Broadcast student list updates to all admins
  socket.on('admin:request-students', async (adminId) => {
    try {
      const { default: Student } = await import('./models/Student.js');
      const students = await Student.find().select('-password').lean();
      io.to('admins').emit('students:updated', { students, timestamp: new Date() });
      console.log('📤 Broadcasting student update to all admins');
    } catch (error) {
      console.error('Error fetching students for broadcast:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch students' });
    }
  });



  // Request offers update
  socket.on('admin:request-offers', async (adminId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      const offers = await Offer.find().lean();
      io.to('admins').emit('offers:updated', { offers, timestamp: new Date() });
      console.log('📤 Broadcasting offers update to all admins');
    } catch (error) {
      console.error('Error fetching offers for broadcast:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch offers' });
    }
  });

  // ========== VENDOR CONNECTIONS ==========
  socket.on('vendor:join', (vendorId) => {
    socket.join(`vendor:${vendorId}`);
    socket.join('vendors');
    vendorConnections.set(socket.id, vendorId);
    console.log(`✅ Vendor ${vendorId} joined real-time updates`);
    socket.emit('connection:status', { connected: true, message: 'Connected to real-time updates', userType: 'vendor' });
    socket.broadcast.to('vendors').emit('vendor:joined', { vendorId, timestamp: new Date() });
  });

  // ========== STUDENT CONNECTIONS ==========
  socket.on('student:join', (studentId) => {
    socket.join(`student:${studentId}`);
    socket.join('students');
    console.log(`✅ Student ${studentId} joined real-time updates`);
    socket.emit('connection:status', { connected: true, message: 'Connected to real-time updates', userType: 'student' });
  });

  // ========== STUDENT LOCATION TRACKING ==========
  socket.on('student:send-location', async (locationData) => {
    try {
      const { studentId, latitude, longitude, locality } = locationData;
      
      if (!studentId || latitude === undefined || longitude === undefined) {
        socket.emit('error:location', { message: 'Invalid location data' });
        return;
      }

      const { default: Student } = await import('./models/Student.js');
      
      // Update student location in database
      const student = await Student.findByIdAndUpdate(
        studentId,
        {
          latitude,
          longitude,
          locality: locality || '',
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-password');

      if (student) {
        // Broadcast to admins
        io.to('admins').emit('student:location-updated', {
          studentId: student._id,
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            latitude: student.latitude,
            longitude: student.longitude,
            locality: student.locality,
            city: student.city,
            state: student.state,
          },
          timestamp: new Date(),
        });

        // Acknowledge to student
        socket.emit('location:acknowledged', { 
          success: true, 
          message: 'Location received',
          data: { latitude, longitude, locality }
        });

        console.log(`📍 Location updated for student ${studentId}: ${latitude}, ${longitude}`);
      }
    } catch (error) {
      console.error('Error processing student location:', error);
      socket.emit('error:location', { message: 'Failed to update location' });
    }
  });

  // Request all student locations (admin)
  socket.on('admin:request-locations', async (adminId) => {
    try {
      const { default: Student } = await import('./models/Student.js');
      const students = await Student.find({
        latitude: { $ne: null },
        longitude: { $ne: null },
      }).select('_id name email latitude longitude locality city state').lean();

      socket.emit('students:locations', {
        students,
        count: students.length,
        timestamp: new Date(),
      });
      console.log(`📤 Sent student locations to admin ${adminId}`);
    } catch (error) {
      console.error('Error fetching student locations:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch locations' });
    }
  });

  // Vendor requesting their own offers
  socket.on('vendor:request-offers', async (vendorId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      const offers = await Offer.find({ vendor: vendorId }).lean();
      socket.emit('vendor:offers', { offers, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} their offers`);
    } catch (error) {
      console.error('Error fetching vendor offers:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch offers' });
    }
  });

  // ========== VENDOR PRODUCTS ==========
  socket.on('vendor:request-products', async (vendorId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      const products = await Offer.find({ vendor: vendorId }).lean();
      socket.emit('vendor:products:loaded', { products, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} their products`);
    } catch (error) {
      console.error('Error fetching vendor products:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch products' });
    }
  });

  // ========== VENDOR ORDERS ==========
  socket.on('vendor:request-orders', async (vendorId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      // Get all offers from this vendor
      const offers = await Offer.find({ vendor: vendorId }).lean();
      const offerId = offers.map(o => o._id);
      
      // In a real app, you'd have an Order model
      // For now, we're tracking through offers
      const orders = offers.map(offer => ({
        offerId: offer._id,
        title: offer.title,
        redemptions: offer.currentRedemptions || 0,
        maxRedemptions: offer.maxRedemptions || 0,
        createdAt: offer.createdAt,
        status: offer.isActive ? 'active' : 'inactive'
      }));
      
      socket.emit('vendor:orders:loaded', { orders, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} their orders`);
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch orders' });
    }
  });

  // ========== VENDOR ANALYTICS ==========
  socket.on('vendor:request-analytics', async (vendorId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      const offers = await Offer.find({ vendor: vendorId }).lean();
      
      const totalOffers = offers.length;
      const activeOffers = offers.filter(o => o.isActive).length;
      const totalRedemptions = offers.reduce((sum, o) => sum + (o.currentRedemptions || 0), 0);
      const totalDiscount = offers.reduce((sum, o) => sum + (o.discountValue || 0) * (o.currentRedemptions || 0), 0);
      
      const analytics = {
        totalOffers,
        activeOffers,
        totalRedemptions,
        totalDiscount,
        averageDiscount: totalOffers > 0 ? totalDiscount / totalRedemptions : 0,
        offers: offers.map(o => ({
          _id: o._id,
          title: o.title,
          redemptions: o.currentRedemptions || 0,
          discount: o.discountValue || 0,
          isActive: o.isActive
        }))
      };
      
      socket.emit('vendor:analytics:loaded', { analytics, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} their analytics`);
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch analytics' });
    }
  });

  // ========== VENDOR COUPON ANALYTICS ==========
  socket.on('vendor:request-coupons-analytics', async (vendorId) => {
    try {
      const { default: Coupon } = await import('./models/Coupon.js');
      
      const coupons = await Coupon.find({ vendor: vendorId })
        .populate('redeemedBy.student', 'name email')
        .lean();
      
      const totalCoupons = coupons.length;
      const activeCoupons = coupons.filter(c => c.isActive && c.approvalStatus === 'approved').length;
      const totalCouponClaims = coupons.reduce((sum, c) => sum + (c.currentRedemptions || 0), 0);
      const couponsData = coupons.map(c => ({
        _id: c._id,
        code: c.code,
        description: c.description,
        discount: c.discount,
        discountType: c.discountType,
        isActive: c.isActive,
        approvalStatus: c.approvalStatus,
        currentRedemptions: c.currentRedemptions || 0,
        maxRedemptions: c.maxRedemptions,
        redemptionPercentage: c.maxRedemptions 
          ? ((c.currentRedemptions / c.maxRedemptions) * 100).toFixed(2)
          : 'Unlimited',
        totalStudentsClaimedBy: c.redeemedBy ? c.redeemedBy.length : 0,
        createdAt: c.createdAt,
        startDate: c.startDate,
        endDate: c.endDate
      }));

      const couponsAnalytics = {
        totalCoupons,
        activeCoupons,
        totalCouponClaims,
        coupons: couponsData.sort((a, b) => b.currentRedemptions - a.currentRedemptions)
      };
      
      socket.emit('vendor:coupons:analytics:loaded', { couponsAnalytics, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} their coupon analytics`);
    } catch (error) {
      console.error('Error fetching vendor coupon analytics:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch coupon analytics' });
    }
  });

  // ========== VENDOR DISCOUNTS/OFFERS ==========
  socket.on('vendor:request-discounts', async (vendorId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      const discounts = await Offer.find({ vendor: vendorId }).lean();
      socket.emit('vendor:discounts:loaded', { discounts, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} their discounts`);
    } catch (error) {
      console.error('Error fetching vendor discounts:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch discounts' });
    }
  });

  // ========== VENDOR NOTIFICATIONS ==========
  socket.on('vendor:request-notifications', async (vendorId) => {
    try {
      // Broadcast vendor-specific notifications
      socket.emit('vendor:notifications:loaded', { 
        notifications: [
          { id: 1, type: 'offer', message: 'Your offer was approved', timestamp: new Date(), read: false },
          { id: 2, type: 'order', message: 'New offer redemption', timestamp: new Date(), read: false }
        ], 
        timestamp: new Date() 
      });
      console.log(`📤 Sending vendor ${vendorId} their notifications`);
    } catch (error) {
      console.error('Error fetching vendor notifications:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch notifications' });
    }
  });

  // ========== VENDOR VERIFICATIONS ==========
  socket.on('vendor:request-verifications', async (vendorId) => {
    try {
      const { default: VerificationDocument } = await import('./models/VerificationDocument.js');
      const { default: Student } = await import('./models/Student.js');
      
      // Get pending verification documents
      const verificationDocuments = await VerificationDocument.find({ status: 'pending' })
        .populate({
          path: 'user',
          select: 'name email university verificationStatus',
          model: 'Student',
          match: { verificationStatus: 'pending' }
        })
        .lean();

      const verifications = verificationDocuments
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
        }))
        .slice(0, 5); // Limit to 5 for overview

      socket.emit('vendor:verifications:loaded', { verifications, timestamp: new Date() });
      console.log(`📤 Sending vendor ${vendorId} pending verifications`);
    } catch (error) {
      console.error('Error fetching vendor verifications:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch verifications' });
    }
  });

  // ========== VENDOR REVENUE ==========
  socket.on('vendor:request-revenue', async (vendorId) => {
    try {
      const { default: Vendor } = await import('./models/Vendor.js');
      const { default: CouponPurchase } = await import('./models/CouponPurchase.js');
      
      // Fetch vendor with revenue data
      const vendor = await Vendor.findById(vendorId).select(
        'totalRevenue accountBalance totalCouponsAccepted totalCouponsRedeemed totalCouponsPending revenueHistory'
      ).lean();

      if (!vendor) {
        socket.emit('error:broadcast', { message: 'Vendor not found' });
        return;
      }

      // Get recent transactions (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentTransactions = await CouponPurchase.aggregate([
        {
          $match: {
            vendorId: mongoose.Types.ObjectId(vendorId),
            paidAt: { $gte: oneDayAgo },
            paymentStatus: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            totalRecentRevenue: { $sum: '$platformSellingPrice' },
            totalRecentCoupons: { $sum: 1 },
          },
        },
      ]);

      const revenueData = {
        totalRevenue: vendor.totalRevenue || 0,
        accountBalance: vendor.accountBalance || 0,
        recentRevenue24h: recentTransactions[0]?.totalRecentRevenue || 0,
        recentCoupons24h: recentTransactions[0]?.totalRecentCoupons || 0,
        statistics: {
          couponsAccepted: vendor.totalCouponsAccepted || 0,
          couponsRedeemed: vendor.totalCouponsRedeemed || 0,
          couponsPending: vendor.totalCouponsPending || 0,
        },
        timestamp: new Date(),
      };

      socket.emit('vendor:revenue:loaded', revenueData);
      console.log(`📤 Sending vendor ${vendorId} revenue data`);
    } catch (error) {
      console.error('Error fetching vendor revenue:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch revenue data' });
    }
  });

  // ========== BROADCAST EVENTS ==========
  // When admin approves a vendor offer, broadcast to that vendor
  socket.on('vendor:broadcast:offer-approved', (data) => {
    const { vendorId, offerId, offerTitle } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:notification:offer-approved', {
      offerId,
      offerTitle,
      message: `Your offer "${offerTitle}" has been approved`,
      timestamp: new Date()
    });
    console.log(`📢 Notifying vendor ${vendorId} about approved offer`);
  });

  socket.on('vendor:broadcast:offer-rejected', (data) => {
    const { vendorId, offerId, offerTitle, reason } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:notification:offer-rejected', {
      offerId,
      offerTitle,
      reason,
      message: `Your offer "${offerTitle}" has been rejected`,
      timestamp: new Date()
    });
    console.log(`📢 Notifying vendor ${vendorId} about rejected offer`);
  });

  socket.on('vendor:broadcast:new-redemption', (data) => {
    const { vendorId, offerId, offerTitle, studentName } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:notification:new-redemption', {
      offerId,
      offerTitle,
      studentName,
      message: `${studentName} redeemed your offer: ${offerTitle}`,
      timestamp: new Date()
    });
    console.log(`📢 Notifying vendor ${vendorId} about new redemption`);
  });

  socket.on('vendor:broadcast:product-updated', (data) => {
    const { vendorId, productName, action } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:notification:product-updated', {
      productName,
      action,
      message: `Product "${productName}" was ${action}`,
      timestamp: new Date()
    });
    console.log(`📢 Notifying vendor ${vendorId} about product update`);
  });

  // ========== VENDOR-ADMIN REAL-TIME COMMUNICATION ==========
  
  // Admin requests all vendors list with real-time updates
  socket.on('admin:request-vendors', async (adminId) => {
    try {
      const { default: Vendor } = await import('./models/Vendor.js');
      const vendors = await Vendor.find()
        .select('-password')
        .lean();
      
      const vendorStats = {
        total: vendors.length,
        approved: vendors.filter(v => v.approvalStatus === 'approved').length,
        pending: vendors.filter(v => v.approvalStatus === 'pending').length,
        rejected: vendors.filter(v => v.approvalStatus === 'rejected').length,
        verified: vendors.filter(v => v.verificationStatus === 'verified').length,
        suspended: vendors.filter(v => v.isSuspended).length,
      };

      io.to(`admin:${adminId}`).emit('admin:vendors:loaded', {
        vendors,
        stats: vendorStats,
        timestamp: new Date()
      });
      console.log(`📤 Sending admin ${adminId} vendors list with ${vendors.length} vendors`);
    } catch (error) {
      console.error('Error fetching vendors for admin:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch vendors' });
    }
  });

  // Vendor notification when admin approves/rejects
  socket.on('admin:vendor-approval-changed', (data) => {
    const { vendorId, vendorName, status, remarks } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:approval:updated', {
      status,
      remarks,
      message: status === 'approved' 
        ? '✅ Your vendor account has been approved!' 
        : '❌ Your vendor account request has been rejected.',
      timestamp: new Date()
    });
    
    // Also notify all admins about this action
    io.to('admins').emit('admin:vendor-approval:updated', {
      vendorId,
      vendorName,
      status,
      timestamp: new Date()
    });
    
    console.log(`📢 Vendor ${vendorId} approval status changed to ${status}`);
  });

  // Vendor notification when admin suspends/activates
  socket.on('admin:vendor-suspension-changed', (data) => {
    const { vendorId, vendorName, suspended, reason } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:suspension:updated', {
      suspended,
      reason,
      message: suspended 
        ? '⛔ Your vendor account has been suspended.' 
        : '✅ Your vendor account has been reactivated.',
      timestamp: new Date()
    });
    
    // Notify all admins
    io.to('admins').emit('admin:vendor-suspension:updated', {
      vendorId,
      vendorName,
      suspended,
      timestamp: new Date()
    });
    
    console.log(`📢 Vendor ${vendorId} suspension status changed to ${suspended}`);
  });

  // Vendor notification when admin verifies documents
  socket.on('admin:vendor-verification-changed', (data) => {
    const { vendorId, vendorName, verificationStatus, remarks } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:verification:updated', {
      verificationStatus,
      remarks,
      message: verificationStatus === 'verified'
        ? '✅ Your documents have been verified!'
        : '⚠️ Your documents verification status has been updated.',
      timestamp: new Date()
    });
    
    // Notify all admins
    io.to('admins').emit('admin:vendor-verification:updated', {
      vendorId,
      vendorName,
      verificationStatus,
      timestamp: new Date()
    });
    
    console.log(`📢 Vendor ${vendorId} verification status changed to ${verificationStatus}`);
  });

  // Admin sends message to specific vendor
  socket.on('admin:send-message-to-vendor', (data) => {
    const { vendorId, vendorName, adminName, adminId, message, messageType = 'info' } = data;
    io.to(`vendor:${vendorId}`).emit('vendor:admin-message', {
      adminId,
      adminName,
      message,
      messageType, // 'info', 'warning', 'success', 'error'
      timestamp: new Date()
    });
    
    // Log for admin
    socket.emit('admin:message-sent', {
      vendorId,
      vendorName,
      message,
      timestamp: new Date()
    });
    
    console.log(`📨 Message sent from admin ${adminId} to vendor ${vendorId}: ${message}`);
  });

  // Vendor sends message to admins
  socket.on('vendor:send-message-to-admins', (data) => {
    const { vendorId, vendorName, message, messageType = 'info' } = data;
    io.to('admins').emit('admin:vendor-message', {
      vendorId,
      vendorName,
      message,
      messageType,
      timestamp: new Date()
    });
    
    socket.emit('vendor:message-sent', {
      message,
      timestamp: new Date()
    });
    
    console.log(`📨 Message sent from vendor ${vendorId} to admins: ${message}`);
  });

  // Vendor requests list of admin actions/approvals
  socket.on('vendor:request-admin-actions', async (vendorId) => {
    try {
      const { default: Vendor } = await import('./models/Vendor.js');
      const vendor = await Vendor.findById(vendorId)
        .select('approvalStatus verificationStatus isSuspended suspensionReason approvalRemarks approvedAt createdAt')
        .lean();
      
      if (vendor) {
        socket.emit('vendor:admin-actions:loaded', {
          approvalStatus: vendor.approvalStatus,
          verificationStatus: vendor.verificationStatus,
          suspended: vendor.isSuspended,
          suspensionReason: vendor.suspensionReason,
          approvalRemarks: vendor.approvalRemarks,
          approvedAt: vendor.approvedAt,
          createdAt: vendor.createdAt,
          timestamp: new Date()
        });
      }
      console.log(`📤 Sent admin actions info to vendor ${vendorId}`);
    } catch (error) {
      console.error('Error fetching admin actions:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch admin actions' });
    }
  });

  // Live vendor status update - when vendor updates their profile
  socket.on('vendor:profile-updated', (data) => {
    const { vendorId, vendorName, updatedFields } = data;
    
    // Notify all admins about the vendor profile update
    io.to('admins').emit('admin:vendor-profile-updated', {
      vendorId,
      vendorName,
      updatedFields,
      timestamp: new Date()
    });
    
    console.log(`📢 Vendor ${vendorId} profile updated, notifying admins`);
  });

  // Track online vendors for admins
  socket.on('admin:request-online-vendors', () => {
    const onlineVendors = Array.from(vendorConnections.entries()).map(([socketId, vendorId]) => ({
      vendorId,
      isOnline: true
    }));
    
    socket.emit('admin:online-vendors', {
      onlineVendors,
      onlineCount: onlineVendors.length,
      timestamp: new Date()
    });
    
    console.log(`📤 Sent online vendors list to admin`);
  });

  // Request active connections stats
  socket.on('admin:request-stats', () => {
    const stats = {
      activeAdmins: adminConnections.size,
      activeVendors: vendorConnections ? vendorConnections.size : 0,
      timestamp: new Date(),
    };
    socket.emit('active:connections', stats);
  });

  // Health check ping
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date() });
  });

  // ========== REAL-TIME NOTIFICATION HANDLERS ==========

  // Student join for notifications
  socket.on('student:join', (studentId) => {
    socket.join(`student:${studentId}`);
    socket.join('all-students');
    console.log(`✅ Student ${studentId} joined notification updates`);
    socket.emit('connection:status', { connected: true, message: 'Connected to notifications', userType: 'student' });
  });

  // Admin join for notifications
  socket.on('admin:notification:join', (adminId) => {
    socket.join(`admin-notifications:${adminId}`);
    socket.join('admin-notifications');
    console.log(`✅ Admin ${adminId} joined notification updates`);
    socket.emit('connection:status', { connected: true, message: 'Connected to notifications', userType: 'admin' });
  });

  // Vendor join for notifications
  socket.on('vendor:notification:join', (vendorId) => {
    socket.join(`vendor-notifications:${vendorId}`);
    socket.join('vendor-notifications');
    console.log(`✅ Vendor ${vendorId} joined notification updates`);
    socket.emit('connection:status', { connected: true, message: 'Connected to notifications', userType: 'vendor' });
  });

  // Broadcast notification to students
  socket.on('broadcast:student-notification', (data) => {
    try {
      const { title, message, type, studentId, notificationId } = data;
      
      // Send to specific student or all students
      const room = studentId ? `student:${studentId}` : 'all-students';
      
      io.to(room).emit('newNotification', {
        id: notificationId,
        title,
        message,
        type,
        createdAt: new Date(),
        isRead: false,
      });
      
      console.log(`📬 Notification sent to: ${room}`);
    } catch (error) {
      console.error('Error broadcasting student notification:', error);
      socket.emit('error:broadcast', { message: 'Failed to broadcast notification' });
    }
  });

  // Broadcast notification to admins
  socket.on('broadcast:admin-notification', (data) => {
    try {
      const { title, message, type, adminId, notificationId } = data;
      
      const room = adminId ? `admin-notifications:${adminId}` : 'admin-notifications';
      
      io.to(room).emit('newNotification', {
        id: notificationId,
        title,
        message,
        type,
        createdAt: new Date(),
        isRead: false,
      });
      
      console.log(`📬 Admin notification sent to: ${room}`);
    } catch (error) {
      console.error('Error broadcasting admin notification:', error);
      socket.emit('error:broadcast', { message: 'Failed to broadcast notification' });
    }
  });

  // Broadcast notification to vendors
  socket.on('broadcast:vendor-notification', (data) => {
    try {
      const { title, message, type, vendorId, notificationId } = data;
      
      const room = vendorId ? `vendor-notifications:${vendorId}` : 'vendor-notifications';
      
      io.to(room).emit('newNotification', {
        id: notificationId,
        title,
        message,
        type,
        createdAt: new Date(),
        isRead: false,
      });
      
      console.log(`📬 Vendor notification sent to: ${room}`);
    } catch (error) {
      console.error('Error broadcasting vendor notification:', error);
      socket.emit('error:broadcast', { message: 'Failed to broadcast notification' });
    }
  });

  // Mark notification as read (real-time sync)
  socket.on('notification:mark-read', (data) => {
    try {
      const { notificationId, userId } = data;
      
      io.to(`student:${userId}`).emit('notificationRead', {
        notificationId,
        isRead: true,
      });
      
      console.log(`✅ Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  });

  // Request unread count
  socket.on('notification:request-unread-count', async (userId) => {
    try {
      const { default: Notification } = await import('./models/Notification.js');
      const unreadCount = await Notification.countDocuments({
        $or: [
          { studentId: userId },
          { adminId: userId },
          { vendorId: userId },
          { userId: userId },
        ],
        isRead: false,
      });

      socket.emit('notification:unread-count', { unreadCount });
      console.log(`📊 Unread count for ${userId}: ${unreadCount}`);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch unread count' });
    }
  });

  // ========== STUDENT REQUEST HANDLERS ==========
  socket.on('student:request-coupons', async (studentId) => {
    try {
      const { default: CouponPurchase } = await import('./models/CouponPurchase.js');
      
      const coupons = await CouponPurchase.find({ studentId })
        .populate('offerId', 'title discountValue discountType')
        .sort({ purchasedAt: -1 })
        .select('couponCode offerId status discountType discountValue expiryDate platformSellingPrice purchasedAt paidAt')
        .lean();

      const formattedCoupons = coupons.map(c => ({
        _id: c._id,
        couponCode: c.couponCode,
        offerTitle: c.offerId?.title || 'Unknown Offer',
        discountValue: c.discountValue,
        discountType: c.discountType,
        status: c.status,
        expiryDate: c.expiryDate,
        platformSellingPrice: c.platformSellingPrice,
        paidAt: c.paidAt,
      }));

      socket.emit('student:coupons:loaded', { 
        coupons: formattedCoupons, 
        timestamp: new Date() 
      });
      console.log(`📤 Sent ${coupons.length} coupons to student ${studentId}`);
    } catch (error) {
      console.error('Error fetching student coupons:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch coupons' });
    }
  });

  socket.on('student:request-offers', async (studentId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      
      const offers = await Offer.find({ 
        isActive: true, 
        approvalStatus: 'approved' 
      })
        .populate('vendor', 'name businessName')
        .select('title description category discount discountType vendor isActive approvalStatus')
        .sort({ createdAt: -1 })
        .lean();

      socket.emit('student:offers:loaded', { 
        offers, 
        timestamp: new Date() 
      });
      console.log(`📤 Sent ${offers.length} available offers to student ${studentId}`);
    } catch (error) {
      console.error('Error fetching student offers:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch offers' });
    }
  });

  socket.on('student:request-approval-status', async (studentId) => {
    try {
      const { default: Student } = await import('./models/Student.js');
      
      const student = await Student.findById(studentId)
        .select('approvalStatus approvalRemarks verificationStatus')
        .lean();

      if (!student) {
        socket.emit('error:broadcast', { message: 'Student not found' });
        return;
      }

      socket.emit('student:approval-status:loaded', {
        status: student.approvalStatus,
        verificationStatus: student.verificationStatus,
        remarks: student.approvalRemarks,
        timestamp: new Date()
      });
      console.log(`📤 Sent approval status to student ${studentId}`);
    } catch (error) {
      console.error('Error fetching student approval status:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch approval status' });
    }
  });

  // ========== ADMIN REQUEST HANDLERS ==========
  socket.on('admin:request-students', async (adminId) => {
    try {
      const { default: Student } = await import('./models/Student.js');
      
      const students = await Student.find()
        .select('name email approvalStatus verificationStatus university collegeName createdAt')
        .sort({ createdAt: -1 })
        .lean();

      io.to(`admin:${adminId}`).emit('admin:students:loaded', { 
        students, 
        timestamp: new Date() 
      });
      console.log(`📤 Sent ${students.length} students to admin ${adminId}`);
    } catch (error) {
      console.error('Error fetching students for admin:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch students' });
    }
  });

  socket.on('admin:request-vendors', async (adminId) => {
    try {
      const { default: Vendor } = await import('./models/Vendor.js');
      
      const vendors = await Vendor.find()
        .select('name businessName approvalStatus isActive totalRevenue createdAt')
        .sort({ createdAt: -1 })
        .lean();

      io.to(`admin:${adminId}`).emit('admin:vendors:loaded', { 
        vendors, 
        timestamp: new Date() 
      });
      console.log(`📤 Sent ${vendors.length} vendors to admin ${adminId}`);
    } catch (error) {
      console.error('Error fetching vendors for admin:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch vendors' });
    }
  });

  socket.on('admin:request-offers', async (adminId) => {
    try {
      const { default: Offer } = await import('./models/Offer.js');
      
      const offers = await Offer.find()
        .populate('vendor', 'name businessName')
        .select('title vendor approvalStatus isActive discount currentRedemptions createdAt')
        .sort({ createdAt: -1 })
        .lean();

      io.to(`admin:${adminId}`).emit('admin:offers:loaded', { 
        offers, 
        timestamp: new Date() 
      });
      console.log(`📤 Sent ${offers.length} offers to admin ${adminId}`);
    } catch (error) {
      console.error('Error fetching offers for admin:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch offers' });
    }
  });

  socket.on('admin:request-transactions', async (adminId) => {
    try {
      const { default: CouponPurchase } = await import('./models/CouponPurchase.js');
      
      const transactions = await CouponPurchase.find({ paymentStatus: 'completed' })
        .populate('studentId', 'name email')
        .populate('vendorId', 'name businessName')
        .populate('offerId', 'title')
        .select('couponCode studentId vendorId offerId platformSellingPrice paymentStatus purchasedAt')
        .sort({ purchasedAt: -1 })
        .limit(50)
        .lean();

      io.to(`admin:${adminId}`).emit('admin:transactions:loaded', { 
        transactions, 
        timestamp: new Date() 
      });
      console.log(`📤 Sent ${transactions.length} transactions to admin ${adminId}`);
    } catch (error) {
      console.error('Error fetching transactions for admin:', error);
      socket.emit('error:broadcast', { message: 'Failed to fetch transactions' });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const adminId = adminConnections.get(socket.id);
    const vendorId = vendorConnections.get(socket.id);
    
    if (adminId) {
      adminConnections.delete(socket.id);
      console.log(`❌ Admin ${adminId} disconnected`);
      io.to('admins').emit('admin:disconnected', { adminId, timestamp: new Date() });
    }
    
    if (vendorId) {
      vendorConnections.delete(socket.id);
      console.log(`❌ Vendor ${vendorId} disconnected`);
      io.to('vendors').emit('vendor:disconnected', { vendorId, timestamp: new Date() });
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });

  // ========== STUDENT REAL-TIME NOTIFICATIONS FOR EVENTS & OFFERS ==========

  // Vendor broadcasts when a new offer is created
  socket.on('vendor:offer-created', async (data) => {
    try {
      const { vendorId, offerId } = data;
      
      // Fetch full offer details
      const { default: Offer } = await import('./models/Offer.js');
      const { default: User } = await import('./models/User.js');
      
      const offer = await Offer.findById(offerId).lean();
      const vendor = await User.findById(vendorId).select('name businessName').lean();

      io.emit('student:new-offer', {
        offerId,
        vendorId,
        vendorName: vendor?.businessName || vendor?.name,
        title: offer?.title,
        discount: offer?.discount,
        discountType: offer?.discountType,
        category: offer?.category,
        description: offer?.description,
        image: offer?.image,
        startDate: offer?.startDate,
        endDate: offer?.endDate,
        timestamp: new Date(),
        notificationType: 'offer',
        message: `🎉 New Offer: ${offer?.title} from ${vendor?.businessName || vendor?.name}`
      });
      
      console.log(`✅ Broadcast: New offer created by vendor ${vendorId}`);
    } catch (error) {
      console.error('❌ Error broadcasting new offer:', error);
      socket.emit('error:broadcast', { message: 'Failed to broadcast offer' });
    }
  });

  // Vendor broadcasts when offer is updated
  socket.on('vendor:offer-updated', async (data) => {
    try {
      const { vendorId, offerId } = data;
      
      const { default: Offer } = await import('./models/Offer.js');
      const { default: User } = await import('./models/User.js');
      
      const offer = await Offer.findById(offerId).lean();
      const vendor = await User.findById(vendorId).select('name businessName').lean();

      io.emit('student:offer-updated', {
        offerId,
        vendorId,
        vendorName: vendor?.businessName || vendor?.name,
        title: offer?.title,
        discount: offer?.discount,
        discountType: offer?.discountType,
        category: offer?.category,
        isActive: offer?.isActive,
        timestamp: new Date(),
        notificationType: 'offer-update',
        message: `📢 ${vendor?.businessName || vendor?.name} updated offer: ${offer?.title}`
      });
      
      console.log(`✅ Broadcast: Offer ${offerId} updated by vendor ${vendorId}`);
    } catch (error) {
      console.error('❌ Error broadcasting offer update:', error);
    }
  });

  // Vendor broadcasts when an event is created (using Offer model as Event)
  socket.on('vendor:event-created', async (data) => {
    try {
      const { vendorId, eventId } = data;
      
      const { default: Offer } = await import('./models/Offer.js');
      const { default: User } = await import('./models/User.js');
      
      const event = await Offer.findById(eventId).lean();
      const vendor = await User.findById(vendorId).select('name businessName').lean();

      io.emit('student:new-event', {
        eventId,
        vendorId,
        vendorName: vendor?.businessName || vendor?.name,
        title: event?.title,
        description: event?.description,
        category: event?.category,
        image: event?.image,
        startDate: event?.startDate,
        endDate: event?.endDate,
        timestamp: new Date(),
        notificationType: 'event',
        message: `🎪 New Event: ${event?.title} by ${vendor?.businessName || vendor?.name}`
      });
      
      console.log(`✅ Broadcast: New event created by vendor ${vendorId}`);
    } catch (error) {
      console.error('❌ Error broadcasting new event:', error);
      socket.emit('error:broadcast', { message: 'Failed to broadcast event' });
    }
  });

  // Vendor broadcasts when event is updated
  socket.on('vendor:event-updated', async (data) => {
    try {
      const { vendorId, eventId } = data;
      
      const { default: Offer } = await import('./models/Offer.js');
      const { default: User } = await import('./models/User.js');
      
      const event = await Offer.findById(eventId).lean();
      const vendor = await User.findById(vendorId).select('name businessName').lean();

      io.emit('student:event-updated', {
        eventId,
        vendorId,
        vendorName: vendor?.businessName || vendor?.name,
        title: event?.title,
        description: event?.description,
        category: event?.category,
        isActive: event?.isActive,
        timestamp: new Date(),
        notificationType: 'event-update',
        message: `📢 ${vendor?.businessName || vendor?.name} updated event: ${event?.title}`
      });
      
      console.log(`✅ Broadcast: Event ${eventId} updated by vendor ${vendorId}`);
    } catch (error) {
      console.error('❌ Error broadcasting event update:', error);
    }
  });

  // Student requests to receive notifications
  socket.on('student:subscribe-notifications', (studentId) => {
    socket.join(`student:${studentId}`);
    socket.emit('student:subscribed', {
      message: 'Successfully subscribed to notifications',
      timestamp: new Date()
    });
    console.log(`📌 Student ${studentId} subscribed to notifications`);
  });

  // Student unsubscribes from notifications
  socket.on('student:unsubscribe-notifications', (studentId) => {
    socket.leave(`student:${studentId}`);
    console.log(`📌 Student ${studentId} unsubscribed from notifications`);
  });

  // ========== COUPON PURCHASE REAL-TIME EVENTS ==========
  
  // Broadcast coupon purchase to vendor and student
  socket.on('coupon:purchase-completed', (data) => {
    try {
      const { studentId, vendorId, offerId, quantity, purchases } = data;
      
      // Notify the student
      io.to(`student:${studentId}`).emit('coupon:purchase-success', {
        status: 'success',
        message: `🎉 You successfully purchased ${quantity} coupon(s)!`,
        purchases,
        timestamp: new Date(),
        notificationType: 'coupon-purchase'
      });
      
      // Notify the vendor
      io.to(`vendor:${vendorId}`).emit('coupon:sold', {
        studentId,
        offerId,
        quantity,
        totalRevenue: purchases.reduce((sum, p) => sum + p.platformSellingPrice, 0),
        message: `🛍️ ${quantity} coupon(s) was just purchased from your offer`,
        timestamp: new Date(),
        notificationType: 'coupon-sold'
      });
      
      console.log(`✅ Coupon purchase broadcast: Student ${studentId} bought ${quantity} from Vendor ${vendorId}`);
    } catch (error) {
      console.error('❌ Error broadcasting coupon purchase:', error);
      socket.emit('error:broadcast', { message: 'Failed to broadcast coupon purchase' });
    }
  });
  
  // Real-time coupon availability update
  socket.on('coupon:availability-changed', (data) => {
    try {
      const { offerId, vendorId, availableQuantity, message } = data;
      
      // Broadcast to all students viewing offers
      io.emit('student:coupon-availability-updated', {
        offerId,
        vendorId,
        availableQuantity,
        message: message || `Coupon availability updated`,
        timestamp: new Date(),
        notificationType: 'availability-change'
      });
      
      console.log(`📊 Coupon availability updated for offer ${offerId}`);
    } catch (error) {
      console.error('❌ Error broadcasting coupon availability:', error);
    }
  });
  
  // Join student coupon room for real-time updates
  socket.on('student:coupon-join', (studentId) => {
    socket.join(`student-coupons:${studentId}`);
    console.log(`✅ Student ${studentId} joined coupon purchase room`);
    socket.emit('coupon:room-joined', {
      message: 'Joined coupon purchase updates',
      studentId,
      timestamp: new Date()
    });
  });
  
  // Join vendor coupon room for real-time coupon sales
  socket.on('vendor:coupon-sales-join', (vendorId) => {
    socket.join(`vendor-coupon-sales:${vendorId}`);
    console.log(`✅ Vendor ${vendorId} joined coupon sales room`);
    socket.emit('coupon:vendor-sales-joined', {
      message: 'Monitoring coupon sales in real-time',
      vendorId,
      timestamp: new Date()
    });
  });
  
  // Coupon redemption event
  socket.on('coupon:redeemed', (data) => {
    try {
      const { couponCode, couponId, studentId, vendorId, discountValue, discountType } = data;
      
      // Notify the student
      io.to(`student-coupons:${studentId}`).emit('coupon:redeemed-success', {
        couponCode,
        status: 'redeemed',
        message: `✅ Your coupon has been redeemed successfully!`,
        discountApplied: `${discountType === 'percentage' ? discountValue + '%' : '₹' + discountValue} off`,
        timestamp: new Date(),
        notificationType: 'coupon-redeemed'
      });
      
      // Notify the vendor
      io.to(`vendor-coupon-sales:${vendorId}`).emit('coupon:validated', {
        couponCode,
        studentId,
        status: 'validated',
        message: `✅ Coupon ${couponCode.substring(0, 8)}... has been validated and used`,
        timestamp: new Date(),
        notificationType: 'coupon-validated'
      });
      
      console.log(`✅ Coupon redeemed event: ${couponCode} by vendor ${vendorId}`);
    } catch (error) {
      console.error('❌ Error broadcasting coupon redemption:', error);
    }
  });

  // ========================================
});

// Export io for use in routes
export { io };

// Database connection
let dbConnected = false;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-discount-platform';
    console.log(`📡 Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    dbConnected = true;
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

connectDB();

// Periodic connection check
setInterval(() => {
  io.emit('server:ping', { timestamp: new Date() });
}, 10000);

// Note: Server will start even if database is not connected
// This allows the health check and other routes to function
if (!dbConnected) {
  console.warn('\n⚠️  Starting server without database connection.');
  console.warn('Database requests will fail. Please ensure MongoDB is running.');
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: dbConnected ? 'ok' : 'error', 
    message: dbConnected ? 'Server is running and connected to database' : 'Server running but database disconnected',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/coupon-purchase', couponPurchaseRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin/dashboard', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
});
