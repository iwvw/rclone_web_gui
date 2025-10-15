'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FolderOpen
} from 'lucide-react'

interface ConfigData {
  path: string
  content: string
  exists: boolean
  error?: string
}

interface ValidationResult {
  valid: boolean
  output?: string
  error?: string
}

export default function RcloneConfigEditor() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rclone/config')
      const data = await response.json()
      
      if (response.ok) {
        setConfig(data)
        setContent(data.content)
        setValidation(null)
      } else {
        setConfig({
          path: '',
          content: '',
          exists: false,
          error: data.error
        })
      }
    } catch (error) {
      console.error('Error loading config:', error)
      setConfig({
        path: '',
        content: '',
        exists: false,
        error: 'Failed to load config'
      })
    } finally {
      setLoading(false)
      setHasChanges(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    try {
      setSaving(true)
      const response = await fetch('/api/rclone/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      const data = await response.json()

      if (response.ok) {
        setConfig({
          ...config,
          exists: true,
          content
        })
        setValidation(data.validation)
        setHasChanges(false)
      } else {
        setValidation({
          valid: false,
          error: data.error
        })
      }
    } catch (error) {
      console.error('Error saving config:', error)
      setValidation({
        valid: false,
        error: 'Failed to save config'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    setHasChanges(value !== (config?.content || ''))
    setValidation(null)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rclone Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading configuration...</span>
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
            <FileText className="h-5 w-5" />
            Rclone Configuration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadConfig}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reload
            </Button>
            <Button
              size="sm"
              onClick={saveConfig}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Edit rclone configuration file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config?.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{config.error}</AlertDescription>
          </Alert>
        )}

        {config && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4" />
              <span className="font-medium">Config Path:</span>
              <span className="text-muted-foreground">{config.path}</span>
              <Badge variant={config.exists ? "default" : "secondary"}>
                {config.exists ? "Exists" : "Not Found"}
              </Badge>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Configuration Content</label>
                {hasChanges && (
                  <Badge variant="outline" className="text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={`# Rclone configuration file
# Example remote:
# [myremote]
# type = s3
# access_key_id = YOUR_ACCESS_KEY
# secret_access_key = YOUR_SECRET_KEY
# region = us-east-1`}
                className="min-h-[300px] font-mono text-sm"
                spellCheck={false}
              />
            </div>

            {validation && (
              <Alert variant={validation.valid ? "default" : "destructive"}>
                {validation.valid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {validation.valid ? (
                    <div>
                      <div className="font-medium">Configuration is valid</div>
                      {validation.output && (
                        <div className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                          {validation.output}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">Configuration validation failed</div>
                      <div className="mt-1">{validation.error}</div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!config.exists && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Configuration file doesn't exist. You can create a new one by adding your remote configurations above.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Configuration format:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Each remote starts with [remote_name]</li>
                <li>Followed by key = value pairs</li>
                <li>Common types: s3, google cloud storage, dropbox, etc.</li>
                <li>Lines starting with # are comments</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}