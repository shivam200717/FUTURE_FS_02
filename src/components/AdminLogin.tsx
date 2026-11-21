import React, { useState } from 'react';
import { api, storeToken } from '../services/api';
import { avatarFor } from '../services/leadService';
import { SalesRep } from '../types/crm';

interface AdminLoginProps {
  onLoginSuccess: (user: SalesRep) => void;
  onOpenPublicForm: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onOpenPublicForm }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: Omit<SalesRep, 'avatarUrl'> }>('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
        auth: false
      });
      storeToken(res.token, rememberSession);
      onLoginSuccess({ ...res.user, avatarUrl: avatarFor(res.user.name) });
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please try again.');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8f9ff]">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dee0ff] text-[#00105b] font-mono text-[11px] font-bold tracking-wider uppercase">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>Admin access only</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl border border-[#e2e8f0] overflow-hidden flex flex-col p-6 sm:p-8 gap-5 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#143ee4] via-[#3b5bfd] to-[#007e57]"></div>

          <div className="flex flex-col items-center text-center gap-2 pt-1">
            <div className="w-12 h-12 rounded-xl bg-[#eff4ff] border border-[#dae2fd] flex items-center justify-center text-[#143ee4]">
              <span className="material-symbols-outlined text-[28px]">show_chart</span>
            </div>
            <h1 className="text-[22px] font-bold text-[#0b1c30] tracking-tight">LeadFlow CRM</h1>
            <p className="text-[13px] text-[#565e74] max-w-sm">
              Sign in to view and manage your client leads.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] text-[13px]">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-[#0b1c30]" htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#dae2fd] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-[#0b1c30]" htmlFor="admin-password">Password</label>
              <div className="relative flex items-center">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#eff4ff] border border-[#dae2fd] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 text-[#565e74] hover:text-[#0b1c30] flex items-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="w-4 h-4 rounded accent-[#143ee4] cursor-pointer"
              />
              <span className="text-[13px] text-[#565e74]">Keep me signed in on this device</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full h-11 rounded-lg text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-md bg-[#143ee4] hover:bg-[#002fc9] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        <button
          onClick={onOpenPublicForm}
          className="text-[13px] text-[#143ee4] hover:underline font-semibold self-center cursor-pointer"
        >
          Preview the public website contact form
        </button>
      </div>
    </div>
  );
};
