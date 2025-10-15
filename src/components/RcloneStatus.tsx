'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  RefreshCw, 
  Terminal,
  AlertCircle
} from 'lucide-react'

interface RcloneStatus {
  installed: boolean
  version: string | null
  path: string | null
  error?: string
  fullVersion?: string
}

export default function RcloneStatus() {
  const [status, setStatus] = useState<RcloneStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [installOutput, setInstallOutput] = useState('')

  useEffect(() => {
    checkRcloneStatus()
  }, [])

  const checkRcloneStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rclone/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error checking rclone status:', error)
      setStatus({
        installed: false,
        version: null,
        path: null,
        error: 'Failed to check rclone status'
      })
    } finally {
      setLoading(false)
    }
  }

  const installRclone = async () => {
    try {
      setInstalling(true)
      setInstallOutput('Starting installation...')
      
      const response = await fetch('/api/rclone/install', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setInstallOutput(`Installation successful!\n\nOutput:\n${data.output}\n\nVersion: ${data.version}`)
        await checkRcloneStatus() // Refresh status
      } else {
        setInstallOutput(`Installation failed!\n\nError: ${data.error}\n\nOutput:\n${data.output}\n\nStderr:\n${data.stderr}`)
      }
    } catch (error) {
      console.error('Error installing rclone:', error)
      setInstallOutput(`Installation failed with error: ${error}`)
    } finally {
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Rclone Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking rclone status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Rclone Status
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={checkRcloneStatus}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Check and manage rclone installation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.installed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">Rclone is installed</span>
              <Badge variant="secondary">v{status.version}</Badge>
            </div>
            
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Version:</span> {status.version}
              </div>
              <div>
                <span className="font-medium">Path:</span> {status.path}
              </div>
              {status.fullVersion && (
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                  {status.fullVersion}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium">Rclone is not installed</span>
            </div>
            
            {status?.error && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>{status.error}</span>
              </div>
            )}
            
            <Button
              onClick={installRclone}
              disabled={installing}
              className="w-full"
            >
              {installing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install Rclone
                </>
              )}
            </Button>
            
            {installing && (
              <div className="text-sm text-muted-foreground">
                <p>Installing rclone using official installer...</p>
                <p className="mt-1">This may take a few minutes.</p>
              </div>
            )}
            
            {installOutput && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Installation Output:</div>
                <div className="p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {installOutput}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}