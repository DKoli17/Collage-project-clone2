import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'student',
    enum: ['student'],
  },
  
  // Document verification status (after upload)
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  
  // Admin approval status (final approval after document verification)
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvalRemarks: String,
  approvedAt: Date,
  
  verificationDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerificationDocument',
  }],
  
  isActive: {
    type: Boolean,
    default: true,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  suspensionReason: String,
  
  // Student specific fields
  collegeName: String,
  courseName: String,
  yearOfStudy: String,
  enrollmentNumber: String,
  studentId: String,
  collegeEmailId: String,
  universityId: String,
  universityName: String,
  university: String,
  graduationYear: Number,
  
  // Contact information
  mobileNumber: String,
  phoneNumber: String,
  city: String,
  state: String,
  
  // Location information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
  },
  latitude: Number,
  longitude: Number,
  locality: String,
  postalCode: String,
  
  // Profile
  profilePicture: String,
  bio: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create 2dsphere index for geospatial queries
studentSchema.index({ 'location': '2dsphere' });

export default mongoose.model('Student', studentSchema);
