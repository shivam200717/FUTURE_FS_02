import { Router } from 'express';
import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { createLeadRecord, recomputeNextFollowUp } from '../lib/leadFactory.js';
import { serializeLead, serializeRep, serializeTask } from '../lib/serialize.js';
import {
  STATUSES,
  PRIORITIES,
  NOTE_TYPES,
  cleanString,
  isOneOf,
  isValidEmail,
  parseBudget,
  parseDate,
  priorityForValue,
  tierForValue,
  validateLeadInput
} from '../lib/validate.js';

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

const populate = { path: 'assignedTo', select: 'name email role' };
const me = (req: any) => (req as AuthedRequest).user;
const validId = (id: string) => mongoose.isValidObjectId(id);

// Team members (used for the "assign to" dropdown)
export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json({ users: users.map(serializeRep) });
  } catch (e) {
    next(e);
  }
});

leadsRouter.get('/', async (_req, res, next) => {
  try {
    const leads = await Lead.find().sort({ receivedAt: -1 }).limit(5000).populate(populate);
    res.json({ leads: leads.map(serializeLead) });
  } catch (e) {
    next(e);
  }
});

leadsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = validateLeadInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const b = req.body;
    const dealValue = Number.isFinite(Number(b.dealValue)) && Number(b.dealValue) >= 0
      ? Number(b.dealValue)
      : parseBudget(parsed.data.declaredBudget, 0);
    const status = isOneOf(STATUSES, b.status) ? b.status : 'new';
    const priority = isOneOf(PRIORITIES, b.priority) ? b.priority : priorityForValue(dealValue);
    const assignedTo = typeof b.assignedTo === 'string' && validId(b.assignedTo) ? b.assignedTo : me(req).id;

    const lead = await createLeadRecord({
      input: { ...parsed.data, sourcePage: parsed.data.sourcePage || '/manual-entry' },
      dealValue,
      status,
      priority,
      assignedTo,
      createdBy: me(req).name
    });
    res.status(201).json({ lead: serializeLead(lead) });
  } catch (e) {
    next(e);
  }
});

leadsRouter.get('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const lead = await Lead.findById(req.params.id).populate(populate);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead: serializeLead(lead) });
  } catch (e) {
    next(e);
  }
});

// Status change: new -> contacted -> proposal -> converted (or lost)
leadsRouter.patch('/:id/status', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const { status } = req.body || {};
    if (!isOneOf(STATUSES, status)) return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });

    const lead: any = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const from = lead.status;
    if (from !== status) {
      const now = new Date();
      lead.status = status;
      if (from === 'new' && !lead.firstContactedAt) lead.firstContactedAt = now;
      lead.convertedAt = status === 'converted' ? now : null;
      lead.activityHistory.push({
        type: 'stage_change',
        title: `${me(req).name} updated stage`,
        detail: `Stage changed from ${from.toUpperCase()} to ${status.toUpperCase()}`,
        author: me(req).name,
        fromStage: from,
        toStage: status
      });
      await lead.save();
    }
    await lead.populate(populate);
    res.json({ lead: serializeLead(lead) });
  } catch (e) {
    next(e);
  }
});

// Follow-up notes / call logs
leadsRouter.post('/:id/notes', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const type = isOneOf(NOTE_TYPES, req.body?.type) ? req.body.type : 'note';
    const content = cleanString(req.body?.content, 5000);
    if (!content) return res.status(400).json({ error: 'Note content is required' });
    const duration = cleanString(req.body?.metadata?.duration ?? req.body?.duration, 30);

    const lead: any = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const author = me(req).name;
    const badge = type === 'call' ? 'Call Logged' : type === 'meeting' ? 'Meeting Completed' : undefined;
    lead.notes.push({ type, author, content, metadata: { duration: type === 'call' ? duration : undefined, badge } });

    const labels: Record<string, string> = {
      call: 'logged a phone call',
      email: 'sent an email',
      meeting: 'completed a meeting',
      note: 'added an internal note'
    };
    lead.activityHistory.push({
      type: 'note_logged',
      title: `${author} ${labels[type]}`,
      detail: content,
      author,
      duration: type === 'call' && duration ? duration : undefined
    });
    // Talking to the lead (anything except an internal note) counts as first contact for response-time metrics.
    if (type !== 'note' && !lead.firstContactedAt) lead.firstContactedAt = new Date();

    await lead.save();
    await lead.populate(populate);
    res.status(201).json({ lead: serializeLead(lead) });
  } catch (e) {
    next(e);
  }
});

