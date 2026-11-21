import type { CRMStats, Lead } from '../types/crm';
import { startOfDay } from './time';

export const SLA_TARGET_MINUTES = 60;

const OPEN: Lead['status'][] = ['new', 'contacted', 'proposal'];
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
const minutesToFirstContact = (l: Lead) =>
  l.firstContactedAt ? (new Date(l.firstContactedAt).getTime() - new Date(l.receivedAt).getTime()) / 60_000 : null;

export function calculateStats(leads: Lead[], now: Date = new Date(), slaTarget = SLA_TARGET_MINUTES): CRMStats {
  const today = startOfDay(now).getTime();
  const dayAgo = now.getTime() - 24 * 3600_000;
  const converted = leads.filter((l) => l.status === 'converted');
  const lost = leads.filter((l) => l.status === 'lost');
  const response = leads.map(minutesToFirstContact).filter((m): m is number => m !== null && m >= 0);

  return {
    totalLeads: leads.length,
    newToday: leads.filter((l) => new Date(l.receivedAt).getTime() >= today).length,
    last24h: leads.filter((l) => new Date(l.receivedAt).getTime() >= dayAgo).length,
    uncontactedCount: leads.filter((l) => l.status === 'new').length,
    inFollowUp: leads.filter((l) => l.status === 'contacted' || l.status === 'proposal').length,
    convertedCount: converted.length,
    lostCount: lost.length,
    conversionRate: pct(converted.length, leads.length),
    winRate: pct(converted.length, converted.length + lost.length),
    wonRevenue: converted.reduce((sum, l) => sum + (l.dealValue || 0), 0),
    pipelineValue: leads.filter((l) => OPEN.includes(l.status)).reduce((sum, l) => sum + (l.dealValue || 0), 0),
    avgResponseMinutes: response.length ? response.reduce((a, b) => a + b, 0) / response.length : null,
    slaAdherenceRate: response.length ? pct(response.filter((m) => m <= slaTarget).length, response.length) : null,
    slaTargetMinutes: slaTarget
  };
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** % of all leads that reached this stage */
  ofTotal: number;
  /** % kept from the previous stage (null for the first stage) */
  fromPrevious: number | null;
}

/** Cumulative funnel: every lead that ever reached a stage counts toward it. */
export function buildFunnel(leads: Lead[]): FunnelStage[] {
  const total = leads.length;
  const contacted = leads.filter((l) => l.status !== 'new' || !!l.firstContactedAt).length;
  const proposal = leads.filter((l) => l.status === 'proposal' || l.status === 'converted').length;
  const converted = leads.filter((l) => l.status === 'converted').length;
  const raw: [string, string, number][] = [
    ['received', 'Leads received', total],
    ['contacted', 'Contacted', contacted],
    ['proposal', 'Proposal / review', proposal],
    ['converted', 'Converted', converted]
  ];
  return raw.map(([key, label, count], i) => ({
    key,
    label,
    count,
    ofTotal: pct(count, total),
    fromPrevious: i === 0 ? null : pct(count, raw[i - 1][2])
  }));
}

export interface GroupRow {
  name: string;
  leads: number;
  converted: number;
  conversionRate: number;
  wonValue: number;
  avgResponseMinutes: number | null;
}

function groupBy(leads: Lead[], keyFn: (l: Lead) => string): GroupRow[] {
  const map = new Map<string, Lead[]>();
  for (const l of leads) {
    const k = keyFn(l);
    map.set(k, [...(map.get(k) || []), l]);
  }
  return [...map.entries()]
    .map(([name, group]) => {
      const converted = group.filter((l) => l.status === 'converted');
      const response = group.map(minutesToFirstContact).filter((m): m is number => m !== null && m >= 0);
      return {
        name,
        leads: group.length,
        converted: converted.length,
        conversionRate: pct(converted.length, group.length),
        wonValue: converted.reduce((s, l) => s + (l.dealValue || 0), 0),
        avgResponseMinutes: response.length ? response.reduce((a, b) => a + b, 0) / response.length : null
      };
    })
    .sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name));
}

export const bySource = (leads: Lead[]) => groupBy(leads, (l) => l.source || 'Unknown');
export const byRep = (leads: Lead[]) => groupBy(leads, (l) => l.assignedRep?.name || 'Unassigned');

/** Leads received per day for the last `days` days (oldest first), in the viewer's local time. */
export function dailyCounts(leads: Lead[], days = 14, now: Date = new Date()): { date: Date; count: number }[] {
  const start = startOfDay(now);
  const out: { date: Date; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    out.push({ date: d, count: 0 });
  }
  for (const l of leads) {
    const t = startOfDay(new Date(l.receivedAt)).getTime();
    const slot = out.find((o) => o.date.getTime() === t);
    if (slot) slot.count += 1;
  }
  return out;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}
