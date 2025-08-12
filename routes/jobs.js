const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { auth, optionalAuth } = require('../middleware/auth');
const { jobValidation, validate } = require('../middleware/validation');

// GET /api/jobs/admin/all - Get all jobs for admin (with filtering)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const { 
      department, 
      location, 
      type, 
      status = 'all',
      page = 1, 
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (location && location !== 'all') filter.location = location;
    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'all') filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get jobs with pagination
    const jobs = await Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Job.countDocuments(filter);

    // Add id field for frontend compatibility
    const jobsWithId = jobs.map(job => ({
      ...job,
      id: job._id.toString()
    }));

    res.json({
      jobs: jobsWithId,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/admin/stats - Get job statistics (admin only)
router.get('/admin/stats', auth, async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'active' });
    
    // Get application count from applications collection
    const Application = require('../models/Application');
    const totalApplications = await Application.countDocuments();
    const recentApplications = await Application.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      }
    ]);

    const locationStats = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalJobs,
      activeJobs,
      totalApplications,
      recentApplications,
      statusStats: stats,
      departmentStats,
      locationStats
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({ error: 'Failed to fetch job statistics' });
  }
});

// DELETE /api/jobs/admin/:id - Delete job (admin only)
router.delete('/admin/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Also delete related applications
    const Application = require('../models/Application');
    await Application.deleteMany({ jobId: req.params.id });

    res.json({ message: 'Job and related applications deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID' });
    }
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// GET /api/jobs - Get all jobs with filtering (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { 
      department, 
      location, 
      type, 
      status = 'active',
      page = 1, 
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (location && location !== 'all') filter.location = location;
    if (type && type !== 'all') filter.type = type;
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get jobs with pagination
    const jobs = await Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Job.countDocuments(filter);

    // Add id field for frontend compatibility
    const jobsWithId = jobs.map(job => ({
      ...job,
      id: job._id.toString()
    }));

    res.json({
      jobs: jobsWithId,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + jobs.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/stats - Get job statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      }
    ]);

    const locationStats = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      departmentStats,
      locationStats,
      total: await Job.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({ error: 'Failed to fetch job statistics' });
  }
});

// GET /api/jobs/:id - Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Add id field for frontend compatibility
    const jobWithId = {
      ...job,
      id: job._id.toString()
    };

    res.json(jobWithId);
  } catch (error) {
    console.error('Error fetching job:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID' });
    }
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs - Create new job (admin only)
router.post('/', auth, jobValidation, validate, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      createdBy: req.admin.username
    };

    const job = new Job(jobData);
    await job.save();

    const jobWithId = {
      ...job.toObject(),
      id: job._id.toString()
    };

    res.status(201).json({
      message: 'Job created successfully',
      job: jobWithId
    });
  } catch (error) {
    console.error('Error creating job:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// PUT /api/jobs/:id - Update job (admin only)
router.put('/:id', auth, jobValidation, validate, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobWithId = {
      ...job,
      id: job._id.toString()
    };

    res.json({
      message: 'Job updated successfully',
      job: jobWithId
    });
  } catch (error) {
    console.error('Error updating job:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/jobs/:id - Delete job (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID' });
    }
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;