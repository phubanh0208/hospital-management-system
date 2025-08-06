import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationTemplate extends Document {
  id: string;
  template_name: string;
  template_type: 'email' | 'sms' | 'push' | 'web';
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const NotificationTemplateSchema: Schema = new Schema({
  template_name: {
    type: String,
    required: true
  },
  template_type: {
    type: String,
    enum: ['email', 'sms', 'push', 'web'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 255
  },
  body: {
    type: String,
    required: true
  },
  variables: [{
    type: String
  }],
  is_active: {
    type: Boolean,
    default: true
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
  collection: 'notification_templates',
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
NotificationTemplateSchema.index({ template_name: 1, template_type: 1 }, { unique: true });
NotificationTemplateSchema.index({ is_active: 1 });

// Update the updated_at field before saving
NotificationTemplateSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<INotificationTemplate>('NotificationTemplate', NotificationTemplateSchema);
