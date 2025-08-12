# RBSH Studio Backend API

A comprehensive backend API for managing job openings, applications, contact forms, and admin functionality.

## Features

- **Job Management**: Create, read, update, and delete job openings
- **Application System**: Handle job applications with email notifications
- **Contact Management**: Process contact form submissions
- **Admin Panel**: Secure admin authentication and dashboard
- **Email Notifications**: Automated emails for applications and contacts
- **Data Validation**: Comprehensive input validation and sanitization
- **Security**: JWT authentication, password hashing, rate limiting

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer
- **Validation**: express-validator
- **Security**: CORS, cookie-parser

## API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs (with filtering)
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create job (admin only)
- `PUT /api/jobs/:id` - Update job (admin only)
- `DELETE /api/jobs/:id` - Delete job (admin only)
- `GET /api/jobs/stats` - Get job statistics (admin only)

### Applications
- `GET /api/applications` - Get all applications (admin only)
- `GET /api/applications/:id` - Get single application (admin only)
- `POST /api/applications` - Submit job application
- `PUT /api/applications/:id` - Update application status (admin only)
- `DELETE /api/applications/:id` - Delete application (admin only)
- `GET /api/applications/stats` - Get application statistics (admin only)

### Contact
- `GET /api/contact` - Get all contacts (admin only)
- `GET /api/contact/:id` - Get single contact (admin only)
- `POST /api/contact` - Submit contact form
- `PUT /api/contact/:id` - Update contact (admin only)
- `DELETE /api/contact/:id` - Delete contact (admin only)
- `GET /api/contact/stats` - Get contact statistics (admin only)

### Admin & Auth
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile
- `GET /api/admin/dashboard` - Get dashboard statistics
- `POST /api/admin/create` - Create new admin (super-admin only)
- `GET /api/admin/verify` - Verify JWT token

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see .env file)

4. Seed the database with initial data:
   ```bash
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Make sure to update the `.env` file with your actual values:

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`: Email configuration
- `ADMIN_EMAIL`: Admin email for notifications
- `FRONTEND_URL`: Frontend URL for CORS

## Default Admin Credentials

After running the seed script:
- **Username**: admin
- **Password**: admin123

## Database Models

### Job
- title, department, location, type, experience
- description, requirements, benefits
- status, salary, applicationDeadline
- timestamps

### Application
- jobId (ref to Job), name, email, phone
- resume, portfolio, experience, coverLetter
- status, notes, reviewedBy, reviewedAt
- timestamps

### Contact
- name, organization, email, number, website
- services, status, notes, assignedTo
- followUpDate, priority
- timestamps

### Admin
- username, email, password, role
- isActive, lastLogin, loginAttempts, lockUntil
- timestamps

## Security Features

- Password hashing with bcryptjs
- JWT authentication with HTTP-only cookies
- Account lockout after failed login attempts
- Input validation and sanitization
- CORS configuration
- Rate limiting protection

## Email Features

- Application confirmation emails
- Admin notification emails
- Status update notifications
- Contact form confirmations
- HTML email templates

## Usage Examples

### Get Jobs with Filtering
```bash
curl "http://localhost:5001/api/jobs?department=Engineering&location=Remote&page=1&limit=10"
```

### Submit Job Application
```bash
curl -X POST http://localhost:5001/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "resume": "https://drive.google.com/file/d/...",
    "coverLetter": "I am very interested in this position..."
  }'
```

### Submit Contact Form
```bash
curl -X POST http://localhost:5001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "organization": "Tech Corp",
    "email": "jane@techcorp.com",
    "number": "+1234567890",
    "website": "https://techcorp.com",
    "services": ["Web Development", "SEO"]
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Development

### Running the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Seed database with sample data
npm run seed
```

### Project Structure
```
backend/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── scripts/         # Utility scripts
├── .env             # Environment variables
├── server.js        # Main server file
└── package.json     # Dependencies and scripts
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a production MongoDB instance
3. Configure proper email settings
4. Set up SSL/TLS certificates
5. Use a reverse proxy (nginx)
6. Configure proper logging and monitoring
7. Set up backup strategies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License