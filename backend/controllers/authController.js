import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';
import { hashPassword, verifyPassword } from '../utils/helpers.js';
import { recordLoginSession, recordFailedLogin } from './loginController.js';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Register new user (signup)
// @route   POST /api/auth/register
// @access  Public
export const signup = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      businessName, 
      businessCategory,
      // Student specific fields
      collegeName,
      courseName,
      yearOfStudy,
      enrollmentNumber,
      studentId,
      collegeEmailId,
      mobileNumber,
      city,
      state,
      university,
    } = req.body;

    console.log('\n\n========== SIGNUP REQUEST RECEIVED ==========');
    console.log('📨 Request body:', {
      name: name || 'MISSING',
      email: email || 'MISSING',
      password: password ? '***' : 'MISSING',
      role: role || 'MISSING',
    });
    console.log('Timestamp:', new Date().toISOString());

    // Step 1: Validate input
    if (!name || !email || !password || !role) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }
    console.log('✅ Step 1: Validation passed');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Validate role
    const validRoles = ['student', 'admin', 'vendor'];
    if (!validRoles.includes(role)) {
      console.log('❌ Invalid role:', role);
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student, admin, or vendor',
      });
    }

    // Validate vendor-specific fields
    if (role === 'vendor' && !businessName) {
      console.log('❌ Business name required for vendor');
      return res.status(400).json({
        success: false,
        message: 'Business name is required for vendor registration',
      });
    }
    console.log('✅ Step 1: Validation passed');
    let existingUser = null;
    if (role === 'student') {
      existingUser = await Student.findOne({ email: email.toLowerCase() });
    } else if (role === 'vendor') {
      existingUser = await Vendor.findOne({ email: email.toLowerCase() });
    } else if (role === 'admin') {
      existingUser = await Admin.findOne({ email: email.toLowerCase() });
    }

    if (existingUser) {
      console.log('❌ Email already registered:', email);
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }
    console.log('✅ Step 2: Email unique - proceeding');

    // Step 3: Hash password
    console.log('🔐 Step 3: Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('✅ Step 3: Password hashed');

    // Step 4: CREATE AND SAVE TO MONGODB FIRST - CRITICAL OPERATION
    let user;
    let savedUser;

    try {
      console.log('📝 Step 4: Creating', role, 'document...');
      
      if (role === 'student') {
        // Create student document
        user = new Student({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'student',
          isVerified: false,
          verificationStatus: 'pending',
          approvalStatus: 'pending',
          isActive: true,
          // Student-specific fields
          collegeName: collegeName || '',
          courseName: courseName || '',
          yearOfStudy: yearOfStudy || '',
          enrollmentNumber: enrollmentNumber || '',
          studentId: studentId || '',
          collegeEmailId: collegeEmailId || '',
          university: university || '',
          mobileNumber: mobileNumber || '',
          city: city || '',
          state: state || '',
          // Initialize location with default GeoJSON structure
          location: {
            type: 'Point',
            coordinates: [0, 0], // Default coordinates [longitude, latitude]
          },
        });
        console.log('   Created student object:', user._id);
      } else if (role === 'vendor') {
        // Create vendor document
        user = new Vendor({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'vendor',
          businessName: businessName || '',
          businessType: businessCategory || '',
          businessRegistration: businessName || '', // Will be updated by vendor
          mobileNumber: mobileNumber || '',
          city: city || '',
          state: state || '',
          isVerified: false,
          verificationStatus: 'pending',
          approvalStatus: 'pending',
          isActive: true,
          // Initialize location with default GeoJSON structure
          location: {
            type: 'Point',
            coordinates: [0, 0], // Default coordinates [longitude, latitude]
          },
        });
        console.log('   Created vendor object:', user._id);
      } else if (role === 'admin') {
        // Create admin document
        user = new Admin({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'admin',
          isActive: true,
        });
        console.log('   Created admin object:', user._id);
      }

      // ⭐ SAVE TO MONGODB - PRIMARY OPERATION
      console.log('💾 Step 4: Saving to MongoDB...');
      savedUser = await user.save();
      console.log('✅ Step 4: SAVED TO MONGODB SUCCESSFULLY!');
      console.log('   ID:', savedUser._id);
      console.log('   Email:', savedUser.email);
      console.log('   Role:', savedUser.role);
      console.log('   Created:', savedUser.createdAt);

    } catch (saveError) {
      console.error('❌ Step 4 FAILED - MongoDB save error:');
      console.error('   Error type:', saveError.constructor.name);
      console.error('   Message:', saveError.message);
      if (saveError.errors) {
        console.error('   Validation errors:', Object.keys(saveError.errors));
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account',
        error: saveError.message,
      });
    }

    // Step 5: Generate token (only after successful MongoDB save)
    console.log('🔐 Step 5: Generating JWT token...');
    const token = generateToken(savedUser);
    console.log('✅ Step 5: Token generated');

    // Step 6: Return response
    console.log('📤 Step 6: Sending success response to client');
    console.log('========== SIGNUP COMPLETE ==========\n');
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        isVerified: savedUser.isVerified,
        ...(role === 'vendor' && { businessName: savedUser.businessName }),
      },
    });

  } catch (error) {
    console.error('❌ SIGNUP ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

// @desc    Unified login (handles all roles: student, vendor, admin)
// @route   POST /api/auth/login
// @access  Public
export const unifiedLogin = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (!role || !['student', 'admin', 'vendor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (student, admin, or vendor)',
      });
    }

    const emailLower = email.toLowerCase();
    let user = null;
    let userModel = null;

    // Try to find user with specified role
    if (role === 'student') {
      user = await Student.findOne({ email: emailLower }).catch(err => {
        console.error('Error finding student:', err);
        return null;
      });
      userModel = 'Student';
      
      // If student not found, check if this email is registered as admin or vendor
      if (!user) {
        const adminUser = await Admin.findOne({ email: emailLower }).catch(err => null);
        if (adminUser) {
          recordFailedLogin(email, 'student', req, 'Email is registered as admin').catch(err => {
            console.error('Error recording failed login:', err);
          });
          return res.status(401).json({
            success: false,
            message: 'This email is registered as an admin account. Please use the admin login page.',
            code: 'WRONG_ROLE',
            correctRole: 'admin',
          });
        }
      }
    } else if (role === 'vendor') {
      user = await Vendor.findOne({ email: emailLower }).catch(err => {
        console.error('Error finding vendor:', err);
        return null;
      });
      userModel = 'Vendor';

      // If vendor not found, check if this email is registered as admin or student
      if (!user) {
        const adminUser = await Admin.findOne({ email: emailLower }).catch(err => null);
        if (adminUser) {
          recordFailedLogin(email, 'vendor', req, 'Email is registered as admin').catch(err => {
            console.error('Error recording failed login:', err);
          });
          return res.status(401).json({
            success: false,
            message: 'This email is registered as an admin account. Please use the admin login page.',
            code: 'WRONG_ROLE',
            correctRole: 'admin',
          });
        }

        const studentUser = await Student.findOne({ email: emailLower }).catch(err => null);
        if (studentUser) {
          recordFailedLogin(email, 'vendor', req, 'Email is registered as student').catch(err => {
            console.error('Error recording failed login:', err);
          });
          return res.status(401).json({
            success: false,
            message: 'This email is registered as a student account. Please use the student login page.',
            code: 'WRONG_ROLE',
            correctRole: 'student',
          });
        }
      }
    } else if (role === 'admin') {
      user = await Admin.findOne({ email: emailLower }).catch(err => {
        console.error('Error finding admin:', err);
        return null;
      });
      
      // If not found in Admin collection, check other collections for admin role
      if (!user) {
        const studentAdmin = await Student.findOne({ email: emailLower, role: 'admin' }).catch(err => {
          console.error('Error finding student admin:', err);
          return null;
        });
        if (studentAdmin) {
          user = studentAdmin;
          userModel = 'Student';
        }
      }

      if (!user) {
        const vendorAdmin = await Vendor.findOne({ email: emailLower, role: 'admin' }).catch(err => {
          console.error('Error finding vendor admin:', err);
          return null;
        });
        if (vendorAdmin) {
          user = vendorAdmin;
          userModel = 'Vendor';
        }
      }
    }

    if (!user) {
      recordFailedLogin(email, role, req, 'Account not found').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: role === 'student' 
          ? 'Student account not found. Please sign up first before logging in.'
          : 'Invalid email or password',
        code: role === 'student' ? 'SIGNUP_REQUIRED' : undefined,
      });
    }

    // For admin role, verify user is actually admin
    if (role === 'admin' && user.role !== 'admin') {
      recordFailedLogin(email, role, req, 'User is not an admin').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check account status
    if (!user.isActive) {
      recordFailedLogin(email, role, req, 'Account inactive').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    if (user.isSuspended) {
      recordFailedLogin(email, role, req, 'Account suspended').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(403).json({
        success: false,
        message: `Your account has been suspended${user.suspensionReason ? ': ' + user.suspensionReason : ''}`,
      });
    }

    // Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await verifyPassword(password, user.password);
    } catch (verifyError) {
      console.error('Error verifying password:', verifyError);
      recordFailedLogin(email, role, req, 'Password verification error').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: verifyError.message,
      });
    }

    if (!isValidPassword) {
      recordFailedLogin(email, role, req, 'Invalid password').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token and record login
    const token = generateToken(user);

    recordLoginSession(user._id, user.email, user.role, token, req, 'success').catch(err => {
      console.error('Error recording login session:', err);
    });

    // Prepare user response based on role
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    if (user.role === 'vendor') {
      userResponse.businessName = user.businessName;
      userResponse.approvalStatus = user.approvalStatus;
      userResponse.isApproved = user.approvalStatus === 'approved';
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// @desc    Student login
// @route   POST /api/auth/student/login
// @access  Public
export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const emailLower = email.toLowerCase();

    // Find student by email (lowercase for case-insensitive matching)
    let user = await Student.findOne({ email: emailLower }).catch(err => {
      console.error('Error finding student:', err);
      return null;
    });
    
    // If student not found, try admin credentials
    if (!user) {
      const adminUser = await Admin.findOne({ email: emailLower }).catch(err => {
        console.error('Error finding admin:', err);
        return null;
      });
      
      if (adminUser) {
        try {
          const isValidPassword = await verifyPassword(password, adminUser.password);
          if (isValidPassword) {
            const token = generateToken(adminUser);
            recordLoginSession(adminUser._id, adminUser.email, 'admin', token, req, 'success').catch(err => {
              console.error('Error recording login session:', err);
            });
            return res.json({
              success: true,
              message: 'Admin login successful',
              token,
              user: {
                id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: 'admin',
                isVerified: adminUser.isVerified,
              },
            });
          }
        } catch (verifyError) {
          console.error('Error verifying admin password:', verifyError);
        }
      }
      
      recordFailedLogin(email, 'student', req, 'Account not found').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Student account not found. Please sign up first before logging in.',
        code: 'SIGNUP_REQUIRED',
      });
    }

    // Student found - verify password
    let isValidPassword = false;
    try {
      isValidPassword = await verifyPassword(password, user.password);
    } catch (verifyError) {
      console.error('Error verifying password:', verifyError);
      recordFailedLogin(email, 'student', req, 'Password verification error').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: verifyError.message,
      });
    }

    if (!isValidPassword) {
      recordFailedLogin(email, 'student', req, 'Invalid password').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      recordFailedLogin(email, 'student', req, 'Account inactive').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Check if student account is suspended
    if (user.isSuspended) {
      recordFailedLogin(email, 'student', req, 'Account suspended').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(403).json({
        success: false,
        message: `Your account has been suspended${user.suspensionReason ? ': ' + user.suspensionReason : ''}`,
      });
    }

    // Password valid - generate token and record successful login
    const token = generateToken(user);

    recordLoginSession(user._id, user.email, 'student', token, req, 'success').catch(err => {
      console.error('Error recording login session:', err);
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// @desc    Vendor login
// @route   POST /api/auth/vendor/login
// @access  Public
export const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const emailLower = email.toLowerCase();

    let user = await Vendor.findOne({ email: emailLower }).catch(err => {
      console.error('Error finding vendor:', err);
      return null;
    });
    
    // If vendor doesn't exist, try admin credentials
    if (!user) {
      const adminUser = await Admin.findOne({ email: emailLower }).catch(err => {
        console.error('Error finding admin:', err);
        return null;
      });
      
      if (adminUser) {
        try {
          const isValidPassword = await verifyPassword(password, adminUser.password);
          if (isValidPassword) {
            const token = generateToken(adminUser);
            recordLoginSession(adminUser._id, adminUser.email, 'admin', token, req, 'success').catch(err => {
              console.error('Error recording login session:', err);
            });
            return res.json({
              success: true,
              message: 'Admin login successful',
              token,
              user: {
                id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: 'admin',
                isVerified: adminUser.isVerified,
              },
            });
          }
        } catch (verifyError) {
          console.error('Error verifying admin password:', verifyError);
        }
      }
      
      // Try to create vendor account or return error
      try {
        const defaultName = emailLower.split('@')[0].replace(/[._-]/g, ' ');
        const businessName = emailLower.split('@')[0].replace(/[._-]/g, ' ').toUpperCase() + ' Business';
        const hashedPassword = await hashPassword(password);
        
        user = new Vendor({
          name: defaultName,
          email: emailLower,
          password: hashedPassword,
          role: 'vendor',
          businessName,
          businessCategory: 'retail',
          isVerified: false,
          isActive: true,
        });

        await user.save();
        console.log(`New vendor account created automatically for ${emailLower}`);
      } catch (createError) {
        console.error('Error creating vendor account:', createError.message);
        recordFailedLogin(email, 'vendor', req, 'Account creation failed').catch(err => {
          console.error('Error recording failed login:', err);
        });
        return res.status(500).json({
          success: false,
          message: 'Unable to create account. Email may already be registered.',
          error: createError.message,
        });
      }
    }

    let isValidPassword = false;
    try {
      isValidPassword = await verifyPassword(password, user.password);
    } catch (verifyError) {
      console.error('Error verifying password:', verifyError);
      recordFailedLogin(email, 'vendor', req, 'Password verification error').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: verifyError.message,
      });
    }

    if (!isValidPassword) {
      recordFailedLogin(email, 'vendor', req, 'Invalid password').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user);

    recordLoginSession(user._id, user.email, 'vendor', token, req, 'success').catch(err => {
      console.error('Error recording login session:', err);
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName,
        isVerified: user.isVerified,
        approvalStatus: user.approvalStatus,
        isApproved: user.approvalStatus === 'approved',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Search for admin user in all collections
    let user = await Admin.findOne({ email: email.toLowerCase() }).catch(err => {
      console.error('Error finding admin:', err);
      return null;
    });
    
    // If not found in Admin collection, check Student and Vendor collections for users with admin role
    if (!user) {
      const studentAdmin = await Student.findOne({ email: email.toLowerCase(), role: 'admin' }).catch(err => {
        console.error('Error finding student admin:', err);
        return null;
      });
      if (studentAdmin) {
        user = studentAdmin;
      }
    }
    
    if (!user) {
      const vendorAdmin = await Vendor.findOne({ email: email.toLowerCase(), role: 'admin' }).catch(err => {
        console.error('Error finding vendor admin:', err);
        return null;
      });
      if (vendorAdmin) {
        user = vendorAdmin;
      }
    }

    if (!user) {
      // Record failed login attempt (non-blocking)
      recordFailedLogin(email, 'admin', req, 'User not found').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify role is admin
    if (user.role !== 'admin') {
      recordFailedLogin(email, 'admin', req, 'User is not an admin').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    let isValidPassword = false;
    try {
      isValidPassword = await verifyPassword(password, user.password);
    } catch (verifyError) {
      console.error('Error verifying password:', verifyError);
      recordFailedLogin(email, 'admin', req, 'Password verification error').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: verifyError.message,
      });
    }

    if (!isValidPassword) {
      // Record failed login attempt (non-blocking)
      recordFailedLogin(email, 'admin', req, 'Invalid password').catch(err => {
        console.error('Error recording failed login:', err);
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user);

    // Record successful login session in database (non-blocking)
    recordLoginSession(user._id, user.email, 'admin', token, req, 'success').catch(err => {
      console.error('Error recording login session:', err);
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    let user = null;
    const { role } = req.user;

    if (role === 'student') {
      user = await Student.findById(req.user.id).select('-password');
    } else if (role === 'vendor') {
      user = await Vendor.findById(req.user.id).select('-password');
    } else if (role === 'admin') {
      user = await Admin.findById(req.user.id).select('-password');
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, bio, profilePicture } = req.body;
    const { role } = req.user;

    let user = null;
    const updateData = {
      name,
      phoneNumber,
      bio,
      profilePicture,
      updatedAt: new Date(),
    };

    if (role === 'student') {
      user = await Student.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true }
      ).select('-password');
    } else if (role === 'vendor') {
      user = await Vendor.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true }
      ).select('-password');
    } else if (role === 'admin') {
      user = await Admin.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true }
      ).select('-password');
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { role } = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old and new passwords are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    let user = null;

    if (role === 'student') {
      user = await Student.findById(req.user.id);
    } else if (role === 'vendor') {
      user = await Vendor.findById(req.user.id);
    } else if (role === 'admin') {
      user = await Admin.findById(req.user.id);
    }

    const isValidPassword = await verifyPassword(oldPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect old password',
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const { role } = req.user;

    if (role === 'student') {
      await Student.findByIdAndDelete(req.user.id);
    } else if (role === 'vendor') {
      await Vendor.findByIdAndDelete(req.user.id);
    } else if (role === 'admin') {
      await Admin.findByIdAndDelete(req.user.id);
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message,
    });
  }
};
