// Notification Service Database Initialization (MongoDB)
// This script sets up the notification service database collections and indexes

// Switch to notification database
db = db.getSiblingDB('notification_service_db');

// Create collections with validation schemas

// 1. Notifications collection
db.createCollection("notifications", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["recipient_user_id", "title", "message", "type", "status"],
         properties: {
            recipient_user_id: {
               bsonType: "string",
               description: "UUID of the recipient user"
            },
            recipient_type: {
               bsonType: "string",
               enum: ["user", "patient", "doctor", "staff"],
               description: "Type of recipient"
            },
            title: {
               bsonType: "string",
               maxLength: 255,
               description: "Notification title"
            },
            message: {
               bsonType: "string",
               description: "Notification message content"
            },
            type: {
               bsonType: "string",
               enum: ["appointment", "prescription", "system", "emergency", "reminder"],
               description: "Type of notification"
            },
            priority: {
               bsonType: "string",
               enum: ["low", "normal", "high", "urgent"],
               description: "Notification priority"
            },
            channels: {
               bsonType: "array",
               items: {
                  bsonType: "string",
                  enum: ["web", "email", "sms", "push"]
               },
               description: "Delivery channels"
            },
            status: {
               bsonType: "string",
               enum: ["pending", "sent", "delivered", "read", "failed"],
               description: "Notification status"
            },
            related_entity_type: {
               bsonType: "string",
               enum: ["appointment", "prescription", "patient", "user"],
               description: "Type of related entity"
            },
            related_entity_id: {
               bsonType: "string",
               description: "UUID of related entity"
            },
            created_at: {
               bsonType: "date",
               description: "Creation timestamp"
            },
            sent_at: {
               bsonType: ["date", "null"],
               description: "Sent timestamp"
            },
            read_at: {
               bsonType: ["date", "null"],
               description: "Read timestamp"
            },
            expires_at: {
               bsonType: ["date", "null"],
               description: "Expiration timestamp"
            }
         }
      }
   }
});

// 2. Notification templates collection
db.createCollection("notification_templates", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["template_name", "template_type", "subject", "body"],
         properties: {
            template_name: {
               bsonType: "string",
               description: "Unique template identifier"
            },
            template_type: {
               bsonType: "string",
               enum: ["email", "sms", "push", "web"],
               description: "Template delivery type"
            },
            subject: {
               bsonType: "string",
               maxLength: 255,
               description: "Template subject line"
            },
            body: {
               bsonType: "string",
               description: "Template body with placeholders"
            },
            variables: {
               bsonType: "array",
               items: {
                  bsonType: "string"
               },
               description: "Available template variables"
            },
            is_active: {
               bsonType: "bool",
               description: "Template active status"
            },
            created_at: {
               bsonType: "date",
               description: "Creation timestamp"
            },
            updated_at: {
               bsonType: "date",
               description: "Last update timestamp"
            }
         }
      }
   }
});

// 3. Notification preferences collection
db.createCollection("notification_preferences", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["user_id", "preferences"],
         properties: {
            user_id: {
               bsonType: "string",
               description: "UUID of the user"
            },
            preferences: {
               bsonType: "object",
               description: "User notification preferences"
            },
            created_at: {
               bsonType: "date",
               description: "Creation timestamp"
            },
            updated_at: {
               bsonType: "date",
               description: "Last update timestamp"
            }
         }
      }
   }
});

// 4. Notification delivery log collection
db.createCollection("notification_delivery_log", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["notification_id", "channel", "status"],
         properties: {
            notification_id: {
               bsonType: "objectId",
               description: "Reference to notification"
            },
            channel: {
               bsonType: "string",
               enum: ["web", "email", "sms", "push"],
               description: "Delivery channel"
            },
            status: {
               bsonType: "string",
               enum: ["pending", "sent", "delivered", "failed", "bounced"],
               description: "Delivery status"
            },
            provider: {
               bsonType: "string",
               description: "Service provider used"
            },
            provider_response: {
               bsonType: "object",
               description: "Provider API response"
            },
            error_message: {
               bsonType: ["string", "null"],
               description: "Error message if failed"
            },
            retry_count: {
               bsonType: "int",
               minimum: 0,
               description: "Number of retry attempts"
            },
            sent_at: {
               bsonType: ["date", "null"],
               description: "Sent timestamp"
            },
            delivered_at: {
               bsonType: ["date", "null"],
               description: "Delivered timestamp"
            },
            created_at: {
               bsonType: "date",
               description: "Creation timestamp"
            }
         }
      }
   }
});

// Create indexes for performance
print("Creating indexes for notifications collection...");
db.notifications.createIndex({ "recipient_user_id": 1, "created_at": -1 });
db.notifications.createIndex({ "status": 1, "created_at": -1 });
db.notifications.createIndex({ "type": 1, "created_at": -1 });
db.notifications.createIndex({ "priority": 1, "status": 1 });
db.notifications.createIndex({ "related_entity_type": 1, "related_entity_id": 1 });
db.notifications.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }); // TTL index

print("Creating indexes for notification_templates collection...");
db.notification_templates.createIndex({ "template_name": 1, "template_type": 1 }, { unique: true });
db.notification_templates.createIndex({ "is_active": 1 });

print("Creating indexes for notification_preferences collection...");
db.notification_preferences.createIndex({ "user_id": 1 }, { unique: true });

print("Creating indexes for notification_delivery_log collection...");
db.notification_delivery_log.createIndex({ "notification_id": 1 });
db.notification_delivery_log.createIndex({ "channel": 1, "status": 1 });
db.notification_delivery_log.createIndex({ "created_at": -1 });

// Insert sample notification templates
print("Inserting sample notification templates...");

