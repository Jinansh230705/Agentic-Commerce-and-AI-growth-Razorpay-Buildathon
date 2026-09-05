import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const status: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    status.database = 'connected'
  } catch {
    status.database = 'unavailable'
    status.status = 'degraded'
  }

  const httpStatus = status.status === 'ok' ? 200 : 503

  return NextResponse.json(status, { status: httpStatus })
}
