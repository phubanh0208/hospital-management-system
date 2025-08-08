-- Auth Service Database Initialization
-- This script sets up the auth service database schema

-- Create custom types
CREATE TYPE user_role_enum AS ENUM ('patient', 'doctor', 'nurse', 'staff', 'admin');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(500) UNIQUE NOT NULL, -- Increased size for encrypted data
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'patient',
    hospital_id UUID, -- Reference to hospital (denormalized)
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(255), -- Increased size for encrypted data
    date_of_birth DATE,
    address TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions for JWT management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource VARCHAR(50) NOT NULL, -- 'patients', 'appointments', etc.
    actions TEXT[] NOT NULL, -- ['create', 'read', 'update', 'delete']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_permissions_user_id ON permissions(user_id);

-- Note: Default admin user should be created via API after service startup
-- Use the setup-admin.js script to create the initial admin user
-- This ensures proper encryption and data consistency

COMMENT ON TABLE users IS 'Authentication and user management table';
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE user_sessions IS 'JWT session management';
COMMENT ON TABLE permissions IS 'Role-based access control';
