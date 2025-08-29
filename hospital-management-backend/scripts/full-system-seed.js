#!/usr/bin/env node

/**
 * Full System Seed Data Generator
 * 
 * This orchestrates the complete seed data generation process across all databases
 * in the correct order to maintain referential integrity.
 * 
 * Execution Order:
 * 1. Comprehensive seed (users, patients, appointments, prescriptions)
 * 2. Analytics seed (historical metrics based on existing data)
 * 
 * Usage: node full-system-seed.js
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🏥 Full Hospital Management System Seed Data Generator');
console.log('====================================================');
console.log('');
console.log('This script will generate complete demo data across all databases:');
console.log('- Auth Service: Users, profiles, doctor profiles');
console.log('- Patient Service: Patient records, medical history');
console.log('- Appointment Service: Appointments, doctor availability');
console.log('- Prescription Service: Prescriptions, medications');
console.log('- Analytics Service: Historical metrics and trends');
console.log('');

// Helper function to run scripts with proper output handling
function runScript(scriptName, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 ${description}...`);
    console.log('='.repeat(description.length + 4));
    
    const scriptPath = path.join(__dirname, scriptName);
    const child = exec(`node "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 10 });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${description} completed successfully\n`);
        resolve();
      } else {
        console.error(`\n❌ ${description} failed with exit code ${code}\n`);
        reject(new Error(`${scriptName} failed`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ Failed to start ${scriptName}:`, error.message);
      reject(error);
    });
  });
}

// Verification function
async function verifyPrerequisites() {
  console.log('🔍 Verifying prerequisites...');
  
  const checks = [
    { name: 'Node.js version', check: () => process.version },
    { name: 'Current directory', check: () => process.cwd() },
    { name: 'Required files', check: () => {
      const fs = require('fs');
      const files = ['comprehensive-seed.js', 'analytics-seed.js'];
      const missing = files.filter(file => !fs.existsSync(path.join(__dirname, file)));
      return missing.length === 0 ? 'All present' : `Missing: ${missing.join(', ')}`;
    }}
  ];
  
  checks.forEach(check => {
    try {
      const result = check.check();
      console.log(`✅ ${check.name}: ${result}`);
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
    }
  });
  
  console.log('');
}

// Main execution flow
async function main() {
  try {
    // Step 1: Verify prerequisites
    await verifyPrerequisites();
    
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('- Ensure all services are running (docker-compose up -d)');
    console.log('- Ensure the admin user exists in the auth service');
    console.log('- This process may take 3-5 minutes to complete');
    console.log('- Analytics generation requires direct database access');
    console.log('');
    
    // Give user a chance to cancel
    console.log('Starting in 5 seconds... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Install dependencies if needed
    console.log('📦 Checking dependencies...');
    try {
      require('axios');
      require('uuid');
      console.log('✅ All dependencies are installed\n');
    } catch (error) {
      console.log('📦 Installing dependencies...');
      await runScript('npm install', 'Installing npm dependencies');
    }
    
    // Step 3: Generate comprehensive seed data
    await runScript('comprehensive-seed.js', 'Generating comprehensive seed data');
    
    // Step 4: Generate analytics data
    console.log('⏸️  Pausing 10 seconds before analytics generation...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await runScript('analytics-seed.js', 'Generating analytics data');
    
    // Step 5: Final summary
    console.log('🎉 FULL SYSTEM SEED COMPLETED!');
    console.log('==============================');
    console.log('');
    console.log('✅ All seed data has been generated successfully');
    console.log('');
    console.log('🔗 NEXT STEPS:');
    console.log('1. Access the frontend at http://localhost:8000');
    console.log('2. Login with admin credentials: admin / Admin123!@#');
    console.log('3. Explore the generated data in all modules');
    console.log('4. Check analytics dashboards for historical trends');
    console.log('');
    console.log('📊 GENERATED DATA INCLUDES:');
    console.log('- 1 Admin + 5 Staff users');
    console.log('- 15 Doctors across various specializations');
    console.log('- 50 Patients with realistic Vietnamese demographics');
    console.log('- 100 Appointments spanning past and future dates');
    console.log('- 80 Prescriptions with multiple medications');
    console.log('- 10 Common medications with Vietnamese names');
    console.log('- 6 months of historical analytics data');
    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('- Admin: admin / Admin123!@#');
    console.log('- Staff: staff1-5 / Staff123!@#');
    console.log('- Doctors: doctor1-15 / Doctor123!@#');
    console.log('- Patients: patient1-X / Patient123!@# (subset with accounts)');
    console.log('');
    console.log('Happy exploring! 🏥');
    
  } catch (error) {
    console.error('\n❌ SEED DATA GENERATION FAILED');
    console.error('===============================');
    console.error('Error:', error.message);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('1. Ensure all services are running: docker-compose up -d');
    console.error('2. Check that the API Gateway is accessible at http://localhost:3000');
    console.error('3. Verify the admin user exists in the auth service');
    console.error('4. Check database connections and credentials');
    console.error('5. Review the error logs above for specific issues');
    console.error('');
    console.error('💡 You can run individual scripts to isolate issues:');
    console.error('   npm run comprehensive  # Main user/appointment data');
    console.error('   npm run analytics       # Analytics data only');
    
    process.exit(1);
  }
}

// Signal handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user');
  console.log('Seed data generation cancelled');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Process terminated');
  console.log('Seed data generation stopped');
  process.exit(0);
});

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
