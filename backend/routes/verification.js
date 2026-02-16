import express from 'express';
import VerificationCode from '../models/VerificationCode.js';
import VerificationDocument from '../models/VerificationDocument.js';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import upload from '../middleware/multer.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Helper function to get user from appropriate model based on role
const getUserByRole = async (userId, role) => {
  if (role === 'student') return await Student.findById(userId);
  if (role === 'admin') return await Admin.findById(userId);
  return null;
};

// Helper function to update user by role
const updateUserByRole = async (userId, role, updateData) => {
  if (role === 'student') return await Student.findByIdAndUpdate(userId, updateData, { new: true });
  if (role === 'admin') return await Admin.findByIdAndUpdate(userId, updateData, { new: true });
  return null;
};

const router = express.Router();

// NOTE: Removed OTP verification endpoints (send-code, verify-code) as student verification is now handled by admin approval only
// Students no longer require OTP verification after signup

// Upload verification document (flexible for any document type)
router.post('/upload-document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { documentType } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    if (!documentType) {
      return res.status(400).json({ success: false, message: 'Document type is required' });
    }

    // Validate document type
    const validTypes = ['student_id', 'enrollment_letter', 'transcript', 'business_license', 'aadhar', 'pan', 'passport', 'other'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    // Upload to Cloudinary with detailed error handling
    let cloudinaryResponse;
    try {
      // Verify Cloudinary credentials exist
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('❌ Missing Cloudinary credentials:', {
          cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
          api_key: !!process.env.CLOUDINARY_API_KEY,
          api_secret: !!process.env.CLOUDINARY_API_SECRET
        });
        return res.status(500).json({ 
          success: false,
          message: 'Server configuration error: Cloudinary credentials not configured'
        });
      }

      cloudinaryResponse = await uploadToCloudinary(
        file.buffer,
        file.originalname,
        `documents/${req.user.role}/${req.user.id}`
      );
    } catch (cloudinaryError) {
      console.error('❌ Cloudinary upload error:', cloudinaryError.message);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to upload file to cloud storage: ' + cloudinaryError.message,
        error: cloudinaryError.message 
      });
    }

    // Create document record with Cloudinary URL
    const document = new VerificationDocument({
      user: req.user.id,
      documentType,
      fileUrl: cloudinaryResponse.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'pending', // Documents are pending by default
      cloudinaryPublicId: cloudinaryResponse.public_id, // Store for deletion if needed
    });

    await document.save();

    // Also add to user's verificationDocuments array if it doesn't exist
    await updateUserByRole(req.user.id, req.user.role, {
      $addToSet: { verificationDocuments: document._id }
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully. Waiting for admin verification.',
      document,
    });
  } catch (error) {
    console.error('❌ Document upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload document', 
      error: error.message 
    });
  }
});

// Get user's documents
router.get('/my-documents', authenticateToken, async (req, res) => {
  try {
    const documents = await VerificationDocument.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.json({
      documents,
      pendingCount: documents.filter(d => d.status === 'pending').length,
      verifiedCount: documents.filter(d => d.status === 'verified').length,
      rejectedCount: documents.filter(d => d.status === 'rejected').length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
});

// Upload student ID document
router.post('/upload-student-id', authenticateToken, async (req, res) => {
  try {
    const { file } = req.files || {};

    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // In production, upload to cloud storage
    const fileUrl = `/uploads/${Date.now()}-${file.name}`;

    const document = new VerificationDocument({
      user: req.user.id,
      documentType: 'student_id',
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    await document.save();

    // Update user verification documents
    await updateUserByRole(
      req.user.id,
      req.user.role,
      { $push: { verificationDocuments: document._id } }
    );

    res.status(201).json({ message: 'Document uploaded successfully', document });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
});

// Get pending documents (admin only)
router.get('/pending-documents', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userType = 'all', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { status: 'pending' };

    if (userType !== 'all') {
      // Get users of specific type
      let users = [];
      if (userType === 'student') {
        users = await Student.find({}, '_id');
      }
      const userIds = users.map(u => u._id);
      filter.user = { $in: userIds };
    }

    const documents = await VerificationDocument.find(filter)
      .populate('user', 'name email role')
      .skip(skip)
      .limit(limit);

    const total = await VerificationDocument.countDocuments(filter);

    res.json({
      documents,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending documents', error: error.message });
  }
});

// Verify document (admin)
router.post('/verify-document/:documentId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const document = await VerificationDocument.findByIdAndUpdate(
      req.params.documentId,
      {
        status,
        remarks,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    ).populate('user');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // If all documents verified, update user status
    if (status === 'verified') {
      const pendingDocs = await VerificationDocument.countDocuments({
        user: document.user._id,
        status: 'pending',
      });

      if (pendingDocs === 0) {
        // Document has role information, update accordingly
        await updateUserByRole(
          document.user._id,
          document.user.role,
          { isVerified: true, verificationStatus: 'verified' }
        );
      }
    }

    res.json({ message: 'Document verified successfully', document });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify document', error: error.message });
  }
});

// Get verification status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await getUserByRole(req.user.id, req.user.role);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const documents = await VerificationDocument.find({ user: req.user.id });

    res.json({
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      documents,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch verification status', error: error.message });
  }
});

// Get verification status for specific user (admin)
router.get('/:userId/status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Try to find user in all role-based collections
    let user = await Student.findById(req.params.userId);
    if (!user) user = await Admin.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const documents = await VerificationDocument.find({ user: req.params.userId });

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      documents,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch verification status', error: error.message });
  }
});

// Approve verification
router.put('/:userId/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: true, verificationStatus: 'verified', updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Emit real-time events
    const io = req.io;
    if (io) {
      // Determine if it's a vendor or student
      if (user.role === 'vendor') {
        // Emit to vendor
        io.to(`vendor:${req.params.userId}`).emit('vendor:notification:verified', {
          message: 'Your account has been verified',
          status: 'verified',
          timestamp: new Date()
        });
      } else if (user.role === 'student') {
        // Emit to student
        io.to(`student:${req.params.userId}`).emit('student:notification:verified', {
          message: 'Your account has been verified',
          status: 'verified',
          timestamp: new Date()
        });
      }

      // Emit to admins
      io.to('admins').emit('admin:user-verified', {
        userId: req.params.userId,
        userName: user.name,
        role: user.role,
        timestamp: new Date()
      });

      console.log(`📡 User ${req.params.userId} (${user.role}) verified - events emitted`);
    }

    res.json({ message: 'User verified successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve verification', error: error.message });
  }
});

// Reject verification
router.put('/:userId/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { verificationStatus: 'rejected', updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User verification rejected', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject verification', error: error.message });
  }
});

// SheerID verification (placeholder)
router.post('/sheerid', authenticateToken, async (req, res) => {
  try {
    const { email, affiliationType, affiliationValue } = req.body;

    // In production, call SheerID API
    console.log('SheerID verification:', { email, affiliationType, affiliationValue });

    res.json({ message: 'SheerID verification initiated', status: 'pending' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to initiate SheerID verification', error: error.message });
  }
});

export default router;
