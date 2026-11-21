import React, { useState } from 'react';
import { Lead, NoteType, LeadStatus, ShowToast } from '../types/crm';
import { leadService } from '../services/leadService';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onOpenReminderModal?: (lead: Lead) => void;
  showToast: ShowToast;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  onClose,
  onLeadUpdated,
  onOpenReminderModal,
  showToast
}) => {
  if (!lead) return null;

  const [noteType, setNoteType] = useState<NoteType>('call');
  const [noteContent, setNoteContent] = useState('');
  const [noteDuration, setNoteDuration] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    try {
      const updated = await leadService.updateLeadStatus(lead.id, newStatus);
      if (updated) {
        onLeadUpdated?.(updated);
        showToast(`Lead stage updated to ${newStatus.toUpperCase()}`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not update the lead stage', 'error');
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      showToast('Please type a note before saving', 'error');
      return;
    }

    setIsSavingNote(true);
    try {
      const updated = await leadService.addNote(lead.id, {
        type: noteType,
        content: noteContent.trim(),
        metadata: { duration: noteType === 'call' ? noteDuration.trim() || undefined : undefined }
      });
      setNoteContent('');
      setNoteDuration('');
      onLeadUpdated?.(updated);
      showToast('Follow-up note saved to the lead timeline');
    } catch (err: any) {
      showToast(err?.message || 'Could not save the note', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="w-full xl:w-[410px] shrink-0 bg-white rounded-xl shadow-xl border border-[#e2e8f0] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Drawer Header Bar */}
      <div className="p-4 bg-[#eff4ff] border-b border-[#dae2fd] flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#143ee4] text-white text-[14px] font-bold flex items-center justify-center shadow-xs">
              {getInitials(lead.name)}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#143ee4] uppercase tracking-wider font-bold">
                Active Lead Review
              </span>
              <h2 className="text-[17px] text-[#0b1c30] font-bold leading-tight">
                {lead.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#565e74] hover:text-[#0b1c30] rounded-lg bg-white border border-[#dae2fd] shadow-2xs cursor-pointer transition-colors"
            title="Close Drawer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Status Transition Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleUpdateStatus('contacted')}
            className={`flex-1 py-1.5 px-2.5 text-[12px] rounded-lg flex items-center justify-center gap-1.5 shadow-xs font-semibold transition-all cursor-pointer ${
              lead.status === 'contacted'
                ? 'bg-[#dae2fd] text-[#131b2e] ring-2 ring-[#3b5bfd]'
                : 'bg-[#dae2fd] text-[#131b2e] hover:bg-[#bec6e0]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">call</span>
            <span>Mark Contacted</span>
          </button>

          <button
            onClick={() => handleUpdateStatus('converted')}
            className={`flex-1 py-1.5 px-2.5 text-[12px] rounded-lg flex items-center justify-center gap-1.5 shadow-xs font-semibold transition-all cursor-pointer ${
              lead.status === 'converted'
                ? 'bg-[#007e57] text-white ring-2 ring-[#006343]'
                : 'bg-[#006343] text-white hover:bg-[#007e57]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Mark Converted</span>
          </button>

          <button
            onClick={() => handleUpdateStatus('lost')}
            className="p-1.5 bg-[#eff4ff] text-[#565e74] hover:text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg border border-[#dae2fd] shadow-xs cursor-pointer transition-colors"
            title="Mark as Lost / Disqualify"
          >
            <span className="material-symbols-outlined text-[16px]">archive</span>
          </button>
        </div>
      </div>

      {/* Drawer Scrollable Body */}
      <div className="p-4 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-230px)]">
        {/* SECTION 1: Contact Form Payload / Original Message */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#143ee4]">
                mark_email_read
              </span>
              Original Inbound Payload
            </span>
            <span className="text-[11px] bg-[#eff4ff] text-[#143ee4] border border-[#dae2fd] px-2 py-0.5 rounded font-mono font-medium">
              Form ID: {lead.formId}
            </span>
          </div>

          <div className="bg-[#f8f9ff] border border-[#e2e8f0] p-3.5 rounded-xl flex flex-col gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#747687] uppercase font-bold tracking-wider">
                Subject
              </span>
              <span className="text-[14px] text-[#0b1c30] font-semibold mt-0.5">
                {lead.subject || 'Website Contact Form Submission'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-[#747687] uppercase font-bold tracking-wider">
                Submitted Message
              </span>
              <p className="text-[13px] text-[#0b1c30] leading-relaxed mt-1 bg-white border border-[#e2e8f0] p-3 rounded-lg shadow-2xs font-normal">
                {lead.message || '“Looking to evaluate LeadFlow CRM for our team.”'}
              </p>
            </div>

            {/* Budget & Timeline */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white border border-[#e2e8f0] p-2.5 rounded-lg shadow-2xs flex flex-col">
                <span className="text-[10px] text-[#747687] uppercase font-bold">
                  Declared Budget
                </span>
                <span className="text-[13px] font-mono text-[#143ee4] font-bold mt-0.5">
                  {lead.declaredBudget || '$15,000 – $30,000'}
                </span>
              </div>
              <div className="bg-white border border-[#e2e8f0] p-2.5 rounded-lg shadow-2xs flex flex-col">
                <span className="text-[10px] text-[#747687] uppercase font-bold">
                  Target Timeline
                </span>
                <span className="text-[13px] font-mono text-[#006343] font-bold mt-0.5">
                  {lead.targetTimeline || '< 1 month'}
                </span>
              </div>
            </div>

            {/* Metadata Info Row */}
            <div className="flex items-center justify-between text-[#747687] text-[11px] pt-1 border-t border-[#e2e8f0]">
              <span>IP: {lead.ip || '198.51.100.24 (San Francisco, CA)'}</span>
              <span>Ref: {lead.referrer || 'Google / Organic'}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Add Follow-up Note & Activity */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#143ee4]">
                edit_note
              </span>
              Add Follow-up Note &amp; Activity
            </span>
          </div>

          <form onSubmit={handleSaveNote} className="bg-[#f8f9ff] border border-[#e2e8f0] p-3.5 rounded-xl flex flex-col gap-3">
            {/* Note Type Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setNoteType('call')}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-all ${
                  noteType === 'call'
                    ? 'bg-[#143ee4] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">phone</span>
                <span>Call</span>
              </button>

              <button
                type="button"
                onClick={() => setNoteType('email')}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-all ${
                  noteType === 'email'
                    ? 'bg-[#143ee4] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">mail</span>
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setNoteType('meeting')}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-all ${
                  noteType === 'meeting'
                    ? 'bg-[#143ee4] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                <span>Meeting</span>
              </button>

              <button
                type="button"
                onClick={() => setNoteType('note')}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-all ${
                  noteType === 'note'
                    ? 'bg-[#143ee4] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">lock</span>
                <span>Internal Note</span>
              </button>
            </div>

            {/* Rich Textarea */}
            <div className="relative">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write a follow-up note, meeting summary, or next action step..."
                rows={3}
                className="w-full p-3 bg-white border border-[#e2e8f0] rounded-lg text-[13px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd] shadow-2xs resize-none"
              ></textarea>
            </div>

            {noteType === 'call' && (
              <input
                type="text"
                value={noteDuration}
                onChange={(e) => setNoteDuration(e.target.value)}
                placeholder="Call duration (optional), e.g. 12m 30s"
                maxLength={30}
                className="w-full px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[12px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd]"
              />
            )}

            {/* Quick Action Bar for Note */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-[#565e74]">
                <button
                  type="button"
                  onClick={() => {
                    onOpenReminderModal?.(lead);
                  }}
                  className="p-1 hover:text-[#143ee4] rounded hover:bg-white cursor-pointer"
                  title="Set reminder"
                >
                  <span className="material-symbols-outlined text-[18px]">alarm</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSavingNote}
                className="px-4 py-1.5 bg-[#143ee4] hover:bg-[#002fc9] text-white font-semibold text-[13px] rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Save Note</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: Activity Timeline & Notes History */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#565e74] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#006343]">
                history
              </span>
              Activity Timeline &amp; History
            </span>
            <span className="text-[11px] text-[#747687] font-medium">
              {lead.activityHistory?.length || 0} Events
            </span>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-6 flex flex-col gap-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#dae2fd]">
            {lead.activityHistory && lead.activityHistory.length > 0 ? (
              lead.activityHistory.map((event, idx) => {
                const isCall = event.type === 'note_logged' && event.title.includes('call');
                const isStage = event.type === 'stage_change';
                const isSubmission = event.type === 'submission';

                return (
                  <div key={event.id || idx} className="relative flex flex-col gap-1">
                    {/* Node icon */}
                    <span
                      className={`absolute -left-[29px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-xs text-white ${
                        isCall
                          ? 'bg-[#3b5bfd]'
                          : isStage
                          ? 'bg-[#d97706]'
                          : isSubmission
                          ? 'bg-[#007e57]'
                          : 'bg-[#565e74]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {isCall ? 'phone' : isStage ? 'sync_alt' : isSubmission ? 'input' : 'notes'}
                      </span>
                    </span>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-[#0b1c30]">
                          {event.author}
                        </span>
                        <span className="text-[12px] text-[#747687]">
                          {isCall ? 'logged a phone call' : isStage ? 'updated stage' : 'recorded event'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#747687]">
                        {event.timestamp}
                      </span>
                    </div>

                    <div className="bg-[#f8f9ff] border border-[#e2e8f0] p-2.5 rounded-lg shadow-2xs mt-0.5">
                      <p className="text-[13px] text-[#0b1c30] leading-relaxed">
                        {event.detail}
                      </p>
                      {isCall && event.duration && (
                        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-[#e2e8f0]/60">
                          <span className="text-[11px] text-[#565e74]">Duration: {event.duration}</span>
                        </div>
                      )}
                      {isStage && event.fromStage && event.toStage && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                          <span className="px-1.5 py-0.2 rounded bg-white border border-[#e2e8f0] font-bold text-[#565e74]">
                            {event.fromStage.toUpperCase()}
                          </span>
                          <span className="material-symbols-outlined text-[12px] text-[#747687]">
                            arrow_forward
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#dee0ff] text-[#00105b] font-bold">
                            {event.toStage.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[13px] text-[#747687] italic py-2">
                No activity logged yet. Add a note or call update above.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer Controls */}
      <div className="p-3.5 bg-[#eff4ff] border-t border-[#dae2fd] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#747687] text-[18px]">
            schedule
          </span>
          <span className="text-[12px] text-[#747687] font-medium">
            Next follow-up: {lead.nextFollowUp || 'Not scheduled'}
          </span>
        </div>
        <button
          onClick={() => {
            onOpenReminderModal?.(lead);
          }}
          className="text-[12px] text-[#143ee4] hover:underline font-bold cursor-pointer"
        >
          Schedule Reminder
        </button>
      </div>
    </div>
  );
};
