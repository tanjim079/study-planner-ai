import React from 'react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Calendar,
  Award,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { formatMinutes } from '@/lib/utils';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';
import { TabType } from '../layout/Sidebar';

interface ProgressViewProps {
  onNavigateToSchedule: () => void;
  onNavigateToPlanner: () => void;
}

export function ProgressView({ onNavigateToSchedule, onNavigateToPlanner }: ProgressViewProps) {
  const { progress, activePlan } = useStudy();

  if (!activePlan || progress.totalTasks === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
          No Study Progress Data Available
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Generate an active study schedule to begin logging completed sessions and tracking real-time completion analytics.
        </p>
        <div className="mt-6">
          <Button onClick={onNavigateToPlanner} leftIcon={<TrendingUp className="h-4 w-4" />}>
            Generate Study Schedule
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overall Completion Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Award className="h-4 w-4" />
              <span>Academic Milestone</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {progress.completionPercentage}% Completed
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {progress.completedTasks} of {progress.totalTasks} study sessions checked off.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onNavigateToSchedule}>
            View Schedule Tasks
          </Button>
        </div>

        <div className="mt-6">
          <ProgressBar
            value={progress.completionPercentage}
            showPercentage={false}
            size="lg"
            label="Overall Schedule Progress"
          />
        </div>
      </div>

      {/* Real Metric Highlights */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Total Time
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {formatMinutes(progress.totalScheduledMinutes)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Across {activePlan.planningPeriodDays} days
          </p>
        </div>

        {/* Completed Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Studied Time
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMinutes(progress.completedMinutes)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Logged focus duration
          </p>
        </div>

        {/* Remaining Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Remaining Time
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatMinutes(progress.remainingMinutes)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {progress.pendingTasks} tasks remaining
          </p>
        </div>

        {/* Completed Sessions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Sessions
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {progress.completedTasks} / {progress.totalTasks}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Check-ins completed
          </p>
        </div>
      </div>

      {/* Subject-Wise Progress Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Subject-Wise Completion Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track individual progress and time distribution across each academic subject.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {progress.subjectBreakdown.map((item) => (
            <div
              key={item.subjectId}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-800/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || '#2563EB' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.subjectName}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatMinutes(item.completedMinutes)} / {formatMinutes(item.totalMinutes)}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {item.completedTasks} of {item.totalTasks} sessions
                  </span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    {item.completionPercentage}%
                  </span>
                </div>
              </div>

              <ProgressBar
                value={item.completionPercentage}
                showPercentage={false}
                size="md"
                color={item.color}
                label={`${item.subjectName} completion`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
