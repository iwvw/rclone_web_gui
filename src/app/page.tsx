'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Cloud, 
  FolderOpen, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Upload,
  Download,
  RefreshCw,
  Settings,
  Activity,
  Plus,
  Edit,
  Trash2,
  Copy,
  Move,
  Terminal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  FileText
} from 'lucide-react'
import FileBrowser from '@/components/FileBrowser'
import RCFileBrowser from '@/components/RCFileBrowser'
import RCManager from '@/components/RCManager'

interface RcloneStatus {
  installed: boolean
  version: string | null
  path: string | null
  error?: string
}

interface RcloneConfig {
  success: boolean
  config: string
  path: string
  message?: string
  warning?: string
}

interface RcloneTask {
  id: string
  command: string
  status: 'running' | 'completed' | 'error'
  progress?: {
    transferred: string
    total: string
    percent: number
    speed: string
    eta: string
    output: string
  }
  output: string
  error?: string
  startTime: string
  endTime?: string
}

interface FileItem {
  id: string
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
  path: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [rcloneStatus, setRcloneStatus] = useState<RcloneStatus | null>(null)
  const [rcloneConfig, setRcloneConfig] = useState<RcloneConfig | null>(null)
  const [configContent, setConfigContent] = useState('')
  const [tasks, setTasks] = useState<RcloneTask[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  
  // File browser state
  const [sourcePath, setSourcePath] = useState('/')
  const [targetPath, setTargetPath] = useState('/')
  const [selectedSourceFiles, setSelectedSourceFiles] = useState<FileItem[]>([])
  const [selectedTargetFiles, setSelectedTargetFiles] = useState<FileItem[]>([])

  // Mock file data
  const mockFiles: FileItem[] = [
    { id: '1', name: 'Documents', type: 'directory', path: '/Documents' },
    { id: '2', name: 'Pictures', type: 'directory', path: '/Pictures' },
    { id: '3', name: 'Videos', type: 'directory', path: '/Videos' },
    { id: '4', name: 'report.pdf', type: 'file', size: 1024 * 1024 * 2.5, path: '/report.pdf', modified: '2024-01-15' },
    { id: '5', name: 'presentation.pptx', type: 'file', size: 1024 * 1024 * 5.2, path: '/presentation.pptx', modified: '2024-01-14' },
    { id: '6', name: 'data.csv', type: 'file', size: 1024 * 512, path: '/data.csv', modified: '2024-01-13' },
  ]

  // Fetch rclone status on component mount
  useEffect(() => {
    fetchRcloneStatus()
    fetchRcloneConfig()
    
    // Set up polling for task progress
    const interval = setInterval(() => {
      updateTaskProgress()
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchRcloneStatus = async () => {
    try {
      const response = await fetch('/api/rclone/status')
      if (response.ok) {
        const data = await response.json()
        setRcloneStatus(data)
      }
    } catch (error) {
      console.error('Error fetching rclone status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRcloneConfig = async () => {
    try {
      const response = await fetch('/api/rclone/config')
      if (response.ok) {
        const data = await response.json()
        setRcloneConfig(data)
        setConfigContent(data.config || '')
      }
    } catch (error) {
      console.error('Error fetching rclone config:', error)
    }
  }

  const installRclone = async () => {
    setInstalling(true)
    try {
      const response = await fetch('/api/rclone/install', {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await fetchRcloneStatus()
          alert(`rclone 安装成功！版本: ${data.version}`)
        } else {
          alert(`rclone 安装失败: ${data.message}`)
        }
      }
    } catch (error) {
      console.error('Error installing rclone:', error)
      alert('rclone 安装过程中发生错误')
    } finally {
      setInstalling(false)
    }
  }

  const saveConfig = async () => {
    setSavingConfig(true)
    try {
      const response = await fetch('/api/rclone/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: configContent })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('配置文件保存成功')
          await fetchRcloneConfig()
        } else {
          alert(`配置文件保存失败: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('配置文件保存过程中发生错误')
    } finally {
      setSavingConfig(false)
    }
  }

  const executeRcloneCommand = async (command: string) => {
    const taskId = `task_${Date.now()}`
    
    try {
      const response = await fetch('/api/rclone/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command, taskId })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const newTask: RcloneTask = {
            id: taskId,
            command,
            status: 'running',
            output: '',
            startTime: new Date().toISOString()
          }
          setTasks(prev => [...prev, newTask])
        }
      }
    } catch (error) {
      console.error('Error executing command:', error)
    }
  }

  const cancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/rclone/execute?taskId=${taskId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, status: 'error', endTime: new Date().toISOString() }
            : task
        ))
      }
    } catch (error) {
      console.error('Error cancelling task:', error)
    }
  }

  const updateTaskProgress = async () => {
    for (const task of tasks) {
      if (task.status === 'running') {
        try {
          const response = await fetch(`/api/rclone/progress?taskId=${task.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.progress) {
              setTasks(prev => prev.map(t => 
                t.id === task.id 
                  ? { 
                      ...t, 
                      ...data.progress,
                      status: data.progress.completed ? 'completed' : 'running',
                      endTime: data.progress.completed ? new Date().toISOString() : undefined
                    }
                  : t
              ))
            }
          }
        } catch (error) {
          console.error('Error updating task progress:', error)
        }
      }
    }
  }

  const createTask = async (type: string, src: string, dst: string) => {
    const command = `rclone ${type} "${src}" "${dst}" --progress`
    await executeRcloneCommand(command)
  }

  // Calculate stats
  const stats = {
    activeTasks: tasks.filter(t => t.status === 'running').length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    totalTasks: tasks.length
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r min-h-screen p-4">
          <div className="flex items-center gap-2 mb-8">
            <Cloud className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Rclone GUI</h1>
          </div>
          
          {/* Rclone Status */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Rclone 状态</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="text-sm text-muted-foreground">检测中...</div>
              ) : rcloneStatus?.installed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">已安装</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    版本: {rcloneStatus.version}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    路径: {rcloneStatus.path}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">未安装</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={installRclone}
                    disabled={installing}
                    className="w-full"
                  >
                    {installing ? '安装中...' : '安装 Rclone'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <nav className="space-y-2">
            <Button
              variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('dashboard')}
            >
              <Activity className="mr-2 h-4 w-4" />
              仪表盘
            </Button>
            <Button
              variant={activeTab === 'browser' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('browser')}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              文件浏览器
            </Button>
            <Button
              variant={activeTab === 'rc-browser' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('rc-browser')}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              RC 文件浏览器
            </Button>
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('tasks')}
            >
              <Terminal className="mr-2 h-4 w-4" />
              任务执行
            </Button>
            <Button
              variant={activeTab === 'config' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('config')}
            >
              <FileText className="mr-2 h-4 w-4" />
              配置文件
            </Button>
            <Button
              variant={activeTab === 'rc' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('rc')}
            >
              <Activity className="mr-2 h-4 w-4" />
              RC 控制
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              设置
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">仪表盘</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">活动任务</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeTasks}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">已完成任务</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completedTasks}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">总任务数</CardTitle>
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalTasks}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rclone 状态</CardTitle>
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {rcloneStatus?.installed ? '运行中' : '未安装'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>活动任务</CardTitle>
                  <CardDescription>当前正在运行的任务</CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">暂无任务</div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={task.status === 'running' ? 'default' : 'secondary'}>
                                {task.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {task.command}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.status === 'running' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => cancelTask(task.id)}
                                >
                                  <Square className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {task.progress && (
                            <>
                              <Progress value={task.progress.percent} className="mb-2" />
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{task.progress.percent.toFixed(1)}%</span>
                                <span>{task.progress.speed}</span>
                                <span>ETA: {task.progress.eta}</span>
                              </div>
                            </>
                          )}
                          {task.output && (
                            <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                              {task.output.slice(-200)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">文件浏览器</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FileBrowser
                  title="源"
                  files={mockFiles}
                  currentPath={sourcePath}
                  onPathChange={setSourcePath}
                  onFileSelect={(file) => console.log('Selected source file:', file)}
                  selectedFiles={selectedSourceFiles}
                  onSelectionChange={setSelectedSourceFiles}
                />
                <FileBrowser
                  title="目标"
                  files={mockFiles}
                  currentPath={targetPath}
                  onPathChange={setTargetPath}
                  onFileSelect={(file) => console.log('Selected target file:', file)}
                  selectedFiles={selectedTargetFiles}
                  onSelectionChange={setSelectedTargetFiles}
                />
              </div>
              
              {/* Task Creation Buttons */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      已选择 {selectedSourceFiles.length} 个源文件，{selectedTargetFiles.length} 个目标位置
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        disabled={selectedSourceFiles.length === 0 || selectedTargetFiles.length === 0 || !rcloneStatus?.installed}
                        onClick={() => {
                          selectedSourceFiles.forEach(file => {
                            createTask('copy', file.path, targetPath)
                          })
                          setSelectedSourceFiles([])
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        复制到目标
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={selectedSourceFiles.length === 0 || selectedTargetFiles.length === 0 || !rcloneStatus?.installed}
                        onClick={() => {
                          selectedSourceFiles.forEach(file => {
                            createTask('move', file.path, targetPath)
                          })
                          setSelectedSourceFiles([])
                        }}
                      >
                        <Move className="mr-1 h-3 w-3" />
                        移动到目标
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={selectedSourceFiles.length === 0 || selectedTargetFiles.length === 0 || !rcloneStatus?.installed}
                        onClick={() => {
                          selectedSourceFiles.forEach(file => {
                            createTask('sync', file.path, targetPath)
                          })
                          setSelectedSourceFiles([])
                        }}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        同步到目标
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'rc-browser' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">RC 文件浏览器</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RCFileBrowser
                  title="源"
                  onFileSelect={(files) => console.log('Selected source files:', files)}
                  multiSelect={true}
                />
                <RCFileBrowser
                  title="目标"
                  onFileSelect={(files) => console.log('Selected target files:', files)}
                  multiSelect={true}
                />
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">任务执行</h2>
              <Card>
                <CardHeader>
                  <CardTitle>命令执行</CardTitle>
                  <CardDescription>直接执行 rclone 命令</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入 rclone 命令..."
                        className="flex-1 px-3 py-2 border rounded-md"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const command = e.currentTarget.value.trim()
                            if (command) {
                              executeRcloneCommand(command)
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                      />
                      <Button 
                        onClick={() => {
                          const input = document.querySelector('input[placeholder="输入 rclone 命令..."]') as HTMLInputElement
                          const command = input?.value.trim()
                          if (command) {
                            executeRcloneCommand(command)
                            input.value = ''
                          }
                        }}
                        disabled={!rcloneStatus?.installed}
                      >
                        执行
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>任务历史</CardTitle>
                  <CardDescription>所有执行的任务记录</CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">暂无任务历史</div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={task.status === 'running' ? 'default' : task.status === 'completed' ? 'secondary' : 'destructive'}>
                                {task.status}
                              </Badge>
                              <span className="font-medium">{task.command}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(task.startTime).toLocaleString()}
                            </div>
                          </div>
                          {task.output && (
                            <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted p-2 rounded max-h-32 overflow-y-auto">
                              {task.output}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">配置文件</h2>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>rclone.conf</CardTitle>
                      <CardDescription>
                        {rcloneConfig?.path || '配置文件路径'}
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={saveConfig}
                      disabled={savingConfig}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {savingConfig ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rcloneConfig?.warning && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {rcloneConfig.warning}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Textarea
                    value={configContent}
                    onChange={(e) => setConfigContent(e.target.value)}
                    placeholder="# rclone 配置文件
# 在这里添加您的远程存储配置
# 示例:
# [myremote]
# type = s3
# access_key_id = YOUR_ACCESS_KEY
# secret_access_key = YOUR_SECRET_KEY
# region = us-east-1"
                    className="min-h-[400px] font-mono"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'rc' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">RC 控制</h2>
              <RCManager />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">设置</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="text-muted-foreground">
                    设置功能正在开发中...
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}