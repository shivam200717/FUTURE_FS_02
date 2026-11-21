import React, { useState } from 'react';
import { ShowToast } from '../types/crm';
import { api } from '../services/api';

interface PublicContactFormProps {
  onBackToCRM: () => void;
  showToast: ShowToast;
}

export const PublicContactForm: React.FC<PublicContactFormProps> = ({
  onBackToCRM,
  showToast
}) => {
  const emptyForm = {
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'Hero Contact Form',
    budget: '$5,000 – $15,000',
    timeline: '< 1 month',
    subject: '',
    message: ''
  };
  const [formData, setFormData] = useState(emptyForm);
  const [honeypot, setHoneypot] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);

  const presets = [
    {
      title: 'Enterprise Migration',
      data: {
        name: 'Jordan Miller',
        email: 'jordan@vortexenergy.co',
        phone: '+1 (713) 489-2210',
        company: 'Vortex Energy',
        source: 'Enterprise Demo Request',
        budget: '$30,000+',
        timeline: '< 1 month',
        subject: 'Enterprise Influx & CRM Architecture Review',
        message: 'Looking for a dedicated instance with custom webhook triggers and automated sales rep assignment.'
      }
    },
    {
      title: 'Agency Inbound',
      data: {
        name: 'Chloe Laurent',
        email: 'chloe@atelierdigital.fr',
        phone: '+33 1 42 68 55 00',
        company: 'Atelier Digital Paris',
        source: 'Hero Contact Form',
        budget: '$10,000 – $20,000',
        timeline: '1-2 months',
        subject: 'Marketing Agency Lead Management',
        message: 'We run digital ad campaigns for luxury clients and need to route leads to our 6 account leads immediately.'
      }
    },
    {
      title: 'Startup Pricing Inquiry',
      data: {
        name: 'Kenji Sato',
        email: 'kenji@synthetix.jp',
        phone: '+81 3 5555 0142',
        company: 'Synthetix AI',
        source: 'Pricing Calculator',
        budget: '$5,000 – $15,000',
        timeline: 'Immediate',
        subject: 'Pricing Calculator Submission',
        message: 'Calculated estimate for 25 seats. Ready to sign contract and begin onboarding.'
      }
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Same public endpoint a real website form would use - no login needed.
      const res = await api<{ formId: string }>('/api/contact-inbound', {
        method: 'POST',
        auth: false,
        body: { ...formData, sourcePage: window.location.pathname, website: honeypot }
      });
      setSubmittedLeadId(res.formId || 'received');
      showToast('Inquiry sent to the CRM');
    } catch (err: any) {
      showToast(err?.message || 'Could not send your inquiry. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      {/* Top Banner indicating Simulation Mode */}
      <div className="bg-[#0b1c30] text-white px-4 py-2.5 flex items-center justify-between text-[13px] border-b border-[#213145]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#007e57] animate-pulse"></span>
          <span className="font-bold">Public Website Inbound Simulator</span>
          <span className="text-[#94a3b8] hidden sm:inline">
            — Test how website visitors submit inquiries and how they instantly appear in your CRM dashboard
          </span>
        </div>
        <button
          onClick={onBackToCRM}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#143ee4] hover:bg-[#3b5bfd] text-white rounded text-[12px] font-bold shadow-xs cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Return to Admin CRM</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dee0ff] text-[#00105b] text-[12px] font-bold uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-[16px]">support_agent</span>
            <span>Client Contact Form</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-extrabold text-[#0b1c30] tracking-tight">
            Get in Touch with our Solutions Team
          </h1>
          <p className="text-[15px] text-[#565e74] max-w-xl mx-auto mt-2">
            Have questions regarding enterprise deployment, pricing tiers, or custom API webhooks?
            Fill in the form below and our team will get back to you shortly.
          </p>

          {/* Quick-Fill Presets */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-[12px] font-bold text-[#565e74]">Try Presets:</span>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setFormData(preset.data);
                  setSubmittedLeadId(null);
                  showToast(`Loaded "${preset.title}" preset data`);
                }}
                className="px-2.5 py-1 bg-white hover:bg-[#eff4ff] border border-[#dae2fd] text-[#143ee4] rounded text-[12px] font-semibold shadow-2xs transition-all cursor-pointer"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {submittedLeadId ? (
          /* Success Screen */
          <div className="bg-white rounded-2xl border border-[#dae2fd] p-8 shadow-xl text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#85f8c4] text-[#005137] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#007e57]">
                Submission Confirmed
              </span>
              <h2 className="text-[24px] font-bold text-[#0b1c30] mt-1">
                Thank You, {formData.name}!
              </h2>
              <p className="text-[14px] text-[#565e74] max-w-md mx-auto mt-1">
                Your inquiry has been assigned Form ID{' '}
                <strong className="text-[#0b1c30] font-mono">{submittedLeadId}</strong> and received by our team.
              </p>
            </div>

            <div className="bg-[#eff4ff] border border-[#dae2fd] rounded-xl p-4 max-w-md w-full text-left text-[13px] flex flex-col gap-1.5 font-mono">
              <div>
                <span className="text-[#565e74]">Company:</span> {formData.company}
              </div>
              <div>
                <span className="text-[#565e74]">Declared Budget:</span> {formData.budget}
              </div>
              <div>
                <span className="text-[#565e74]">Status in CRM:</span>{' '}
                <span className="text-[#143ee4] font-bold">NEW INBOUND</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onBackToCRM}
                className="px-6 py-2.5 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded-xl text-[14px] font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>View This Lead in Admin CRM Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button
                onClick={() => { setSubmittedLeadId(null); setFormData(emptyForm); }}
                className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#0b1c30] rounded-xl text-[14px] font-semibold hover:bg-[#eff4ff] cursor-pointer"
              >
                Submit Another Inquiry
              </button>
            </div>
          </div>
        ) : (
          /* Inbound Contact Form */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-xl flex flex-col gap-5"
          >
            {/* Honeypot: hidden from people, bots fill it in and get silently ignored */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Full Name <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Business Email <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Company / Organization <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Jenkins Logistics"
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Source Form Type
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                >
                  <option value="Hero Contact Form">Hero Contact Form</option>
                  <option value="Enterprise Demo Request">Enterprise Demo Request</option>
                  <option value="Pricing Calculator">Pricing Calculator</option>
                  <option value="Partner Referral">Partner Referral</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Declared Budget
                </label>
                <select
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                >
                  <option value="$5,000 – $15,000">$5,000 – $15,000</option>
                  <option value="$15,000 – $30,000">$15,000 – $30,000</option>
                  <option value="$30,000+">$30,000+</option>
                  <option value="Under $5,000">Under $5,000</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                  Target Timeline
                </label>
                <select
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
                >
                  <option value="< 1 month">&lt; 1 month</option>
                  <option value="1-2 months">1-2 months</option>
                  <option value="3+ months">3+ months</option>
                  <option value="Immediate">Immediate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Inquiry summary"
                className="w-full px-3.5 py-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#0b1c30] mb-1">
                Inquiry Message <span className="text-[#ba1a1a]">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Explain what your team is looking to achieve, requirements, and questions..."
                className="w-full p-3.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[14px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30 focus:border-[#143ee4] resize-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[12px] text-[#565e74]">
                Your details are sent securely to our team.
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#143ee4] hover:bg-[#002fc9] text-white font-bold text-[14px] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Ingesting to CRM...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Client Inquiry</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
