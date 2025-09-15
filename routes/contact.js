const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { auth } = require('../middleware/auth');
const { contactValidation, validate } = require('../middleware/validation');
const nodemailer = require('nodemailer');

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// GET /api/contact/admin - Get all contact submissions (admin only)
router.get('/admin', auth, async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (assignedTo && assignedTo !== 'all') filter.assignedTo = assignedTo;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get contacts with pagination
    const contacts = await Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Contact.countDocuments(filter);

    res.json({
      contacts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + contacts.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/contact/admin/stats - Get contact statistics (admin only)
router.get('/admin/stats', auth, async (req, res) => {
  try {
    const statusStats = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Contact.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const serviceStats = await Contact.aggregate([
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recentContacts = await Contact.find()
      .sort('-createdAt')
      .limit(5)
      .lean();

    // Monthly contact trends
    const monthlyStats = await Contact.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      statusStats,
      priorityStats,
      serviceStats,
      recentContacts,
      monthlyStats,
      total: await Contact.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch contact statistics' });
  }
});

// GET /api/contact/admin/:id - Get single contact (admin only)
router.get('/admin/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).lean();

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// GET /api/contact - Public endpoint (returns basic info or empty response)
router.get('/', async (req, res) => {
  try {
    // Return basic contact info or just success status
    res.json({
      message: 'Contact API is working',
      status: 'active'
    });
  } catch (error) {
    res.status(500).json({ error: 'Contact service unavailable' });
  }
});

// POST /api/contact - Submit new contact form
router.post('/', contactValidation, validate, async (req, res) => {
  try {
    // Check for duplicate submissions (same email within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingContact = await Contact.findOne({
      email: req.body.email,
      createdAt: { $gte: twentyFourHoursAgo }
    });

    if (existingContact) {
      return res.status(400).json({
        error: 'You have already submitted a contact form in the last 24 hours. Please wait before submitting again.'
      });
    }

    // Create contact
    const contact = new Contact(req.body);
    await contact.save();

    // Send confirmation email to user
    try {
      const transport = createTransport();

      const userMailOptions = {
        from: process.env.EMAIL_USER,
        to: contact.email,
        subject: 'Thank you for contacting RBSH Studio',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank you for reaching out!</h2>
            <p>Dear ${contact.name},</p>
            <p>We have received your inquiry and appreciate your interest in our services.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Your Inquiry Details:</h3>
              <p><strong>Organization:</strong> ${contact.organization}</p>
              <p><strong>Services of Interest:</strong></p>
              <ul>
                ${contact.services.map(service => `<li>${service}</li>`).join('')}
              </ul>
              ${contact.website ? `<p><strong>Website:</strong> <a href="${contact.website}">${contact.website}</a></p>` : ''}
            </div>
            <p>Our team will review your requirements and get back to you within 1-2 business days.</p>
            <p>In the meantime, feel free to explore our portfolio and case studies on our website.</p>
            <p>Best regards,<br>RBSH Studio Team</p>
          </div>
        `
      };

      await transporter.sendMail(userMailOptions);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    // Send notification email to admin
    try {
      const transporter = createTransporter();

      const adminMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Contact Form Submission - ${contact.organization}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Contact Details:</h3>
              <p><strong>Name:</strong> ${contact.name}</p>
              <p><strong>Organization:</strong> ${contact.organization}</p>
              <p><strong>Email:</strong> <a href="mailto:${contact.email}">${contact.email}</a></p>
              <p><strong>Phone:</strong> <a href="tel:${contact.number}">${contact.number}</a></p>
              ${contact.website ? `<p><strong>Website:</strong> <a href="${contact.website}">${contact.website}</a></p>` : ''}
            </div>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
              <h4>Services of Interest:</h4>
              <ul>
                ${contact.services.map(service => `<li>${service}</li>`).join('')}
              </ul>
            </div>
            <p>Please follow up with this lead in the admin panel.</p>
            <p><strong>Contact ID:</strong> ${contact._id}</p>
          </div>
        `
      };

      await transporter.sendMail(adminMailOptions);
    } catch (emailError) {
      console.error('Error sending admin notification email:', emailError);
    }

    res.status(201).json({
      message: 'Contact form submitted successfully. We will get back to you soon!',
      contactId: contact._id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// PUT /api/contact/admin/:id - Update contact (admin only)
router.put('/admin/:id', auth, async (req, res) => {
  try {
    const { status, notes, assignedTo, followUpDate, priority } = req.body;

    const validStatuses = ['new', 'contacted', 'in-progress', 'completed', 'closed'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (followUpDate) updateData.followUpDate = new Date(followUpDate);
    if (priority) updateData.priority = priority;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      message: 'Contact updated successfully',
      contact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contact/admin/:id - Delete contact (admin only)
router.delete('/admin/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;