import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAiStudyPlan } from '../aiPlanner';
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
  };
});

describe('Google Gemini AI Integration & Error Handling', () => {
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
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  // Test 1: Successful structured output
  it('1. successfully generates and parses structured plan from Gemini API', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiPlan),
    });

    const plan = await generateAiStudyPlan(sampleRequest, 'test-key', 'gemini-2.5-flash');

    expect(plan.isAiGenerated).toBe(true);
    expect(plan.modelUsed).toBe('gemini-2.5-flash');
    expect(plan.planTitle).toBe('7-Day Linear Algebra Mastery Plan');
    expect(plan.days.length).toBe(2);
    expect(plan.days[0].tasks[0].topic).toBe('Eigenvalues');
    expect(plan.days[0].tasks[0].id).toBeDefined();
  });

  // Test 2: Empty provider response
  it('2. throws an error when Gemini returns an empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '',
    });

    await expect(generateAiStudyPlan(sampleRequest, 'test-key')).rejects.toThrow(
      'Gemini returned an empty response.'
    );
  });

  // Test 3: Invalid JSON
  it('3. throws an error when Gemini returns unparseable JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Malformed raw text that is not JSON at all {{{',
    });

    await expect(generateAiStudyPlan(sampleRequest, 'test-key')).rejects.toThrow(
      /Failed to parse AI output as valid JSON/
    );
  });

  // Test 4: Invalid subject ID
  it('4. detects unknown subject ID and records warning while sanitizing plan', async () => {
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

  // Test 5: Daily time-budget violation
  it('5. detects daily time-budget violation and attaches warning', async () => {
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

  // Test 6: API authentication failure
  it('6. route handles API authentication failure gracefully with fallback plan', async () => {
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

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isAiGenerated).toBe(false);
    expect(body.fallbackTriggered).toBe(true);
    expect(body.plan.warnings.some((w: string) => w.includes('API authentication failure'))).toBe(true);
  });

  // Test 7: API quota exhaustion
  it('7. route handles API quota exhaustion gracefully with fallback plan', async () => {
    process.env.GEMINI_API_KEY = 'valid-key-but-exhausted';
    mockGenerateContent.mockRejectedValueOnce(
      new Error('429 RESOURCE_EXHAUSTED: Rate limit or daily quota exceeded for gemini-2.5-flash.')
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
    expect(body.plan.warnings.some((w: string) => w.includes('API quota exhausted'))).toBe(true);
  });

  // Test 8: Provider timeout
  it('8. route handles Gemini request timeout with fallback plan', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValueOnce(
      new Error('Request timed out after 35000ms')
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
    expect(body.plan.warnings.some((w: string) => w.includes('Request timed out'))).toBe(true);
  });

  // Test 9: Fallback scheduling when API key is missing
  it('9. executes deterministic fallback plan when GEMINI_API_KEY is not configured', async () => {
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

  // Test 10: Correct AI Plan versus Basic Plan labeling
  it('10. verifies correct AI Plan (isAiGenerated=true) versus Basic Plan (isAiGenerated=false) labeling', async () => {
    // 10A: AI success yields isAiGenerated=true (UI displays "AI Plan")
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

    // 10B: Fallback yields isAiGenerated=false (UI displays "Basic Plan")
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
  });
});
