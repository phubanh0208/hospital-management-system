# Analytics Service API Documentation

Complete API reference for the Hospital Management System Analytics Service.

## Base URL

- **Development**: `http://localhost:3006`
- **Via API Gateway**: `http://localhost:3000/api/analytics`

## Authentication

Currently, the Analytics Service does not require authentication. In production, implement proper authentication and authorization.

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "timestamp": string (ISO 8601)
}
```

## Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

## Endpoints

### Health Check

#### GET /health

Returns detailed service health information.

**Response:**
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "version": "1.0.0",
  "timestamp": "2025-08-07T23:45:00.000Z",
  "uptime": 3600.123,
  "database": {
    "connected": true,
    "type": "TimescaleDB (PostgreSQL)"
  },
  "environment": "development"
}
```

#### GET /health/simple

Simple health check for load balancers.

**Response:** `OK` (200) or `Service Unavailable` (503)

---

### Patient Analytics

#### GET /api/analytics/patients/monthly

Get patient statistics aggregated by month.

**Query Parameters:**
- `year` (optional): Filter by specific year (e.g., 2025)
- `limit` (optional): Number of months to return (default: 12)

**Example Request:**
```bash
GET /api/analytics/patients/monthly?year=2025&limit=6
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": [
      {
        "month": "2025-08",
        "year": 2025,
        "new_registrations": 15,
        "total_visits": 45,
        "unique_patients": 12
      },
      {
        "month": "2025-07",
        "year": 2025,
        "new_registrations": 18,
        "total_visits": 52,
        "unique_patients": 14
      }
    ],
    "summary": {
      "total_months": 6,
      "total_new_registrations": 95,
      "total_visits": 285,
      "avg_patients_per_month": 15
    }
  },
  "message": "Patient statistics retrieved successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

### Prescription Analytics

#### GET /api/analytics/prescriptions/reports

Get prescription reports aggregated by month.

**Query Parameters:**
- `year` (optional): Filter by specific year
- `limit` (optional): Number of months to return (default: 12)

**Example Request:**
```bash
GET /api/analytics/prescriptions/reports?year=2025&limit=6
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "month": "2025-08",
        "year": 2025,
        "total_prescriptions": 45,
        "total_medications": 120,
        "total_cost": 2500.00,
        "completed_prescriptions": 42
      }
    ],
    "summary": {
      "total_months": 6,
      "total_prescriptions": 270,
      "total_medications": 720,
      "total_cost": 15000.00,
      "completion_rate": 93
    }
  },
  "message": "Prescription reports retrieved successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

### Appointment Analytics

#### GET /api/analytics/appointments/stats

Get appointment statistics over a specified time period.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Example Request:**
```bash
GET /api/analytics/appointments/stats?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": [
      {
        "date": "2025-08-07T00:00:00.000Z",
        "total_appointments": 12,
        "scheduled": 2,
        "completed": 8,
        "cancelled": 2,
        "avg_duration": 35.5,
        "avg_wait_time": 15.2,
        "total_revenue": 600.00
      }
    ],
    "period": "30 days",
    "summary": {
      "total_days": 30,
      "total_appointments": 360,
      "total_revenue": 18000.00,
      "avg_appointments_per_day": 12
    }
  },
  "message": "Appointment statistics retrieved successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

### Doctor Performance

#### GET /api/analytics/doctors/performance

Get doctor performance metrics.

**Query Parameters:**
- `doctorId` (optional): Filter by specific doctor UUID
- `days` (optional): Number of days to analyze (default: 30)

**Example Request:**
```bash
GET /api/analytics/doctors/performance?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": [
      {
        "doctor_id": "123e4567-e89b-12d3-a456-426614174000",
        "total_appointments": 85,
        "total_prescriptions": 72,
        "avg_duration": 32.5,
        "avg_satisfaction": 4.2,
        "total_revenue": 4250.00
      }
    ],
    "period": "30 days",
    "summary": {
      "total_doctors": 5,
      "total_appointments": 425,
      "total_revenue": 21250.00,
      "avg_satisfaction": 4.1
    }
  },
  "message": "Doctor performance metrics retrieved successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

### System Metrics

#### GET /api/analytics/system/metrics

Get system performance metrics.

**Query Parameters:**
- `metricName` (optional): Filter by specific metric name
- `hours` (optional): Number of hours to analyze (default: 24)

**Example Request:**
```bash
GET /api/analytics/system/metrics?hours=24
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "metric_name": "api_response_time",
        "avg_value": 125.5,
        "min_value": 45.0,
        "max_value": 350.0,
        "count": 1440
      },
      {
        "metric_name": "memory_usage",
        "avg_value": 68.2,
        "min_value": 45.0,
        "max_value": 85.0,
        "count": 1440
      }
    ],
    "period": "24 hours",
    "summary": {
      "total_metrics": 2,
      "total_data_points": 2880
    }
  },
  "message": "System metrics retrieved successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

### Dashboard

#### GET /api/analytics/dashboard

Get dashboard summary with key metrics for the current month.

**Example Request:**
```bash
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_patients": 150,
      "total_appointments": 320,
      "total_prescriptions": 280,
      "total_revenue": 15750.00
    },
    "period": "Current month",
    "generated_at": "2025-08-07T23:45:00.000Z"
  },
  "message": "Dashboard summary retrieved successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

### Utilities

#### POST /api/analytics/refresh

Manually refresh materialized views to update analytics data.

**Example Request:**
```bash
POST /api/analytics/refresh
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Analytics views refreshed successfully",
  "timestamp": "2025-08-07T23:45:00.000Z"
}
```

---

## HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service or database unavailable

## Rate Limiting

Currently no rate limiting is implemented. In production, consider implementing:
- 100 requests per 15 minutes per IP
- Higher limits for authenticated users
- Separate limits for different endpoint types

## Caching

Responses are not currently cached. Consider implementing:
- Redis caching for frequently accessed data
- Cache TTL based on data freshness requirements
- Cache invalidation on data updates

## Data Freshness

- **Real-time data**: Dashboard summary, system metrics
- **Materialized views**: Refreshed every 6 hours automatically
- **Historical data**: Updated as new events occur
- **Manual refresh**: Available via `/refresh` endpoint

## Examples

### Get Last 3 Months Patient Data
```bash
curl "http://localhost:3006/api/analytics/patients/monthly?limit=3"
```

### Get Current Year Prescription Reports
```bash
curl "http://localhost:3006/api/analytics/prescriptions/reports?year=2025"
```

### Get Last Week Appointment Stats
```bash
curl "http://localhost:3006/api/analytics/appointments/stats?days=7"
```

### Get Specific Doctor Performance
```bash
curl "http://localhost:3006/api/analytics/doctors/performance?doctorId=123e4567-e89b-12d3-a456-426614174000&days=30"
```

### Get Last 6 Hours System Metrics
```bash
curl "http://localhost:3006/api/analytics/system/metrics?hours=6"
```

---

**Version**: 1.0.0  
**Last Updated**: August 7, 2025  
**Service**: Hospital Management System Analytics Service
