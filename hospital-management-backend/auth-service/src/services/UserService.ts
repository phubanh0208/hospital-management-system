import { 
  User,
  UserRole,
  getPool,
  executeQuery,
  logger,
  hashPassword,
  removeUndefinedFields,
  encryptEmail,
  decryptEmail,
  encryptPhone,
  decryptPhone
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface GetUsersResult {
  users: Omit<User, 'password'>[];
  total: number;
}

export interface UserWithPassword extends User {
  password: string;
}

export class UserService {
  private pool = getPool('auth');

  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    try {
      const users = await executeQuery(
        this.pool,
        `SELECT 
          u.id, u.username, u.email, u.role, u.hospital_id, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login,
          up.id as profile_id, up.first_name, up.last_name, up.phone, up.date_of_birth, up.address, up.avatar_url
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE u.id = $1`,
        [id]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        username: user.username,
        email: user.email ? decryptEmail(user.email) : '',
        role: user.role,
        profile: user.profile_id ? {
          id: user.profile_id,
          userId: user.id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          phone: user.phone ? decryptPhone(user.phone) : '',
          dateOfBirth: user.date_of_birth || null,
          address: user.address || '',
          avatarUrl: user.avatar_url || ''
        } : undefined,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Get user by ID service error:', error);
      return null;
    }
  }

  async getAllUsers(page: number, limit: number, filters: UserFilters): Promise<GetUsersResult> {
    try {
      logger.info('🔍 Getting all users with filters:', filters);
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Add search filter
      if (filters.search) {
        whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Add role filter
      if (filters.role) {
        whereClause += ` AND u.role = $${paramIndex}`;
        params.push(filters.role);
        paramIndex++;
      }

      // Add active status filter
      if (filters.isActive !== undefined) {
        whereClause += ` AND u.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
      logger.info('📊 Count query:', countQuery, 'params:', params);
      const countResult = await executeQuery(this.pool, countQuery, params);
      const total = parseInt(countResult[0].total);
      logger.info('📊 Total users found:', total);

      if (total === 0) {
        return {
          users: [],
          total: 0
        };
      }

      // Get users with pagination
      const offset = (page - 1) * limit;
      const usersQuery = `
        SELECT 
          u.id, u.username, u.email, u.role, u.hospital_id, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login,
          up.id as profile_id, up.first_name, up.last_name, up.phone, up.date_of_birth, up.address, up.avatar_url
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      logger.info('📋 Users query:', usersQuery, 'params:', [...params, limit, offset]);
      const users = await executeQuery(this.pool, usersQuery, [...params, limit, offset]);
      logger.info(`👥 Found ${users.length} users in database`);

      const formattedUsers = [];
      for (const user of users) {
        try {
          const formattedUser = {
            id: user.id,
            username: user.username,
            email: user.email ? decryptEmail(user.email) : '',
            role: user.role,
            profile: user.profile_id ? {
              id: user.profile_id,
              userId: user.id,
              firstName: user.first_name || '',
              lastName: user.last_name || '',
              phone: user.phone ? decryptPhone(user.phone) : '',
              dateOfBirth: user.date_of_birth || null,
              address: user.address || '',
              avatarUrl: user.avatar_url || ''
            } : undefined,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          };
          formattedUsers.push(formattedUser);
        } catch (userError) {
          logger.error(`❌ Error formatting user ${user.id}:`, userError);
          // Skip this user and continue with others
          continue;
        }
      }

      logger.info(`✅ Successfully formatted ${formattedUsers.length} users`);

      return {
        users: formattedUsers,
        total
      };
    } catch (error) {
      logger.error('❌ Get all users service error:', error);
      return {
        users: [],
        total: 0
      };
    }
  }

  async createUser(userData: any): Promise<Omit<User, 'password'> | null> {
    try {
      // Check if user already exists
      const existingUsers = await executeQuery(
        this.pool,
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUsers.length > 0) {
        throw new Error('User with this email or username already exists');
      }

      const userId = uuidv4();
      let passwordHash = '';

      // If password provided, hash it; otherwise generate a temporary one
      if (userData.password) {
        passwordHash = await hashPassword(userData.password);
      } else {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        passwordHash = await hashPassword(tempPassword);
        logger.info(`Temporary password for user ${userData.email}: ${tempPassword}`);
      }

      const insertQuery = `
        INSERT INTO users (
          id, username, email, password_hash, role, hospital_id, is_active, is_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, username, email, role, hospital_id, is_active, is_verified, created_at, updated_at
      `;

      // Determine default active status based on role
      let defaultIsActive;
      if (userData.isActive !== undefined) {
        // If explicitly set, use that value
        defaultIsActive = userData.isActive;
      } else {
        // Default logic: patients are active, all other roles are inactive
        const userRole = userData.role || UserRole.STAFF;
        defaultIsActive = userRole === UserRole.PATIENT;
      }
      
      logger.info(`🔐 Creating user with role: ${userData.role || UserRole.STAFF}, isActive: ${defaultIsActive}`);

      const newUsers = await executeQuery(this.pool, insertQuery, [
        userId,
        userData.username,
        encryptEmail(userData.email),
        passwordHash,
        userData.role || UserRole.STAFF,
        userData.hospitalId || null,
        defaultIsActive,
        false // Default to not verified
      ]);

      const newUser = newUsers[0];
      
      // Create user profile, even if empty
      const profile = userData.profile || {};
      await executeQuery(this.pool,
        `INSERT INTO user_profiles (user_id, first_name, last_name, phone, date_of_birth, address, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newUser.id,
          profile.firstName || '',
          profile.lastName || '',
          profile.phone ? encryptPhone(profile.phone) : '',
          profile.dateOfBirth || null,
          profile.address || '',
          profile.avatarUrl || ''
        ]
      );

      return {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profile: userData.profile ? {
          id: newUser.id,
          userId: newUser.id,
          firstName: userData.profile.firstName || '',
          lastName: userData.profile.lastName || '',
          phone: userData.profile.phone || '',
          dateOfBirth: userData.profile.dateOfBirth || null,
          address: userData.profile.address || '',
          avatarUrl: userData.profile.avatarUrl || ''
        } : undefined,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      };
    } catch (error) {
      logger.error('Create user service error:', error);
      return null;
    }
  }

  async updateUser(id: string, updateData: any): Promise<Omit<User, 'password'> | null> {
    try {
      // Remove undefined fields
      const cleanData = removeUndefinedFields(updateData);
      
      if (Object.keys(cleanData).length === 0) {
        // If no valid update data, return current user
        return this.getUserById(id);
      }

      // Separate user data and profile data
      const { profile, ...userData } = cleanData;

      // Update user table if there's user data
      if (Object.keys(userData).length > 0) {
        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(userData)) {
          if (key === 'hospitalId') {
            updateFields.push(`hospital_id = $${paramIndex}`);
            params.push(value);
          } else if (key === 'isActive') {
            updateFields.push(`is_active = $${paramIndex}`);
            params.push(value);
          } else if (key === 'isVerified') {
            updateFields.push(`is_verified = $${paramIndex}`);
            params.push(value);
          } else if (key === 'email') {
            updateFields.push(`email = $${paramIndex}`);
            params.push(encryptEmail(value as string));
          } else if (['username', 'role'].includes(key)) {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          params.push(id);

          const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
          `;

          await executeQuery(this.pool, updateQuery, params);
        }
      }

      // Update profile table if there's profile data
      if (profile && Object.keys(profile).length > 0) {
        const profileFields: string[] = [];
        const profileParams: any[] = [];
        let profileParamIndex = 1;

        for (const [key, value] of Object.entries(profile)) {
          if (key === 'firstName') {
            profileFields.push(`first_name = $${profileParamIndex}`);
            profileParams.push(value);
          } else if (key === 'lastName') {
            profileFields.push(`last_name = $${profileParamIndex}`);
            profileParams.push(value);
          } else if (key === 'phone') {
            profileFields.push(`phone = $${profileParamIndex}`);
            profileParams.push(value ? encryptPhone(value as string) : null);
          } else if (key === 'dateOfBirth') {
            profileFields.push(`date_of_birth = $${profileParamIndex}`);
            profileParams.push(value || null);
          } else if (key === 'address') {
            profileFields.push(`address = $${profileParamIndex}`);
            profileParams.push(value || '');
          } else if (key === 'avatarUrl') {
            profileFields.push(`avatar_url = $${profileParamIndex}`);
            profileParams.push(value || '');
          }
          profileParamIndex++;
        }

        if (profileFields.length > 0) {
          // Append updated_at only for UPDATE path
          const updateSetClauses = [...profileFields, 'updated_at = NOW()'];

          // build params for UPDATE: original profile params + user id at the end
          const updateParams = [...profileParams, id];

          // Check if profile exists
          const existingProfile = await executeQuery(
            this.pool,
            'SELECT id FROM user_profiles WHERE user_id = $1',
            [id]
          );

          if (existingProfile.length > 0) {
            // Update existing profile
            const updateProfileQuery = `
              UPDATE user_profiles 
              SET ${updateSetClauses.join(', ')}
              WHERE user_id = $${profileParamIndex}
            `;
            await executeQuery(this.pool, updateProfileQuery, updateParams);
          } else {
            // Create new profile
            const insertColumns = profileFields
              .map(field => field.split(' = ')[0])
              .filter(col => col !== 'updated_at');

            // Build proper parameter placeholders: $1 for user_id, then $2, $3, etc. for profile params
            const insertValuesPlaceholders = profileParams
              .map((_, i) => `$${i + 2}`) // Start from $2 since $1 is user_id
              .join(', ');

            const insertProfileQuery = `
              INSERT INTO user_profiles (user_id, ${insertColumns.join(', ')}, created_at, updated_at)
              VALUES ($1, ${insertValuesPlaceholders}, NOW(), NOW())
            `;
            const insertParams = [id, ...profileParams];
            await executeQuery(this.pool, insertProfileQuery, insertParams);
          }
        }
      }

      // Return updated user with full profile
      return this.getUserById(id);
    } catch (error) {
      logger.error('Update user service error:', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await executeQuery(
        this.pool,
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      return result.length > 0;
    } catch (error) {
      logger.error('Delete user service error:', error);
      return false;
    }
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
      const result = await executeQuery(
        this.pool,
        'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [isActive, id]
      );

      return result.length > 0;
    } catch (error) {
      logger.error('Update user status service error:', error);
      return false;
    }
  }

  async getUserByEmail(email: string): Promise<UserWithPassword | null> {
    try {
      const users = await executeQuery(
        this.pool,
        `SELECT 
          u.id, u.username, u.email, u.password_hash, u.role, u.hospital_id, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login,
          up.id as profile_id, up.first_name, up.last_name, up.phone, up.date_of_birth, up.address, up.avatar_url
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE u.email = $1`,
        [email]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password_hash, // This method returns password for login verification
        role: user.role,
        profile: user.profile_id ? {
          id: user.profile_id,
          userId: user.id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          phone: user.phone || '',
          dateOfBirth: user.date_of_birth || null,
          address: user.address || '',
          avatarUrl: user.avatar_url || ''
        } : undefined,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Get user by email service error:', error);
      return null;
    }
  }
}
