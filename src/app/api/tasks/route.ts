import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Store running tasks
const runningTasks = new Map<string, any>()

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, src, dst, options = {} } = body

    if (!type || !src || !dst) {
      return NextResponse.json(
        { error: 'Missing required fields: type, src, dst' },
        { status: 400 }
      )
    }

    const task = await db.task.create({
      data: {
        type,
        src,
        dst,
        status: 'pending',
        progressBytes: BigInt(0),
        totalBytes: BigInt(0),
        speed: 0
      }
    })

    // Start rclone operation in background
    executeRcloneTask(task.id, type, src, dst, options)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

async function executeRcloneTask(taskId: string, type: string, src: string, dst: string, options: any) {
  try {
    // Update task to running
    await db.task.update({
      where: { id: taskId },
      data: { status: 'running' }
    })

    // Build rclone command
    const command = buildRcloneCommand(type, src, dst, options)
    console.log(`Executing rclone command: ${command}`)

    // Execute rclone command with progress monitoring
    const child = exec(command, {
      timeout: 3600000 // 1 hour timeout
    })

    let totalBytes = BigInt(0)
    let transferredBytes = BigInt(0)
    let currentFile = ''
    let lastSpeed = 0

    // Parse progress output
    child.stdout?.on('data', async (data) => {
      const output = data.toString()
      
      // Parse rclone progress output
      const progressMatch = output.match(/Transferred:\s+(\d+\.?\d*\s*[KMGT]?iB) \/ (\d+\.?\d*\s*[KMGT]?iB)/)
      if (progressMatch) {
        transferredBytes = parseBytes(progressMatch[1])
        totalBytes = parseBytes(progressMatch[2])
      }

      // Parse current file
      const fileMatch = output.match(/Transferring:\s*(.+)/)
      if (fileMatch) {
        currentFile = fileMatch[1].trim()
      }

      // Parse speed
      const speedMatch = output.match(/(\d+\.?\d*\s*[KMGT]?iB\/s)/)
      if (speedMatch) {
        lastSpeed = parseBytes(speedMatch[1])
      }

      // Update task progress in database
      await db.task.update({
        where: { id: taskId },
        data: {
          progressBytes: transferredBytes,
          totalBytes: totalBytes,
          speed: Number(lastSpeed),
          currentFile: currentFile || null
        }
      })

      // Emit progress via WebSocket if available
      try {
        const { emitTaskProgress } = await import('@/lib/socket')
        // Note: This would need the io instance, which we'd need to pass or store globally
      } catch (error) {
        // WebSocket not available, continue without it
      }
    })

    child.stderr?.on('data', (data) => {
      console.error(`rclone stderr for task ${taskId}:`, data.toString())
    })

    child.on('close', async (code) => {
      try {
        if (code === 0) {
          // Task completed successfully
          await db.task.update({
            where: { id: taskId },
            data: {
              status: 'completed',
              progressBytes: totalBytes,
              speed: 0,
              currentFile: null
            }
          })
        } else {
          // Task failed
          await db.task.update({
            where: { id: taskId },
            data: {
              status: 'failed',
              errorMessage: `rclone exited with code ${code}`,
              speed: 0
            }
          })
        }
      } catch (error) {
        console.error(`Error updating task ${taskId} status:`, error)
      }

      // Clean up running task
      runningTasks.delete(taskId)
    })

    child.on('error', async (error) => {
      console.error(`rclone process error for task ${taskId}:`, error)
      try {
        await db.task.update({
          where: { id: taskId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            speed: 0
          }
        })
      } catch (dbError) {
        console.error(`Error updating task ${taskId} error status:`, dbError)
      }

      runningTasks.delete(taskId)
    })

    // Store child process for potential cancellation
    runningTasks.set(taskId, child)

  } catch (error) {
    console.error(`Error executing rclone task ${taskId}:`, error)
    try {
      await db.task.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          speed: 0
        }
      })
    } catch (dbError) {
      console.error(`Error updating task ${taskId} error status:`, dbError)
    }
  }
}

function buildRcloneCommand(type: string, src: string, dst: string, options: any): string {
  const baseCommand = 'rclone'
  
  // Add command type
  const commandMap: { [key: string]: string } = {
    'copy': 'copy',
    'sync': 'sync',
    'move': 'move',
    'download': 'copy',
    'upload': 'copy'
  }
  
  const command = commandMap[type] || 'copy'
  
  // Build full command with progress
  let fullCommand = `${baseCommand} ${command} --progress --stats-one-line --stats=5s "${src}" "${dst}"`
  
  // Add additional options
  if (options.dryRun) {
    fullCommand += ' --dry-run'
  }
  
  if (options.checkers) {
    fullCommand += ` --checkers ${options.checkers}`
  }
  
  if (options.transfers) {
    fullCommand += ` --transfers ${options.transfers}`
  }
  
  if (options.exclude) {
    fullCommand += ` --exclude "${options.exclude}"`
  }
  
  if (options.include) {
    fullCommand += ` --include "${options.include}"`
  }
  
  return fullCommand
}

function parseBytes(byteStr: string): bigint {
  const match = byteStr.match(/^(\d+\.?\d*)\s*([KMGT]?i?)B?$/i)
  if (!match) return BigInt(0)
  
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  
  const multipliers: { [key: string]: number } = {
    '': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024,
    'KI': 1024,
    'MI': 1024 * 1024,
    'GI': 1024 * 1024 * 1024,
    'TI': 1024 * 1024 * 1024 * 1024
  }
  
  const multiplier = multipliers[unit] || 1
  return BigInt(Math.floor(value * multiplier))
}

// Export function to cancel running tasks
export async function cancelTask(taskId: string) {
  const childProcess = runningTasks.get(taskId)
  if (childProcess) {
    childProcess.kill('SIGTERM')
    runningTasks.delete(taskId)
    return true
  }
  return false
}