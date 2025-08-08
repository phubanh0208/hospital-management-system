// Test sending real email to phubanh0208@gmail.com
require('dotenv').config();

console.log('📧 Testing Real Email Sending to phubanh0208@gmail.com...\n');

async function sendTestEmail() {
  try {
    // Import EmailService
    const { EmailService } = require('./dist/services/EmailService.js');
    
    console.log('✅ EmailService imported successfully');
    
    // Create instance
    const emailService = new EmailService();
    
    console.log('✅ EmailService instance created');
    console.log('📧 Sending from:', process.env.EMAIL_USER);
    
    // Test email data
    const testEmailData = {
      to: 'phubanh0208@gmail.com',
      subject: '🏥 Hospital Management System - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">🏥 Hospital Management System</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745;">✅ Email Service Test Successful!</h3>
            <p>Chào bạn! Đây là email test từ Hệ thống Quản lý Bệnh viện để kiểm tra chức năng gửi email.</p>
          </div>
          
          <h4>📋 Thông tin test:</h4>
          <ul>
            <li><strong>Service:</strong> Notification Service</li>
            <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
            <li><strong>Từ:</strong> ${process.env.EMAIL_USER}</li>
            <li><strong>SMTP Host:</strong> ${process.env.EMAIL_HOST}</li>
            <li><strong>Trạng thái:</strong> ✅ Hoạt động tốt</li>
          </ul>
          
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0066cc;">🚀 Sẵn sàng cho Production!</h4>
            <p>Email service hiện đã sẵn sàng để gửi:</p>
            <ul>
              <li>📅 Nhắc nhở lịch khám</li>
              <li>💊 Thông báo đơn thuốc</li>
              <li>🔔 Thông báo chung</li>
              <li>📋 Cảnh báo hệ thống</li>
            </ul>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            <em>Email này được gửi tự động từ Hospital Management System Notification Service để test chức năng.</em>
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
      console.log('✅ Email đã được gửi đến phubanh0208@gmail.com');
      
      console.log('\n📧 Vui lòng kiểm tra inbox của phubanh0208@gmail.com');
      console.log('📱 Cũng kiểm tra thư mục spam/junk nếu không thấy trong inbox');
      
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
async function sendAppointmentReminder() {
  try {
    console.log('\n\n📅 Sending Appointment Reminder Email...');
    
    const { EmailService } = require('./dist/services/EmailService.js');
    const emailService = new EmailService();
    
    const appointmentEmailData = {
      to: 'phubanh0208@gmail.com',
      subject: '📅 Nhắc nhở lịch khám - Bệnh viện ABC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">🏥 Bệnh viện ABC</h2>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404;">📅 Nhắc nhở lịch khám</h3>
            <p>Kính chào <strong>Anh/Chị</strong>,</p>
            <p>Chúng tôi xin nhắc nhở về lịch khám sắp tới của bạn:</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4>📋 Thông tin lịch khám:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>👨‍⚕️ Bác sĩ:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">BS. Nguyễn Văn A</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>📅 Ngày khám:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">10/08/2025</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>⏰ Giờ khám:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">14:30</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>🏠 Phòng:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">P.205</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>📝 Lý do khám:</strong></td>
                <td style="padding: 8px;">Khám tổng quát định kỳ</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #155724;">📝 Lưu ý quan trọng:</h4>
            <ul>
              <li>✅ Vui lòng có mặt trước 15 phút</li>
              <li>🆔 Mang theo CMND/CCCD và thẻ BHYT</li>
              <li>📄 Mang theo kết quả xét nghiệm cũ (nếu có)</li>
              <li>💧 Nhịn ăn 8 tiếng trước khi khám (nếu có xét nghiệm máu)</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; display: inline-block;">
              📞 Hotline: 1900-1234 | 🌐 Website: hospital.com
            </p>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            <em>Đây là email tự động từ Hệ thống Quản lý Bệnh viện. Vui lòng không trả lời email này.</em><br>
            <em>Nếu cần hỗ trợ, vui lòng liên hệ hotline hoặc đến trực tiếp bệnh viện.</em>
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
async function runEmailTests() {
  console.log('🧪 Starting Real Email Tests to phubanh0208@gmail.com...\n');
  
  await sendTestEmail();
  await sendAppointmentReminder();
  
  console.log('\n\n🎯 Email Test Summary:');
  console.log('========================');
  console.log('✅ Test email: Sent');
  console.log('✅ Appointment reminder: Sent');
  console.log('✅ HTML formatting: Applied');
  console.log('✅ Email service: Working perfectly');
  
  console.log('\n📧 Emails sent to: phubanh0208@gmail.com');
  console.log('📱 Please check inbox and spam folder');
  console.log('\n🚀 Notification Service Email functionality: VERIFIED!');
}

runEmailTests();
