import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // WebSocket upgrade will be handled by the client
  return new NextResponse('WebSocket endpoint', { 
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}