import React from 'react';
import { Menu, Sparkles, BookOpen, Calendar, CheckSquare } from 'lucide-react';
import { formatDate, getTodayIso } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { TabType } from './Sidebar';
import { Button } from '../common/Button';

interface NavbarProps {
  activeTab: TabType;
  onOpenMobileMenu: () => void;
  onNavigateToPlanner: () => void;
  onNavigateToSubjects: () => void;
}

export function Navbar({
  activeTab,
  onOpenMobileMenu,
  onNavigateToPlanner,
  onNavigateToSubjects,
}: NavbarProps) {
  const today = getTodayIso();

  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Study Dashboard',
      subtitle: 'Overview of your academic priorities and daily schedule',
    },
    subjects: {
      title: 'My Subjects',
      subtitle: 'Manage your courses, topics, deadlines, and difficulty levels',
    },
    planner: {
      title: 'AI Study Planner',
      subtitle: 'Generate intelligent, constraint-aware study schedules',
    },
    schedule: {
      title: 'Study Schedule',
      subtitle: 'Interactive daily and weekly planner with progress tracking',
    },
    progress: {
      title: 'Academic Progress',
      subtitle: 'Real-time performance analytics based on actual session tracking',
    },
    settings: {
      title: 'Settings & Preferences',
      subtitle: 'Manage theme, study preferences, API configuration, and data backups',
    },
  };

  const current = tabTitles[activeTab];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {current.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            {current.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Calendar className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
          <span>{formatDate(today)}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {activeTab !== 'planner' && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />}
              onClick={onNavigateToPlanner}
            >
              Generate Plan
            </Button>
          )}

          {activeTab !== 'subjects' && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<BookOpen className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
              onClick={onNavigateToSubjects}
            >
              Add Subject
            </Button>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}

