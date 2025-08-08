import { Twilio } from 'twilio';
import { logger } from '@hospital/shared';

export class SMSService {
  private client: Twilio | null = null;
  private isConfigured: boolean = false;
  private phoneNumber!: string;

  constructor() {
    this.setupTwilio();
  }

  private setupTwilio(): void {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

      if (!accountSid || !authToken || !this.phoneNumber) {
        logger.warn('Twilio credentials not configured, SMS service disabled');
        return;
      }

      this.client = new Twilio(accountSid, authToken);
      this.isConfigured = true;

      logger.info('SMS service configured successfully', {
        phoneNumber: this.phoneNumber
      });
    } catch (error) {
      logger.error('Failed to configure SMS service:', error);
      this.isConfigured = false;
    }
  }

  public async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      logger.warn('SMS service not configured, skipping SMS send');
      return false;
    }

    try {
      // Format phone number for Vietnam (+84)
      const formattedPhone = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedPhone
      });

      logger.info('SMS sent successfully', {
        to: formattedPhone,
        messageSid: result.sid,
        status: result.status
      });

      return true;
    } catch (error) {
      logger.error('Failed to send SMS:', error, {
        to: to,
        message: message.substring(0, 50) + '...'
      });
      return false;
    }
  }

  public async sendAppointmentReminder(
    phone: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentTime: string
  ): Promise<boolean> {
    const message = `
Xin chào ${patientName},

Nhắc nhở lịch khám:
- Bác sĩ: ${doctorName}
- Ngày: ${appointmentDate.toLocaleDateString('vi-VN')}
- Giờ: ${appointmentTime}

Vui lòng có mặt trước 15 phút.
Liên hệ: (028) 1234 5678

Bệnh viện ABC
    `.trim();

    return this.sendSMS(phone, message);
  }

  public async sendPrescriptionReady(
    phone: string,
    patientName: string,
    prescriptionNumber: string
  ): Promise<boolean> {
    const message = `
Xin chào ${patientName},

Đơn thuốc ${prescriptionNumber} đã sẵn sàng.

Giờ lấy thuốc:
T2-T6: 7:00-17:00
T7-CN: 8:00-12:00

Mang theo CMND và đơn thuốc.

Bệnh viện ABC
    `.trim();

    return this.sendSMS(phone, message);
  }

  public async sendAppointmentCancellation(
    phone: string,
    patientName: string,
    appointmentNumber: string,
    reason?: string
  ): Promise<boolean> {
    const message = `
Xin chào ${patientName},

Lịch khám ${appointmentNumber} đã bị hủy.
${reason ? `Lý do: ${reason}` : ''}

Vui lòng liên hệ để đặt lịch mới:
(028) 1234 5678

Bệnh viện ABC
    `.trim();

    return this.sendSMS(phone, message);
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Vietnamese phone numbers
    if (cleaned.startsWith('0')) {
      // Convert 0xxx to +84xxx
      cleaned = '+84' + cleaned.substring(1);
    } else if (cleaned.startsWith('84')) {
      // Add + if missing
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      // Assume it's a Vietnamese number without country code
      cleaned = '+84' + cleaned;
    }

    return cleaned;
  }

  public async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      return false;
    }

    try {
      // Try to fetch account info to verify connection
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      if (accountSid) {
        await this.client.api.accounts(accountSid).fetch();
      }
      logger.info('SMS service connection verified');
      return true;
    } catch (error) {
      logger.error('SMS service connection verification failed:', error);
      return false;
    }
  }
}
