import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { StudyProvider, useStudy } from '../StudyContext';

describe('StudyContext State Management', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StudyProvider>{children}</StudyProvider>
  );

  it('provides initial state and allows adding a subject', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });

    expect(result.current.subjects).toEqual([]);

    act(() => {
      result.current.addSubject({
        name: 'Calculus',
        description: 'Derivatives',
        difficulty: 'hard',
        deadline: '2026-11-20',
        priority: 'high',
        topics: [{ id: 't1', name: 'Limits', estimatedMinutes: 60 }],
      });
    });

    expect(result.current.subjects.length).toBe(1);
    expect(result.current.subjects[0].name).toBe('Calculus');
  });

  it('updates an existing subject', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });

    let createdId = '';
    act(() => {
      const sub = result.current.addSubject({
        name: 'Physics',
        difficulty: 'medium',
        deadline: '2026-11-25',
        priority: 'medium',
        topics: [{ id: 't1', name: 'Optics', estimatedMinutes: 45 }],
      });
      createdId = sub.id;
    });

    act(() => {
      result.current.updateSubject(createdId, { difficulty: 'hard' });
    });

    expect(result.current.subjects[0].difficulty).toBe('hard');
  });

  it('deletes a subject', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });

    let createdId = '';
    act(() => {
      const sub = result.current.addSubject({
        name: 'Biology',
        difficulty: 'easy',
        deadline: '2026-11-30',
        priority: 'low',
        topics: [{ id: 't1', name: 'Cells', estimatedMinutes: 30 }],
      });
      createdId = sub.id;
    });

    expect(result.current.subjects.length).toBe(1);

    act(() => {
      result.current.deleteSubject(createdId);
    });

    expect(result.current.subjects.length).toBe(0);
  });

  it('generates deterministic fallback plan and updates progress', async () => {
    const { result } = renderHook(() => useStudy(), { wrapper });

    act(() => {
      result.current.addSubject({
        name: 'Chemistry',
        difficulty: 'medium',
        deadline: '2026-11-20',
        priority: 'high',
        topics: [{ id: 't1', name: 'Reactions', estimatedMinutes: 45 }],
      });
    });

    await act(async () => {
      await result.current.generatePlan({ availableHoursPerDay: 3 }, true);
    });

    expect(result.current.activePlan).not.toBeNull();
    expect(result.current.activePlan?.isAiGenerated).toBe(false);
    expect(result.current.progress.totalTasks).toBeGreaterThan(0);

    // Toggle completion on first task
    const firstDay = result.current.activePlan?.days.find((d) => d.tasks.length > 0);
    const firstTask = firstDay?.tasks[0];
    expect(firstTask).toBeDefined();

    if (firstDay && firstTask) {
      act(() => {
        result.current.toggleTaskCompletion(firstDay.date, firstTask.id);
      });

      expect(result.current.progress.completedTasks).toBe(1);
    }
  });

  it('updates user preferences', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });

    act(() => {
      result.current.updatePreferences({ dailyStudyHours: 6, theme: 'dark' });
    });

    expect(result.current.preferences.dailyStudyHours).toBe(6);
    expect(result.current.preferences.theme).toBe('dark');
  });
});

