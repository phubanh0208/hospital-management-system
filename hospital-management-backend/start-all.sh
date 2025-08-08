#!/bin/bash

# Hospital Management System - Complete Setup Script
# This script starts databases first, then services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}============================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}============================================${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is healthy
check_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=20
    local attempt=1
    
    print_status "Checking $service_name health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_success "$service_name is healthy!"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "$service_name failed to start (timeout after ${max_attempts} attempts)"
            return 1
        fi
        
        echo "   Attempt $attempt/$max_attempts..."
        sleep 5
        attempt=$((attempt + 1))
    done
}

print_header "🏥 Hospital Management System - Complete Setup"

# Step 1: Start Databases
print_status "Step 1: Starting databases..."
cd ../
docker-compose up -d

print_status "Waiting 30 seconds for databases to initialize..."
sleep 30

# Step 2: Start Services  
print_status "Step 2: Starting microservices..."
cd hospital-management-backend/
docker-compose up -d --build

print_status "Waiting 20 seconds for services to start..."
sleep 20

# Step 3: Health Check
print_header "🔍 Health Check - All Services"

if check_health "API Gateway" "http://localhost:3000/health" && \
   check_health "Auth Service" "http://localhost:3001/health" && \
   check_health "Patient Service" "http://localhost:3002/health" && \
   check_health "Appointment Service" "http://localhost:3003/health" && \
   check_health "Prescription Service" "http://localhost:3004/health" && \
   check_health "Notification Service" "http://localhost:3005/health" && \
   check_health "Analytics Service" "http://localhost:3006/health"; then
   
    print_header "🎉 SUCCESS! All Services Running"
    
    echo ""
    echo -e "${CYAN}📋 Service URLs:${NC}"
    echo "   API Gateway:     http://localhost:3000"
    echo "   Auth Service:    http://localhost:3001"
    echo "   Patient Service: http://localhost:3002"
    echo "   Appointment:     http://localhost:3003"
    echo "   Prescription:    http://localhost:3004"
    echo "   Notification:    http://localhost:3005"
    echo "   Analytics:       http://localhost:3006"
    echo ""
    echo -e "${CYAN}🗄️ Admin Interfaces:${NC}"
    echo "   PgAdmin:         http://localhost:8080"
    echo "   Mongo Express:   http://localhost:8081"
    echo "   RabbitMQ:        http://localhost:15672"
    echo ""
    echo -e "${CYAN}🔐 Default Credentials:${NC}"
    echo "   Admin: admin@hospital.com / Admin123!@#"
    echo "   PgAdmin: admin@hospital.com / admin123"
    echo ""
    echo -e "${CYAN}🛠️ Commands:${NC}"
    echo "   Stop all: ./stop-all.sh"
    echo "   View logs: docker-compose logs -f"
    
else
    print_error "Some services failed to start. Check logs with:"
    echo "   docker-compose logs [service-name]"
    exit 1
fi
