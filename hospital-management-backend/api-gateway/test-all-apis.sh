#!/bin/bash

# 🧪 Enhanced API Gateway Test Script
# Tests all new APIs with proper authentication and role-based access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_GATEWAY_URL="http://localhost:3000"
ADMIN_TOKEN=""
STAFF_TOKEN=""
DOCTOR_TOKEN=""
NURSE_TOKEN=""
PATIENT_TOKEN=""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

print_error() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Function to test API endpoint
test_api() {
    local method=$1
    local endpoint=$2
    local token=$3
    local expected_status=$4
    local description=$5
    local data=$6

    print_test "$description"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_GATEWAY_URL$endpoint" \
            -o /tmp/api_response.json)
    else
        response=$(curl -s -w "%{http_code}" -X "$method" \
            -H "Authorization: Bearer $token" \
            "$API_GATEWAY_URL$endpoint" \
            -o /tmp/api_response.json)
    fi
    
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description (Status: $status_code)"
    else
        print_error "$description (Expected: $expected_status, Got: $status_code)"
        if [ -f /tmp/api_response.json ]; then
            echo "Response: $(cat /tmp/api_response.json)"
        fi
    fi
}

# Function to get auth token
get_auth_token() {
    local username=$1
    local password=$2
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
        "$API_GATEWAY_URL/api/auth/login")
    
    echo "$response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4
}

