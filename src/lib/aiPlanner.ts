import { GoogleGenAI, Type } from '@google/genai';
import { PlanGenerationRequest, StudyPlan } from '@/types';
import { StudyPlanSchema } from './schemas';
import { generateId, getDaysRemaining } from './utils';

export const SYSTEM_PROMPT = `You are StudyFlow AI, an elite academic scheduling assistant and pedagogical planner for university students.
Your mission is to generate actionable, realistic, constraint-aware study schedules.

CORE SCHEDULING RULES:
1. Strict Time Budget: The sum of durationMinutes for tasks on ANY single day MUST NOT exceed (availableHoursPerDay * 60) minutes.
2. Deadline Awareness: Study tasks for a subject must be scheduled ON or BEFORE that subject's examination or assignment deadline. Never schedule preparatory study after the deadline has passed.
3. Difficulty & Urgency Allocation:
   - Subjects with closer deadlines and "hard" difficulty need more focus and earlier slots.
   - High-priority subjects take precedence over lower-priority subjects.
4. Granular Sessions: Large topics must be broken down into digestible, focused study sessions (typically 30 to 60 minutes).
5. Meaningful Descriptions & Pedagogical Reasons: For each task, state the specific topic focus and provide a clear academic reason (e.g., "Approaching exam in 3 days; tackling high-difficulty core theorem first").
6. Spaced Repetition: Distribute topics across the planning days rather than cramming one subject all in one day.
7. Capacity Warnings: If the total required study time exceeds total available hours across the planning window, prioritize the most urgent subjects and explicitly document unscheduled topics in the "warnings" array.
8. Truthfulness: Never invent subjects or topics that were not provided in the student's request. Output valid JSON adhering strictly to the provided schema.`;

/**
 * Gemini JSON response schema definition for structured study plan output.
 */
export const GEMINI_STUDY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    planTitle: {
      type: Type.STRING,
      description: 'The overall title of the study plan, e.g. "Finals Sprint Study Plan"',
    },
    summary: {
      type: Type.STRING,
      description: 'A pedagogical summary explaining prioritization choices, focus areas, and how student constraints were balanced.',
    },
    days: {
      type: Type.ARRAY,
      description: 'The schedule of study days inside the planning horizon.',
      items: {
        type: Type.OBJECT,
        properties: {
          date: {
            type: Type.STRING,
            description: 'ISO 8601 date string (YYYY-MM-DD)',
          },
          tasks: {
            type: Type.ARRAY,
            description: 'Study tasks allocated to this date',
            items: {
              type: Type.OBJECT,
              properties: {
                subjectId: {
                  type: Type.STRING,
                  description: 'The exact ID of the subject this task belongs to',
                },
                subjectName: {
                  type: Type.STRING,
                  description: 'The human-readable name of the subject',
                },
                topic: {
                  type: Type.STRING,
                  description: 'The specific topic or concept being studied',
                },
                durationMinutes: {
                  type: Type.INTEGER,
                  description: 'Duration of the study session in minutes (15 to 180)',
                },
                priority: {
                  type: Type.STRING,
                  description: 'Priority level for this study session',
                  enum: ['low', 'medium', 'high'],
                },
                reason: {
                  type: Type.STRING,
                  description: 'Pedagogical explanation for scheduling this topic on this date',
                },
              },
              required: ['subjectId', 'subjectName', 'topic', 'durationMinutes', 'priority', 'reason'],
            },
          },
        },
        required: ['date', 'tasks'],
      },
    },
    warnings: {
      type: Type.ARRAY,
      description: 'Any warnings regarding tight deadlines, overloaded schedules, or excluded topics',
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ['planTitle', 'summary', 'days', 'warnings'],
};

/**
 * Validates domain and business constraints on model-generated or incoming plans.
 */
