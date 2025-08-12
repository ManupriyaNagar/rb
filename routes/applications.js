const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const { auth } = require('../middleware/auth');
const { applicationValidation, validate } = require('../middleware/validation');
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

// GET /api/applications/admin - Get all applications (admin only)
router.get('/admin', auth, async (req, res) => {
  try {
    const { 
      jobId, 
      status, 
      page = 1, 
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (status && status !== 'all') filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get applications with job details
    const applications = await Application.find(filter)
      .populate('jobId', 'title department location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Application.countDocuments(filter);

    // Add id field for frontend compatibility
    const applicationsWithId = applications.map(app => ({
      ...app,
      id: app._id.toString()
    }));

    res.json({
      applications: applicationsWithId,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PUT /api/applications/admin/:id - Update application status (admin only)
router.put('/admin/:id', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status) {
      updateData.reviewedBy = req.admin.username;
      updateData.reviewedAt = new Date();
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('jobId');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Send status update email to applicant
    if (status && ['shortlisted', 'rejected', 'hired'].includes(status)) {
      try {
        const transporter = createTransporter();
        
        let subject, message;
        switch (status) {
          case 'shortlisted':
            subject = `Application Update - ${application.jobId.title}`;
            message = `
              <p>Great news! Your application for the <strong>${application.jobId.title}</strong> position has been shortlisted.</p>
              <p>Our team will contact you soon to discuss the next steps in the hiring process.</p>
            `;
            break;
          case 'rejected':
            subject = `Application Update - ${application.jobId.title}`;
            message = `
              <p>Thank you for your interest in the <strong>${application.jobId.title}</strong> position.</p>
              <p>After careful consideration, we have decided to move forward with other candidates at this time.</p>
              <p>We encourage you to apply for future opportunities that match your skills and experience.</p>
            `;
            break;
          case 'hired':
            subject = `Congratulations - ${application.jobId.title}`;
            message = `
              <p>Congratulations! We are pleased to offer you the <strong>${application.jobId.title}</strong> position.</p>
              <p>Our HR team will contact you shortly with the next steps and offer details.</p>
            `;
            break;
        }

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: application.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Application Status Update</h2>
              <p>Dear ${application.name},</p>
              ${message}
              <p>Best regards,<br>RBSH Studio Team</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }

    res.json({
      message: 'Application updated successfully',
      application: {
        ...application.toObject(),
        id: application._id.toString()
      }
    });
  } catch (error) {
    console.error('Error updating application:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// GET /api/applications - Get all applications (admin only) - legacy endpoint
router.get('/', auth, async (req, res) => {
  try {
    const { 
      jobId, 
      status, 
      page = 1, 
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (status && status !== 'all') filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get applications with job details
    const applications = await Application.find(filter)
      .populate('jobId', 'title department location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Application.countDocuments(filter);

    res.json({
      applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + applications.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/stats - Get application statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentApplications = await Application.find()
      .populate('jobId', 'title')
      .sort('-createdAt')
      .limit(5)
      .lean();

    const jobApplicationStats = await Application.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      {
        $group: {
          _id: '$job.title',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      statusStats: stats,
      recentApplications,
      jobApplicationStats,
      total: await Application.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ error: 'Failed to fetch application statistics' });
  }
});

// GET /api/applications/:id - Get single application (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('jobId')
      .lean();
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /api/applications - Submit new application
router.post('/', applicationValidation, validate, async (req, res) => {
  try {
    // Check if job exists and is active
    const job = await Job.findById(req.body.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'active') {
      return res.status(400).json({ error: 'This job is no longer accepting applications' });
    }

    // Check if user already applied for this job
    const existingApplication = await Application.findOne({
      jobId: req.body.jobId,
      email: req.body.email
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this position' });
    }

    // Create application
    const application = new Application(req.body);
    await application.save();

    // Send confirmation email to applicant
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: application.email,
        subject: `Application Received - ${job.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank you for your application!</h2>
            <p>Dear ${application.name},</p>
            <p>We have received your application for the <strong>${job.title}</strong> position in our ${job.department} department.</p>
            <p>Our team will review your application and get back to you within 5-7 business days.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Application Details:</h3>
              <p><strong>Position:</strong> ${job.title}</p>
              <p><strong>Department:</strong> ${job.department}</p>
              <p><strong>Location:</strong> ${job.location}</p>
              <p><strong>Application ID:</strong> ${application._id}</p>
            </div>
            <p>Best regards,<br>RBSH Studio Team</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the application if email fails
    }

    // Send notification email to admin
    try {
      const transporter = createTransporter();
      
      const adminMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Job Application - ${job.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Job Application Received</h2>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Application Details:</h3>
              <p><strong>Position:</strong> ${job.title}</p>
              <p><strong>Applicant:</strong> ${application.name}</p>
              <p><strong>Email:</strong> ${application.email}</p>
              <p><strong>Phone:</strong> ${application.phone || 'Not provided'}</p>
              <p><strong>Experience:</strong> ${application.experience || 'Not specified'}</p>
              <p><strong>Resume:</strong> <a href="${application.resume}">View Resume</a></p>
              ${application.portfolio ? `<p><strong>Portfolio:</strong> <a href="${application.portfolio}">View Portfolio</a></p>` : ''}
            </div>
            <p><strong>Cover Letter:</strong></p>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
              ${application.coverLetter.replace(/\n/g, '<br>')}
            </div>
            <p>Please review the application in the admin panel.</p>
          </div>
        `
      };

      await transporter.sendMail(adminMailOptions);
    } catch (emailError) {
      console.error('Error sending admin notification email:', emailError);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: application._id
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// PUT /api/applications/:id - Update application status (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status) {
      updateData.reviewedBy = req.admin.username;
      updateData.reviewedAt = new Date();
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('jobId');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Send status update email to applicant
    if (status && ['shortlisted', 'rejected', 'hired'].includes(status)) {
      try {
        const transporter = createTransporter();
        
        let subject, message;
        switch (status) {
          case 'shortlisted':
            subject = `Application Update - ${application.jobId.title}`;
            message = `
              <p>Great news! Your application for the <strong>${application.jobId.title}</strong> position has been shortlisted.</p>
              <p>Our team will contact you soon to discuss the next steps in the hiring process.</p>
            `;
            break;
          case 'rejected':
            subject = `Application Update - ${application.jobId.title}`;
            message = `
              <p>Thank you for your interest in the <strong>${application.jobId.title}</strong> position.</p>
              <p>After careful consideration, we have decided to move forward with other candidates at this time.</p>
              <p>We encourage you to apply for future opportunities that match your skills and experience.</p>
            `;
            break;
          case 'hired':
            subject = `Congratulations - ${application.jobId.title}`;
            message = `
              <p>Congratulations! We are pleased to offer you the <strong>${application.jobId.title}</strong> position.</p>
              <p>Our HR team will contact you shortly with the next steps and offer details.</p>
            `;
            break;
        }

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: application.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Application Status Update</h2>
              <p>Dear ${application.name},</p>
              ${message}
              <p>Best regards,<br>RBSH Studio Team</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }

    res.json({
      message: 'Application updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/applications/:id - Delete application (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

module.exports = router;