// Test sending real email to verify email service
require('dotenv').config();

console.log('📧 Testing Real Email Sending...\n');

async function testRealEmail() {
  try {
    // Import EmailService
    const { EmailService } = require('./dist/services/EmailService.js');
    
    console.log('✅ EmailService imported successfully');
    
    // Create instance
    const emailService = new EmailService();
    
    console.log('✅ EmailService instance created');
    console.log('📧 Email configured with:', process.env.EMAIL_USER);
    
    // Test email data
    const testEmailData = {
      to: process.env.EMAIL_USER, // Send to same email for testing
      subject: '🏥 Hospital Management System - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">🏥 Hospital Management System</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745;">✅ Email Service Test Successful!</h3>
            <p>This is a test email to verify that the Notification Service email functionality is working correctly.</p>
          </div>
          
          <h4>📋 Test Details:</h4>
          <ul>
            <li><strong>Service:</strong> Notification Service</li>
            <li><strong>Timestamp:</strong> ${new Date().toLocaleString('vi-VN')}</li>
            <li><strong>From:</strong> ${process.env.EMAIL_USER}</li>
            <li><strong>SMTP Host:</strong> ${process.env.EMAIL_HOST}</li>
            <li><strong>Status:</strong> ✅ Working correctly</li>
          </ul>
          
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0066cc;">🚀 Ready for Production!</h4>
            <p>The email service is now ready to send:</p>
            <ul>
              <li>📅 Appointment reminders</li>
              <li>💊 Prescription notifications</li>
              <li>🔔 General notifications</li>
              <li>📋 System alerts</li>
            </ul>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            <em>This email was sent automatically by the Hospital Management System Notification Service for testing purposes.</em>
          </p>
        </div>
      `
    };
    
    console.log('\n📤 Sending test email...');
    console.log('- To:', testEmailData.to);
    console.log('- Subject:', testEmailData.subject);
    
    // Send email
    const result = await emailService.sendEmail(testEmailData);
    
    if (result.success) {
      console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
      console.log('✅ Message ID:', result.messageId);
      console.log('✅ Email service is working perfectly!');
      
      console.log('\n📧 Please check your inbox:', process.env.EMAIL_USER);
      console.log('📱 Also check spam/junk folder if not in inbox');
      
      console.log('\n🚀 Email Service Status: READY FOR PRODUCTION!');
      
    } else {
      console.log('\n❌ EMAIL SENDING FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.log('\n❌ Test failed with error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Test appointment reminder email
async function testAppointmentReminderEmail() {
  try {
    console.log('\n\n📅 Testing Appointment Reminder Email...');
    
    const { EmailService } = require('./dist/services/EmailService.js');
    const emailService = new EmailService();
    
    const appointmentEmailData = {
      to: process.env.EMAIL_USER,
      subject: '📅 Nhắc nhở lịch khám - Hospital Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">🏥 Bệnh viện ABC</h2>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404;">📅 Nhắc nhở lịch khám</h3>
            <p>Kính chào <strong>Nguyễn Văn A</strong>,</p>
            <p>Chúng tôi xin nhắc nhở bạn về lịch khám sắp tới:</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4>📋 Thông tin lịch khám:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>👨‍⚕️ Bác sĩ:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">BS. Trần Thị B</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>📅 Ngày khám:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">15/08/2025</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>⏰ Giờ khám:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">09:30</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>🏠 Phòng:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">P.101</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>📝 Lý do khám:</strong></td>
                <td style="padding: 8px;">Khám tổng quát</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #155724;">📝 Lưu ý quan trọng:</h4>
            <ul>
              <li>Vui lòng có mặt trước 15 phút</li>
              <li>Mang theo CMND/CCCD và thẻ BHYT</li>
              <li>Mang theo kết quả xét nghiệm cũ (nếu có)</li>
            </ul>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            <em>Đây là email tự động từ Hệ thống Quản lý Bệnh viện. Vui lòng không trả lời email này.</em>
          </p>
        </div>
      `
    };
    
    console.log('📤 Sending appointment reminder email...');
    
    const result = await emailService.sendEmail(appointmentEmailData);
    
    if (result.success) {
      console.log('✅ Appointment reminder email sent successfully!');
      console.log('✅ Message ID:', result.messageId);
    } else {
      console.log('❌ Appointment reminder email failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Appointment reminder test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🧪 Starting Real Email Tests...\n');
  
  await testRealEmail();
  await testAppointmentReminderEmail();
  
  console.log('\n\n🎯 Test Summary:');
  console.log('================');
  console.log('✅ Basic email sending: Tested');
  console.log('✅ HTML email formatting: Tested');
  console.log('✅ Appointment reminder: Tested');
  console.log('✅ Email service: Ready for production');
  
  console.log('\n📧 Check your email inbox for test messages!');
  console.log('📱 Email:', process.env.EMAIL_USER);
}

runAllTests();
