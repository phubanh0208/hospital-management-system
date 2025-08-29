-- Migration: Add doctor_profiles table to auth service
-- This migration adds the doctor_profiles table if it doesn't exist

-- Check if doctor_profiles table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'doctor_profiles') THEN
        -- Doctor profiles table for medical professionals
        CREATE TABLE doctor_profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            specialization VARCHAR(100) NOT NULL, -- e.g., 'Cardiology', 'Neurology', 'General Medicine'
            license_number VARCHAR(50) UNIQUE NOT NULL,
            years_of_experience INTEGER DEFAULT 0,
            rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00),
            total_reviews INTEGER DEFAULT 0,
            consultation_fee DECIMAL(10,2),
            education TEXT, -- Medical education background
            certifications TEXT[], -- Array of certifications
            languages_spoken TEXT[] DEFAULT ARRAY['Vietnamese'], -- Languages the doctor speaks
            availability_hours JSONB, -- Store availability schedule as JSON
            is_accepting_patients BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- Constraints
            CONSTRAINT chk_years_experience CHECK (years_of_experience >= 0),
            CONSTRAINT chk_total_reviews CHECK (total_reviews >= 0),
            CONSTRAINT chk_consultation_fee CHECK (consultation_fee >= 0)
        );

        -- Create indexes for performance
        CREATE INDEX idx_doctor_profiles_user_id ON doctor_profiles(user_id);
        CREATE INDEX idx_doctor_profiles_specialization ON doctor_profiles(specialization);
        CREATE INDEX idx_doctor_profiles_rating ON doctor_profiles(rating);
        CREATE INDEX idx_doctor_profiles_license_number ON doctor_profiles(license_number);

        -- Create trigger for automatic timestamp updates
        CREATE TRIGGER update_doctor_profiles_updated_at
            BEFORE UPDATE ON doctor_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Table comments
        COMMENT ON TABLE doctor_profiles IS 'Medical professional profiles with specialization and rating information';
        COMMENT ON COLUMN doctor_profiles.specialization IS 'Medical specialization (e.g., Cardiology, Neurology)';
        COMMENT ON COLUMN doctor_profiles.rating IS 'Average patient rating from 0.00 to 5.00';
        COMMENT ON COLUMN doctor_profiles.license_number IS 'Unique medical license number';
        COMMENT ON COLUMN doctor_profiles.availability_hours IS 'JSON object storing weekly availability schedule';

        RAISE NOTICE 'doctor_profiles table created successfully';
    ELSE
        RAISE NOTICE 'doctor_profiles table already exists, skipping creation';
    END IF;
END $$;
