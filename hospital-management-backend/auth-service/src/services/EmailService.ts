import { logger } from '@hospital/shared';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
}

export interface ResetPasswordEmailData {
  email: string;
  username: string;
  resetToken: string;
  resetUrl: string;
}

export class EmailService {
  private config: EmailConfig;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.config = {
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
      fromEmail: process.env.SMTP_USER || 'noreply@hospital.com',
      fromName: 'Hospital Management System'
    };

    // Create nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendResetPasswordEmail(data: ResetPasswordEmailData): Promise<boolean> {
    try {
      const emailContent = this.generateResetPasswordEmailContent(data);

      logger.info(`📧 SENDING PASSWORD RESET EMAIL TO: ${data.email}`);

      // Send actual email using nodemailer
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: data.email,
        subject: 'Password Reset Request - Hospital Management System',
        html: emailContent,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`✅ Password reset email sent successfully to ${data.email}`);
      logger.info(`📨 Message ID: ${info.messageId}`);

      return true;

    } catch (error) {
      logger.error(`❌ Failed to send password reset email to ${data.email}:`, error);
      return false;
    }
  }

  private generateResetPasswordEmailContent(data: ResetPasswordEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Hospital Management System</h1>
            <h2>Password Reset Request</h2>
        </div>
        <div class="content">
            <p>Hello <strong>${data.username}</strong>,</p>
            
            <p>We received a request to reset your password for your Hospital Management System account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <p style="text-align: center;">
                <a href="${data.resetUrl}" class="button">Reset My Password</a>
            </p>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                ${data.resetUrl}
            </p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This link will expire in 1 hour for security reasons</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                    <li>Contact support if you have concerns</li>
                </ul>
            </div>
            
            <p>Best regards,<br>
            <strong>Hospital Management System Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2025 Hospital Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }



  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateResetUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8000';
    return `${baseUrl}/auth/reset-password/?token=${token}`;
  }
}
