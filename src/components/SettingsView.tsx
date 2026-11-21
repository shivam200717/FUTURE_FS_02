import React, { useState } from 'react';
import { SalesRep, ShowToast } from '../types/crm';
import { SLA_TARGET_MINUTES } from '../utils/stats';

interface SettingsViewProps {
  showToast: ShowToast;
  currentUser: SalesRep;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ showToast, currentUser, onSignOut }) => {
  const [copied, setCopied] = useState<'snippet' | 'url' | null>(null);
  const endpoint = `${window.location.origin}/api/contact-inbound`;

  const snippet = `<!-- Paste into your website: posts straight into this CRM -->
<form id="lead-form">
  <input name="name" placeholder="Full name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="company" placeholder="Company" />
  <input name="phone" placeholder="Phone" />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <!-- spam trap: leave hidden, real visitors never fill it -->
  <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" />
  <button type="submit">Send</button>
</form>

<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('${endpoint}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...Object.fromEntries(new FormData(e.target)), source: 'Website Contact Form' })
  });
  const data = await res.json();
  alert(res.ok ? 'Thanks! Reference ' + data.formId : data.error);
});
</script>`;

  const copy = async (text: string, kind: 'snippet' | 'url', message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      showToast(message);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast('Could not copy automatically - select the text and copy it manually', 'error');
    }
  };

  const card = 'bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs flex flex-col gap-4';

  return (
    <div className="flex flex-col w-full gap-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-1.5 text-[#565e74] text-[11px] uppercase tracking-wider font-bold">
          <span>Administration</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#143ee4]">Settings</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#0b1c30] tracking-tight mt-1">Settings &amp; Website Integration</h1>
      </div>

      {/* Webhook */}
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#eff4ff] rounded-xl text-[#143ee4]">
            <span className="material-symbols-outlined text-[24px]">webhook</span>
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#0b1c30]">Connect your website contact form</h3>
            <p className="text-[13px] text-[#565e74]">
              Any form can send leads here with a JSON POST. No login is needed for this one endpoint, and it can only create leads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[12px] font-mono text-[#0b1c30] overflow-x-auto whitespace-nowrap">
            POST {endpoint}
          </code>
          <button
            onClick={() => copy(endpoint, 'url', 'Endpoint URL copied')}
            className="px-3 py-2 bg-white border border-[#e2e8f0] hover:border-[#143ee4] text-[#143ee4] rounded-lg text-[12px] font-bold cursor-pointer"
          >
            {copied === 'url' ? 'Copied' : 'Copy URL'}
          </button>
        </div>

        <div className="text-[12px] text-[#565e74] leading-relaxed">
          <strong className="text-[#0b1c30]">Fields:</strong> <code>name</code> and <code>email</code> are required. Optional:{' '}
          <code>company</code>, <code>phone</code>, <code>message</code>, <code>subject</code>, <code>source</code>, <code>budget</code>{' '}
          (e.g. "$15,000 – $30,000", used to estimate the deal value), <code>timeline</code>. Limits: 10 submissions per hour per IP address.
        </div>

        <div className="relative">
          <pre className="p-4 bg-[#0b1c30] text-[#dce9ff] rounded-lg text-[12px] leading-relaxed overflow-x-auto max-h-72">{snippet}</pre>
          <button
            onClick={() => copy(snippet, 'snippet', 'Embed snippet copied to clipboard')}
            className="absolute top-3 right-3 px-3 py-1.5 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded-lg text-[12px] font-bold cursor-pointer"
          >
            {copied === 'snippet' ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="text-[12px] text-[#565e74]">
          Want to see it work? Open the standalone demo form at{' '}
          <a href="/contact-demo.html" target="_blank" rel="noreferrer" className="text-[#143ee4] font-semibold hover:underline">
            /contact-demo.html
          </a>{' '}
          - submit it, and the lead appears in <strong>All Leads</strong> within seconds.
        </div>
      </div>

      {/* Workflow */}
      <div className={card}>
        <h3 className="text-[17px] font-bold text-[#0b1c30]">How leads move</h3>
        <ol className="text-[13px] text-[#565e74] leading-relaxed list-decimal pl-5 flex flex-col gap-1">
          <li><strong className="text-[#0b1c30]">New</strong> - a lead arrives from a website form or is added manually. A follow-up task is created automatically (due in 2 hours).</li>
          <li><strong className="text-[#0b1c30]">Contacted</strong> - you reached out. The time since it arrived is your response time (target: under {SLA_TARGET_MINUTES} minutes).</li>
          <li><strong className="text-[#0b1c30]">Proposal</strong> - a quote or proposal has been sent.</li>
          <li><strong className="text-[#0b1c30]">Converted</strong> - they became a client. <strong className="text-[#0b1c30]">Lost</strong> - they didn't. Both feed the analytics.</li>
        </ol>
      </div>

      {/* Account */}
      <div className={card}>
        <h3 className="text-[17px] font-bold text-[#0b1c30]">Your account</h3>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={currentUser.avatarUrl} alt="" className="w-11 h-11 rounded-full" />
            <div>
              <div className="text-[14px] font-bold text-[#0b1c30]">{currentUser.name}</div>
              <div className="text-[12px] text-[#565e74]">{currentUser.email} • {currentUser.role}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="px-4 py-2 bg-[#ffdad6]/50 hover:bg-[#ffdad6] text-[#ba1a1a] rounded-lg text-[13px] font-bold cursor-pointer"
          >
            Sign out
          </button>
        </div>
        <p className="text-[12px] text-[#565e74]">
          To change the password or add another admin, run <code>npm run create-admin</code> on the server (see the README).
        </p>
      </div>
    </div>
  );
};
