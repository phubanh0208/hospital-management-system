#!/usr/bin/env node

/**
 * Setup Admin User Script
 * 
 * This script creates the initial admin user via API calls
 * instead of hardcoding in database initialization.
 * 
 * Usage:
 *   node scripts/setup-admin.js
 *   
 * Environment Variables:
 *   - AUTH_SERVICE_URL: Auth service URL (default: http://localhost:3001)
 *   - ADMIN_USERNAME: Admin username (default: admin)
 *   - ADMIN_EMAIL: Admin email (default: admin@hospital.com)
 *   - ADMIN_PASSWORD: Admin password (default: Admin123!@#)
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@hospital.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!@#',
  maxRetries: 5,
  retryDelay: 2000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hospital-Setup-Script/1.0',
        ...options.headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: { message: responseData },
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function waitForService(url, maxRetries = 5, delay = 2000) {
  log(`🔍 Checking if auth service is available at ${url}...`, colors.blue);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await makeRequest(`${url}/health`, { method: 'GET' });
      
      if (response.statusCode === 200) {
        log(`✅ Auth service is ready!`, colors.green);
        return true;
      }
      
      log(`⏳ Service not ready (attempt ${i + 1}/${maxRetries}), retrying in ${delay/1000}s...`, colors.yellow);
    } catch (error) {
      log(`⏳ Service not available (attempt ${i + 1}/${maxRetries}): ${error.message}`, colors.yellow);
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

async function checkAdminExists() {
  try {
    log(`🔍 Checking if admin user already exists...`, colors.blue);
    
    // Try to login with admin credentials
    const response = await makeRequest(`${config.authServiceUrl}/api/auth/login`, {
      method: 'POST'
    }, {
      username: config.adminUsername,
      password: config.adminPassword
    });
    
    if (response.statusCode === 200 && response.data.success) {
      log(`✅ Admin user already exists and can login successfully`, colors.green);
      return true;
    }
    
    log(`ℹ️  Admin user does not exist or credentials are different`, colors.cyan);
    return false;
  } catch (error) {
    log(`ℹ️  Admin user does not exist: ${error.message}`, colors.cyan);
    return false;
  }
}

async function createAdminUser() {
  try {
    log(`🔧 Creating admin user...`, colors.blue);
    
    const adminData = {
      username: config.adminUsername,
      email: config.adminEmail,
      password: config.adminPassword,
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        phone: '0900000000'
      }
    };
    
    const response = await makeRequest(`${config.authServiceUrl}/api/auth/register`, {
      method: 'POST'
    }, adminData);
    
    if (response.statusCode === 201 && response.data.success) {
      log(`✅ Admin user created successfully!`, colors.green);
      log(`   Username: ${config.adminUsername}`, colors.cyan);
      log(`   Email: ${config.adminEmail}`, colors.cyan);
      log(`   Role: admin`, colors.cyan);
      return response.data.data.user;
    } else {
      throw new Error(`Failed to create admin user: ${response.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    log(`❌ Failed to create admin user: ${error.message}`, colors.red);
    throw error;
  }
}

async function verifyAdminLogin() {
  try {
    log(`🔐 Verifying admin login...`, colors.blue);
    
    const response = await makeRequest(`${config.authServiceUrl}/api/auth/login`, {
      method: 'POST'
    }, {
      username: config.adminUsername,
      password: config.adminPassword
    });
    
    if (response.statusCode === 200 && response.data.success) {
      log(`✅ Admin login verification successful!`, colors.green);
      log(`   Access token received: ${response.data.data.accessToken ? 'Yes' : 'No'}`, colors.cyan);
      return true;
    } else {
      throw new Error(`Login verification failed: ${response.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    log(`❌ Admin login verification failed: ${error.message}`, colors.red);
    throw error;
  }
}

async function main() {
  try {
    log(`🚀 Hospital Management System - Admin Setup Script`, colors.magenta);
    log(`================================================`, colors.magenta);
    log(`Auth Service URL: ${config.authServiceUrl}`, colors.cyan);
    log(`Admin Username: ${config.adminUsername}`, colors.cyan);
    log(`Admin Email: ${config.adminEmail}`, colors.cyan);
    log(`================================================`, colors.magenta);
    
    // Step 1: Wait for auth service to be ready
    const serviceReady = await waitForService(config.authServiceUrl, config.maxRetries, config.retryDelay);
    if (!serviceReady) {
      throw new Error('Auth service is not available. Please ensure the service is running.');
    }
    
    // Step 2: Check if admin already exists
    const adminExists = await checkAdminExists();
    if (adminExists) {
      log(`🎉 Admin setup is already complete!`, colors.green);
      return;
    }
    
    // Step 3: Create admin user
    const adminUser = await createAdminUser();
    
    // Step 4: Verify admin can login
    await verifyAdminLogin();
    
    log(`🎉 Admin setup completed successfully!`, colors.green);
    log(`================================================`, colors.magenta);
    log(`✅ Admin user created and verified`, colors.green);
    log(`✅ Login credentials are working`, colors.green);
    log(`✅ System is ready for use`, colors.green);
    log(`================================================`, colors.magenta);
    
  } catch (error) {
    log(`❌ Admin setup failed: ${error.message}`, colors.red);
    log(`💡 Please check:`, colors.yellow);
    log(`   - Auth service is running on ${config.authServiceUrl}`, colors.yellow);
    log(`   - Database is properly initialized`, colors.yellow);
    log(`   - Environment variables are correct`, colors.yellow);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log(`\n🛑 Setup interrupted by user`, colors.yellow);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log(`\n🛑 Setup terminated`, colors.yellow);
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, config };