db.notification_templates.insertMany([
    {
        template_name: "appointment_reminder",
        template_type: "email",
        subject: "Nhắc nhở: Lịch khám vào {{appointment_date}}",
        body: `Xin chào {{patient_name}},

Đây là thông báo nhắc nhở về lịch khám của bạn:

Thời gian: {{appointment_date}} lúc {{appointment_time}}
Bác sĩ: {{doctor_name}}
Phòng khám: {{room_number}}
Lý do khám: {{reason}}

Vui lòng có mặt đúng giờ và mang theo các giấy tờ cần thiết.

Trân trọng,
Bệnh viện ABC`,
        variables: ["patient_name", "appointment_date", "appointment_time", "doctor_name", "room_number", "reason"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        template_name: "appointment_reminder",
        template_type: "sms",
        subject: "Nhắc lịch khám",
        body: "Xin chào {{patient_name}}! Nhắc nhở lịch khám ngày {{appointment_date}} lúc {{appointment_time}} với BS {{doctor_name}}. Phòng {{room_number}}.",
        variables: ["patient_name", "appointment_date", "appointment_time", "doctor_name", "room_number"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        template_name: "prescription_ready",
        template_type: "email",
        subject: "Đơn thuốc {{prescription_number}} đã sẵn sàng",
        body: `Xin chào {{patient_name}},

Đơn thuốc {{prescription_number}} của bạn đã được chuẩn bị xong và sẵn sàng để lấy.

Thông tin đơn thuốc:
- Số đơn: {{prescription_number}}
- Bác sĩ kê đơn: {{doctor_name}}
- Ngày kê: {{issued_date}}
- Tổng tiền: {{total_cost}} VND

Vui lòng đến quầy thuốc để nhận đơn thuốc trong giờ hành chính.

Trân trọng,
Phòng thuốc Bệnh viện ABC`,
        variables: ["patient_name", "prescription_number", "doctor_name", "issued_date", "total_cost"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        template_name: "prescription_ready",
        template_type: "sms",
        subject: "Thuốc sẵn sàng",
        body: "{{patient_name}}: Đơn thuốc {{prescription_number}} đã sẵn sàng. Tổng tiền: {{total_cost}}đ. Đến quầy thuốc để nhận.",
        variables: ["patient_name", "prescription_number", "total_cost"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        template_name: "appointment_confirmed",
        template_type: "email",
        subject: "Xác nhận lịch khám {{appointment_number}}",
        body: `Xin chào {{patient_name}},

Lịch khám của bạn đã được xác nhận:

Mã lịch khám: {{appointment_number}}
Thời gian: {{appointment_date}} lúc {{appointment_time}}
Bác sĩ: {{doctor_name}}
Phòng khám: {{room_number}}
Phí khám: {{fee}} VND

Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi.

Trân trọng,
Bệnh viện ABC`,
        variables: ["patient_name", "appointment_number", "appointment_date", "appointment_time", "doctor_name", "room_number", "fee"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        template_name: "welcome_new_patient",
        template_type: "email",
        subject: "Chào mừng bạn đến với Bệnh viện ABC",
        body: `Xin chào {{patient_name}},

Chào mừng bạn đến với Bệnh viện ABC!

Mã bệnh nhân của bạn: {{patient_code}}
Ngày đăng ký: {{registration_date}}

Thông tin liên hệ:
- Hotline: 1900-1234
- Email: support@hospital-abc.com
- Website: www.hospital-abc.com

Chúng tôi cam kết mang đến cho bạn dịch vụ chăm sóc sức khỏe tốt nhất.

Trân trọng,
Bệnh viện ABC`,
        variables: ["patient_name", "patient_code", "registration_date"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    }
]);

// Insert sample notification preferences
print("Inserting sample notification preferences...");

db.notification_preferences.insertMany([
    {
        user_id: "550e8400-e29b-41d4-a716-446655440000", // Sample UUID
        preferences: {
            appointment_reminders: {
                email: true,
                sms: true,
                push: true,
                advance_hours: 24
            },
            prescription_ready: {
                email: true,
                sms: true,
                push: false
            },
            system_notifications: {
                email: false,
                sms: false,
                push: true
            },
            emergency_alerts: {
                email: true,
                sms: true,
                push: true
            }
        },
        created_at: new Date(),
        updated_at: new Date()
    }
]);

// Insert sample notifications for testing
print("Inserting sample notifications...");

db.notifications.insertMany([
    {
        recipient_user_id: "550e8400-e29b-41d4-a716-446655440000",
        recipient_type: "patient",
        title: "Nhắc nhở lịch khám",
        message: "Bạn có lịch khám vào ngày mai lúc 9:00 AM với BS. Nguyễn Văn A",
        type: "appointment",
        priority: "normal",
        channels: ["email", "sms"],
        status: "pending",
        related_entity_type: "appointment",
        related_entity_id: "660e8400-e29b-41d4-a716-446655440001",
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    {
        recipient_user_id: "550e8400-e29b-41d4-a716-446655440000",
        recipient_type: "patient",
        title: "Đơn thuốc sẵn sàng",
        message: "Đơn thuốc PX20250807001 của bạn đã sẵn sàng để lấy",
        type: "prescription",
        priority: "high",
        channels: ["email", "sms", "push"],
        status: "sent",
        related_entity_type: "prescription",
        related_entity_id: "770e8400-e29b-41d4-a716-446655440002",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    }
]);

print("Notification service database initialization completed!");

// Create user for application access
db.createUser({
    user: "notification_app",
    pwd: "notification_app_123",
    roles: [
        { role: "readWrite", db: "notification_service_db" }
    ]
});

print("Application user 'notification_app' created successfully!");
