import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json(
        { error: 'Missing required field: config' },
        { status: 400 }
      )
    }

    const remote = await db.remote.update({
      where: { id: params.id },
      data: {
        config: JSON.stringify(config),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(remote)
  } catch (error) {
    console.error('Error updating remote:', error)
    return NextResponse.json(
      { error: 'Failed to update remote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.remote.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting remote:', error)
    return NextResponse.json(
      { error: 'Failed to delete remote' },
      { status: 500 }
    )
  }
}