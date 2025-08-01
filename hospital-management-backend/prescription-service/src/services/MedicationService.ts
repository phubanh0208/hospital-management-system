import { 
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';

export interface MedicationResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface MedicationQueryOptions {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateMedicationData {
  medicationCode: string;
  medicationName: string;
  genericName?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  unit?: string;
  unitPrice?: number;
  currency?: string;
  contraindications?: string[];
  sideEffects?: string[];
  storageRequirements?: string;
}

export interface UpdateMedicationData {
  medicationName?: string;
  genericName?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  unit?: string;
  unitPrice?: number;
  currency?: string;
  contraindications?: string[];
  sideEffects?: string[];
  storageRequirements?: string;
  isActive?: boolean;
}

export class MedicationService {
  private pool: any;

  constructor() {
    this.pool = getPool('prescription');
  }

  // GET - Get all medications with filtering and pagination
  async getAllMedications(options: MedicationQueryOptions): Promise<MedicationResult> {
    try {
      const {
        page,
        limit,
        search,
        isActive,
        sortBy = 'medication_name',
        sortOrder = 'asc'
      } = options;

      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (
          medication_name ILIKE $${paramIndex} OR 
          medication_code ILIKE $${paramIndex} OR 
          generic_name ILIKE $${paramIndex}
        )`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      if (isActive !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`;
        values.push(isActive);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM medications ${whereClause}`;
      const countResult = await executeQuery(this.pool, countQuery, values);
      const total = parseInt(countResult[0].count);

      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // Get medications with pagination
      const query = `
        SELECT
          id, medication_code, medication_name, generic_name, manufacturer,
          dosage_form, strength, unit, contraindications, side_effects,
          storage_requirements, unit_price, currency, is_active, created_at, updated_at
        FROM medications
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const medications = await executeQuery(this.pool, query, values);

      return {
        success: true,
        data: {
          medications,
          pagination: {
            total,
            page,
            limit,
            pages: totalPages
          }
        }
      };
    } catch (error) {
      logger.error('Get all medications error:', error);
      return {
        success: false,
        message: 'Failed to get medications'
      };
    }
  }

  // GET - Get medication by ID
  async getMedicationById(id: string): Promise<MedicationResult> {
    try {
      const query = `
        SELECT
          id, medication_code, medication_name, generic_name, manufacturer,
          dosage_form, strength, unit, contraindications, side_effects,
          storage_requirements, unit_price, currency, is_active, created_at, updated_at
        FROM medications
        WHERE id = $1
      `;
      
      const result = await executeQuery(this.pool, query, [id]);
      
      if (result.length === 0) {
        return {
          success: false,
          message: 'Medication not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Get medication by ID error:', error);
      return {
        success: false,
        message: 'Failed to get medication'
      };
    }
  }

  // GET - Get medication by code
  async getMedicationByCode(medicationCode: string): Promise<MedicationResult> {
    try {
      const query = `
        SELECT
          id, medication_code, medication_name, generic_name, manufacturer,
          dosage_form, strength, unit, contraindications, side_effects,
          storage_requirements, unit_price, currency, is_active, created_at, updated_at
        FROM medications
        WHERE medication_code = $1
      `;
      
      const result = await executeQuery(this.pool, query, [medicationCode]);
      
      if (result.length === 0) {
        return {
          success: false,
          message: 'Medication not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Get medication by code error:', error);
      return {
        success: false,
        message: 'Failed to get medication'
      };
    }
  }

  // POST - Create new medication
  async createMedication(medicationData: CreateMedicationData): Promise<MedicationResult> {
    try {
      const {
        medicationCode,
        medicationName,
        genericName,
        manufacturer,
        dosageForm,
        strength,
        unit,
        unitPrice,
        currency,
        contraindications,
        sideEffects,
        storageRequirements
      } = medicationData;

      const id = uuidv4();

      const query = `
        INSERT INTO medications (
          id, medication_code, medication_name, generic_name, manufacturer,
          dosage_form, strength, unit, unit_price, currency, contraindications, side_effects,
          storage_requirements
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING
          id, medication_code, medication_name, generic_name, manufacturer,
          dosage_form, strength, unit, unit_price, currency, contraindications, side_effects,
          storage_requirements, is_active, created_at, updated_at
      `;

      const values = [
        id, medicationCode, medicationName, genericName, manufacturer,
        dosageForm, strength, unit, unitPrice || 0, currency || 'VND', contraindications, sideEffects,
        storageRequirements
      ];

      const result = await executeQuery(this.pool, query, values);

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      logger.error('Create medication error:', error);
      
      // Handle duplicate medication code
      if (error.code === '23505' && error.constraint === 'medications_medication_code_key') {
        return {
          success: false,
          message: 'Medication code already exists'
        };
      }

      return {
        success: false,
        message: 'Failed to create medication'
      };
    }
  }

  // PUT - Update medication
  async updateMedication(id: string, updateData: UpdateMedicationData): Promise<MedicationResult> {
    try {
      const {
        medicationName,
        genericName,
        manufacturer,
        dosageForm,
        strength,
        unit,
        unitPrice,
        currency,
        contraindications,
        sideEffects,
        storageRequirements,
        isActive
      } = updateData;

      // Build dynamic SET clause
      const setFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (medicationName) {
        setFields.push(`medication_name = $${paramIndex}`);
        values.push(medicationName);
        paramIndex++;
      }

      if (genericName) {
        setFields.push(`generic_name = $${paramIndex}`);
        values.push(genericName);
        paramIndex++;
      }

      if (manufacturer) {
        setFields.push(`manufacturer = $${paramIndex}`);
        values.push(manufacturer);
        paramIndex++;
      }

      if (dosageForm) {
        setFields.push(`dosage_form = $${paramIndex}`);
        values.push(dosageForm);
        paramIndex++;
      }

      if (strength) {
        setFields.push(`strength = $${paramIndex}`);
        values.push(strength);
        paramIndex++;
      }

      if (unit) {
        setFields.push(`unit = $${paramIndex}`);
        values.push(unit);
        paramIndex++;
      }

      if (unitPrice !== undefined) {
        setFields.push(`unit_price = $${paramIndex}`);
        values.push(unitPrice);
        paramIndex++;
      }

      if (currency) {
        setFields.push(`currency = $${paramIndex}`);
        values.push(currency);
        paramIndex++;
      }

      if (contraindications) {
        setFields.push(`contraindications = $${paramIndex}`);
        values.push(contraindications);
        paramIndex++;
      }

      if (sideEffects) {
        setFields.push(`side_effects = $${paramIndex}`);
        values.push(sideEffects);
        paramIndex++;
      }

      if (storageRequirements) {
        setFields.push(`storage_requirements = $${paramIndex}`);
        values.push(storageRequirements);
        paramIndex++;
      }

      if (isActive !== undefined) {
        setFields.push(`is_active = $${paramIndex}`);
        values.push(isActive);
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
        UPDATE medications 
        SET ${setFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id, medication_code, medication_name, generic_name, manufacturer,
          dosage_form, strength, unit, unit_price, currency, contraindications, side_effects,
          storage_requirements, is_active, updated_at
      `;

      const result = await executeQuery(this.pool, query, values);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Medication not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Update medication error:', error);
      return {
        success: false,
        message: 'Failed to update medication'
      };
    }
  }

  // DELETE - Delete medication (soft delete by setting is_active = false)
  async deleteMedication(id: string): Promise<MedicationResult> {
    try {
      const query = `
        UPDATE medications 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING 
          id, medication_code, medication_name, is_active
      `;

      const result = await executeQuery(this.pool, query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Medication not found or already inactive'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Delete medication error:', error);
      return {
        success: false,
        message: 'Failed to delete medication'
      };
    }
  }

  // GET - Search medications by name or code (for autocomplete)
  async searchMedications(searchTerm: string): Promise<MedicationResult> {
    try {
      const query = `
        SELECT
          id, medication_code, medication_name, generic_name, strength, unit, unit_price, currency
        FROM medications
        WHERE is_active = true
        AND (
          medication_name ILIKE $1 OR
          medication_code ILIKE $1 OR
          generic_name ILIKE $1
        )
        ORDER BY medication_name
        LIMIT 20
      `;

      const result = await executeQuery(this.pool, query, [`%${searchTerm}%`]);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Search medications error:', error);
      return {
        success: false,
        message: 'Failed to search medications'
      };
    }
  }
}
