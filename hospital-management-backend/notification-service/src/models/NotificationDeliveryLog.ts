import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationDeliveryLog extends Document {
  id: string;
  notification_id: mongoose.Types.ObjectId;
  channel: 'web' | 'email' | 'sms' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  provider?: string;
  provider_response?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  sent_at?: Date;
  delivered_at?: Date;
  created_at: Date;
}

const NotificationDeliveryLogSchema: Schema = new Schema({
  notification_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Notification'
  },
  channel: {
    type: String,
    enum: ['web', 'email', 'sms', 'push'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    required: true,
    default: 'pending'
  },
  provider: {
    type: String
  },
  provider_response: {
    type: Schema.Types.Mixed
  },
  error_message: {
    type: String
  },
  retry_count: {
    type: Number,
    default: 0,
    min: 0
  },
  sent_at: {
    type: Date
  },
  delivered_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'notification_delivery_log',
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
NotificationDeliveryLogSchema.index({ notification_id: 1 });
NotificationDeliveryLogSchema.index({ channel: 1, status: 1 });
NotificationDeliveryLogSchema.index({ created_at: -1 });

export default mongoose.model<INotificationDeliveryLog>('NotificationDeliveryLog', NotificationDeliveryLogSchema);
