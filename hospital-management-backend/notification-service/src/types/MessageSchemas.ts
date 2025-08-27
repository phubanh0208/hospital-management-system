import { z } from 'zod';

// Base schema for all RabbitMQ messages
const BaseMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.string().datetime(),
  source: z.string().optional(),
});

// Schema for 'create_notification' data
const CreateNotificationDataSchema = z.object({
  recipient_user_id: z.string().uuid(),
  recipient_type: z.enum(['patient', 'doctor', 'admin', 'staff', 'user']),
  title: z.string(),
  message: z.string(),
  notification_type: z.string(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  channels: z.array(z.enum(['web', 'email', 'sms'])),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  template_name: z.string().optional(),
    template_variables: z.record(z.string(), z.any()).optional(),
});

// Schema for 'appointment_reminder' data
const AppointmentReminderDataSchema = z.object({
  recipient_user_id: z.string().uuid(),
  patient_name: z.string(),
  doctor_name: z.string(),
  appointment_date: z.string(),
  appointment_time: z.string(),
  appointment_number: z.string().optional(),
  room_number: z.string().optional(),
  reason: z.string().optional(),
});

// Schema for 'prescription_ready' data
const PrescriptionReadyDataSchema = z.object({
  recipient_user_id: z.string().uuid(),
  patient_name: z.string(),
  prescription_number: z.string(),
  doctor_name: z.string().optional(),
  issued_date: z.string().optional(),
  total_cost: z.string().optional(),
});

// Schema for 'appointment_confirmed' data
const AppointmentConfirmedDataSchema = z.object({
  recipient_user_id: z.string().uuid(),
  patient_name: z.string(),
  doctor_name: z.string(),
  appointment_date: z.string(),
  appointment_time: z.string(),
  appointment_number: z.string().optional(),
  room_number: z.string().optional(),
  reason: z.string().optional(),
});

// Discriminated union to validate the entire message based on its type
export const RabbitMQMessageSchema = z.discriminatedUnion('type', [
  BaseMessageSchema.extend({ type: z.literal('create_notification'), data: CreateNotificationDataSchema }),
  BaseMessageSchema.extend({ type: z.literal('appointment_reminder'), data: AppointmentReminderDataSchema }),
  BaseMessageSchema.extend({ type: z.literal('prescription_ready'), data: PrescriptionReadyDataSchema }),
  BaseMessageSchema.extend({ type: z.literal('appointment_confirmed'), data: AppointmentConfirmedDataSchema }),
  // Add other message types here as needed
]);

