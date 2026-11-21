import React, { useState } from 'react';
import { Lead, LeadStatus, ShowToast } from '../types/crm';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { leadService } from '../services/leadService';
import { calculateStats } from '../utils/stats';
import { formatDuration, timeAgo } from '../utils/time';

interface AllLeadsViewProps {
  leads: Lead[];
  onOpenNewLeadModal: () => void;
  onExportCSV: () => void;
  showToast: ShowToast;
  onOpenReminderModal: (lead: Lead) => void;
}

export const AllLeadsView: React.FC<AllLeadsViewProps> = ({
  leads,
  onOpenNewLeadModal,
  onExportCSV,
  showToast,
  onOpenReminderModal
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | LeadStatus>('all');
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0] || null;

  // Filter leads based on search, status tab, and source
  const filteredLeads = leads.filter((lead) => {
    // Status tab filter
    if (selectedStatusTab !== 'all') {
      if (selectedStatusTab === 'proposal' && lead.status !== 'proposal') return false;
      if (selectedStatusTab !== 'proposal' && lead.status !== selectedStatusTab) return false;
    }

    // Source filter
    if (selectedSource !== 'All' && !lead.source.toLowerCase().includes(selectedSource.toLowerCase())) {
      return false;
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchEmail = lead.email.toLowerCase().includes(q);
      const matchCompany = lead.company.toLowerCase().includes(q);
      const matchMsg = lead.message?.toLowerCase().includes(q) || false;
      const matchSub = lead.subject?.toLowerCase().includes(q) || false;
      if (!matchName && !matchEmail && !matchCompany && !matchMsg && !matchSub) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    if (checked) {
      filteredLeads.forEach((l) => {
        updated[l.id] = true;
      });
    }
    setSelectedCheckboxes(updated);
  };

  const toggleSelectLead = (id: string) => {
    setSelectedCheckboxes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const kpi = calculateStats(leads);
  const waiting = leads.filter((l) => l.status === 'new');
  const oldestWaiting = waiting.length
    ? timeAgo(waiting.reduce((o, l) => (new Date(l.receivedAt) < new Date(o.receivedAt) ? l : o)).receivedAt)
    : '';

  const handleInlineStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await leadService.updateLeadStatus(leadId, newStatus);
      showToast(`Lead status updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      showToast(err?.message || 'Could not update the lead status', 'error');
    }
  };

  // Status Tab Counts
  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    proposal: leads.filter((l) => l.status === 'proposal').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    lost: leads.filter((l) => l.status === 'lost').length
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Command & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#143ee4]">
              Inbound Pipeline Hub
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#006343]"></span>
            <span className="text-[11px] font-mono text-[#565e74]">Realtime Sync: ON</span>
          </div>
          <h1 className="text-[26px] font-bold text-[#0b1c30] tracking-tight">
            Lead Management &amp; Inquiries
          </h1>
          <p className="text-[14px] text-[#565e74] max-w-2xl">
            Manage incoming submissions from website contact forms, update pipeline stages, and log communications.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#0b1c30] border border-[#e2e8f0] font-semibold text-[13px] rounded-lg shadow-2xs hover:bg-[#eff4ff] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-[#565e74]">download</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenNewLeadModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#143ee4] hover:bg-[#002fc9] text-white font-semibold text-[13px] rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ New Lead</span>
          </button>
        </div>
      </div>

      {/* Operational Filter Row & KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1 */}
        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold">Uncontacted Leads</span>
            <span className="text-[32px] font-extrabold text-[#0b1c30] mt-0.5 leading-tight">{kpi.uncontactedCount}</span>
            <span className={`text-[11px] font-bold flex items-center gap-1 mt-0.5 ${kpi.uncontactedCount ? 'text-[#ba1a1a]' : 'text-[#006343]'}`}>
              <span className="material-symbols-outlined text-[14px]">{kpi.uncontactedCount ? 'priority_high' : 'check_circle'}</span>
              <span>{oldestWaiting ? `Oldest waiting: ${oldestWaiting}` : 'Everyone has been contacted'}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#143ee4]">
            <span className="material-symbols-outlined text-[22px]">inbox</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold">In Follow-Up</span>
            <span className="text-[32px] font-extrabold text-[#0b1c30] mt-0.5 leading-tight">{kpi.inFollowUp}</span>
            <span className="text-[11px] font-bold text-[#565e74] flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">forum</span>
              <span>Contacted or in proposal</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#3b5bfd]">
            <span className="material-symbols-outlined text-[22px]">forum</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold">Avg Response Time</span>
            <span className="text-[32px] font-extrabold text-[#0b1c30] mt-0.5 leading-tight">{formatDuration(kpi.avgResponseMinutes)}</span>
            <span className="text-[11px] font-bold text-[#565e74] flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              <span>{kpi.slaAdherenceRate === null ? 'No contacted leads yet' : `${kpi.slaAdherenceRate}% within ${kpi.slaTargetMinutes} min`}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#006343]">
            <span className="material-symbols-outlined text-[22px]">speed</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold">Conversion Rate</span>
            <span className="text-[13px] font-mono text-[#143ee4] font-bold">{kpi.conversionRate}%</span>
          </div>
          <div className="my-2 h-2 w-full rounded-full bg-[#e5eeff] overflow-hidden">
            <div className="h-full bg-[#143ee4] rounded-full" style={{ width: `${Math.min(100, kpi.conversionRate)}%` }}></div>
          </div>
          <span className="text-[11px] text-[#747687] truncate">{kpi.convertedCount} converted out of {kpi.totalLeads} leads</span>
        </div>
      </div>

      {/* Search & Filter Controls Matrix */}
      <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs mb-6 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#565e74] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by lead name, email, company, or message keyword..."
              className="w-full pl-9 pr-4 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4] shadow-2xs"
            />
          </div>

          {/* Quick Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[#0b1c30] text-[13px] font-medium shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-[#565e74]">calendar_today</span>
              <span>Last 30 Days</span>
              <span className="material-symbols-outlined text-[16px] text-[#565e74]">arrow_drop_down</span>
            </div>

            {/* Source Filter */}
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="appearance-none flex items-center gap-1.5 pl-3 pr-8 py-1.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[#0b1c30] text-[13px] font-medium shadow-2xs cursor-pointer focus:outline-none"
              >
                <option value="All">Source: All Inbounds</option>
                <option value="Hero Contact Form">Hero Contact Form</option>
                <option value="Enterprise Demo">Enterprise Demo</option>
                <option value="Partner Referral">Partner Referral</option>
                <option value="Organic Search">Organic Search</option>
                <option value="Pricing">Pricing Calculator</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#565e74] text-[16px] pointer-events-none">
                arrow_drop_down
              </span>
            </div>

            {/* Clear Filters Button */}
            {(searchFilter || selectedSource !== 'All' || selectedStatusTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchFilter('');
                  setSelectedSource('All');
                  setSelectedStatusTab('all');
                }}
                className="p-2 text-[#565e74] hover:text-[#0b1c30] bg-[#eff4ff] border border-[#dae2fd] rounded-lg shadow-2xs cursor-pointer"
                title="Clear Filters"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              </button>
            )}
          </div>
        </div>

        {/* Stage Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[#565e74]">
          <button
            onClick={() => setSelectedStatusTab('all')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap shadow-2xs cursor-pointer transition-all ${
              selectedStatusTab === 'all'
                ? 'bg-[#dee0ff] text-[#00105b]'
                : 'hover:bg-[#eff4ff]'
            }`}
          >
            All Statuses ({counts.all})
          </button>

          <button
            onClick={() => setSelectedStatusTab('new')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedStatusTab === 'new'
                ? 'bg-[#dee0ff] text-[#00105b]'
                : 'hover:bg-[#eff4ff]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#3b5bfd]"></span>
            <span>New Inquiries ({counts.new})</span>
          </button>

          <button
            onClick={() => setSelectedStatusTab('contacted')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedStatusTab === 'contacted'
                ? 'bg-[#dee0ff] text-[#00105b]'
                : 'hover:bg-[#eff4ff]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#d97706]"></span>
            <span>Contacted ({counts.contacted})</span>
          </button>

          <button
            onClick={() => setSelectedStatusTab('proposal')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedStatusTab === 'proposal'
                ? 'bg-[#dee0ff] text-[#00105b]'
                : 'hover:bg-[#eff4ff]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#565e74]"></span>
            <span>In Review ({counts.proposal})</span>
          </button>

          <button
            onClick={() => setSelectedStatusTab('converted')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedStatusTab === 'converted'
                ? 'bg-[#dee0ff] text-[#00105b]'
                : 'hover:bg-[#eff4ff]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#007e57]"></span>
            <span>Converted ({counts.converted})</span>
          </button>

          <button
            onClick={() => setSelectedStatusTab('lost')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedStatusTab === 'lost'
                ? 'bg-[#dee0ff] text-[#00105b]'
                : 'hover:bg-[#eff4ff]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            <span>Lost ({counts.lost})</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace: Split Layout with Table and Active Slide-out Drawer */}
      <div className="relative flex flex-col xl:flex-row gap-6 items-start">
        {/* Table Container (Flex-1) */}
        <div className="flex-1 w-full bg-white border border-[#e2e8f0] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eff4ff] border-b border-[#dae2fd] h-10">
                  <th className="w-10 px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredLeads.length > 0 &&
                        filteredLeads.every((l) => selectedCheckboxes[l.id])
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-[#143ee4] focus:ring-[#143ee4] accent-[#143ee4] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-2 text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                    Lead Contact
                  </th>
                  <th className="px-4 py-2 text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                    Source Form
                  </th>
                  <th className="px-4 py-2 text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-4 py-2 text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                    Assigned Rep
                  </th>
                  <th className="px-4 py-2 text-[11px] font-bold text-[#565e74] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {paginatedLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id && isDrawerOpen;
                  const isChecked = !!selectedCheckboxes[lead.id];

                  // Status style configuration
                  const statusStyles: Record<LeadStatus, { bg: string; text: string; dot: string; label: string }> = {
                    new: {
                      bg: 'bg-[#dee0ff]',
                      text: 'text-[#00105b]',
                      dot: 'bg-[#3b5bfd]',
                      label: 'NEW'
                    },
                    contacted: {
                      bg: 'bg-[#dae2fd]',
                      text: 'text-[#131b2e]',
                      dot: 'bg-[#d97706]',
                      label: 'CONTACTED'
                    },
                    proposal: {
                      bg: 'bg-[#bac3ff]',
                      text: 'text-[#00105b]',
                      dot: 'bg-[#143ee4]',
                      label: 'PROPOSAL'
                    },
                    converted: {
                      bg: 'bg-[#85f8c4]',
                      text: 'text-[#005137]',
                      dot: 'bg-[#006343]',
                      label: 'CONVERTED'
                    },
                    lost: {
                      bg: 'bg-[#ffdad6]',
                      text: 'text-[#93000a]',
                      dot: 'bg-[#ba1a1a]',
                      label: 'LOST'
                    }
                  };

                  const currentStyle = statusStyles[lead.status] || statusStyles.new;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id);
                        setIsDrawerOpen(true);
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#eff4ff]'
                          : 'hover:bg-[#f8f9ff]'
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td
                        className="px-4 py-3 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#143ee4]"></div>
                        )}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded text-[#143ee4] accent-[#143ee4] cursor-pointer"
                        />
                      </td>

                      {/* Lead Contact Cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full text-[13px] font-bold flex items-center justify-center shadow-xs ${
                              lead.status === 'converted'
                                ? 'bg-[#85f8c4] text-[#002114]'
                                : lead.status === 'lost'
                                ? 'bg-[#ffdad6] text-[#ba1a1a]'
                                : 'bg-[#3b5bfd] text-white'
                            }`}
                          >
                            {getInitials(lead.name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-bold text-[#0b1c30] flex items-center gap-1.5 leading-snug">
                              {lead.name}
                              {isSelected && (
                                <span
                                  className="material-symbols-outlined text-[15px] text-[#143ee4]"
                                  title="Drawer open"
                                >
                                  visibility
                                </span>
                              )}
                            </span>
                            <span className="text-[12px] text-[#565e74] truncate">
                              {lead.email}
                            </span>
                            <span className="font-mono text-[11px] text-[#747687]">
                              {lead.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Source Form Cell */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#eff4ff] border border-[#dae2fd] text-[#444656] text-[12px] font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-[#143ee4]">
                            {lead.source.includes('Demo')
                              ? 'bolt'
                              : lead.source.includes('Referral')
                              ? 'handshake'
                              : lead.source.includes('Search')
                              ? 'search'
                              : 'link'}
                          </span>
                          <span>{lead.source}</span>
                        </div>
                        {lead.sourcePage && (
                          <div className="text-[11px] text-[#747687] mt-0.5">
                            Page: {lead.sourcePage}
                          </div>
                        )}
                      </td>

                      {/* Received Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-[12px] font-medium text-[#0b1c30]">
                          {new Date(lead.receivedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                          ,{' '}
                          {new Date(lead.receivedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-[11px] font-bold text-[#143ee4] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#143ee4]"></span>
                          {lead.relativeTime}
                        </div>
                      </td>

                      {/* Status Dropdown Cell */}
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block">
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              handleInlineStatusChange(lead.id, e.target.value as LeadStatus)
                            }
                            className={`appearance-none inline-flex items-center gap-1.5 pl-3 pr-7 py-1 rounded-full text-[11px] font-bold cursor-pointer border border-transparent hover:border-[#94a3b8] focus:outline-none ${currentStyle.bg} ${currentStyle.text}`}
                          >
                            <option value="new">● NEW</option>
                            <option value="contacted">● CONTACTED</option>
                            <option value="proposal">● IN REVIEW</option>
                            <option value="converted">● CONVERTED</option>
                            <option value="lost">● LOST</option>
                          </select>
                          <span className="material-symbols-outlined text-[14px] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current">
                            arrow_drop_down
                          </span>
                        </div>
                      </td>

                      {/* Assigned Rep Cell */}
                      <td className="px-4 py-3">
                        {lead.assignedRep ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={lead.assignedRep.avatarUrl}
                              alt={lead.assignedRep.name}
                              className="w-6 h-6 rounded-full object-cover shadow-2xs"
                            />
                            <span className="text-[13px] text-[#0b1c30] font-medium whitespace-nowrap">
                              {lead.assignedRep.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#747687] italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Actions Cell */}
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setIsDrawerOpen(true);
                            }}
                            className="px-2.5 py-1 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded text-[12px] font-semibold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              edit_note
                            </span>
                            <span>View &amp; Notes</span>
                          </button>

                          <button
                            onClick={() => {
                              showToast(`Lead actions menu for ${lead.name}`);
                            }}
                            className="p-1 text-[#565e74] hover:text-[#0b1c30] rounded hover:bg-[#eff4ff] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              more_vert
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#747687]">
                      <span className="material-symbols-outlined text-[36px] text-[#cbd5e1] block mb-2">
                        inbox
                      </span>
                      <p className="text-[14px] font-medium">No leads match your filter criteria.</p>
                      <button
                        onClick={() => {
                          setSearchFilter('');
                          setSelectedSource('All');
                          setSelectedStatusTab('all');
                        }}
                        className="mt-3 px-3 py-1.5 bg-[#eff4ff] text-[#143ee4] rounded-lg text-[12px] font-bold hover:bg-[#dee0ff]"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="px-4 py-3 bg-white border-t border-[#e2e8f0] flex items-center justify-between">
            <span className="text-[13px] text-[#565e74]">
              Showing <span className="font-semibold text-[#0b1c30]">{filteredLeads.length ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-semibold text-[#0b1c30]">{Math.min(currentPage * pageSize, filteredLeads.length)}</span> of{' '}
              <span className="font-semibold text-[#0b1c30]">{filteredLeads.length}</span> leads
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#eff4ff] text-[#747687] hover:text-[#0b1c30] disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-[#143ee4] text-white shadow-2xs'
                      : 'hover:bg-[#eff4ff] text-[#0b1c30]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-[#eff4ff] text-[#565e74] hover:text-[#0b1c30] disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Right Slide-over Drawer */}
        {isDrawerOpen && selectedLead && (
          <LeadDetailDrawer
            key={selectedLead.id}
            lead={selectedLead}
            onClose={() => setIsDrawerOpen(false)}
            onLeadUpdated={(lead) => {
              // Local update triggers parent rerender
            }}
            onOpenReminderModal={onOpenReminderModal}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
};
