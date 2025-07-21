-- Appointment Service Database Initialization
-- This script sets up the appointment service database schema

-- Create custom types
CREATE TYPE appointment_type_enum AS ENUM (
    'consultation', 'checkup', 'followup', 'emergency', 'surgery', 'therapy'
);
CREATE TYPE appointment_status_enum AS ENUM (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
);
CREATE TYPE priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- References to other services (denormalized data)
    patient_id UUID NOT NULL, -- From Patient Service
    patient_name VARCHAR(255) NOT NULL, -- Denormalized for performance
    patient_phone VARCHAR(15) NOT NULL,
    
    doctor_id UUID NOT NULL, -- From Auth Service
    doctor_name VARCHAR(255) NOT NULL, -- Denormalized
    
    -- Appointment Details
    appointment_type appointment_type_enum NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status appointment_status_enum DEFAULT 'scheduled',
    priority priority_enum DEFAULT 'normal',
    
    -- Clinical Info
    reason TEXT NOT NULL,
    symptoms TEXT,
    notes TEXT,
    doctor_notes TEXT,
    
    -- Location & Payment
    room_number VARCHAR(20),
    fee DECIMAL(10,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Doctor availability table
CREATE TABLE doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(doctor_id, day_of_week, start_time)
);

-- Appointment conflicts tracking
CREATE TABLE appointment_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL,
    conflict_date TIMESTAMPTZ NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'double_booking', 'unavailable', 'holiday'
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment slots (pre-calculated available slots)
CREATE TABLE appointment_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    is_available BOOLEAN DEFAULT TRUE,
    max_bookings INTEGER DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(doctor_id, slot_date, slot_time)
);

-- Doctors table (synchronized from auth service)
-- This table stores cached doctor data for appointment booking performance
CREATE TABLE doctors (
    id UUID PRIMARY KEY, -- Doctor profile ID from auth service
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

-- Indexes for performance
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_number ON appointments(appointment_number);
CREATE INDEX idx_doctor_availability_doctor_id ON doctor_availability(doctor_id);
CREATE INDEX idx_doctor_availability_day ON doctor_availability(day_of_week);
CREATE INDEX idx_appointment_slots_doctor_date ON appointment_slots(doctor_id, slot_date);
CREATE INDEX idx_appointment_conflicts_doctor ON appointment_conflicts(doctor_id);

-- Indexes for doctors table
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_rating ON doctors(rating);
CREATE INDEX idx_doctors_is_accepting_patients ON doctors(is_accepting_patients);
CREATE INDEX idx_doctors_consultation_fee ON doctors(consultation_fee);
CREATE INDEX idx_doctors_specialization_rating ON doctors(specialization, rating DESC);

-- Function to auto-generate appointment number
CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(20);
    last_number INTEGER;
    date_str VARCHAR(8);
BEGIN
    -- Generate date string YYYYMMDD
    date_str := TO_CHAR(NEW.scheduled_date, 'YYYYMMDD');
    
    -- Get the last appointment number for this date
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(appointment_number FROM 12) AS INTEGER)), 
        0
    ) INTO last_number
    FROM appointments 
    WHERE appointment_number LIKE 'AP' || date_str || '%';
    
    -- Generate new number: AP + YYYYMMDD + 001
    new_number := 'AP' || date_str || LPAD((last_number + 1)::TEXT, 3, '0');
    
    NEW.appointment_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate appointment number
