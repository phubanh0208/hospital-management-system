# 🐘 PgAdmin Setup Guide

## 🔗 Truy cập PgAdmin
- URL: http://localhost:8080
- Email: admin@hospital.com  
- Password: admin123

## 📋 Database Servers Configuration

### 1. Auth Service Database
```
Name: Hospital Auth DB
Host: hospital-auth-db
Port: 5432
Database: auth_service_db
Username: auth_user
Password: auth_password_123
```

### 2. Patient Service Database  
```
Name: Hospital Patient DB
Host: hospital-patient-db
Port: 5432
Database: patient_service_db
Username: patient_user
Password: patient_password_123
```

### 3. Appointment Service Database
```
Name: Hospital Appointment DB
Host: hospital-appointment-db
Port: 5432
Database: appointment_service_db
Username: appointment_user
Password: appointment_password_123
```

### 4. Prescription Service Database
```
Name: Hospital Prescription DB
Host: hospital-prescription-db
Port: 5432
Database: prescription_service_db
Username: prescription_user
Password: prescription_password_123
```

### 5. Analytics Service Database
```
Name: Hospital Analytics DB
Host: hospital-analytics-db
Port: 5432
Database: analytics_service_db
Username: analytics_user
Password: analytics_password_123
```

## 🎯 Cách thêm Database Server:

1. **Click chuột phải** vào "Servers" trong sidebar trái
2. Chọn **"Register" > "Server"**
3. **General Tab**: Nhập Name (tên hiển thị)
4. **Connection Tab**: Nhập thông tin connection
5. Click **"Save"**

## 📊 Cách xem dữ liệu:

1. **Mở rộng server** > **Databases** > **database name** > **Schemas** > **public** > **Tables**
2. **Click chuột phải** vào table name
3. Chọn **"View/Edit Data" > "All Rows"**

## 🔍 Cách chạy SQL Query:

1. **Click chuột phải** vào database name
2. Chọn **"Query Tool"**  
3. Viết SQL query và click **"Execute"** (F5)

## 📝 Sample Queries:

### Auth Database:
```sql
SELECT * FROM users LIMIT 10;
SELECT role, COUNT(*) FROM users GROUP BY role;
```

### Patient Database:
```sql  
SELECT * FROM patients LIMIT 10;
SELECT gender, COUNT(*) FROM patients GROUP BY gender;
```

### Appointment Database:
```sql
SELECT * FROM appointments WHERE appointment_date >= CURRENT_DATE LIMIT 10;
SELECT status, COUNT(*) FROM appointments GROUP BY status;
```

### Prescription Database:
```sql
SELECT * FROM prescriptions LIMIT 10;
SELECT medication_name, COUNT(*) FROM prescriptions GROUP BY medication_name LIMIT 5;
```

### Analytics Database:
```sql
SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 10;
SELECT event_type, COUNT(*) FROM analytics_events GROUP BY event_type;
```
