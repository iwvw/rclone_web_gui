import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const remotes = await db.remote.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(remotes)
  } catch (error) {
    console.error('Error fetching remotes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch remotes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, config } = body

    if (!name || !type || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, config' },
        { status: 400 }
      )
    }

    // Check if remote name already exists
    const existingRemote = await db.remote.findUnique({
      where: { name }
    })

    if (existingRemote) {
      return NextResponse.json(
        { error: 'Remote with this name already exists' },
        { status: 409 }
      )
    }

    const remote = await db.remote.create({
      data: {
        name,
        type,
        config: JSON.stringify(config)
      }
    })

    return NextResponse.json(remote, { status: 201 })
  } catch (error) {
    console.error('Error creating remote:', error)
    return NextResponse.json(
      { error: 'Failed to create remote' },
      { status: 500 }
    )
  }
}