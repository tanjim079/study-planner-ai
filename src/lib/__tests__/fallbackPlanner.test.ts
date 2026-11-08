import { describe, it, expect } from 'vitest';
import {
  calculatePriorityScore,
  generateDeterministicPlan,
} from '../fallbackPlanner';
import { PlanGenerationRequest } from '@/types';

describe('Deterministic Fallback Planner', () => {
  const baseRequest: PlanGenerationRequest = {
    subjects: [
      {
        id: 'sub-math',
        name: 'Mathematics',
        difficulty: 'hard',
        deadline: '2026-11-15',
        topics: [
          { id: 'top-calc', name: 'Differential Equations', estimatedMinutes: 120 },
          { id: 'top-int', name: 'Integrals', estimatedMinutes: 60 },
        ],
        priority: 'high',
      },
      {
        id: 'sub-hist',
        name: 'Modern History',
        difficulty: 'easy',
        deadline: '2026-11-20',
        topics: [
          { id: 'top-ww1', name: 'World War 1', estimatedMinutes: 60 },
        ],
        priority: 'low',
      },
    ],
    availableHoursPerDay: 3, // 180 mins/day max
    planningStartDate: '2026-11-09',
    planningPeriodDays: 7,
    preferredSessionMinutes: 60,
  };

  describe('calculatePriorityScore', () => {
    it('awards higher score to closer deadlines', () => {
      const urgent = calculatePriorityScore('2026-11-10', 'medium', 'medium', '2026-11-09');
      const distant = calculatePriorityScore('2026-11-30', 'medium', 'medium', '2026-11-09');

      expect(urgent.score).toBeGreaterThan(distant.score);
    });

    it('awards higher multiplier for hard difficulty', () => {
      const hard = calculatePriorityScore('2026-11-15', 'hard', 'medium', '2026-11-09');
      const easy = calculatePriorityScore('2026-11-15', 'easy', 'medium', '2026-11-09');

      expect(hard.score).toBeGreaterThan(easy.score);
    });

    it('awards higher multiplier for high priority', () => {
      const highPrio = calculatePriorityScore('2026-11-15', 'medium', 'high', '2026-11-09');
      const lowPrio = calculatePriorityScore('2026-11-15', 'medium', 'low', '2026-11-09');

      expect(highPrio.score).toBeGreaterThan(lowPrio.score);
    });
  });

  describe('generateDeterministicPlan', () => {
    it('produces a complete, valid study plan structure', () => {
      const plan = generateDeterministicPlan(baseRequest);

      expect(plan.isAiGenerated).toBe(false);
      expect(plan.days.length).toBe(7);
      expect(plan.planTitle).toContain('Structured Study Plan');
      expect(plan.startDate).toBe('2026-11-09');
    });

    it('never exceeds the daily study minutes limit on any single day', () => {
      const plan = generateDeterministicPlan(baseRequest);
      const maxDailyMinutes = baseRequest.availableHoursPerDay * 60;

      for (const day of plan.days) {
        const totalMinutes = day.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
        expect(totalMinutes).toBeLessThanOrEqual(maxDailyMinutes);
      }
    });

    it('does not schedule tasks for a subject after that subject deadline', () => {
      const plan = generateDeterministicPlan(baseRequest);

      for (const day of plan.days) {
        for (const task of day.tasks) {
          if (task.subjectId === 'sub-math') {
            expect(day.date <= '2026-11-15').toBe(true);
          }
        }
      }
    });

    it('chunks large topics into digestible sessions', () => {
      const plan = generateDeterministicPlan(baseRequest);
      const allTasks = plan.days.flatMap((d) => d.tasks);

      // Differential Equations was 120 mins, preferred is 60 -> should be 2 parts
      const diffEqTasks = allTasks.filter((t) => t.topic.includes('Differential Equations'));
      expect(diffEqTasks.length).toBe(2);
      expect(diffEqTasks[0].durationMinutes).toBe(60);
      expect(diffEqTasks[1].durationMinutes).toBe(60);
    });

    it('generates capacity warnings when total material exceeds total available time', () => {
      const overloadedRequest: PlanGenerationRequest = {
        ...baseRequest,
        availableHoursPerDay: 0.5, // 30 mins/day -> total 3.5h across 7 days
        // But topics total 240 mins (4.0h)
      };

      const plan = generateDeterministicPlan(overloadedRequest);
      expect(plan.warnings.length).toBeGreaterThan(0);
      expect(plan.warnings.some((w) => w.includes('budget deficit') || w.includes('Could not schedule'))).toBe(true);
    });
  });
});

