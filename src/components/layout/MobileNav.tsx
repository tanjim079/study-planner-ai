import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Calendar,
  BarChart3,
  Settings,
  X,
  GraduationCap,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { useStudy } from '@/context/StudyContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export function MobileNav({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}: MobileNavProps) {
  const { subjects, activePlan } = useStudy();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'subjects' as TabType,
      label: 'My Subjects',
      icon: BookOpen,
      badge: subjects.length > 0 ? subjects.length : undefined,
    },
    { id: 'planner' as TabType, label: 'AI Study Planner', icon: Sparkles, badge: 'AI' },
    {
      id: 'schedule' as TabType,
      label: 'Study Schedule',
      icon: Calendar,
      badge: activePlan ? 'Active' : undefined,
    },
    { id: 'progress' as TabType, label: 'Progress', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-white p-5 shadow-2xl dark:bg-slate-900 dark:border-r dark:border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-md">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">StudyFlow AI</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
          StudyFlow AI v1.0 • Capstone Edition
        </div>
      </div>
    </div>
  );
}

