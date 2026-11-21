import { Lead } from '../models/Lead.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { nextSequence } from '../models/Counter.js';
import { priorityForValue, tierForValue, type CleanLeadInput, type Status } from './validate.js';

interface CreateOptions {
  input: CleanLeadInput;
  dealValue: number;
  priority?: 'high' | 'standard' | 'low';
  status?: Status;
  assignedTo?: string | null; // user id; when omitted the lead is round-robin assigned
  ip?: string;
  referrer?: string;
  createdBy: string; // shown in the activity timeline ("System Webhook" or a user's name)
}

/** Round-robin assignment across all users. */
async function pickRoundRobinUser(): Promise<any | null> {
  const users: any[] = await User.find().sort({ _id: 1 });
  if (users.length === 0) return null;
  const n = await nextSequence('assignment');
  return users[(n - 1) % users.length];
}

export async function createLeadRecord(opts: CreateOptions) {
  const { input, createdBy } = opts;
  const status: Status = opts.status || 'new';
  const seq = await nextSequence('formId');
  const now = new Date();

  let assignee: any = null;
  if (opts.assignedTo) assignee = await User.findById(opts.assignedTo);
  if (!assignee) assignee = await pickRoundRobinUser();

  const lead: any = await Lead.create({
    formId: `#LF-${String(seq).padStart(4, '0')}`,
    ...input,
    status,
    dealValue: opts.dealValue,
    priority: opts.priority || priorityForValue(opts.dealValue),
    tier: tierForValue(opts.dealValue),
    assignedTo: assignee ? assignee._id : null,
    ip: opts.ip || '',
    referrer: opts.referrer || '',
    receivedAt: now,
    firstContactedAt: status === 'new' ? null : now,
    convertedAt: status === 'converted' ? now : null,
    activityHistory: [
      {
        type: 'submission',
        title: 'Inquiry received',
        detail: `Captured from "${input.source}".${input.message ? ` Message: ${input.message.slice(0, 200)}` : ''}`,
        author: createdBy
      },
      ...(assignee
        ? [{ type: 'assigned', title: `Assigned to ${assignee.name}`, detail: 'Round-robin lead routing.', author: 'System' }]
        : [])
    ]
  });

  // Every new lead gets an automatic "make first contact" task due in 2 hours.
  if (status === 'new') {
    const dueAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    await Task.create({
      lead: lead._id,
      leadName: lead.name,
      company: lead.company,
      title: `Follow up with ${lead.name}`,
      description: lead.subject ? `Review inquiry: ${lead.subject}` : 'Review the new inquiry and make first contact.',
      dueAt,
      isUrgent: lead.priority === 'high'
    });
    lead.nextFollowUpAt = dueAt;
    await lead.save();
  }

  return Lead.findById(lead._id).populate('assignedTo', 'name email role');
}

/** Keeps lead.nextFollowUpAt equal to the earliest open task's due date. */
export async function recomputeNextFollowUp(leadId: unknown) {
  const next: any = await Task.findOne({ lead: leadId, completed: false }).sort({ dueAt: 1 });
  await Lead.updateOne({ _id: leadId }, { $set: { nextFollowUpAt: next ? next.dueAt : null } });
}
