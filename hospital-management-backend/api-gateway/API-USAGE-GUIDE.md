# 🚀 API Gateway v2.2.0 - Quick Usage Guide

**Complete guide for using all 68+ API endpoints**

## 🎯 Quick Start

### 1. **Start System**
```bash
docker-compose up -d
curl http://localhost:3000/health  # Verify all services healthy
```

### 2. **Get Authentication Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!@#"}'

# Save the accessToken from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. **Use APIs with Token**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users
```

## 🔐 User Roles & Access

| Role | Access Level | Can Do |
|------|-------------|---------|
| **Admin** | Full System | Manage users, all patients, all appointments, system analytics |
| **Staff** | Administrative | Manage patients, appointments, prescriptions (no user management) |
| **Doctor** | Medical | Own patients, own appointments, create prescriptions, own analytics |
| **Nurse** | Support | Read patients/appointments assigned to them |
| **Patient** | Personal | Own appointments, own medical records, own prescriptions |

## 📚 API Categories & Usage

### 👥 **User Management (Admin Only)**
```bash
# Get all users
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/users?page=1&limit=10"

# Create new user
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doctor2",
    "email": "doctor2@hospital.com",
    "password": "Doctor123!@#",
    "role": "doctor",
    "firstName": "Dr. Jane",
    "lastName": "Smith"
  }'

# Activate/Deactivate user
curl -X POST http://localhost:3000/api/users/USER_ID/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Account verified"}'
```

### 🏥 **Patient Management**
```bash
# Create patient (Admin/Staff)
curl -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Patient",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "contactInfo": {
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St"
    }
  }'

# Get patient by code
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/patients/code/BN24001

# Add medical history
curl -X POST http://localhost:3000/api/patients/PATIENT_ID/medical-history \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "Hypertension",
    "diagnosis": "High blood pressure",
    "treatment": "Medication",
    "date": "2025-08-12"
  }'

# Get visit summary
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/patients/PATIENT_ID/visit-summary
```

### 📅 **Appointment Management**
```bash
# Book appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID",
    "doctorId": "DOCTOR_ID",
    "date": "2025-08-15",
    "time": "10:00",
    "type": "consultation",
    "reason": "Regular checkup"
  }'

# Check conflicts before booking
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/appointments/conflicts?doctorId=DOCTOR_ID&date=2025-08-15&time=10:00"

# Get appointment by number
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/appointments/number/LH24001

# Confirm appointment (Doctor/Staff)
curl -X PUT http://localhost:3000/api/appointments/APPOINTMENT_ID/confirm \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmedBy": "Dr. Smith", "notes": "Patient confirmed"}'
```

### 🕐 **Appointment Slots Management**
```bash
# Get available slots for doctor
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/appointment-slots/available/DOCTOR_ID/2025-08-15

# Create appointment slot (Admin/Staff)
curl -X POST http://localhost:3000/api/appointment-slots \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOCTOR_ID",
    "date": "2025-08-15",
    "startTime": "09:00",
    "endTime": "17:00",
    "isAvailable": true
  }'

# Generate slots for doctor
curl -X POST http://localhost:3000/api/appointment-slots/generate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOCTOR_ID",
    "dateRange": {
      "startDate": "2025-08-15",
      "endDate": "2025-08-30"
    },
    "timeSlots": [
      {"startTime": "09:00", "endTime": "12:00"},
      {"startTime": "14:00", "endTime": "17:00"}
    ],
    "duration": 30
  }'
```

### 👨‍⚕️ **Doctor Availability**
```bash
# Get doctor availability
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/doctor-availability?doctorId=DOCTOR_ID"

# Set doctor availability
curl -X POST http://localhost:3000/api/doctor-availability \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOCTOR_ID",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00",
    "isAvailable": true
  }'

# Get availability by day (1=Monday, 7=Sunday)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/doctor-availability/doctor/DOCTOR_ID/day/1
```

### 💊 **Medication Management**
```bash
# Search medications
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/medications/search/aspirin

# Get medication by code
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/medications/code/MED008

# Create medication (Admin/Staff)
curl -X POST http://localhost:3000/api/medications \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ibuprofen",
    "code": "MED009",
    "genericName": "Ibuprofen",
    "strength": "200mg",
    "dosageForm": "tablet",
    "category": "analgesic"
  }'
```

### 💉 **Prescription Management**
```bash
# Create prescription (Doctor only)
curl -X POST http://localhost:3000/api/prescriptions \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID",
    "medications": [
      {
        "medicationId": "MED_ID",
        "dosage": "1 tablet",
        "frequency": "twice daily",
        "duration": "7 days"
      }
    ],
    "notes": "Take with food"
  }'

# Get prescription by number
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/prescriptions/number/DT24001

# Get patient prescriptions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/prescriptions?patientId=PATIENT_ID"
```

### 🔔 **Notification System**
```bash
# Send async notification
curl -X POST http://localhost:3000/api/notifications/async \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_user_id": "USER_ID",
    "recipient_type": "user",
    "type": "appointment",
    "title": "Appointment Reminder",
    "message": "Your appointment is tomorrow at 10:00 AM"
  }'

# Queue appointment reminder
curl -X POST http://localhost:3000/api/notifications/queue/appointment-reminder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "APPOINTMENT_ID",
    "scheduleTime": "2025-08-14T09:00:00Z",
    "message": "Reminder: You have an appointment tomorrow"
  }'

# Get user notifications
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/notifications?userId=USER_ID"

# Get unread count
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/notifications/unread-count?userId=USER_ID"
```

### 📊 **Analytics & Reporting**
```bash
# Get dashboard summary
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/analytics/dashboard

# Get monthly patient stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/analytics/patients/monthly?year=2025&limit=12"

# Get doctor performance
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/analytics/doctors/performance?doctorId=DOCTOR_ID&period=month"
```

## 🌐 **WebSocket Real-time Notifications**
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws/notifications');

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Real-time notification:', notification);
};

ws.onopen = () => console.log('Connected to notifications');
```

## 📚 **Interactive Documentation**
- **Swagger UI**: http://localhost:3000/api-docs
- **Test all APIs**: Live testing interface
- **View schemas**: Complete data models
- **Copy examples**: Ready-to-use code samples

## 🚨 **Error Handling**
All APIs return consistent format:
```json
// Success
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2025-08-12T07:48:00.000Z"
}

// Error
{
  "success": false,
  "message": "Error description",
  "errors": [/* detailed errors */],
  "timestamp": "2025-08-12T07:48:00.000Z"
}
```

## 🔧 **Common HTTP Status Codes**
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

---

**🏥 Hospital Management API Gateway v2.2.0 - Complete API Coverage Ready!** 🚀
