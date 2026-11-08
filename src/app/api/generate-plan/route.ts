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
    const clientKey = request.headers.get('x-anthropic-key');
    const apiKey = clientKey || process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    // 4. Check if AI service is available
    if (!apiKey) {
      // Deterministic fallback plan generation
      const fallbackPlan = generateDeterministicPlan(planRequest);
      fallbackPlan.warnings.unshift(
        'AI Planning Service is currently in offline mode (No ANTHROPIC_API_KEY configured). A high-accuracy algorithmic study plan was generated instead.'
      );

      return NextResponse.json({
        success: true,
        plan: fallbackPlan,
        isAiGenerated: false,
        notice: 'Generated via deterministic fallback scheduler because Anthropic API key is not configured.',
      });
    }

    // 5. Generate plan using Claude AI
    try {
      const aiPlan = await generateAiStudyPlan(planRequest, apiKey, model);
      return NextResponse.json({
        success: true,
        plan: aiPlan,
        isAiGenerated: true,
      });
    } catch (aiError: unknown) {
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error';
      console.error('[StudyFlow API] AI Generation failed:', errorMessage);

      // Graceful fallback to deterministic planner if external AI fails (e.g. rate limit, network timeout)
      const fallbackPlan = generateDeterministicPlan(planRequest);
      fallbackPlan.warnings.unshift(
        `AI service was temporarily unavailable (${errorMessage.includes('timeout') ? 'Request timed out' : 'API service error'}). Generated reliable algorithmic fallback plan instead.`
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
