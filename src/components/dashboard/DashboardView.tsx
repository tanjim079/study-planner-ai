import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ListTodo,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { formatDate, formatMinutes, getDaysRemaining, getTodayIso, getUrgencyBadge } from '@/lib/utils';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { TabType } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: TabType) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { subjects, activePlan, toggleTaskCompletion, progress } = useStudy();
  const today = getTodayIso();

  // Find today's plan day
  const todayDayPlan = activePlan?.days.find((d) => d.date === today);
  const todayTasks = todayDayPlan?.tasks || [];
  const todayCompletedTasks = todayTasks.filter((t) => t.completed).length;
  const todayTotalMinutes = todayTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const todayCompletedMinutes = todayTasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.durationMinutes, 0);

  // Sort upcoming subject deadlines
  const upcomingDeadlines = [...subjects]
    .map((s) => ({
      ...s,
      daysLeft: getDaysRemaining(s.deadline, today),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Hero */}
      <section
        aria-labelledby="dashboard-welcome-heading"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-primary-600/10"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md mb-3 border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI-Powered Academic Scheduling</span>
          </div>

          <h2 id="dashboard-welcome-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Plan Smarter. Study Better.
          </h2>
          <p className="mt-2 text-sm sm:text-base text-primary-100 leading-relaxed">
            Welcome to StudyFlow AI. Organize your subjects, manage critical examination deadlines, and conquer your academic goals day by day.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="md"
              className="bg-white text-primary-700 hover:bg-primary-50 border-white shadow-sm font-semibold"
              leftIcon={<Sparkles className="h-4 w-4 text-primary-600" />}
              onClick={() => onNavigate('planner')}
            >
              {activePlan ? 'Regenerate Study Plan' : 'Generate Study Plan'}
            </Button>

            <Button
              variant="ghost"
              size="md"
              className="text-white hover:bg-white/10"
              leftIcon={<BookOpen className="h-4 w-4" />}
              onClick={() => onNavigate('subjects')}
            >
              Manage Subjects ({subjects.length})
            </Button>
          </div>
        </div>

        {/* Decorative graphic background pattern */}
        <div
          className="absolute -right-12 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute right-32 -top-12 h-48 w-48 rounded-full bg-indigo-400/20 blur-xl pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* Real Progress & Metric Cards */}
      <section aria-label="Key Study Metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Active Subjects */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Subjects</span>
            <div className="rounded-xl bg-blue-50 p-2 text-primary-600 dark:bg-blue-950/60 dark:text-primary-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {subjects.length}
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subjects.reduce((sum, s) => sum + s.topics.length, 0)} total topics tracked
            </p>
          </div>
        </div>

        {/* Today's Planned Study Hours */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Today&apos;s Study Time</span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {formatMinutes(todayTotalMinutes)}
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatMinutes(todayCompletedMinutes)} completed today
            </p>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Sessions</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {progress.completedTasks}
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {progress.pendingTasks} remaining tasks in plan
            </p>
          </div>
        </div>

        {/* Overall Completion Percentage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Overall Completion</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {progress.completionPercentage}%
            </span>
            <div className="mt-2">
              <ProgressBar value={progress.completionPercentage} showPercentage={false} size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Today's Tasks & Upcoming Deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Study Tasks */}
        <section
          aria-labelledby="today-schedule-heading"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 id="today-schedule-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Today&apos;s Study Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(today)} • {todayTasks.length} session{todayTasks.length === 1 ? '' : 's'} scheduled
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('schedule')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Full Schedule
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {todayTasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <Calendar className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  No study sessions scheduled for today
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {subjects.length === 0
                    ? 'Start by adding your university subjects and examination deadlines.'
                    : 'Generate a personalized study plan to get daily scheduled tasks.'}
                </p>
                <div className="mt-4">
                  {subjects.length === 0 ? (
                    <Button size="sm" onClick={() => onNavigate('subjects')}>
                      Add Your First Subject
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onNavigate('planner')}>
                      Generate Study Plan
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start justify-between rounded-xl border p-4 transition-all ${
                    task.completed
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(today, task.id)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {task.subjectName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {task.durationMinutes} mins
                        </span>
                      </div>
                      <label
                        htmlFor={`task-${task.id}`}
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
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      task.priority === 'high'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900'
                        : task.priority === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Upcoming Deadlines Widget */}
        <section
          aria-labelledby="upcoming-deadlines-heading"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 id="upcoming-deadlines-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Upcoming Deadlines
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Examination & Assignment Targets
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('subjects')}>
              View All
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No subjects or deadlines configured yet.
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => onNavigate('subjects')}>
                  Add Subject
                </Button>
              </div>
            ) : (
              upcomingDeadlines.map((subject) => {
                const urgency = getUrgencyBadge(subject.daysLeft);
                return (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {subject.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(subject.deadline)} • {subject.difficulty}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${urgency.className}`}
                    >
                      {urgency.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
