import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db.task.findUnique({
      where: { id: params.id }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    if (task.status !== 'running') {
      return NextResponse.json(
        { error: 'Can only pause a running task' },
        { status: 400 }
      )
    }

    await db.task.update({
      where: { id: params.id },
      data: { 
        status: 'paused',
        speed: 0
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error pausing task:', error)
    return NextResponse.json(
      { error: 'Failed to pause task' },
      { status: 500 }
    )
  }
}