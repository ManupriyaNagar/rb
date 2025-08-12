const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Contact = require('../models/Contact');
const { auth } = require('../middleware/auth');
const { adminValidation, loginValidation, validate } = require('../middleware/validation');

// POST /api/admin/login - Admin login
router.post('/login', loginValidation, validate, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' 
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await admin.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/admin/logout - Admin logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// GET /api/admin/profile - Get admin profile
router.get('/profile', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    res.json(admin);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/admin/profile - Update admin profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Update email if provided
    if (email && email !== admin.email) {
      admin.email = email;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }

      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      admin.password = newPassword;
    }

    await admin.save();

    res.json({
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Job statistics
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'active' });
    const jobsThisMonth = await Job.countDocuments({ 
      createdAt: { $gte: startOfMonth } 
    });

    // Application statistics
    const totalApplications = await Application.countDocuments();
    const pendingApplications = await Application.countDocuments({ status: 'pending' });
    const applicationsThisMonth = await Application.countDocuments({ 
      createdAt: { $gte: startOfMonth } 
    });
    const applicationsLastMonth = await Application.countDocuments({ 
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } 
    });

    // Contact statistics
    const totalContacts = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });
    const contactsThisMonth = await Contact.countDocuments({ 
      createdAt: { $gte: startOfMonth } 
    });
    const contactsLastMonth = await Contact.countDocuments({ 
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } 
    });

    // Recent activities
    const recentApplications = await Application.find()
      .populate('jobId', 'title')
      .sort('-createdAt')
      .limit(5)
      .lean();

    const recentContacts = await Contact.find()
      .sort('-createdAt')
      .limit(5)
      .lean();

    // Application status distribution
    const applicationStatusStats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Contact status distribution
    const contactStatusStats = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly trends for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyApplicationTrends = await Application.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyContactTrends = await Contact.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate growth percentages
    const applicationGrowth = applicationsLastMonth > 0 
      ? ((applicationsThisMonth - applicationsLastMonth) / applicationsLastMonth * 100).toFixed(1)
      : applicationsThisMonth > 0 ? 100 : 0;

    const contactGrowth = contactsLastMonth > 0 
      ? ((contactsThisMonth - contactsLastMonth) / contactsLastMonth * 100).toFixed(1)
      : contactsThisMonth > 0 ? 100 : 0;

    res.json({
      overview: {
        totalJobs,
        activeJobs,
        totalApplications,
        pendingApplications,
        totalContacts,
        newContacts,
        jobsThisMonth,
        applicationsThisMonth,
        contactsThisMonth,
        applicationGrowth: parseFloat(applicationGrowth),
        contactGrowth: parseFloat(contactGrowth)
      },
      recentActivities: {
        applications: recentApplications,
        contacts: recentContacts
      },
      statistics: {
        applicationStatusStats,
        contactStatusStats,
        monthlyApplicationTrends,
        monthlyContactTrends
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// POST /api/admin/create - Create new admin (super-admin only)
router.post('/create', auth, adminValidation, validate, async (req, res) => {
  try {
    // Check if current user is super-admin
    if (req.admin.role !== 'super-admin') {
      return res.status(403).json({ error: 'Only super-admin can create new admin accounts' });
    }

    const { username, email, password, role = 'admin' } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this username or email already exists' });
    }

    // Create new admin
    const admin = new Admin({
      username,
      email,
      password,
      role
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// GET /api/admin/verify - Verify token
router.get('/verify', auth, (req, res) => {
  res.json({
    valid: true,
    admin: {
      id: req.admin._id,
      username: req.admin.username,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

module.exports = router;