import React, { useState } from 'react';
import { Lead, LeadStatus, ShowToast } from '../types/crm';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { leadService } from '../services/leadService';
import { calculateStats, formatMoney } from '../utils/stats';
import { formatDuration, timeAgo } from '../utils/time';

interface PipelineBoardViewProps {
  leads: Lead[];
  onOpenNewLeadModal: () => void;
  onExportCSV: () => void;
  showToast: ShowToast;
  onOpenReminderModal: (lead: Lead) => void;
}

export const PipelineBoardView: React.FC<PipelineBoardViewProps> = ({
  leads,
  onOpenNewLeadModal,
  onExportCSV,
  showToast,
  onOpenReminderModal
}) => {
  const [activeLayout, setActiveLayout] = useState<'board' | 'table'>('board');
  const [selectedRepFilter, setSelectedRepFilter] = useState('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;
  const reps = leadService.getReps();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Filter leads by assigned rep if selected
  const visibleLeads = leads.filter((l) => {
    if (selectedRepFilter === 'all') return true;
    return l.assignedRep?.name.toLowerCase().includes(selectedRepFilter.toLowerCase());
  });

  const kpi = calculateStats(visibleLeads);
  const stageTotals = (status: LeadStatus) => {
    const group = visibleLeads.filter((l) => l.status === status);
    return { count: group.length, value: group.reduce((sum, l) => sum + (l.dealValue || 0), 0) };
  };
  const newLeads = visibleLeads.filter((l) => l.status === 'new');
  const m = {
    new: stageTotals('new'),
    contacted: stageTotals('contacted'),
    proposal: stageTotals('proposal'),
    converted: stageTotals('converted'),
    lost: visibleLeads.filter((l) => l.status === 'lost').length,
    oldestNew: newLeads.length
      ? timeAgo(newLeads.reduce((o, l) => (new Date(l.receivedAt) < new Date(o.receivedAt) ? l : o)).receivedAt)
      : ''
  };

  const columnConfig: Array<{
    id: LeadStatus;
    title: string;
    borderClass: string;
    dotClass: string;
    badgeBg: string;
    badgeText: string;
  }> = [
    {
      id: 'new',
      title: 'New Inbound',
      borderClass: 'border-b-2 border-[#3b5bfd]',
      dotClass: 'bg-[#3b5bfd]',
      badgeBg: 'bg-[#dee0ff]',
      badgeText: 'text-[#00105b]'
    },
    {
      id: 'contacted',
      title: 'Contacted / Follow-Up',
      borderClass: 'border-b-2 border-[#d97706]',
      dotClass: 'bg-[#d97706]',
      badgeBg: 'bg-[#dae2fd]',
      badgeText: 'text-[#131b2e]'
    },
    {
      id: 'proposal',
      title: 'Proposal / Review',
      borderClass: 'border-b-2 border-[#143ee4]',
      dotClass: 'bg-[#143ee4]',
      badgeBg: 'bg-[#bac3ff]',
      badgeText: 'text-[#00105b]'
    },
    {
      id: 'converted',
      title: 'Converted Clients',
      borderClass: 'border-b-2 border-[#007e57]',
      dotClass: 'bg-[#007e57]',
      badgeBg: 'bg-[#85f8c4]',
      badgeText: 'text-[#002114]'
    }
  ];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    setDraggedLeadId(null);
    leadService
      .updateLeadStatus(leadId, targetStage)
      .then(() => showToast(`Lead moved to ${targetStage.toUpperCase()}`))
      .catch((err: any) => showToast(err?.message || 'Could not move the lead', 'error'));
  };

  const handleQuickAdvance = (lead: Lead) => {
    const stageOrder: LeadStatus[] = ['new', 'contacted', 'proposal', 'converted'];
    const curIdx = stageOrder.indexOf(lead.status);
    if (curIdx >= 0 && curIdx < stageOrder.length - 1) {
      const nextStage = stageOrder[curIdx + 1];
      leadService
        .updateLeadStatus(lead.id, nextStage)
        .then(() => showToast(`Advanced ${lead.name} to ${nextStage.toUpperCase()}`))
        .catch((err: any) => showToast(err?.message || 'Could not advance the lead', 'error'));
    } else {
      setSelectedLeadId(lead.id);
      setIsDrawerOpen(true);
    }
  };

  const openDrawerForLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Bar / Stage Metrics Ribbon */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#565e74] text-[11px] uppercase tracking-wider font-bold">
              <span>Revenue Operations</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#143ee4]">Active Cycle</span>
            </div>
            <h1 className="text-[26px] text-[#0b1c30] font-bold tracking-tight mt-1">
              Sales &amp; Client Lead Pipeline
            </h1>
          </div>

          {/* Action Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher */}
            <div className="bg-[#eff4ff] border border-[#dae2fd] p-1 rounded-lg flex items-center shadow-2xs">
              <button
                onClick={() => setActiveLayout('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all cursor-pointer ${
                  activeLayout === 'board'
                    ? 'bg-white text-[#0b1c30] shadow-xs'
                    : 'text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">view_kanban</span>
                <span>Board</span>
              </button>
              <button
                onClick={() => setActiveLayout('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all cursor-pointer ${
                  activeLayout === 'table'
                    ? 'bg-white text-[#0b1c30] shadow-xs'
                    : 'text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                <span>Table</span>
              </button>
            </div>

            {/* Filter Lead Rep */}
            <div className="relative">
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="appearance-none bg-white border border-[#e2e8f0] text-[#0b1c30] text-[13px] font-medium pl-3 pr-8 py-2 rounded-lg shadow-2xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Assignees</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#565e74]">
                expand_more
              </span>
            </div>

            {/* Bulk Update */}
            <button
              onClick={() => showToast('Bulk operations active on pipeline')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#eff4ff] border border-[#e2e8f0] text-[#0b1c30] rounded-lg text-[13px] font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#565e74]">rule</span>
              <span>Bulk Update</span>
            </button>

            {/* New Lead CTA */}
            <button
              onClick={onOpenNewLeadModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#143ee4] hover:bg-[#002fc9] text-white text-[13px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Lead</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-[#3b5bfd]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#565e74]">1. New Inbound</span>
              <span className="material-symbols-outlined text-[#3b5bfd] text-[18px]">inbox</span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-[#0b1c30]">{m.new.count}</span>
                <span className="text-[12px] text-[#565e74]">awaiting contact</span>
              </div>
              <span className="text-[17px] font-bold text-[#143ee4]">{formatMoney(m.new.value)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#565e74]">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>{m.new.count ? `Oldest: ${m.oldestNew}` : 'Nothing waiting'}</span>
            </div>
          </div>
          <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-[#d97706]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#565e74]">2. Contacted</span>
              <span className="material-symbols-outlined text-[#d97706] text-[18px]">phone_in_talk</span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-[#0b1c30]">{m.contacted.count}</span>
                <span className="text-[12px] text-[#565e74]">in follow-up</span>
              </div>
              <span className="text-[17px] font-bold text-[#5c647a]">{formatMoney(m.contacted.value)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#565e74]">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              <span>{`Avg response: ${formatDuration(kpi.avgResponseMinutes)}`}</span>
            </div>
          </div>
          <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-[#143ee4]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#565e74]">3. Proposal / Review</span>
              <span className="material-symbols-outlined text-[#143ee4] text-[18px]">co_present</span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-[#0b1c30]">{m.proposal.count}</span>
                <span className="text-[12px] text-[#565e74]">open proposals</span>
              </div>
              <span className="text-[17px] font-bold text-[#143ee4]">{formatMoney(m.proposal.value)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#565e74]">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>{kpi.convertedCount + kpi.lostCount ? `Win rate on closed deals: ${kpi.winRate}%` : 'No closed deals yet'}</span>
            </div>
          </div>
          <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-[#007e57]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#565e74]">4. Converted</span>
              <span className="material-symbols-outlined text-[#006343] text-[18px]">verified</span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-[#0b1c30]">{m.converted.count}</span>
                <span className="text-[12px] text-[#565e74]">clients won</span>
              </div>
              <span className="text-[17px] font-bold text-[#006343]">{formatMoney(m.converted.value)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#565e74]">
              <span className="material-symbols-outlined text-[14px]">block</span>
              <span>{`${m.lost} lost`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Board / Kanban View */}
      {activeLayout === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columnConfig.map((col) => {
            const columnLeads = visibleLeads.filter((l) => l.status === col.id);
            const totalDealValue = columnLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex flex-col bg-[#eff4ff] border border-[#dae2fd] rounded-xl shadow-2xs overflow-hidden"
              >
                {/* Column Header */}
                <div
                  className={`bg-white px-4 py-3 flex items-center justify-between ${col.borderClass} shadow-2xs`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`}></span>
                    <span className="text-[14px] font-bold text-[#0b1c30]">{col.title}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}
                    >
                      {columnLeads.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-semibold text-[#565e74]">
                      ${totalDealValue.toLocaleString()}
                    </span>
                    <button
                      onClick={() => showToast(`Column options for ${col.title}`)}
                      className="p-1 text-[#565e74] hover:text-[#0b1c30] rounded cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </div>

                {/* Column Droppable Body */}
                <div className="p-3 flex flex-col gap-3 min-h-[520px]">
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      id={`lead-card-${lead.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-white border border-[#e2e8f0] p-3.5 rounded-lg shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all flex flex-col gap-3 group relative"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          onClick={() => openDrawerForLead(lead)}
                          className="flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#143ee4] text-white flex items-center justify-center font-bold text-[12px] shadow-2xs">
                            {lead.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[14px] text-[#0b1c30] font-bold truncate leading-tight group-hover:text-[#143ee4]">
                              {lead.name}
                            </span>
                            <span className="text-[12px] text-[#565e74] truncate">
                              {lead.company}
                            </span>
                          </div>
                        </div>

                        <span className="material-symbols-outlined text-[18px] text-[#94a3b8] group-hover:text-[#0b1c30] transition-colors cursor-move">
                          drag_indicator
                        </span>
                      </div>

                      {/* Pill tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#143ee4] border border-[#dae2fd]">
                          <span className="material-symbols-outlined text-[12px]">link</span>
                          <span>{lead.source}</span>
                        </span>
                        {lead.priority === 'high' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a]">
                            High Priority
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#dae2fd] text-[#131b2e] font-medium">
                          {lead.tier || 'Enterprise'}
                        </span>
                      </div>

                      {/* Note Callout or Progress bar */}
                      {lead.status === 'contacted' && lead.notes.length > 0 && (
                        <div className="bg-[#eff4ff] border border-[#dae2fd] p-2.5 rounded-lg flex items-start gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#143ee4] shrink-0 mt-0.5">
                            notification_important
                          </span>
                          <p className="text-[12px] text-[#444656] leading-snug line-clamp-2">
                            {lead.notes[0].content}
                          </p>
                        </div>
                      )}

                      {lead.status === 'proposal' && (
                        <div className="flex flex-col gap-1 bg-[#eff4ff] p-2.5 rounded-lg border border-[#dae2fd]">
                          <div className="flex justify-between text-[11px] text-[#565e74] font-semibold">
                            <span>Legal &amp; Contract Review</span>
                            <span>80%</span>
                          </div>
                          <div className="w-full bg-[#dae2fd] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#143ee4] h-full rounded-full w-4/5"></div>
                          </div>
                        </div>
                      )}

                      {lead.status === 'converted' && (
                        <div className="flex items-center gap-2 bg-[#85f8c4]/30 border border-[#85f8c4] p-2 rounded-lg">
                          <span className="material-symbols-outlined text-[16px] text-[#006343]">
                            verified
                          </span>
                          <span className="text-[11px] font-bold text-[#005137]">
                            Client Account Created &amp; Live
                          </span>
                        </div>
                      )}

                      {/* Bottom Metric & Controls */}
                      <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[#747687] uppercase font-bold">
                            {lead.status === 'converted' ? 'Contract ARR' : 'Est. Deal Value'}
                          </span>
                          <span className="text-[13px] font-mono font-bold text-[#0b1c30]">
                            ${lead.dealValue ? lead.dealValue.toLocaleString() : '8,500'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#565e74] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {lead.relativeTime}
                          </span>
                          <button
                            onClick={() => handleQuickAdvance(lead)}
                            className="w-6 h-6 flex items-center justify-center bg-[#eff4ff] hover:bg-[#143ee4] hover:text-white rounded text-[#0b1c30] transition-colors cursor-pointer"
                            title="Advance stage / view details"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="p-8 text-center text-[#747687] text-[12px] italic border-2 border-dashed border-[#dae2fd] rounded-lg">
                      Drop leads here to update stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alternative Table View */
        <div className="flex flex-col bg-white border border-[#e2e8f0] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 flex items-center justify-between bg-[#eff4ff] border-b border-[#dae2fd]">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-[#0b1c30]">Consolidated Lead List</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-[#dee0ff] text-[#00105b] rounded-full">
                {visibleLeads.length} Active Leads
              </span>
            </div>
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e2e8f0] text-[#0b1c30] rounded font-semibold text-[12px] shadow-2xs hover:bg-[#f8f9ff] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8f9ff] text-[#565e74] text-[11px] font-bold uppercase border-b border-[#e2e8f0]">
                <tr>
                  <th className="py-3 px-4">Lead Contact</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Source Channel</th>
                  <th className="py-3 px-4">Est. Deal Value</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-[13px] text-[#0b1c30]">
                {visibleLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#143ee4]">{lead.name}</td>
                    <td className="py-3 px-4 text-[#565e74]">{lead.company}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#dee0ff] text-[#00105b] text-[11px] font-bold uppercase">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#565e74]">{lead.source}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      ${lead.dealValue ? lead.dealValue.toLocaleString() : '8,500'}
                    </td>
                    <td className="py-3 px-4 text-[#565e74]">{lead.relativeTime}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openDrawerForLead(lead)}
                        className="text-[#143ee4] hover:underline text-[12px] font-bold cursor-pointer"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slideout Detail Drawer Modal */}
      {isDrawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0b1c30]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
            <LeadDetailDrawer
              key={selectedLead.id}
              lead={selectedLead}
              onClose={() => setIsDrawerOpen(false)}
              onOpenReminderModal={onOpenReminderModal}
              showToast={showToast}
            />
          </div>
        </div>
      )}
    </div>
  );
};
