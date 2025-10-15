import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cancelTask } from '../../route'

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

    if (task.status === 'completed' || task.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed or already cancelled task' },
        { status: 400 }
      )
    }

    // Try to cancel the running rclone process
    const processCancelled = await cancelTask(params.id)

    // Update task status in database
    await db.task.update({
      where: { id: params.id },
      data: { 
        status: 'cancelled',
        speed: 0,
        errorMessage: processCancelled ? 'Task cancelled by user' : 'Task was not running'
      }
    })

    return NextResponse.json({ 
      success: true,
      processCancelled 
    })
  } catch (error) {
    console.error('Error cancelling task:', error)
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    )
  }
}