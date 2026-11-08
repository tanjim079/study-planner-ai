import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { formatDate, formatMinutes, getTodayIso } from '@/lib/utils';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TabType } from '../layout/Sidebar';

interface ScheduleViewProps {
  onNavigateToPlanner: () => void;
  onNavigateToSubjects: () => void;
}

export function ScheduleView({ onNavigateToPlanner, onNavigateToSubjects }: ScheduleViewProps) {
  const { activePlan, toggleTaskCompletion, clearActivePlan, subjects } = useStudy();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const today = getTodayIso();

  if (!activePlan || activePlan.days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
          <CalendarIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
          No Study Schedule Active
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You haven&apos;t generated a study schedule yet. Define your subjects and let StudyFlow AI allocate optimal study sessions for you.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {subjects.length === 0 ? (
            <Button onClick={onNavigateToSubjects}>Add Subjects First</Button>
          ) : (
            <Button onClick={onNavigateToPlanner} leftIcon={<Sparkles className="h-4 w-4" />}>
              Create Study Plan
            </Button>
          )}
        </div>
      </div>
    );
  }

  const days = activePlan.days;
  const currentDay = days[selectedDayIndex] || days[0];

  return (
    <div className="space-y-6">
      {/* Schedule Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {activePlan.planTitle}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                activePlan.isAiGenerated
                  ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/70 dark:text-primary-300 dark:border-primary-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              {activePlan.isAiGenerated ? 'AI Plan' : 'Basic Plan'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {activePlan.summary}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (Daily vs Weekly) */}
          <div
            role="group"
            aria-label="Schedule view switch"
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-800"
          >
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              aria-pressed={viewMode === 'daily'}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'daily'
                  ? 'bg-white text-primary-600 shadow-xs dark:bg-slate-700 dark:text-primary-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              aria-pressed={viewMode === 'weekly'}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-white text-primary-600 shadow-xs dark:bg-slate-700 dark:text-primary-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Weekly ({days.length} Days)
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onNavigateToPlanner}
          >
            Regenerate
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setIsClearConfirmOpen(true)}
            aria-label="Clear schedule"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {activePlan.warnings && activePlan.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Schedule Notices & Capacity Constraints</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {activePlan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* DAILY VIEW */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Day Navigation */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
              disabled={selectedDayIndex === 0}
              aria-label="Previous Day"
            >
              Previous
            </Button>

            <div className="text-center">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {formatDate(currentDay.date)}
              </span>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Day {selectedDayIndex + 1} of {days.length} •{' '}
                {formatMinutes(currentDay.tasks.reduce((sum, t) => sum + t.durationMinutes, 0))} planned
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => setSelectedDayIndex((prev) => Math.min(days.length - 1, prev + 1))}
              disabled={selectedDayIndex === days.length - 1}
              aria-label="Next Day"
            >
              Next
            </Button>
          </div>

          {/* Daily Task List */}
          <div className="space-y-3">
            {currentDay.tasks.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Rest or Buffer Day
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No sessions scheduled for this date. Use this time for personal rest or flexible catch-up.
                </p>
              </div>
            ) : (
              currentDay.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start justify-between rounded-xl border p-4 transition-all ${
                    task.completed
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`daily-task-${task.id}`}
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(currentDay.date, task.id)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {task.subjectName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.durationMinutes}m
                        </span>
                      </div>
                      <label
                        htmlFor={`daily-task-${task.id}`}
                        className={`block mt-1 text-sm font-medium cursor-pointer ${
                          task.completed
                            ? 'line-through text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.topic}
                      </label>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {task.reason}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      task.priority === 'high'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                        : task.priority === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WEEKLY / MULTI-DAY GRID VIEW */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {days.map((day, idx) => {
            const isToday = day.date === today;
            const completedCount = day.tasks.filter((t) => t.completed).length;
            const dayMinutes = day.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);

            return (
              <div
                key={day.date}
                className={`flex flex-col rounded-2xl border p-4 transition-all ${
                  isToday
                    ? 'border-primary-400 bg-primary-50/20 shadow-sm dark:border-primary-600 dark:bg-primary-950/20'
                    : 'border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {formatDate(day.date)}
                      {isToday && (
                        <span className="rounded-full bg-primary-600 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                          Today
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Day {idx + 1} • {formatMinutes(dayMinutes)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {completedCount}/{day.tasks.length}
                  </span>
                </div>

                {/* Day Task Items */}
                <div className="mt-3 flex-1 space-y-2">
                  {day.tasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Rest / Buffer Day
                    </div>
                  ) : (
                    day.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-lg border p-2.5 text-xs transition-colors ${
                          task.completed
                            ? 'border-emerald-200 bg-emerald-50/30 text-slate-500 line-through dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-slate-400'
                            : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <label className="flex items-start gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTaskCompletion(day.date, task.id)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="font-semibold line-clamp-1">{task.topic}</span>
                          </label>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {task.durationMinutes}m
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                          <span>{task.subjectName}</span>
                          <span className="capitalize">{task.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation modal before clearing schedule */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearActivePlan}
        title="Clear Study Schedule"
        message="Are you sure you want to clear this study plan? Completed sessions will be archived to history."
        confirmLabel="Clear Schedule"
        isDestructive={true}
      />
    </div>
  );
}
