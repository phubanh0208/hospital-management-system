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
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Hospital Management <noreply@hospital.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error, {
        to: options.to,
        subject: options.subject
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
    const subject = 'Nhắc nhở lịch khám - Hospital Management';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Nhắc nhở lịch khám</h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        <p>Đây là thông báo nhắc nhở về lịch khám của bạn:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Thông tin lịch khám</h3>
          <p><strong>Bác sĩ:</strong> ${doctorName}</p>
          <p><strong>Ngày khám:</strong> ${appointmentDate.toLocaleDateString('vi-VN')}</p>
          <p><strong>Giờ khám:</strong> ${appointmentTime}</p>
        </div>
        
        <p>Vui lòng có mặt tại bệnh viện trước 15 phút so với giờ hẹn.</p>
        <p>Nếu có thay đổi, vui lòng liên hệ với chúng tôi sớm nhất có thể.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 14px;">
          Trân trọng,<br>
          Bệnh viện ABC<br>
          Điện thoại: (028) 1234 5678<br>
          Email: info@hospital.com
        </p>
      </div>
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
    const subject = 'Đơn thuốc đã sẵn sàng - Hospital Management';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Đơn thuốc đã sẵn sàng</h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        <p>Đơn thuốc của bạn đã được chuẩn bị xong và sẵn sàng để lấy.</p>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">Thông tin đơn thuốc</h3>
          <p><strong>Mã đơn thuốc:</strong> ${prescriptionNumber}</p>
          <p><strong>Trạng thái:</strong> Sẵn sàng lấy thuốc</p>
        </div>
        
        <p>Vui lòng mang theo:</p>
        <ul>
          <li>Giấy tờ tùy thân</li>
          <li>Đơn thuốc gốc (nếu có)</li>
          <li>Thẻ bảo hiểm y tế (nếu có)</li>
        </ul>
        
        <p><strong>Giờ làm việc của nhà thuốc:</strong></p>
        <p>Thứ 2 - Thứ 6: 7:00 - 17:00<br>
        Thứ 7 - Chủ nhật: 8:00 - 12:00</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 14px;">
          Trân trọng,<br>
          Nhà thuốc Bệnh viện ABC<br>
          Điện thoại: (028) 1234 5678<br>
          Email: pharmacy@hospital.com
        </p>
      </div>
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
