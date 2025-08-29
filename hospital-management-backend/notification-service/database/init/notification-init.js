// MongoDB initialization script for Notification Service
print('🚀 Initializing MongoDB for Notification Service...');

// Switch to notification service database
db = db.getSiblingDB('notification_service_db');

// Create collections with indexes
print('📋 Creating collections and indexes...');

// Notifications collection
db.createCollection('notifications');
db.notifications.createIndex({ recipient_user_id: 1 });
db.notifications.createIndex({ status: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ priority: 1 });
db.notifications.createIndex({ created_at: -1 });
db.notifications.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
db.notifications.createIndex({
  recipient_user_id: 1,
  status: 1,
  created_at: -1
});

// Notification templates collection
db.createCollection('notificationtemplates');
db.notificationtemplates.createIndex({ template_name: 1, template_type: 1 }, { unique: true });
db.notificationtemplates.createIndex({ is_active: 1 });

// Notification preferences collection
db.createCollection('notificationpreferences');
db.notificationpreferences.createIndex({ user_id: 1 }, { unique: true });

// Notification delivery logs collection
db.createCollection('notificationdeliverylogs');
db.notificationdeliverylogs.createIndex({ notification_id: 1 });
db.notificationdeliverylogs.createIndex({ channel: 1 });
db.notificationdeliverylogs.createIndex({ status: 1 });
db.notificationdeliverylogs.createIndex({ created_at: -1 });


// Notification delivery retries collection
db.createCollection('notification_delivery_retries');
db.notification_delivery_retries.createIndex({ notification_id: 1 });
db.notification_delivery_retries.createIndex({ status: 1 });
db.notification_delivery_retries.createIndex({ next_retry_at: 1 });
print('✅ Collections and indexes created successfully');

// Insert sample templates
print('📝 Inserting sample notification templates...');

const templates = [
  {
    template_name: 'appointment_reminder',
    template_type: 'email',
    subject: 'Nhắc nhở lịch khám - {{patient_name}}',
    body: `
      <h2>Nhắc nhở lịch khám</h2>
      <p>Xin chào <strong>{{patient_name}}</strong>,</p>
      <p>Bạn có lịch khám vào <strong>{{appointment_date}}</strong> lúc <strong>{{appointment_time}}</strong></p>
      <p><strong>Bác sĩ:</strong> {{doctor_name}}</p>
      <p><strong>Phòng:</strong> {{room_number}}</p>
      <p><strong>Lý do khám:</strong> {{reason}}</p>
      <p>Vui lòng đến đúng giờ. Cảm ơn!</p>
      <hr>
      <p><em>Bệnh viện ABC - Hệ thống quản lý bệnh viện</em></p>
    `,
    variables: ['patient_name', 'appointment_date', 'appointment_time', 'doctor_name', 'room_number', 'reason'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    template_name: 'appointment_reminder',
    template_type: 'sms',
    subject: 'Nhắc lịch khám',
    body: 'Xin chào {{patient_name}}! Bạn có lịch khám vào {{appointment_date}} lúc {{appointment_time}} với {{doctor_name}}. Phòng {{room_number}}. Vui lòng đến đúng giờ!',
    variables: ['patient_name', 'appointment_date', 'appointment_time', 'doctor_name', 'room_number'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    template_name: 'prescription_ready',
    template_type: 'email',
    subject: 'Đơn thuốc sẵn sàng - {{prescription_number}}',
    body: `
      <h2>Đơn thuốc sẵn sàng</h2>
      <p>Xin chào <strong>{{patient_name}}</strong>,</p>
      <p>Đơn thuốc <strong>{{prescription_number}}</strong> của bạn đã sẵn sàng để lấy.</p>
      <p><strong>Bác sĩ kê đơn:</strong> {{doctor_name}}</p>
      <p><strong>Ngày kê đơn:</strong> {{issued_date}}</p>
      <p><strong>Tổng tiền:</strong> {{total_cost}} VNĐ</p>
      <p>Vui lòng đến quầy thuốc để nhận đơn thuốc.</p>
      <hr>
      <p><em>Bệnh viện ABC - Hệ thống quản lý bệnh viện</em></p>
    `,
    variables: ['patient_name', 'prescription_number', 'doctor_name', 'issued_date', 'total_cost'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    template_name: 'prescription_ready',
    template_type: 'sms',
    subject: 'Đơn thuốc sẵn sàng',
    body: 'Xin chào {{patient_name}}! Đơn thuốc {{prescription_number}} đã sẵn sàng. Tổng tiền: {{total_cost}} VNĐ. Vui lòng đến quầy thuốc để nhận.',
    variables: ['patient_name', 'prescription_number', 'total_cost'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    template_name: 'system_alert',
    template_type: 'email',
    subject: 'Thông báo hệ thống - {{title}}',
    body: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <p><strong>Mức độ:</strong> {{priority}}</p>
      <p><strong>Loại cảnh báo:</strong> {{alert_type}}</p>
      <hr>
      <p><em>Bệnh viện ABC - Hệ thống quản lý bệnh viện</em></p>
    `,
    variables: ['title', 'message', 'priority', 'alert_type'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

db.notificationtemplates.insertMany(templates);
print('✅ Sample templates inserted successfully');

// Insert sample notification preferences
print('👤 Inserting sample notification preferences...');

const preferences = [
  {
    user_id: 'test-user-123',
    email_enabled: true,
    sms_enabled: true,
    web_enabled: true,
    push_enabled: false,
    notification_types: {
      appointment: {
        email: true,
        sms: true,
        web: true,
        push: false
      },
      prescription: {
        email: true,
        sms: true,
        web: true,
        push: false
      },
      system: {
        email: true,
        sms: false,
        web: true,
        push: false
      },
      emergency: {
        email: true,
        sms: true,
        web: true,
        push: true
      }
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    user_id: 'patient-456',
    email_enabled: true,
    sms_enabled: true,
    web_enabled: true,
    push_enabled: false,
    notification_types: {
      appointment: {
        email: true,
        sms: true,
        web: true,
        push: false
      },
      prescription: {
        email: true,
        sms: true,
        web: true,
        push: false
      },
      system: {
        email: false,
        sms: false,
        web: true,
        push: false
      },
      emergency: {
        email: true,
        sms: true,
        web: true,
        push: true
      }
    },
    created_at: new Date(),
    updated_at: new Date()
  }
];

db.notificationpreferences.insertMany(preferences);
print('✅ Sample preferences inserted successfully');

print('🎉 MongoDB initialization completed successfully!');
print('📊 Collections created:');
print('  - notifications (with indexes)');
print('  - notificationtemplates (with sample data)');
print('  - notificationpreferences (with sample data)');
print('  - notificationdeliverylogs (with indexes)');
print('  - notification_delivery_retries (with indexes)');
print('🚀 Ready for Notification Service!');
