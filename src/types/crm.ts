export type LeadStatus = 'new' | 'contacted' | 'proposal' | 'converted' | 'lost';

export type LeadPriority = 'high' | 'standard' | 'low';

export type NoteType = 'call' | 'email' | 'meeting' | 'note';

export interface NoteItem {
  id: string;
  type: NoteType;
  author: string;
  content: string;
  /** ISO date from the server */
  createdAt: string;
  /** Display string derived from createdAt ("5m ago", "Oct 3, 2:15 PM") */
  timestamp: string;
  metadata?: {
    duration?: string;
    badge?: string;
  };
}

export interface ActivityEvent {
  id: string;
  type: 'submission' | 'stage_change' | 'note_logged' | 'assigned' | 'reminder';
  title: string;
  detail: string;
  author: string;
  createdAt: string;
  timestamp: string;
  duration?: string;
  fromStage?: LeadStatus;
  toStage?: LeadStatus;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
}

export interface Lead {
  id: string;
  formId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  sourcePage?: string;
  subject?: string;
  message?: string;
  status: LeadStatus;
  priority: LeadPriority;
  tier?: string;
  dealValue: number;
  declaredBudget?: string;
  targetTimeline?: string;
  assignedRep?: SalesRep | null;
  ip?: string;
  referrer?: string;
  /** ISO dates */
  receivedAt: string;
  firstContactedAt?: string | null;
  convertedAt?: string | null;
  nextFollowUpAt?: string | null;
  /** Display strings derived from the dates above */
  relativeTime: string;
  nextFollowUp?: string | null;
  notes: NoteItem[];
  activityHistory: ActivityEvent[];
}

export interface ScheduledTask {
  id: string;
  leadId: string;
  leadName: string;
  company: string;
  title: string;
  description: string;
  /** ISO due date */
  dueAt: string;
  /** Display string derived from dueAt */
  dueText: string;
  isOverdue: boolean;
  isUrgent?: boolean;
  completed: boolean;
}

export interface CRMStats {
  totalLeads: number;
  newToday: number;
  last24h: number;
  uncontactedCount: number;
  inFollowUp: number;
  convertedCount: number;
  lostCount: number;
  /** converted / total leads, in percent (1 decimal) */
  conversionRate: number;
  /** converted / (converted + lost), in percent (1 decimal) */
  winRate: number;
  wonRevenue: number;
  pipelineValue: number;
  /** Average minutes from "received" to first contact; null until a lead has been contacted */
  avgResponseMinutes: number | null;
  /** % of contacted leads whose first contact was within the SLA target; null when no data */
  slaAdherenceRate: number | null;
  slaTargetMinutes: number;
}

export type ShowToast = (message: string, tone?: 'success' | 'error') => void;
