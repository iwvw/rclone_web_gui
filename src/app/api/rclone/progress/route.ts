import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: '缺少任务ID'
      })
    }

    const progress = global.progressUpdates?.[taskId] || null

    return NextResponse.json({
      success: true,
      progress
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}