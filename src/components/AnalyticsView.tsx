import React from 'react';
import { CRMStats, Lead, LeadStatus, ShowToast } from '../types/crm';
import { byRep, bySource, dailyCounts, formatMoney, GroupRow } from '../utils/stats';
import { formatDuration } from '../utils/time';
import { STATUS_STYLES } from './OverviewView';

interface AnalyticsViewProps {
  leads: Lead[];
  stats: CRMStats;
  onExportCSV: () => void;
  showToast: ShowToast;
}

const dayLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const GroupTable: React.FC<{ title: string; firstCol: string; rows: GroupRow[] }> = ({ title, firstCol, rows }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-xs overflow-hidden">
    <div className="px-4 py-3 border-b border-[#e2e8f0]">
      <h2 className="text-[15px] font-bold text-[#0b1c30]">{title}</h2>
    </div>
    {rows.length === 0 ? (
      <div className="p-6 text-[13px] text-[#565e74]">No data yet.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] text-left">
          <thead className="text-[11px] uppercase tracking-wider text-[#565e74] bg-[#f8f9ff]">
            <tr>
              <th className="py-2 px-4 font-bold">{firstCol}</th>
              <th className="py-2 px-4 font-bold text-right">Leads</th>
              <th className="py-2 px-4 font-bold text-right">Converted</th>
              <th className="py-2 px-4 font-bold text-right">Rate</th>
              <th className="py-2 px-4 font-bold text-right">Revenue won</th>
              <th className="py-2 px-4 font-bold text-right">Avg response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="py-2.5 px-4 font-semibold text-[#0b1c30]">{r.name}</td>
                <td className="py-2.5 px-4 text-right">{r.leads}</td>
                <td className="py-2.5 px-4 text-right">{r.converted}</td>
                <td className="py-2.5 px-4 text-right">{r.conversionRate}%</td>
                <td className="py-2.5 px-4 text-right">{formatMoney(r.wonValue)}</td>
                <td className="py-2.5 px-4 text-right">{formatDuration(r.avgResponseMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ leads, stats, onExportCSV }) => {
  const days = dailyCounts(leads, 14);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const statuses: LeadStatus[] = ['new', 'contacted', 'proposal', 'converted', 'lost'];

  const kpis = [
    { title: 'Total leads', value: String(stats.totalLeads) },
    { title: 'Conversion rate', value: `${stats.conversionRate}%` },
    { title: 'Win rate (closed deals)', value: stats.convertedCount + stats.lostCount ? `${stats.winRate}%` : '-' },
    { title: 'Revenue won', value: formatMoney(stats.wonRevenue) },
    { title: 'Avg response time', value: formatDuration(stats.avgResponseMinutes) }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#0b1c30] tracking-tight">Analytics</h1>
          <p className="text-[13px] text-[#565e74]">Calculated live from your leads. Deal values come from each lead's budget.</p>
        </div>
        <button onClick={onExportCSV} className="px-3.5 py-2 bg-white border border-[#e2e8f0] hover:border-[#143ee4] rounded-lg text-[13px] font-semibold cursor-pointer">
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.title} className="bg-white border border-[#e2e8f0] rounded-xl shadow-xs p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#565e74]">{k.title}</div>
            <div className="text-[26px] font-extrabold text-[#0b1c30] mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-[#e2e8f0] rounded-xl shadow-xs p-4">
          <h2 className="text-[15px] font-bold text-[#0b1c30] mb-4">Leads received, last 14 days</h2>
          <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Bar chart of leads received per day">
            {days.map((d) => (
              <div key={d.date.toISOString()} className="flex-1 flex flex-col items-center justify-end gap-1 h-full min-w-0">
                <span className="text-[10px] text-[#565e74] font-mono">{d.count || ''}</span>
                <div
                  className="w-full rounded-t bg-[#3b5bfd]"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 4 : 2, opacity: d.count ? 1 : 0.25 }}
                  title={`${dayLabel.format(d.date)}: ${d.count}`}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {days.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[9px] text-[#747687] truncate">
                {i % 2 === 0 || days.length < 8 ? dayLabel.format(d.date) : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-xs p-4 flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1c30]">Leads by status</h2>
          {statuses.map((s) => {
            const count = leads.filter((l) => l.status === s).length;
            const pct = leads.length ? (count / leads.length) * 100 : 0;
            return (
              <div key={s} className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLES[s].cls}`}>{STATUS_STYLES[s].label}</span>
                  <span className="font-mono text-[#0b1c30]">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e5eeff] overflow-hidden">
                  <div className="h-full bg-[#143ee4]" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GroupTable title="Performance by lead source" firstCol="Source" rows={bySource(leads)} />
      <GroupTable title="Performance by team member" firstCol="Assigned to" rows={byRep(leads)} />
    </div>
  );
};
