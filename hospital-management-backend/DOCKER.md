# 🐳 Docker Setup - Hospital Management System

## 📋 Overview

This document provides complete instructions for running the Hospital Management System using Docker containers. All services are containerized with proper shared dependency management.

## 🏗️ Architecture

### 🔧 **Multi-Stage Build Strategy**
- **Builder Stage**: Compiles TypeScript and builds shared packages
- **Production Stage**: Optimized runtime with only production dependencies
- **Shared Package**: Symlinked across all services for consistency

### 🌐 **Services & Ports**

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| **API Gateway** | 3000 | - | Main entry point, routing & authentication |
| **Auth Service** | 3001 | PostgreSQL:5432 | User authentication & authorization |
| **Patient Service** | 3002 | PostgreSQL:5433 | Patient management |
| **Appointment Service** | 3003 | PostgreSQL:5434 | Appointment scheduling |
| **Prescription Service** | 3004 | PostgreSQL:5435 | Prescription management |
| **Notification Service** | 3005 | MongoDB:27017 | Notifications & messaging |
| **Analytics Service** | 3006 | PostgreSQL:5436 | Reports & analytics |

### 🗄️ **Infrastructure Services**

| Service | Port | Credentials | Purpose |
|---------|------|-------------|---------|
| **PostgreSQL** | 5432-5436 | See docker-compose.yml | Primary databases |
| **MongoDB** | 27017 | notification_user/notification_password_123 | Notification storage |
| **RabbitMQ** | 5672, 15672 | hospital_user/hospital_password_123 | Message queue |

## 🚀 Quick Start

### 1. **Build All Services**
```bash
# Build all Docker images
./docker-build-all.sh
```

### 2. **Start the System**
```bash
# Start all services
./docker-start.sh

# Or manually with docker-compose
docker-compose up -d
```

### 3. **Check Status**
```bash
# View service status
docker-compose ps

# Check health
curl http://localhost:3000/health
```

### 4. **Stop the System**
```bash
# Stop services (keep data)
./docker-stop.sh

# Stop and remove all data
./docker-stop.sh --remove-data
```

## 📊 Monitoring & Logs

### **View Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

### **Health Checks**
```bash
# API Gateway health (includes all services)
curl http://localhost:3000/health

# Individual service health
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Patient
curl http://localhost:3003/health  # Appointment
curl http://localhost:3004/health  # Prescription
curl http://localhost:3005/health  # Notification
curl http://localhost:3006/health  # Analytics
```

### **RabbitMQ Management**
- **URL**: http://localhost:15672
- **Username**: hospital_user
- **Password**: hospital_password_123

## 🔐 Default Credentials

### **Admin User**
- **Username**: admin
- **Password**: Admin123!@#

### **Database Credentials**
See `docker-compose.yml` for all database credentials.

## 🛠️ Development

### **Rebuild Single Service**
```bash
# Rebuild specific service
docker-compose build auth-service
docker-compose up -d auth-service
```

### **Debug Container**
```bash
# Run container interactively
docker run -it --rm hospital/auth-service:latest sh

# Execute command in running container
docker exec -it hospital-auth-service sh
```

### **Database Access**
```bash
# Connect to PostgreSQL
docker exec -it hospital-auth-db psql -U auth_user -d auth_service_db

# Connect to MongoDB
docker exec -it hospital-notification-db mongosh -u notification_user -p notification_password_123
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Shared Package Not Found**
```
Error: Cannot find module '@hospital/shared'
```
**Solution**: Rebuild the service - the symlink creation might have failed.

#### **2. Database Connection Failed**
```
Error: connect ECONNREFUSED
```
**Solution**: Wait for databases to be healthy, check with `docker-compose ps`.

#### **3. Port Already in Use**
```
Error: bind: address already in use
```
**Solution**: Stop conflicting services or change ports in docker-compose.yml.

#### **4. Out of Disk Space**
```
Error: no space left on device
```
**Solution**: Clean up Docker:
```bash
docker system prune -f
docker volume prune -f
```

### **Reset Everything**
```bash
# Stop and remove everything
docker-compose down -v

# Remove all hospital images
docker rmi $(docker images hospital/* -q) 2>/dev/null || true

# Clean up system
docker system prune -f

# Rebuild from scratch
./docker-build-all.sh
./docker-start.sh
```

## 📁 File Structure

```
hospital-management-backend/
├── docker-compose.yml          # Main orchestration file
├── docker-build-all.sh         # Build all services script
├── docker-start.sh             # Start system script
├── docker-stop.sh              # Stop system script
├── DOCKER.md                   # This documentation
├── shared/                     # Shared package
│   ├── Dockerfile              # Shared package build
│   ├── package.json
│   └── src/
├── auth-service/
│   ├── Dockerfile              # Multi-stage build
│   ├── .dockerignore
│   └── src/
├── patient-service/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
└── [other-services]/
    ├── Dockerfile
    ├── .dockerignore
    └── src/
```

## 🔒 Security Considerations

### **Production Deployment**
1. **Change all default passwords**
2. **Use Docker secrets for sensitive data**
3. **Enable TLS/SSL**
4. **Use private Docker registry**
5. **Implement proper network segmentation**

### **Environment Variables**
Create `.env` file for production:
```bash
# JWT Secrets
JWT_SECRET=your-production-jwt-secret-here
JWT_REFRESH_SECRET=your-production-refresh-secret-here

# Database Passwords
AUTH_DB_PASSWORD=secure-auth-password
PATIENT_DB_PASSWORD=secure-patient-password
# ... etc
```

## 📈 Performance Optimization

### **Resource Limits**
Add to docker-compose.yml:
```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### **Health Check Tuning**
Adjust health check intervals based on your needs:
```yaml
healthcheck:
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Timeout after 10 seconds
  retries: 3         # Retry 3 times
  start_period: 40s  # Wait 40s before first check
```

## 🎯 Next Steps

1. **Start the system**: `./docker-start.sh`
2. **Test API Gateway**: http://localhost:3000
3. **Login with admin credentials**
4. **Explore the API documentation**
5. **Set up monitoring and logging**

---

**🏥 Hospital Management System v2.0.0**  
**🐳 Dockerized with ❤️ by Hospital Management Team**

*Last updated: August 8, 2025*
