'use client';

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudy } from '@/context/StudyContext';

export type TabType = 'dashboard' | 'subjects' | 'planner' | 'schedule' | 'progress' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  className,
}: SidebarProps) {
  const { subjects, activePlan } = useStudy();

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'subjects' as TabType,
      label: 'My Subjects',
      icon: BookOpen,
      badge: subjects.length > 0 ? subjects.length : null,
    },
    {
      id: 'planner' as TabType,
      label: 'AI Study Planner',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-primary-100 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300',
    },
    {
      id: 'schedule' as TabType,
      label: 'Study Schedule',
      icon: Calendar,
      badge: activePlan ? 'Active' : null,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
    },
    {
      id: 'progress' as TabType,
      label: 'Progress',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      aria-label="Application Sidebar"
      className={cn(
        'relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/20">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                StudyFlow<span className="text-primary-600 dark:text-primary-400"> AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 tracking-wider">
                Intelligent Planner
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 p-3" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-800 dark:bg-primary-950/50 dark:text-primary-300 font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200'
                )}
                aria-hidden="true"
              />

              {!isCollapsed && (
                <div className="ml-3 flex flex-1 items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        item.badgeColor ||
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom quick user status / academic info */}
      {!isCollapsed && (
        <div className="p-4 m-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="font-medium">Academic Mode</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-400">Active</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            WCAG 2.1 AA Compliant &amp; Offline-Ready
          </p>
        </div>
      )}
    </aside>
  );
}
