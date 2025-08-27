import { Schema, model, Document } from 'mongoose';

export interface INotificationDeliveryRetry extends Document {
  notification_id: string;
  channel: 'email' | 'sms' | 'web';
  provider: string;
  recipient: string;
  error_message: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: Date;
  last_attempted_at: Date;
  status: 'pending' | 'retrying' | 'failed' | 'succeeded';
}

const NotificationDeliveryRetrySchema = new Schema<INotificationDeliveryRetry>(
  {
    notification_id: { type: String, required: true, index: true },
    channel: { type: String, required: true, enum: ['email', 'sms', 'web'] },
    provider: { type: String, required: true },
    recipient: { type: String, required: true },
    error_message: { type: String },
    retry_count: { type: Number, default: 0 },
    max_retries: { type: Number, required: true },
    next_retry_at: { type: Date, index: true },
    last_attempted_at: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'retrying', 'failed', 'succeeded'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const NotificationDeliveryRetry = model<INotificationDeliveryRetry>(
  'NotificationDeliveryRetry',
  NotificationDeliveryRetrySchema,
  'notification_delivery_retries'
);

