import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DifficultyLevel, PriorityLevel } from '@/types';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random UUID-like unique identifier
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format minutes into a readable string (e.g. "2h 30m" or "45m")
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format an ISO date (YYYY-MM-DD) into a friendly string (e.g. "Mon, Nov 9, 2026")
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Calculate days remaining until a deadline
 */
export function getDaysRemaining(deadlineIso: string, referenceDateIso?: string): number {
  if (!deadlineIso) return 0;
  const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
  refDate.setHours(0, 0, 0, 0);

  const [year, month, day] = deadlineIso.split('-').map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - refDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get human-readable urgency status
 */
export function getUrgencyBadge(daysRemaining: number): {
  label: string;
  className: string;
} {
  if (daysRemaining < 0) {
    return {
      label: `${Math.abs(daysRemaining)}d overdue`,
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    };
  }
  if (daysRemaining === 0) {
    return {
      label: 'Due Today',
      className: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse',
    };
  }
  if (daysRemaining <= 2) {
    return {
      label: `${daysRemaining}d left (Urgent)`,
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }
  if (daysRemaining <= 7) {
    return {
      label: `${daysRemaining}d left`,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    };
  }
  return {
    label: `${daysRemaining}d left`,
    className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
}

/**
 * Get difficulty badge styling
 */
export function getDifficultyBadge(difficulty: DifficultyLevel): {
  label: string;
  className: string;
} {
  switch (difficulty) {
    case 'hard':
      return {
        label: 'Hard',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      };
    case 'medium':
      return {
        label: 'Medium',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    case 'easy':
    default:
      return {
        label: 'Easy',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
  }
}

/**
 * Get priority badge styling
 */
export function getPriorityBadge(priority: PriorityLevel): {
  label: string;
  className: string;
} {
  switch (priority) {
    case 'high':
      return {
        label: 'High Priority',
        className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      };
    case 'medium':
      return {
        label: 'Medium Priority',
        className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      };
    case 'low':
    default:
      return {
        label: 'Low Priority',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
  }
}

/**
 * Helper to get today's ISO date string (YYYY-MM-DD)
 */
export function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to an ISO date
 */
export function addDaysToIso(isoDate: string, daysToAdd: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Distinct vibrant subject colors for easy visual tracking
 */
export const SUBJECT_PALETTE = [
  '#2563EB', // Blue
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Violet
  '#0891B2', // Cyan
  '#DB2777', // Pink
];

export function getRandomSubjectColor(index: number = 0): string {
  return SUBJECT_PALETTE[index % SUBJECT_PALETTE.length];
}

