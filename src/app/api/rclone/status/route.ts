import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { access } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Check if rclone is installed
    try {
      await access('/usr/bin/rclone')
    } catch {
      // Try to find rclone in PATH
      try {
        await execAsync('which rclone')
      } catch {
        return NextResponse.json({
          installed: false,
          version: null,
          path: null,
          error: 'rclone not found'
        })
      }
    }

    // Get rclone version
    const { stdout } = await execAsync('rclone version 2>/dev/null')
    const versionMatch = stdout.match(/rclone v([0-9.]+)/)
    const version = versionMatch ? versionMatch[1] : null

    // Get rclone path
    const { stdout: pathOutput } = await execAsync('which rclone')
    const rclonePath = pathOutput.trim()

    return NextResponse.json({
      installed: true,
      version,
      path: rclonePath,
      fullVersion: stdout.trim()
    })
  } catch (error) {
    console.error('Error checking rclone status:', error)
    return NextResponse.json({
      installed: false,
      version: null,
      path: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}