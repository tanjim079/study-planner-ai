import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAiStudyPlan,
  categorizeGeminiError,
  extractRetryAfterMs,
  resetAllCircuitBreakers,
  getCircuitBreaker,
  ModelCircuitBreaker,
} from '../aiPlanner';
import { PlanGenerationRequest } from '@/types';
import { POST } from '@/app/api/generate-plan/route';
import { NextRequest } from 'next/server';

// Hoisted mock for @google/genai
const { mockGenerateContent } = vi.hoisted(() => {
  return {
    mockGenerateContent: vi.fn(),
  };
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      INTEGER: 'INTEGER',
    },
    ThinkingLevel: {
      THINKING_LEVEL_UNSPECIFIED: 'THINKING_LEVEL_UNSPECIFIED',
      MINIMAL: 'MINIMAL',
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
    },
  };
});

describe('Google Gemini AI Integration, Reliability & Error Handling', () => {
  const sampleRequest: PlanGenerationRequest = {
    subjects: [
      {
        id: 'sub-math',
        name: 'Linear Algebra',
        difficulty: 'hard',
        deadline: '2026-11-20',
        topics: [
          { id: 'top-1', name: 'Eigenvalues', estimatedMinutes: 60 },
          { id: 'top-2', name: 'Matrix Inverses', estimatedMinutes: 60 },
        ],
        priority: 'high',
      },
    ],
    availableHoursPerDay: 2, // 120 mins
    planningStartDate: '2026-11-09',
    planningPeriodDays: 7,
    preferredSessionMinutes: 60,
  };

  const validGeminiPlan = {
    planTitle: '7-Day Linear Algebra Mastery Plan',
    summary: 'Focused plan prioritizing eigenvalues due to high course difficulty.',
    days: [
      {
        date: '2026-11-09',
        tasks: [
          {
            subjectId: 'sub-math',
            subjectName: 'Linear Algebra',
            topic: 'Eigenvalues',
            durationMinutes: 60,
            priority: 'high',
            reason: 'High difficulty topic requiring foundational focus.',
          },
        ],
      },
      {
        date: '2026-11-10',
        tasks: [
          {
            subjectId: 'sub-math',
            subjectName: 'Linear Algebra',
            topic: 'Matrix Inverses',
            durationMinutes: 60,
            priority: 'high',
            reason: 'Reinforcing matrix concepts prior to exam deadline.',
          },
        ],
      },
    ],
    warnings: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetAllCircuitBreakers();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FALLBACK_MODEL;
    delete process.env.ENABLE_MODEL_FAILOVER;
  });

  // Test 1: Successful structured output
  it('1. successfully generates and parses structured plan from Gemini API', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash');

    expect(plan.isAiGenerated).toBe(true);
    expect(plan.modelUsed).toBe('gemini-3.8-flash');
    expect(plan.planTitle).toBe('7-Day Linear Algebra Mastery Plan');
    expect(plan.days.length).toBe(2);
    expect(plan.days[0].tasks[0].topic).toBe('Eigenvalues');
    expect(plan.days[0].tasks[0].id).toBeDefined();
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // Test 2: 503 UNAVAILABLE followed by successful retry (Task 11)
  it('2. recovers from transient 503 UNAVAILABLE overload via bounded retry', async () => {
    // Attempt 1 fails with 503 overload
    mockGenerateContent.mockRejectedValueOnce(
      new Error('503 UNAVAILABLE: This model is currently experiencing high demand.')
    );
    // Attempt 2 succeeds
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash');

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(plan.isAiGenerated).toBe(true);
    expect(plan.planTitle).toBe('7-Day Linear Algebra Mastery Plan');
    expect(plan.days[0].tasks[0].topic).toBe('Eigenvalues');
  });

  // Test 3: Valid structured response after retry (Task 11)
  it('3. produces a complete valid structured response after recovering from transient failure', async () => {
    // Attempt 1 fails with network glitch
    mockGenerateContent.mockRejectedValueOnce(
      new Error('TypeError: fetch failed (ECONNRESET)')
    );
    // Attempt 2 succeeds with structured schedule
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash');

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(plan.isAiGenerated).toBe(true);
    expect(plan.days.length).toBe(2);
    expect(plan.days[0].tasks[0].durationMinutes).toBe(60);
    expect(plan.days[0].tasks[0].completed).toBe(false);
    expect(plan.days[1].tasks[0].topic).toBe('Matrix Inverses');
  });

  // Test 4: Repeated 503 failures followed by fallback (Task 2)
  it('4. bounds retries to at most 1 retry (2 total attempts) on repeated 503s then falls back to Basic Plan', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const overloadError = new Error('503 UNAVAILABLE: This model is currently experiencing high demand.');

    mockGenerateContent
      .mockRejectedValueOnce(overloadError) // Attempt 1 (initial)
      .mockRejectedValueOnce(overloadError); // Attempt 2 (retry 1 - max exhausted)

    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const res = await POST(req);
    const body = await res.json();

    // Exactly 2 calls: 1 original + 1 bounded retry
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isAiGenerated).toBe(false);
    expect(body.fallbackTriggered).toBe(true);
    expect(body.fallbackCategory).toBe('OVERLOAD_503');

    // Improved UI message for provider overload
    const expectedOverloadNotice =
      'Gemini is temporarily busy. A Basic Plan has been generated so you can continue studying.';
    expect(body.notice).toBe(expectedOverloadNotice);
    expect(body.fallbackNotice).toBe(expectedOverloadNotice);
    expect(body.plan.warnings[0]).toBe(expectedOverloadNotice);
    expect(body.plan.planTitle).toContain('Basic Plan');
  });

  // Test 5: No retries for authentication failure (Task 11)
  it('5. does NOT retry on authentication failure (401/403) and falls back immediately after 1 attempt', async () => {
    process.env.GEMINI_API_KEY = 'invalid-api-key';
    mockGenerateContent.mockRejectedValueOnce(
      new Error('401 API_KEY_INVALID: The provided Gemini API key is expired or invalid.')
    );

    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const res = await POST(req);
    const body = await res.json();

    // Exactly 1 call: NEVER retried
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isAiGenerated).toBe(false);
    expect(body.fallbackTriggered).toBe(true);
    expect(body.fallbackCategory).toBe('AUTH_FAILURE');
    expect(body.plan.warnings.some((w: string) => w.includes('authentication failed'))).toBe(true);
  });

  // Test 6: Permanent quota errors (Task 11)
  it('6. does NOT retry on permanent quota exhaustion (RESOURCE_EXHAUSTED) and falls back after 1 attempt', async () => {
    process.env.GEMINI_API_KEY = 'valid-key-but-exhausted';
    mockGenerateContent.mockRejectedValueOnce(
      new Error('429 RESOURCE_EXHAUSTED: Rate limit or daily quota exceeded for gemini-3.8-flash.')
    );

    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const res = await POST(req);
    const body = await res.json();

    // Exactly 1 call: Quota exhaustion is non-retryable
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isAiGenerated).toBe(false);
    expect(body.fallbackTriggered).toBe(true);
    expect(body.fallbackCategory).toBe('QUOTA_EXHAUSTED');
    expect(body.plan.warnings.some((w: string) => w.includes('API quota exhausted'))).toBe(true);
  });

  // Test 7: Request timeout (Task 11)
  it('7. route handles Gemini request timeout with fallback plan', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValue(
      new Error('Request timed out after 8000ms')
    );

    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isAiGenerated).toBe(false);
    expect(body.fallbackTriggered).toBe(true);
    expect(body.plan.warnings.some((w: string) => w.includes('request timed out'))).toBe(true);
  });

  // Test 8: Respects Retry-After headers (Task 4 & 11)
  it('8. parses and respects Retry-After header for transient overload', async () => {
    const errorWithRetryAfter = Object.assign(
      new Error('503 Service Unavailable: overloaded'),
      {
        status: 503,
        headers: { 'retry-after': '1' },
      }
    );

    const delayMs = extractRetryAfterMs(errorWithRetryAfter);
    expect(delayMs).toBe(1000);

    mockGenerateContent.mockRejectedValueOnce(errorWithRetryAfter);
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(plan.isAiGenerated).toBe(true);
  });

  // Test 9: Empty provider response (Task 5 - non-retryable)
  it('9. throws an error and does not retry when Gemini returns an empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '',
    });

    await expect(generateAiStudyPlan(sampleRequest, 'test-key')).rejects.toThrow(
      'Gemini returned an empty response.'
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // Test 10: Invalid JSON (Task 5 - non-retryable)
  it('10. throws an error and does not retry when Gemini returns unparseable JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Malformed raw text that is not JSON at all {{{',
    });

    await expect(generateAiStudyPlan(sampleRequest, 'test-key')).rejects.toThrow(
      /Failed to parse AI output as valid JSON/
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // Test 11: Business constraint validation & sanitization (Task 8)
  it('11. detects unknown subject ID and records warning while sanitizing plan', async () => {
    const planWithInvalidSubject = {
      ...validGeminiPlan,
      days: [
        {
          date: '2026-11-09',
          tasks: [
            {
              subjectId: 'unknown-subject-999',
              subjectName: 'Ghost Course',
              topic: 'Imaginary Chapter',
              durationMinutes: 60,
              priority: 'low',
              reason: 'Model hallucinated subject',
            },
          ],
        },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(planWithInvalidSubject),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key');

    expect(plan.warnings.some((w) => w.includes('non-existent subject ID: unknown-subject-999'))).toBe(true);
    expect(plan.days[0].tasks.length).toBe(0); // Sanitized out
  });

  // Test 12: Daily time-budget violation
  it('12. detects daily time-budget violation and attaches warning', async () => {
    const planExceedingDailyBudget = {
      ...validGeminiPlan,
      days: [
        {
          date: '2026-11-09',
          tasks: [
            {
              subjectId: 'sub-math',
              subjectName: 'Linear Algebra',
              topic: 'Eigenvalues Extended',
              durationMinutes: 240, // 240 mins > 120 mins limit
              priority: 'high',
              reason: 'Cramming session exceeding available limit',
            },
          ],
        },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(planExceedingDailyBudget),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key');

    expect(plan.warnings.some((w) => w.includes('exceeds daily limit'))).toBe(true);
  });

  // Test 13: Fallback scheduling when API key is missing
  it('13. executes deterministic fallback plan when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isAiGenerated).toBe(false);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(body.plan.warnings.some((w: string) => w.includes('No GEMINI_API_KEY configured'))).toBe(true);
  });

  // Test 14: Correct AI Plan versus Basic Plan labeling (Task 11)
  it('14. verifies correct AI Plan (isAiGenerated=true) versus Basic Plan (isAiGenerated=false) labeling', async () => {
    // 14A: AI success yields isAiGenerated=true (UI displays "AI Plan")
    process.env.GEMINI_API_KEY = 'valid-key';
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const reqAi = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const resAi = await POST(reqAi);
    const bodyAi = await resAi.json();
    expect(bodyAi.isAiGenerated).toBe(true);
    expect(bodyAi.plan.isAiGenerated).toBe(true);

    // 14B: Fallback yields isAiGenerated=false (UI displays "Basic Plan")
    delete process.env.GEMINI_API_KEY;
    const reqFallback = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    const resFallback = await POST(reqFallback);
    const bodyFallback = await resFallback.json();
    expect(bodyFallback.isAiGenerated).toBe(false);
    expect(bodyFallback.plan.isAiGenerated).toBe(false);
    expect(bodyFallback.plan.planTitle).toContain('Basic Plan');
  });

  // Test 15: Error categorization coverage
  it('15. correctly classifies errors and retryability', () => {
    expect(categorizeGeminiError(new Error('503 UNAVAILABLE')).category).toBe('OVERLOAD_503');
    expect(categorizeGeminiError(new Error('503 UNAVAILABLE')).isRetryable).toBe(true);

    expect(categorizeGeminiError(new Error('401 API_KEY_INVALID')).category).toBe('AUTH_FAILURE');
    expect(categorizeGeminiError(new Error('401 API_KEY_INVALID')).isRetryable).toBe(false);

    expect(categorizeGeminiError(new Error('429 RESOURCE_EXHAUSTED')).category).toBe('QUOTA_EXHAUSTED');
    expect(categorizeGeminiError(new Error('429 RESOURCE_EXHAUSTED')).isRetryable).toBe(false);

    expect(categorizeGeminiError(new Error('Request timed out')).category).toBe('TIMEOUT');
    expect(categorizeGeminiError(new Error('Request timed out')).isRetryable).toBe(true);

    expect(categorizeGeminiError(new Error('400 INVALID_ARGUMENT')).category).toBe('BAD_REQUEST');
    expect(categorizeGeminiError(new Error('400 INVALID_ARGUMENT')).isRetryable).toBe(false);
  });

  // Test 16: Circuit Breaker trips OPEN after threshold consecutive failures and fast-fails (Task 3 & 10)
  it('16. circuit breaker trips OPEN after consecutive transient failures and fast-fails subsequent calls', async () => {
    const cb = getCircuitBreaker('gemini-3.8-flash', { failureThreshold: 2, cooldownPeriodMs: 5000 });
    expect(cb.getState()).toBe('CLOSED');

    const overloadError = new Error('503 UNAVAILABLE: Model busy');
    mockGenerateContent
      .mockRejectedValueOnce(overloadError)
      .mockRejectedValueOnce(overloadError);

    // Call 1: Runs 2 attempts (initial + retry) and fails
    await expect(
      generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash', {
        circuitBreakerConfig: { failureThreshold: 2, cooldownPeriodMs: 5000 },
      })
    ).rejects.toThrow();

    expect(cb.getState()).toBe('OPEN');
    expect(cb.isOpen()).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);

    // Call 2: While circuit is OPEN, it fast-fails immediately without calling generateContent!
    await expect(
      generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash', {
        circuitBreakerConfig: { failureThreshold: 2, cooldownPeriodMs: 5000 },
      })
    ).rejects.toThrow(/Circuit breaker is OPEN/);

    // Still exactly 2 calls: generateContent was NEVER called during open circuit
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  // Test 17: Circuit Breaker transitions to HALF_OPEN after cooldown and resets on success (Task 3 & 10)
  it('17. circuit breaker transitions to HALF_OPEN after cooldown and resets to CLOSED on probe success', async () => {
    const cb = new ModelCircuitBreaker({ failureThreshold: 1, cooldownPeriodMs: 20 });
    cb.recordFailure(true);
    expect(cb.isOpen()).toBe(true);
    expect(cb.getState()).toBe('OPEN');

    // Wait for cooldown period (25ms > 20ms)
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(cb.getState()).toBe('HALF_OPEN');

    // Probe success closes circuit
    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isOpen()).toBe(false);
  });

  // Test 18: Secondary Model Failover when primary model experiences transient failure (Task 8 & 10)
  it('18. seamlessly fails over to secondary model when primary model experiences transient 503', async () => {
    // Attempt 1 with primary model (gemini-3.8-flash) fails with 503
    mockGenerateContent.mockRejectedValueOnce(
      new Error('503 UNAVAILABLE: gemini-3.8-flash is overloaded')
    );
    // Attempt 2 with failover model (gemini-3.6-flash) succeeds
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash', {
      enableModelFailover: true,
      fallbackModel: 'gemini-3.6-flash',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);

    // Verify first call was primary model
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    // Verify second call was secondary failover model
    expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-3.6-flash');

    expect(plan.isAiGenerated).toBe(true);
    expect(plan.modelUsed).toBe('gemini-3.6-flash');
    expect(plan.planTitle).toBe('7-Day Linear Algebra Mastery Plan');
  });

  // Test 19: Model failover is NOT triggered when disabled (Task 8 & 10)
  it('19. retries primary model and does NOT failover when failover is not explicitly enabled', async () => {
    const overloadError = new Error('503 UNAVAILABLE');
    mockGenerateContent
      .mockRejectedValueOnce(overloadError)
      .mockResolvedValueOnce({
        text: JSON.stringify(validGeminiPlan),
      });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash', {
      enableModelFailover: false,
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-3.8-flash');
    expect(plan.modelUsed).toBe('gemini-3.8-flash');
  });

  // Test 20: Direct failover to secondary model when primary circuit breaker is already OPEN (Task 8 & 10)
  it('20. immediately routes to secondary model when primary circuit breaker is OPEN', async () => {
    const primaryCb = getCircuitBreaker('gemini-3.8-flash', { failureThreshold: 1, cooldownPeriodMs: 60000 });
    primaryCb.recordFailure(true);
    expect(primaryCb.isOpen()).toBe(true);

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash', {
      enableModelFailover: true,
      fallbackModel: 'gemini-3.6-flash',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.6-flash');
    expect(plan.modelUsed).toBe('gemini-3.6-flash');
    expect(plan.isAiGenerated).toBe(true);
  });

  // Test 21: Request deadline aborts retry when remaining time is insufficient (Task 4 & 10)
  it('21. aborts retries when remaining execution time is under minimum threshold (10s)', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('503 UNAVAILABLE: high demand')
    );

    // Configure overallTimeoutMs to 10005ms: attempt 1 takes 10ms -> remaining < 10000ms -> no attempt 2
    await expect(
      generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-3.8-flash', {
        overallTimeoutMs: 10005,
        maxRetries: 1,
      })
    ).rejects.toThrow();

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
