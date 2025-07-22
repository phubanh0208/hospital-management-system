import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateUser, 
  validatePassword,
  logger
} from '@hospital/shared';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json(createErrorResponse('Username and password are required'));
        return;
      }

      const result = await this.authService.login(username, password);
      
      if (!result.success) {
        res.status(401).json(createErrorResponse(result.message || 'Invalid credentials'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Login successful'));
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = req.body;

      // Validate user data
      const userErrors = validateUser(userData);
      const passwordErrors = validatePassword(userData.password);
      const allErrors = [...userErrors, ...passwordErrors];

      if (allErrors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', allErrors));
        return;
      }

      const result = await this.authService.register(userData);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Registration failed'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'User registered successfully'));
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json(createErrorResponse('Refresh token is required'));
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);
      
      if (!result.success) {
        res.status(401).json(createErrorResponse(result.message || 'Invalid refresh token'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Token refreshed successfully'));
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      await this.authService.logout(userId, refreshToken);
      res.json(createSuccessResponse(null, 'Logged out successfully'));
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json(createErrorResponse('Current password and new password are required'));
        return;
      }

      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        res.status(400).json(createErrorResponse('Password validation failed', passwordErrors));
        return;
      }

      const result = await this.authService.changePassword(userId, currentPassword, newPassword);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Password change failed'));
        return;
      }

      res.json(createSuccessResponse(null, 'Password changed successfully'));
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json(createErrorResponse('Email is required'));
        return;
      }

      const result = await this.authService.forgotPassword(email);
      
      // Always return success for security reasons
      res.json(createSuccessResponse(null, 'If email exists, password reset instructions have been sent'));
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json(createErrorResponse('Reset token and new password are required'));
        return;
      }

      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        res.status(400).json(createErrorResponse('Password validation failed', passwordErrors));
        return;
      }

      const result = await this.authService.resetPassword(token, newPassword);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Password reset failed'));
        return;
      }

      res.json(createSuccessResponse(null, 'Password reset successfully'));
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
