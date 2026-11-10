import { NextRequest, NextResponse } from 'next/server';
import { PlanGenerationRequestSchema } from '@/lib/schemas';
import { generateAiStudyPlan, categorizeGeminiError } from '@/lib/aiPlanner';
import { generateDeterministicPlan } from '@/lib/fallbackPlanner';

// Ensure the execution duration stays within Next.js / Vercel serverless function limits
export const maxDuration = 30;

// In-memory sliding window rate limiter (zero-external-dependency for reliable runtime)
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
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL ||
      (process.env.ENABLE_MODEL_FAILOVER === 'true' ? 'gemini-3.6-flash' : undefined);
    const enableModelFailover =
      process.env.ENABLE_MODEL_FAILOVER === 'true' || Boolean(process.env.GEMINI_FALLBACK_MODEL);

    // 4. Check if AI service is configured
    if (!apiKey) {
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

    // 5. Generate plan using Google Gemini AI with bounded retries, failover, and graceful fallback
    const requestStartTime = Date.now();
    try {
      const aiPlan = await generateAiStudyPlan(planRequest, apiKey, model, {
        fallbackModel,
        enableModelFailover,
      });
      const totalDuration = Date.now() - requestStartTime;

      console.info(
        `[StudyFlow API] Generation completed successfully | Model: ${aiPlan.modelUsed || model} | TotalDuration: ${totalDuration}ms`
      );

      return NextResponse.json({
        success: true,
        plan: aiPlan,
        isAiGenerated: true,
      });
    } catch (aiError: unknown) {
      const totalDuration = Date.now() - requestStartTime;
      const categorized = categorizeGeminiError(aiError);

      // Safe server telemetry: Never log API keys or user personal study content
      console.error(
        `[StudyFlow API] Gemini Generation failed | Model: ${model} | Category: ${categorized.category} | Duration: ${totalDuration}ms | Error: ${categorized.message}`
      );

      // Graceful deterministic fallback
      const fallbackPlan = generateDeterministicPlan(planRequest);

      let friendlyNotice: string;
      if (categorized.category === 'OVERLOAD_503') {
        friendlyNotice = 'Gemini is temporarily busy. A Basic Plan has been generated so you can continue studying.';
      } else if (categorized.category === 'TIMEOUT') {
        friendlyNotice = 'Gemini request timed out. A Basic Plan has been generated so you can continue studying.';
      } else if (categorized.category === 'QUOTA_EXHAUSTED' || categorized.category === 'RATE_LIMITED_429') {
        friendlyNotice = 'Gemini API quota exhausted. A Basic Plan has been generated so you can continue studying.';
      } else if (categorized.category === 'AUTH_FAILURE') {
        friendlyNotice = 'Gemini authentication failed. A Basic Plan has been generated so you can continue studying.';
      } else {
        friendlyNotice = 'Gemini AI service was temporarily unavailable. A Basic Plan has been generated so you can continue studying.';
      }

      fallbackPlan.warnings.unshift(friendlyNotice);

      return NextResponse.json({
        success: true,
        plan: fallbackPlan,
        isAiGenerated: false,
        fallbackTriggered: true,
        fallbackCategory: categorized.category,
        fallbackReason: categorized.message,
        notice: friendlyNotice,
        fallbackNotice: friendlyNotice,
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
