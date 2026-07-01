const { body, validationResult } = require('express-validator');

// Validation rules for patient registration submission
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Patient name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only alphabets and spaces'),
  
  body('dob')
    .trim()
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid ISO8601 date')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      if (dob > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
  
  body('gender')
    .trim()
    .notEmpty().withMessage('Gender is required')
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Phone number must be exactly 10 digits')
    .isNumeric().withMessage('Phone number must contain only numbers'),
  
  body('gov_id')
    .trim()
    .notEmpty().withMessage('Government ID (Aadhaar) is required')
    .isLength({ min: 12, max: 12 }).withMessage('Government ID (Aadhaar) must be exactly 12 digits')
    .isNumeric().withMessage('Aadhaar must contain only numbers'),
  
  body('purpose_of_visit')
    .trim()
    .notEmpty().withMessage('Purpose of visit is required')
    .isLength({ min: 3, max: 500 }).withMessage('Purpose of visit must be between 3 and 500 characters'),
  
  body('referral')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Referral must not exceed 100 characters'),
  
  body('appointment_date')
    .trim()
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Appointment date must be a valid ISO8601 date')
    .custom((value) => {
      const appt = new Date(value);
      const today = new Date();
      // Set to start of today for date comparison
      today.setHours(0, 0, 0, 0);
      appt.setHours(0, 0, 0, 0);
      if (appt < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),
];

// Validation rules for staff user registration
const validateStaffUser = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isIn(['RECEPTIONIST', 'ADMIN']).withMessage('Role must be RECEPTIONIST or ADMIN'),
];

// Middleware to check validation results and return formatted errors
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({ errors: formattedErrors });
  }
  next();
}

module.exports = {
  validateRegistration,
  validateStaffUser,
  checkValidation,
};
