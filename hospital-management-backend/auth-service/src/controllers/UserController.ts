import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateUser,
  calculatePagination,
  logger
} from '@hospital/shared';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(user));
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const updateData = req.body;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      // Remove sensitive fields that shouldn't be updated via profile
      delete updateData.password;
      delete updateData.role;
      delete updateData.isActive;

      const updatedUser = await this.userService.updateUser(userId, updateData);
      
      if (!updatedUser) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(updatedUser, 'Profile updated successfully'));
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const isActive = req.query.isActive as string;

      const filters = {
        search,
        role,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      };

      const result = await this.userService.getAllUsers(page, limit, filters);
      
      const pagination = calculatePagination(page, limit, result.total);

      res.json(createSuccessResponse({
        users: result.users,
        pagination
      }));
    } catch (error) {
      logger.error('Get all users error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(user));
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = req.body;

      // Validate user data
      const errors = validateUser(userData);
      if (errors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', errors));
        return;
      }

      const newUser = await this.userService.createUser(userData);
      
      if (!newUser) {
        res.status(400).json(createErrorResponse('User creation failed'));
        return;
      }

      res.status(201).json(createSuccessResponse(newUser, 'User created successfully'));
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove password from update data - use change password endpoint instead
      delete updateData.password;

      const updatedUser = await this.userService.updateUser(id, updateData);
      
      if (!updatedUser) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(updatedUser, 'User updated successfully'));
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUserId = (req as AuthenticatedRequest).user?.id;

      // Prevent self-deletion
      if (id === currentUserId) {
        res.status(400).json(createErrorResponse('Cannot delete your own account'));
        return;
      }

      const success = await this.userService.deleteUser(id);
      
      if (!success) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(null, 'User deleted successfully'));
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUserId = (req as AuthenticatedRequest).user?.id;

      // Prevent self-deactivation
      if (id === currentUserId) {
        res.status(400).json(createErrorResponse('Cannot deactivate your own account'));
        return;
      }

      const success = await this.userService.updateUserStatus(id, false);
      
      if (!success) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(null, 'User deactivated successfully'));
    } catch (error) {
      logger.error('Deactivate user error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  activateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const success = await this.userService.updateUserStatus(id, true);
      
      if (!success) {
        res.status(404).json(createErrorResponse('User not found'));
        return;
      }

      res.json(createSuccessResponse(null, 'User activated successfully'));
    } catch (error) {
      logger.error('Activate user error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
