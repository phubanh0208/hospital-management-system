import { 
  User, 
  UserRole,
  JWTPayload,
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateRefreshToken,
  verifyToken,
  getPool,
  executeQuery,
  logger,
  getEnvVar,
  encryptEmail,
  decryptEmail,
  encryptPhone,
  decryptPhone
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './EmailService';
import { EventService } from './EventService';
import * as crypto from 'crypto';

export interface LoginResult {
  success: boolean;
  message?: string;
  data?: {
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterResult {
  success: boolean;
  message?: string;
  data?: {
    user: Omit<User, 'password'>;
  };
}

export class AuthService {
  private pool = getPool('auth');
  private jwtSecret = getEnvVar('JWT_SECRET');
  private jwtRefreshSecret = getEnvVar('JWT_REFRESH_SECRET');
  private emailService = new EmailService();

  private mapRoleToDbEnum(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'admin',
      'doctor': 'doctor',
      'nurse': 'nurse',
      'patient': 'patient',
      'receptionist': 'staff',
      'pharmacist': 'staff',
      'staff': 'staff'
    };
    return roleMap[role] || 'staff';
  }

  private validatePassword(password: string): string[] {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return errors;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Find user by username ONLY with profile
      const users = await executeQuery(
        this.pool,
        `SELECT u.*, p.first_name, p.last_name, p.phone 
         FROM users u 
         LEFT JOIN user_profiles p ON u.id = p.user_id 
         WHERE u.username = $1 AND u.is_active = true`,
        [username]
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Generate tokens with decrypted email
      const tokenPayload: JWTPayload = {
        userId: user.id,
        username: user.username,
        email: user.email ? decryptEmail(user.email) : '',
        role: user.role
      };

      const accessToken = generateToken(tokenPayload, this.jwtSecret, '15m');
      const refreshToken = generateRefreshToken(user.id, this.jwtRefreshSecret);

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken);

      // Update last login
      await executeQuery(
        this.pool,
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      const userProfile = {
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone ? decryptPhone(user.phone) : ''
      };

      const userWithoutPassword: any = {
        id: user.id,
        username: user.username,
        email: user.email ? decryptEmail(user.email) : '',
        role: user.role,
        profile: userProfile,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      logger.error('Login service error:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  async register(userData: any): Promise<RegisterResult> {
    try {
      // Check if user already exists
      const existingUsers = await executeQuery(
        this.pool,
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUsers.length > 0) {
        return {
          success: false,
          message: 'User with this email or username already exists'
        };
      }

      // Hash password and encrypt email
      const passwordHash = await hashPassword(userData.password);
      const encryptedEmail = encryptEmail(userData.email);
      const userId = uuidv4();

      // Map role to database enum values
      const dbRole = this.mapRoleToDbEnum(userData.role || 'staff');

      // Insert user
      const insertQuery = `
        INSERT INTO users (
          id, username, email, password_hash, role, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, username, email, role, is_active, created_at, updated_at
      `;

      const newUsers = await executeQuery(this.pool, insertQuery, [
        userId,
        userData.username,
        encryptedEmail,
        passwordHash,
        dbRole,
        true
      ]);

      const newUser = newUsers[0];

      // Insert profile if provided
      if (userData.profile) {
        const profileQuery = `
          INSERT INTO user_profiles (
            user_id, first_name, last_name, phone, date_of_birth, address, avatar_url, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `;

        const encryptedPhone = userData.profile.phone ? encryptPhone(userData.profile.phone) : null;

        await executeQuery(this.pool, profileQuery, [
          userId,
          userData.profile.firstName || null,
          userData.profile.lastName || null,
          encryptedPhone,
          userData.profile.dateOfBirth || null,
          userData.profile.address || null,
          userData.profile.avatarUrl || null
        ]);
      }

      return {
        success: true,
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: decryptEmail(newUser.email),
            role: newUser.role,
            profile: userData.profile || {},
            isActive: newUser.is_active,
            createdAt: newUser.created_at,
            updatedAt: newUser.updated_at
          }
        }
      };
    } catch (error) {
      logger.error('Registration service error:', error);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      // Verify refresh token
      const payload = verifyToken(refreshToken, this.jwtRefreshSecret);
      if (!payload || !payload.userId) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Check if refresh token exists in database
      const tokenRows = await executeQuery(
        this.pool,
        'SELECT user_id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()',
        [refreshToken]
      );

      if (tokenRows.length === 0) {
        return {
          success: false,
          message: 'Refresh token not found or expired'
        };
      }

      // Get user with profile
      const users = await executeQuery(
        this.pool,
        `SELECT u.*, p.first_name, p.last_name, p.phone 
         FROM users u 
         LEFT JOIN user_profiles p ON u.id = p.user_id 
         WHERE u.id = $1 AND u.is_active = true`,
        [payload.userId]
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = users[0];

      // Generate new tokens with decrypted email
      const tokenPayload: JWTPayload = {
        userId: user.id,
        username: user.username,
        email: user.email ? decryptEmail(user.email) : '',
        role: user.role
      };

      const accessToken = generateToken(tokenPayload, this.jwtSecret, '15m');
      const newRefreshToken = generateRefreshToken(user.id, this.jwtRefreshSecret);

      // Replace old refresh token with new one
      await this.replaceRefreshToken(refreshToken, newRefreshToken, user.id);

      const userProfile = {
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone ? decryptPhone(user.phone) : ''
      };

      const userWithoutPassword: any = {
        id: user.id,
        username: user.username,
        email: user.email ? decryptEmail(user.email) : '',
        role: user.role,
        profile: userProfile,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      logger.error('Token refresh service error:', error);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        await executeQuery(
          this.pool,
          'DELETE FROM user_sessions WHERE token_hash = $1',
          [refreshToken]
        );
      } else {
        // Remove all refresh tokens for user
        await executeQuery(
          this.pool,
          'DELETE FROM user_sessions WHERE user_id = $1',
          [userId]
        );
      }
    } catch (error) {
      logger.error('Logout service error:', error);
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Get user
      const users = await executeQuery(
        this.pool,
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, users[0].password_hash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await executeQuery(
        this.pool,
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Invalidate all refresh tokens for security
      await executeQuery(
        this.pool,
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      return {
        success: true
      };
    } catch (error) {
      logger.error('Change password service error:', error);
      return {
        success: false,
        message: 'Password change failed'
      };
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      logger.info(`🔍 Forgot password request for email: ${email}`);

      // Encrypt email to match database storage
      const encryptedEmail = encryptEmail(email);
      logger.info(`🔐 Encrypted email: ${encryptedEmail.substring(0, 20)}...`);
      logger.info(`🔐 Full encrypted email: ${encryptedEmail}`);

      // Debug: Check all users and decrypt emails to find match
      const allUsers = await executeQuery(
        this.pool,
        'SELECT id, username, email FROM users WHERE is_active = true',
        []
      );
      logger.info(`🔍 Total active users in database: ${allUsers.length}`);

      // Try to find user by decrypting all emails (fallback method)
      let foundUser = null;
      for (const user of allUsers) {
        try {
          const decryptedEmail = decryptEmail(user.email);
          logger.info(`🔍 Checking user ${user.username}: ${decryptedEmail}`);
          if (decryptedEmail.toLowerCase() === email.toLowerCase()) {
            foundUser = user;
            logger.info(`✅ Found matching user: ${user.username}`);
            break;
          }
        } catch (error) {
          logger.error(`❌ Failed to decrypt email for user ${user.username}:`, error);
        }
      }

      // Check if user exists using encrypted email (primary method)
      const users = await executeQuery(
        this.pool,
        'SELECT id, username FROM users WHERE email = $1 AND is_active = true',
        [encryptedEmail]
      );

      logger.info(`🔍 Found ${users.length} users with encrypted email`);

      // Use fallback result if primary method failed
      if (users.length === 0 && foundUser) {
        logger.info(`🔄 Using fallback decryption method result`);
        users.push({ id: foundUser.id, username: foundUser.username });
      }

      if (users.length === 0) {
        logger.info(`❌ No user found with email: ${email}`);
        // Don't reveal if email doesn't exist (security best practice)
        return { success: true };
      }

      const userId = users[0].id;
      const username = users[0].username;

      logger.info(`✅ User found: ${username} (${userId}) - Password reset requested`);

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      logger.info(`🔑 Generated reset token for user: ${username}`);

      // Save reset token to database
      await executeQuery(
        this.pool,
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, resetToken, expiresAt]
      );

      logger.info(`💾 Reset token saved to database`);

      // Generate reset URL
      const resetUrl = this.emailService.generateResetUrl(resetToken);

      // Send reset email
      const emailSent = await this.emailService.sendResetPasswordEmail({
        email: email,
        username: username,
        resetToken: resetToken,
        resetUrl: resetUrl
      });

      if (emailSent) {
        logger.info(`✅ Password reset email sent successfully to: ${email}`);
      } else {
        logger.error(`❌ Failed to send password reset email to: ${email}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('❌ Forgot password service error:', error);
      return {
        success: false,
        message: 'Password reset request failed'
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      logger.info(`🔍 Reset password request with token: ${token.substring(0, 8)}...`);

      // Validate password strength
      const passwordErrors = this.validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        return {
          success: false,
          message: 'Password validation failed: ' + passwordErrors.join(', ')
        };
      }

      // Find valid reset token
      const tokens = await executeQuery(
        this.pool,
        'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1',
        [token]
      );

      if (tokens.length === 0) {
        logger.info(`❌ Invalid reset token: ${token.substring(0, 8)}...`);
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      const tokenData = tokens[0];

      // Check if token is expired
      if (new Date() > new Date(tokenData.expires_at)) {
        logger.info(`❌ Expired reset token: ${token.substring(0, 8)}...`);
        return {
          success: false,
          message: 'Reset token has expired'
        };
      }

      // Check if token is already used
      if (tokenData.used) {
        logger.info(`❌ Already used reset token: ${token.substring(0, 8)}...`);
        return {
          success: false,
          message: 'Reset token has already been used'
        };
      }

      const userId = tokenData.user_id;

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update user password
      await executeQuery(
        this.pool,
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Mark token as used
      await executeQuery(
        this.pool,
        'UPDATE password_reset_tokens SET used = TRUE, updated_at = NOW() WHERE token = $1',
        [token]
      );

      // Invalidate all user sessions for security
      await executeQuery(
        this.pool,
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      logger.info(`✅ Password reset successful for user: ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('❌ Reset password service error:', error);
      return {
        success: false,
        message: 'Password reset failed'
      };
    }
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await executeQuery(
      this.pool,
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [userId, refreshToken, expiresAt]
    );
  }

  private async replaceRefreshToken(oldToken: string, newToken: string, userId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await executeQuery(
      this.pool,
      'DELETE FROM user_sessions WHERE token_hash = $1',
      [oldToken]
    );

    await executeQuery(
      this.pool,
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [userId, newToken, expiresAt]
    );
  }

  async updateUserProfile(userId: string, profileData: any): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbField} = $${paramIndex++}`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);

      const query = `
        UPDATE user_profiles
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await executeQuery(this.pool, query, updateValues);

      if (result.length === 0) {
        return {
          success: false,
          message: 'User profile not found'
        };
      }

      EventService.sendEvent('user.profile.updated', result[0]);

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Update user profile service error:', error);
      return {
        success: false,
        message: 'Failed to update user profile'
      };
    }
  }
}
