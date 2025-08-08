# Hospital Management System - Makefile
# Commands for easy development and deployment

.PHONY: help setup up down logs clean build test

# Default target
help:
	@echo "Hospital Management System - Available Commands:"
	@echo ""
	@echo "Setup Commands:"
	@echo "  setup          - Initial setup (copy env, create networks)"
	@echo "  build          - Build all Docker images"
	@echo ""
	@echo "Development Commands:"
	@echo "  up             - Start all services"
	@echo "  down           - Stop all services"
	@echo "  restart        - Restart all services"
	@echo "  logs           - View logs from all services"
	@echo "  logs-follow    - Follow logs from all services"
	@echo ""
	@echo "Database Commands:"
	@echo "  db-up          - Start only databases"
	@echo "  db-down        - Stop only databases"
	@echo "  db-init        - Initialize databases with sample data"
	@echo "  db-backup      - Backup all databases"
	@echo "  db-restore     - Restore databases from backup"
	@echo ""
	@echo "Service Commands:"
	@echo "  services-up    - Start only microservices"
	@echo "  services-down  - Stop only microservices"
	@echo "  gateway-logs   - View API Gateway logs"
	@echo ""
	@echo "Monitoring Commands:"
	@echo "  monitor-up     - Start monitoring tools (pgAdmin, mongo-express)"
	@echo "  monitor-down   - Stop monitoring tools"
	@echo ""
	@echo "Utility Commands:"
	@echo "  clean          - Remove all containers, volumes, and images"
	@echo "  clean-volumes  - Remove only volumes (data loss!)"
	@echo "  ps             - Show running containers"
	@echo "  health         - Check health of all services"
	@echo ""

# Setup commands
setup:
	@echo "Setting up Hospital Management System..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file"; fi
	@docker network create hospital-network 2>/dev/null || true
	@echo "Setup completed!"

# Docker Compose commands
up:
	@echo "Starting all services..."
	docker-compose up -d
	@echo "All services started!"
	@echo "Services available at:"
	@echo "  - API Gateway: http://localhost:3000"
	@echo "  - pgAdmin: http://localhost:8080 (admin@hospital.com / admin123)"
	@echo "  - Mongo Express: http://localhost:8081 (admin / admin123)"
	@echo "  - RabbitMQ Management: http://localhost:15672 (hospital / hospital_mq_123)"

down:
	@echo "Stopping all services..."
	docker-compose down

restart:
	@echo "Restarting all services..."
	docker-compose down
	docker-compose up -d

build:
	@echo "Building all images..."
	docker-compose build

# Database specific commands
db-up:
	@echo "Starting database services..."
	docker-compose up -d auth-db patient-db appointment-db prescription-db notification-db analytics-db redis

db-down:
	@echo "Stopping database services..."
	docker-compose stop auth-db patient-db appointment-db prescription-db notification-db analytics-db redis

db-init:
	@echo "Databases are automatically initialized with init scripts on first run"
	@echo "Check logs with: make logs"

db-backup:
	@echo "Creating database backups..."
	@mkdir -p backups
	@docker exec hospital-auth-db pg_dump -U auth_user auth_service_db > backups/auth_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@docker exec hospital-patient-db pg_dump -U patient_user patient_service_db > backups/patient_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@docker exec hospital-appointment-db pg_dump -U appointment_user appointment_service_db > backups/appointment_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@docker exec hospital-prescription-db pg_dump -U prescription_user prescription_service_db > backups/prescription_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@docker exec hospital-analytics-db pg_dump -U analytics_user analytics_service_db > backups/analytics_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Database backups created in ./backups/"

# Service specific commands (will be implemented when services are created)
services-up:
	@echo "Microservices will be started here when implemented"
	# docker-compose up -d api-gateway auth-service patient-service appointment-service prescription-service notification-service

services-down:
	@echo "Microservices will be stopped here when implemented"
	# docker-compose stop api-gateway auth-service patient-service appointment-service prescription-service notification-service

# Monitoring commands
monitor-up:
	@echo "Starting monitoring tools..."
	docker-compose up -d pgadmin mongo-express

monitor-down:
	@echo "Stopping monitoring tools..."
	docker-compose stop pgadmin mongo-express

# Logging commands
logs:
	docker-compose logs

logs-follow:
	docker-compose logs -f

gateway-logs:
	@echo "API Gateway logs will be available when service is implemented"
	# docker-compose logs -f api-gateway

# Utility commands
ps:
	docker-compose ps

health:
	@echo "Checking service health..."
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

clean:
	@echo "WARNING: This will remove all containers, volumes, and images!"
	@echo "Press Ctrl+C to cancel, or wait 10 seconds to continue..."
	@sleep 10
	docker-compose down -v --rmi all
	docker system prune -af

clean-volumes:
	@echo "WARNING: This will remove all volumes and data!"
	@echo "Press Ctrl+C to cancel, or wait 10 seconds to continue..."
	@sleep 10
	docker-compose down -v

# Test commands (will be implemented later)
test:
	@echo "Running tests..."
	@echo "Test commands will be implemented when services are ready"

# Development helpers
dev-setup: setup db-up
	@echo "Development environment ready!"
	@echo "Databases are starting up, check logs with: make logs"

reset: clean setup up
	@echo "Environment has been reset!"

# Database connection helpers
psql-auth:
	docker exec -it hospital-auth-db psql -U auth_user -d auth_service_db

psql-patient:
	docker exec -it hospital-patient-db psql -U patient_user -d patient_service_db

psql-appointment:
	docker exec -it hospital-appointment-db psql -U appointment_user -d appointment_service_db

psql-prescription:
	docker exec -it hospital-prescription-db psql -U prescription_user -d prescription_service_db

psql-analytics:
	docker exec -it hospital-analytics-db psql -U analytics_user -d analytics_service_db

mongo-cli:
	docker exec -it hospital-notification-db mongosh -u notification_user -p notification_password_123 --authenticationDatabase admin notification_service_db

redis-cli:
	docker exec -it hospital-redis redis-cli -a redis_password_123
