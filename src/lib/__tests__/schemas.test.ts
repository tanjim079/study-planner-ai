import { describe, it, expect } from 'vitest';
import {
  CreateSubjectInputSchema,
  PlanGenerationRequestSchema,
  StudyPlanSchema,
} from '../schemas';

describe('Zod Validation Schemas', () => {
  describe('CreateSubjectInputSchema', () => {
    it('accepts valid subject input with topics', () => {
      const valid = {
        name: 'Calculus I',
        description: 'Single variable calculus and limits',
        difficulty: 'hard' as const,
        deadline: '2026-11-20',
        priority: 'high' as const,
        topics: [
          { name: 'Limits and Continuity', estimatedMinutes: 60 },
          { name: 'Derivatives', estimatedMinutes: 90 },
        ],
      };

      const result = CreateSubjectInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty subject name', () => {
      const invalid = {
        name: '   ',
        difficulty: 'easy' as const,
        deadline: '2026-11-20',
        priority: 'medium' as const,
        topics: [{ name: 'Intro', estimatedMinutes: 30 }],
      };

      const result = CreateSubjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('cannot be empty');
      }
    });

    it('rejects empty topics list', () => {
      const invalid = {
        name: 'Physics',
        difficulty: 'medium' as const,
        deadline: '2026-11-20',
        priority: 'medium' as const,
        topics: [],
      };

      const result = CreateSubjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid or negative topic estimated minutes', () => {
      const invalid = {
        name: 'Chemistry',
        difficulty: 'medium' as const,
        deadline: '2026-11-20',
        priority: 'medium' as const,
        topics: [{ name: 'Stoichiometry', estimatedMinutes: -15 }],
      };

      const result = CreateSubjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('PlanGenerationRequestSchema', () => {
    it('validates a valid planning request', () => {
      const validReq = {
        subjects: [
          {
            id: 'sub-1',
            name: 'Linear Algebra',
            difficulty: 'hard' as const,
            deadline: '2026-11-25',
            topics: [{ id: 'top-1', name: 'Matrices', estimatedMinutes: 60 }],
            priority: 'high' as const,
          },
        ],
        availableHoursPerDay: 4,
        planningStartDate: '2026-11-09',
        planningPeriodDays: 7 as const,
        preferredSessionMinutes: 45,
      };

      const result = PlanGenerationRequestSchema.safeParse(validReq);
      expect(result.success).toBe(true);
    });

    it('rejects excessive available hours per day (>16)', () => {
      const invalidReq = {
        subjects: [
          {
            id: 'sub-1',
            name: 'History',
            difficulty: 'easy' as const,
            deadline: '2026-11-25',
            topics: [{ id: 'top-1', name: 'WWII', estimatedMinutes: 60 }],
            priority: 'low' as const,
          },
        ],
        availableHoursPerDay: 20,
        planningStartDate: '2026-11-09',
        planningPeriodDays: 7 as const,
      };

      const result = PlanGenerationRequestSchema.safeParse(invalidReq);
      expect(result.success).toBe(false);
    });
  });

  describe('StudyPlanSchema', () => {
    it('validates structured schedule plan output', () => {
      const plan = {
        planTitle: '7-Day Study Plan',
        summary: 'Balanced schedule prioritizing upcoming Calculus test',
        days: [
          {
            date: '2026-11-09',
            tasks: [
              {
                id: 'task-1',
                subjectId: 'sub-1',
                subjectName: 'Calculus',
                topic: 'Chain Rule',
                durationMinutes: 45,
                priority: 'high' as const,
                reason: 'Approaching exam in 3 days',
                completed: false,
              },
            ],
          },
        ],
        warnings: [],
      };

      const result = StudyPlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    });
  });
});
