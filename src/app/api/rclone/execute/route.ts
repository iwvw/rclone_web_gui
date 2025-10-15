import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { createServer } from 'http'
import { Server } from 'socket.io'

// 存储正在运行的进程
const runningProcesses = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, taskId } = body

    if (!command || !taskId) {
      return NextResponse.json({
        success: false,
        error: '缺少命令或任务ID'
      })
    }

    // 检查是否已有相同任务在运行
    if (runningProcesses.has(taskId)) {
      return NextResponse.json({
        success: false,
        error: '任务已在运行中'
      })
    }

    // 启动 rclone 进程
    const rcloneProcess = spawn('rclone', command.split(' '), {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let output = ''
    let errorOutput = ''
    let isCompleted = false

    // 收集输出
    rcloneProcess.stdout?.on('data', (data) => {
      output += data.toString()
      
      // 解析进度信息
      const progressMatch = data.toString().match(/Transferred:\s*([\d.]+\s*[KMGT]?B)\s*\/\s*([\d.]+\s*[KMGT]?B),\s*([\d.]+)%,\s*([\d.]+\s*[KMGT]?B\/s),\s*ETA\s*(.+)/)
      if (progressMatch) {
        const [, transferred, total, percent, speed, eta] = progressMatch
        
        // 通过 WebSocket 发送进度更新
        emitProgressUpdate(taskId, {
          transferred,
          total,
          percent: parseFloat(percent),
          speed,
          eta,
          output: data.toString()
        })
      }
    })

    rcloneProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
      
      // 发送错误信息
      emitProgressUpdate(taskId, {
        error: data.toString(),
        output: data.toString()
      })
    })

    rcloneProcess.on('close', (code) => {
      isCompleted = true
      runningProcesses.delete(taskId)
      
      emitProgressUpdate(taskId, {
        completed: true,
        exitCode: code,
        output,
        errorOutput
      })
    })

    rcloneProcess.on('error', (error) => {
      runningProcesses.delete(taskId)
      
      emitProgressUpdate(taskId, {
        completed: true,
        error: error.message,
        exitCode: -1
      })
    })

    // 存储进程引用
    runningProcesses.set(taskId, rcloneProcess)

    return NextResponse.json({
      success: true,
      taskId,
      message: '任务已启动'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: '缺少任务ID'
      })
    }

    const process = runningProcesses.get(taskId)
    if (!process) {
      return NextResponse.json({
        success: false,
        error: '任务不存在或已完成'
      })
    }

    // 终止进程
    process.kill('SIGTERM')
    runningProcesses.delete(taskId)

    return NextResponse.json({
      success: true,
      message: '任务已取消'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 进度更新函数
function emitProgressUpdate(taskId: string, data: any) {
  // 这里可以通过 WebSocket 发送进度更新
  // 暂时先存储在内存中，前端可以轮询获取
  if (global.progressUpdates) {
    global.progressUpdates[taskId] = {
      ...global.progressUpdates[taskId],
      ...data,
      timestamp: new Date().toISOString()
    }
  }
}

// 初始化进度更新存储
if (!global.progressUpdates) {
  global.progressUpdates = {}
}