CREATE TRIGGER trigger_generate_appointment_number
    BEFORE INSERT ON appointments
    FOR EACH ROW
    WHEN (NEW.appointment_number IS NULL OR NEW.appointment_number = '')
    EXECUTE FUNCTION generate_appointment_number();

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for overlapping appointments
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE doctor_id = NEW.doctor_id
    AND status NOT IN ('cancelled', 'completed')
    AND id != COALESCE(NEW.id, uuid_generate_v4())
    AND (
        (NEW.scheduled_date, NEW.scheduled_date + INTERVAL '1 minute' * NEW.duration_minutes) 
        OVERLAPS 
        (scheduled_date, scheduled_date + INTERVAL '1 minute' * duration_minutes)
    );
    
    -- If conflict found, log it
    IF conflict_count > 0 THEN
        INSERT INTO appointment_conflicts (
            doctor_id, conflict_date, conflict_type, description
        ) VALUES (
            NEW.doctor_id, 
            NEW.scheduled_date, 
            'double_booking', 
            'Potential scheduling conflict detected'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check conflicts
CREATE TRIGGER trigger_check_appointment_conflict
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION check_appointment_conflict();

-- Function to update appointment slots
CREATE OR REPLACE FUNCTION update_appointment_slots()
RETURNS TRIGGER AS $$
BEGIN
    -- Update slot availability when appointment is created/cancelled
    IF TG_OP = 'INSERT' AND NEW.status IN ('scheduled', 'confirmed') THEN
        UPDATE appointment_slots 
        SET current_bookings = current_bookings + 1,
            is_available = (current_bookings + 1 < max_bookings)
        WHERE doctor_id = NEW.doctor_id 
        AND slot_date = NEW.scheduled_date::DATE 
        AND slot_time = NEW.scheduled_date::TIME;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'cancelled' THEN
            UPDATE appointment_slots 
            SET current_bookings = GREATEST(current_bookings - 1, 0),
                is_available = TRUE
            WHERE doctor_id = NEW.doctor_id 
            AND slot_date = NEW.scheduled_date::DATE 
            AND slot_time = NEW.scheduled_date::TIME;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update doctors table timestamp
CREATE OR REPLACE FUNCTION update_doctors_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update slots
CREATE TRIGGER trigger_update_appointment_slots
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_slots();

-- Trigger to update doctors timestamp
CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW
    EXECUTE FUNCTION update_doctors_updated_at_column();

-- Insert sample doctor availability (assuming doctor IDs from auth service)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES
(uuid_generate_v4(), 1, '08:00', '12:00'), -- Monday morning
(uuid_generate_v4(), 1, '14:00', '17:00'), -- Monday afternoon
(uuid_generate_v4(), 2, '08:00', '12:00'), -- Tuesday morning
(uuid_generate_v4(), 2, '14:00', '17:00'), -- Tuesday afternoon
(uuid_generate_v4(), 3, '08:00', '12:00'), -- Wednesday morning
(uuid_generate_v4(), 3, '14:00', '17:00'); -- Wednesday afternoon

-- Generate sample appointment slots for next 30 days
DO $$
DECLARE
    doc_id UUID;
    current_slot_date DATE;
    current_slot_time TIME;
BEGIN
    -- For each doctor (simplified - using random UUIDs)
    FOR doc_id IN SELECT DISTINCT doctor_id FROM doctor_availability LOOP
        -- For next 30 days
        FOR i IN 0..29 LOOP
            current_slot_date := CURRENT_DATE + i;
            
            -- Create predefined time slots
            FOR current_slot_time IN 
                SELECT unnest(ARRAY[
                    '08:00'::TIME, '08:30'::TIME, '09:00'::TIME, '09:30'::TIME, 
                    '10:00'::TIME, '10:30'::TIME, '11:00'::TIME, '11:30'::TIME,
                    '14:00'::TIME, '14:30'::TIME, '15:00'::TIME, '15:30'::TIME,
                    '16:00'::TIME, '16:30'::TIME
                ])
            LOOP
                INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, duration_minutes)
                VALUES (doc_id, current_slot_date, current_slot_time, 30)
                ON CONFLICT (doctor_id, slot_date, slot_time) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

COMMENT ON TABLE appointments IS 'Appointment scheduling and management';
COMMENT ON TABLE doctor_availability IS 'Doctor working hours and availability';
COMMENT ON TABLE appointment_conflicts IS 'Tracking scheduling conflicts';
COMMENT ON TABLE appointment_slots IS 'Pre-calculated available appointment slots';
COMMENT ON TABLE doctors IS 'Synchronized doctor profiles from auth service for appointment booking performance';
COMMENT ON COLUMN doctors.id IS 'Doctor profile ID from auth service';
COMMENT ON COLUMN doctors.user_id IS 'User ID from auth service';
COMMENT ON COLUMN doctors.availability_hours IS 'JSON object storing weekly availability schedule';
