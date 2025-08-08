# 🏥 Hospital Management System - Docker Setup

Simplified Docker setup for Hospital Management System with all microservices and databases.

## 🚀 Quick Start (One Command)

```bash
# Start everything (databases + services)
./start-all.sh

# Stop everything 
./stop-all.sh
```

## 📋 What Gets Started

### 🗄️ Databases (Auto-configured)
- **PostgreSQL** - Auth, Patient, Appointment, Prescription, Analytics
- **MongoDB** - Notifications  
- **RabbitMQ** - Message queuing
- **Redis** - Caching

### 🔧 Microservices
- **API Gateway** (Port 3000) - Main entry point
- **Auth Service** (Port 3001) - Authentication & authorization
- **Patient Service** (Port 3002) - Patient management  
- **Appointment Service** (Port 3003) - Appointment scheduling
- **Prescription Service** (Port 3004) - Prescription management
- **Notification Service** (Port 3005) - Email/SMS notifications
- **Analytics Service** (Port 3006) - Reporting & analytics

### 🎛️ Admin Tools
- **PgAdmin** (Port 8080) - Database administration
- **Mongo Express** (Port 8081) - MongoDB administration  
- **RabbitMQ Management** (Port 15672) - Message queue admin

## 🔐 Default Credentials

### Application
- **Admin User**: admin@hospital.com / Admin123!@#

### Database Admin
- **PgAdmin**: admin@hospital.com / admin123
- **RabbitMQ**: hospital / hospital_mq_123

## 🛠️ Manual Operations

### Start Only Databases
```bash
cd ../
docker-compose up -d
```

### Start Only Services
```bash
docker-compose up -d --build
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f appointment-service
```

### Health Check
```bash
# Check all services
curl http://localhost:3000/health

# Individual service
curl http://localhost:3003/health
```

### Restart Service
```bash
docker-compose restart appointment-service
```

## 🔧 Environment Variables

All environment variables are pre-configured in `docker-compose.yml`. Key settings:

- **NODE_ENV**: development
- **Database connections**: Auto-configured with container names
- **Service URLs**: Internal Docker network communication
- **JWT secrets**: Pre-configured for development

## 📊 Port Mapping

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| API Gateway | 3000 | 3000 | http://localhost:3000 |
| Auth | 3001 | 3001 | http://localhost:3001 |
| Patient | 3002 | 3002 | http://localhost:3002 |
| Appointment | 3003 | 3003 | http://localhost:3003 |
| Prescription | 3004 | 3004 | http://localhost:3004 |
| Notification | 3005 | 3005 | http://localhost:3005 |
| Analytics | 3006 | 3006 | http://localhost:3006 |
| PgAdmin | 80 | 8080 | http://localhost:8080 |
| Mongo Express | 8081 | 8081 | http://localhost:8081 |
| RabbitMQ | 15672 | 15672 | http://localhost:15672 |

## 🩺 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up -d --build [service-name]
```

### Database Connection Issues
```bash
# Check database status
docker-compose ps

# Restart databases
cd ../
docker-compose restart
cd hospital-management-backend/
```

### Clean Reset
```bash
# Stop everything
./stop-all.sh

# Remove all containers and volumes
docker-compose down -v
cd ../
docker-compose down -v

# Start fresh
./start-all.sh
```

### Check Docker Resources
```bash
# View all containers
docker ps -a

# View networks
docker network ls

# View volumes  
docker volume ls

# System cleanup
docker system prune -f
```

## 🎯 API Testing

### Using API Gateway
```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!@#"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

### Direct Service Access
```bash
# Create appointment
curl -X POST http://localhost:3003/api/appointments \
  -H "Content-Type: application/json" \
  -d '{...appointment_data...}'

# Get patients  
curl http://localhost:3002/api/patients
```

## 📝 Development Notes

- **Hot reload**: Code changes require service restart
- **Database persistence**: Data persists in Docker volumes
- **Network**: All services communicate via `hospital-network`
- **Build context**: Services build from `hospital-management-backend/` directory
- **Shared package**: Common utilities in `shared/` directory

## 🔒 Production Deployment

⚠️ **Important**: This setup is for development only. For production:

1. Change all default passwords
2. Use proper SSL certificates  
3. Set up proper logging
4. Configure resource limits
5. Use production-grade database setup
6. Enable proper monitoring

---

🏥 **Hospital Management System** - Simplifying healthcare management with microservices architecture.
