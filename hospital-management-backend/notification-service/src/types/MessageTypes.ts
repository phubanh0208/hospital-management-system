// Message types for RabbitMQ integration
export interface BaseMessage {
  id: string;
  type: string;
  timestamp: Date;
  source_service?: string;
}

export interface CreateNotificationMessage extends BaseMessage {
  type: 'create_notification';
  data: {
    recipient_user_id: string;
    recipient_type: 'user' | 'patient' | 'doctor' | 'staff';
    title: string;
    message: string;
    notification_type: 'appointment' | 'prescription' | 'system' | 'emergency' | 'reminder';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: ('web' | 'email' | 'sms' | 'push')[];
    related_entity_type?: 'appointment' | 'prescription' | 'patient' | 'user';
    related_entity_id?: string;
    expires_at?: Date;
    template_name?: string;
    template_variables?: Record<string, any>;
  };
}

export interface SendNotificationMessage extends BaseMessage {
  type: 'send_notification';
  data: {
    notification_id: string;
    template_name?: string;
    template_variables?: Record<string, any>;
  };
}

export interface AppointmentReminderMessage extends BaseMessage {
  type: 'appointment_reminder';
  data: {
    recipient_user_id: string;
    patient_name: string;
    doctor_name: string;
    appointment_date: string;
    appointment_time: string;
    appointment_number?: string;
    room_number?: string;
    reason?: string;
  };
}

export interface AppointmentConfirmedMessage extends BaseMessage {
  type: 'appointment_confirmed';
  data: {
    recipient_user_id: string;
    patient_name: string;
    doctor_name: string;
    appointment_date: string;
    appointment_time: string;
    appointment_number?: string;
    room_number?: string;
    reason?: string;
  };
}


export interface PrescriptionReadyMessage extends BaseMessage {
  type: 'prescription_ready';
  data: {
    recipient_user_id: string;
    patient_name: string;
    doctor_name?: string;
    prescription_number: string;
    issued_date?: string;
    total_cost?: string;
  };
}

export interface SystemAlertMessage extends BaseMessage {
  type: 'system_alert';
  data: {
    recipient_user_id?: string; // If null, broadcast to all
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    alert_type: 'maintenance' | 'emergency' | 'update' | 'security';
  };
}

export interface BulkNotificationMessage extends BaseMessage {
  type: 'bulk_notification';
  data: {
    recipient_user_ids: string[];
    title: string;
    message: string;
    notification_type: 'appointment' | 'prescription' | 'system' | 'emergency' | 'reminder';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: ('web' | 'email' | 'sms' | 'push')[];
    template_name?: string;
    template_variables?: Record<string, any>;
  };
}

// Union type for all message types
export type RabbitMQMessage =
  | CreateNotificationMessage
  | SendNotificationMessage
  | AppointmentReminderMessage
  | PrescriptionReadyMessage
  | SystemAlertMessage
  | BulkNotificationMessage
  | AppointmentConfirmedMessage;


// Message routing keys
export const MessageRoutingKeys = {
  CREATE_NOTIFICATION: 'notification.create',
  SEND_NOTIFICATION: 'notification.send',
  APPOINTMENT_REMINDER: 'appointment.reminder',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  PRESCRIPTION_READY: 'prescription.ready',
  PRESCRIPTION_DELAYED: 'prescription.delayed',
  SYSTEM_ALERT: 'notification.system.alert',
  BULK_NOTIFICATION: 'notification.bulk',
  EMERGENCY_ALERT: 'notification.emergency'
} as const;

// Message priorities for queue processing
export enum MessagePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  URGENT = 10
}
