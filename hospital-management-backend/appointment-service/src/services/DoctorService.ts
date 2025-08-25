import { 
  getPool,
  executeQuery,
  logger
} from '@hospital/shared';

export interface DoctorInfo {
  id: string;
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  specialization: string;
  rating: number;
  totalReviews: number;
  consultationFee?: number;
  isAcceptingPatients: boolean;
  availabilityHours?: any;
}

export interface DoctorFilters {
  specialization?: string;
  minRating?: number;
  maxConsultationFee?: number;
  isAcceptingPatients?: boolean;
  search?: string;
}

export interface GetDoctorsResult {
  doctors: DoctorInfo[];
  total: number;
}

export class DoctorService {
  private pool = getPool('appointment');

  async getDoctorById(doctorId: string): Promise<DoctorInfo | null> {
    try {
      // This would typically call the auth service API to get doctor info
      // For now, we'll query the local database if doctor info is cached
      const query = `
        SELECT 
          d.id,
          d.user_id,
          d.username,
          d.first_name,
          d.last_name,
          d.specialization,
          d.rating,
          d.total_reviews,
          d.consultation_fee,
          d.is_accepting_patients,
          d.availability_hours
        FROM doctors d
        WHERE d.id = $1
      `;

      const doctors = await executeQuery(this.pool, query, [doctorId]);

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
        specialization: doctor.specialization,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews || 0,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        isAcceptingPatients: doctor.is_accepting_patients,
        availabilityHours: doctor.availability_hours
      };
    } catch (error) {
      logger.error('Get doctor by ID service error:', error);
      return null;
    }
  }

  async getDoctorByUserId(userId: string): Promise<DoctorInfo | null> {
    try {
      const query = `
        SELECT 
          d.id,
          d.user_id,
          d.username,
          d.first_name,
          d.last_name,
          d.specialization,
          d.rating,
          d.total_reviews,
          d.consultation_fee,
          d.is_accepting_patients,
          d.availability_hours
        FROM doctors d
        WHERE d.user_id = $1
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
        specialization: doctor.specialization,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews || 0,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        isAcceptingPatients: doctor.is_accepting_patients,
        availabilityHours: doctor.availability_hours
      };
    } catch (error) {
      logger.error('Get doctor by user ID service error:', error);
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
        whereConditions.push(`d.specialization ILIKE $${paramIndex}`);
        params.push(`%${filters.specialization}%`);
        paramIndex++;
      }

      if (filters.minRating !== undefined) {
        whereConditions.push(`d.rating >= $${paramIndex}`);
        params.push(filters.minRating);
        paramIndex++;
      }

      if (filters.maxConsultationFee !== undefined) {
        whereConditions.push(`d.consultation_fee <= $${paramIndex}`);
        params.push(filters.maxConsultationFee);
        paramIndex++;
      }

      if (filters.isAcceptingPatients !== undefined) {
        whereConditions.push(`d.is_accepting_patients = $${paramIndex}`);
        params.push(filters.isAcceptingPatients);
        paramIndex++;
      }

      if (filters.search) {
        whereConditions.push(`(
          d.first_name ILIKE $${paramIndex} OR 
          d.last_name ILIKE $${paramIndex} OR 
          d.specialization ILIKE $${paramIndex} OR
          d.username ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM doctors d
        ${whereClause}
      `;

      const countResult = await executeQuery(this.pool, countQuery, params);
      const total = parseInt(countResult[0].total);

      // Get paginated results
      const doctorsQuery = `
        SELECT 
          d.id,
          d.user_id,
          d.username,
          d.first_name,
          d.last_name,
          d.specialization,
          d.rating,
          d.total_reviews,
          d.consultation_fee,
          d.is_accepting_patients,
          d.availability_hours
        FROM doctors d
        ${whereClause}
        ORDER BY d.rating DESC, d.first_name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const doctors = await executeQuery(this.pool, doctorsQuery, [...params, limit, offset]);

      const formattedDoctors = doctors.map(doctor => ({
        id: doctor.id,
        userId: doctor.user_id,
        username: doctor.username,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        specialization: doctor.specialization,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews || 0,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        isAcceptingPatients: doctor.is_accepting_patients,
        availabilityHours: doctor.availability_hours
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

  async getAvailableDoctors(specialization?: string, date?: string): Promise<DoctorInfo[]> {
    try {
      let whereConditions = ['d.is_accepting_patients = true'];
      let params: any[] = [];
      let paramIndex = 1;

      if (specialization) {
        whereConditions.push(`d.specialization ILIKE $${paramIndex}`);
        params.push(`%${specialization}%`);
        paramIndex++;
      }

      // If date is provided, we could check availability for that specific date
      // This would require integration with the availability/scheduling system

      const query = `
        SELECT 
          d.id,
          d.user_id,
          d.username,
          d.first_name,
          d.last_name,
          d.specialization,
          d.rating,
          d.total_reviews,
          d.consultation_fee,
          d.is_accepting_patients,
          d.availability_hours
        FROM doctors d
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY d.rating DESC, d.first_name ASC
      `;

      const doctors = await executeQuery(this.pool, query, params);

      return doctors.map(doctor => ({
        id: doctor.id,
        userId: doctor.user_id,
        username: doctor.username,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        specialization: doctor.specialization,
        rating: parseFloat(doctor.rating) || 0,
        totalReviews: doctor.total_reviews || 0,
        consultationFee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : undefined,
        isAcceptingPatients: doctor.is_accepting_patients,
        availabilityHours: doctor.availability_hours
      }));
    } catch (error) {
      logger.error('Get available doctors service error:', error);
      return [];
    }
  }

  // Sync doctor data from auth service (this would be called when doctor profiles are updated)
  async syncDoctorData(doctorData: any): Promise<boolean> {
    try {
      const upsertQuery = `
        INSERT INTO doctors (
          id, user_id, username, first_name, last_name, specialization,
          rating, total_reviews, consultation_fee, is_accepting_patients, availability_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id) DO UPDATE SET
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          specialization = EXCLUDED.specialization,
          rating = EXCLUDED.rating,
          total_reviews = EXCLUDED.total_reviews,
          consultation_fee = EXCLUDED.consultation_fee,
          is_accepting_patients = EXCLUDED.is_accepting_patients,
          availability_hours = EXCLUDED.availability_hours,
          updated_at = NOW()
      `;

      await executeQuery(this.pool, upsertQuery, [
        doctorData.id,
        doctorData.userId,
        doctorData.username,
        doctorData.firstName,
        doctorData.lastName,
        doctorData.specialization,
        doctorData.rating,
        doctorData.totalReviews,
        doctorData.consultationFee,
        doctorData.isAcceptingPatients,
        doctorData.availabilityHours
      ]);

      return true;
    } catch (error) {
      logger.error('Sync doctor data service error:', error);
      return false;
    }
  }
}
