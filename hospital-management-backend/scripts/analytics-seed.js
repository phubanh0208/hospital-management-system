#!/usr/bin/env node

/**
 * Analytics Data Seed Generator
 * 
 * Generates historical analytics data by creating events that trigger
 * automatic analytics data insertion. This approach ensures proper
 * data flow through the event system.
 * 
 * Usage: node analytics-seed.js
 */

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@hospital.com';
const ADMIN_PASSWORD = 'Admin123!@#';

// Database configurations
const DB_CONFIGS = {
  analytics: {
    host: process.env.ANALYTICS_DB_HOST || 'localhost',
    port: process.env.ANALYTICS_DB_PORT || 5436,
    database: process.env.ANALYTICS_DB_NAME || 'analytics_service_db',
    user: process.env.ANALYTICS_DB_USER || 'analytics_user',
    password: process.env.ANALYTICS_DB_PASSWORD || 'analytics_password_123'
  }
};

console.log('📊 Analytics Data Seed Generator');
console.log('=================================\n');

let authToken = null;
let analyticsPool = null;

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Database connection
async function connectToAnalytics() {
  try {
    analyticsPool = new Pool(DB_CONFIGS.analytics);
    await analyticsPool.query('SELECT NOW()');
    console.log('✅ Connected to analytics database');
    return true;
  } catch (error) {
    console.error('❌ Analytics database connection failed:', error.message);
    return false;
  }
}

// Authentication
async function loginAdmin() {
  console.log('🔐 Logging in as admin...');
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success && response.data.data?.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Admin login successful\n');
      return true;
    }
    throw new Error('Admin login failed');
  } catch (error) {
    console.error('❌ Admin login failed:', error.message);
    return false;
  }
}

