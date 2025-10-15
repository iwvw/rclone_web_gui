import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

// Get rclone config file path
async function getConfigPath(): Promise<string> {
  try {
    const { stdout } = await execAsync('rclone config file 2>/dev/null')
    return stdout.trim()
  } catch {
    // Fallback to default location
    const homeDir = os.homedir()
    return path.join(homeDir, '.config', 'rclone', 'rclone.conf')
  }
}

export async function GET() {
  try {
    const configPath = await getConfigPath()
    
    try {
      const configContent = await readFile(configPath, 'utf-8')
      return NextResponse.json({
        path: configPath,
        content: configContent,
        exists: true
      })
    } catch (error) {
      // Config file doesn't exist
      return NextResponse.json({
        path: configPath,
        content: '',
        exists: false
      })
    }
  } catch (error) {
    console.error('Error reading rclone config:', error)
    return NextResponse.json({
      error: 'Failed to read rclone config',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { content } = body

    if (typeof content !== 'string') {
      return NextResponse.json({
        error: 'Content must be a string'
      }, { status: 400 })
    }

    const configPath = await getConfigPath()
    
    // Ensure config directory exists
    const configDir = path.dirname(configPath)
    await execAsync(`mkdir -p "${configDir}"`)
    
    // Write config file
    await writeFile(configPath, content, 'utf-8')

    // Validate config
    try {
      const { stdout, stderr } = await execAsync('rclone config show 2>/dev/null')
      return NextResponse.json({
        success: true,
        path: configPath,
        message: 'Config updated successfully',
        validation: {
          valid: true,
          output: stdout,
          error: stderr
        }
      })
    } catch (validateError) {
      return NextResponse.json({
        success: true,
        path: configPath,
        message: 'Config updated but validation failed',
        validation: {
          valid: false,
          error: validateError instanceof Error ? validateError.message : 'Validation failed'
        }
      })
    }
  } catch (error) {
    console.error('Error updating rclone config:', error)
    return NextResponse.json({
      error: 'Failed to update rclone config',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}