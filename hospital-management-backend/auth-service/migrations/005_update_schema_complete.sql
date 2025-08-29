-- Complete schema update migration
-- This migration brings the existing database up to the latest schema

-- Add new columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add failed_login_attempts column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
        ALTER TABLE users ADD CONSTRAINT chk_failed_login_attempts CHECK (failed_login_attempts >= 0);
    END IF;
    
    -- Add locked_until column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ NULL;
    END IF;
    
    -- Add password_changed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add username length constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'users' AND constraint_name = 'chk_username_length') THEN
        ALTER TABLE users ADD CONSTRAINT chk_username_length CHECK (LENGTH(username) >= 3);
    END IF;
END $$;

-- Add new columns to user_profiles table if they don't exist
DO $$ 
BEGIN
    -- Add gender column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'gender') THEN
        ALTER TABLE user_profiles ADD COLUMN gender VARCHAR(20) 
        CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
    END IF;
    
    -- Add city column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'city') THEN
        ALTER TABLE user_profiles ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Add state column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'state') THEN
        ALTER TABLE user_profiles ADD COLUMN state VARCHAR(100);
    END IF;
    
    -- Add postal_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'postal_code') THEN
        ALTER TABLE user_profiles ADD COLUMN postal_code VARCHAR(20);
    END IF;
    
    -- Add country column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'country') THEN
        ALTER TABLE user_profiles ADD COLUMN country VARCHAR(100) DEFAULT 'Vietnam';
    END IF;
    
    -- Add emergency_contact_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE user_profiles ADD COLUMN emergency_contact_name VARCHAR(200);
    END IF;
    
    -- Add emergency_contact_phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE user_profiles ADD COLUMN emergency_contact_phone VARCHAR(255);
    END IF;
    
    -- Add bio column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Add unique constraint to user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_user_id_key') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Create email_verification_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create additional indexes if they don't exist
DO $$
BEGIN
    -- Users table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_is_active') THEN
        CREATE INDEX idx_users_is_active ON users(is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_failed_login_attempts') THEN
        CREATE INDEX idx_users_failed_login_attempts ON users(failed_login_attempts);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_locked_until') THEN
        CREATE INDEX idx_users_locked_until ON users(locked_until);
    END IF;
    
    -- User profiles indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_user_id') THEN
        CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
    END IF;
    
    -- Email verification tokens indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_tokens_token') THEN
        CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_tokens_user_id') THEN
        CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_tokens_expires_at') THEN
        CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
    END IF;
END $$;

-- Create or update trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_user_profiles_updated_at') THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_email_verification_tokens_updated_at') THEN
        CREATE TRIGGER update_email_verification_tokens_updated_at
            BEFORE UPDATE ON email_verification_tokens
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create cleanup functions
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_verification_tokens 
    WHERE expires_at < NOW() OR used = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Add table and column comments
COMMENT ON TABLE users IS 'Authentication and user management table with encrypted sensitive data';
COMMENT ON TABLE user_profiles IS 'Extended user profile information with encrypted phone numbers';
COMMENT ON TABLE user_sessions IS 'JWT session management and tracking';
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset token management';
COMMENT ON TABLE email_verification_tokens IS 'Email verification token management';
COMMENT ON TABLE permissions IS 'Role-based access control and permissions';

COMMENT ON COLUMN users.email IS 'Encrypted email address for security';
COMMENT ON COLUMN users.failed_login_attempts IS 'Track failed login attempts for security';
COMMENT ON COLUMN users.locked_until IS 'Account lockout timestamp for security';
COMMENT ON COLUMN users.password_changed_at IS 'Track when password was last changed';
COMMENT ON COLUMN user_profiles.phone IS 'Encrypted phone number for privacy';
COMMENT ON COLUMN user_profiles.emergency_contact_phone IS 'Encrypted emergency contact phone';
COMMENT ON COLUMN password_reset_tokens.token IS 'Cryptographically secure reset token';
COMMENT ON COLUMN email_verification_tokens.token IS 'Cryptographically secure verification token';

-- Migration completed successfully
SELECT 'Schema migration completed successfully!' as result;
