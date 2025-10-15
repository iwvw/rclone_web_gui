import { Server } from 'socket.io'

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('subscribe-task-progress', (taskId: string) => {
      socket.join(`task-${taskId}`)
      console.log(`Client ${socket.id} subscribed to task ${taskId}`)
    })

    socket.on('unsubscribe-task-progress', (taskId: string) => {
      socket.leave(`task-${taskId}`)
      console.log(`Client ${socket.id} unsubscribed from task ${taskId}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })
}

// Function to emit task progress updates
export const emitTaskProgress = (io: Server, taskId: string, progress: any) => {
  io.to(`task-${taskId}`).emit('task-progress', {
    taskId,
    ...progress,
    timestamp: new Date().toISOString()
  })
}