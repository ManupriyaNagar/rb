const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Job validation rules
const jobValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('type').isIn(['Full-time', 'Part-time', 'Contract', 'Internship']).withMessage('Invalid job type'),
  body('experience').trim().notEmpty().withMessage('Experience is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('requirements').isArray({ min: 1 }).withMessage('At least one requirement is needed'),
  body('benefits').isArray({ min: 1 }).withMessage('At least one benefit is needed'),
  body('status').optional().isIn(['active', 'inactive', 'closed']).withMessage('Invalid status')
];

// Application validation rules
const applicationValidation = [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('resume').isURL().withMessage('Valid resume URL is required'),
  body('portfolio').optional().isURL().withMessage('Portfolio must be a valid URL'),
  body('experience').optional().trim(),
  body('coverLetter').trim().isLength({ min: 100 }).withMessage('Cover letter must be at least 100 characters')
];

// Contact validation rules
const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('number').trim().notEmpty().withMessage('Phone number is required'),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
  body('services').isArray({ min: 1 }).withMessage('At least one service must be selected')
];

// Admin validation rules
const adminValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Login validation rules
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = {
  validate,
  jobValidation,
  applicationValidation,
  contactValidation,
  adminValidation,
  loginValidation
};