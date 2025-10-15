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

    if (task.status !== 'paused') {
      return NextResponse.json(
        { error: 'Can only resume a paused task' },
        { status: 400 }
      )
    }

    await db.task.update({
      where: { id: params.id },
      data: { 
        status: 'running'
      }
    })

    // Resume task execution simulation
    simulateTaskExecution(task.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resuming task:', error)
    return NextResponse.json(
      { error: 'Failed to resume task' },
      { status: 500 }
    )
  }
}

// Mock function to simulate task execution
async function simulateTaskExecution(taskId: string) {
  try {
    // Simulate progress updates
    const interval = setInterval(async () => {
      const task = await db.task.findUnique({ where: { id: taskId } })
      
      if (!task || task.status !== 'running') {
        clearInterval(interval)
        return
      }

      const currentProgress = Number(task.progressBytes)
      const totalBytes = Number(task.totalBytes)
      let newProgress = currentProgress + Math.random() * 10 * 1024 * 1024 // 10MB increments
      
      if (newProgress >= totalBytes) {
        newProgress = totalBytes
        clearInterval(interval)
        
        await db.task.update({
          where: { id: taskId },
          data: { 
            status: 'completed',
            progressBytes: BigInt(newProgress),
            speed: 0
          }
        })
      } else {
        await db.task.update({
          where: { id: taskId },
          data: { 
            progressBytes: BigInt(newProgress),
            speed: Math.floor(Math.random() * 20 * 1024 * 1024), // Random speed
            currentFile: `file_${Math.floor(Math.random() * 100)}.txt`
          }
        })
      }
    }, 1000)
  } catch (error) {
    console.error('Error simulating task execution:', error)
  }
}