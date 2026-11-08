import { describe, it, expect } from 'vitest';
import { validatePlanBusinessConstraints } from '../aiPlanner';
import { StudyPlan, PlanGenerationRequest } from '@/types';

describe('AI Business Constraint Validator', () => {
  const request: PlanGenerationRequest = {
    subjects: [
      {
        id: 'sub-cs',
        name: 'Algorithms',
        difficulty: 'hard',
        deadline: '2026-11-12',
        topics: [{ id: 't1', name: 'Graph Theory', estimatedMinutes: 60 }],
        priority: 'high',
      },
    ],
    availableHoursPerDay: 2, // 120 minutes/day
    planningStartDate: '2026-11-09',
    planningPeriodDays: 7,
  };

  it('validates a conformant plan with no errors', () => {
    const validPlan: StudyPlan = {
      id: 'plan-1',
      planTitle: 'Valid Plan',
      summary: 'Summary',
      generatedAt: '2026-11-08T00:00:00.000Z',
      planningPeriodDays: 7,
      startDate: '2026-11-09',
      dailyHoursLimit: 2,
      preferredSessionMinutes: 60,
      isAiGenerated: true,
      days: [
        {
          date: '2026-11-09',
          tasks: [
            {
              id: 'task-1',
              subjectId: 'sub-cs',
              subjectName: 'Algorithms',
              topic: 'Graph Theory',
              durationMinutes: 60,
              priority: 'high',
              reason: 'Upcoming exam',
              completed: false,
            },
          ],
        },
      ],
      warnings: [],
    };

    const result = validatePlanBusinessConstraints(validPlan, request);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects unknown subject IDs not present in student request', () => {
    const invalidPlan: StudyPlan = {
      id: 'plan-1',
      planTitle: 'Invalid Subject Plan',
      summary: 'Summary',
      generatedAt: '2026-11-08T00:00:00.000Z',
      planningPeriodDays: 7,
      startDate: '2026-11-09',
      dailyHoursLimit: 2,
      preferredSessionMinutes: 60,
      isAiGenerated: true,
      days: [
        {
          date: '2026-11-09',
          tasks: [
            {
              id: 'task-1',
              subjectId: 'non-existent-sub',
              subjectName: 'Fictional Course',
              topic: 'Intro',
              durationMinutes: 45,
              priority: 'low',
              reason: 'Invented by hallucinating model',
              completed: false,
            },
          ],
        },
      ],
      warnings: [],
    };

    const result = validatePlanBusinessConstraints(invalidPlan, request);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('non-existent subject ID'))).toBe(true);
  });

  it('detects tasks scheduled AFTER subject deadline', () => {
    // Subject deadline is 2026-11-12. If task scheduled on 2026-11-14 -> invalid!
    const deadlineViolatingPlan: StudyPlan = {
      id: 'plan-1',
      planTitle: 'Deadline Violation',
      summary: 'Summary',
      generatedAt: '2026-11-08T00:00:00.000Z',
      planningPeriodDays: 7,
      startDate: '2026-11-09',
      dailyHoursLimit: 2,
      preferredSessionMinutes: 60,
      isAiGenerated: true,
      days: [
        {
          date: '2026-11-14', // After 2026-11-12!
          tasks: [
            {
              id: 'task-1',
              subjectId: 'sub-cs',
              subjectName: 'Algorithms',
              topic: 'Graph Theory',
              durationMinutes: 60,
              priority: 'high',
              reason: 'Late study',
              completed: false,
            },
          ],
        },
      ],
      warnings: [],
    };

    const result = validatePlanBusinessConstraints(deadlineViolatingPlan, request);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('AFTER its deadline'))).toBe(true);
  });

  it('detects when a day exceeds the allocated daily minutes', () => {
    const timeViolatingPlan: StudyPlan = {
      id: 'plan-1',
      planTitle: 'Overload Violation',
      summary: 'Summary',
      generatedAt: '2026-11-08T00:00:00.000Z',
      planningPeriodDays: 7,
      startDate: '2026-11-09',
      dailyHoursLimit: 2, // 120 mins max
      preferredSessionMinutes: 60,
      isAiGenerated: true,
      days: [
        {
          date: '2026-11-09',
          tasks: [
            {
              id: 'task-1',
              subjectId: 'sub-cs',
              subjectName: 'Algorithms',
              topic: 'Part 1',
              durationMinutes: 100,
              priority: 'high',
              reason: 'Exam soon',
              completed: false,
            },
            {
              id: 'task-2',
              subjectId: 'sub-cs',
              subjectName: 'Algorithms',
              topic: 'Part 2',
              durationMinutes: 90, // total 190m > 120m
              priority: 'high',
              reason: 'Exam soon',
              completed: false,
            },
          ],
        },
      ],
      warnings: [],
    };

    const result = validatePlanBusinessConstraints(timeViolatingPlan, request);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('exceeds daily limit'))).toBe(true);
  });
});

