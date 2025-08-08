-- Prescription Service Database Initialization
-- This script sets up the prescription service database schema

-- Create custom types
CREATE TYPE prescription_status_enum AS ENUM (
    'draft', 'active', 'dispensed', 'completed', 'cancelled', 'expired'
);

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Prescriptions table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Denormalized references
    patient_id UUID NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_age INTEGER,
    patient_allergies TEXT,
    
    doctor_id UUID NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    
    appointment_id UUID, -- May be NULL for direct prescriptions
    
    -- Prescription Details
    diagnosis TEXT NOT NULL,
    instructions TEXT NOT NULL,
    notes TEXT,
    
    -- Status & Dates
    status prescription_status_enum DEFAULT 'draft',
    issued_date TIMESTAMPTZ DEFAULT NOW(),
    valid_until DATE NOT NULL,
    
    -- Dispensing Info
    dispensed_by_user_id UUID,
    dispensed_by_name VARCHAR(255),
    dispensed_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription items table
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    
    -- Medication Details
    medication_name VARCHAR(255) NOT NULL,
    medication_code VARCHAR(50), -- Standard drug code (NDC, etc.)
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) DEFAULT 'viên',
    
    -- Pricing
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Instructions
    instructions TEXT,
    warnings TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drug interactions table
CREATE TABLE drug_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_a VARCHAR(255) NOT NULL,
    drug_b VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'major', 'moderate', 'minor'
    description TEXT NOT NULL,
    recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(drug_a, drug_b)
);

-- Drug master data
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_code VARCHAR(50) UNIQUE NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255),
    dosage_form VARCHAR(100), -- 'tablet', 'capsule', 'syrup', etc.
    strength VARCHAR(100),
    unit VARCHAR(50),
    contraindications TEXT[],
    side_effects TEXT[],
    storage_requirements TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription audit log
CREATE TABLE prescription_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'dispensed', 'cancelled'
    old_status prescription_status_enum,
    new_status prescription_status_enum,
    changed_by_user_id UUID NOT NULL,
    changed_by_name VARCHAR(255),
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_number ON prescriptions(prescription_number);
CREATE INDEX idx_prescriptions_issued_date ON prescriptions(issued_date);
CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_medication_code ON prescription_items(medication_code);
CREATE INDEX idx_medications_code ON medications(medication_code);
CREATE INDEX idx_medications_name ON medications(medication_name);
CREATE INDEX idx_drug_interactions_drugs ON drug_interactions(drug_a, drug_b);

-- Function to auto-generate prescription number
CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(20);
    last_number INTEGER;
    date_str VARCHAR(8);
BEGIN
    -- Generate date string YYYYMMDD
    date_str := TO_CHAR(NEW.issued_date, 'YYYYMMDD');
    
    -- Get the last prescription number for this date
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(prescription_number FROM 12) AS INTEGER)), 
        0
    ) INTO last_number
    FROM prescriptions 
    WHERE prescription_number LIKE 'PX' || date_str || '%';
    
    -- Generate new number: PX + YYYYMMDD + 001
    new_number := 'PX' || date_str || LPAD((last_number + 1)::TEXT, 3, '0');
    
    NEW.prescription_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate prescription number
CREATE TRIGGER trigger_generate_prescription_number
    BEFORE INSERT ON prescriptions
    FOR EACH ROW
    WHEN (NEW.prescription_number IS NULL OR NEW.prescription_number = '')
    EXECUTE FUNCTION generate_prescription_number();

-- Function to check drug interactions
CREATE OR REPLACE FUNCTION check_drug_interactions()
RETURNS TRIGGER AS $$
DECLARE
    interaction_record RECORD;
    current_medications TEXT[];
