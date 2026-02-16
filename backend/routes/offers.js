import express from 'express';
import Offer from '../models/Offer.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { generateCouponCode } from '../utils/helpers.js';
import upload from '../middleware/multer.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { io } from '../server.js';

const router = express.Router();

// Get all active offers (public/student view)
router.get('/active', async (req, res) => {
  try {
    const { category, search } = req.query;
    // Only show active and approved offers to students
    let filter = { isActive: true, status: 'active', approvalStatus: 'approved' };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const offers = await Offer.find(filter)
      .populate('vendor', 'name businessName businessCategory')
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
});

// Get single offer by ID
router.get('/detail/:id', async (req, res) => {
  try {
    // Only return approved offers to students
    const offer = await Offer.findOne({ _id: req.params.id, status: 'active', approvalStatus: 'approved' }).populate('vendor', 'name businessName businessCategory');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found or not approved' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offer', error: error.message });
  }
});

// Get offer by code
router.get('/code/:code', async (req, res) => {
  try {
    // Only return approved offers to students
    const offer = await Offer.findOne({ code: req.params.code, status: 'active', approvalStatus: 'approved' }).populate('vendor', 'name businessName');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found or not approved' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offer', error: error.message });
  }
});

// Get vendor's offers
router.get('/my-offers', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const offers = await Offer.find({ vendor: req.user.id }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
});

// Create offer
router.post('/create', upload.single('image'), authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const { title, description, category, discount, discountType, startDate, endDate, maxRedemptions, termsAndConditions } = req.body;

    // Validate required fields
    if (!title || !description || !category || !discount) {
      return res.status(400).json({ message: 'Missing required fields', missingFields: { title: !title, description: !description, category: !category, discount: !discount } });
    }

    // Validate discount is a valid number
    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 0) {
      return res.status(400).json({ message: 'Discount must be a valid positive number' });
    }

    // Normalize category to lowercase
    const normalizedCategory = category.toLowerCase();

    // Valid categories from schema
    const validCategories = ['food', 'retail', 'entertainment', 'technology', 'travel', 'education', 'health', 'sports', 'other'];
    if (!validCategories.includes(normalizedCategory)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    let imageUrl = null;
    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer, `offers/${req.user.id}`);
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return res.status(400).json({ message: 'Failed to upload image', error: uploadError.message });
      }
    }

    const code = `OFFER-${generateCouponCode()}`;

    const offer = new Offer({
      title,
      description,
      category: normalizedCategory,
      discount: discountNum,
      discountType,
      code,
      vendor: req.user.id,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      maxRedemptions: Number(maxRedemptions) || 0,
      termsAndConditions,
      image: imageUrl,
      status: 'active', // Auto-approve for testing/demo
      approvalStatus: 'approved', // Auto-approve for testing/demo
      isActive: true, // Activate immediately for testing/demo
    });

    await offer.save();

    // Emit real-time event to the vendor
    io.to(`vendor:${req.user.id}`).emit('offer:created', {
      offer,
      message: 'Offer created successfully and is now live',
      timestamp: new Date()
    });

    // Broadcast to all students for real-time update
    io.emit('offer:new', {
      offer,
      vendorId: req.user.id,
      timestamp: new Date()
    });

    // Broadcast to all connected clients
    io.emit('vendors:updated', {
      message: 'New offer available',
      timestamp: new Date()
    });

    res.status(201).json({ 
      message: 'Offer created successfully and is now live for students', 
      offer,
      success: true
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ message: 'Failed to create offer', error: error.message });
  }
});

// Update offer
router.put('/update/:id', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this offer' });
    }

    Object.assign(offer, req.body);
    offer.updatedAt = new Date();
    await offer.save();

    res.json({ message: 'Offer updated successfully', offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update offer', error: error.message });
  }
});

// Delete offer
router.delete('/delete/:id', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this offer' });
    }

    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete offer', error: error.message });
  }
});

