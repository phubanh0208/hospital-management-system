# 🧪 Enhanced API Gateway Testing Guide

## 📋 **SUMMARY OF NEW APIS ADDED**

### **✅ User Management APIs (Admin Only)**
```bash
GET    /api/users              # Get all users
GET    /api/users/:id          # Get user by ID  
POST   /api/users              # Create user
PUT    /api/users/:id          # Update user
DELETE /api/users/:id          # Delete user
POST   /api/users/:id/activate   # Activate user
POST   /api/users/:id/deactivate # Deactivate user
```

### **✅ Enhanced Patient APIs**
```bash
GET    /api/patients/code/:code              # Get patient by code
GET    /api/patients/:id/medical-history     # Get medical history
POST   /api/patients/:id/medical-history     # Add medical history
PUT    /api/patients/medical-history/:historyId  # Update medical history
DELETE /api/patients/medical-history/:historyId  # Delete medical history
GET    /api/patients/:id/visit-summary       # Get visit summary
```

### **✅ Enhanced Appointment APIs**
```bash
GET    /api/appointments/conflicts           # Check conflicts
GET    /api/appointments/number/:appointmentNumber  # Get by number
PUT    /api/appointments/:id/confirm         # Confirm appointment
PUT    /api/appointments/:id/complete        # Complete appointment
GET    /api/appointments/doctor/:doctorId/schedule  # Doctor schedule
GET    /api/appointments/patient/:patientId  # Patient appointments
```

### **✅ Appointment Slots APIs**
```bash
GET    /api/appointment-slots               # Get all slots
POST   /api/appointment-slots               # Create slot
PUT    /api/appointment-slots/:id           # Update slot
DELETE /api/appointment-slots/:id           # Delete slot
GET    /api/appointment-slots/available/:doctorId/:date  # Available slots
POST   /api/appointment-slots/generate      # Generate slots
```

### **✅ Doctor Availability APIs**
```bash
GET    /api/doctor-availability             # Get availability
POST   /api/doctor-availability             # Create availability
PUT    /api/doctor-availability/:id         # Update availability
DELETE /api/doctor-availability/:id         # Delete availability
GET    /api/doctor-availability/doctor/:doctorId/day/:dayOfWeek  # By day
```

### **✅ Enhanced Medication APIs**
```bash
GET    /api/medications/search/:searchTerm  # Search medications
GET    /api/medications/code/:medicationCode  # Get by code
GET    /api/medications/:id                 # Get medication by ID
POST   /api/medications                     # Create medication
PUT    /api/medications/:id                 # Update medication
DELETE /api/medications/:id                 # Delete medication
GET    /api/prescriptions/number/:prescriptionNumber  # Get prescription by number
```

### **✅ Enhanced Notification APIs**
```bash
DELETE /api/notifications/:id               # Delete notification
POST   /api/notifications/cleanup-expired   # Cleanup expired
POST   /api/notifications/async             # Async notifications
POST   /api/notifications/queue/appointment-reminder  # Queue reminder
POST   /api/notifications/queue/prescription-ready    # Queue prescription
POST   /api/notifications/queue/system-alert          # Queue system alert
POST   /api/notifications/queue/bulk                  # Queue bulk
```

## 🔐 **UPDATED ROLE-BASED PERMISSIONS**

### **Role Hierarchy:**
1. **Admin** - Full access to everything
2. **Staff** - Full access except user management
3. **Doctor** - Access to assigned patients, own appointments/prescriptions
4. **Nurse** - Read access to patients/appointments, limited prescription access
5. **Patient** - Access to own data only

