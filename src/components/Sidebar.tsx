import React from 'react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  leadsCount: number;
  newLeads24h: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onToggleContactForm: () => void;
  onShowAdminLogin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  leadsCount,
  newLeads24h,
  isOpenMobile,
  onCloseMobile,
  onToggleContactForm,
  onShowAdminLogin
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'dashboard',
      badge: null
    },
    {
      id: 'leads',
      label: 'All Leads',
      icon: 'people',
      badge: String(leadsCount)
    },
    {
      id: 'pipeline',
      label: 'Pipeline Board',
      icon: 'view_kanban',
      badge: null
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: 'monitoring',
      badge: null
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: 'account_circle',
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'tune',
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#0b1c30]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-[#eff4ff] border-r border-[#dae2fd] shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between py-6 px-4 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#143ee4] flex items-center justify-center text-white shadow-xs font-bold text-base">
                <span className="material-symbols-outlined text-[20px]">show_chart</span>
              </div>
              <span className="text-[18px] text-[#0b1c30] font-bold tracking-tight">
                LeadFlow
              </span>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-[#565e74] hover:text-[#0b1c30] rounded cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Last 24 hours Ribbon */}
          <div className="px-2">
            <div className="bg-[#e5eeff] rounded-lg p-2.5 flex items-center justify-between border border-[#dae2fd]/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#007e57] animate-pulse"></span>
                <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                  Last 24 hours
                </span>
              </div>
              <span className="text-[13px] font-bold text-[#0b1c30] tracking-tight">
                {newLeads24h} new
              </span>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex flex-col gap-1 px-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#3b5bfd] text-white font-semibold shadow-xs'
                      : 'text-[#444656] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#dce9ff] text-[#444656]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & Status */}
        <div className="flex flex-col gap-3 px-2">
          {/* Quick Switch to Public Contact Form */}
          <button
            onClick={onToggleContactForm}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-[#dee0ff] text-[#143ee4] border border-[#bac3ff] rounded-lg text-[12px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Public Contact Form</span>
          </button>

          {/* Database Badge */}
          <div className="flex items-center gap-3 p-2 bg-[#e5eeff] rounded-lg border border-[#dae2fd]">
            <span className="material-symbols-outlined text-[#143ee4] text-[20px]">
              bolt
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#0b1c30] font-bold">
                Database
              </span>
              <span className="text-[11px] text-[#565e74]">
                Synced with server
              </span>
            </div>
          </div>

          <button
            onClick={onShowAdminLogin}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg text-[12px] font-semibold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
