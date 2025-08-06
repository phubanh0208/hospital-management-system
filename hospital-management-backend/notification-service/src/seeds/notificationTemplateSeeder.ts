import mongoose from 'mongoose';
import { TemplateService } from '../services/TemplateService';
import { logger } from '@hospital/shared';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const templateService = new TemplateService();

const templates = [
  // Appointment Confirmation Email Template
  {
    template_name: 'appointment_confirmation',
    template_type: 'email' as const,
    subject: 'Xác nhận lịch hẹn khám tại Bệnh viện ABC',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Xác nhận lịch hẹn</h2>
        <p>Xin chào <strong>{{patient_name}}</strong>,</p>
        <p>Lịch hẹn của bạn đã được xác nhận thành công. Dưới đây là thông tin chi tiết:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Thông tin lịch hẹn</h3>
          <p><strong>Mã lịch hẹn:</strong> {{appointment_number}}</p>
          <p><strong>Bác sĩ:</strong> {{doctor_name}}</p>
          <p><strong>Ngày khám:</strong> {{appointment_date}}</p>
          <p><strong>Giờ khám:</strong> {{appointment_time}}</p>
          <p><strong>Chuyên khoa:</strong> {{reason}}</p>
          <p><strong>Phòng khám:</strong> {{room_number}}</p>
        </div>
        <p>Vui lòng có mặt tại bệnh viện trước 15 phút so với giờ hẹn để làm thủ tục.</p>
        <p>Nếu có bất kỳ thay đổi nào, vui lòng liên hệ với chúng tôi qua số điện thoại (028) 1234 5678.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 14px;">
          Trân trọng,<br>
          Bệnh viện ABC
        </p>
      </div>
    `,
    variables: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', 'appointment_number', 'room_number', 'reason']
  },

  // Appointment Confirmation SMS Template
  {
    template_name: 'appointment_confirmation',
    template_type: 'sms' as const,
    subject: 'Xac nhan lich hen',
    body: 'Lich hen cua ban voi BS {{doctor_name}} vao luc {{appointment_time}} ngay {{appointment_date}} da duoc xac nhan. Ma lich hen: {{appointment_number}}. Vui long den som 15 phut. BV ABC.',
    variables: ['doctor_name', 'appointment_time', 'appointment_date', 'appointment_number']
  },

  // Appointment Reminder Email Template
  {
    template_name: 'appointment_reminder',
    template_type: 'email' as const,
    subject: 'Appointment Reminder - {{appointment_date}} at {{appointment_time}}',
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
    .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .appointment-info { background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { font-weight: bold; color: #1976d2; }
    .value { color: #333; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 5px; font-weight: bold; }
    .button:hover { background: #218838; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Appointment Reminder</h1>
      <p>Your upcoming medical appointment</p>
    </div>
    
    <div class="content">
      <p>Dear <strong>{{patient_name}}</strong>,</p>
      
      <p>This is a friendly reminder about your upcoming appointment at our hospital.</p>
      
      <div class="appointment-info">
        <h3 style="margin-top: 0; color: #1976d2;">📅 Appointment Details</h3>
        <div class="info-row">
          <span class="label">Date:</span>
          <span class="value">{{appointment_date}}</span>
        </div>
        <div class="info-row">
          <span class="label">Time:</span>
          <span class="value">{{appointment_time}}</span>
        </div>
        <div class="info-row">
          <span class="label">Doctor:</span>
          <span class="value">{{doctor_name}}</span>
        </div>
        <div class="info-row">
          <span class="label">Appointment #:</span>
          <span class="value">{{appointment_number}}</span>
        </div>
        <div class="info-row">
          <span class="label">Room:</span>
          <span class="value">{{room_number}}</span>
        </div>
        <div class="info-row">
          <span class="label">Purpose:</span>
          <span class="value">{{reason}}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important Reminders:</strong>
        <ul>
          <li>Please arrive 15 minutes before your scheduled time</li>
          <li>Bring your ID card and insurance information</li>
          <li>If you need to reschedule, please call us at least 24 hours in advance</li>
          <li>Wear a face mask and maintain social distancing</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>If you have any questions, please contact our reception at:</p>
        <p><strong>📞 Phone:</strong> +84-123-456-789 | <strong>✉️ Email:</strong> contact@hospital.com</p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          This is an automated message from Hospital Management System. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', 'appointment_number', 'room_number', 'reason']
  },
  
  // Prescription Ready Email Template
  {
    template_name: 'prescription_ready',
    template_type: 'email' as const,
    subject: 'Prescription Ready for Pickup - {{prescription_number}}',
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription Ready</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
    .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .prescription-info { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { font-weight: bold; color: #0c5460; }
    .value { color: #333; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .pickup-info { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; color: #856404; }
    .success-badge { background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💊 Prescription Ready</h1>
      <p>Your medication is ready for pickup</p>
    </div>
    
    <div class="content">
      <div class="success-badge">✅ READY FOR PICKUP</div>
      
      <p>Dear <strong>{{patient_name}}</strong>,</p>
      
      <p>Good news! Your prescription is now ready for pickup at our hospital pharmacy.</p>
      
      <div class="prescription-info">
        <h3 style="margin-top: 0; color: #0c5460;">📋 Prescription Details</h3>
        <div class="info-row">
          <span class="label">Prescription #:</span>
          <span class="value"><strong>{{prescription_number}}</strong></span>
        </div>
        <div class="info-row">
          <span class="label">Patient:</span>
          <span class="value">{{patient_name}}</span>
        </div>
        <div class="info-row">
          <span class="label">Prescribing Doctor:</span>
          <span class="value">{{doctor_name}}</span>
        </div>
        <div class="info-row">
          <span class="label">Issue Date:</span>
          <span class="value">{{issued_date}}</span>
        </div>
        <div class="info-row">
          <span class="label">Total Cost:</span>
          <span class="value"><strong>{{total_cost}} VND</strong></span>
        </div>
      </div>
      
      <div class="pickup-info">
        <h4 style="margin-top: 0;">🏪 Pharmacy Pickup Information:</h4>
        <ul>
          <li><strong>Location:</strong> Hospital Main Pharmacy, Ground Floor</li>
          <li><strong>Hours:</strong> Monday - Sunday, 7:00 AM - 8:00 PM</li>
          <li><strong>Required Documents:</strong> ID card and prescription number</li>
          <li><strong>Payment:</strong> Cash or insurance card accepted</li>
          <li><strong>Pickup Deadline:</strong> Please collect within 30 days</li>
        </ul>
      </div>
      
      <div style="background: #e8f4fd; border: 1px solid #b8daff; border-radius: 6px; padding: 15px; margin: 15px 0; color: #004085;">
        <strong>💡 Important Notes:</strong>
        <ul>
          <li>Please bring your ID and show this email or prescription number</li>
          <li>If someone else is picking up for you, they need your written authorization</li>
          <li>For questions about your medication, ask our pharmacist</li>
          <li>Store medications as directed on the label</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>For pickup assistance or questions, contact our pharmacy at:</p>
        <p><strong>📞 Phone:</strong> +84-123-456-789 (ext. 2) | <strong>✉️ Email:</strong> pharmacy@hospital.com</p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          This is an automated message from Hospital Management System. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: ['patient_name', 'doctor_name', 'prescription_number', 'issued_date', 'total_cost']
  },
  
  // Appointment Reminder SMS Template (for future use)
  {
    template_name: 'appointment_reminder',
    template_type: 'sms' as const,
    subject: 'Appointment Reminder',
    body: `Appointment Reminder: {{patient_name}}, you have an appointment on {{appointment_date}} at {{appointment_time}} with {{doctor_name}}. Room: {{room_number}}. Please arrive 15 minutes early. Contact: +84-123-456-789`,
    variables: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', 'room_number']
  },
  
  // Prescription Ready SMS Template (for future use)
  {
    template_name: 'prescription_ready',
    template_type: 'sms' as const,
    subject: 'Prescription Ready',
    body: `{{patient_name}}, your prescription {{prescription_number}} is ready for pickup at Hospital Pharmacy. Cost: {{total_cost}} VND. Hours: 7AM-8PM daily. Bring ID. Valid for 30 days.`,
    variables: ['patient_name', 'prescription_number', 'total_cost']
  }
];

async function seedTemplates() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://notification_user:notification_password_123@127.0.0.1:27017/notification_service_db?authSource=admin';
    await mongoose.connect(mongoUrl);
    logger.info('Connected to MongoDB for template seeding');

    // Seed each template
    for (const templateData of templates) {
      try {
        const existingTemplate = await templateService.getTemplate(
          templateData.template_name, 
          templateData.template_type
        );
        
        if (existingTemplate) {
          // Update existing template
          await templateService.updateTemplate(
            templateData.template_name,
            templateData.template_type,
            {
              subject: templateData.subject,
              body: templateData.body,
              variables: templateData.variables,
              is_active: true
            }
          );
          logger.info(`Updated template: ${templateData.template_name} (${templateData.template_type})`);
        } else {
          // Create new template
          await templateService.createTemplate(templateData);
          logger.info(`Created template: ${templateData.template_name} (${templateData.template_type})`);
        }
      } catch (error) {
        logger.error(`Error processing template ${templateData.template_name}:`, error);
      }
    }

    logger.info('Template seeding completed successfully');
  } catch (error) {
    logger.error('Error during template seeding:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('✅ Template seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Template seeding failed:', error);
      process.exit(1);
    });
}

export { seedTemplates };
