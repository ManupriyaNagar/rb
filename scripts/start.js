#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting RBSH Studio Backend Setup...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Please create a .env file with the required environment variables.');
  console.log('   See .env.example for reference.\n');
  process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Dependencies installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Check if database needs seeding
console.log('🌱 Checking if database needs seeding...');
try {
  execSync('npm run seed', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Database seeded successfully\n');
} catch (error) {
  console.log('⚠️  Database seeding failed or already completed\n');
}

// Start the server
console.log('🎯 Starting the development server...');
console.log('📍 Server will be available at: http://localhost:5001');
console.log('📚 API documentation: http://localhost:5001/api/health');
console.log('👤 Default admin credentials: admin / admin123\n');

try {
  execSync('npm run dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('❌ Failed to start server');
  process.exit(1);
}