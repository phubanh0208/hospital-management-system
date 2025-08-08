#!/bin/bash

# Hospital Management System - Docker Build Script
# This script builds all services with shared dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_header "🏥 Hospital Management System - Docker Build"

# Build all services
SERVICES=("analytics-service" "api-gateway" "appointment-service" "notification-service" "patient-service" "prescription-service")

for service in "${SERVICES[@]}"; do
    print_status "Building $service..."
    if docker build -t "hospital/$service:latest" -f "$service/Dockerfile" .; then
        print_success "$service built successfully"
    else
        print_error "Failed to build $service"
        exit 1
    fi
    echo ""
done

print_success "All services built successfully!"

echo ""
print_header "🚀 Available Commands"
echo -e "${CYAN}Start all services:${NC}"
echo "   docker-compose up -d"
echo ""
echo -e "${CYAN}View logs:${NC}"
echo "   docker-compose logs -f [service-name]"
echo ""
echo -e "${CYAN}Check status:${NC}"
echo "   docker-compose ps"
echo ""
echo -e "${CYAN}Stop all services:${NC}"
echo "   docker-compose down"
echo ""
echo -e "${CYAN}Stop and remove volumes:${NC}"
echo "   docker-compose down -v"
echo ""

print_header "🎯 Next Steps"
echo "1. Start the system: docker-compose up -d"
echo "2. Wait for all services to be healthy (2-3 minutes)"
echo "3. Access API Gateway: http://localhost:3000"
echo "4. Check health: http://localhost:3000/health"
echo ""
echo "🔐 Default admin credentials:"
echo "   Username: admin"
echo "   Password: Admin123!@#"
echo ""

print_success "Build completed! Ready to start the Hospital Management System! 🏥✨"

