# Hospital Management System - Database Schema Documentation

## Overview
This document describes the complete database schema for the Hospital Management System's authentication service.

## Database: `auth_service_db`

### Tables

#### 1. `users` - Main Authentication Table
Primary table for user authentication and account management.

**Columns:**
- `id` (UUID, PK) - Unique user identifier
- `username` (VARCHAR(150), UNIQUE) - User login name (min 3 chars)
- `email` (VARCHAR(500), UNIQUE) - Encrypted email address
- `password_hash` (VARCHAR(255)) - Bcrypt hashed password
- `role` (user_role_enum) - User role: patient, doctor, nurse, staff, admin
- `hospital_id` (UUID) - Reference to hospital (denormalized)
- `is_active` (BOOLEAN) - Account active status
- `is_verified` (BOOLEAN) - Email verification status
- `failed_login_attempts` (INTEGER) - Security: track failed logins
- `locked_until` (TIMESTAMPTZ) - Account lockout timestamp
- `password_changed_at` (TIMESTAMPTZ) - Password change tracking
- `created_at` (TIMESTAMPTZ) - Account creation time
- `updated_at` (TIMESTAMPTZ) - Last update time
- `last_login` (TIMESTAMPTZ) - Last successful login

**Indexes:**
- Primary key on `id`
- Unique indexes on `username`, `email`
- Performance indexes on `role`, `is_active`, `failed_login_attempts`, `locked_until`

**Constraints:**
- `failed_login_attempts >= 0`
- `username` length >= 3 characters

#### 2. `user_profiles` - Extended User Information
Detailed profile information for users.

**Columns:**
- `id` (UUID, PK) - Profile identifier
- `user_id` (UUID, UNIQUE, FK) - Reference to users table
- `first_name` (VARCHAR(100)) - User's first name
- `last_name` (VARCHAR(100)) - User's last name
- `phone` (VARCHAR(255)) - Encrypted phone number
- `date_of_birth` (DATE) - Birth date
- `gender` (VARCHAR(20)) - Gender: male, female, other, prefer_not_to_say
- `address` (TEXT) - Street address
- `city` (VARCHAR(100)) - City
- `state` (VARCHAR(100)) - State/Province
- `postal_code` (VARCHAR(20)) - ZIP/Postal code
- `country` (VARCHAR(100)) - Country (default: Vietnam)
- `avatar_url` (VARCHAR(500)) - Profile picture URL
- `emergency_contact_name` (VARCHAR(200)) - Emergency contact name
- `emergency_contact_phone` (VARCHAR(255)) - Encrypted emergency phone
- `bio` (TEXT) - User biography/description
- `created_at` (TIMESTAMPTZ) - Profile creation time
- `updated_at` (TIMESTAMPTZ) - Last update time

**Indexes:**
- Primary key on `id`
- Unique index on `user_id`

#### 3. `user_sessions` - JWT Session Management
Track active user sessions and JWT tokens.

**Columns:**
- `id` (UUID, PK) - Session identifier
- `user_id` (UUID, FK) - Reference to users table
- `token_hash` (VARCHAR(255)) - Hashed JWT token
- `expires_at` (TIMESTAMPTZ) - Token expiration time
- `created_at` (TIMESTAMPTZ) - Session creation time
- `ip_address` (INET) - Client IP address
- `user_agent` (TEXT) - Client user agent

**Indexes:**
- Primary key on `id`
- Performance indexes on `user_id`, `expires_at`

#### 4. `password_reset_tokens` - Password Reset Management
Secure password reset token management.

**Columns:**
- `id` (UUID, PK) - Token identifier
- `user_id` (UUID, FK) - Reference to users table
- `token` (VARCHAR(255), UNIQUE) - Cryptographically secure reset token
- `expires_at` (TIMESTAMPTZ) - Token expiration (1 hour)
- `used` (BOOLEAN) - Token usage status
- `created_at` (TIMESTAMPTZ) - Token creation time
- `updated_at` (TIMESTAMPTZ) - Last update time

