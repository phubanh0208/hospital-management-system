# Hospital Management System - Backend Services

Microservices architecture for hospital management system with separate services for different domains.

## 🏗️ Architecture

```
hospital-management-backend/
├── auth-service/           # Authentication & Authorization
├── patient-service/        # Patient Management
├── appointment-service/    # Appointment Scheduling
├── prescription-service/   # Medicine & Prescriptions
├── notification-service/   # Real-time Notifications
├── analytics-service/      # Analytics & Reporting
├── api-gateway/           # Service Gateway & Routing
└── shared/               # Shared utilities & types
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker)
- MongoDB (via Docker)
- TimescaleDB (via Docker)

### Installation

1. **Install all dependencies:**
```bash
npm run install-all
```

2. **Start infrastructure:**
```bash
npm run docker:up
```

3. **Start all services in development:**
```bash
npm run dev
```

## 📡 Services

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| API Gateway | 3000 | - | Request routing & auth |
| Auth Service | 3001 | PostgreSQL | User authentication |
| Patient Service | 3002 | PostgreSQL | Patient management |
| Appointment Service | 3003 | PostgreSQL | Scheduling |
| Prescription Service | 3004 | PostgreSQL | Medicine management |
| Notification Service | 3005 | MongoDB | Real-time notifications |
| Analytics Service | 3006 | TimescaleDB | Reports & statistics |

## 🗄️ Database Ports

| Database | Port | Service |
|----------|------|---------|
| auth-db | 5432 | Auth Service |
| patient-db | 5433 | Patient Service |
| appointment-db | 5434 | Appointment Service |
| prescription-db | 5435 | Prescription Service |
| analytics-db | 5436 | Analytics (TimescaleDB) |
| notification-db | 27017 | Notification Service |

## 🔄 Development

### Start individual services:
```bash
npm run dev:auth          # Auth Service
npm run dev:patient       # Patient Service  
npm run dev:appointment   # Appointment Service
npm run dev:prescription  # Prescription Service
npm run dev:notification  # Notification Service
npm run dev:analytics     # Analytics Service
npm run dev:gateway       # API Gateway
```

### Build all services:
```bash
npm run build
```

### Run tests:
```bash
npm run test
```

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp ../.env.example ../.env
```

### Required Environment Variables:
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_REFRESH_SECRET` - Secret key for refresh token signing
- `ENCRYPTION_KEY` - 64-character hex key for AES-256-CBC encryption
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (development/production)

### Example .env for Auth Service:
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
AUTH_DB_HOST=localhost
AUTH_DB_PORT=5432
AUTH_DB_NAME=auth_service_db
AUTH_DB_USER=auth_user
AUTH_DB_PASSWORD=auth_password_123
```

## 🐳 Docker Commands

```bash
# Start infrastructure only
docker-compose -f ../docker-compose.yml up -d auth-db patient-db appointment-db prescription-db analytics-db notification-db

# Build and start all services
npm run docker:build
npm run docker:up

# Stop all services
docker-compose -f ../docker-compose.yml down
```

## 👤 Admin User Setup

**Important:** The admin user is no longer hardcoded in the database. Use the setup script after starting services:

### Quick Setup (Recommended)
```bash
# Start all services and create admin user automatically
npm run setup:full
```

### Manual Setup
```bash
# 1. Start services first
npm run docker:up
npm run dev

# 2. Wait for services to be ready, then create admin
npm run setup:admin
```

### Custom Admin Credentials
```bash
# Set environment variables before running setup
export ADMIN_USERNAME=myadmin
export ADMIN_EMAIL=myadmin@hospital.com  
export ADMIN_PASSWORD=MySecurePassword123!
npm run setup:admin
```

### Default Admin Credentials
- **Username:** `admin`
- **Email:** `admin@hospital.com`
- **Password:** `Admin123!@#`
- **Role:** `admin`

**🔒 Security Note:** Change the default admin password immediately after first login in production!

## 🏥 API Documentation

- **API Gateway:** http://localhost:3000
- **Auth Service:** http://localhost:3001
- **Patient Service:** http://localhost:3002
- **Appointment Service:** http://localhost:3003
- **Prescription Service:** http://localhost:3004
- **Notification Service:** http://localhost:3005
- **Analytics Service:** http://localhost:3006

## 🔍 Monitoring

- **pgAdmin:** http://localhost:5050 (PostgreSQL databases)
- **mongo-express:** http://localhost:8081 (MongoDB)

