const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

const testAPI = async () => {
  console.log('🚀 Testing RBSH Studio Backend API...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test getting jobs
    console.log('\n2. Testing jobs endpoint...');
    const jobsResponse = await axios.get(`${BASE_URL}/jobs`);
    console.log('✅ Jobs fetched:', jobsResponse.data.jobs?.length || 0, 'jobs found');

    // Test admin login
    console.log('\n3. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Admin login successful');
    
    const token = loginResponse.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Test dashboard
    console.log('\n4. Testing admin dashboard...');
    const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: authHeaders
    });
    console.log('✅ Dashboard data fetched');

    // Test job stats
    console.log('\n5. Testing job statistics...');
    const jobStatsResponse = await axios.get(`${BASE_URL}/jobs/stats`, {
      headers: authHeaders
    });
    console.log('✅ Job statistics fetched');

    // Test application stats
    console.log('\n6. Testing application statistics...');
    const appStatsResponse = await axios.get(`${BASE_URL}/applications/stats`, {
      headers: authHeaders
    });
    console.log('✅ Application statistics fetched');

    // Test contact stats
    console.log('\n7. Testing contact statistics...');
    const contactStatsResponse = await axios.get(`${BASE_URL}/contact/stats`, {
      headers: authHeaders
    });
    console.log('✅ Contact statistics fetched');

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Jobs available: ${jobsResponse.data.jobs?.length || 0}`);
    console.log(`- Total applications: ${appStatsResponse.data.total || 0}`);
    console.log(`- Total contacts: ${contactStatsResponse.data.total || 0}`);

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running on port 5001');
      console.log('   Run: npm run dev');
    }
  }
};

// Add axios to package.json if not present
const addAxiosIfNeeded = async () => {
  try {
    require('axios');
  } catch (error) {
    console.log('📦 Installing axios for testing...');
    const { execSync } = require('child_process');
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ Axios installed\n');
  }
};

const runTests = async () => {
  await addAxiosIfNeeded();
  await testAPI();
};

runTests();