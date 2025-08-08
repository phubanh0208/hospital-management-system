# 🏥 Hospital Management System

Hệ thống quản lý bệnh viện đầy đủ sử dụng kiến trúc Microservices với Docker, TypeScript, và PostgreSQL/MongoDB.

## 📋 Tổng Quan

Hệ thống gồm 6 microservices chính:
- **Auth Service** (Port 3001): Xác thực & phân quyền
- **Patient Service** (Port 3002): Quản lý bệnh nhân
- **Appointment Service** (Port 3003): Quản lý lịch hẹn
- **Prescription Service** (Port 3004): Quản lý đơn thuốc
- **Notification Service** (Port 3005): Email/SMS notifications
- **Analytics Service** (Port 3006): Báo cáo & thống kê
- **API Gateway** (Port 3000): Điều hướng và quản lý API

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Node.js 18** với TypeScript
- **Express.js** framework
- **PostgreSQL** cho các services chính
- **MongoDB** cho notification service
- **Redis** cho caching
- **RabbitMQ** cho message queue
- **JWT** cho authentication
- **Docker & Docker Compose** cho containerization

### Development Tools
- **ESLint** & **Prettier** cho code formatting
- **Jest** cho testing
- **Winston** cho logging
- **Helmet** cho security
- **CORS** middleware

## 🚀 Hướng Dẫn Chạy Dự Án

### Yêu Cầu Hệ Thống
- **Docker** & **Docker Compose** (bắt buộc)
- **Node.js 18+** (tùy chọn, cho development)
- **Git** để clone repository

### 🐳 Cách 1: Chạy với Docker (Khuyên dùng)

#### Bước 1: Clone và chuẩn bị
```bash
git clone <repository-url>
cd hospital-management
```

#### Bước 2: Chạy toàn bộ hệ thống
```bash
# Khởi chạy databases trước
docker-compose up -d

# Chờ databases khởi động (30-60 giây)
sleep 30

# Khởi chạy microservices
cd hospital-management-backend
docker-compose up -d

# Kiểm tra trạng thái
docker ps
```

#### Bước 3: Kiểm tra hệ thống hoạt động
```bash
# Kiểm tra API Gateway
curl http://localhost:3000/health

# Test login với admin account
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@hospital.com", 
    "password": "Admin123!@#",
    "firstName": "System",
    "lastName": "Admin",
    "role": "admin"
  }'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!@#"
  }'
```

### 🖥️ Cách 2: Development Mode (Local)

#### Bước 1: Chạy databases
```bash
# Chỉ chạy databases
docker-compose up -d
```

#### Bước 2: Cài đặt dependencies
```bash
cd hospital-management-backend

# Cài shared packages
cd shared && npm install && npm run build
cd ..

# Cài từng service
for service in auth-service patient-service appointment-service prescription-service notification-service analytics-service api-gateway; do
  cd $service
  npm install
  cd ..
done
```

#### Bước 3: Chạy từng service
```bash
# Terminal 1: Auth Service
cd auth-service && npm run dev

# Terminal 2: Patient Service  
cd patient-service && npm run dev

# Terminal 3: Appointment Service
cd appointment-service && npm run dev

# Terminal 4: Prescription Service
cd prescription-service && npm run dev

# Terminal 5: Notification Service
cd notification-service && npm run dev

# Terminal 6: Analytics Service
cd analytics-service && npm run dev

# Terminal 7: API Gateway
cd api-gateway && npm run dev
```

### 🛠️ Script Tự Động

Sử dụng các script có sẵn:

```bash
# Khởi động tất cả
cd hospital-management-backend
./start-all.sh

# Dừng tất cả
./stop-all.sh

# Build lại images
./docker-build-all.sh
```

## 📍 Endpoints & Services

### API Gateway (http://localhost:3000)
- `GET /health` - Health check tổng thể
- `POST /api/auth/*` - Authentication routes
- `GET /api/patients/*` - Patient management
- `GET /api/appointments/*` - Appointment management
- `GET /api/prescriptions/*` - Prescription management
- `GET /api/notifications/*` - Notification management
- `GET /api/analytics/*` - Analytics & reports

### Direct Service Access
- **Auth Service**: http://localhost:3001
- **Patient Service**: http://localhost:3002
- **Appointment Service**: http://localhost:3003
- **Prescription Service**: http://localhost:3004
- **Notification Service**: http://localhost:3005
- **Analytics Service**: http://localhost:3006

### Database Management
- **PgAdmin**: http://localhost:8080
  - Email: `admin@hospital.com`
  - Password: `admin123`
