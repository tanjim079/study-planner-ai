'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { SubjectsView } from '@/components/subjects/SubjectsView';
import { PlannerView } from '@/components/planner/PlannerView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ProgressView } from '@/components/progress/ProgressView';
import { SettingsView } from '@/components/settings/SettingsView';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync tab with URL search parameter on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      const validTabs: TabType[] = ['dashboard', 'subjects', 'planner', 'schedule', 'progress', 'settings'];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Skip to Content for WCAG keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        className="hidden md:flex"
      />

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigateToPlanner={() => handleSelectTab('planner')}
          onNavigateToSubjects={() => handleSelectTab('subjects')}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none"
        >
          {activeTab === 'dashboard' && <DashboardView onNavigate={handleSelectTab} />}
          {activeTab === 'subjects' && (
            <SubjectsView onNavigateToPlanner={() => handleSelectTab('planner')} />
          )}
          {activeTab === 'planner' && (
            <PlannerView
              onNavigateToSchedule={() => handleSelectTab('schedule')}
              onNavigateToSubjects={() => handleSelectTab('subjects')}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleView
              onNavigateToPlanner={() => handleSelectTab('planner')}
              onNavigateToSubjects={() => handleSelectTab('subjects')}
            />
          )}
          {activeTab === 'progress' && (
            <ProgressView
              onNavigateToSchedule={() => handleSelectTab('schedule')}
              onNavigateToPlanner={() => handleSelectTab('planner')}
            />
          )}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
