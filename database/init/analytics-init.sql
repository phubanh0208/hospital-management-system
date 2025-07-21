-- Analytics Service Database Initialization (TimescaleDB)
-- This script sets up the analytics service database schema

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patient metrics time-series table
CREATE TABLE patient_metrics (
    time TIMESTAMPTZ NOT NULL,
    patient_id UUID NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'registration', 'visit', 'prescription'
    metric_value DECIMAL,
    metadata JSONB,
    hospital_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment metrics time-series table
CREATE TABLE appointment_metrics (
    time TIMESTAMPTZ NOT NULL,
    appointment_id UUID,
    doctor_id UUID,
    patient_id UUID,
    event_type VARCHAR(50), -- 'scheduled', 'confirmed', 'completed', 'cancelled'
    duration_minutes INTEGER,
    wait_time_minutes INTEGER,
    fee_amount DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription metrics time-series table
CREATE TABLE prescription_metrics (
    time TIMESTAMPTZ NOT NULL,
    prescription_id UUID,
    doctor_id UUID,
    patient_id UUID,
    event_type VARCHAR(50), -- 'created', 'dispensed', 'completed'
    medication_count INTEGER,
    total_cost DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics table
CREATE TABLE system_metrics (
    time TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL NOT NULL,
    tags JSONB, -- {service: "patient", endpoint: "/api/patients", status: "200"}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor performance metrics
CREATE TABLE doctor_performance_metrics (
    time TIMESTAMPTZ NOT NULL,
    doctor_id UUID NOT NULL,
    appointments_count INTEGER DEFAULT 0,
    prescriptions_count INTEGER DEFAULT 0,
    avg_appointment_duration DECIMAL,
    patient_satisfaction_score DECIMAL,
    revenue_generated DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospital operational metrics
CREATE TABLE hospital_operational_metrics (
    time TIMESTAMPTZ NOT NULL,
    department VARCHAR(100),
    bed_occupancy_rate DECIMAL,
    staff_utilization_rate DECIMAL,
    equipment_usage_rate DECIMAL,
    emergency_response_time DECIMAL,
    patient_throughput INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertables for time-series optimization
SELECT create_hypertable('patient_metrics', 'time', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('appointment_metrics', 'time', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('prescription_metrics', 'time', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('system_metrics', 'time', chunk_time_interval => INTERVAL '1 hour');
SELECT create_hypertable('doctor_performance_metrics', 'time', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('hospital_operational_metrics', 'time', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for better query performance
CREATE INDEX idx_patient_metrics_patient_id ON patient_metrics (patient_id, time DESC);
CREATE INDEX idx_patient_metrics_type ON patient_metrics (metric_type, time DESC);
CREATE INDEX idx_appointment_metrics_doctor ON appointment_metrics (doctor_id, time DESC);
CREATE INDEX idx_appointment_metrics_patient ON appointment_metrics (patient_id, time DESC);
CREATE INDEX idx_appointment_metrics_type ON appointment_metrics (event_type, time DESC);
CREATE INDEX idx_prescription_metrics_doctor ON prescription_metrics (doctor_id, time DESC);
CREATE INDEX idx_prescription_metrics_patient ON prescription_metrics (patient_id, time DESC);
CREATE INDEX idx_system_metrics_name ON system_metrics (metric_name, time DESC);
CREATE INDEX idx_doctor_performance_doctor ON doctor_performance_metrics (doctor_id, time DESC);
CREATE INDEX idx_hospital_operational_dept ON hospital_operational_metrics (department, time DESC);

-- Materialized views for common aggregations
CREATE MATERIALIZED VIEW daily_patient_summary AS
SELECT 
    date_trunc('day', time) as day,
    COUNT(DISTINCT patient_id) as unique_patients,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE metric_type = 'registration') as new_registrations,
    COUNT(*) FILTER (WHERE metric_type = 'visit') as visits,
    COUNT(*) FILTER (WHERE metric_type = 'prescription') as prescriptions
FROM patient_metrics
GROUP BY date_trunc('day', time)
ORDER BY day DESC;

CREATE MATERIALIZED VIEW daily_appointment_summary AS
SELECT 
    date_trunc('day', time) as day,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE event_type = 'scheduled') as scheduled,
    COUNT(*) FILTER (WHERE event_type = 'completed') as completed,
    COUNT(*) FILTER (WHERE event_type = 'cancelled') as cancelled,
    AVG(duration_minutes) as avg_duration,
    AVG(wait_time_minutes) as avg_wait_time,
    SUM(fee_amount) as total_revenue
FROM appointment_metrics
GROUP BY date_trunc('day', time)
ORDER BY day DESC;

CREATE MATERIALIZED VIEW doctor_daily_performance AS
SELECT 
    date_trunc('day', time) as day,
    doctor_id,
    SUM(appointments_count) as total_appointments,
    SUM(prescriptions_count) as total_prescriptions,
    AVG(avg_appointment_duration) as avg_duration,
    AVG(patient_satisfaction_score) as avg_satisfaction,
    SUM(revenue_generated) as total_revenue
FROM doctor_performance_metrics
GROUP BY date_trunc('day', time), doctor_id
ORDER BY day DESC, doctor_id;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW daily_patient_summary;
    REFRESH MATERIALIZED VIEW daily_appointment_summary;
    REFRESH MATERIALIZED VIEW doctor_daily_performance;
    
    RAISE NOTICE 'Analytics materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule view refresh (requires pg_cron extension for automated scheduling)
-- SELECT cron.schedule('refresh-analytics', '0 */6 * * *', 'SELECT refresh_analytics_views();');

-- Data retention policies (keep data for specific periods)
SELECT add_retention_policy('patient_metrics', INTERVAL '2 years');
SELECT add_retention_policy('appointment_metrics', INTERVAL '2 years');
SELECT add_retention_policy('prescription_metrics', INTERVAL '2 years');
SELECT add_retention_policy('system_metrics', INTERVAL '3 months');
SELECT add_retention_policy('doctor_performance_metrics', INTERVAL '2 years');
SELECT add_retention_policy('hospital_operational_metrics', INTERVAL '1 year');

-- Compression policies (commented out as columnstore may not be available)
-- SELECT add_compression_policy('patient_metrics', INTERVAL '7 days');
-- SELECT add_compression_policy('appointment_metrics', INTERVAL '7 days');
-- SELECT add_compression_policy('prescription_metrics', INTERVAL '7 days');
-- SELECT add_compression_policy('system_metrics', INTERVAL '1 day');
-- SELECT add_compression_policy('doctor_performance_metrics', INTERVAL '7 days');
-- SELECT add_compression_policy('hospital_operational_metrics', INTERVAL '3 days');

-- Insert sample analytics data for testing
DO $$
DECLARE
    sample_patient_id UUID := uuid_generate_v4();
    sample_doctor_id UUID := uuid_generate_v4();
    sample_appointment_id UUID := uuid_generate_v4();
    i INTEGER;
BEGIN
    -- Generate sample data for the last 30 days
    FOR i IN 0..29 LOOP
        -- Patient metrics
        INSERT INTO patient_metrics (time, patient_id, metric_type, metric_value, metadata)
        VALUES 
        (NOW() - INTERVAL '1 day' * i, sample_patient_id, 'registration', 1, '{"source": "web"}'),
        (NOW() - INTERVAL '1 day' * i, sample_patient_id, 'visit', 1, '{"department": "cardiology"}');
        
        -- Appointment metrics
        INSERT INTO appointment_metrics (time, appointment_id, doctor_id, patient_id, event_type, duration_minutes, fee_amount)
        VALUES 
        (NOW() - INTERVAL '1 day' * i, sample_appointment_id, sample_doctor_id, sample_patient_id, 'completed', 30 + (i % 60), 50.00 + (i * 5));
        
        -- System metrics
        INSERT INTO system_metrics (time, metric_name, metric_value, tags)
        VALUES 
        (NOW() - INTERVAL '1 day' * i, 'api_response_time', 100 + (i % 200), '{"service": "patient", "endpoint": "/api/patients"}'),
        (NOW() - INTERVAL '1 day' * i, 'memory_usage', 60 + (i % 30), '{"service": "appointment", "instance": "1"}');
        
        -- Doctor performance
        INSERT INTO doctor_performance_metrics (time, doctor_id, appointments_count, prescriptions_count, avg_appointment_duration, revenue_generated)
        VALUES 
        (NOW() - INTERVAL '1 day' * i, sample_doctor_id, 5 + (i % 10), 3 + (i % 5), 35.5, 250.00 + (i * 25));
    END LOOP;
    
    RAISE NOTICE 'Sample analytics data inserted';
END $$;

-- Refresh views with sample data
SELECT refresh_analytics_views();

COMMENT ON TABLE patient_metrics IS 'Time-series patient activity metrics';
COMMENT ON TABLE appointment_metrics IS 'Time-series appointment activity metrics';
COMMENT ON TABLE prescription_metrics IS 'Time-series prescription activity metrics';
COMMENT ON TABLE system_metrics IS 'System performance and operational metrics';
COMMENT ON TABLE doctor_performance_metrics IS 'Doctor performance and productivity metrics';
COMMENT ON TABLE hospital_operational_metrics IS 'Hospital operational efficiency metrics';
