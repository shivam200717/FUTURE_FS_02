import React from 'react';
import { SalesRep } from '../types/crm';

export interface HeaderNotification {
  id: string;
  title: string;
  source: string;
  time: string;
  at: number;
  unread?: boolean;
}

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  submissionsCount: number;
  currentUser: SalesRep;
  notifications: HeaderNotification[];
  onMarkNotificationsRead: () => void;
  onOpenProfile: () => void;
  onOpenNewLeadModal: () => void;
  onExportCSV: () => void;
  onToggleContactForm: () => void;
  onLockSession: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  submissionsCount,
  currentUser,
  notifications,
  onMarkNotificationsRead,
  onOpenProfile,
  onOpenNewLeadModal,
  onExportCSV,
  onToggleContactForm,
  onLockSession,
  activeView
}) => {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-[#e2e8f0] z-40 flex items-center justify-between px-4 lg:px-8">
      {/* Left: Search input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#565e74] text-[18px]">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads by name, email, company, or message..."
            className="w-full pl-9 pr-12 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[13px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd] shadow-xs transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#565e74] bg-[#eff4ff] border border-[#dae2fd] px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>

        <button
          onClick={() => {
            if (searchInputRef.current) {
              searchInputRef.current.focus();
            }
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#565e74] hover:text-[#0b1c30] border border-[#e2e8f0] rounded-lg text-[13px] font-medium shadow-xs transition-colors cursor-pointer"
          title="Filter Leads"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Filter</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4 ml-3">
        {/* Public Website Contact Form Quick Switcher */}
        <button
          onClick={onToggleContactForm}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dee0ff] text-[#143ee4] border border-[#bac3ff] rounded-lg text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          title="Open the public website contact form"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          <span>Public Contact Form</span>
        </button>

        {/* Submissions count pill */}
        <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-[#e2e8f0] shadow-2xs">
          <span className="material-symbols-outlined text-[#006343] text-[18px]">input</span>
          <span className="text-[13px] text-[#565e74]">Total leads:</span>
          <span className="text-[13px] font-bold text-[#0b1c30]">{submissionsCount}</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-[#565e74] hover:text-[#0b1c30] hover:bg-white rounded-lg border border-transparent hover:border-[#e2e8f0] transition-colors cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full ring-2 ring-[#f8f9ff]"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#e2e8f0] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-[#e2e8f0] flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#0b1c30]">Needs your attention</span>
                <span className="text-[11px] bg-[#dee0ff] text-[#00105b] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              </div>
              <div className="divide-y divide-[#f1f5f9] max-h-64 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-4 text-[13px] text-[#565e74] text-center">Nothing needs your attention right now.</div>
                )}
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 hover:bg-[#f8f9ff] transition-colors cursor-pointer ${
                      notif.unread ? 'bg-[#eff4ff]/60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[13px] font-semibold text-[#0b1c30]">{notif.title}</span>
                      <span className="text-[11px] text-[#565e74] whitespace-nowrap">{notif.time}</span>
                    </div>
                    <span className="text-[12px] text-[#565e74] block mt-0.5">{notif.source}</span>
                  </div>
                ))}
              </div>
              <div className="px-3 pt-2 pb-1 border-t border-[#e2e8f0] text-center">
                <button
                  onClick={() => { onMarkNotificationsRead(); setShowNotifications(false); }}
                  className="text-[12px] text-[#143ee4] hover:underline font-semibold"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-white border border-transparent hover:border-[#e2e8f0] transition-colors cursor-pointer"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-[#dee0ff]"
            />
            <div className="hidden md:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-[#0b1c30] leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[11px] font-bold bg-[#dee0ff] text-[#00105b] px-1.5 py-0.2 rounded">
                  {currentUser.role}
                </span>
              </div>
              <span className="text-[12px] text-[#565e74] leading-tight mt-0.5">
                {currentUser.email}
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-[#565e74]">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e2e8f0] py-1.5 z-50">
              <div className="px-4 py-2 border-b border-[#e2e8f0]">
                <div className="text-[13px] font-bold text-[#0b1c30]">{currentUser.name}</div>
                <div className="text-[12px] text-[#565e74]">{currentUser.email}</div>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onOpenProfile();
                }}
                className="w-full text-left px-4 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-[#143ee4]">account_circle</span>
                <span>My profile</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onToggleContactForm();
                }}
                className="w-full text-left px-4 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-[#143ee4]">web</span>
                <span>Open Public Website Form</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onOpenNewLeadModal();
                }}
                className="w-full text-left px-4 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-[#006343]">add_circle</span>
                <span>Create Inbound Lead</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onExportCSV();
                }}
                className="w-full text-left px-4 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-[#565e74]">download</span>
                <span>Export All Leads (CSV)</span>
              </button>
              <div className="border-t border-[#e2e8f0] my-1"></div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLockSession();
                }}
                className="w-full text-left px-4 py-2 text-[13px] text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Lock Session / Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
