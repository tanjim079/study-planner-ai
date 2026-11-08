import {
  PlanGenerationRequest,
  StudyPlan,
  StudyTask,
  DayPlan,
  DifficultyLevel,
  PriorityLevel,
} from '@/types';
import { addDaysToIso, generateId, getDaysRemaining } from './utils';

interface ChunkedTopicItem {
  subjectId: string;
  subjectName: string;
  deadline: string;
  difficulty: DifficultyLevel;
  priority: PriorityLevel;
  topicName: string;
  topicId: string;
  durationMinutes: number;
  partIndex: number;
  totalParts: number;
  priorityScore: number;
  reason: string;
}

/**
 * Calculates a deterministic priority score based on deadline urgency, difficulty, and user priority.
 *
 * Formula:
 * UrgencyFactor * DifficultyMultiplier * PriorityMultiplier
 */
export function calculatePriorityScore(
  deadline: string,
  difficulty: DifficultyLevel,
  priority: PriorityLevel,
  startDate: string
): { score: number; reason: string } {
  const daysLeft = getDaysRemaining(deadline, startDate);

  let urgencyFactor = 1.0;
  let urgencyText = 'Standard timeline';

  if (daysLeft < 0) {
    urgencyFactor = 6.0;
    urgencyText = 'Immediate catch-up (deadline passed)';
  } else if (daysLeft === 0) {
    urgencyFactor = 5.0;
    urgencyText = 'Due today — urgent prioritization';
  } else if (daysLeft <= 2) {
    urgencyFactor = 4.0;
    urgencyText = `Due in ${daysLeft} days — high urgency`;
  } else if (daysLeft <= 5) {
    urgencyFactor = 2.5;
    urgencyText = `Approaching deadline (${daysLeft} days remaining)`;
  } else if (daysLeft <= 10) {
    urgencyFactor = 1.8;
    urgencyText = `Mid-range deadline (${daysLeft} days)`;
  } else {
    urgencyFactor = Math.max(1.0, 15 / daysLeft);
    urgencyText = `Comfortable timeline (${daysLeft} days)`;
  }

  const difficultyMultipliers: Record<DifficultyLevel, number> = {
    hard: 1.6,
    medium: 1.1,
    easy: 0.8,
  };

  const priorityMultipliers: Record<PriorityLevel, number> = {
    high: 1.5,
    medium: 1.0,
    low: 0.7,
  };

  const diffMultiplier = difficultyMultipliers[difficulty] || 1.0;
  const prioMultiplier = priorityMultipliers[priority] || 1.0;

  const score = urgencyFactor * diffMultiplier * prioMultiplier;
  const reason = `${urgencyText}; ${difficulty} difficulty (${diffMultiplier}x); ${priority} priority (${prioMultiplier}x)`;

  return { score, reason };
}

/**
 * Generates a deterministic study plan using greedy constraint satisfaction with
 * deadline enforcement and spaced repetition heuristics.
 */