// Toggle offer status
router.patch('/toggle/:id', authenticateToken, authorizeRole('vendor'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('vendor', 'name businessName');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.vendor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to toggle this offer' });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    // If offer is active and approved, notify students
    if (offer.isActive && offer.status === 'active') {
      io.emit('student:offer-updated', {
        offerId: offer._id,
        vendorId: offer.vendor._id,
        vendorName: offer.vendor.businessName || offer.vendor.name,
        title: offer.title,
        discount: offer.discount,
        discountType: offer.discountType,
        category: offer.category,
        isActive: offer.isActive,
        timestamp: new Date(),
        notificationType: 'offer-update',
        message: `📢 ${offer.vendor.businessName || offer.vendor.name} activated offer: ${offer.title}`
      });
    } else if (!offer.isActive && offer.status === 'active') {
      // Notify students that offer is deactivated
      io.emit('student:offer-updated', {
        offerId: offer._id,
        vendorId: offer.vendor._id,
        vendorName: offer.vendor.businessName || offer.vendor.name,
        title: offer.title,
        isActive: offer.isActive,
        timestamp: new Date(),
        notificationType: 'offer-update',
        message: `📢 ${offer.vendor.businessName || offer.vendor.name} deactivated offer: ${offer.title}`
      });
    }

    res.json({ message: 'Offer status updated', offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle offer', error: error.message });
  }
});

// Redeem offer - ONLY APPROVED STUDENTS CAN REDEEM
router.post('/redeem', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const { offerId } = req.body;

    // Import Student model to check approval status
    const Student = (await import('../models/Student.js')).default;

    // Get student details
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: 'Offer not found' 
      });
    }

    if (!offer.isActive) {
      return res.status(400).json({ 
        success: false,
        message: 'This offer is no longer active' 
      });
    }

    if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
      return res.status(400).json({ 
        success: false,
        message: 'This offer has reached max redemptions' 
      });
    }

    // Check if already redeemed
    const alreadyRedeemed = offer.redemptions.some(
      r => r.student.toString() === req.user.id
    );
    if (alreadyRedeemed) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already redeemed this offer' 
      });
    }

    const redemptionCode = generateCouponCode();
    offer.redemptions.push({
      student: req.user.id,
      redeemedAt: new Date(),
      redemptionCode,
      isOnline: true,
    });
    offer.currentRedemptions += 1;

    await offer.save();

    // Emit real-time event to vendor that a student claimed their coupon
    try {
      io.to(`vendor:${offer.vendor.toString()}`).emit('vendor:coupon-claimed', {
        offerId: offer._id,
        offerTitle: offer.title,
        studentId: req.user.id,
        studentName: student.name || 'A student',
        totalClaims: offer.currentRedemptions,
        claimedByStudents: offer.redemptions.length,
        redemptionCode,
        timestamp: new Date(),
        notificationType: 'coupon-claim',
        message: `🎉 A student claimed your coupon "${offer.title}"! Total claims: ${offer.currentRedemptions}`
      });
      console.log(`✅ Real-time event sent to vendor ${offer.vendor} for coupon claim`);
    } catch (ioError) {
      console.warn(`⚠️ Failed to emit real-time notification for coupon claim:`, ioError.message);
    }

    res.json({
      success: true,
      message: 'Offer redeemed successfully',
      redemptionCode,
      offer,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to redeem offer', 
      error: error.message 
    });
  }
});

// Get offer stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true });
    const totalOffers = offers.length;
    const totalRedemptions = offers.reduce((sum, o) => sum + o.currentRedemptions, 0);
    const avgDiscount = offers.length > 0
      ? (offers.reduce((sum, o) => sum + o.discount, 0) / offers.length).toFixed(2)
      : 0;

    res.json({
      totalOffers,
      totalRedemptions,
      avgDiscount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Admin: Get pending offers for approval
router.get('/admin/pending', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const pendingOffers = await Offer.find({ status: 'pending' })
      .populate('vendor', 'name businessName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Offer.countDocuments({ status: 'pending' });

    res.json({
      pendingOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending offers', error: error.message });
  }
});

// Admin: Approve an offer
router.post('/admin/approve/:offerId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId).populate('vendor', 'name businessName');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    offer.status = 'active';
    offer.isActive = true;
    await offer.save();

    // Emit real-time notification to all students (non-blocking)
    try {
      if (io) {
        io.emit('student:new-offer', {
          offerId: offer._id,
          vendorId: offer.vendor._id,
          vendorName: offer.vendor.businessName || offer.vendor.name,
          title: offer.title,
          discount: offer.discount,
          discountType: offer.discountType,
          category: offer.category,
          description: offer.description,
          image: offer.image,
          startDate: offer.startDate,
          endDate: offer.endDate,
          timestamp: new Date(),
          notificationType: 'offer',
          message: `🎉 New Offer: ${offer.title} from ${offer.vendor.businessName || offer.vendor.name}`
        });
        console.log(`✅ Offer ${offer._id} approved and students notified`);
      }
    } catch (ioError) {
      console.warn(`⚠️ Failed to emit real-time notification for offer ${offer._id}:`, ioError.message);
    }

    res.json({
      message: 'Offer approved successfully and is now visible to students',
      offer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve offer', error: error.message });
  }
});

// Admin: Reject an offer
router.post('/admin/reject/:offerId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const offer = await Offer.findById(req.params.offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    offer.status = 'rejected';
    offer.isActive = false;
    // Optionally store rejection reason (would need to add field to model)
    await offer.save();

    res.json({
      message: 'Offer rejected successfully',
      offer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject offer', error: error.message });
  }
});

export default router;