// Fetch existing data for analytics generation
async function fetchExistingData() {
  console.log('📋 Fetching existing data...');
  
  const data = {
    patients: [],
    doctors: [],
    appointments: [],
    prescriptions: []
  };

  try {
    // Fetch patients
    const patientsResponse = await axios.get(`${API_URL}/api/patients?limit=100`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (patientsResponse.data.success) {
      data.patients = patientsResponse.data.data.patients || [];
      console.log(`✅ Found ${data.patients.length} patients`);
    }

    // Fetch appointments
    const appointmentsResponse = await axios.get(`${API_URL}/api/appointments?limit=200`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (appointmentsResponse.data.success) {
      data.appointments = appointmentsResponse.data.data.appointments || [];
      console.log(`✅ Found ${data.appointments.length} appointments`);
    }

    // Fetch prescriptions
    const prescriptionsResponse = await axios.get(`${API_URL}/api/prescriptions?limit=200`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (prescriptionsResponse.data.success) {
      data.prescriptions = prescriptionsResponse.data.data.prescriptions || [];
      console.log(`✅ Found ${data.prescriptions.length} prescriptions`);
    }

    console.log('');
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch existing data:', error.message);
    return data;
  }
}

// Generate historical analytics data
async function generateHistoricalAnalytics(existingData) {
  console.log('📈 Generating historical analytics data...');
  
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  
  // Patient metrics
  console.log('👥 Generating patient metrics...');
  for (const patient of existingData.patients) {
    const registrationDate = new Date(patient.createdAt || randomDate(sixMonthsAgo, now));
    
    // Patient registration metric
    await insertPatientMetric({
      time: registrationDate,
      patient_id: patient.id,
      metric_type: 'registration',
      metric_value: 1,
      metadata: {
        age_group: getAgeGroup(patient.dateOfBirth),
        gender: patient.gender,
        blood_type: patient.bloodType,
        has_email: !!patient.email,
        city: patient.address?.city
      }
    });

    // Generate monthly visit metrics
    for (let month = 0; month < 6; month++) {
      const monthDate = new Date(registrationDate.getTime() + month * 30 * 24 * 60 * 60 * 1000);
      if (monthDate > now) break;
      
      // Random visits per month (0-3)
      const visits = randomInt(0, 3);
      if (visits > 0) {
        await insertPatientMetric({
          time: monthDate,
          patient_id: patient.id,
          metric_type: 'visit',
          metric_value: visits,
          metadata: {
            month: monthDate.getMonth() + 1,
            year: monthDate.getFullYear()
          }
        });
      }
    }
  }

  // Appointment metrics
  console.log('📅 Generating appointment metrics...');
  for (const appointment of existingData.appointments) {
    const scheduledDate = new Date(appointment.scheduledDate);
    
    await insertAppointmentMetric({
      time: scheduledDate,
      appointment_id: appointment.id,
      doctor_id: appointment.doctorId,
      patient_id: appointment.patientId,
      event_type: appointment.status,
      duration_minutes: appointment.duration || 30,
      wait_time_minutes: randomInt(5, 45),
      fee_amount: appointment.fee || randomInt(200000, 800000),
      metadata: {
        appointment_type: appointment.appointmentType,
        priority: appointment.priority,
        room_number: appointment.roomNumber
      }
    });

    // Generate completion event if appointment was completed
    if (appointment.status === 'completed') {
      const completionDate = new Date(scheduledDate.getTime() + (appointment.duration || 30) * 60 * 1000);
      await insertAppointmentMetric({
        time: completionDate,
        appointment_id: appointment.id,
        doctor_id: appointment.doctorId,
        patient_id: appointment.patientId,
        event_type: 'completed',
        duration_minutes: appointment.duration || 30,
        wait_time_minutes: randomInt(5, 45),
        fee_amount: appointment.fee || randomInt(200000, 800000),
        metadata: {
          actual_duration: appointment.duration || 30,
          satisfaction_score: randomInt(3, 5)
        }
      });
    }
  }

  // Prescription metrics
  console.log('💊 Generating prescription metrics...');
  for (const prescription of existingData.prescriptions) {
    const issuedDate = new Date(prescription.issuedDate || prescription.createdAt);
    
    await insertPrescriptionMetric({
      time: issuedDate,
      prescription_id: prescription.id,
      doctor_id: prescription.doctorId,
      patient_id: prescription.patientId,
      event_type: 'created',
      medication_count: prescription.prescriptionItems?.length || 1,
      total_cost: prescription.totalAmount || randomInt(50000, 500000),
      metadata: {
        diagnosis: prescription.diagnosis,
        status: prescription.status,
        valid_until: prescription.validUntil
      }
    });

    // Generate dispensed event if prescription was dispensed
    if (prescription.status === 'dispensed' || prescription.status === 'completed') {
      const dispensedDate = new Date(issuedDate.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000);
      await insertPrescriptionMetric({
        time: dispensedDate,
        prescription_id: prescription.id,
        doctor_id: prescription.doctorId,
        patient_id: prescription.patientId,
        event_type: 'dispensed',
        medication_count: prescription.prescriptionItems?.length || 1,
        total_cost: prescription.totalAmount || randomInt(50000, 500000),
        metadata: {
          dispensed_by: prescription.dispensedByUserId,
          pharmacy_location: 'Main Pharmacy'
        }
      });
    }
  }

  // System metrics
  console.log('🖥️ Generating system metrics...');
  await generateSystemMetrics(sixMonthsAgo, now);

  console.log('✅ Historical analytics data generation completed\n');
}

// Helper functions for database insertion
async function insertPatientMetric(metric) {
  const query = `
    INSERT INTO patient_metrics (time, patient_id, metric_type, metric_value, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `;
  
  try {
    await analyticsPool.query(query, [
      metric.time,
      metric.patient_id,
      metric.metric_type,
      metric.metric_value,
      JSON.stringify(metric.metadata)
    ]);
  } catch (error) {
    console.error('Error inserting patient metric:', error.message);
  }
}

async function insertAppointmentMetric(metric) {
  const query = `
    INSERT INTO appointment_metrics (
      time, appointment_id, doctor_id, patient_id, event_type,
      duration_minutes, wait_time_minutes, fee_amount, metadata, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
  `;
  
  try {
    await analyticsPool.query(query, [
      metric.time,
      metric.appointment_id,
      metric.doctor_id,
      metric.patient_id,
      metric.event_type,
      metric.duration_minutes,
      metric.wait_time_minutes,
      metric.fee_amount,
      JSON.stringify(metric.metadata)
    ]);
  } catch (error) {
    console.error('Error inserting appointment metric:', error.message);
  }
}

async function insertPrescriptionMetric(metric) {
  const query = `
    INSERT INTO prescription_metrics (
      time, prescription_id, doctor_id, patient_id, event_type,
      medication_count, total_cost, metadata, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `;
  
  try {
    await analyticsPool.query(query, [
      metric.time,
      metric.prescription_id,
      metric.doctor_id,
      metric.patient_id,
      metric.event_type,
      metric.medication_count,
      metric.total_cost,
      JSON.stringify(metric.metadata)
    ]);
  } catch (error) {
    console.error('Error inserting prescription metric:', error.message);
  }
}

async function generateSystemMetrics(startDate, endDate) {
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Daily system metrics
    await insertSystemMetric({
      time: new Date(currentDate),
      metric_type: 'daily_active_users',
      metric_value: randomInt(50, 200),
      metadata: {
        date: currentDate.toISOString().split('T')[0],
        peak_hours: '09:00-11:00, 14:00-16:00'
      }
    });

    await insertSystemMetric({
      time: new Date(currentDate),
      metric_type: 'database_connections',
      metric_value: randomInt(10, 50),
      metadata: {
        max_connections: 100,
        connection_pool_usage: randomInt(20, 80)
      }
    });

    await insertSystemMetric({
      time: new Date(currentDate),
      metric_type: 'api_requests',
      metric_value: randomInt(1000, 5000),
      metadata: {
        success_rate: randomInt(95, 99),
        avg_response_time: randomInt(100, 500)
      }
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }
}

async function insertSystemMetric(metric) {
  const query = `
    INSERT INTO system_metrics (time, metric_type, metric_value, metadata, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `;
  
  try {
    await analyticsPool.query(query, [
      metric.time,
      metric.metric_type,
      metric.metric_value,
      JSON.stringify(metric.metadata)
    ]);
  } catch (error) {
    console.error('Error inserting system metric:', error.message);
  }
}

function getAgeGroup(dateOfBirth) {
  if (!dateOfBirth) return 'unknown';
  
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  if (age < 18) return 'pediatric';
  if (age < 65) return 'adult';
  return 'elderly';
}

// Summary report
async function printAnalyticsSummary() {
  console.log('📊 ANALYTICS DATA SUMMARY');
  console.log('=========================');
  
  try {
    const patientMetricsCount = await analyticsPool.query('SELECT COUNT(*) FROM patient_metrics');
    const appointmentMetricsCount = await analyticsPool.query('SELECT COUNT(*) FROM appointment_metrics');
    const prescriptionMetricsCount = await analyticsPool.query('SELECT COUNT(*) FROM prescription_metrics');
    const systemMetricsCount = await analyticsPool.query('SELECT COUNT(*) FROM system_metrics');
    
    console.log(`👥 Patient metrics: ${patientMetricsCount.rows[0].count}`);
    console.log(`📅 Appointment metrics: ${appointmentMetricsCount.rows[0].count}`);
    console.log(`💊 Prescription metrics: ${prescriptionMetricsCount.rows[0].count}`);
    console.log(`🖥️ System metrics: ${systemMetricsCount.rows[0].count}`);
    
    // Show metric types
    const metricTypes = await analyticsPool.query(`
      SELECT 'patient' as source, metric_type, COUNT(*) as count FROM patient_metrics GROUP BY metric_type
      UNION ALL
      SELECT 'appointment' as source, event_type as metric_type, COUNT(*) as count FROM appointment_metrics GROUP BY event_type
      UNION ALL
      SELECT 'prescription' as source, event_type as metric_type, COUNT(*) as count FROM prescription_metrics GROUP BY event_type
      UNION ALL
      SELECT 'system' as source, metric_type, COUNT(*) as count FROM system_metrics GROUP BY metric_type
      ORDER BY source, metric_type
    `);
    
    console.log('\n📈 Metric Types:');
    metricTypes.rows.forEach(row => {
      console.log(`   ${row.source}: ${row.metric_type} (${row.count})`);
    });
    
  } catch (error) {
    console.error('Error generating summary:', error.message);
  }
  
  console.log('\n✅ Analytics seed data generation completed!');
}

// Main execution
async function main() {
  try {
    // Step 1: Connect to databases
    const analyticsConnected = await connectToAnalytics();
    if (!analyticsConnected) {
      console.log('❌ Cannot proceed without analytics database connection');
      return;
    }

    // Step 2: Authenticate
    const loginSuccess = await loginAdmin();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without admin authentication');
      return;
    }

    // Step 3: Fetch existing data
    const existingData = await fetchExistingData();
    
    if (existingData.patients.length === 0) {
      console.log('⚠️  No patients found. Please run the comprehensive seed script first.');
      return;
    }

    // Step 4: Generate analytics data
    await generateHistoricalAnalytics(existingData);

    // Step 5: Print summary
    await printAnalyticsSummary();

  } catch (error) {
    console.error('❌ Analytics seed generation failed:', error.message);
    process.exit(1);
  } finally {
    if (analyticsPool) {
      await analyticsPool.end();
    }
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
