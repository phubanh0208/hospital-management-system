import { 
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';

export interface PrescriptionResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface PrescriptionQueryOptions {
  page: number;
  limit: number;
  search?: string;
  doctorId?: string;
  patientId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreatePrescriptionData {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientAllergies?: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  diagnosis: string;
  instructions: string;
  notes?: string;
  validUntil: string;
  items: PrescriptionItemData[];
}

export interface PrescriptionItemData {
  medicationName: string;
  medicationCode?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  instructions?: string;
  warnings?: string;
}

export interface UpdatePrescriptionData {
  diagnosis?: string;
  instructions?: string;
  notes?: string;
  status?: string;
  validUntil?: string;
  dispensedByUserId?: string;
  dispensedByName?: string;
}

export class PrescriptionService {
  private pool: any;

  constructor() {
    this.pool = getPool('prescription');
  }

  // GET - Get all prescriptions with filtering and pagination
  async getAllPrescriptions(options: PrescriptionQueryOptions): Promise<PrescriptionResult> {
    try {
      const {
        page,
        limit,
        search,
        doctorId,
        patientId,
        status,
        dateFrom,
        dateTo,
        sortBy = 'issued_date',
        sortOrder = 'desc'
      } = options;

      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic WHERE clause
      if (search) {
        whereClause += ` AND (
          patient_name ILIKE $${paramIndex} OR 
          doctor_name ILIKE $${paramIndex} OR 
          prescription_number ILIKE $${paramIndex} OR
          diagnosis ILIKE $${paramIndex}
        )`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      if (doctorId) {
        whereClause += ` AND doctor_id = $${paramIndex}`;
        values.push(doctorId);
        paramIndex++;
      }

      if (patientId) {
        whereClause += ` AND patient_id = $${paramIndex}`;
        values.push(patientId);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      if (dateFrom) {
        whereClause += ` AND issued_date >= $${paramIndex}`;
        values.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereClause += ` AND issued_date <= $${paramIndex}`;
        values.push(dateTo + ' 23:59:59');
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM prescriptions ${whereClause}`;
      const countResult = await executeQuery(this.pool, countQuery, values);
      const total = parseInt(countResult[0].count);

      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // Get prescriptions with pagination
      const query = `
        SELECT 
          id, prescription_number, patient_id, patient_name, patient_age, patient_allergies,
          doctor_id, doctor_name, appointment_id, diagnosis, instructions, notes,
          status, issued_date, valid_until, dispensed_by_user_id, dispensed_by_name,
          dispensed_date, created_at, updated_at
        FROM prescriptions 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const prescriptions = await executeQuery(this.pool, query, values);

      return {
        success: true,
        data: {
          prescriptions,
          pagination: {
            total,
            page,
            limit,
            pages: totalPages
          }
        }
      };
    } catch (error) {
      logger.error('Get all prescriptions error:', error);
      return {
        success: false,
        message: 'Failed to get prescriptions'
      };
    }
  }

  // GET - Get prescription by ID with items
  async getPrescriptionById(id: string): Promise<PrescriptionResult> {
    try {
      // Get prescription
      const prescriptionQuery = `
        SELECT 
          id, prescription_number, patient_id, patient_name, patient_age, patient_allergies,
          doctor_id, doctor_name, appointment_id, diagnosis, instructions, notes,
          status, issued_date, valid_until, dispensed_by_user_id, dispensed_by_name,
          dispensed_date, created_at, updated_at
        FROM prescriptions 
        WHERE id = $1
      `;
      
      const prescriptionResult = await executeQuery(this.pool, prescriptionQuery, [id]);
      
      if (prescriptionResult.length === 0) {
        return {
          success: false,
          message: 'Prescription not found'
        };
      }

      const prescription = prescriptionResult[0];

      // Get prescription items
      const itemsQuery = `
        SELECT 
          id, medication_name, medication_code, dosage, frequency, duration,
          quantity, unit, unit_price, total_price, instructions, warnings, created_at
        FROM prescription_items 
        WHERE prescription_id = $1
        ORDER BY created_at
      `;
      
      const items = await executeQuery(this.pool, itemsQuery, [id]);
      prescription.items = items;

      return {
        success: true,
        data: prescription
      };
    } catch (error) {
      logger.error('Get prescription by ID error:', error);
      return {
        success: false,
        message: 'Failed to get prescription'
      };
    }
  }

  // GET - Get prescription by number
  async getPrescriptionByNumber(prescriptionNumber: string): Promise<PrescriptionResult> {
    try {
      const prescriptionQuery = `
        SELECT 
          id, prescription_number, patient_id, patient_name, patient_age, patient_allergies,
          doctor_id, doctor_name, appointment_id, diagnosis, instructions, notes,
          status, issued_date, valid_until, dispensed_by_user_id, dispensed_by_name,
          dispensed_date, created_at, updated_at
        FROM prescriptions 
        WHERE prescription_number = $1
      `;
      
      const prescriptionResult = await executeQuery(this.pool, prescriptionQuery, [prescriptionNumber]);
      
      if (prescriptionResult.length === 0) {
        return {
          success: false,
          message: 'Prescription not found'
        };
      }

      const prescription = prescriptionResult[0];

      // Get prescription items
      const itemsQuery = `
        SELECT 
          id, medication_name, medication_code, dosage, frequency, duration,
          quantity, unit, unit_price, total_price, instructions, warnings, created_at
        FROM prescription_items 
        WHERE prescription_id = $1
        ORDER BY created_at
      `;
      
      const items = await executeQuery(this.pool, itemsQuery, [prescription.id]);
      prescription.items = items;

      return {
        success: true,
        data: prescription
      };
    } catch (error) {
      logger.error('Get prescription by number error:', error);
      return {
        success: false,
        message: 'Failed to get prescription'
      };
    }
  }

  // POST - Create new prescription
  async createPrescription(prescriptionData: CreatePrescriptionData): Promise<PrescriptionResult> {
    try {
      const {
        patientId,
        patientName,
        patientAge,
        patientAllergies,
        doctorId,
        doctorName,
        appointmentId,
        diagnosis,
        instructions,
        notes,
        validUntil,
        items
      } = prescriptionData;

      const id = uuidv4();

      // Insert prescription (prescription_number will be auto-generated)
      const prescriptionQuery = `
        INSERT INTO prescriptions (
          id, patient_id, patient_name, patient_age, patient_allergies,
          doctor_id, doctor_name, appointment_id, diagnosis, instructions,
          notes, valid_until
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING 
          id, prescription_number, patient_id, patient_name, patient_age, patient_allergies,
          doctor_id, doctor_name, appointment_id, diagnosis, instructions, notes,
          status, issued_date, valid_until, created_at, updated_at
      `;

      const prescriptionValues = [
        id, patientId, patientName, patientAge, patientAllergies,
        doctorId, doctorName, appointmentId, diagnosis, instructions,
        notes, validUntil
      ];

      const prescriptionResult = await executeQuery(this.pool, prescriptionQuery, prescriptionValues);
      const prescription = prescriptionResult[0];

      // Insert prescription items
      const insertedItems = [];
      for (const item of items) {
        const itemId = uuidv4();
        const itemQuery = `
          INSERT INTO prescription_items (
            id, prescription_id, medication_name, medication_code, dosage,
            frequency, duration, quantity, unit, unit_price, instructions, warnings
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          ) RETURNING 
            id, medication_name, medication_code, dosage, frequency, duration,
            quantity, unit, unit_price, total_price, instructions, warnings, created_at
        `;

        const itemValues = [
          itemId, id, item.medicationName, item.medicationCode, item.dosage,
          item.frequency, item.duration, item.quantity, item.unit || 'viên',
          item.unitPrice || 0, item.instructions, item.warnings
        ];

        const itemResult = await executeQuery(this.pool, itemQuery, itemValues);
        insertedItems.push(itemResult[0]);
      }

      prescription.items = insertedItems;

      return {
        success: true,
        data: prescription
      };
    } catch (error) {
      logger.error('Create prescription error:', error);
      return {
        success: false,
        message: 'Failed to create prescription'
      };
    }
  }

  // PUT - Update prescription
  async updatePrescription(id: string, updateData: UpdatePrescriptionData): Promise<PrescriptionResult> {
    try {
      const {
        diagnosis,
        instructions,
        notes,
        status,
        validUntil,
        dispensedByUserId,
        dispensedByName
      } = updateData;

      // Build dynamic SET clause
      const setFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (diagnosis) {
        setFields.push(`diagnosis = $${paramIndex}`);
        values.push(diagnosis);
        paramIndex++;
      }

      if (instructions) {
        setFields.push(`instructions = $${paramIndex}`);
        values.push(instructions);
        paramIndex++;
      }

      if (notes) {
        setFields.push(`notes = $${paramIndex}`);
        values.push(notes);
        paramIndex++;
      }

      if (status) {
        setFields.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;

        // If status is dispensed, set dispensed info
        if (status === 'dispensed' && dispensedByUserId) {
          setFields.push(`dispensed_by_user_id = $${paramIndex}`);
          values.push(dispensedByUserId);
          paramIndex++;

          if (dispensedByName) {
            setFields.push(`dispensed_by_name = $${paramIndex}`);
            values.push(dispensedByName);
            paramIndex++;
          }

          setFields.push(`dispensed_date = NOW()`);
        }
      }

      if (validUntil) {
        setFields.push(`valid_until = $${paramIndex}`);
        values.push(validUntil);
        paramIndex++;
      }

      if (setFields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }

      setFields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE prescriptions 
        SET ${setFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id, prescription_number, patient_name, doctor_name, diagnosis,
          instructions, notes, status, issued_date, valid_until,
          dispensed_by_name, dispensed_date, updated_at
      `;

      const result = await executeQuery(this.pool, query, values);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Prescription not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Update prescription error:', error);
      return {
        success: false,
        message: 'Failed to update prescription'
      };
    }
  }

  // DELETE - Delete prescription
  async deletePrescription(id: string): Promise<PrescriptionResult> {
    try {
      const query = `
        DELETE FROM prescriptions 
        WHERE id = $1
        RETURNING 
          id, prescription_number, patient_name, doctor_name, status
      `;

      const result = await executeQuery(this.pool, query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Prescription not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Delete prescription error:', error);
      return {
        success: false,
        message: 'Failed to delete prescription'
      };
    }
  }
}
