const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const Job = require('../models/Job');

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/openings', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create default admin user
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new Admin({
        username: 'admin',
        email: 'admin@rbshstudio.com',
        password: 'admin123',
        role: 'super-admin'
      });
      await admin.save();
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Create sample jobs
    const existingJobs = await Job.countDocuments();
    if (existingJobs === 0) {
      const sampleJobs = [
        {
          title: 'Senior Frontend Developer',
          department: 'Engineering',
          location: 'Remote',
          type: 'Full-time',
          experience: '3-5 years',
          description: 'We are looking for a skilled Frontend Developer to join our dynamic team. You will be responsible for developing user-facing web applications using modern JavaScript frameworks.',
          requirements: [
            'Bachelor\'s degree in Computer Science or related field',
            '3+ years of experience with React.js and Next.js',
            'Strong knowledge of HTML5, CSS3, and JavaScript ES6+',
            'Experience with responsive design and cross-browser compatibility',
            'Familiarity with version control systems (Git)',
            'Understanding of RESTful APIs and GraphQL'
          ],
          benefits: [
            'Competitive salary and equity package',
            'Health, dental, and vision insurance',
            'Flexible working hours and remote work options',
            'Professional development opportunities',
            'Modern equipment and tools',
            'Team building activities and company events'
          ],
          status: 'active'
        },
        {
          title: 'UI/UX Designer',
          department: 'Design',
          location: 'New York, NY',
          type: 'Full-time',
          experience: '2-4 years',
          description: 'Join our creative team as a UI/UX Designer and help create intuitive and beautiful user experiences for our digital products.',
          requirements: [
            'Bachelor\'s degree in Design, HCI, or related field',
            '2+ years of experience in UI/UX design',
            'Proficiency in design tools (Figma, Sketch, Adobe Creative Suite)',
            'Strong understanding of user-centered design principles',
            'Experience with prototyping and wireframing',
            'Knowledge of design systems and component libraries'
          ],
          benefits: [
            'Competitive salary',
            'Health and wellness benefits',
            'Creative freedom and autonomy',
            'Learning and development budget',
            'Flexible PTO policy',
            'Modern office space in Manhattan'
          ],
          status: 'active'
        },
        {
          title: 'Digital Marketing Specialist',
          department: 'Marketing',
          location: 'Los Angeles, CA',
          type: 'Full-time',
          experience: '1-3 years',
          description: 'We\'re seeking a creative and data-driven Digital Marketing Specialist to develop and execute marketing campaigns across various digital channels.',
          requirements: [
            'Bachelor\'s degree in Marketing, Communications, or related field',
            '1+ years of experience in digital marketing',
            'Experience with Google Ads, Facebook Ads, and other PPC platforms',
            'Knowledge of SEO/SEM best practices',
            'Proficiency in analytics tools (Google Analytics, etc.)',
            'Strong written and verbal communication skills'
          ],
          benefits: [
            'Competitive salary with performance bonuses',
            'Comprehensive health benefits',
            'Professional development opportunities',
            'Flexible work arrangements',
            'Marketing conference attendance',
            'Creative and collaborative work environment'
          ],
          status: 'active'
        },
        {
          title: 'Backend Developer',
          department: 'Engineering',
          location: 'Remote',
          type: 'Full-time',
          experience: '2-5 years',
          description: 'Looking for a Backend Developer to build and maintain server-side applications and APIs that power our platform.',
          requirements: [
            'Bachelor\'s degree in Computer Science or equivalent experience',
            '2+ years of experience with Node.js and Express.js',
            'Strong knowledge of databases (MongoDB, PostgreSQL)',
            'Experience with RESTful API design and development',
            'Understanding of cloud platforms (AWS, GCP, or Azure)',
            'Knowledge of containerization (Docker) and CI/CD pipelines'
          ],
          benefits: [
            'Competitive salary and stock options',
            'Full health, dental, and vision coverage',
            'Remote work flexibility',
            'Home office setup allowance',
            'Continuous learning opportunities',
            'Annual team retreats'
          ],
          status: 'active'
        },
        {
          title: 'Content Creator',
          department: 'Marketing',
          location: 'Hybrid - Miami, FL',
          type: 'Full-time',
          experience: '1-2 years',
          description: 'Join our marketing team as a Content Creator to develop engaging content across social media platforms and marketing channels.',
          requirements: [
            'Bachelor\'s degree in Marketing, Communications, or related field',
            '1+ years of content creation experience',
            'Proficiency in content creation tools (Canva, Adobe Creative Suite)',
            'Strong writing and storytelling skills',
            'Understanding of social media platforms and trends',
            'Basic video editing and photography skills'
          ],
          benefits: [
            'Competitive salary',
            'Health and wellness benefits',
            'Hybrid work model',
            'Creative freedom',
            'Professional development budget',
            'Access to latest creative tools and software'
          ],
          status: 'active'
        },
        {
          title: 'DevOps Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          type: 'Full-time',
          experience: '3-6 years',
          description: 'We\'re looking for a DevOps Engineer to help us build and maintain our infrastructure, automate deployments, and ensure system reliability.',
          requirements: [
            'Bachelor\'s degree in Computer Science or related field',
            '3+ years of experience in DevOps or Site Reliability Engineering',
            'Strong knowledge of cloud platforms (AWS, GCP, Azure)',
            'Experience with containerization (Docker, Kubernetes)',
            'Proficiency in Infrastructure as Code (Terraform, CloudFormation)',
            'Knowledge of monitoring and logging tools'
          ],
          benefits: [
            'Highly competitive salary and equity',
            'Premium health, dental, and vision insurance',
            'Flexible working arrangements',
            'Professional certification reimbursement',
            'State-of-the-art equipment',
            'Collaborative and innovative work environment'
          ],
          status: 'active'
        }
      ];

      await Job.insertMany(sampleJobs);
      console.log('Sample jobs created');
    } else {
      console.log('Jobs already exist in database');
    }

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();