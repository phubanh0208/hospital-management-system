import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  id: string;
  recipient_user_id: string;
  recipient_type: 'user' | 'patient' | 'doctor' | 'staff';
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'system' | 'emergency' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channels: ('web' | 'email' | 'sms' | 'push')[];
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  related_entity_type?: 'appointment' | 'prescription' | 'patient' | 'user';
  related_entity_id?: string;
  created_at: Date;
  sent_at?: Date;
  read_at?: Date;
  expires_at?: Date;
}

const NotificationSchema: Schema = new Schema({
  recipient_user_id: {
    type: String,
    required: true,
    index: true
  },
  recipient_type: {
    type: String,
    enum: ['user', 'patient', 'doctor', 'staff'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['appointment', 'prescription', 'system', 'emergency', 'reminder'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  channels: [{
    type: String,
    enum: ['web', 'email', 'sms', 'push']
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    required: true,
    index: true
  },
  related_entity_type: {
    type: String,
    enum: ['appointment', 'prescription', 'patient', 'user']
  },
  related_entity_id: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  sent_at: {
    type: Date
  },
  read_at: {
    type: Date
  },
  expires_at: {
    type: Date,
    index: true
  }
}, {
  collection: 'notifications',
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance (matching database init)
NotificationSchema.index({ recipient_user_id: 1, created_at: -1 });
NotificationSchema.index({ status: 1, created_at: -1 });
NotificationSchema.index({ type: 1, created_at: -1 });
NotificationSchema.index({ priority: 1, status: 1 });
NotificationSchema.index({ related_entity_type: 1, related_entity_id: 1 });
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.model<INotification>('Notification', NotificationSchema);
