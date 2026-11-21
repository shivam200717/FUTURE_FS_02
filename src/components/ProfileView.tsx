import React, { useState } from 'react';
import { Lead, SalesRep, ShowToast } from '../types/crm';
import { api } from '../services/api';
import { avatarFor } from '../services/leadService';
import { formatMoney } from '../utils/stats';

interface ProfileViewProps {
  currentUser: SalesRep;
  leads: Lead[];
  showToast: ShowToast;
  onUserUpdated: (user: SalesRep) => void;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, leads, showToast, onUserUpdated, onSignOut }) => {
  const [name, setName] = useState(currentUser.name);
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const mine = leads.filter((l) => l.assignedRep?.id === currentUser.id);
  const won = mine.filter((l) => l.status === 'converted');
  const open = mine.filter((l) => ['new', 'contacted', 'proposal'].includes(l.status));
  const initials = currentUser.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentUser.name) return;
    setSavingName(true);
    try {
      const res = await api<{ user: Omit<SalesRep, 'avatarUrl'> }>('/api/auth/me', { method: 'PATCH', body: { name: name.trim() } });
      onUserUpdated({ ...res.user, avatarUrl: avatarFor(res.user.name) });
      showToast('Profile updated');
    } catch (err: any) {
      showToast(err?.message || 'Could not update your profile', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return showToast('The new passwords do not match', 'error');
    setSavingPassword(true);
    try {
      await api('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed');
    } catch (err: any) {
      showToast(err?.message || 'Could not change the password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const card = 'bg-white border border-[#e2e8f0] rounded-xl shadow-xs p-6 flex flex-col gap-4';
  const label = 'block text-[12px] font-bold text-[#0b1c30] mb-1';
  const input =
    'w-full px-3 py-2 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#143ee4]/30';
  const button = 'px-4 py-2 bg-[#143ee4] hover:bg-[#002fc9] text-white rounded-lg text-[13px] font-bold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-[26px] font-bold text-[#0b1c30] tracking-tight">My profile</h1>
        <p className="text-[13px] text-[#565e74]">Your account details and your own lead numbers.</p>
      </div>

      <div className={`${card} sm:flex-row sm:items-center`}>
        <img src={currentUser.avatarUrl} alt={initials} className="w-20 h-20 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[20px] font-bold text-[#0b1c30] truncate">{currentUser.name}</div>
          <div className="text-[13px] text-[#565e74] truncate">{currentUser.email}</div>
          <span className="inline-block mt-1 text-[11px] font-bold bg-[#dee0ff] text-[#00105b] px-2 py-0.5 rounded">{currentUser.role}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-[22px] font-extrabold text-[#0b1c30]">{mine.length}</div><div className="text-[11px] text-[#565e74] uppercase font-bold tracking-wider">Assigned</div></div>
          <div><div className="text-[22px] font-extrabold text-[#0b1c30]">{open.length}</div><div className="text-[11px] text-[#565e74] uppercase font-bold tracking-wider">Open</div></div>
          <div><div className="text-[22px] font-extrabold text-[#006343]">{won.length}</div><div className="text-[11px] text-[#565e74] uppercase font-bold tracking-wider">Won</div></div>
        </div>
      </div>
      <div className="text-[12px] text-[#565e74] -mt-3">
        Revenue won by you: <strong className="text-[#0b1c30]">{formatMoney(won.reduce((n, l) => n + (l.dealValue || 0), 0))}</strong>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={saveName} className={card}>
          <h2 className="text-[16px] font-bold text-[#0b1c30]">Account details</h2>
          <div>
            <label className={label} htmlFor="profile-name">Display name</label>
            <input id="profile-name" className={input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            <p className="text-[11px] text-[#747687] mt-1">Shown on notes and in the activity timeline.</p>
          </div>
          <div>
            <label className={label} htmlFor="profile-email">Email (used to sign in)</label>
            <input id="profile-email" className={`${input} opacity-70`} value={currentUser.email} disabled />
          </div>
          <div className="flex justify-end">
            <button type="submit" className={button} disabled={savingName || !name.trim() || name.trim() === currentUser.name}>
              {savingName ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>

        <form onSubmit={changePassword} className={card}>
          <h2 className="text-[16px] font-bold text-[#0b1c30]">Change password</h2>
          <div>
            <label className={label} htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" className={input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="pw-new">New password</label>
            <input id="pw-new" type="password" autoComplete="new-password" className={input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="pw-confirm">Confirm new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" className={input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button type="submit" className={button} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>
              {savingPassword ? 'Saving...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <button onClick={onSignOut} className="px-4 py-2 bg-[#ffdad6]/50 hover:bg-[#ffdad6] text-[#ba1a1a] rounded-lg text-[13px] font-bold cursor-pointer">
          Sign out
        </button>
      </div>
    </div>
  );
};
