const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { body, validationResult } = require('express-validator');

// Login validation middleware
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /api/admin/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    // Check locked / active
    if (admin.isLocked) {
      return res.status(423).json({ error: 'Account locked due to too many failed login attempts' });
    }
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await admin.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset attempts
    await admin.resetLoginAttempts();

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send token as cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Success response
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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
