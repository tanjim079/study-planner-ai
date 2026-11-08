import { NextResponse } from 'next/server';

export async function GET() {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  return NextResponse.json(
    {
      status: 'healthy',
      app: 'StudyFlow AI',
      timestamp: new Date().toISOString(),
      aiService: {
        configured: hasApiKey,
        provider: 'Anthropic',
        model,
      },
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 }
  );
}
