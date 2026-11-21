import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStats, buildFunnel, bySource, byRep, dailyCounts } from '../src/utils/stats.ts';
import { timeAgo, formatDue, formatDuration } from '../src/utils/time.ts';
import { csvCell } from '../src/services/leadService.ts';

const NOW = new Date('2026-10-24T12:00:00');
const iso = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3600_000).toISOString();

function lead(over: Record<string, any>): any {
  return {
    id: Math.random().toString(36), formId: '#LF-0001', name: 'X', email: 'x@y.co', phone: '', company: '', source: 'Web',
    status: 'new', priority: 'standard', dealValue: 0, receivedAt: iso(1), firstContactedAt: null, notes: [], activityHistory: [],
    relativeTime: '', ...over
  };
}

const LEADS = [
  lead({ status: 'new', receivedAt: iso(1), dealValue: 1000 }),
  lead({ status: 'contacted', receivedAt: iso(30), firstContactedAt: new Date(NOW.getTime() - 30 * 3600_000 + 20 * 60_000).toISOString(), dealValue: 2000, source: 'Ads' }),
  lead({ status: 'converted', receivedAt: iso(60), firstContactedAt: new Date(NOW.getTime() - 60 * 3600_000 + 120 * 60_000).toISOString(), dealValue: 5000, source: 'Ads', assignedRep: { name: 'Ann' } }),
  lead({ status: 'lost', receivedAt: iso(70), firstContactedAt: new Date(NOW.getTime() - 70 * 3600_000 + 10 * 60_000).toISOString(), dealValue: 3000 })
];

test('calculateStats computes real numbers, not constants', () => {
  const s = calculateStats(LEADS, NOW, 60);
  assert.equal(s.totalLeads, 4);
  assert.equal(s.uncontactedCount, 1);
  assert.equal(s.inFollowUp, 1);
  assert.equal(s.convertedCount, 1);
  assert.equal(s.lostCount, 1);
  assert.equal(s.conversionRate, 25);
  assert.equal(s.winRate, 50);
  assert.equal(s.wonRevenue, 5000);
  assert.equal(s.pipelineValue, 3000);
  assert.equal(s.avgResponseMinutes, (20 + 120 + 10) / 3);
  assert.equal(s.slaAdherenceRate, 66.7); // 2 of 3 within 60 minutes
});

test('calculateStats on an empty list does not divide by zero', () => {
  const s = calculateStats([], NOW);
  assert.equal(s.totalLeads, 0);
  assert.equal(s.conversionRate, 0);
  assert.equal(s.avgResponseMinutes, null);
  assert.equal(s.slaAdherenceRate, null);
});

test('buildFunnel is cumulative', () => {
  const f = buildFunnel(LEADS);
  assert.deepEqual(f.map((x) => x.count), [4, 3, 1, 1]);
  assert.equal(f[0].fromPrevious, null);
  assert.equal(f[1].fromPrevious, 75);
});

test('grouping by source and rep', () => {
  const src = bySource(LEADS);
  const ads = src.find((r) => r.name === 'Ads')!;
  assert.equal(ads.leads, 2);
  assert.equal(ads.converted, 1);
  assert.equal(ads.conversionRate, 50);
  assert.equal(ads.wonValue, 5000);
  assert.ok(byRep(LEADS).some((r) => r.name === 'Unassigned'));
  assert.ok(byRep(LEADS).some((r) => r.name === 'Ann'));
});

test('dailyCounts buckets leads into the last N days', () => {
  const days = dailyCounts(LEADS, 7, NOW);
  assert.equal(days.length, 7);
  assert.equal(days.reduce((n, d) => n + d.count, 0), 4);
  assert.equal(days[days.length - 1].count, 1); // only the 1h-old lead is "today"
});

test('timeAgo / formatDue / formatDuration', () => {
  const now = NOW.getTime();
  assert.equal(timeAgo(iso(0), now), 'Just now');
  assert.equal(timeAgo(new Date(now - 5 * 60_000).toISOString(), now), '5m ago');
  assert.equal(timeAgo(iso(3), now), '3h ago');
  assert.equal(timeAgo(iso(48), now), '2d ago');
  assert.equal(timeAgo(null, now), '');
  assert.match(formatDue(new Date(NOW.getTime() + 3600_000).toISOString(), now), /^Today, /);
  assert.match(formatDue(new Date(NOW.getTime() + 24 * 3600_000).toISOString(), now), /^Tomorrow, /);
  assert.equal(formatDuration(null), '-');
  assert.equal(formatDuration(0.2), '<1 min');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(150), '2.5 h');
});

test('csvCell escapes quotes and neutralises spreadsheet formulas', () => {
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
  assert.equal(csvCell('+1 555'), `"'+1 555"`);
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(42), '"42"');
});