- **Mongo Express**: http://localhost:8081
- **RabbitMQ Management**: http://localhost:15672
  - Username: `hospital`
  - Password: `hospital_mq_123`

## 🔑 Authentication

### Tạo Admin User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@hospital.com",
    "password": "Admin123!@#", 
    "firstName": "System",
    "lastName": "Admin",
    "role": "admin"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!@#"
  }'
```

Sử dụng `accessToken` từ response để authenticate các API khác:
```bash
curl -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🗃️ Database Schema

### PostgreSQL Databases
- **auth_service_db** (Port 5432): Users, roles, permissions
- **patient_service_db** (Port 5433): Patient records, medical history
- **appointment_service_db** (Port 5434): Appointments, schedules
- **prescription_service_db** (Port 5435): Prescriptions, medications
- **analytics_service_db** (Port 5436): Reports, statistics

### MongoDB
- **notification_service_db** (Port 27017): Email/SMS logs, templates

### Other Services
- **Redis** (Port 6379): Session cache, temporary data
- **RabbitMQ** (Port 5672): Message queue for notifications

## 🧪 Testing

### Health Checks
```bash
# Kiểm tra tất cả services
curl http://localhost:3000/health

# Kiểm tra từng service
for port in 3001 3002 3003 3004 3005 3006; do
  echo "Testing port $port:"
  curl -s http://localhost:$port/health | jq .
done
```

### API Testing Examples

#### Patients
```bash
# Lấy danh sách bệnh nhân
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/patients

# Tạo bệnh nhân mới
curl -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyen Van A",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "phone": "0901234567",
    "email": "nguyenvana@email.com",
    "address": {
      "street": "123 Main St",
      "city": "Ho Chi Minh",
      "district": "District 1",
      "ward": "Ward 1"
    },
    "bloodType": "A+",
    "emergencyContact": {
      "name": "Nguyen Thi B", 
      "phone": "0907654321",
      "relationship": "Wife"
    }
  }'
```

#### Appointments
```bash
# Lấy lịch hẹn
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/appointments

# Tạo lịch hẹn
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "doctorId": "doctor-uuid", 
    "appointmentType": "consultation",
    "scheduledDate": "2025-08-15T10:00:00.000Z",
    "reason": "Regular checkup",
    "notes": "Annual physical examination"
  }'
```

#### Analytics
```bash
# Dashboard summary
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/analytics/dashboard
```

## 🚨 Troubleshooting

### Services không start được
```bash
# Kiểm tra logs
docker logs hospital-auth-service
docker logs hospital-patient-service

# Restart service cụ thể
docker restart hospital-auth-service

# Rebuild nếu cần
docker-compose build auth-service
```

### Database connection lỗi
```bash
# Kiểm tra network
docker network inspect hospital-network

# Restart databases
docker-compose restart hospital-auth-db

# Kiểm tra database logs
docker logs hospital-auth-db
```

### Port conflicts
```bash
# Kiểm tra ports đang sử dụng
netstat -tulpn | grep :3001

# Kill process nếu cần
sudo kill -9 <PID>
```

### Reset toàn bộ hệ thống
```bash
# Stop và xóa tất cả
docker-compose down
cd hospital-management-backend
docker-compose down

# Xóa volumes (⚠️ Sẽ mất data)
docker volume prune

# Restart lại
docker-compose up -d
cd hospital-management-backend  
docker-compose up -d
```

## 📝 Logs

### Xem logs realtime
```bash
# Tất cả services
docker-compose logs -f

# Service cụ thể
docker logs -f hospital-auth-service

# Lọc logs theo level
docker logs hospital-auth-service 2>&1 | grep "error"
```

### Log files (nếu chạy local)
- `hospital-management-backend/logs/`
- Mỗi service có log file riêng

## 🔐 Security Features

- **JWT Authentication** với refresh tokens
- **Password hashing** với bcrypt
- **Rate limiting** trên API Gateway
- **CORS protection**
- **Helmet.js** security headers
- **Input validation** với Joi
- **SQL injection protection** với parameterized queries

## 📈 Monitoring

### Health Checks
Tất cả services có endpoint `/health` để monitoring:
- Database connectivity
- External service status  
- Memory/CPU usage
- Uptime information

### Metrics
- Request/response times
- Error rates
- Database query performance
- Queue processing stats

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request
5. Code review và merge

## 📄 License

MIT License - xem file LICENSE để biết chi tiết.

## 📞 Support

Nếu có vấn đề, tạo issue trên GitHub repository hoặc liên hệ team phát triển.

---

**🎉 Happy Coding! 🏥**
