import mongoose, { Schema } from 'mongoose';
import { STATUSES, PRIORITIES, NOTE_TYPES } from '../lib/validate.js';

const noteSchema = new Schema(
  {
    type: { type: String, enum: NOTE_TYPES, default: 'note' },
    author: { type: String, required: true },
    content: { type: String, required: true, maxlength: 5000 },
    metadata: {
      duration: String,
      badge: String
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const activitySchema = new Schema(
  {
    type: { type: String, enum: ['submission', 'stage_change', 'note_logged', 'assigned', 'reminder'], required: true },
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    author: { type: String, required: true },
    fromStage: { type: String, enum: STATUSES },
    toStage: { type: String, enum: STATUSES },
    duration: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const leadSchema = new Schema(
  {
    formId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, index: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    source: { type: String, default: 'Website Contact Form', index: true },
    sourcePage: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'standard' },
    tier: { type: String, default: 'Standard' },
    dealValue: { type: Number, default: 0, min: 0 },
    declaredBudget: { type: String, default: '' },
    targetTimeline: { type: String, default: '' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ip: { type: String, default: '' },
    referrer: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now, index: true },
    firstContactedAt: { type: Date, default: null },
    convertedAt: { type: Date, default: null },
    nextFollowUpAt: { type: Date, default: null },
    notes: { type: [noteSchema], default: [] },
    activityHistory: { type: [activitySchema], default: [] }
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', email: 'text', company: 'text', message: 'text' });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