// Edit selected fields only (whitelist - never spread the request body into the document)
leadsRouter.patch('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const b = req.body || {};
    const set: Record<string, unknown> = {};

    if (b.name !== undefined) {
      const v = cleanString(b.name, 100);
      if (!v) return res.status(400).json({ error: 'Name cannot be empty' });
      set.name = v;
    }
    if (b.email !== undefined) {
      const v = cleanString(b.email, 254).toLowerCase();
      if (!isValidEmail(v)) return res.status(400).json({ error: 'A valid email address is required' });
      set.email = v;
    }
    for (const [key, max] of [['phone', 40], ['company', 120], ['declaredBudget', 80], ['targetTimeline', 80]] as const) {
      if (b[key] !== undefined) set[key] = cleanString(b[key], max);
    }
    if (b.dealValue !== undefined) {
      const n = Number(b.dealValue);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'Deal value must be a positive number' });
      set.dealValue = n;
      set.tier = tierForValue(n);
    }
    if (b.priority !== undefined) {
      if (!isOneOf(PRIORITIES, b.priority)) return res.status(400).json({ error: 'Invalid priority' });
      set.priority = b.priority;
    }
    if (b.assignedTo !== undefined) {
      if (b.assignedTo !== null && (typeof b.assignedTo !== 'string' || !validId(b.assignedTo))) {
        return res.status(400).json({ error: 'Invalid assignee' });
      }
      set.assignedTo = b.assignedTo;
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true }).populate(populate);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead: serializeLead(lead) });
  } catch (e) {
    next(e);
  }
});

leadsRouter.delete('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await Task.deleteMany({ lead: lead._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// ---- Follow-up tasks -------------------------------------------------------------------------
export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get('/', async (_req, res, next) => {
  try {
    const tasks = await Task.find().sort({ completed: 1, dueAt: 1 }).limit(1000);
    res.json({ tasks: tasks.map(serializeTask) });
  } catch (e) {
    next(e);
  }
});

tasksRouter.post('/', async (req, res, next) => {
  try {
    const { leadId } = req.body || {};
    if (typeof leadId !== 'string' || !validId(leadId)) return res.status(400).json({ error: 'A valid leadId is required' });
    const dueAt = parseDate(req.body?.dueAt);
    if (!dueAt) return res.status(400).json({ error: 'A valid due date is required' });
    const title = cleanString(req.body?.title, 200);
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const lead: any = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const task = await Task.create({
      lead: lead._id,
      leadName: lead.name,
      company: lead.company,
      title,
      description: cleanString(req.body?.description, 1000),
      dueAt,
      isUrgent: !!req.body?.isUrgent
    });
    lead.activityHistory.push({
      type: 'reminder',
      title: `${me(req).name} scheduled a follow-up`,
      detail: `${title} - due ${dueAt.toISOString()}`,
      author: me(req).name
    });
    await lead.save();
    await recomputeNextFollowUp(lead._id);
    res.status(201).json({ task: serializeTask(task) });
  } catch (e) {
    next(e);
  }
});

tasksRouter.patch('/:id/toggle', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Task not found' });
    const task: any = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;
    await task.save();
    await recomputeNextFollowUp(task.lead);
    res.json({ task: serializeTask(task) });
  } catch (e) {
    next(e);
  }
});
