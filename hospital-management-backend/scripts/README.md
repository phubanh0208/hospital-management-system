# Hospital Management System - Setup Scripts

This directory contains setup and utility scripts for the Hospital Management System.

## 📋 Available Scripts

### 🔧 setup-admin.js
Creates the initial admin user via API calls instead of hardcoding in database.

**Usage:**
```bash
# Basic usage
npm run setup:admin

# With custom credentials
export ADMIN_USERNAME=myadmin
export ADMIN_EMAIL=myadmin@hospital.com
export ADMIN_PASSWORD=MySecurePassword123!
npm run setup:admin

# Full setup (start services + create admin)
npm run setup:full
```

**Features:**
- ✅ Waits for auth service to be ready
- ✅ Checks if admin already exists
- ✅ Creates admin user with proper encryption
- ✅ Verifies login functionality
- ✅ Colorful console output
- ✅ Error handling and retries

**Environment Variables:**
- `AUTH_SERVICE_URL` - Auth service URL (default: http://localhost:3001)
- `ADMIN_USERNAME` - Admin username (default: admin)
- `ADMIN_EMAIL` - Admin email (default: admin@hospital.com)
- `ADMIN_PASSWORD` - Admin password (default: Admin123!@#)

## 🔒 Security Benefits

### Why Use API-Based Admin Creation?

1. **Proper Encryption**: Email and phone are encrypted using the same encryption system as regular users
2. **Data Consistency**: Uses the same validation and business logic as the registration API
3. **Environment Flexibility**: Can use different credentials per environment
4. **No Hardcoded Secrets**: Passwords are not stored in plain text in database scripts
5. **Verification**: Automatically tests that the created admin can actually login

### Security Best Practices

- ✅ Change default admin password immediately in production
- ✅ Use strong passwords (minimum 12 characters)
- ✅ Use environment variables for credentials
- ✅ Regularly rotate admin passwords
- ✅ Monitor admin account usage

## 🚀 Usage Examples

### Development Environment
```bash
# Quick setup for development
npm run setup:full
```

### Production Environment
```bash
# Set secure credentials
export ADMIN_USERNAME=hospital_admin
export ADMIN_EMAIL=admin@yourhospital.com
export ADMIN_PASSWORD=YourSecurePassword123!@#

# Start services
npm run docker:up

# Wait for services to be ready
sleep 30

# Create admin
npm run setup:admin
```

### CI/CD Pipeline
```bash
# In your deployment script
docker-compose up -d
./wait-for-services.sh
npm run setup:admin
```

## 🛠️ Troubleshooting

### Common Issues

1. **Service Not Ready**
   - Ensure auth service is running on the correct port
   - Check database connectivity
   - Wait longer for services to start

2. **Admin Already Exists**
   - Script will detect and skip creation
   - Use different credentials if needed
   - Delete existing admin from database if testing

3. **Network Issues**
   - Check AUTH_SERVICE_URL environment variable
   - Verify firewall settings
   - Ensure Docker containers can communicate

### Debug Mode
```bash
# Enable verbose logging
DEBUG=1 npm run setup:admin
```

## 📝 Adding New Scripts

When adding new setup scripts:

1. Follow the same pattern as `setup-admin.js`
2. Add proper error handling and retries
3. Use colorful console output for better UX
4. Add environment variable configuration
5. Update this README with documentation
6. Add npm script to package.json

## 🔄 Future Scripts

Planned scripts for future development:

- `setup-sample-data.js` - Create sample patients, appointments, etc.
- `migrate-data.js` - Data migration utilities
- `backup-restore.js` - Database backup and restore
- `health-check.js` - Comprehensive system health check
- `cleanup-test-data.js` - Clean up test data from development
