/**
 * Test script for notification retry system endpoints
 * 
 * This script tests the new admin endpoints for managing notification retries.
 * Run this after starting the notification service and API gateway.
 * 
 * Usage:
 *   node test-retry-endpoints.js
 * 
 * Prerequisites:
 *   - Notification service running on port 3005
 *   - API Gateway running on port 3000 (optional)
 *   - Valid admin JWT token
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3005/api/notifications'; // Direct to notification service
const GATEWAY_URL = 'http://localhost:3000/api/notifications'; // Through API gateway

// Mock admin JWT token - replace with real token for testing
const ADMIN_TOKEN = 'your-admin-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Test function to call an endpoint
 */
async function testEndpoint(name, method, url, data = null) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`📡 ${method.toUpperCase()} ${url}`);
    
    const config = { headers, method, url };
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || 'Network Error'}`);
    console.log(`💬 Message: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.data) {
      console.log(`📦 Error Response:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Notification Retry System Tests');
  console.log('=' .repeat(50));
  
  // Test 1: Get retry statistics
  await testEndpoint(
    'Get Retry Statistics',
    'GET',
    `${BASE_URL}/admin/retry-stats`
  );
  
  // Test 2: Send test notification
  await testEndpoint(
    'Send Test Notification', 
    'POST',
    `${BASE_URL}/admin/test-notification`,
    {
      type: 'test',
      channels: ['email'],
      recipient: 'test@example.com',
      subject: 'Test Notification',
      message: 'This is a test notification from the retry system test script.'
    }
  );
  
  // Test 3: Process retries manually
  await testEndpoint(
    'Process Retries Manually',
    'POST', 
    `${BASE_URL}/admin/process-retries`,
    { force: true }
  );
  
  // Test 4: Cleanup old retries
  await testEndpoint(
    'Cleanup Old Retries',
    'POST',
    `${BASE_URL}/admin/cleanup-retries`,
    { 
      olderThanDays: 7,
      includeFailedPermanently: true 
    }
  );
  
  console.log('\n🎯 Test Suite Complete');
  console.log('=' .repeat(50));
  
  // Also test via API Gateway (if available)
  console.log('\n🌐 Testing through API Gateway...');
  
  await testEndpoint(
    'Gateway: Get Retry Statistics',
    'GET',
    `${GATEWAY_URL}/admin/retry-stats`
  );
  
  console.log('\n✨ All tests completed!');
  console.log('📝 Note: Replace ADMIN_TOKEN with a real JWT token for actual testing');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };
