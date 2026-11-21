import { Lead, LeadStatus, NoteItem, ActivityEvent, CRMStats, ScheduledTask, SalesRep } from '../types/crm';
import { api } from './api';
import { calculateStats } from '../utils/stats';
import { formatDue, timeAgo } from '../utils/time';

/** Small inline SVG avatar with the person's initials (no external image hosting needed). */
export function avatarFor(name: string): string {
  const initials = (name || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="hsl(${hue},55%,42%)"/>` +
    `<text x="32" y="32" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const withAvatar = (rep: any): SalesRep => ({ ...rep, avatarUrl: avatarFor(rep.name) });

const hydrateLead = (raw: any, now: number): Lead => ({
  ...raw,
  assignedRep: raw.assignedRep ? withAvatar(raw.assignedRep) : null,
  relativeTime: timeAgo(raw.receivedAt, now),
  nextFollowUp: raw.nextFollowUpAt ? formatDue(raw.nextFollowUpAt, now) : null,
  notes: (raw.notes || []).map((n: any): NoteItem => ({ ...n, timestamp: timeAgo(n.createdAt, now) })),
  activityHistory: (raw.activityHistory || []).map((a: any): ActivityEvent => ({ ...a, timestamp: timeAgo(a.createdAt, now) }))
});

const hydrateTask = (raw: any, now: number): ScheduledTask => ({
  ...raw,
  dueText: formatDue(raw.dueAt, now),
  isOverdue: !raw.completed && new Date(raw.dueAt).getTime() < now
});

/** Escapes a CSV cell and neutralises spreadsheet formulas (=, +, -, @) from untrusted form input. */
export function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Client-side cache of the server data. The server (MongoDB) is the single source of truth:
 * every change is sent to the API and the cache is updated from the server's response.
 */
class LeadService {
  private rawLeads: any[] = [];
  private rawTasks: any[] = [];
  private rawReps: any[] = [];
  private listeners: Array<() => void> = [];
  private ticker: ReturnType<typeof setInterval> | null = null;

  loaded = false;

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    if (!this.ticker) {
      // Re-render once a minute so "5m ago" / "Overdue" labels stay correct.
      this.ticker = setInterval(() => this.notify(), 60_000);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      if (this.listeners.length === 0 && this.ticker) {
        clearInterval(this.ticker);
        this.ticker = null;
      }
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // ---- reads -----------------------------------------------------------------------------
  getLeads(): Lead[] {
    const now = Date.now();
    return this.rawLeads.map((l) => hydrateLead(l, now));
  }
  getLeadById(id: string): Lead | undefined {
    return this.getLeads().find((l) => l.id === id);
  }
  getTasks(): ScheduledTask[] {
    const now = Date.now();
    return this.rawTasks.map((t) => hydrateTask(t, now));
  }
  getReps(): SalesRep[] {
    return this.rawReps.map(withAvatar);
  }
  calculateStats(): CRMStats {
    return calculateStats(this.getLeads());
  }

  // ---- loading ---------------------------------------------------------------------------
  async load(): Promise<void> {
    const [leads, tasks, users] = await Promise.all([
      api<{ leads: any[] }>('/api/leads'),
      api<{ tasks: any[] }>('/api/tasks'),
      api<{ users: any[] }>('/api/users')
    ]);
    this.rawLeads = leads.leads;
    this.rawTasks = tasks.tasks;
    this.rawReps = users.users;
    this.loaded = true;
    this.notify();
  }

  /** Used by background polling: never throws, so a blip in connectivity does not break the UI. */
  async refresh(): Promise<void> {
    try {
      await this.load();
    } catch {
      /* keep showing the last good data */
    }
  }

  clear() {
    this.rawLeads = [];
    this.rawTasks = [];
    this.rawReps = [];
    this.loaded = false;
    this.notify();
  }

  private replaceLead(raw: any): Lead {
    const i = this.rawLeads.findIndex((l) => l.id === raw.id);
    if (i >= 0) this.rawLeads[i] = raw;
    else this.rawLeads.unshift(raw);
    this.notify();
    return hydrateLead(raw, Date.now());
  }

  // ---- writes ----------------------------------------------------------------------------
  async createLead(data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source?: string;
    subject?: string;
    message?: string;
    status?: LeadStatus;
    dealValue?: number;
    declaredBudget?: string;
    targetTimeline?: string;
    priority?: 'high' | 'standard' | 'low';
    assignedRepId?: string;
  }): Promise<Lead> {
    const { assignedRepId, ...rest } = data;
    const res = await api<{ lead: any }>('/api/leads', { method: 'POST', body: { ...rest, assignedTo: assignedRepId } });
    const lead = this.replaceLead(res.lead);
    // the server also created an automatic follow-up task
    api<{ tasks: any[] }>('/api/tasks').then((t) => { this.rawTasks = t.tasks; this.notify(); }).catch(() => {});
    return lead;
  }

  /** Optimistic: the UI moves immediately and rolls back if the server rejects the change. */
  async updateLeadStatus(id: string, newStatus: LeadStatus): Promise<Lead | null> {
    const idx = this.rawLeads.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    const snapshot = this.rawLeads[idx];
    if (snapshot.status === newStatus) return hydrateLead(snapshot, Date.now());

    this.rawLeads[idx] = { ...snapshot, status: newStatus };
    this.notify();
    try {
      const res = await api<{ lead: any }>(`/api/leads/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
      return this.replaceLead(res.lead);
    } catch (err) {
      const i = this.rawLeads.findIndex((l) => l.id === id);
      if (i >= 0) this.rawLeads[i] = snapshot;
      this.notify();
      throw err;
    }
  }

  async addNote(
    id: string,
    note: { type: 'call' | 'email' | 'meeting' | 'note'; content: string; metadata?: { duration?: string } }
  ): Promise<Lead> {
    const res = await api<{ lead: any }>(`/api/leads/${id}/notes`, {
      method: 'POST',
      body: { type: note.type, content: note.content, duration: note.metadata?.duration }
    });
    return this.replaceLead(res.lead);
  }

  async updateLead(id: string, updates: Partial<Pick<Lead, 'name' | 'email' | 'phone' | 'company' | 'dealValue' | 'priority'>>): Promise<Lead> {
    const res = await api<{ lead: any }>(`/api/leads/${id}`, { method: 'PATCH', body: updates });
    return this.replaceLead(res.lead);
  }

  async deleteLead(id: string): Promise<void> {
    await api(`/api/leads/${id}`, { method: 'DELETE' });
    this.rawLeads = this.rawLeads.filter((l) => l.id !== id);
    this.rawTasks = this.rawTasks.filter((t) => t.leadId !== id);
    this.notify();
  }

  async createScheduledTask(data: { leadId: string; title: string; description?: string; dueAt: string; isUrgent?: boolean }): Promise<void> {
    await api('/api/tasks', { method: 'POST', body: data });
    await this.load(); // refreshes tasks and the lead's "next follow-up"
  }

  async toggleTask(taskId: string): Promise<boolean> {
    const res = await api<{ task: any }>(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' });
    const i = this.rawTasks.findIndex((t) => t.id === taskId);
    if (i >= 0) this.rawTasks[i] = res.task;
    this.notify();
    this.refresh(); // next follow-up date on the lead may have changed
    return res.task.completed;
  }

  // ---- export ----------------------------------------------------------------------------
  exportCSV(): string {
    const headers = [
      'Form ID', 'Name', 'Email', 'Phone', 'Company', 'Source', 'Status', 'Priority', 'Deal Value (USD)',
      'Budget', 'Assigned To', 'Received At', 'First Contacted At', 'Next Follow-up', 'Notes'
    ];
    const rows = this.rawLeads.map((l) => [
      l.formId, l.name, l.email, l.phone, l.company, l.source, String(l.status).toUpperCase(), l.priority, l.dealValue || 0,
      l.declaredBudget, l.assignedRep?.name || 'Unassigned', l.receivedAt, l.firstContactedAt || '', l.nextFollowUpAt || '', (l.notes || []).length
    ]);
    return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  }
}

export const leadService = new LeadService();
