# Hospital Management Backend - Start All Services
# This script starts all microservices in separate PowerShell windows

Write-Host "Starting Hospital Management Backend Services..." -ForegroundColor Green

# Array of services to start
$services = @(
    "auth-service",
    "patient-service", 
    "appointment-service",
    "prescription-service",
    "notification-service",
    "analytics-service",
    "api-gateway"
)

# Start each service in a new PowerShell window
foreach ($service in $services) {
    Write-Host "Starting $service..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\$service'; Write-Host 'Starting $service...' -ForegroundColor Green; npm run dev"
    Start-Sleep -Seconds 1  # Small delay to prevent overwhelming the system
}

Write-Host "All services have been started in separate windows!" -ForegroundColor Green
Write-Host "Press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
