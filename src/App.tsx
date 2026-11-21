/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header, HeaderNotification } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { AllLeadsView } from './components/AllLeadsView';
import { PipelineBoardView } from './components/PipelineBoardView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { AdminLogin } from './components/AdminLogin';
import { PublicContactForm } from './components/PublicContactForm';
import { AddLeadModal } from './components/AddLeadModal';
import { ScheduleReminderModal } from './components/ScheduleReminderModal';
import { NotificationToast } from './components/NotificationToast';
import { leadService, avatarFor } from './services/leadService';
import { api, clearToken, getToken, setUnauthorizedHandler } from './services/api';
import { Lead, SalesRep } from './types/crm';
import { timeAgo } from './utils/time';

type View = 'overview' | 'leads' | 'pipeline' | 'analytics' | 'settings' | 'profile';
const POLL_MS = 30_000;
const SEEN_KEY = 'leadflow_notifications_seen_at';

export default function App() {
  const [currentUser, setCurrentUser] = useState<SalesRep | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('overview');
  const [showPublicForm, setShowPublicForm] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState(leadService.calculateStats());
  const [tasks, setTasks] = useState(leadService.getTasks());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [activeReminderLead, setActiveReminderLead] = useState<Lead | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [seenAt, setSeenAt] = useState<number>(() => Number(localStorage.getItem(SEEN_KEY)) || 0);

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const syncFromService = useCallback(() => {
    setLeads(leadService.getLeads());
    setStats(leadService.calculateStats());
    setTasks(leadService.getTasks());
  }, []);

  const handleLogout = useCallback((message?: string) => {
    clearToken();
    leadService.clear();
    setCurrentUser(null);
    setSearchQuery('');
    if (message) showToast(message, 'error');
  }, [showToast]);

  // A 401 from any API call means the session is over.
  useEffect(() => {
    setUnauthorizedHandler(() => handleLogout('Your session expired. Please sign in again.'));
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  // On first load, restore the session if a valid token is stored.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getToken()) {
        try {
          const res = await api<{ user: Omit<SalesRep, 'avatarUrl'> }>('/api/auth/me');
          if (!cancelled) setCurrentUser({ ...res.user, avatarUrl: avatarFor(res.user.name) });
        } catch {
          clearToken();
        }
      }
      if (!cancelled) setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Subscribe to the data service
  useEffect(() => leadService.subscribe(syncFromService), [syncFromService]);

  // Load data after login, then poll so new website leads show up without a manual reload.
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    setDataError(null);
    leadService.load().catch((err) => active && setDataError(err?.message || 'Could not load leads'));
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') leadService.refresh();
    }, POLL_MS);
    const onFocus = () => leadService.refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser]);

  const handleExportCSV = () => {
    const csvContent = leadService.exportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leadflow-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported leads to CSV');
  };

  // Header search filters the table and the pipeline board.
  const visibleLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.company, l.message, l.subject, l.formId, l.source].some((f) => (f || '').toLowerCase().includes(q))
    );
  }, [leads, searchQuery]);

  // Notifications = real events: newest uncontacted leads + overdue follow-ups.
  const notifications: HeaderNotification[] = useMemo(() => {
    const items: HeaderNotification[] = [];
    leads
      .filter((l) => l.status === 'new')
      .slice(0, 5)
      .forEach((l) => items.push({ id: `lead-${l.id}`, title: `New lead: ${l.name}`, source: `${l.source}${l.company ? ' - ' + l.company : ''}`, time: l.relativeTime, at: new Date(l.receivedAt).getTime() }));
    tasks
      .filter((t) => t.isOverdue)
      .slice(0, 5)
      .forEach((t) => items.push({ id: `task-${t.id}`, title: `Overdue follow-up: ${t.leadName}`, source: t.title, time: timeAgo(t.dueAt), at: new Date(t.dueAt).getTime() }));
    return items
      .sort((a, b) => b.at - a.at)
      .slice(0, 8)
      .map((n) => ({ ...n, unread: n.at > seenAt }));
  }, [leads, tasks, seenAt]);

  const markNotificationsRead = () => {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setSeenAt(now);
  };

  if (showPublicForm) {
    return (
      <>
        <PublicContactForm
          onBackToCRM={() => { setShowPublicForm(false); if (currentUser) leadService.refresh(); }}
          showToast={showToast}
        />
        <NotificationToast message={toast?.message ?? null} tone={toast?.tone} onClose={closeToast} />
      </>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff] text-[#565e74] text-[14px]">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AdminLogin
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setCurrentView('overview');
            showToast(`Signed in as ${user.name}`);
          }}
          onOpenPublicForm={() => setShowPublicForm(true)}
        />
        <NotificationToast message={toast?.message ?? null} tone={toast?.tone} onClose={closeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v as View)}
        leadsCount={leads.length}
        newLeads24h={stats.last24h}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onToggleContactForm={() => setShowPublicForm(true)}
        onShowAdminLogin={() => handleLogout()}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          submissionsCount={leads.length}
          currentUser={currentUser}
          notifications={notifications}
          onMarkNotificationsRead={markNotificationsRead}
          onOpenProfile={() => setCurrentView('profile')}
          onOpenNewLeadModal={() => setIsAddLeadModalOpen(true)}
          onExportCSV={handleExportCSV}
          onToggleContactForm={() => setShowPublicForm(true)}
          onLockSession={() => handleLogout()}
          activeView={currentView}
        />

        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-3 bg-[#143ee4] text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer"
            title="Open Menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>

        <main className="w-full pt-16 bg-[#f8f9ff] flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
          {dataError && (
            <div role="alert" className="mt-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] text-[13px]">
              <span>Could not load your leads: {dataError}</span>
              <button
                onClick={() => { setDataError(null); leadService.load().catch((e) => setDataError(e?.message || 'Could not load leads')); }}
                className="font-bold underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {currentView === 'overview' && (
            <OverviewView
              leads={leads}
              stats={stats}
              tasks={tasks}
              onOpenNewLeadModal={() => setIsAddLeadModalOpen(true)}
              onExportCSV={handleExportCSV}
              showToast={showToast}
              onSelectLeadForNotes={() => setCurrentView('leads')}
              onSelectView={(v) => setCurrentView(v as View)}
            />
          )}

          {currentView === 'leads' && (
            <AllLeadsView
              leads={visibleLeads}
              onOpenNewLeadModal={() => setIsAddLeadModalOpen(true)}
              onExportCSV={handleExportCSV}
              showToast={showToast}
              onOpenReminderModal={setActiveReminderLead}
            />
          )}

          {currentView === 'pipeline' && (
            <PipelineBoardView
              leads={visibleLeads}
              onOpenNewLeadModal={() => setIsAddLeadModalOpen(true)}
              onExportCSV={handleExportCSV}
              showToast={showToast}
              onOpenReminderModal={setActiveReminderLead}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView leads={leads} stats={stats} onExportCSV={handleExportCSV} showToast={showToast} />
          )}

          {currentView === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              leads={leads}
              showToast={showToast}
              onUserUpdated={(u) => { setCurrentUser(u); leadService.refresh(); }}
              onSignOut={() => handleLogout()}
            />
          )}

          {currentView === 'settings' && <SettingsView showToast={showToast} currentUser={currentUser} onSignOut={() => handleLogout()} />}
        </main>
      </div>

      <AddLeadModal isOpen={isAddLeadModalOpen} onClose={() => setIsAddLeadModalOpen(false)} showToast={showToast} />

      <ScheduleReminderModal lead={activeReminderLead} onClose={() => setActiveReminderLead(null)} showToast={showToast} />

      <NotificationToast message={toast?.message ?? null} tone={toast?.tone} onClose={closeToast} />
    </div>
  );
}
