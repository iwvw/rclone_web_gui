'use client'

import { useEffect, useRef, useState } from 'react'

interface TaskProgress {
  taskId: string
  progressBytes: bigint
  totalBytes: bigint
  speed: number
  currentFile?: string
  status: string
  timestamp: string
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<TaskProgress | null>(null)
  const socketRef = useRef<any>(null)

  useEffect(() => {
    // Use socket.io client
    const connect = () => {
      try {
        // Import socket.io-client dynamically to avoid SSR issues
        import('socket.io-client').then(({ io }) => {
          socketRef.current = io(url, {
            path: '/api/socketio'
          })

          socketRef.current.on('connect', () => {
            setIsConnected(true)
            console.log('WebSocket connected')
          })

          socketRef.current.on('task-progress', (data: TaskProgress) => {
            setLastMessage(data)
          })

          socketRef.current.on('disconnect', () => {
            setIsConnected(false)
            console.log('WebSocket disconnected')
          })

          socketRef.current.on('connect_error', (error: any) => {
            console.error('WebSocket connection error:', error)
          })
        })
      } catch (error) {
        console.error('Error creating WebSocket connection:', error)
      }
    }

    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [url])

  const subscribeToTask = (taskId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe-task-progress', taskId)
    }
  }

  const unsubscribeFromTask = (taskId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribe-task-progress', taskId)
    }
  }

  return {
    isConnected,
    lastMessage,
    subscribeToTask,
    unsubscribeFromTask
  }
}