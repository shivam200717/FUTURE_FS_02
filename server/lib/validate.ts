// Pure helpers (no framework imports) so they are easy to unit test.

export const STATUSES = ['new', 'contacted', 'proposal', 'converted', 'lost'] as const;
export const PRIORITIES = ['high', 'standard', 'low'] as const;
export const NOTE_TYPES = ['call', 'email', 'meeting', 'note'] as const;

export type Status = (typeof STATUSES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns a trimmed string without control characters, capped at `max`, or '' if not a string. */
export function cleanString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function isOneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/**
 * Turns a free-text budget such as "$15,000 - $30,000" or "$30,000+" into a single deal value.
 * Range -> midpoint, open-ended ("30,000+") -> the lower bound, nothing parsable -> fallback.
 */
export function parseBudget(budget: unknown, fallback = 0): number {
  if (typeof budget !== 'string') return fallback;
  const nums = (budget.match(/\d[\d,]*(?:\.\d+)?/g) || [])
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return fallback;
  if (nums.length === 1) {
    // "Under $5,000" -> assume about half the ceiling; "$30,000+" / "$30,000" -> the stated amount
    return /under|less than|below|up to|<\s*\$?\d/i.test(budget) ? Math.round(nums[0] / 2) : Math.round(nums[0]);
  }
  return Math.round((nums[0] + nums[1]) / 2);
}

export function priorityForValue(dealValue: number): 'high' | 'standard' | 'low' {
  if (dealValue >= 25000) return 'high';
  if (dealValue > 0 && dealValue < 3000) return 'low';
  return 'standard';
}

export function tierForValue(dealValue: number): string {
  return dealValue >= 15000 ? 'Enterprise' : 'Standard';
}

/** Parses an ISO-ish date, returns null when invalid. */
export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface CleanLeadInput {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  sourcePage: string;
  subject: string;
  message: string;
  declaredBudget: string;
  targetTimeline: string;
}

/** Validates the fields shared by the public webhook and the admin "add lead" form. */
export function validateLeadInput(body: any): { ok: true; data: CleanLeadInput } | { ok: false; error: string } {
  const b = body && typeof body === 'object' ? body : {};
  const name = cleanString(b.name, 100);
  const email = cleanString(b.email, 254).toLowerCase();
  if (!name) return { ok: false, error: 'Name is required' };
  if (!email || !isValidEmail(email)) return { ok: false, error: 'A valid email address is required' };
  return {
    ok: true,
    data: {
      name,
      email,
      phone: cleanString(b.phone, 40),
      company: cleanString(b.company, 120),
      source: cleanString(b.source, 80) || 'Website Contact Form',
      sourcePage: cleanString(b.sourcePage, 200),
      subject: cleanString(b.subject, 200),
      message: cleanString(b.message, 5000),
      declaredBudget: cleanString(b.budget ?? b.declaredBudget, 80),
      targetTimeline: cleanString(b.timeline ?? b.targetTimeline, 80)
    }
  };
}
