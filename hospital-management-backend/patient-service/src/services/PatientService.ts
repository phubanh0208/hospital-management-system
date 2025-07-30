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
import { VisitSummaryService } from './VisitSummaryService';

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

// Refactored: Mon, Sep  8, 2025 12:58:40 AM - Removed deprecated methods
// Updated patient service with improved validation
