import { 
  Patient, 
  PatientMedicalHistory, 
  PatientVisitSummary,
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';
import { EventService } from './EventService';

export interface PatientResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface PatientQueryOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export class PatientService {
  private pool = getPool('patient');

  async getAllPatients(options: PatientQueryOptions): Promise<PatientResult> {
    try {
      const { page, limit, search, sortBy = 'created_at', sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;

      // Build search condition
      let searchCondition = '';
      let searchParams: any[] = [];
      
      if (search) {
        searchCondition = `
          WHERE (
            full_name ILIKE $${searchParams.length + 1} OR 
            patient_code ILIKE $${searchParams.length + 1} OR 
            phone ILIKE $${searchParams.length + 1} OR 
            email ILIKE $${searchParams.length + 1}
          ) AND is_active = true
        `;
        searchParams.push(`%${search}%`);
      } else {
        searchCondition = 'WHERE is_active = true';
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM patients 
        ${searchCondition}
      `;
      const countResult = await executeQuery(this.pool, countQuery, searchParams);
      const total = parseInt(countResult[0].total);

      // Map sortBy field names to database column names
      const sortByMapping: { [key: string]: string } = {
        'fullName': 'full_name',
        'patientCode': 'patient_code',
        'dateOfBirth': 'date_of_birth',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      };

      const dbSortBy = sortByMapping[sortBy] || 'full_name';

      // Get patients
      const patientsQuery = `
        SELECT
          id, patient_code, full_name, date_of_birth, gender,
          phone, email, address, blood_type, allergies,
          medical_history, emergency_contact, insurance_info,
          created_by_user_id, hospital_id, is_active,
          created_at, updated_at
        FROM patients
        ${searchCondition}
        ORDER BY ${dbSortBy} ${sortOrder.toUpperCase()}
        LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
      `;

      const patients = await executeQuery(this.pool, patientsQuery, [
        ...searchParams,
        limit,
        offset
      ]);

      // Transform database rows to Patient objects
      const transformedPatients = patients.map(this.transformDatabaseRowToPatient);

      return {
        success: true,
        data: {
          patients: transformedPatients,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Get all patients service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve patients'
      };
    }
  }

  async getPatientById(id: string): Promise<PatientResult> {
    try {
      const patients = await executeQuery(
        this.pool,
        `SELECT 
          id, patient_code, full_name, date_of_birth, gender, 
          phone, email, address, blood_type, allergies, 
          medical_history, emergency_contact, insurance_info,
          created_by_user_id, hospital_id, is_active, 
          created_at, updated_at
        FROM patients 
        WHERE id = $1 AND is_active = true`,
        [id]
      );

      if (patients.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        };
      }

      const patient = this.transformDatabaseRowToPatient(patients[0]);

      return {
        success: true,
        data: patient
      };
    } catch (error) {
      logger.error('Get patient by ID service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve patient'
      };
    }
  }

  async getPatientByCode(code: string): Promise<PatientResult> {
    try {
      const patients = await executeQuery(
        this.pool,
        `SELECT 
          id, patient_code, full_name, date_of_birth, gender, 
          phone, email, address, blood_type, allergies, 
          medical_history, emergency_contact, insurance_info,
          created_by_user_id, hospital_id, is_active, 
          created_at, updated_at
        FROM patients 
        WHERE patient_code = $1 AND is_active = true`,
        [code]
      );

      if (patients.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        };
      }

      const patient = this.transformDatabaseRowToPatient(patients[0]);

      return {
        success: true,
        data: patient
      };
    } catch (error) {
      logger.error('Get patient by code service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve patient'
      };
    }
  }

  async createPatient(patientData: Partial<Patient>): Promise<PatientResult> {
    try {
      // Check if patient already exists
      if (patientData.phone) {
        const existingPatients = await executeQuery(
          this.pool,
          'SELECT id FROM patients WHERE phone = $1 AND is_active = true',
          [patientData.phone]
        );

        if (existingPatients.length > 0) {
          return {
            success: false,
            message: 'Patient with this phone number already exists'
          };
        }
      }

      if (patientData.email) {
        const existingPatients = await executeQuery(
          this.pool,
          'SELECT id FROM patients WHERE email = $1 AND is_active = true',
          [patientData.email]
        );

        if (existingPatients.length > 0) {
          return {
            success: false,
            message: 'Patient with this email already exists'
          };
        }
      }

      const patientId = uuidv4();

      // Insert patient (patient_code will be auto-generated by trigger)
      const insertQuery = `
        INSERT INTO patients (
          id, full_name, date_of_birth, gender, phone, email, 
          address, blood_type, allergies, medical_history, 
          emergency_contact, insurance_info, created_by_user_id, 
          hospital_id, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        )
        RETURNING 
          id, patient_code, full_name, date_of_birth, gender, 
          phone, email, address, blood_type, allergies, 
          medical_history, emergency_contact, insurance_info,
          created_by_user_id, hospital_id, is_active, 
          created_at, updated_at
      `;

      const newPatients = await executeQuery(this.pool, insertQuery, [
        patientId,
        patientData.fullName,
        this.formatDateForStorage(patientData.dateOfBirth),
        patientData.gender,
        patientData.phone,
        patientData.email || null,
        JSON.stringify(patientData.address),
        patientData.bloodType || null,
        patientData.allergies || null,
        patientData.medicalHistory || null,
        JSON.stringify(patientData.emergencyContact),
        patientData.insuranceInfo ? JSON.stringify(patientData.insuranceInfo) : null,
        patientData.createdByUserId,
        patientData.hospitalId || null,
        true
      ]);

      const newPatient = this.transformDatabaseRowToPatient(newPatients[0]);

      EventService.sendEvent('patient.registered', newPatient);

      return {
        success: true,
        data: newPatient
      };
    } catch (error) {
      logger.error('Create patient service error:', error);
      return {
        success: false,
        message: 'Failed to create patient'
      };
    }
  }

  async updatePatient(id: string, patientData: Partial<Patient>): Promise<PatientResult> {
    try {
      // Check if patient exists
      const existingPatients = await executeQuery(
        this.pool,
        'SELECT id FROM patients WHERE id = $1 AND is_active = true',
        [id]
      );

      if (existingPatients.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        };
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (patientData.fullName !== undefined) {
        updateFields.push(`full_name = $${paramIndex++}`);
        updateValues.push(patientData.fullName);
      }
      if (patientData.dateOfBirth !== undefined) {
        updateFields.push(`date_of_birth = $${paramIndex++}`);
        // Format date to avoid timezone issues - ensure it's stored as date only
        const dateValue = this.formatDateForStorage(patientData.dateOfBirth);
        updateValues.push(dateValue);
      }
      if (patientData.gender !== undefined) {
        updateFields.push(`gender = $${paramIndex++}`);
        updateValues.push(patientData.gender);
      }
      if (patientData.phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        updateValues.push(patientData.phone);
      }
      if (patientData.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(patientData.email);
      }
      if (patientData.address !== undefined) {
        updateFields.push(`address = $${paramIndex++}`);
        updateValues.push(JSON.stringify(patientData.address));
      }
      if (patientData.bloodType !== undefined) {
        updateFields.push(`blood_type = $${paramIndex++}`);
        updateValues.push(patientData.bloodType);
      }
      if (patientData.allergies !== undefined) {
        updateFields.push(`allergies = $${paramIndex++}`);
        updateValues.push(patientData.allergies);
      }
      if (patientData.medicalHistory !== undefined) {
        updateFields.push(`medical_history = $${paramIndex++}`);
        updateValues.push(patientData.medicalHistory);
      }
      if (patientData.emergencyContact !== undefined) {
        updateFields.push(`emergency_contact = $${paramIndex++}`);
        updateValues.push(JSON.stringify(patientData.emergencyContact));
      }
      if (patientData.insuranceInfo !== undefined) {
        updateFields.push(`insurance_info = $${paramIndex++}`);
        updateValues.push(JSON.stringify(patientData.insuranceInfo));
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }

      // Add updated_at and patient ID
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const updateQuery = `
        UPDATE patients 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id, patient_code, full_name, date_of_birth, gender, 
          phone, email, address, blood_type, allergies, 
          medical_history, emergency_contact, insurance_info,
          created_by_user_id, hospital_id, is_active, 
          created_at, updated_at
      `;

      const updatedPatients = await executeQuery(this.pool, updateQuery, updateValues);
      const updatedPatient = this.transformDatabaseRowToPatient(updatedPatients[0]);

      EventService.sendEvent('patient.updated', updatedPatient);

      return {
        success: true,
        data: updatedPatient
      };
    } catch (error) {
      logger.error('Update patient service error:', error);
      return {
        success: false,
        message: 'Failed to update patient'
      };
    }
  }

  async deletePatient(id: string): Promise<PatientResult> {
    try {
      // Check if patient exists
      const existingPatients = await executeQuery(
        this.pool,
        'SELECT id FROM patients WHERE id = $1 AND is_active = true',
        [id]
      );

      if (existingPatients.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        };
      }

      // Soft delete - set is_active to false
      await executeQuery(
        this.pool,
        'UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      return {
        success: true
      };
    } catch (error) {
      logger.error('Delete patient service error:', error);
      return {
        success: false,
        message: 'Failed to delete patient'
      };
    }
  }

  async getMedicalHistory(patientId: string): Promise<PatientResult> {
    try {
      const history = await executeQuery(
        this.pool,
        `SELECT 
          id, patient_id, condition_name, diagnosed_date, 
          status, notes, created_at
        FROM patient_medical_history 
        WHERE patient_id = $1 
        ORDER BY created_at DESC`,
        [patientId]
      );

      const transformedHistory = history.map((row: any): PatientMedicalHistory => ({
        id: row.id,
        patientId: row.patient_id,
        conditionName: row.condition_name,
        diagnosedDate: row.diagnosed_date,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at
      }));

      return {
        success: true,
        data: transformedHistory
      };
    } catch (error) {
      logger.error('Get medical history service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve medical history'
      };
    }
  }

  async addMedicalHistory(patientId: string, historyData: Partial<PatientMedicalHistory>): Promise<PatientResult> {
    try {
      const historyId = uuidv4();

      const insertQuery = `
        INSERT INTO patient_medical_history (
          id, patient_id, condition_name, diagnosed_date, 
          status, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING 
          id, patient_id, condition_name, diagnosed_date, 
          status, notes, created_at
      `;

      const newHistory = await executeQuery(this.pool, insertQuery, [
        historyId,
        patientId,
        historyData.conditionName,
        historyData.diagnosedDate || null,
        historyData.status || 'active',
        historyData.notes || null
      ]);

      const transformedHistory: PatientMedicalHistory = {
        id: newHistory[0].id,
        patientId: newHistory[0].patient_id,
        conditionName: newHistory[0].condition_name,
        diagnosedDate: newHistory[0].diagnosed_date,
        status: newHistory[0].status,
        notes: newHistory[0].notes,
        createdAt: newHistory[0].created_at
      };

      return {
        success: true,
        data: transformedHistory
      };
    } catch (error) {
      logger.error('Add medical history service error:', error);
      return {
        success: false,
        message: 'Failed to add medical history'
      };
    }
  }

  async getVisitSummary(patientId: string): Promise<PatientResult> {
    try {
      const summaries = await executeQuery(
        this.pool,
        `SELECT 
          id, patient_id, last_appointment_date, total_appointments, 
          active_prescriptions, last_prescription_date, updated_at
        FROM patient_visit_summary 
        WHERE patient_id = $1`,
        [patientId]
      );

      if (summaries.length === 0) {
        // Return default summary if not exists
        const defaultSummary: PatientVisitSummary = {
          id: '',
          patientId,
          lastAppointmentDate: undefined,
          totalAppointments: 0,
          activePrescriptions: 0,
          lastPrescriptionDate: undefined,
          updatedAt: new Date()
        };

        return {
          success: true,
          data: defaultSummary
        };
      }

      const summary: PatientVisitSummary = {
        id: summaries[0].id,
        patientId: summaries[0].patient_id,
        lastAppointmentDate: summaries[0].last_appointment_date,
        totalAppointments: summaries[0].total_appointments,
        activePrescriptions: summaries[0].active_prescriptions,
        lastPrescriptionDate: summaries[0].last_prescription_date,
        updatedAt: summaries[0].updated_at
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      logger.error('Get visit summary service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve visit summary'
      };
    }
  }

  // Helper method to transform database row to Patient object
  private transformDatabaseRowToPatient = (row: any): Patient => {
    return {
      id: row.id,
      patientCode: row.patient_code,
      fullName: row.full_name,
      dateOfBirth: this.formatDateOnlyAsString(row.date_of_birth) as any,
      gender: row.gender,
      phone: row.phone,
      email: row.email,
      address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
      bloodType: row.blood_type,
      allergies: row.allergies,
      medicalHistory: row.medical_history,
      emergencyContact: typeof row.emergency_contact === 'string' ? 
        JSON.parse(row.emergency_contact) : row.emergency_contact,
      insuranceInfo: row.insurance_info ? 
        (typeof row.insurance_info === 'string' ? JSON.parse(row.insurance_info) : row.insurance_info) : 
        undefined,
      createdByUserId: row.created_by_user_id,
      hospitalId: row.hospital_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  };

  // Helper method to format date for storage to avoid timezone issues
  private formatDateForStorage = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    try {
      // If it's already a string in YYYY-MM-DD format, return as-is
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // If it's a Date object, format to YYYY-MM-DD
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Try to parse and format other date formats
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      return null;
    } catch (error) {
      logger.error('Error formatting date for storage:', error);
      return null;
    }
  };

  // Helper method to format date as string only to avoid timezone issues
  private formatDateOnlyAsString = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    
    try {
      // If it's already a string in YYYY-MM-DD format, return as-is
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // If it's a Date object, format to YYYY-MM-DD string
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Try to parse and format other date formats
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      return undefined;
    } catch (error) {
      logger.error('Error formatting date as string:', error);
      return undefined;
    }
  };

  // Helper method to format date fields to avoid timezone issues
  private formatDateOnly = (dateValue: any): Date | undefined => {
    if (!dateValue) return undefined;
    
    try {
      // If it's already a string in YYYY-MM-DD format, create a date in local time
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-based in JS Date
      }
      
      // If it's a Date object, recreate it in local time to avoid timezone conversion
      if (dateValue instanceof Date) {
        // Extract the date components in local time
        const year = dateValue.getFullYear();
        const month = dateValue.getMonth();
        const day = dateValue.getDate();
        return new Date(year, month, day); // Create new date in local time
      }
      
      // Try to parse other formats
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth();
        const day = parsedDate.getDate();
        return new Date(year, month, day); // Create date in local time
      }
      
      return undefined;
    } catch (error) {
      logger.error('Error formatting date:', error);
      return undefined;
    }
  };
}
