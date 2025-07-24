import { 
  getPool,
  executeQuery,
  logger,
  removeUndefinedFields
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';

export interface DoctorProfile {
  id: string;
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  rating: number;
  totalReviews: number;
  consultationFee?: number;
  education?: string;
  certifications?: string[];
  languagesSpoken?: string[];
  availabilityHours?: any;
  isAcceptingPatients: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDoctorProfileData {
  userId: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  education?: string;
  certifications?: string[];
  languagesSpoken?: string[];
  availabilityHours?: any;
  isAcceptingPatients?: boolean;
}

export interface UpdateDoctorProfileData {
  specialization?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  education?: string;
  certifications?: string[];
  languagesSpoken?: string[];
  availabilityHours?: any;
  isAcceptingPatients?: boolean;
}

export interface DoctorFilters {
  specialization?: string;
  minRating?: number;
  maxConsultationFee?: number;
  isAcceptingPatients?: boolean;
  search?: string;
}

export interface GetDoctorsResult {
  doctors: DoctorProfile[];
  total: number;
}

export class DoctorService {
  private pool = getPool('auth');

  async getDoctorProfileByUserId(userId: string): Promise<DoctorProfile | null> {
    try {
      const query = `
        SELECT 
          dp.*,
          u.username,
          up.first_name,
          up.last_name,
          up.phone,
          up.avatar_url
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE dp.user_id = $1
      `;

      const doctors = await executeQuery(this.pool, query, [userId]);

      if (doctors.length === 0) {
        return null;
      }

      const doctor = doctors[0];
      return {
        id: doctor.id,
        userId: doctor.user_id,
        username: doctor.username,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        phone: doctor.phone,
        avatarUrl: doctor.avatar_url,
        specialization: doctor.specialization,
        licenseNumber: doctor.license_number,
        yearsOfExperience: doctor.years_of_experience,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        education: doctor.education,
        certifications: doctor.certifications || [],
        languagesSpoken: doctor.languages_spoken || ['Vietnamese'],
        availabilityHours: doctor.availability_hours,
        isAcceptingPatients: doctor.is_accepting_patients,
        createdAt: doctor.created_at,
        updatedAt: doctor.updated_at
      };
    } catch (error) {
      logger.error('Get doctor profile by user ID service error:', error);
      return null;
    }
  }

  async getDoctorProfileById(id: string): Promise<DoctorProfile | null> {
    try {
      const query = `
        SELECT 
          dp.*,
          u.username,
          up.first_name,
          up.last_name,
          up.phone,
          up.avatar_url
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE dp.id = $1
      `;

      const doctors = await executeQuery(this.pool, query, [id]);

      if (doctors.length === 0) {
        return null;
      }

      const doctor = doctors[0];
      return {
        id: doctor.id,
        userId: doctor.user_id,
        username: doctor.username,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        phone: doctor.phone,
        avatarUrl: doctor.avatar_url,
        specialization: doctor.specialization,
        licenseNumber: doctor.license_number,
        yearsOfExperience: doctor.years_of_experience,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        education: doctor.education,
        certifications: doctor.certifications || [],
        languagesSpoken: doctor.languages_spoken || ['Vietnamese'],
        availabilityHours: doctor.availability_hours,
        isAcceptingPatients: doctor.is_accepting_patients,
        createdAt: doctor.created_at,
        updatedAt: doctor.updated_at
      };
    } catch (error) {
      logger.error('Get doctor profile by ID service error:', error);
      return null;
    }
  }

  async getAllDoctors(page: number = 1, limit: number = 10, filters: DoctorFilters = {}): Promise<GetDoctorsResult> {
    try {
      const offset = (page - 1) * limit;
      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions based on filters
      if (filters.specialization) {
        whereConditions.push(`dp.specialization ILIKE $${paramIndex}`);
        params.push(`%${filters.specialization}%`);
        paramIndex++;
      }

      if (filters.minRating !== undefined) {
        whereConditions.push(`dp.rating >= $${paramIndex}`);
        params.push(filters.minRating);
        paramIndex++;
      }

      if (filters.maxConsultationFee !== undefined) {
        whereConditions.push(`dp.consultation_fee <= $${paramIndex}`);
        params.push(filters.maxConsultationFee);
        paramIndex++;
      }

      if (filters.isAcceptingPatients !== undefined) {
        whereConditions.push(`dp.is_accepting_patients = $${paramIndex}`);
        params.push(filters.isAcceptingPatients);
        paramIndex++;
      }

      if (filters.search) {
        whereConditions.push(`(
          up.first_name ILIKE $${paramIndex} OR 
          up.last_name ILIKE $${paramIndex} OR 
          dp.specialization ILIKE $${paramIndex} OR
          u.username ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        ${whereClause}
      `;

      const countResult = await executeQuery(this.pool, countQuery, params);
      const total = parseInt(countResult[0].total);

      // Get paginated results
      const doctorsQuery = `
        SELECT 
          dp.*,
          u.username,
          up.first_name,
          up.last_name,
          up.phone,
          up.avatar_url
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        ${whereClause}
        ORDER BY dp.rating DESC, dp.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const doctors = await executeQuery(this.pool, doctorsQuery, [...params, limit, offset]);

      const formattedDoctors = doctors.map(doctor => ({
        id: doctor.id,
        userId: doctor.user_id,
        username: doctor.username,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        phone: doctor.phone,
        avatarUrl: doctor.avatar_url,
        specialization: doctor.specialization,
        licenseNumber: doctor.license_number,
        yearsOfExperience: doctor.years_of_experience,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        education: doctor.education,
        certifications: doctor.certifications || [],
        languagesSpoken: doctor.languages_spoken || ['Vietnamese'],
        availabilityHours: doctor.availability_hours,
        isAcceptingPatients: doctor.is_accepting_patients,
        createdAt: doctor.created_at,
        updatedAt: doctor.updated_at
      }));

      return {
        doctors: formattedDoctors,
        total
      };
    } catch (error) {
      logger.error('Get all doctors service error:', error);
      return {
        doctors: [],
        total: 0
      };
    }
  }

  async createDoctorProfile(data: CreateDoctorProfileData): Promise<DoctorProfile | null> {
    try {
      // Check if user exists and has doctor role
      const userQuery = `SELECT id, role FROM users WHERE id = $1`;
      const users = await executeQuery(this.pool, userQuery, [data.userId]);

      if (users.length === 0) {
        throw new Error('User not found');
      }

      if (users[0].role !== 'doctor') {
        throw new Error('User must have doctor role');
      }

      // Check if doctor profile already exists
      const existingProfile = await this.getDoctorProfileByUserId(data.userId);
      if (existingProfile) {
        throw new Error('Doctor profile already exists for this user');
      }

      // Check if license number is unique
      const licenseQuery = `SELECT id FROM doctor_profiles WHERE license_number = $1`;
      const existingLicense = await executeQuery(this.pool, licenseQuery, [data.licenseNumber]);
      if (existingLicense.length > 0) {
        throw new Error('License number already exists');
      }

      const profileId = uuidv4();
      const insertQuery = `
        INSERT INTO doctor_profiles (
          id, user_id, specialization, license_number, years_of_experience,
          consultation_fee, education, certifications, languages_spoken,
          availability_hours, is_accepting_patients, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;

      const newProfiles = await executeQuery(this.pool, insertQuery, [
        profileId,
        data.userId,
        data.specialization,
        data.licenseNumber,
        data.yearsOfExperience || 0,
        data.consultationFee || null,
        data.education || null,
        data.certifications || [],
        data.languagesSpoken || ['Vietnamese'],
        data.availabilityHours || null,
        data.isAcceptingPatients !== false
      ]);

      const newProfile = newProfiles[0];
      return {
        id: newProfile.id,
        userId: newProfile.user_id,
        specialization: newProfile.specialization,
        licenseNumber: newProfile.license_number,
        yearsOfExperience: newProfile.years_of_experience,
        rating: 0,
        totalReviews: 0,
        consultationFee: newProfile.consultation_fee ? parseFloat(newProfile.consultation_fee) : undefined,
        education: newProfile.education,
        certifications: newProfile.certifications || [],
        languagesSpoken: newProfile.languages_spoken || ['Vietnamese'],
        availabilityHours: newProfile.availability_hours,
        isAcceptingPatients: newProfile.is_accepting_patients,
        createdAt: newProfile.created_at,
        updatedAt: newProfile.updated_at
      };
    } catch (error) {
      logger.error('Create doctor profile service error:', error);
      return null;
    }
  }

  async updateDoctorProfile(userId: string, data: UpdateDoctorProfileData): Promise<DoctorProfile | null> {
    try {
      // Check if doctor profile exists
      const existingProfile = await this.getDoctorProfileByUserId(userId);
      if (!existingProfile) {
        throw new Error('Doctor profile not found');
      }

      // Check if license number is unique (if being updated)
      if (data.licenseNumber && data.licenseNumber !== existingProfile.licenseNumber) {
        const licenseQuery = `SELECT id FROM doctor_profiles WHERE license_number = $1 AND user_id != $2`;
        const existingLicense = await executeQuery(this.pool, licenseQuery, [data.licenseNumber, userId]);
        if (existingLicense.length > 0) {
          throw new Error('License number already exists');
        }
      }

      // Remove undefined fields
      const cleanData = removeUndefinedFields(data);

      if (Object.keys(cleanData).length === 0) {
        return existingProfile;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(cleanData).forEach(([key, value]) => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbField} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      });

      updateFields.push(`updated_at = NOW()`);

      const updateQuery = `
        UPDATE doctor_profiles
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      params.push(userId);

      const updatedProfiles = await executeQuery(this.pool, updateQuery, params);

      if (updatedProfiles.length === 0) {
        return null;
      }

      const updatedProfile = updatedProfiles[0];
      return {
        id: updatedProfile.id,
        userId: updatedProfile.user_id,
        specialization: updatedProfile.specialization,
        licenseNumber: updatedProfile.license_number,
        yearsOfExperience: updatedProfile.years_of_experience,
        rating: parseFloat(updatedProfile.rating) || 0,
        totalReviews: updatedProfile.total_reviews,
        consultationFee: updatedProfile.consultation_fee ? parseFloat(updatedProfile.consultation_fee) : undefined,
        education: updatedProfile.education,
        certifications: updatedProfile.certifications || [],
        languagesSpoken: updatedProfile.languages_spoken || ['Vietnamese'],
        availabilityHours: updatedProfile.availability_hours,
        isAcceptingPatients: updatedProfile.is_accepting_patients,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at
      };
    } catch (error) {
      logger.error('Update doctor profile service error:', error);
      return null;
    }
  }

  async deleteDoctorProfile(userId: string): Promise<boolean> {
    try {
      const deleteQuery = `DELETE FROM doctor_profiles WHERE user_id = $1`;
      const result = await executeQuery(this.pool, deleteQuery, [userId]);
      return result.length > 0;
    } catch (error) {
      logger.error('Delete doctor profile service error:', error);
      return false;
    }
  }

  async updateDoctorRating(userId: string, newRating: number): Promise<boolean> {
    try {
      // This would typically be called after a patient review
      // For now, we'll just update the rating and increment review count
      const updateQuery = `
        UPDATE doctor_profiles
        SET
          rating = (rating * total_reviews + $2) / (total_reviews + 1),
          total_reviews = total_reviews + 1,
          updated_at = NOW()
        WHERE user_id = $1
      `;

      await executeQuery(this.pool, updateQuery, [userId, newRating]);
      return true;
    } catch (error) {
      logger.error('Update doctor rating service error:', error);
      return false;
    }
  }
}
