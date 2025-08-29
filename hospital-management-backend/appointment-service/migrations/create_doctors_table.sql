-- Migration: Add doctors table to appointment service
-- This table stores synchronized doctor data from auth service
--
-- WHY THIS TABLE EXISTS:
-- 1. Performance: Fast queries for appointment booking without cross-service calls
-- 2. Resilience: Appointment service works even if auth service is down
-- 3. User Experience: Quick doctor search and filtering
-- 4. Caching: Doctor info doesn't change frequently, good for caching
--
-- DATA SYNC STRATEGY:
-- - Auth service calls POST /api/doctors/sync when doctor profiles are created/updated
-- - This is a read-replica of doctor data optimized for appointment booking
-- - Auth service remains the single source of truth for doctor profiles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if doctors table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'doctors') THEN
        -- Create doctors table
        CREATE TABLE doctors (
    id UUID PRIMARY KEY, -- This will be the doctor profile ID from auth service
    user_id UUID UNIQUE NOT NULL, -- User ID from auth service
    username VARCHAR(150) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    specialization VARCHAR(100) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    total_reviews INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10,2),
    is_accepting_patients BOOLEAN DEFAULT TRUE,
    availability_hours JSONB, -- Store availability schedule as JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
            -- Constraints
            CONSTRAINT chk_total_reviews CHECK (total_reviews >= 0),
            CONSTRAINT chk_consultation_fee CHECK (consultation_fee >= 0)
        );

        -- Create indexes for performance
        CREATE INDEX idx_doctors_user_id ON doctors(user_id);
        CREATE INDEX idx_doctors_specialization ON doctors(specialization);
        CREATE INDEX idx_doctors_rating ON doctors(rating);
        CREATE INDEX idx_doctors_is_accepting_patients ON doctors(is_accepting_patients);
        CREATE INDEX idx_doctors_consultation_fee ON doctors(consultation_fee);
        CREATE INDEX idx_doctors_specialization_rating ON doctors(specialization, rating DESC);

        -- Create trigger for automatic timestamp updates
        CREATE OR REPLACE FUNCTION update_doctors_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ language 'plpgsql';

        CREATE TRIGGER update_doctors_updated_at
            BEFORE UPDATE ON doctors
            FOR EACH ROW
            EXECUTE FUNCTION update_doctors_updated_at_column();

        -- Table comments
        COMMENT ON TABLE doctors IS 'Synchronized doctor profiles from auth service for appointment booking';
        COMMENT ON COLUMN doctors.id IS 'Doctor profile ID from auth service';
        COMMENT ON COLUMN doctors.user_id IS 'User ID from auth service';
        COMMENT ON COLUMN doctors.specialization IS 'Medical specialization';
        COMMENT ON COLUMN doctors.rating IS 'Average patient rating from 0.00 to 5.00';
        COMMENT ON COLUMN doctors.availability_hours IS 'JSON object storing weekly availability schedule';
        COMMENT ON COLUMN doctors.is_accepting_patients IS 'Whether the doctor is currently accepting new patients';

        RAISE NOTICE 'doctors table created successfully';
    ELSE
        RAISE NOTICE 'doctors table already exists, skipping creation';
    END IF;
END $$;

-- Sample data for testing (optional - remove in production)
-- INSERT INTO doctors (
--     id, user_id, username, first_name, last_name, specialization, 
--     rating, total_reviews, consultation_fee, is_accepting_patients
-- ) VALUES 
-- (
--     uuid_generate_v4(), 
--     uuid_generate_v4(), 
--     'dr_john_doe', 
--     'John', 
--     'Doe', 
--     'Cardiology', 
--     4.5, 
--     25, 
--     150.00, 
--     true
-- ),
-- (
--     uuid_generate_v4(), 
--     uuid_generate_v4(), 
--     'dr_sarah_wilson', 
--     'Sarah', 
--     'Wilson', 
--     'Neurology', 
--     4.8, 
--     42, 
--     200.00, 
--     true
-- ),
-- (
--     uuid_generate_v4(), 
--     uuid_generate_v4(), 
--     'dr_michael_brown', 
--     'Michael', 
--     'Brown', 
--     'General Medicine', 
--     4.2, 
--     18, 
--     120.00, 
--     true
-- );
