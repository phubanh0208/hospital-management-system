#!/bin/bash

# Test PostgreSQL Database Connections
echo "🏥 Testing Hospital Management Database Connections..."
echo "=================================================="

# Test Auth Database
echo "📝 Testing Auth Database..."
docker exec hospital-auth-db psql -U auth_user -d auth_service_db -c "SELECT 'Auth DB Connected' as status, now() as timestamp;"

echo ""
echo "👥 Testing Patient Database..."
docker exec hospital-patient-db psql -U patient_user -d patient_service_db -c "SELECT 'Patient DB Connected' as status, now() as timestamp;"

echo ""
echo "📅 Testing Appointment Database..."
docker exec hospital-appointment-db psql -U appointment_user -d appointment_service_db -c "SELECT 'Appointment DB Connected' as status, now() as timestamp;"

echo ""
echo "💊 Testing Prescription Database..."
docker exec hospital-prescription-db psql -U prescription_user -d prescription_service_db -c "SELECT 'Prescription DB Connected' as status, now() as timestamp;"

echo ""
echo "📊 Testing Analytics Database..."
docker exec hospital-analytics-db psql -U analytics_user -d analytics_service_db -c "SELECT 'Analytics DB Connected' as status, now() as timestamp;"

echo ""
echo "📧 Testing MongoDB (Notification)..."
docker exec hospital-notification-db mongosh --eval "db.runCommand({ping: 1}).ok ? 'MongoDB Connected' : 'MongoDB Error'"

echo ""
echo "✅ All database connections tested!"
