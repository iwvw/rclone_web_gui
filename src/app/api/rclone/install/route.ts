import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // Check if running with sufficient privileges
    const { stdout: whoami } = await execAsync('whoami')
    const isRoot = whoami.trim() === 'root'

    let installCommand = ''
    if (isRoot) {
      // Running as root, install directly
      installCommand = 'curl https://rclone.org/install.sh | bash'
    } else {
      // Try to install with sudo
      installCommand = 'sudo -v && curl https://rclone.org/install.sh | sudo bash'
    }

    // Execute installation
    const { stdout, stderr } = await execAsync(installCommand, {
      timeout: 300000 // 5 minutes timeout
    })

    // Verify installation
    try {
      const { stdout: versionOutput } = await execAsync('rclone version')
      const versionMatch = versionOutput.match(/rclone v([0-9.]+)/)
      const version = versionMatch ? versionMatch[1] : null

      return NextResponse.json({
        success: true,
        version,
        message: 'rclone installed successfully',
        output: stdout,
        error: stderr
      })
    } catch (verifyError) {
      return NextResponse.json({
        success: false,
        error: 'Installation completed but verification failed',
        output: stdout,
        stderr: stderr
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error installing rclone:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Installation failed',
      output: '',
      stderr: ''
    }, { status: 500 })
  }
}