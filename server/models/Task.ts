import mongoose, { Schema } from 'mongoose';

const taskSchema = new Schema(
  {
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    leadName: { type: String, required: true },
    company: { type: String, default: '' },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    dueAt: { type: Date, required: true, index: true },
    isUrgent: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
