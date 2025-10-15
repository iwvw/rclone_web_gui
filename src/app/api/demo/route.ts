import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Create sample remotes
    const remotes = await Promise.all([
      db.remote.create({
        data: {
          name: 'gdrive',
          type: 'Google Drive',
          config: JSON.stringify({
            client_id: 'sample_client_id',
            client_secret: 'sample_client_secret',
            scope: 'drive'
          })
        }
      }),
      db.remote.create({
        data: {
          name: 's3-backup',
          type: 'Amazon S3',
          config: JSON.stringify({
            access_key_id: 'sample_access_key',
            secret_access_key: 'sample_secret_key',
            region: 'us-east-1'
          })
        }
      }),
      db.remote.create({
        data: {
          name: 'local-backup',
          type: 'Local',
          config: JSON.stringify({
            path: '/backup'
          })
        }
      })
    ])

    // Create sample tasks
    const tasks = await Promise.all([
      db.task.create({
        data: {
          type: 'copy',
          src: '/home/user/documents',
          dst: 'gdrive:/backup/documents',
          status: 'running',
          progressBytes: BigInt(1024 * 1024 * 65), // 65MB
          totalBytes: BigInt(1024 * 1024 * 100), // 100MB
          speed: 12 * 1024 * 1024, // 12 MB/s
          currentFile: 'report.pdf'
        }
      }),
      db.task.create({
        data: {
          type: 'sync',
          src: '/home/user/photos',
          dst: 's3-backup:/photos',
          status: 'running',
          progressBytes: BigInt(1024 * 1024 * 30), // 30MB
          totalBytes: BigInt(1024 * 1024 * 100), // 100MB
          speed: 8 * 1024 * 1024, // 8 MB/s
          currentFile: 'vacation.jpg'
        }
      }),
      db.task.create({
        data: {
          type: 'move',
          src: '/home/user/downloads',
          dst: 'local-backup:/archive',
          status: 'completed',
          progressBytes: BigInt(1024 * 1024 * 50), // 50MB
          totalBytes: BigInt(1024 * 1024 * 50), // 50MB
          speed: 0
        }
      })
    ])

    return NextResponse.json({ 
      message: 'Sample data created successfully',
      remotes: remotes.length,
      tasks: tasks.length
    })
  } catch (error) {
    console.error('Error creating sample data:', error)
    return NextResponse.json(
      { error: 'Failed to create sample data' },
      { status: 500 }
    )
  }
}