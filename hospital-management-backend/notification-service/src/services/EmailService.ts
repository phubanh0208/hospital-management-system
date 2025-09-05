import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '@hospital/shared';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  private transporter!: Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter(): void {
    try {
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };

      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        logger.warn('Email credentials not configured, email service disabled');
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;

      logger.info('Email service configured successfully', {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure
      });
    } catch (error) {
      logger.error('Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

    public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const decryptedEmail = options.to;
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Hospital Management <noreply@hospital.com>',
        to: decryptedEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: decryptedEmail,
        subject: options.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error, {
        to: options.to, // Log original encrypted email on error
        subject: options.subject,
      });
      return false;
    }
  }

  public async sendAppointmentReminder(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentTime: string
  ): Promise<boolean> {
    const subject = '🏥 Nhắc nhở lịch khám - Hospital Management';
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nhắc nhở lịch khám</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; position: relative;">
            <div style="background: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
              <span style="font-size: 40px;">🏥</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Nhắc nhở lịch khám</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Sức khỏe của bạn là ưu tiên hàng đầu</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Xin chào ${patientName}! 👋</h2>
              <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.6;">Đây là thông báo nhắc nhở về lịch khám sắp tới của bạn.</p>
            </div>

            <!-- Appointment Card -->
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 15px; padding: 30px; margin: 30px 0; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
              <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>

              <h3 style="color: white; margin: 0 0 20px; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📅</span> Thông tin lịch khám
              </h3>

              <div style="background: rgba(255,255,255,0.2); border-radius: 10px; padding: 20px; backdrop-filter: blur(10px);">
                ${doctorName && doctorName !== 'Unknown Doctor' && doctorName !== 'Bác sĩ chưa xác định' ? `
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">👨‍⚕️</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Bác sĩ</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${doctorName}</p>
                  </div>
                </div>
                ` : ''}

                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">📆</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Ngày khám</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${appointmentDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                <div style="display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 15px;">⏰</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Giờ khám</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${appointmentTime}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Important Notes -->
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 15px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin: 0 0 15px; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">💡</span> Lưu ý quan trọng
              </h3>
              <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Vui lòng có mặt tại bệnh viện trước 15 phút so với giờ hẹn</li>
                <li>Mang theo giấy tờ tùy thân và thẻ bảo hiểm y tế</li>
                <li>Nếu có thay đổi, vui lòng liên hệ với chúng tôi sớm nhất có thể</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                Xem chi tiết lịch khám
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
            <div style="margin-bottom: 20px;">
              <h4 style="color: #333; margin: 0 0 10px; font-size: 18px; font-weight: 600;">Bệnh viện ABC</h4>
              <p style="color: #666; margin: 0; font-size: 14px;">Đối tác chăm sóc sức khỏe đáng tin cậy</p>
            </div>

            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📞</span>
                <p style="color: #666; margin: 0; font-size: 14px;">(028) 1234 5678</p>
              </div>
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📧</span>
                <p style="color: #666; margin: 0; font-size: 14px;">info@hospital.com</p>
              </div>
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">🌐</span>
                <p style="color: #666; margin: 0; font-size: 14px;">www.hospital.com</p>
              </div>
            </div>

            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 Hospital Management System. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  public async sendPrescriptionReady(
    email: string,
    patientName: string,
    prescriptionNumber: string
  ): Promise<boolean> {
    const subject = '💊 Đơn thuốc đã sẵn sàng - Hospital Management';
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đơn thuốc đã sẵn sàng</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px 30px; text-align: center; position: relative;">
            <div style="background: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
              <span style="font-size: 40px;">💊</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Đơn thuốc đã sẵn sàng!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Thuốc của bạn đã được chuẩn bị xong</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Tin tuyệt vời, ${patientName}! 🎉</h2>
              <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.6;">Đơn thuốc của bạn đã được chuẩn bị xong và sẵn sàng để lấy.</p>
            </div>

            <!-- Prescription Card -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; margin: 30px 0; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
              <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>

              <h3 style="color: white; margin: 0 0 20px; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📋</span> Thông tin đơn thuốc
              </h3>

              <div style="background: rgba(255,255,255,0.2); border-radius: 10px; padding: 20px; backdrop-filter: blur(10px);">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">🏷️</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Mã đơn thuốc</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${prescriptionNumber}</p>
                  </div>
                </div>

                <div style="display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 15px;">✅</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Trạng thái</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">Sẵn sàng lấy thuốc</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- What to Bring -->
            <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 15px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin: 0 0 15px; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">🎒</span> Vui lòng mang theo
              </h3>
              <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Giấy tờ tùy thân có ảnh</li>
                <li>Đơn thuốc gốc (nếu có)</li>
                <li>Thẻ bảo hiểm y tế (nếu có)</li>
                <li>Phương thức thanh toán cho các khoản đồng chi trả</li>
              </ul>
            </div>

            <!-- Pharmacy Hours -->
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 15px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin: 0 0 15px; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">🕒</span> Giờ làm việc của nhà thuốc
              </h3>
              <div style="color: #555; line-height: 1.8;">
                <p style="margin: 0 0 5px;"><strong>Thứ 2 - Thứ 6:</strong> 7:00 - 17:00</p>
                <p style="margin: 0;"><strong>Thứ 7 - Chủ nhật:</strong> 8:00 - 12:00</p>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 20px rgba(17, 153, 142, 0.3); transition: all 0.3s ease;">
                Xem đường đi đến nhà thuốc
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
            <div style="margin-bottom: 20px;">
              <h4 style="color: #333; margin: 0 0 10px; font-size: 18px; font-weight: 600;">Nhà thuốc Bệnh viện ABC</h4>
              <p style="color: #666; margin: 0; font-size: 14px;">Sức khỏe của bạn, cam kết của chúng tôi</p>
            </div>

            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📞</span>
                <p style="color: #666; margin: 0; font-size: 14px;">(028) 1234 5678</p>
              </div>
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📧</span>
                <p style="color: #666; margin: 0; font-size: 14px;">pharmacy@hospital.com</p>
              </div>
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📍</span>
                <p style="color: #666; margin: 0; font-size: 14px;">Tầng trệt, Tòa nhà chính</p>
              </div>
            </div>

            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 Hospital Management System. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  public async sendAppointmentConfirmation(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentTime: string,
    appointmentNumber: string,
    roomNumber?: string,
    reason?: string
  ): Promise<boolean> {
    const subject = '✅ Xác nhận lịch hẹn - Hospital Management';
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận lịch hẹn</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center; position: relative;">
            <div style="background: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
              <span style="font-size: 40px;">✅</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Xác nhận lịch hẹn</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Lịch hẹn của bạn đã được xác nhận thành công</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Xin chào ${patientName}! 🎉</h2>
              <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.6;">Lịch hẹn khám bệnh của bạn đã được xác nhận thành công. Dưới đây là thông tin chi tiết.</p>
            </div>

            <!-- Appointment Confirmation Card -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; margin: 30px 0; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
              <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>

              <h3 style="color: white; margin: 0 0 20px; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📋</span> Thông tin lịch hẹn
              </h3>

              <div style="background: rgba(255,255,255,0.2); border-radius: 10px; padding: 20px; backdrop-filter: blur(10px);">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">🏷️</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Mã lịch hẹn</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${appointmentNumber}</p>
                  </div>
                </div>

                ${doctorName && doctorName !== 'Unknown Doctor' && doctorName !== 'Bác sĩ chưa xác định' ? `
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">👨‍⚕️</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Bác sĩ</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${doctorName}</p>
                  </div>
                </div>
                ` : ''}

                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">📆</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Ngày khám</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${appointmentDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">⏰</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Giờ khám</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${appointmentTime}</p>
                  </div>
                </div>

                ${roomNumber ? `
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 20px; margin-right: 15px;">🏠</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Phòng khám</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${roomNumber}</p>
                  </div>
                </div>
                ` : ''}

                ${reason ? `
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 15px;">📝</span>
                  <div>
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Lý do khám</p>
                    <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${reason}</p>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Important Notes -->
            <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 15px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin: 0 0 15px; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📌</span> Lưu ý quan trọng
              </h3>
              <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Vui lòng có mặt tại bệnh viện trước 15 phút so với giờ hẹn</li>
                <li>Mang theo giấy tờ tùy thân, thẻ bảo hiểm y tế và các xét nghiệm liên quan</li>
                <li>Nếu cần thay đổi lịch hẹn, vui lòng liên hệ trước ít nhất 24 giờ</li>
                <li>Trong trường hợp khẩn cấp, vui lòng gọi hotline: (028) 1234 5678</li>
              </ul>
            </div>

            <!-- Status Badge -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 12px 25px; border-radius: 25px; font-weight: 600; font-size: 16px;">
                <span style="margin-right: 8px;">✅</span> Đã xác nhận
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
            <div style="margin-bottom: 20px;">
              <h4 style="color: #333; margin: 0 0 10px; font-size: 18px; font-weight: 600;">Bệnh viện ABC</h4>
              <p style="color: #666; margin: 0; font-size: 14px;">Chăm sóc sức khỏe toàn diện, tận tâm phục vụ</p>
            </div>

            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📞</span>
                <p style="color: #666; margin: 0; font-size: 14px;">(028) 1234 5678</p>
              </div>
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">📧</span>
                <p style="color: #666; margin: 0; font-size: 14px;">info@hospital.com</p>
              </div>
              <div style="text-align: center;">
                <span style="font-size: 20px; display: block; margin-bottom: 5px;">🌐</span>
                <p style="color: #666; margin: 0; font-size: 14px;">www.hospital.com</p>
              </div>
            </div>

            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 Hospital Management System. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  public async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed:', error);
      return false;
    }
  }
}
