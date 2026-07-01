const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const { verifyToken } = require('./middleware/authMiddleware');
const { validateRegistration, validateStaffUser, checkValidation } = require('./middleware/validationMiddleware');
const authController = require('./controllers/authController');
const regController = require('./controllers/registrationController');
const userController = require('./controllers/userController');
const { initCronJobs } = require('./utils/cronJobs');

const app = express();

// Initialize Cron Jobs
initCronJobs();

// Apply Global Middlewares
app.use(helmet({
  // Configure Content Security Policy to allow Swagger UI scripts
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
    },
  },
}));
app.use(cors({ origin: '*' })); // In production, restrict to frontend origin
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`HTTP ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Swagger Specification Object
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ASCAS QR-Based Patient Registration System API',
    version: '1.0.0',
    description: 'REST API documentation for ASCAS QR-Based Patient Registration Backend',
  },
  servers: [
    {
      url: '/api',
      description: 'API Server Path',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      RegistrationInput: {
        type: 'object',
        required: ['name', 'dob', 'gender', 'phone', 'gov_id', 'purpose_of_visit', 'appointment_date'],
        properties: {
          name: { type: 'string', example: 'Alice Johnson' },
          dob: { type: 'string', format: 'date', example: '1995-12-05' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], example: 'FEMALE' },
          phone: { type: 'string', example: '7654321098' },
          gov_id: { type: 'string', example: '123456789012' },
          purpose_of_visit: { type: 'string', example: 'Severe headache and migraine' },
          referral: { type: 'string', example: 'Dr. John Watson' },
          appointment_date: { type: 'string', format: 'date-time', example: '2026-07-03T09:00:00Z' },
        },
      },
    },
  },
  paths: {
    '/login': {
      post: {
        summary: 'Receptionist Login',
        description: 'Authenticates receptionist and issues JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/registration': {
      post: {
        summary: 'Public Patient Registration',
        description: 'Creates a pending patient registration from QR code flow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegistrationInput' },
            },
          },
        },
        responses: {
          201: { description: 'Registration submitted successfully' },
          400: { description: 'Validation errors' },
        },
      },
    },
    '/registration/pending': {
      get: {
        summary: 'Get Pending Registrations',
        description: 'Retrieves list of all pending registrations (JWT Protected)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Success' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/registration/approve/{tmp_id}': {
      post: {
        summary: 'Approve Patient Registration',
        description: 'Executes atomic transaction to approve record, copy to patient_details, and book appointment (JWT Protected)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tmp_id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  doctor_name: { type: 'string', example: 'Dr. Robert Carter (Cardiology)' },
                  visit_type: { type: 'string', example: 'First Consultation' },
                  appointment_date: { type: 'string', format: 'date-time' },
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  remarks: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Approved and appointment scheduled' },
          401: { description: 'Unauthorized' },
          500: { description: 'Transaction error' },
        },
      },
    },
    '/registration/reject/{tmp_id}': {
      post: {
        summary: 'Reject Patient Registration',
        description: 'Rejects registration and stores receptionist remarks (JWT Protected)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tmp_id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['remarks'],
                properties: {
                  remarks: { type: 'string', example: 'Incorrect Aadhaar detail entered' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rejected successfully' },
          400: { description: 'Validation errors' },
        },
      },
    },
    '/users/register': {
      post: {
        summary: 'Admin-only Staff User Registration',
        description: 'Creates a new receptionist or admin staff account (JWT Protected, ADMIN only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'name', 'role'],
                properties: {
                  username: { type: 'string', example: 'receptionist2' },
                  password: { type: 'string', example: 'securePassword123' },
                  name: { type: 'string', example: 'Bob Miller' },
                  role: { type: 'string', enum: ['RECEPTIONIST', 'ADMIN'], example: 'RECEPTIONIST' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Staff user created successfully' },
          400: { description: 'Validation errors' },
          403: { description: 'Forbidden. Requester is not an admin' },
        },
      },
    },
  },
};

// Swagger Docs Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'ASCAS QR Registration Backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Public Routes
app.post('/api/login', authController.login);
app.post('/api/registration', validateRegistration, checkValidation, regController.submitRegistration);
app.get('/api/registration/form', regController.getFormMetadata);
app.get('/api/master/doctors', regController.getDoctors);
app.get('/api/master/visit-types', regController.getVisitTypes);

// Internal Protected Routes (Requires valid JWT token)
app.get('/api/registration/pending', verifyToken, regController.getPendingRegistrations);
app.post('/api/registration/approve/:tmp_id', verifyToken, regController.approveRegistration);
app.post('/api/registration/reject/:tmp_id', verifyToken, regController.rejectRegistration);
app.post('/api/users/register', verifyToken, validateStaffUser, checkValidation, userController.registerStaff);
app.get('/api/users', verifyToken, userController.getStaffList);

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error: %s', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
