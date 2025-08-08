import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationPreferences extends Document {
  id: string;
  user_id: string;
  preferences: {
    appointment_reminders?: {
      email: boolean;
      sms: boolean;
      push: boolean;
      advance_hours: number;
    };
    prescription_ready?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    system_notifications?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    emergency_alerts?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  created_at: Date;
  updated_at: Date;
}

const NotificationPreferencesSchema: Schema = new Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  preferences: {
    type: Schema.Types.Mixed,
    required: true,
    default: {
      appointment_reminders: {
        email: true,
        sms: true,
        push: true,
        advance_hours: 24
      },
      prescription_ready: {
        email: true,
        sms: true,
        push: true
      },
      system_notifications: {
        email: false,
        sms: false,
        push: true
      },
      emergency_alerts: {
        email: true,
        sms: true,
        push: true
      }
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'notification_preferences',
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
NotificationPreferencesSchema.index({ user_id: 1 }, { unique: true });

// Update the updated_at field before saving
NotificationPreferencesSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<INotificationPreferences>('NotificationPreferences', NotificationPreferencesSchema);
