import React, { useState } from 'react';
import { Lead, ShowToast } from '../types/crm';
import { leadService } from '../services/leadService';
import { formatDue, toLocalInputValue } from '../utils/time';

interface ScheduleReminderModalProps {
  lead: Lead | null;
  onClose: () => void;
  showToast: ShowToast;
}

/** Default: tomorrow at 10:00 local time. */
function tomorrowAtTen(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

const ReminderForm: React.FC<{ lead: Lead; onClose: () => void; showToast: ShowToast }> = ({ lead, onClose, showToast }) => {
  const [dueAt, setDueAt] = useState(toLocalInputValue(tomorrowAtTen()));
  const [taskTitle, setTaskTitle] = useState(`Follow up with ${lead.name}`);
  const [taskDesc, setTaskDesc] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const presets: { label: string; build: () => Date }[] = [
    { label: 'In 2 hours', build: () => new Date(Date.now() + 2 * 3600_000) },
    { label: 'Tomorrow, 10 AM', build: tomorrowAtTen },
    {
      label: 'Next Monday, 10 AM',
      build: () => {
        const d = new Date();
        d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
        d.setHours(10, 0, 0, 0);
        return d;
      }
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) {
      showToast('Please choose a valid date and time', 'error');
      return;
    }
    if (!taskTitle.trim()) {
      showToast('Please enter a title for the reminder', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await leadService.createScheduledTask({
        leadId: lead.id,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        dueAt: due.toISOString(),
        isUrgent
      });
      showToast(`Follow-up scheduled for ${formatDue(due.toISOString())}`);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Could not schedule the follow-up', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const input =
    'w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1c30]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-[#e2e8f0]">
        <div className="px-6 py-4 bg-[#eff4ff] border-b border-[#dae2fd] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#143ee4] text-[22px]">alarm_add</span>
            <h3 className="text-[17px] font-bold text-[#0b1c30]">Schedule Follow-Up</h3>
          </div>
          <button onClick={onClose} className="text-[#565e74] hover:text-[#0b1c30] p-1 rounded cursor-pointer" aria-label="Close">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="bg-[#eff4ff] border border-[#dae2fd] p-3 rounded-lg flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#143ee4] text-[20px]">person</span>
            <div>
              <div className="text-[13px] font-bold text-[#0b1c30]">{lead.name}</div>
              <div className="text-[12px] text-[#565e74]">{[lead.company, lead.email].filter(Boolean).join(' • ')}</div>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#0b1c30] mb-1" htmlFor="reminder-title">Reminder</label>
            <input id="reminder-title" type="text" value={taskTitle} maxLength={200} onChange={(e) => setTaskTitle(e.target.value)} className={input} />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#0b1c30] mb-1" htmlFor="reminder-due">When</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDueAt(toLocalInputValue(p.build()))}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold border bg-white border-[#e2e8f0] text-[#565e74] hover:border-[#143ee4] hover:text-[#143ee4] transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input id="reminder-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={`${input} mt-2`} />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#0b1c30] mb-1" htmlFor="reminder-desc">Notes (optional)</label>
            <textarea id="reminder-desc" rows={2} value={taskDesc} maxLength={1000} onChange={(e) => setTaskDesc(e.target.value)} className={`${input} resize-none`} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="w-4 h-4 accent-[#143ee4] cursor-pointer" />
            <span className="text-[13px] text-[#565e74]">Mark as urgent</span>
          </label>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#e2e8f0]">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[#eff4ff] hover:bg-[#dee0ff] text-[#0b1c30] rounded-lg text-[13px] font-semibold cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded-lg text-[13px] font-bold shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ScheduleReminderModal: React.FC<ScheduleReminderModalProps> = ({ lead, onClose, showToast }) =>
  lead ? <ReminderForm key={lead.id} lead={lead} onClose={onClose} showToast={showToast} /> : null;
