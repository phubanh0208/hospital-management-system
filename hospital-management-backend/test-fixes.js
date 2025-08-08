const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test data - Updated to match auth service schema with timestamp for uniqueness
const timestamp = Date.now();
const testUser = {
  username: `testuser${timestamp}`,
  email: `testuser${timestamp}@hospital.com`,
  password: 'TestPass123!',
  role: 'doctor',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '1234567890'
  }
};

let authToken = '';

async function testUserRegistration() {
  try {
    console.log('\n🔑 Testing User Registration...');
    const response = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    console.log('✅ Registration successful:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    console.log('Registration data sent:', JSON.stringify(testUser, null, 2));
    if (error.response?.data?.details) {
      console.log('Validation errors:', error.response.data.details);
    }
    return false;
  }
}

async function testUserLogin() {
  try {
    console.log('\n🔓 Testing User Login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: testUser.username,
      password: testUser.password
    });
    
    authToken = response.data.data.accessToken;
    console.log('✅ Login successful, token received');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testPatientCreation() {
  try {
    console.log('\n👤 Testing Patient Creation (Fixed UUID issue)...');
    const timestamp = Date.now();
    const patientData = {
      fullName: 'Jane Smith',
      dateOfBirth: '1993-01-15',
      gender: 'female',
      phone: `+8498765${timestamp.toString().slice(-4)}`, // Correct 8-digit format
      email: `jane.smith.${timestamp}@email.com`,
      address: {
        street: '123 Main Street',
        ward: 'Ward 1',
        district: 'District 1',
        city: 'Ho Chi Minh City',
        zipCode: '700000'
      },
      emergencyContact: {
        name: 'John Smith',
        phone: '+84123456789',
        relationship: 'Husband',
        address: '123 Main Street'
      }
    };

    const response = await axios.post(`${API_BASE_URL}/patients`, patientData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Patient created successfully:', response.data.patient?.fullName || response.data.data?.fullName || 'Patient created');
    console.log('Full response:', JSON.stringify(response.data, null, 2));
    return response.data.patient || response.data.data;
  } catch (error) {
    console.log('❌ Patient creation failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.log('Validation errors:', error.response.data.details);
    }
    return null;
  }
}

async function testPrescriptionService() {
  try {
    console.log('\n💊 Testing Prescription Service (Fixed DB connection)...');
    const response = await axios.get(`${API_BASE_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Prescription service working:', response.data.message || 'Connected successfully');
    return true;
  } catch (error) {
    console.log('❌ Prescription service failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testNotificationService() {
  try {
    console.log('\n🔔 Testing Notification Service (Fixed user context)...');
    const notificationData = {
      recipient_user_id: '00000000-0000-4000-8000-000000000000', // Valid UUID format
      recipient_type: 'user', // Required field that was missing!
      type: 'appointment',
      title: 'Test Notification',
      message: 'This is a test notification from the API test'
    };

    const response = await axios.post(`${API_BASE_URL}/notifications`, notificationData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Notification service working:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ Notification service failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.log('Validation errors:', error.response.data.details);
    }
    return false;
  }
}

async function runTests() {
  console.log('🏥 Hospital Management System - API Tests After Fixes');
  console.log('=====================================================');
  
  // Test registration and login first
  const registrationOk = await testUserRegistration();
  if (!registrationOk) return;
  
  const loginOk = await testUserLogin();
  if (!loginOk) return;
  
  // Test the three fixed services
  const results = await Promise.allSettled([
    testPatientCreation(),
    testPrescriptionService(), 
    testNotificationService()
  ]);
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log('🔑 Authentication:', loginOk ? '✅ PASS' : '❌ FAIL');
  console.log('👤 Patient Service:', results[0].status === 'fulfilled' && results[0].value ? '✅ PASS' : '❌ FAIL');
  console.log('💊 Prescription Service:', results[1].status === 'fulfilled' && results[1].value ? '✅ PASS' : '❌ FAIL');
  console.log('🔔 Notification Service:', results[2].status === 'fulfilled' && results[2].value ? '✅ PASS' : '❌ FAIL');
  
  const passCount = [loginOk, ...(results.map(r => r.status === 'fulfilled' && r.value))].filter(Boolean).length;
  console.log(`\n🎯 Overall Result: ${passCount}/4 tests passed`);
  
  if (passCount === 4) {
    console.log('\n🎉 All fixes are working correctly! Hospital Management System is ready.');
  } else {
    console.log('\n⚠️  Some issues remain. Please check the failed services above.');
  }
}

// Wait for services to be ready
setTimeout(runTests, 2000);
