const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  resume: {
    type: String,
    required: true,
    trim: true
  },
  portfolio: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    trim: true
  },
  coverLetter: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  reviewedBy: {
    type: String
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ email: 1 });
applicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);