### **Permission Matrix:**
| API Category | Admin | Staff | Doctor | Nurse | Patient |
|-------------|-------|-------|--------|-------|---------|
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Patient Data | ✅ | ✅ | ✅* | ✅ | ✅* |
| Appointments | ✅ | ✅ | ✅* | ✅ | ✅* |
| Prescriptions | ✅ | ✅ | ✅* | 👁️ | ✅* |
| Medications | ✅ | ✅ | ✅ | 👁️ | ❌ |
| Notifications | ✅ | ✅ | ✅* | ✅* | ✅* |
| Analytics | ✅ | ✅ | ✅* | ❌ | ❌ |

**Legend:**
- ✅ = Full access
- 👁️ = Read-only access  
- ✅* = Filtered access (own data only)
- ❌ = No access

## 🧪 **TESTING COMMANDS**

### **1. Test User Management (Admin Only)**
```bash
# Login as admin first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get all users
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/users

# Create new user
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"nurse1","email":"nurse1@hospital.com","password":"nurse123","role":"nurse"}'
```

### **2. Test Enhanced Patient APIs**
```bash
# Get patient by code
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/patients/code/BN24001

# Get medical history
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/patients/123/medical-history

# Add medical history
curl -X POST http://localhost:3000/api/patients/123/medical-history \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"condition":"Hypertension","diagnosis":"High blood pressure","treatment":"Medication"}'
```

### **3. Test Appointment Management**
```bash
# Check conflicts
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/appointments/conflicts?doctorId=doc1&date=2024-01-15&time=10:00"

# Confirm appointment
curl -X PUT http://localhost:3000/api/appointments/123/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmed":true}'

# Get doctor schedule
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/appointments/doctor/doc1/schedule?date=2024-01-15"
```

### **4. Test Appointment Slots**
```bash
# Get available slots
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/appointment-slots/available/doc1/2024-01-15

# Generate slots
curl -X POST http://localhost:3000/api/appointment-slots/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"doc1","date":"2024-01-15","startTime":"09:00","endTime":"17:00","slotDuration":30}'
```

### **5. Test Medication Management**
```bash
# Search medications
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/medications/search/aspirin

# Get medication by code
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/medications/code/MED001

# Create medication (Admin/Staff only)
curl -X POST http://localhost:3000/api/medications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Aspirin","code":"ASP001","dosage":"100mg","type":"tablet"}'
```

### **6. Test Async Notifications**
```bash
# Send async notification
curl -X POST http://localhost:3000/api/notifications/async \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"patient1","type":"appointment_reminder","message":"Your appointment is tomorrow"}'

# Queue appointment reminder
curl -X POST http://localhost:3000/api/notifications/queue/appointment-reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"123","scheduleTime":"2024-01-14T09:00:00Z"}'
```

## ✅ **EXPECTED RESULTS**

### **Success Cases:**
- **200**: Successful GET requests
- **201**: Successful POST requests (creation)
- **200**: Successful PUT/DELETE requests
- **Admin**: Can access all endpoints
- **Staff**: Can access most endpoints except user management
- **Doctor**: Can access own data and assigned patients
- **Nurse**: Can read patient/appointment data
- **Patient**: Can only access own data

### **Error Cases:**
- **401**: Missing or invalid token
- **403**: Insufficient permissions for role
- **404**: Resource not found
- **500**: Service unavailable

## 🎯 **VALIDATION CHECKLIST**

- [ ] All 40+ new API endpoints respond correctly
- [ ] Role-based permissions work as expected
- [ ] Admin can access user management APIs
- [ ] Staff cannot access user management
- [ ] Doctor can only see assigned patients
- [ ] Nurse has read-only access to appropriate resources
- [ ] Patient can only access own data
- [ ] Error handling works correctly
- [ ] All services are properly proxied
- [ ] WebSocket notifications still work
- [ ] Swagger UI shows updated endpoints

## 🚀 **PERFORMANCE EXPECTATIONS**

- **Response Time**: < 200ms for most endpoints
- **Concurrent Users**: 500+ simultaneous requests
- **Throughput**: 1000+ requests/second
- **Uptime**: 99.95%
- **Memory Usage**: < 512MB per service