## 📋 API Endpoints

### Auth Service (3001)
- `POST /api/auth/login` - User login (username + password)
- `POST /api/auth/register` - User registration (with encrypted email/phone)
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/change-password` - Change user password (authenticated)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)
- `GET /health` - Service health check

### Patient Service (3002)
- `GET /patients` - List patients
- `POST /patients` - Create patient
- `GET /patients/:id` - Get patient details
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient

### Appointment Service (3003)
- `GET /appointments` - List appointments
- `POST /appointments` - Create appointment
- `GET /appointments/:id` - Get appointment details
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

### Prescription Service (3004)
- `GET /prescriptions` - List prescriptions
- `POST /prescriptions` - Create prescription
- `GET /prescriptions/:id` - Get prescription details
- `PUT /prescriptions/:id` - Update prescription

### Notification Service (3005)
- `GET /notifications` - List notifications
- `POST /notifications` - Send notification
- `PUT /notifications/:id/read` - Mark as read
- WebSocket: `ws://localhost:3005` - Real-time notifications

### Analytics Service (3006)
- `GET /api/analytics/patients/monthly` - Patient statistics by month
- `GET /api/analytics/prescriptions/reports` - Prescription reports
- `GET /api/analytics/doctors/performance` - Doctor performance metrics
- `GET /api/analytics/appointments/stats` - Appointment statistics
- `GET /api/analytics/system/metrics` - System performance metrics
- `GET /api/analytics/dashboard` - Dashboard summary
- `POST /api/analytics/refresh` - Refresh materialized views

## 🛡️ Security

- **JWT tokens** for authentication with decrypted user data
- **Username-only login** (no email required for login)
- **AES-256-CBC encryption** for sensitive data (email, phone)
- **Role-based access control (RBAC)**
- API rate limiting
- Input validation & sanitization
- CORS configuration
- Helmet.js security headers

### 🔐 Data Encryption
- **Email addresses** are encrypted in database using AES-256-CBC
- **Phone numbers** are encrypted in database using AES-256-CBC
- **JWT tokens** contain decrypted email for client use
- **ENCRYPTION_KEY** environment variable required for all services

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific service
cd auth-service && npm test
cd patient-service && npm test
```

## 📊 Analytics & Reporting

The Analytics Service provides comprehensive reporting and statistics for the hospital management system using TimescaleDB for optimized time-series data storage and analysis.

### 📈 Key Features
- **Patient Statistics**: Monthly registration and visit trends
- **Prescription Reports**: Medication dispensing and cost analysis
- **Appointment Analytics**: Scheduling patterns and revenue tracking
- **Doctor Performance**: Productivity metrics and patient satisfaction
- **System Metrics**: API performance and resource utilization
- **Dashboard Summary**: Real-time overview of key metrics

### 🗄️ TimescaleDB Benefits
- **Time-series Optimization**: Hypertables with automatic partitioning
- **Materialized Views**: Pre-computed summaries for fast queries
- **Data Retention**: Automatic cleanup policies (2 years for core data)
- **Sample Data**: 30 days of test data included for development

### 📚 Documentation
For detailed Analytics Service documentation, API reference, and development guide:
**[📊 Analytics Service README](analytics-service/README.md)**

### 🚀 Quick Test
```bash
# Dashboard summary
curl http://localhost:3000/api/analytics/dashboard

# Patient statistics (last 6 months)
curl "http://localhost:3000/api/analytics/patients/monthly?limit=6"

# Refresh analytics views
curl -X POST http://localhost:3000/api/analytics/refresh
```

## 🚀 Performance

- Connection pooling for databases
- Redis caching (optional)
- Request/response compression
- API response pagination
- Database indexing
- TimescaleDB optimization for analytics

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check database status
docker-compose -f ../docker-compose.yml ps

# View logs
docker logs hospital-auth-db
docker logs hospital-patient-db
```

### Service Issues
```bash
# Check service logs
npm run dev:auth      # Check auth service logs
npm run dev:analytics # Check analytics service logs
npm run dev:gateway   # Check gateway logs
```

### Analytics Service Issues
```bash
# Check TimescaleDB connection
docker logs hospital-analytics-db

# Test analytics endpoints
curl http://localhost:3006/health
curl http://localhost:3000/api/analytics/dashboard

# Refresh materialized views manually
curl -X POST http://localhost:3000/api/analytics/refresh
```

## 📝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Use conventional commits

## 📄 License

Private - Hospital Management System
