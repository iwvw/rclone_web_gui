import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Get list of remotes from rclone config
    const { stdout, stderr } = await execAsync('rclone config show 2>/dev/null')
    
    if (stderr && !stdout) {
      return NextResponse.json({
        remotes: [],
        error: 'No rclone config found or rclone not installed'
      })
    }

    // Parse remotes from config output
    const lines = stdout.split('\n')
    const remotes: any[] = []
    let currentRemote: any = null

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Match remote name
      const remoteMatch = trimmedLine.match(/^# (.+)$/)
      if (remoteMatch) {
        if (currentRemote) {
          remotes.push(currentRemote)
        }
        currentRemote = {
          name: remoteMatch[1],
          type: 'unknown',
          config: {}
        }
        continue
      }

      // Match remote type
      const typeMatch = trimmedLine.match(/^type = (.+)$/)
      if (typeMatch && currentRemote) {
        currentRemote.type = typeMatch[1]
        continue
      }

      // Match other config parameters
      const configMatch = trimmedLine.match(/^(\w+) = (.+)$/)
      if (configMatch && currentRemote) {
        currentRemote.config[configMatch[1]] = configMatch[2]
      }
    }

    if (currentRemote) {
      remotes.push(currentRemote)
    }

    return NextResponse.json({
      remotes,
      count: remotes.length
    })
  } catch (error) {
    console.error('Error getting rclone remotes:', error)
    return NextResponse.json({
      remotes: [],
      error: error instanceof Error ? error.message : 'Failed to get remotes'
    }, { status: 500 })
  }
}