# Main test execution
main() {
    print_header "🚀 ENHANCED API GATEWAY TEST SUITE"
    
    echo "🔐 Getting authentication tokens..."
    
    # Note: These are example credentials - adjust based on your test data
    ADMIN_TOKEN=$(get_auth_token "admin" "admin123")
    STAFF_TOKEN=$(get_auth_token "staff" "staff123")
    DOCTOR_TOKEN=$(get_auth_token "doctor" "doctor123")
    NURSE_TOKEN=$(get_auth_token "nurse" "nurse123")
    PATIENT_TOKEN=$(get_auth_token "patient" "patient123")
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}❌ Failed to get admin token. Please check credentials and ensure services are running.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Authentication tokens obtained${NC}"
    
    # Test 1: System Health
    print_header "🏥 SYSTEM HEALTH TESTS"
    test_api "GET" "/" "" "200" "Gateway root endpoint"
    test_api "GET" "/health" "" "200" "System health check"
    
    # Test 2: User Management APIs (Admin Only)
    print_header "👥 USER MANAGEMENT TESTS"
    test_api "GET" "/api/users" "$ADMIN_TOKEN" "200" "Admin: Get all users"
    test_api "GET" "/api/users" "$STAFF_TOKEN" "403" "Staff: Get all users (should fail)"
    test_api "POST" "/api/users" "$ADMIN_TOKEN" "201" "Admin: Create user" \
        '{"username":"testuser","email":"test@hospital.com","password":"test123","role":"nurse"}'
    
    # Test 3: Enhanced Patient APIs
    print_header "🏥 ENHANCED PATIENT TESTS"
    test_api "GET" "/api/patients" "$ADMIN_TOKEN" "200" "Admin: Get all patients"
    test_api "GET" "/api/patients" "$DOCTOR_TOKEN" "200" "Doctor: Get patients (filtered)"
    test_api "GET" "/api/patients" "$NURSE_TOKEN" "200" "Nurse: Get patients (read-only)"
    test_api "GET" "/api/patients/code/BN24001" "$STAFF_TOKEN" "200" "Get patient by code"
    
    # Test 4: Appointment Management
    print_header "📅 APPOINTMENT MANAGEMENT TESTS"
    test_api "GET" "/api/appointments" "$ADMIN_TOKEN" "200" "Admin: Get all appointments"
    test_api "GET" "/api/appointments" "$PATIENT_TOKEN" "200" "Patient: Get own appointments"
    test_api "GET" "/api/appointments/conflicts" "$DOCTOR_TOKEN" "200" "Doctor: Check conflicts"
    test_api "POST" "/api/appointments" "$PATIENT_TOKEN" "201" "Patient: Create appointment" \
        '{"patientId":"patient1","doctorId":"doctor1","date":"2024-01-15","time":"10:00","type":"consultation"}'
    
    # Test 5: Appointment Slots
    print_header "🕐 APPOINTMENT SLOTS TESTS"
    test_api "GET" "/api/appointment-slots" "$ADMIN_TOKEN" "200" "Admin: Get appointment slots"
    test_api "GET" "/api/appointment-slots/available/doctor1/2024-01-15" "$PATIENT_TOKEN" "200" "Patient: Get available slots"
    test_api "POST" "/api/appointment-slots" "$ADMIN_TOKEN" "201" "Admin: Create appointment slot" \
        '{"doctorId":"doctor1","date":"2024-01-15","startTime":"09:00","endTime":"10:00","isAvailable":true}'
    
    # Test 6: Doctor Availability
    print_header "👨‍⚕️ DOCTOR AVAILABILITY TESTS"
    test_api "GET" "/api/doctor-availability" "$ADMIN_TOKEN" "200" "Admin: Get doctor availability"
    test_api "GET" "/api/doctor-availability" "$DOCTOR_TOKEN" "200" "Doctor: Get own availability"
    test_api "POST" "/api/doctor-availability" "$DOCTOR_TOKEN" "201" "Doctor: Create availability" \
        '{"doctorId":"doctor1","dayOfWeek":"monday","startTime":"09:00","endTime":"17:00","isAvailable":true}'
    
    # Test 7: Enhanced Medication APIs
    print_header "💊 MEDICATION MANAGEMENT TESTS"
    test_api "GET" "/api/medications" "$DOCTOR_TOKEN" "200" "Doctor: Get medications"
    test_api "GET" "/api/medications/search/aspirin" "$NURSE_TOKEN" "200" "Nurse: Search medications"
    test_api "POST" "/api/medications" "$ADMIN_TOKEN" "201" "Admin: Create medication" \
        '{"name":"Test Medicine","code":"TEST001","dosage":"100mg","type":"tablet"}'
    test_api "POST" "/api/medications" "$PATIENT_TOKEN" "403" "Patient: Create medication (should fail)"
    
    # Test 8: Enhanced Prescription APIs
    print_header "📋 PRESCRIPTION TESTS"
    test_api "GET" "/api/prescriptions" "$DOCTOR_TOKEN" "200" "Doctor: Get prescriptions"
    test_api "GET" "/api/prescriptions" "$PATIENT_TOKEN" "200" "Patient: Get own prescriptions"
    test_api "POST" "/api/prescriptions" "$DOCTOR_TOKEN" "201" "Doctor: Create prescription" \
        '{"patientId":"patient1","medicationId":"med1","dosage":"100mg","frequency":"twice daily","duration":"7 days"}'
    
    # Test 9: Enhanced Notification APIs
    print_header "🔔 NOTIFICATION TESTS"
    test_api "GET" "/api/notifications" "$PATIENT_TOKEN" "200" "Patient: Get notifications"
    test_api "POST" "/api/notifications/async" "$DOCTOR_TOKEN" "201" "Doctor: Send async notification" \
        '{"userId":"patient1","type":"appointment_reminder","message":"Test notification"}'
    test_api "POST" "/api/notifications/queue/appointment-reminder" "$STAFF_TOKEN" "201" "Staff: Queue appointment reminder" \
        '{"appointmentId":"123","scheduleTime":"2024-01-15T09:00:00Z"}'
    
    # Test 10: Analytics APIs
    print_header "📊 ANALYTICS TESTS"
    test_api "GET" "/api/analytics/dashboard" "$ADMIN_TOKEN" "200" "Admin: Get dashboard"
    test_api "GET" "/api/analytics/patients/monthly" "$STAFF_TOKEN" "200" "Staff: Get patient statistics"
    test_api "GET" "/api/analytics/doctors/performance" "$DOCTOR_TOKEN" "200" "Doctor: Get own performance"
    test_api "GET" "/api/analytics/dashboard" "$PATIENT_TOKEN" "403" "Patient: Get dashboard (should fail)"
    
    # Test Results Summary
    print_header "📊 TEST RESULTS SUMMARY"
    echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Enhanced API Gateway is working correctly.${NC}"
        exit 0
    else
        echo -e "\n${RED}⚠️  Some tests failed. Please check the output above for details.${NC}"
        exit 1
    fi
}

# Check if API Gateway is running
echo "🔍 Checking if API Gateway is running..."
if ! curl -s "$API_GATEWAY_URL/health" > /dev/null; then
    echo -e "${RED}❌ API Gateway is not running at $API_GATEWAY_URL${NC}"
    echo "Please start the API Gateway and all services first:"
    echo "cd hospital-management-backend && ./start-all.sh"
    exit 1
fi

echo -e "${GREEN}✅ API Gateway is running${NC}"

# Run main test suite
main