export function validatePlanBusinessConstraints(
  plan: StudyPlan,
  request: PlanGenerationRequest
): { isValid: boolean; errors: string[]; sanitizedPlan: StudyPlan } {
  const errors: string[] = [];
  const validSubjectIds = new Set(request.subjects.map((s) => s.id));
  const subjectMap = new Map(request.subjects.map((s) => [s.id, s]));
  const dailyMinuteLimit = Math.round(request.availableHoursPerDay * 60);

  // Collect all valid dates in the planning window
  const validDates = new Set<string>();
  const [sYear, sMonth, sDay] = request.planningStartDate.split('-').map(Number);
  for (let i = 0; i < request.planningPeriodDays; i++) {
    const d = new Date(sYear, sMonth - 1, sDay + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    validDates.add(dateStr);
  }

  const sanitizedDays = plan.days.map((day) => {
    // Check 1: Day date must be inside planning window
    if (!validDates.has(day.date)) {
      errors.push(`Scheduled date ${day.date} is outside the allowed planning window.`);
    }

    let dailyTotal = 0;
    const sanitizedTasks = [];

    for (const task of day.tasks) {
      // Check 2: Every subject ID must exist
      if (!validSubjectIds.has(task.subjectId)) {
        errors.push(`Task references non-existent subject ID: ${task.subjectId}`);
        continue;
      }

      const subject = subjectMap.get(task.subjectId);
      if (!subject) continue;

      // Check 3: Do not schedule study tasks after a subject's deadline
      if (day.date > subject.deadline) {
        errors.push(
          `Task "${task.topic}" for ${subject.name} is scheduled on ${day.date}, which is AFTER its deadline of ${subject.deadline}.`
        );
      }

      // Check 4: Duration must be positive and reasonable
      if (task.durationMinutes <= 0 || task.durationMinutes > 360) {
        errors.push(`Task "${task.topic}" has invalid duration: ${task.durationMinutes} minutes.`);
      }

      dailyTotal += task.durationMinutes;
      sanitizedTasks.push({
        ...task,
        id: task.id || generateId('task'),
        subjectName: subject.name,
        completed: Boolean(task.completed),
      });
    }

    // Check 5: Daily allocated time must not exceed availability (with a small 5-min tolerance for rounding)
    if (dailyTotal > dailyMinuteLimit + 5) {
      errors.push(
        `Day ${day.date} allocated ${dailyTotal}m, which exceeds daily limit of ${dailyMinuteLimit}m.`
      );
    }

    return {
      date: day.date,
      tasks: sanitizedTasks,
    };
  });

  const sanitizedPlan: StudyPlan = {
    ...plan,
    days: sanitizedDays,
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedPlan,
  };
}

/**
 * Call Google Gemini API to generate a personalized study plan.
 */
export async function generateAiStudyPlan(
  request: PlanGenerationRequest,
  apiKey: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<StudyPlan> {
  const ai = new GoogleGenAI({ apiKey });

  const promptContent = `
Student Academic Profile & Planning Request:
- Planning Start Date: ${request.planningStartDate}
- Planning Period: ${request.planningPeriodDays} days
- Available Study Hours per Day: ${request.availableHoursPerDay} hours (${Math.round(request.availableHoursPerDay * 60)} minutes/day max)
- Preferred Session Length: ${request.preferredSessionMinutes || 45} minutes
${request.customInstructions ? `- Special Student Instructions: ${request.customInstructions}` : ''}

Subjects to Schedule:
${request.subjects
  .map(
    (s) => `
* Subject: "${s.name}" (ID: ${s.id})
  - Difficulty: ${s.difficulty}
  - Priority: ${s.priority}
  - Deadline: ${s.deadline} (Days remaining: ${getDaysRemaining(s.deadline, request.planningStartDate)})
  - Topics:
${s.topics.map((t) => `    - "${t.name}" (Est: ${t.estimatedMinutes} mins, ID: ${t.id})`).join('\n')}
`
  )
  .join('\n')}

INSTRUCTIONS:
Generate a structured study plan matching the required schema. Ensure strict adherence to the student's daily time budget and course deadlines.
`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: promptContent,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_STUDY_PLAN_SCHEMA,
      httpOptions: {
        timeout: 35000,
      },
    },
  });

  const rawText = response.text;
  if (!rawText || !rawText.trim()) {
    throw new Error('Gemini returned an empty response.');
  }

  let rawJson = rawText.trim();
  // Strip markdown code block wrappers if present
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsedObject: unknown;
  try {
    parsedObject = JSON.parse(rawJson);
  } catch (err) {
    throw new Error(`Failed to parse AI output as valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Runtime Zod schema validation
  const validationResult = StudyPlanSchema.safeParse(parsedObject);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`AI generated plan failed structural schema validation: ${errorDetails}`);
  }

  const candidatePlan: StudyPlan = {
    id: generateId('ai-plan'),
    planTitle: validationResult.data.planTitle,
    summary: validationResult.data.summary,
    generatedAt: new Date().toISOString(),
    planningPeriodDays: request.planningPeriodDays,
    startDate: request.planningStartDate,
    dailyHoursLimit: request.availableHoursPerDay,
    preferredSessionMinutes: request.preferredSessionMinutes || 45,
    isAiGenerated: true,
    modelUsed: modelName,
    days: validationResult.data.days.map((day) => ({
      date: day.date,
      tasks: day.tasks.map((task) => ({
        ...task,
        id: task.id || generateId('task'),
        completed: false,
        completedAt: null,
      })),
    })),
    warnings: validationResult.data.warnings || [],
  };

  // Business constraint validation
  const businessCheck = validatePlanBusinessConstraints(candidatePlan, request);
  if (!businessCheck.isValid) {
    console.warn('[AI Plan Warning] Plan had constraint violations:', businessCheck.errors);
    // Append constraint warnings to user warnings instead of hard failing if recoverable
    candidatePlan.warnings.push(...businessCheck.errors);
  }

  return businessCheck.sanitizedPlan;
}
