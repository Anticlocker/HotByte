import { NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
    const res = await fetch(`${backendUrl}/health`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Frontend health check error:', error);
    return NextResponse.json({ status: 'error', message: 'Unable to reach backend health endpoint' }, { status: 500 });
  }
}
