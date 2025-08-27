const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3005';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
    console.log(`\n${colors.blue}${colors.bright}🧪 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
    log(colors.green, `✅ ${message}`);
}

function logError(message) {
    log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
    log(colors.yellow, `⚠️  ${message}`);
}

// Test data
const testUserId = 'user_12345';
const testPatientId = 'patient_67890';

async function testHealthCheck() {
    logTest('Health Check');
    
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        
        if (response.status === 200) {
            logSuccess('Service is healthy');
            console.log('   Database:', response.data.database.mongodb ? '✅ Connected' : '❌ Disconnected');
            console.log('   RabbitMQ:', response.data.messageQueue.rabbitmq ? '✅ Connected' : '❌ Disconnected');
            console.log('   Uptime:', Math.round(response.data.uptime), 'seconds');
            return true;
        }
    } catch (error) {
        logError(`Health check failed: ${error.message}`);
        return false;
    }
}

async function testCreateBasicNotification() {
    logTest('Create Basic Notification');
    
    try {
        const notificationData = {
            recipient_user_id: testUserId,
            recipient_type: 'patient',
            title: 'Test Notification',
            message: 'This is a test notification from API test',
            type: 'system',
            priority: 'normal',
            channels: ['web', 'email']
        };

        const response = await axios.post(`${BASE_URL}/api/notifications`, notificationData);
        
        if (response.status === 201) {
            logSuccess('Basic notification created successfully');
            console.log('   Notification ID:', response.data.data.id);
            console.log('   Channels:', response.data.data.channels);
            console.log('   Status:', response.data.data.status);
            return response.data.data;
        }
    } catch (error) {
        logError(`Create notification failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testCreateAsyncNotification() {
    logTest('Create Async Notification');
    
    try {
        const notificationData = {
            recipient_user_id: testUserId,
            recipient_type: 'patient',
            title: 'Async Test Notification',
            message: 'This notification will be processed asynchronously',
            type: 'system',
            priority: 'high',
            channels: ['web', 'email', 'sms']
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/async`, notificationData);
        
        if (response.status === 201) {
            logSuccess('Async notification queued successfully');
            console.log('   Notification ID:', response.data.data.id);
            console.log('   Processing:', 'Queued for async processing');
            return response.data.data;
        }
    } catch (error) {
        logError(`Create async notification failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testAppointmentReminder() {
    logTest('Send Appointment Reminder');
    
    try {
        const appointmentData = {
            recipient_user_id: testPatientId,
            patient_name: 'Nguyễn Văn A',
            doctor_name: 'BS. Trần Thị B',
            appointment_date: '2025-08-28',
            appointment_time: '14:30',
            appointment_number: 'APT001',
            room_number: 'P.201',
            reason: 'Khám định kỳ'
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/send-appointment-reminder`, appointmentData);
        
        if (response.status === 200) {
            logSuccess('Appointment reminder sent successfully');
            console.log('   Patient:', appointmentData.patient_name);
            console.log('   Doctor:', appointmentData.doctor_name);
            console.log('   Date/Time:', `${appointmentData.appointment_date} at ${appointmentData.appointment_time}`);
            return response.data.data;
        }
    } catch (error) {
        logError(`Send appointment reminder failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testPrescriptionReady() {
    logTest('Send Prescription Ready Notification');
    
    try {
        const prescriptionData = {
            recipient_user_id: testPatientId,
            patient_name: 'Nguyễn Văn A',
            doctor_name: 'BS. Trần Thị B',
            prescription_number: 'RX123456',
            issued_date: '2025-08-27',
            total_cost: '250,000 VND'
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/send-prescription-ready`, prescriptionData);
        
        if (response.status === 200) {
            logSuccess('Prescription ready notification sent successfully');
            console.log('   Patient:', prescriptionData.patient_name);
            console.log('   Prescription:', prescriptionData.prescription_number);
            console.log('   Cost:', prescriptionData.total_cost);
            return response.data.data;
        }
    } catch (error) {
        logError(`Send prescription notification failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testQueueAppointmentReminder() {
    logTest('Queue Appointment Reminder (Async)');
    
    try {
        const appointmentData = {
            recipient_user_id: testPatientId,
            patient_name: 'Lê Thị C',
            doctor_name: 'BS. Phạm Văn D',
            appointment_date: '2025-08-29',
            appointment_time: '09:00',
            appointment_number: 'APT002',
            room_number: 'P.105'
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/queue/appointment-reminder`, appointmentData);
        
        if (response.status === 200) {
            logSuccess('Appointment reminder queued successfully');
            console.log('   Patient:', appointmentData.patient_name);
            console.log('   Processing:', 'Queued via RabbitMQ');
            return response.data;
        }
    } catch (error) {
        logError(`Queue appointment reminder failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testSystemAlert() {
    logTest('Send System Alert');
    
    try {
        const alertData = {
            recipient_user_id: testUserId,
            title: 'System Maintenance Alert',
            message: 'The system will undergo maintenance from 11:00 PM to 1:00 AM tonight.',
            priority: 'high',
            alert_type: 'maintenance'
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/queue/system-alert`, alertData);
        
        if (response.status === 200) {
            logSuccess('System alert queued successfully');
            console.log('   Alert Type:', alertData.alert_type);
            console.log('   Priority:', alertData.priority);
            return response.data;
        }
    } catch (error) {
        logError(`Send system alert failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testBulkNotification() {
    logTest('Send Bulk Notification');
    
    try {
        const bulkData = {
            recipient_user_ids: [testUserId, testPatientId, 'user_999'],
            title: 'Important Hospital Announcement',
            message: 'New visiting hours: Monday-Friday 8:00-18:00, Weekend 10:00-16:00',
            notification_type: 'system',
            priority: 'normal',
            channels: ['web', 'email']
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/queue/bulk`, bulkData);
        
        if (response.status === 200) {
            logSuccess('Bulk notification queued successfully');
            console.log('   Recipients:', bulkData.recipient_user_ids.length);
            console.log('   Channels:', bulkData.channels.join(', '));
            return response.data;
        }
    } catch (error) {
        logError(`Send bulk notification failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testGetNotifications() {
    logTest('Get User Notifications');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/notifications`, {
            params: {
                userId: testUserId,
                page: 1,
                limit: 10
            }
        });
        
        if (response.status === 200) {
            const { notifications, total, page, totalPages } = response.data.data;
            logSuccess(`Retrieved ${notifications.length} notifications`);
            console.log('   Total:', total);
            console.log('   Page:', `${page}/${totalPages}`);
            
            if (notifications.length > 0) {
                console.log('   Latest notification:', notifications[0].title);
            }
            
            return notifications;
        }
    } catch (error) {
        logError(`Get notifications failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testGetUnreadCount() {
    logTest('Get Unread Count');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/notifications/unread-count`, {
            params: { userId: testUserId }
        });
        
        if (response.status === 200) {
            logSuccess(`Unread count: ${response.data.data.count}`);
            return response.data.data.count;
        }
    } catch (error) {
        logError(`Get unread count failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testMarkAsRead(notificationId) {
    if (!notificationId) {
        logWarning('No notification ID provided for mark as read test');
        return null;
    }
    
    logTest('Mark Notification as Read');
    
    try {
        const response = await axios.put(`${BASE_URL}/api/notifications/${notificationId}/read`, {
            userId: testUserId
        });
        
        if (response.status === 200) {
            logSuccess('Notification marked as read');
            return response.data;
        }
    } catch (error) {
        logError(`Mark as read failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testRetryStatistics() {
    logTest('Get Retry Statistics');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/notifications/admin/retry-stats`);
        
        if (response.status === 200) {
            logSuccess('Retry statistics retrieved');
            console.log('   Stats:', JSON.stringify(response.data.data, null, 2));
            return response.data.data;
        }
    } catch (error) {
        logError(`Get retry statistics failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testProcessRetries() {
    logTest('Process Pending Retries');
    
    try {
        const response = await axios.post(`${BASE_URL}/api/notifications/admin/process-retries`);
        
        if (response.status === 200) {
            logSuccess('Retry processing completed');
            console.log('   Message:', response.data.message);
            return response.data;
        }
    } catch (error) {
        logError(`Process retries failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testTestNotification() {
    logTest('Send Test Notification');
    
    try {
        const testData = {
            recipient_user_id: testUserId,
            channel: 'email', // or 'sms' or 'web'
            title: 'API Test Notification',
            message: 'This is a test notification to verify the service is working correctly.'
        };

        const response = await axios.post(`${BASE_URL}/api/notifications/admin/test-notification`, testData);
        
        if (response.status === 200) {
            logSuccess('Test notification sent successfully');
            console.log('   Channel:', testData.channel);
            console.log('   Result:', response.data.message);
            return response.data;
        }
    } catch (error) {
        logError(`Send test notification failed: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

// Main test runner
async function runAllTests() {
    console.log(`${colors.bright}${colors.blue}🏥 Hospital Management - Notification Service API Tests${colors.reset}\n`);
    
    // Wait for service to start
    console.log('⏳ Waiting for service to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test 1: Health Check
    totalTests++;
    if (await testHealthCheck()) passedTests++;
    
    // Test 2: Basic notification
    totalTests++;
    const basicNotification = await testCreateBasicNotification();
    if (basicNotification) passedTests++;
    
    // Test 3: Async notification
    totalTests++;
    if (await testCreateAsyncNotification()) passedTests++;
    
    // Test 4: Appointment reminder
    totalTests++;
    if (await testAppointmentReminder()) passedTests++;
    
    // Test 5: Prescription ready
    totalTests++;
    if (await testPrescriptionReady()) passedTests++;
    
    // Test 6: Queue appointment reminder
    totalTests++;
    if (await testQueueAppointmentReminder()) passedTests++;
    
    // Test 7: System alert
    totalTests++;
    if (await testSystemAlert()) passedTests++;
    
    // Test 8: Bulk notification
    totalTests++;
    if (await testBulkNotification()) passedTests++;
    
    // Give some time for notifications to be processed
    console.log('\n⏳ Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 9: Get notifications
    totalTests++;
    const notifications = await testGetNotifications();
    if (notifications) passedTests++;
    
    // Test 10: Get unread count
    totalTests++;
    if (await testGetUnreadCount()) passedTests++;
    
    // Test 11: Mark as read (if we have a notification)
    if (basicNotification?.id) {
        totalTests++;
        if (await testMarkAsRead(basicNotification.id)) passedTests++;
    }
    
    // Test 12: Retry statistics
    totalTests++;
    if (await testRetryStatistics()) passedTests++;
    
    // Test 13: Process retries
    totalTests++;
    if (await testProcessRetries()) passedTests++;
    
    // Test 14: Test notification
    totalTests++;
    if (await testTestNotification()) passedTests++;
    
    // Final results
    console.log(`\n${colors.bright}${colors.blue}📊 Test Results:${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${passedTests}/${totalTests}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${totalTests - passedTests}/${totalTests}${colors.reset}`);
    
    if (passedTests === totalTests) {
        console.log(`${colors.green}${colors.bright}🎉 All tests passed! API is fully functional!${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠️  Some tests failed. Check the logs above for details.${colors.reset}`);
    }
    
    return { passed: passedTests, total: totalTests };
}

// Run the tests
runAllTests().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
});
