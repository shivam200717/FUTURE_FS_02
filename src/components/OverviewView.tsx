import React from 'react';
import { CRMStats, Lead, LeadStatus, ScheduledTask, ShowToast } from '../types/crm';
import { leadService } from '../services/leadService';
import { buildFunnel, bySource, formatMoney } from '../utils/stats';
import { formatDuration } from '../utils/time';

interface OverviewViewProps {
  leads: Lead[];
  stats: CRMStats;
  tasks: ScheduledTask[];
  onOpenNewLeadModal: () => void;
  onExportCSV: () => void;
  showToast: ShowToast;
  onSelectLeadForNotes: (lead: Lead) => void;
  onSelectView: (view: string) => void;
}

export const STATUS_STYLES: Record<LeadStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-[#dee0ff] text-[#00105b]' },
  contacted: { label: 'Contacted', cls: 'bg-[#ffe8c2] text-[#6b4200]' },
  proposal: { label: 'Proposal', cls: 'bg-[#dae2fd] text-[#131b2e]' },
  converted: { label: 'Converted', cls: 'bg-[#85f8c4] text-[#005137]' },
  lost: { label: 'Lost', cls: 'bg-[#e5e7eb] text-[#444656]' }
};

export const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLES[status].cls}`}>
    {STATUS_STYLES[status].label}
  </span>
);

export const OverviewView: React.FC<OverviewViewProps> = ({
  leads,
  stats,
  tasks,
  onOpenNewLeadModal,
  onExportCSV,
  showToast,
  onSelectLeadForNotes,
  onSelectView
}) => {
  const funnel = buildFunnel(leads);
  const sources = bySource(leads).slice(0, 5);
  const newest = leads.slice(0, 6);
  const openTasks = tasks.filter((t) => !t.completed).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)).slice(0, 6);
  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  const handleToggleTask = async (taskId: string) => {
    try {
      const done = await leadService.toggleTask(taskId);
      showToast(done ? 'Follow-up marked as done' : 'Follow-up re-opened');
    } catch (err: any) {
      showToast(err?.message || 'Could not update the follow-up', 'error');
    }
  };

  const card = 'bg-white border border-[#e2e8f0] rounded-xl shadow-xs';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-[#565e74]';

  const kpis = [
    { title: 'Total leads', value: String(stats.totalLeads), sub: `${stats.newToday} received today`, icon: 'groups', color: 'text-[#143ee4]' },
    {
      title: 'Waiting for first contact',
      value: String(stats.uncontactedCount),
      sub: stats.uncontactedCount ? 'Reach out as soon as possible' : 'You are all caught up',
      icon: 'inbox',
      color: stats.uncontactedCount ? 'text-[#ba1a1a]' : 'text-[#006343]'
    },
    { title: 'Conversion rate', value: `${stats.conversionRate}%`, sub: `${stats.convertedCount} of ${stats.totalLeads} leads became clients`, icon: 'verified', color: 'text-[#006343]' },
    { title: 'Revenue won', value: formatMoney(stats.wonRevenue), sub: `${formatMoney(stats.pipelineValue)} still in the pipeline`, icon: 'payments', color: 'text-[#143ee4]' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#0b1c30] tracking-tight">Overview</h1>
          <p className="text-[13px] text-[#565e74]">What needs your attention right now.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExportCSV} className="px-3.5 py-2 bg-white border border-[#e2e8f0] hover:border-[#143ee4] text-[#0b1c30] rounded-lg text-[13px] font-semibold cursor-pointer">
            Export CSV
          </button>
          <button onClick={onOpenNewLeadModal} className="px-3.5 py-2 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded-lg text-[13px] font-bold shadow-xs cursor-pointer">
            + Add lead
          </button>
        </div>
      </div>

      {leads.length === 0 && (
        <div className={`${card} p-8 text-center flex flex-col items-center gap-2`}>
          <span className="material-symbols-outlined text-[40px] text-[#143ee4]">inbox</span>
          <h2 className="text-[18px] font-bold text-[#0b1c30]">No leads yet</h2>
          <p className="text-[13px] text-[#565e74] max-w-md">
            Add one manually, or connect your website's contact form (see Settings). New submissions appear here automatically.
          </p>
          <div className="flex gap-2 mt-2">
            <button onClick={onOpenNewLeadModal} className="px-3.5 py-2 bg-[#143ee4] text-white rounded-lg text-[13px] font-bold cursor-pointer">Add a lead</button>
            <button onClick={() => onSelectView('settings')} className="px-3.5 py-2 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-semibold cursor-pointer">Connect a form</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.title} className={`${card} p-4 flex flex-col gap-1`}>
            <div className="flex items-center justify-between">
              <span className={label}>{k.title}</span>
              <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
            </div>
            <span className="text-[30px] font-extrabold text-[#0b1c30] leading-tight">{k.value}</span>
            <span className="text-[12px] text-[#565e74]">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Newest leads */}
        <div className={`${card} xl:col-span-2 overflow-hidden`}>
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#0b1c30]">Newest leads</h2>
            <button onClick={() => onSelectView('leads')} className="text-[12px] text-[#143ee4] font-semibold hover:underline cursor-pointer">View all</button>
          </div>
          {newest.length === 0 ? (
            <div className="p-6 text-[13px] text-[#565e74]">Nothing here yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead className="text-[11px] uppercase tracking-wider text-[#565e74] bg-[#f8f9ff]">
                  <tr>
                    <th className="py-2 px-4 font-bold">Lead</th>
                    <th className="py-2 px-4 font-bold">Source</th>
                    <th className="py-2 px-4 font-bold">Status</th>
                    <th className="py-2 px-4 font-bold">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {newest.map((lead) => (
                    <tr key={lead.id} onClick={() => onSelectLeadForNotes(lead)} className="hover:bg-[#f8f9ff] cursor-pointer">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-[#0b1c30]">{lead.name}</div>
                        <div className="text-[12px] text-[#565e74]">{lead.company || lead.email}</div>
                      </td>
                      <td className="py-2.5 px-4 text-[#565e74]">{lead.source}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={lead.status} /></td>
                      <td className="py-2.5 px-4 text-[#565e74] whitespace-nowrap">{lead.relativeTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Follow-ups */}
        <div className={`${card} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#0b1c30]">Follow-ups due</h2>
            {overdueCount > 0 && (
              <span className="text-[11px] font-bold bg-[#ffdad6] text-[#93000a] px-2 py-0.5 rounded-full">{overdueCount} overdue</span>
            )}
          </div>
          {openTasks.length === 0 ? (
            <div className="p-6 text-[13px] text-[#565e74]">No open follow-ups. Schedule one from a lead's detail panel.</div>
          ) : (
            <ul className="divide-y divide-[#f1f5f9]">
              {openTasks.map((t) => (
                <li key={t.id} className="px-4 py-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => handleToggleTask(t.id)}
                    aria-label={`Mark "${t.title}" as done`}
                    className="mt-1 w-4 h-4 accent-[#143ee4] cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[#0b1c30] truncate">{t.title}</div>
                    <div className="text-[12px] text-[#565e74] truncate">{t.company || t.leadName}</div>
                  </div>
                  <span className={`text-[11px] font-bold whitespace-nowrap ${t.isOverdue ? 'text-[#ba1a1a]' : t.isUrgent ? 'text-[#d97706]' : 'text-[#565e74]'}`}>
                    {t.isOverdue ? 'Overdue • ' : ''}{t.dueText}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className={`${card} xl:col-span-2 p-4 flex flex-col gap-3`}>
          <h2 className="text-[15px] font-bold text-[#0b1c30]">Conversion funnel</h2>
          {funnel.map((stage) => (
            <div key={stage.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#0b1c30] font-medium">{stage.label}</span>
                <span className="text-[#565e74]">
                  <strong className="text-[#0b1c30] font-mono">{stage.count}</strong>
                  {stage.fromPrevious !== null ? ` • ${stage.fromPrevious}% of previous step` : ''}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#e5eeff] overflow-hidden">
                <div className="h-full rounded-full bg-[#143ee4]" style={{ width: `${stage.ofTotal}%` }}></div>
              </div>
            </div>
          ))}
          <div className="text-[12px] text-[#565e74] pt-1">
            {stats.lostCount} lead{stats.lostCount === 1 ? '' : 's'} lost.{' '}
            {stats.convertedCount + stats.lostCount > 0 ? `Win rate on closed deals: ${stats.winRate}%.` : ''}
          </div>
        </div>

        {/* Response speed + sources */}
        <div className="flex flex-col gap-6">
          <div className={`${card} p-4 flex flex-col gap-1`}>
            <span className={label}>Response speed</span>
            <span className="text-[26px] font-extrabold text-[#0b1c30]">{formatDuration(stats.avgResponseMinutes)}</span>
            <span className="text-[12px] text-[#565e74]">
              {stats.slaAdherenceRate === null
                ? 'Average time to first contact. Shows once you contact your first lead.'
                : `${stats.slaAdherenceRate}% of leads contacted within ${stats.slaTargetMinutes} minutes`}
            </span>
          </div>

          <div className={`${card} p-4 flex flex-col gap-2`}>
            <span className={label}>Top sources</span>
            {sources.length === 0 ? (
              <span className="text-[13px] text-[#565e74]">No data yet.</span>
            ) : (
              sources.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#0b1c30] truncate pr-2">{s.name}</span>
                  <span className="text-[#565e74] whitespace-nowrap">{s.leads} lead{s.leads === 1 ? '' : 's'} • {s.converted} won</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