**Indexes:**
- Primary key on `id`
- Unique index on `token`
- Performance indexes on `user_id`, `expires_at`

#### 5. `email_verification_tokens` - Email Verification
Email verification token management.

**Columns:**
- `id` (UUID, PK) - Token identifier
- `user_id` (UUID, FK) - Reference to users table
- `token` (VARCHAR(255), UNIQUE) - Cryptographically secure verification token
- `expires_at` (TIMESTAMPTZ) - Token expiration
- `used` (BOOLEAN) - Token usage status
- `created_at` (TIMESTAMPTZ) - Token creation time
- `updated_at` (TIMESTAMPTZ) - Last update time

**Indexes:**
- Primary key on `id`
- Unique index on `token`
- Performance indexes on `user_id`, `expires_at`

#### 6. `permissions` - Role-Based Access Control
User permissions and access control.

**Columns:**
- `id` (UUID, PK) - Permission identifier
- `user_id` (UUID, FK) - Reference to users table
- `resource` (VARCHAR(50)) - Resource name (e.g., 'patients', 'appointments')
- `actions` (TEXT[]) - Allowed actions array ['create', 'read', 'update', 'delete']
- `created_at` (TIMESTAMPTZ) - Permission creation time

**Indexes:**
- Primary key on `id`
- Performance index on `user_id`

### Custom Types

#### `user_role_enum`
Enumeration for user roles:
- `patient` - Hospital patients
- `doctor` - Medical doctors
- `nurse` - Nursing staff
- `staff` - Administrative staff
- `admin` - System administrators

### Security Features

#### Data Encryption
- **Email addresses**: Encrypted using AES-256-CBC
- **Phone numbers**: Encrypted using AES-256-CBC
- **Passwords**: Hashed using bcrypt with salt

#### Account Security
- **Failed login tracking**: Prevents brute force attacks
- **Account lockout**: Temporary lockout after failed attempts
- **Password requirements**: Strong password validation
- **Token expiration**: All tokens have expiration times
- **One-time tokens**: Reset and verification tokens are single-use

#### Database Security
- **UUID primary keys**: Prevent enumeration attacks
- **Foreign key constraints**: Maintain referential integrity
- **Check constraints**: Validate data at database level
- **Indexes**: Optimized for performance and security

### Triggers and Functions

#### Automatic Timestamps
- `update_updated_at_column()`: Updates `updated_at` on record changes
- Applied to: `users`, `user_profiles`, `password_reset_tokens`, `email_verification_tokens`

#### Cleanup Functions
- `cleanup_expired_reset_tokens()`: Remove expired/used reset tokens
- `cleanup_expired_verification_tokens()`: Remove expired/used verification tokens
- `cleanup_expired_sessions()`: Remove expired user sessions

### Migration History

1. **001_initial_schema.sql** - Initial database setup
2. **002_add_user_sessions.sql** - Added session management
3. **003_add_permissions.sql** - Added RBAC system
4. **004_create_password_reset_tokens.sql** - Added password reset
5. **005_update_schema_complete.sql** - Complete schema update

### Environment Configuration

Required environment variables:
- `ENCRYPTION_KEY`: 32-character key for data encryption
- `JWT_SECRET`: Secret for JWT token signing
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `DATABASE_URL`: PostgreSQL connection string

### Best Practices

1. **Always encrypt sensitive data** (emails, phones)
2. **Use UUIDs for primary keys** (security)
3. **Implement proper indexing** (performance)
4. **Add constraints at database level** (data integrity)
5. **Use triggers for automatic updates** (consistency)
6. **Regular cleanup of expired tokens** (maintenance)
7. **Monitor failed login attempts** (security)
8. **Implement proper session management** (security)

---

**Last Updated:** 2025-01-12
**Schema Version:** 1.5.0
**Database:** PostgreSQL 13+
