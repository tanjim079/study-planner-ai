import { z } from 'zod';

export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']);
export const PriorityLevelSchema = z.enum(['low', 'medium', 'high']);

export const TopicSchema = z.object({
  id: z.string().min(1, 'Topic ID is required'),
  name: z.string().trim().min(1, 'Topic name cannot be empty').max(120, 'Topic name is too long'),
  estimatedMinutes: z
    .number()
    .int('Duration must be a whole number')
    .min(10, 'Minimum topic duration is 10 minutes')
    .max(480, 'Maximum topic duration is 8 hours (480 minutes)'),
  completed: z.boolean().optional().default(false),
});

export const SubjectSchema = z.object({
  id: z.string().min(1, 'Subject ID is required'),
  name: z.string().trim().min(1, 'Subject name cannot be empty').max(100, 'Subject name is too long'),
  description: z.string().trim().max(500, 'Description must be under 500 characters').optional().default(''),
  difficulty: DifficultyLevelSchema,
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be a valid date formatted as YYYY-MM-DD'),
  topics: z.array(TopicSchema).min(1, 'At least one study topic is required'),
  priority: PriorityLevelSchema,
  color: z.string().optional(),
  createdAt: z.string().datetime().or(z.string()),
  updatedAt: z.string().datetime().or(z.string()),
});

export const CreateSubjectInputSchema = z.object({
  name: z.string().trim().min(1, 'Subject name cannot be empty').max(100, 'Subject name is too long'),
  description: z.string().trim().max(500, 'Description must be under 500 characters').optional().default(''),
  difficulty: DifficultyLevelSchema,
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be formatted as YYYY-MM-DD')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid deadline date'),
  topics: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Topic name cannot be empty').max(120),
        estimatedMinutes: z
          .number()
          .int()
          .min(10, 'Minimum duration is 10 minutes')
          .max(480, 'Maximum duration is 480 minutes'),
      })
    )
    .min(1, 'Please add at least one topic to study'),
  priority: PriorityLevelSchema,
  color: z.string().optional(),
});

export const PlanGenerationRequestSchema = z.object({
  subjects: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        difficulty: DifficultyLevelSchema,
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        topics: z.array(
          z.object({
            id: z.string().min(1),
            name: z.string().min(1),
            estimatedMinutes: z.number().int().positive(),
          })
        ),
        priority: PriorityLevelSchema,
      })
    )
    .min(1, 'At least one subject is required to generate a plan'),
  availableHoursPerDay: z
    .number()
    .min(0.5, 'Available study hours must be at least 30 minutes (0.5h)')
    .max(16, 'Available study hours cannot exceed 16 hours per day'),
  planningStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Planning start date must be YYYY-MM-DD'),
  planningPeriodDays: z.union([z.literal(7), z.literal(14)]),
  preferredSessionMinutes: z
    .number()
    .int()
    .min(15, 'Session duration must be at least 15 minutes')
    .max(180, 'Session duration cannot exceed 180 minutes')
    .optional()
    .default(45),
  customInstructions: z.string().max(500).optional(),
});

export const StudyTaskSchema = z.object({
  id: z.string().default(() => `task-${Math.random().toString(36).substring(2, 9)}`),
  subjectId: z.string().min(1, 'Subject ID is required'),
  subjectName: z.string().min(1, 'Subject name is required'),
  topic: z.string().min(1, 'Topic name is required'),
  topicId: z.string().optional(),
  durationMinutes: z
    .number()
    .int()
    .min(10, 'Duration must be at least 10 minutes')
    .max(300, 'Duration cannot exceed 300 minutes'),
  priority: PriorityLevelSchema,
  reason: z.string().min(1, 'Reason for task scheduling must be provided'),
  completed: z.boolean().default(false),
  completedAt: z.string().nullable().optional(),
});

export const DayPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  tasks: z.array(StudyTaskSchema),
});

export const StudyPlanSchema = z.object({
  planTitle: z.string().min(1, 'Plan title is required'),
  summary: z.string().min(1, 'Plan summary is required'),
  days: z.array(DayPlanSchema),
  warnings: z.array(z.string()).default([]),
});

export const UserPreferencesSchema = z.object({
  dailyStudyHours: z.number().min(0.5).max(16).default(4),
  preferredSessionMinutes: z.number().min(15).max(180).default(45),
  planningPeriodDays: z.union([z.literal(7), z.literal(14)]).default(7),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
});
