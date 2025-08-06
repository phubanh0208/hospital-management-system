# Notification Retry System Documentation

## Overview

The Hospital Management System now includes a comprehensive notification retry system that automatically handles failed notification deliveries and provides administrative controls for monitoring and managing retries.

## Features

### 🔄 Automatic Retry Logic
- **Smart Retry Scheduling**: Failed notifications are automatically scheduled for retry with exponential backoff
- **Channel Support**: Handles retries for email, SMS, and web socket notifications  
- **Maximum Retry Limits**: Configurable retry limits prevent infinite retry loops
- **Permanent Failure Marking**: After max retries, notifications are marked as permanently failed

### 📊 Administrative Controls
- **Retry Statistics**: View comprehensive statistics about retry performance
- **Manual Processing**: Trigger retry processing manually for immediate handling
- **System Maintenance**: Clean up old retry records to maintain database performance
- **Test Notifications**: Send test notifications to verify system functionality

### 🏗️ Architecture Components

#### 1. NotificationDeliveryRetryService
Located: `src/services/NotificationDeliveryRetryService.ts`

**Key Methods:**
- `scheduleRetry()` - Schedule a failed notification for retry
- `processRetries()` - Process all pending retries
- `getRetryStatistics()` - Get system statistics
- `cleanupOldRetries()` - Clean up old retry records

#### 2. Updated NotificationService
**Integration Points:**
- Automatically schedules retries on delivery failures
- Uses retry service for failed email, SMS deliveries
- Excludes web socket from retries (transient nature)

#### 3. Admin Endpoints
**Available Routes:**
- `GET /api/notifications/admin/retry-stats` - Get retry statistics
- `POST /api/notifications/admin/process-retries` - Manually process retries  
- `POST /api/notifications/admin/cleanup-retries` - Clean up old retries
- `POST /api/notifications/admin/test-notification` - Send test notification

#### 4. API Gateway Integration
All admin routes are exposed through the API Gateway with proper authentication and authorization (admin-only access).

## Database Schema

### NotificationDeliveryRetry Table
```sql
CREATE TABLE notification_delivery_retry (
  id INT PRIMARY KEY AUTO_INCREMENT,
  notification_id INT NOT NULL,
  channel ENUM('email', 'sms', 'web', 'push') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at DATETIME,
  last_attempt_at DATETIME,
  error_message TEXT,
  status ENUM('pending', 'processing', 'failed_permanently') DEFAULT 'pending',
  notification_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_status_next_retry (status, next_retry_at),
  INDEX idx_notification_id (notification_id),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);
```

## Configuration

### Environment Variables
```env
# Retry Configuration
NOTIFICATION_RETRY_MAX_RETRIES=3
NOTIFICATION_RETRY_BASE_DELAY=300000  # 5 minutes in milliseconds
NOTIFICATION_RETRY_MAX_DELAY=3600000  # 1 hour in milliseconds
NOTIFICATION_RETRY_CLEANUP_DAYS=30    # Keep retries for 30 days
```

### Retry Logic
- **Base Delay**: 5 minutes
- **Exponential Backoff**: delay = baseDelay × 2^(retryCount-1)
- **Maximum Delay**: 1 hour (prevents extremely long delays)
- **Default Max Retries**: 3 attempts per notification

## Usage Examples

### 1. Monitor Retry Statistics
```bash
curl -X GET "http://localhost:3000/api/notifications/admin/retry-stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalPending": 5,
    "totalProcessing": 2,
    "totalFailed": 1,
    "byChannel": {
      "email": { "pending": 3, "processing": 1, "failed": 1 },
      "sms": { "pending": 2, "processing": 1, "failed": 0 }
    },
    "averageRetryCount": 1.8,
    "oldestPendingRetry": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Process Retries Manually
```bash
curl -X POST "http://localhost:3000/api/notifications/admin/process-retries" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### 3. Send Test Notification
```bash
curl -X POST "http://localhost:3000/api/notifications/admin/test-notification" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "channels": ["email"],
    "recipient": "admin@hospital.com",
    "subject": "System Test",
    "message": "Testing notification delivery system."
  }'
```

### 4. Cleanup Old Retries
```bash
curl -X POST "http://localhost:3000/api/notifications/admin/cleanup-retries" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "olderThanDays": 30,
    "includeFailedPermanently": true
  }'
```

## Testing

### Automated Testing
Run the provided test script:
```bash
cd notification-service
node test-retry-endpoints.js
```

### Manual Testing
1. **Start Services**: Ensure notification service and API gateway are running
2. **Generate Failures**: Configure email/SMS providers to fail temporarily
3. **Monitor Retries**: Use admin endpoints to monitor retry behavior
4. **Verify Recovery**: Fix provider configuration and verify successful retries

## Error Handling

### Common Scenarios
- **Provider Timeouts**: Automatically scheduled for retry with exponential backoff
- **Invalid Recipients**: Marked as permanently failed (no retries)
- **Service Unavailable**: Retried up to maximum attempts
- **Rate Limiting**: Handled by retry delays and exponential backoff

### Logging
All retry operations are logged with appropriate log levels:
- `INFO`: Successful operations and retry scheduling
- `WARN`: Retry attempts and temporary failures  
- `ERROR`: Permanent failures and system errors

## Monitoring & Maintenance

### Key Metrics to Monitor
- Pending retry count (should remain low)
- Failed permanently count (indicates systemic issues)
- Average retry count per notification
- Oldest pending retry age

### Maintenance Tasks
- **Daily**: Monitor retry statistics
- **Weekly**: Clean up old retry records
- **Monthly**: Analyze failure patterns and optimize configuration

### Performance Considerations
- Retry processing is batched (100 records at a time)
- Database indexes optimize retry queries
- Cleanup operations prevent table bloat
- Exponential backoff prevents system overload

## Security

### Access Control
- All admin endpoints require authentication
- Only users with 'admin' role can access retry management
- API Gateway enforces authorization policies

### Data Protection
- Sensitive notification data is stored securely
- Error messages are sanitized before storage
- Admin operations are logged for audit purposes

## Future Enhancements

### Planned Features
- **Retry Queue Prioritization**: Priority-based retry processing
- **Advanced Analytics**: Detailed failure analysis and reporting
- **Provider Fallbacks**: Automatic failover to alternative providers
- **Real-time Monitoring**: WebSocket-based live retry monitoring
- **Configuration UI**: Web interface for retry system configuration

### Integration Opportunities  
- **Alerting System**: Notify administrators of high failure rates
- **Performance Metrics**: Integration with system monitoring tools
- **Audit Logging**: Enhanced logging for compliance requirements

## Support

For issues related to the notification retry system:

1. **Check Logs**: Review notification service logs for error details
2. **Verify Configuration**: Ensure environment variables are set correctly
3. **Test Endpoints**: Use the provided test script to verify functionality
4. **Monitor Statistics**: Use admin endpoints to identify bottlenecks

---

**Implementation Status**: ✅ Complete  
**Version**: 1.0.0  
**Last Updated**: January 2024
