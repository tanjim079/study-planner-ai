/**
 * Core type definitions for StudyFlow AI — Intelligent Study Planner
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface Topic {
  id: string;
  name: string;
  estimatedMinutes: number;
  completed?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  difficulty: DifficultyLevel;
  deadline: string; // ISO date string (YYYY-MM-DD)
  topics: Topic[];
  priority: PriorityLevel;
  color?: string; // Hex color or Tailwind accent
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
}

export interface StudyTask {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  topicId?: string;
  durationMinutes: number;
  priority: PriorityLevel;
  reason: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface DayPlan {
  date: string; // ISO date string (YYYY-MM-DD)
  tasks: StudyTask[];
}

export interface StudyPlan {
  id: string;
  planTitle: string;
  summary: string;
  generatedAt: string;
  planningPeriodDays: 7 | 14;
  startDate: string;
  dailyHoursLimit: number;
  preferredSessionMinutes: number;
  isAiGenerated: boolean;
  modelUsed?: string;
  days: DayPlan[];
  warnings: string[];
}

export interface UserPreferences {
  dailyStudyHours: number; // e.g., 4
  preferredSessionMinutes: number; // e.g., 45 or 60
  planningPeriodDays: 7 | 14;
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface PlanGenerationRequest {
  subjects: {
    id: string;
    name: string;
    difficulty: DifficultyLevel;
    deadline: string;
    topics: { id: string; name: string; estimatedMinutes: number }[];
    priority: PriorityLevel;
  }[];
  availableHoursPerDay: number;
  planningStartDate: string; // YYYY-MM-DD
  planningPeriodDays: 7 | 14;
  preferredSessionMinutes?: number;
  customInstructions?: string;
}

export interface StorageSchemaV1 {
  version: 1;
  subjects: Subject[];
  activePlan: StudyPlan | null;
  historyPlans: StudyPlan[];
  preferences: UserPreferences;
  lastUpdated: string;
}

export type StorageSchema = StorageSchemaV1;

export interface ProgressSummary {
  totalScheduledMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  subjectBreakdown: {
    subjectId: string;
    subjectName: string;
    totalMinutes: number;
    completedMinutes: number;
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    color?: string;
  }[];
}