BEGIN
    -- Get all medications in this prescription
    SELECT ARRAY_AGG(medication_name) INTO current_medications
    FROM prescription_items 
    WHERE prescription_id = NEW.prescription_id;
    
    -- Add the new medication
    current_medications := current_medications || NEW.medication_name;
    
    -- Check for interactions
    FOR interaction_record IN
        SELECT di.*, 'WARNING: ' || di.description as warning_message
        FROM drug_interactions di
        WHERE (di.drug_a = ANY(current_medications) AND di.drug_b = ANY(current_medications))
        OR (di.drug_b = ANY(current_medications) AND di.drug_a = ANY(current_medications))
    LOOP
        -- Log the warning (in a real system, you might want to prevent the insert or require acknowledgment)
        RAISE NOTICE 'Drug Interaction Warning: %', interaction_record.warning_message;
        
        -- Update the warnings field
        NEW.warnings := COALESCE(NEW.warnings, '') || E'\n' || interaction_record.warning_message;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check drug interactions
CREATE TRIGGER trigger_check_drug_interactions
    BEFORE INSERT OR UPDATE ON prescription_items
    FOR EACH ROW
    EXECUTE FUNCTION check_drug_interactions();

-- Function to audit prescription changes
CREATE OR REPLACE FUNCTION audit_prescription_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO prescription_audit_log (
            prescription_id, action, new_status, changed_by_user_id, changed_by_name
        ) VALUES (
            NEW.id, 'created', NEW.status, NEW.doctor_id, NEW.doctor_name
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO prescription_audit_log (
                prescription_id, action, old_status, new_status, 
                changed_by_user_id, changed_by_name
            ) VALUES (
                NEW.id, 'status_changed', OLD.status, NEW.status,
                COALESCE(NEW.dispensed_by_user_id, NEW.doctor_id),
                COALESCE(NEW.dispensed_by_name, NEW.doctor_name)
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for prescription audit
CREATE TRIGGER trigger_audit_prescription_changes
    AFTER INSERT OR UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION audit_prescription_changes();

-- Insert sample medications
INSERT INTO medications (medication_code, medication_name, generic_name, dosage_form, strength, unit) VALUES
('MED001', 'Paracetamol 500mg', 'Paracetamol', 'tablet', '500', 'mg'),
('MED002', 'Amoxicillin 250mg', 'Amoxicillin', 'capsule', '250', 'mg'),
('MED003', 'Ibuprofen 400mg', 'Ibuprofen', 'tablet', '400', 'mg'),
('MED004', 'Metformin 500mg', 'Metformin', 'tablet', '500', 'mg'),
('MED005', 'Omeprazole 20mg', 'Omeprazole', 'capsule', '20', 'mg'),
('MED006', 'Lisinopril 10mg', 'Lisinopril', 'tablet', '10', 'mg'),
('MED007', 'Atorvastatin 20mg', 'Atorvastatin', 'tablet', '20', 'mg'),
('MED008', 'Aspirin 81mg', 'Aspirin', 'tablet', '81', 'mg');

-- Insert sample drug interactions
INSERT INTO drug_interactions (drug_a, drug_b, interaction_type, description, recommendation) VALUES
('Aspirin', 'Ibuprofen', 'moderate', 'Increased risk of gastrointestinal bleeding', 'Monitor for signs of bleeding, consider alternative pain relief'),
('Metformin', 'Alcohol', 'major', 'Increased risk of lactic acidosis', 'Avoid alcohol consumption'),
('Lisinopril', 'Potassium supplements', 'major', 'Increased risk of hyperkalemia', 'Monitor potassium levels closely'),
('Omeprazole', 'Clopidogrel', 'moderate', 'Reduced antiplatelet effect', 'Consider alternative PPI or antiplatelet agent'),
('Atorvastatin', 'Simvastatin', 'major', 'Increased risk of myopathy', 'Do not use together');

COMMENT ON TABLE prescriptions IS 'Prescription management and tracking';
COMMENT ON TABLE prescription_items IS 'Individual medications within prescriptions';
COMMENT ON TABLE drug_interactions IS 'Drug interaction warnings and recommendations';
COMMENT ON TABLE medications IS 'Master medication database';
COMMENT ON TABLE prescription_audit_log IS 'Audit trail for prescription changes';
