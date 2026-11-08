import { NextRequest, NextResponse } from 'next/server';
import { PlanGenerationRequestSchema } from '@/lib/schemas';
import { generateAiStudyPlan } from '@/lib/aiPlanner';
import { generateDeterministicPlan } from '@/lib/fallbackPlanner';

// In-memory sliding window rate limiter (simple & zero-external-dependency for production)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. IP extraction & Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please wait a minute before generating another plan.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // 2. Payload size check (reject payload > 100KB)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 102400) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request payload too large (max 100KB).',
          code: 'PAYLOAD_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    // 3. Body parsing & Zod runtime validation
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request body.',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    const parseResult = PlanGenerationRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed for planning inputs.',
          details: errorMessages,
          code: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    const planRequest = parseResult.data;

    // Check optional client-provided key or server environment key
    const clientKey = request.headers.get('x-gemini-key') || request.headers.get('x-api-key');
    const apiKey = clientKey || process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // 4. Check if AI service is available
    if (!apiKey) {
      // Deterministic fallback plan generation
      const fallbackPlan = generateDeterministicPlan(planRequest);
      fallbackPlan.warnings.unshift(
        'AI Planning Service is currently in offline mode (No GEMINI_API_KEY configured). A high-accuracy algorithmic study plan was generated instead.'
      );

      return NextResponse.json({
        success: true,
        plan: fallbackPlan,
        isAiGenerated: false,
        notice: 'Generated via deterministic fallback scheduler because Google Gemini API key is not configured.',
      });
    }

    // 5. Generate plan using Google Gemini AI
    try {
      const aiPlan = await generateAiStudyPlan(planRequest, apiKey, model);
      return NextResponse.json({
        success: true,
        plan: aiPlan,
        isAiGenerated: true,
      });
    } catch (aiError: unknown) {
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error';
      console.error('[StudyFlow API] Gemini Generation failed:', errorMessage);

      // Graceful fallback to deterministic planner if external AI fails (e.g. rate limit, quota, network timeout, auth failure)
      const fallbackPlan = generateDeterministicPlan(planRequest);
      const lower = errorMessage.toLowerCase();
      const friendlyReason = lower.includes('timeout') || lower.includes('timed out')
        ? 'Request timed out'
        : lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')
        ? 'API quota exhausted'
        : lower.includes('401') || lower.includes('403') || lower.includes('api_key_invalid') || lower.includes('unauthorized')
        ? 'API authentication failure'
        : 'API service error';

      fallbackPlan.warnings.unshift(
        `Gemini AI service was temporarily unavailable (${friendlyReason}). Generated reliable algorithmic fallback plan instead.`
      );

      return NextResponse.json({
        success: true,
        plan: fallbackPlan,
        isAiGenerated: false,
        fallbackTriggered: true,
        fallbackReason: errorMessage,
      });
    }
  } catch (error: unknown) {
    console.error('[StudyFlow API] Unhandled server error in generate-plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected internal error occurred. Please try again.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

