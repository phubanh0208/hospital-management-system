#!/bin/bash

# Hospital Management System - Stop All Script

set -e

# Colors
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
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

print_header "🛑 Stopping Hospital Management System"

# Stop services
print_status "Stopping microservices..."
docker-compose down

# Stop databases  
print_status "Stopping databases..."
cd ../
docker-compose down

# Clean up (optional)
echo ""
read -p "Remove unused Docker images and volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    print_success "Cleanup completed!"
fi

print_success "All services stopped successfully! 🏥✋"
