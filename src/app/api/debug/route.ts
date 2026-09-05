import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const actions = await prisma.growthAction.findMany({ include: { opportunity: true } })
  return NextResponse.json(actions)
}
