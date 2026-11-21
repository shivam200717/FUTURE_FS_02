import React, { useState } from 'react';
import { LeadStatus, ShowToast } from '../types/crm';
import { leadService } from '../services/leadService';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: ShowToast;
}

const AddLeadForm: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Hero Contact Form');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [dealValue, setDealValue] = useState('');
  const [message, setMessage] = useState('');
  const reps = leadService.getReps();
  const [assignedRepId, setAssignedRepId] = useState(reps[0]?.id || '');

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    const value = Math.max(0, Number(dealValue) || 0);

    setIsSaving(true);
    try {
      const created = await leadService.createLead({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        status,
        dealValue: value,
        declaredBudget: value ? `$${value.toLocaleString()}` : '',
        message: message.trim(),
        assignedRepId: assignedRepId || undefined
      });
      showToast(`Lead created! Form ID: ${created.formId}`);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Could not create the lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1c30]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-[#e2e8f0]">
        <div className="px-6 py-4 bg-[#eff4ff] border-b border-[#dae2fd] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#143ee4] text-[22px]">
              person_add
            </span>
            <h3 className="text-[17px] font-bold text-[#0b1c30]">Add Inbound Lead</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#565e74] hover:text-[#0b1c30] p-1 rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
              Contact Full Name <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Taylor Reed"
              className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Company <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Email Address <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="taylor@acme.com"
                className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Source Form
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white"
              >
                <option value="Hero Contact Form">Hero Contact Form</option>
                <option value="Enterprise Demo Request">Enterprise Demo Request</option>
                <option value="Pricing Calculator">Pricing Calculator</option>
                <option value="Partner Referral">Partner Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Est. Value ($)
              </label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="10000"
                className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white"
              >
                <option value="new">New Inbound</option>
                <option value="contacted">Contacted</option>
                <option value="proposal">Proposal / Review</option>
                <option value="converted">Converted Client</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Assigned Rep
              </label>
              <select
                value={assignedRepId}
                onChange={(e) => setAssignedRepId(e.target.value)}
                className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white"
              >
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
              Inbound Notes / Scope Summary
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Key requirements, requested features, or meeting timeline..."
              className="w-full p-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white resize-none"
            ></textarea>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#eff4ff] hover:bg-[#dee0ff] text-[#0b1c30] rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded-lg text-[13px] font-bold shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddLeadModal: React.FC<AddLeadModalProps> = (props) =>
  props.isOpen ? <AddLeadForm {...props} /> : null;
