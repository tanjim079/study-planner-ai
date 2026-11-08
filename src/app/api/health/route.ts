import { NextResponse } from 'next/server';

export async function GET() {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  return NextResponse.json(
    {
      status: 'healthy',
      app: 'StudyFlow AI',
      timestamp: new Date().toISOString(),
      aiService: {
        configured: hasApiKey,
        provider: 'Google Gemini',
        model,
      },
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 }
  );
}
