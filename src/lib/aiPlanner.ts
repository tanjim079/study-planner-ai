import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
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
5. Meaningful & Concise Descriptions: For each task, state the specific topic focus and provide a concise academic reason (max 15 words, e.g., "Core theorem review before exam").
6. Output Economy & Necessary Tasks Only:
   - Only schedule necessary study sessions to fulfill the requested topic estimates.
   - ONLY generate days that have actual study tasks assigned. Do NOT generate empty days or unpopulated date objects (e.g., if only 2 hours of study are required across a 14-day horizon, schedule only the 1-2 active study days needed; do not generate 14 day entries).
   - Avoid redundant explanations, unused schedule objects, and fluff.
7. Capacity Warnings: If total required study time exceeds total available hours across the planning window, prioritize the most urgent subjects and document unscheduled topics in the "warnings" array.
8. Truthfulness & Schema Conformance: Keep plan summary brief (1-2 sentences). Never invent subjects or topics. Output valid JSON adhering strictly to the provided schema.`;

/**
 * Optimized Gemini JSON response schema definition for structured study plan output.
 * Minimizes extraneous token generation while strictly preserving scheduling rules.
 */
export const GEMINI_STUDY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    planTitle: {
      type: Type.STRING,
      description: 'Concise title of the study plan, e.g. "Linear Algebra Sprint"',
    },
    summary: {
      type: Type.STRING,
      description: 'A concise 1-2 sentence overview explaining prioritization.',
    },
    days: {
      type: Type.ARRAY,
      description: 'Schedule of active study days. Only include days that have scheduled study tasks; do NOT generate empty days.',
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
                  description: 'Brief pedagogical explanation (max 15 words)',
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

export type GeminiErrorCategory =
  | 'OVERLOAD_503'
  | 'RATE_LIMITED_429'
  | 'QUOTA_EXHAUSTED'
  | 'SERVER_ERROR_5XX'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'AUTH_FAILURE'
  | 'BAD_REQUEST'
  | 'STRUCTURAL_VALIDATION_ERROR'
  | 'BUSINESS_CONSTRAINT_ERROR'
  | 'EMPTY_RESPONSE'
  | 'UNKNOWN_ERROR';

export interface CategorizedError {
  category: GeminiErrorCategory;
  isRetryable: boolean;
  retryAfterMs: number | null;
  message: string;
  statusCode?: number;
}

/**
 * Extracts and parses a Retry-After header or message delay value if present.
 */
export function extractRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;

  const errObj = error as Record<string, unknown>;
  let headerValue: string | null = null;

  // 1. Direct headers property
  if (errObj.headers) {
    if (typeof (errObj.headers as Headers).get === 'function') {
      headerValue = (errObj.headers as Headers).get('retry-after');
    } else if (typeof errObj.headers === 'object') {
      const h = errObj.headers as Record<string, string>;
      headerValue = h['retry-after'] || h['Retry-After'] || null;
    }
  }

  // 2. Nested response headers property
  if (!headerValue && errObj.response && typeof errObj.response === 'object') {
    const res = errObj.response as Record<string, unknown>;
    if (res.headers) {
      if (typeof (res.headers as Headers).get === 'function') {
        headerValue = (res.headers as Headers).get('retry-after');
      } else if (typeof res.headers === 'object') {
        const h = res.headers as Record<string, string>;
        headerValue = h['retry-after'] || h['Retry-After'] || null;
      }
    }
  }

  // 3. Fallback regex in error message string
  if (!headerValue && typeof errObj.message === 'string') {
    const match = errObj.message.match(/retry(?:-|\s+)after[:\s]+(\d+)/i);
    if (match) {
      headerValue = match[1];
    }
  }

  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.round(seconds * 1000);
  }

  const parsedDate = Date.parse(headerValue);
  if (!Number.isNaN(parsedDate)) {
    const diff = parsedDate - Date.now();
    return diff > 0 ? diff : 0;
  }

  return null;
}

/**
 * Categorizes an API or processing error into retryable and non-retryable buckets.
 */
export function categorizeGeminiError(error: unknown): CategorizedError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMsg = message.toLowerCase();
  const retryAfterMs = extractRetryAfterMs(error);

  const status =
    error && typeof error === 'object' && 'status' in error && typeof (error as { status: unknown }).status === 'number'
      ? (error as { status: number }).status
      : undefined;

  // 1. Authentication & Authorization Failure (Never Retry)
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('401') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('forbidden')
  ) {
    return {
      category: 'AUTH_FAILURE',
      isRetryable: false,
      retryAfterMs: null,
      message,
      statusCode: status ?? 401,
    };
  }

  // 2. Permanent Quota Exhaustion (Never Retry)
  if (
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('quota') ||
    lowerMsg.includes('billing') ||
    lowerMsg.includes('exceeded your current quota') ||
    lowerMsg.includes('daily limit')
  ) {
    return {
      category: 'QUOTA_EXHAUSTED',
      isRetryable: false,
      retryAfterMs: null,
      message,
      statusCode: status ?? 429,
    };
  }

  // 3. Transient 429 Rate Limiting
  if (
    status === 429 ||
    lowerMsg.includes('429') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('too many requests')
  ) {
    return {
      category: 'RATE_LIMITED_429',
      isRetryable: true,
      retryAfterMs,
      message,
      statusCode: 429,
    };
  }

  // 4. Bad Request / Malformed Arguments (Never Retry)
  if (
    status === 400 ||
    lowerMsg.includes('400') ||
    lowerMsg.includes('invalid_argument') ||
    lowerMsg.includes('bad request')
  ) {
    return {
      category: 'BAD_REQUEST',
      isRetryable: false,
      retryAfterMs: null,
      message,
      statusCode: status ?? 400,
    };
  }

  // 5. Provider Overload / 503 UNAVAILABLE (Bounded Retry)
  if (
    status === 503 ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('overloaded') ||
    lowerMsg.includes('temporarily unavailable') ||
    lowerMsg.includes('busy')
  ) {
    return {
      category: 'OVERLOAD_503',
      isRetryable: true,
      retryAfterMs,
      message,
      statusCode: status ?? 503,
    };
  }

  // 6. Other 5xx Server Errors (500, 502)
  if (
    status === 500 ||
    status === 502 ||
    lowerMsg.includes('500 internal') ||
    lowerMsg.includes('502 bad gateway')
  ) {
    return {
      category: 'SERVER_ERROR_5XX',
      isRetryable: true,
      retryAfterMs,
      message,
      statusCode: status ?? 500,
    };
  }

  // 7. Request Timeout (408, 504 GATEWAY_TIMEOUT, DEADLINE_EXCEEDED, AbortError)
  if (
    status === 408 ||
    status === 504 ||
    lowerMsg.includes('504') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('deadline_exceeded') ||
    lowerMsg.includes('aborterror')
  ) {
    return {
      category: 'TIMEOUT',
      isRetryable: true,
      retryAfterMs: null,
      message,
      statusCode: status ?? 504,
    };
  }

  // 8. Network / Connection Errors
  if (
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('socket hang up') ||
    lowerMsg.includes('network')
  ) {
    return {
      category: 'NETWORK_ERROR',
      isRetryable: true,
      retryAfterMs: null,
      message,
    };
  }

  // 9. Validation & Parsing Failures (Never Retry model call)
  if (
    lowerMsg.includes('empty response') ||
    lowerMsg.includes('returned an empty response')
  ) {
    return {
      category: 'EMPTY_RESPONSE',
      isRetryable: false,
      retryAfterMs: null,
      message,
    };
  }

  if (
    lowerMsg.includes('structural schema validation') ||
    lowerMsg.includes('failed to parse ai output as valid json')
  ) {
    return {
      category: 'STRUCTURAL_VALIDATION_ERROR',
      isRetryable: false,
      retryAfterMs: null,
      message,
    };
  }

  if (lowerMsg.includes('constraint violation') || lowerMsg.includes('business constraint')) {
    return {
      category: 'BUSINESS_CONSTRAINT_ERROR',
      isRetryable: false,
      retryAfterMs: null,
      message,
    };
  }

  // 10. Circuit Breaker Open
  if (lowerMsg.includes('circuit breaker is open') || lowerMsg.includes('circuit_breaker_open')) {
    return {
      category: 'OVERLOAD_503',
      isRetryable: false,
      retryAfterMs: null,
      message,
      statusCode: 503,
    };
  }

  // Default fallback
  return {
    category: 'UNKNOWN_ERROR',
    isRetryable: false,
    retryAfterMs: null,
    message,
    statusCode: status,
  };
}

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
 * In-memory Circuit Breaker for LLM provider resilience.
 *
 * Prevents repeatedly hammering an overloaded or failing Gemini model.
 *
 * SERVERLESS ARCHITECTURE NOTE & LIMITATIONS:
 * In a serverless environment (e.g., Vercel Serverless Functions, AWS Lambda),
 * Node.js process memory is scoped to each isolated container/worker.
 * Warm instances retain circuit breaker state across requests, protecting upstream
 * providers during traffic spikes handled by that worker. However, cold starts on new
 * containers initialize with default CLOSED state. For cross-region distributed coordination,
 * an external shared cache (such as Upstash Redis or Vercel KV) would be required.
 * This in-memory implementation provides zero-latency, zero-dependency resilience for local
 * development, tests, and active warm serverless containers.
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Number of consecutive transient failures before tripping OPEN (default: 2)
  cooldownPeriodMs?: number; // How long to stay OPEN before attempting probe in HALF_OPEN (default: 30000ms = 30s)
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAllowedAttemptTime: number | null;
}

export class ModelCircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private consecutiveFailures: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAllowedAttemptTime: number | null = null;
  private failureThreshold: number = 2;
  private cooldownPeriodMs: number = 30000;

  constructor(config?: CircuitBreakerConfig) {
    if (config?.failureThreshold !== undefined) this.failureThreshold = config.failureThreshold;
    if (config?.cooldownPeriodMs !== undefined) this.cooldownPeriodMs = config.cooldownPeriodMs;
  }

  public getState(): CircuitBreakerState {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (this.nextAllowedAttemptTime && now >= this.nextAllowedAttemptTime) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  public isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.lastSuccessTime = Date.now();
    this.nextAllowedAttemptTime = null;
  }

  public recordFailure(isTransient: boolean): void {
    this.lastFailureTime = Date.now();
    if (isTransient) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= this.failureThreshold || this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
        this.nextAllowedAttemptTime = Date.now() + this.cooldownPeriodMs;
      }
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAllowedAttemptTime = null;
  }

  public getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAllowedAttemptTime: this.nextAllowedAttemptTime,
    };
  }
}

const circuitBreakers = new Map<string, ModelCircuitBreaker>();

export function getCircuitBreaker(modelName: string, config?: CircuitBreakerConfig): ModelCircuitBreaker {
  let cb = circuitBreakers.get(modelName);
  if (!cb) {
    cb = new ModelCircuitBreaker(config);
    circuitBreakers.set(modelName, cb);
  }
  return cb;
}

export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

export interface RetryOptions {
  maxRetries?: number; // Maximum retries after original request (default: 1 => max 2 attempts total for interactive UX)
  overallTimeoutMs?: number; // Hard deadline for entire operation (default: 28000ms)
  perAttemptTimeoutMs?: number; // Per-attempt timeout passed to SDK (default: 20000ms, Gemini min is 10s)
  initialBackoffMs?: number; // Base exponential backoff delay (default: 1000ms)
  fallbackModel?: string; // Optional secondary failover model (e.g. 'gemini-3.6-flash')
  enableModelFailover?: boolean; // Explicit toggle for failover
  circuitBreakerConfig?: CircuitBreakerConfig;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Google Gemini API to generate a personalized study plan with bounded retries,
 * exponential backoff, jitter, circuit-breaker protection, model failover, and strict deadline enforcement.
 */
export async function generateAiStudyPlan(
  request: PlanGenerationRequest,
  apiKey: string,
  modelName: string = 'gemini-3.8-flash',
  options?: RetryOptions
): Promise<StudyPlan> {
  // For interactive generation, limit to 1 retry (max 2 attempts total)
  const maxRetries = options?.maxRetries ?? 1;
  const maxAttempts = 1 + maxRetries;
  const overallTimeoutMs = options?.overallTimeoutMs ?? 28000;
  // Per-attempt timeout defaults to 20s (coordinated with 28s overall deadline)
  const perAttemptTimeoutMs = Math.max(10000, options?.perAttemptTimeoutMs ?? 20000);
  const initialBackoffMs = options?.initialBackoffMs ?? (process.env.NODE_ENV === 'test' ? 5 : 1000);
  const minRemainingForRetryMs = 10000;
  const maxReasonableRetryAfterMs = 5000;

  // Secondary failover resolution (explicitly configured only)
  const explicitFailoverEnabled =
    options?.enableModelFailover ??
    (process.env.ENABLE_MODEL_FAILOVER === 'true' || Boolean(options?.fallbackModel) || Boolean(process.env.GEMINI_FALLBACK_MODEL));
  const configuredFallbackModel =
    options?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || (explicitFailoverEnabled ? 'gemini-3.6-flash' : undefined);
  const secondaryModel =
    explicitFailoverEnabled && configuredFallbackModel && configuredFallbackModel !== modelName
      ? configuredFallbackModel
      : undefined;

  const primaryBreaker = getCircuitBreaker(modelName, options?.circuitBreakerConfig);
  const secondaryBreaker = secondaryModel
    ? getCircuitBreaker(secondaryModel, options?.circuitBreakerConfig)
    : null;

  const startTime = Date.now();
  const deadline = startTime + overallTimeoutMs;

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
Only schedule necessary study sessions to cover the requested topics. Only output days that contain scheduled study tasks; do NOT generate empty days or unpopulated schedule entries.
Keep the plan summary concise (1-2 sentences) and task reasons brief (1 sentence, max 15 words).
`;

  let lastCategorizedError: CategorizedError | null = null;
  let currentModel = modelName;

  // Initial circuit breaker check
  if (primaryBreaker.isOpen()) {
    if (secondaryModel && secondaryBreaker && !secondaryBreaker.isOpen()) {
      console.warn(
        `[StudyFlow Gemini] Primary model ${modelName} circuit is OPEN. Directly failing over to secondary model ${secondaryModel}.`
      );
      currentModel = secondaryModel;
    } else {
      console.warn(
        `[StudyFlow Gemini] Model ${modelName} circuit breaker is OPEN. Fast-failing to preserve quota.`
      );
      throw new Error(`Circuit breaker is OPEN for model ${modelName}. Provider is temporarily overloaded.`);
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptStart = Date.now();
    const remainingBeforeAttempt = deadline - attemptStart;

    if (remainingBeforeAttempt < 10000) {
      console.warn(
        `[StudyFlow Gemini] Model: ${currentModel} | Attempt: ${attempt}/${maxAttempts} | Insufficient time remaining (${remainingBeforeAttempt}ms, minimum 10s needed) to attempt request.`
      );
      break;
    }

    const attemptBudget =
      secondaryModel && attempt === 1 && currentModel === modelName
        ? Math.min(12000, perAttemptTimeoutMs)
        : perAttemptTimeoutMs;
    const currentAttemptTimeout = Math.max(10000, Math.min(attemptBudget, remainingBeforeAttempt));

    try {
      const isGemini3 = currentModel.includes('gemini-3');
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: promptContent,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_STUDY_PLAN_SCHEMA,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          httpOptions: {
            timeout: currentAttemptTimeout,
            // Explicitly disable internal SDK retries to prevent uncoordinated nested retries
            retryOptions: {
              attempts: 1,
            },
          },
        },
      });

      const attemptDuration = Date.now() - attemptStart;
      console.info(
        `[StudyFlow Gemini] Model: ${currentModel} | Attempt: ${attempt}/${maxAttempts} | Duration: ${attemptDuration}ms | Status: SUCCESS`
      );

      const activeBreaker = currentModel === secondaryModel && secondaryBreaker ? secondaryBreaker : primaryBreaker;
      activeBreaker.recordSuccess();

      const rawText = response.text;
      if (!rawText || !rawText.trim()) {
        throw new Error('Gemini returned an empty response.');
      }

      let rawJson = rawText.trim();
      if (rawJson.startsWith('```')) {
        rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }

      let parsedObject: unknown;
      try {
        parsedObject = JSON.parse(rawJson);
      } catch (err) {
        throw new Error(
          `Failed to parse AI output as valid JSON: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Tier 1: Runtime Zod structural validation (non-retryable upon failure)
      const validationResult = StudyPlanSchema.safeParse(parsedObject);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
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
        modelUsed: currentModel,
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

      // Tier 2: Domain business constraint validation
      const businessCheck = validatePlanBusinessConstraints(candidatePlan, request);
      if (!businessCheck.isValid) {
        console.warn('[AI Plan Warning] Plan had constraint violations:', businessCheck.errors);
        candidatePlan.warnings.push(...businessCheck.errors);
      }

      return businessCheck.sanitizedPlan;
    } catch (err: unknown) {
      const attemptDuration = Date.now() - attemptStart;
      const categorized = categorizeGeminiError(err);
      lastCategorizedError = categorized;

      const activeBreaker = currentModel === secondaryModel && secondaryBreaker ? secondaryBreaker : primaryBreaker;
      activeBreaker.recordFailure(categorized.isRetryable);

      // Log attempt telemetry safely (No API keys or personal study content logged)
      console.warn(
        `[StudyFlow Gemini] Model: ${currentModel} | Attempt: ${attempt}/${maxAttempts} | Duration: ${attemptDuration}ms | Category: ${categorized.category} | Retryable: ${categorized.isRetryable}`
      );

      // If error is not retryable or max attempts exhausted, break immediately
      if (!categorized.isRetryable || attempt >= maxAttempts) {
        break;
      }

      const remainingAfterError = deadline - Date.now();
      if (remainingAfterError < 10000) {
        console.warn(
          `[StudyFlow Gemini] Model: ${currentModel} | Remaining deadline (${remainingAfterError}ms) insufficient for retry. Aborting retries.`
        );
        break;
      }

      // Model failover on retryable error: If secondary model is configured and attempt 1 used primary model
      let isFailingOver = false;
      if (secondaryModel && currentModel === modelName && secondaryBreaker && !secondaryBreaker.isOpen()) {
        console.info(
          `[StudyFlow Gemini] Failing over from ${modelName} to secondary model ${secondaryModel} for attempt ${attempt + 1}/${maxAttempts}`
        );
        currentModel = secondaryModel;
        isFailingOver = true;
      }

      // Calculate backoff delay with jitter (immediate probe when failing over to a fresh secondary model)
      let delayMs: number;
      if (isFailingOver) {
        delayMs = process.env.NODE_ENV === 'test' ? 0 : 50;
      } else if (
        categorized.retryAfterMs !== null &&
        categorized.retryAfterMs > 0 &&
        categorized.retryAfterMs <= maxReasonableRetryAfterMs
      ) {
        delayMs = categorized.retryAfterMs;
      } else {
        const exponentialBase = initialBackoffMs * Math.pow(2, attempt - 1);
        const jitter = process.env.NODE_ENV === 'test' ? 0 : Math.floor(Math.random() * 350);
        delayMs = exponentialBase + jitter;
      }

      if (delayMs + minRemainingForRetryMs > remainingAfterAfterWaitCheck(remainingAfterError)) {
        console.warn(
          `[StudyFlow Gemini] Model: ${currentModel} | Remaining deadline (${remainingAfterError}ms) insufficient for backoff (${delayMs}ms). Aborting retries.`
        );
        break;
      }

      console.info(
        `[StudyFlow Gemini] Model: ${currentModel} | Backing off for ${delayMs}ms before attempt ${attempt + 1}/${maxAttempts}`
      );
      await sleep(delayMs);
    }
  }

  const totalDuration = Date.now() - startTime;
  const finalCategory = lastCategorizedError?.category || 'UNKNOWN_ERROR';
  const finalMessage = lastCategorizedError?.message || 'Gemini study plan generation failed';

  console.error(
    `[StudyFlow Gemini] Model: ${currentModel} | TotalDuration: ${totalDuration}ms | FinalCategory: ${finalCategory} | Error: ${finalMessage}`
  );

  throw new Error(finalMessage);
}

function remainingAfterAfterWaitCheck(remaining: number): number {
  return Math.max(0, remaining);
}
