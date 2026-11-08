import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Cpu,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { getTodayIso, formatMinutes } from '@/lib/utils';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { TabType } from '../layout/Sidebar';

interface PlannerViewProps {
  onNavigateToSchedule: () => void;
  onNavigateToSubjects: () => void;
}

export function PlannerView({ onNavigateToSchedule, onNavigateToSubjects }: PlannerViewProps) {
  const {
    subjects,
    preferences,
    updatePreferences,
    generatePlan,
    activePlan,
    isLoading,
    error,
    clearError,
  } = useStudy();

  const [availableHours, setAvailableHours] = useState<number>(preferences.dailyStudyHours || 4);
  const [planningPeriodDays, setPlanningPeriodDays] = useState<7 | 14>(
    preferences.planningPeriodDays || 7
  );
  const [startDate, setStartDate] = useState<string>(getTodayIso());
  const [preferredSessionMinutes, setPreferredSessionMinutes] = useState<number>(
    preferences.preferredSessionMinutes || 45
  );
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  // Calculate total requested study time from all subjects
  const totalTopicMinutes = subjects.reduce(
    (sum, s) => sum + s.topics.reduce((tSum, t) => tSum + t.estimatedMinutes, 0),
    0
  );
  const totalAvailableMinutes = availableHours * 60 * planningPeriodDays;
  const isOverBudget = totalTopicMinutes > totalAvailableMinutes;

  const handleGenerate = async (forceDeterministic: boolean = false) => {
    clearError();
    setGenerationNotice(null);

    // Save preferences
    updatePreferences({
      dailyStudyHours: availableHours,
      planningPeriodDays,
      preferredSessionMinutes,
    });

    const result = await generatePlan(
      {
        availableHoursPerDay: availableHours,
        planningPeriodDays,
        planningStartDate: startDate,
        preferredSessionMinutes,
        customInstructions: customInstructions.trim() || undefined,
      },
      forceDeterministic
    );

    if (result) {
      if (result.isAiGenerated) {
        setGenerationNotice('Personalized AI study plan generated successfully by Claude!');
      } else {
        setGenerationNotice(
          'Structured study plan generated using our deterministic algorithmic scheduler.'
        );
      }
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
          No Subjects Available for Planning
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Before creating an intelligent schedule, please add at least one subject with study topics and an exam deadline.
        </p>
        <div className="mt-6">
          <Button onClick={onNavigateToSubjects} leftIcon={<Sparkles className="h-4 w-4" />}>
            Add Subjects First
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Notice & Error Messages */}
      {error && (
        <Alert type="error" title="Planning Notice" onClose={clearError}>
          {error}
        </Alert>
      )}

      {generationNotice && (
        <Alert
          type="success"
          title="Plan Created"
          onClose={() => setGenerationNotice(null)}
        >
          <div className="flex items-center justify-between gap-4">
            <span>{generationNotice}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToSchedule}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              View Schedule
            </Button>
          </div>
        </Alert>
      )}

      {/* Main Configuration Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Study Schedule Parameters
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Customize your study bandwidth, planning timeframe, and session sizes.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Daily Study Hours & Timeframe */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Hours per day */}
            <div>
              <label
                htmlFor="daily-hours-input"
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
              >
                Daily Study Hours <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="daily-hours-input"
                  type="number"
                  min={0.5}
                  max={16}
                  step={0.5}
                  value={availableHours}
                  onChange={(e) => setAvailableHours(parseFloat(e.target.value) || 0)}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-medium text-slate-400">
                  hours / day
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Max daily workload you can realistically sustain.
              </p>
            </div>

            {/* Planning Period */}
            <div>
              <label
                htmlFor="planning-period-select"
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
              >
                Planning Horizon <span className="text-rose-500">*</span>
              </label>
              <select
                id="planning-period-select"
                value={planningPeriodDays}
                onChange={(e) => setPlanningPeriodDays(Number(e.target.value) as 7 | 14)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value={7}>7 Days (Weekly Focus)</option>
                <option value={14}>14 Days (Two-Week Roadmap)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Duration of the schedule window.
              </p>
            </div>

            {/* Start Date */}
            <div>
              <Input
                label="Planning Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                First day to schedule study sessions.
              </p>
            </div>
          </div>

          {/* Preferred Session Length & Custom Instructions */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="session-length-select"
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
              >
                Preferred Session Duration
              </label>
              <select
                id="session-length-select"
                value={preferredSessionMinutes}
                onChange={(e) => setPreferredSessionMinutes(Number(e.target.value))}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value={30}>30 minutes (Pomodoro style)</option>
                <option value={45}>45 minutes (Standard university block)</option>
                <option value={60}>60 minutes (Deep dive)</option>
                <option value={90}>90 minutes (Intensive problem solving)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Large topics will be broken into sessions of this length.
              </p>
            </div>

            <div>
              <label
                htmlFor="custom-notes"
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
              >
                Custom Constraints & Notes (Optional)
              </label>
              <input
                id="custom-notes"
                type="text"
                placeholder="e.g. Schedule heavy math in morning, light reading in evening"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Guidance for the AI scheduling assistant.
              </p>
            </div>
          </div>

          {/* Time Budget Feasibility Analysis */}
          <div
            className={`rounded-xl border p-4 text-xs sm:text-sm leading-relaxed ${
              isOverBudget
                ? 'border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                {isOverBudget ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {isOverBudget ? 'Tight Time Budget Detected' : 'Realistic Time Budget'}
                </div>
                <div className="mt-1 text-xs">
                  Total topics require <strong>{formatMinutes(totalTopicMinutes)}</strong> of study.
                  With {availableHours}h/day across {planningPeriodDays} days, your total capacity is{' '}
                  <strong>{formatMinutes(totalAvailableMinutes)}</strong>.
                  {isOverBudget && (
                    <span className="block mt-1 font-medium text-amber-800 dark:text-amber-200">
                      You are short by {formatMinutes(totalTopicMinutes - totalAvailableMinutes)}.
                      StudyFlow AI will prioritize approaching deadlines and provide capacity warnings for unscheduled topics.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Generation Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Cpu className="h-4 w-4 text-primary-600" />
              <span>Offline-capable deterministic fallback is always available</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Fallback Generator Button */}
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => handleGenerate(true)}
                isLoading={isLoading}
                className="flex-1 sm:flex-initial"
              >
                Generate Basic Plan
              </Button>

              {/* Claude AI Generator Button */}
              <Button
                type="button"
                variant="primary"
                size="md"
                leftIcon={<Sparkles className="h-4 w-4 text-amber-300" />}
                onClick={() => handleGenerate(false)}
                isLoading={isLoading}
                className="flex-1 sm:flex-initial shadow-md shadow-primary-500/20"
              >
                Generate AI Plan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Plan Overview Widget if exists */}
      {activePlan && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 mb-2">
                {activePlan.isAiGenerated ? 'Claude AI Schedule' : 'Algorithmic Basic Plan'}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {activePlan.planTitle}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                {activePlan.summary}
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={onNavigateToSchedule}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Open Schedule View
            </Button>
          </div>

          {activePlan.warnings && activePlan.warnings.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Schedule Feasibility Warnings:
              </span>
              {activePlan.warnings.map((w, idx) => (
                <p key={idx} className="text-xs text-slate-600 dark:text-slate-400 pl-5">
                  • {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

