'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Subject,
  StudyPlan,
  UserPreferences,
  ProgressSummary,
  PlanGenerationRequest,
  StorageSchemaV1,
} from '@/types';
import {
  loadFromStorage,
  saveToStorage,
  DEFAULT_PREFERENCES,
  INITIAL_STORAGE_STATE,
  exportStorageData,
  importStorageData,
  clearStorage,
} from '@/lib/storage';
import { generateId, getTodayIso, getRandomSubjectColor } from '@/lib/utils';
import { generateDeterministicPlan } from '@/lib/fallbackPlanner';

interface StudyContextType {
  subjects: Subject[];
  activePlan: StudyPlan | null;
  historyPlans: StudyPlan[];
  preferences: UserPreferences;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  announcement: string;
  addSubject: (subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => Subject;
  updateSubject: (id: string, updates: Partial<Omit<Subject, 'id' | 'createdAt'>>) => void;
  deleteSubject: (id: string) => void;
  generatePlan: (options?: Partial<PlanGenerationRequest>, forceDeterministic?: boolean) => Promise<StudyPlan | null>;
  toggleTaskCompletion: (dayDate: string, taskId: string) => void;
  clearActivePlan: () => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetAllData: () => void;
  exportDataJson: () => string;
  importDataJson: (json: string) => { success: boolean; error?: string };
  clearError: () => void;
  announce: (message: string) => void;
  progress: ProgressSummary;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [historyPlans, setHistoryPlans] = useState<StudyPlan[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((msg: string) => {
    setAnnouncement(msg);
  }, []);

  // Hydrate on mount safely
  useEffect(() => {
    const data = loadFromStorage();
    setSubjects(data.subjects);
    setActivePlan(data.activePlan);
    setHistoryPlans(data.historyPlans || []);
    setPreferences(data.preferences || DEFAULT_PREFERENCES);
    setIsHydrated(true);

    // Sync theme class
    const theme = data.preferences?.theme || 'system';
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Sync to localStorage whenever state changes after hydration
  useEffect(() => {
    if (!isHydrated) return;
    const state: StorageSchemaV1 = {
      version: 1,
      subjects,
      activePlan,
      historyPlans,
      preferences,
      lastUpdated: new Date().toISOString(),
    };
    saveToStorage(state);
  }, [subjects, activePlan, historyPlans, preferences, isHydrated]);

  const addSubject = useCallback(
    (subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Subject => {
      const now = new Date().toISOString();
      const newSubject: Subject = {
        ...subjectData,
        id: generateId('subject'),
        color: subjectData.color || getRandomSubjectColor(subjects.length),
        createdAt: now,
        updatedAt: now,
      };

      setSubjects((prev) => [...prev, newSubject]);
      announce(`Subject "${newSubject.name}" created successfully.`);
      return newSubject;
    },
    [subjects.length, announce]
  );

  const updateSubject = useCallback(
    (id: string, updates: Partial<Omit<Subject, 'id' | 'createdAt'>>) => {
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
      );
      announce('Subject updated.');
    },
    [announce]
  );

  const deleteSubject = useCallback(
    (id: string) => {
      const target = subjects.find((s) => s.id === id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      announce(`Subject "${target?.name || ''}" deleted.`);
    },
    [subjects, announce]
  );

  const toggleTaskCompletion = useCallback(
    (dayDate: string, taskId: string) => {
      if (!activePlan) return;

      let taskFoundName = '';
      let isNowComplete = false;

      const updatedDays = activePlan.days.map((day) => {
        if (day.date !== dayDate) return day;

        const updatedTasks = day.tasks.map((task) => {
          if (task.id === taskId) {
            isNowComplete = !task.completed;
            taskFoundName = task.topic;
            return {
              ...task,
              completed: isNowComplete,
              completedAt: isNowComplete ? new Date().toISOString() : null,
            };
          }
          return task;
        });

        return { ...day, tasks: updatedTasks };
      });

      setActivePlan({
        ...activePlan,
        days: updatedDays,
      });

      announce(`Marked "${taskFoundName}" as ${isNowComplete ? 'completed' : 'incomplete'}.`);
    },
    [activePlan, announce]
  );

  const clearActivePlan = useCallback(() => {
    if (activePlan) {
      setHistoryPlans((prev) => [activePlan, ...prev.slice(0, 5)]);
    }
    setActivePlan(null);
    announce('Study schedule cleared.');
  }, [activePlan, announce]);

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates };

        // Handle theme switch
        if (updates.theme) {
          const root = document.documentElement;
          if (
            updates.theme === 'dark' ||
            (updates.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
          ) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }

        return next;
      });
      announce('Preferences updated.');
    },
    [announce]
  );

  const resetAllData = useCallback(() => {
    clearStorage();
    setSubjects([]);
    setActivePlan(null);
    setHistoryPlans([]);
    setPreferences(DEFAULT_PREFERENCES);
    document.documentElement.classList.remove('dark');
    announce('All study planner data has been reset.');
  }, [announce]);

  const exportDataJson = useCallback(() => {
    const state: StorageSchemaV1 = {
      version: 1,
      subjects,
      activePlan,
      historyPlans,
      preferences,
      lastUpdated: new Date().toISOString(),
    };
    return exportStorageData(state);
  }, [subjects, activePlan, historyPlans, preferences]);

  const importDataJson = useCallback(
    (json: string) => {
      const res = importStorageData(json);
      if (res.success && res.data) {
        setSubjects(res.data.subjects);
        setActivePlan(res.data.activePlan);
        setHistoryPlans(res.data.historyPlans || []);
        setPreferences(res.data.preferences || DEFAULT_PREFERENCES);
        announce('Study data imported successfully.');
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to import data' };
    },
    [announce]
  );

  const generatePlan = useCallback(
    async (
      options?: Partial<PlanGenerationRequest>,
      forceDeterministic: boolean = false
    ): Promise<StudyPlan | null> => {
      if (subjects.length === 0) {
        setError('Please create at least one subject with study topics before generating a plan.');
        return null;
      }

      setIsLoading(true);
      setError(null);
      announce('Generating study plan. Please wait...');

      const requestPayload: PlanGenerationRequest = {
        subjects: subjects.map((s) => ({
          id: s.id,
          name: s.name,
          difficulty: s.difficulty,
          deadline: s.deadline,
          topics: s.topics.map((t) => ({
            id: t.id,
            name: t.name,
            estimatedMinutes: t.estimatedMinutes,
          })),
          priority: s.priority,
        })),
        availableHoursPerDay: options?.availableHoursPerDay || preferences.dailyStudyHours || 4,
        planningStartDate: options?.planningStartDate || getTodayIso(),
        planningPeriodDays: options?.planningPeriodDays || preferences.planningPeriodDays || 7,
        preferredSessionMinutes: options?.preferredSessionMinutes || preferences.preferredSessionMinutes || 45,
        customInstructions: options?.customInstructions,
      };

      try {
        if (forceDeterministic) {
          // Client-side instant deterministic planner execution
          const plan = generateDeterministicPlan(requestPayload);
          setActivePlan(plan);
          announce('Basic study plan generated successfully.');
          return plan;
        }

        // Call server-side API
        const response = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate study plan.');
        }

        const generatedPlan: StudyPlan = data.plan;

        // Preserve previous completion state if regenerating
        if (activePlan) {
          const completedMap = new Map<string, boolean>();
          activePlan.days.forEach((day) => {
            day.tasks.forEach((task) => {
              if (task.completed) {
                // key by subjectId + topic
                completedMap.set(`${task.subjectId}::${task.topic}`, true);
              }
            });
          });

          generatedPlan.days.forEach((day) => {
            day.tasks.forEach((task) => {
              if (completedMap.has(`${task.subjectId}::${task.topic}`)) {
                task.completed = true;
                task.completedAt = new Date().toISOString();
              }
            });
          });
        }

        setActivePlan(generatedPlan);
        announce(
          data.isAiGenerated
            ? 'AI study plan generated successfully.'
            : 'Study plan generated using algorithmic fallback.'
        );
        return generatedPlan;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Plan generation failed';
        console.error('[StudyContext] Generation error:', err);
        setError(errorMsg);

        // Fallback option automatically if network or server error
        announce(`Generation error: ${errorMsg}. Falling back to deterministic planner.`);
        const fallback = generateDeterministicPlan(requestPayload);
        fallback.warnings.unshift(`Service notification: Generated via local fallback due to: ${errorMsg}`);
        setActivePlan(fallback);
        return fallback;
      } finally {
        setIsLoading(false);
      }
    },
    [subjects, preferences, activePlan, announce]
  );

  // Compute live progress metrics across all scheduled tasks
  const progress: ProgressSummary = useMemo(() => {
    if (!activePlan || !activePlan.days) {
      return {
        totalScheduledMinutes: 0,
        completedMinutes: 0,
        remainingMinutes: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionPercentage: 0,
        subjectBreakdown: [],
      };
    }

    let totalScheduledMinutes = 0;
    let completedMinutes = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    const subjectMap = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        totalMinutes: number;
        completedMinutes: number;
        totalTasks: number;
        completedTasks: number;
        color?: string;
      }
    >();

    for (const day of activePlan.days) {
      for (const task of day.tasks) {
        totalTasks += 1;
        totalScheduledMinutes += task.durationMinutes;

        if (task.completed) {
          completedTasks += 1;
          completedMinutes += task.durationMinutes;
        }

        const existing = subjectMap.get(task.subjectId) || {
          subjectId: task.subjectId,
          subjectName: task.subjectName,
          totalMinutes: 0,
          completedMinutes: 0,
          totalTasks: 0,
          completedTasks: 0,
          color: subjects.find((s) => s.id === task.subjectId)?.color,
        };

        existing.totalTasks += 1;
        existing.totalMinutes += task.durationMinutes;
        if (task.completed) {
          existing.completedTasks += 1;
          existing.completedMinutes += task.durationMinutes;
        }

        subjectMap.set(task.subjectId, existing);
      }
    }

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const subjectBreakdown = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      completionPercentage:
        s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0,
    }));

    return {
      totalScheduledMinutes,
      completedMinutes,
      remainingMinutes: Math.max(0, totalScheduledMinutes - completedMinutes),
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionPercentage,
      subjectBreakdown,
    };
  }, [activePlan, subjects]);

  const value = useMemo(
    () => ({
      subjects,
      activePlan,
      historyPlans,
      preferences,
      isHydrated,
      isLoading,
      error,
      announcement,
      addSubject,
      updateSubject,
      deleteSubject,
      generatePlan,
      toggleTaskCompletion,
      clearActivePlan,
      updatePreferences,
      resetAllData,
      exportDataJson,
      importDataJson,
      clearError: () => setError(null),
      announce,
      progress,
    }),
    [
      subjects,
      activePlan,
      historyPlans,
      preferences,
      isHydrated,
      isLoading,
      error,
      announcement,
      addSubject,
      updateSubject,
      deleteSubject,
      generatePlan,
      toggleTaskCompletion,
      clearActivePlan,
      updatePreferences,
      resetAllData,
      exportDataJson,
      importDataJson,
      announce,
      progress,
    ]
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyContextType {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
}