export function generateDeterministicPlan(request: PlanGenerationRequest): StudyPlan {
  const {
    subjects,
    availableHoursPerDay,
    planningStartDate,
    planningPeriodDays,
    preferredSessionMinutes = 45,
  } = request;

  const dailyMinutesLimit = Math.round(availableHoursPerDay * 60);
  const totalAvailableMinutes = dailyMinutesLimit * planningPeriodDays;
  const warnings: string[] = [];

  // 1. Break each topic into manageable study chunks
  const topicQueue: ChunkedTopicItem[] = [];
  let totalRequestedMinutes = 0;

  for (const subject of subjects) {
    const { score, reason } = calculatePriorityScore(
      subject.deadline,
      subject.difficulty,
      subject.priority,
      planningStartDate
    );

    for (const topic of subject.topics) {
      totalRequestedMinutes += topic.estimatedMinutes;
      const chunksCount = Math.max(
        1,
        Math.ceil(topic.estimatedMinutes / preferredSessionMinutes)
      );
      const minutesPerChunk = Math.round(topic.estimatedMinutes / chunksCount);

      for (let i = 0; i < chunksCount; i++) {
        const partLabel =
          chunksCount > 1
            ? `${topic.name} (Part ${i + 1}/${chunksCount})`
            : topic.name;

        topicQueue.push({
          subjectId: subject.id,
          subjectName: subject.name,
          deadline: subject.deadline,
          difficulty: subject.difficulty,
          priority: subject.priority,
          topicName: partLabel,
          topicId: topic.id,
          durationMinutes: minutesPerChunk,
          partIndex: i,
          totalParts: chunksCount,
          priorityScore: score,
          reason,
        });
      }
    }
  }

  // Check capacity constraint
  if (totalRequestedMinutes > totalAvailableMinutes) {
    const deficitMinutes = totalRequestedMinutes - totalAvailableMinutes;
    const hoursShort = (deficitMinutes / 60).toFixed(1);
    warnings.push(
      `Time budget deficit: Total requested study time (${(totalRequestedMinutes / 60).toFixed(1)}h) exceeds available time (${(totalAvailableMinutes / 60).toFixed(1)}h) by ${hoursShort}h across ${planningPeriodDays} days. Consider increasing daily study hours or extending the period.`
    );
  }

  // 2. Sort topic chunks by priority score descending
  topicQueue.sort((a, b) => b.priorityScore - a.priorityScore);

  // 3. Initialize days
  const days: DayPlan[] = [];
  const dailyAllocatedMinutes: number[] = [];

  for (let d = 0; d < planningPeriodDays; d++) {
    const dateStr = addDaysToIso(planningStartDate, d);
    days.push({
      date: dateStr,
      tasks: [],
    });
    dailyAllocatedMinutes.push(0);
  }

  // 4. Distribute tasks across days respecting deadlines and daily budgets
  const unscheduledTasks: ChunkedTopicItem[] = [];

  for (const item of topicQueue) {
    let scheduled = false;

    // Determine the latest day index this subject can be studied (must not exceed deadline)
    let maxAllowedDayIndex = planningPeriodDays - 1;
    for (let d = 0; d < planningPeriodDays; d++) {
      if (days[d].date > item.deadline) {
        maxAllowedDayIndex = Math.max(0, d - 1);
        break;
      }
    }

    // Attempt to place in a day with capacity and subject variety
    for (let d = 0; d <= maxAllowedDayIndex; d++) {
      const currentDayMinutes = dailyAllocatedMinutes[d];
      if (currentDayMinutes + item.durationMinutes <= dailyMinutesLimit) {
        // Prevent stacking too many tasks of the same subject on the same day if possible
        const existingSubjectMinutesOnDay = days[d].tasks
          .filter((t) => t.subjectId === item.subjectId)
          .reduce((sum, t) => sum + t.durationMinutes, 0);

        // Allow up to 65% of daily budget for a single subject unless no other option
        if (
          existingSubjectMinutesOnDay + item.durationMinutes <=
            dailyMinutesLimit * 0.65 ||
          d === maxAllowedDayIndex
        ) {
          const task: StudyTask = {
            id: generateId('task'),
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            topic: item.topicName,
            topicId: item.topicId,
            durationMinutes: item.durationMinutes,
            priority: item.priority,
            reason: item.reason,
            completed: false,
            completedAt: null,
          };

          days[d].tasks.push(task);
          dailyAllocatedMinutes[d] += item.durationMinutes;
          scheduled = true;
          break;
        }
      }
    }

    // Fallback: If not scheduled yet due to subject distribution limit, place in earliest day with any capacity
    if (!scheduled) {
      for (let d = 0; d <= maxAllowedDayIndex; d++) {
        if (
          dailyAllocatedMinutes[d] + item.durationMinutes <=
          dailyMinutesLimit
        ) {
          const task: StudyTask = {
            id: generateId('task'),
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            topic: item.topicName,
            topicId: item.topicId,
            durationMinutes: item.durationMinutes,
            priority: item.priority,
            reason: item.reason,
            completed: false,
            completedAt: null,
          };
          days[d].tasks.push(task);
          dailyAllocatedMinutes[d] += item.durationMinutes;
          scheduled = true;
          break;
        }
      }
    }

    if (!scheduled) {
      unscheduledTasks.push(item);
    }
  }

  // 5. Add warnings for unscheduled topics
  if (unscheduledTasks.length > 0) {
    const unscheduledNames = Array.from(
      new Set(unscheduledTasks.map((t) => `${t.subjectName}: ${t.topicName}`))
    );
    warnings.push(
      `Could not schedule ${unscheduledTasks.length} session(s) due to daily time limits or strict deadline constraints: ${unscheduledNames.slice(0, 3).join(', ')}${unscheduledNames.length > 3 ? ` and ${unscheduledNames.length - 3} more` : ''}.`
    );
  }

  // 6. Return structured plan
  return {
    id: generateId('plan'),
    planTitle: `${planningPeriodDays}-Day Structured Study Plan (Basic Plan)`,
    summary: `Deterministic study schedule allocating ${(totalRequestedMinutes / 60).toFixed(1)}h across ${planningPeriodDays} days with strict daily limits (${availableHoursPerDay}h/day max) and deadline prioritization.`,
    generatedAt: new Date().toISOString(),
    planningPeriodDays,
    startDate: planningStartDate,
    dailyHoursLimit: availableHoursPerDay,
    preferredSessionMinutes,
    isAiGenerated: false,
    modelUsed: 'Deterministic Fallback Planner (No External AI)',
    days,
    warnings,
  };
}
