'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Folder, 
  File, 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  Download,
  Copy,
  Move,
  RefreshCw
} from 'lucide-react'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
  path: string
}

interface FileBrowserProps {
  title: string
  files: FileItem[]
  currentPath: string
  onPathChange: (path: string) => void
  onFileSelect: (file: FileItem) => void
  selectedFiles: FileItem[]
  onSelectionChange: (files: FileItem[]) => void
}

export default function FileBrowser({
  title,
  files,
  currentPath,
  onPathChange,
  onFileSelect,
  selectedFiles,
  onSelectionChange
}: FileBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      onPathChange(file.path)
    } else {
      onFileSelect(file)
    }
  }

  const handleFileSelect = (file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation()
    const isSelected = selectedFiles.some(f => f.id === file.id)
    
    if (isSelected) {
      onSelectionChange(selectedFiles.filter(f => f.id !== file.id))
    } else {
      onSelectionChange([...selectedFiles, file])
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const navigateBack = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/')
    onPathChange(parentPath || '/')
  }

  const pathSegments = currentPath.split('/').filter(Boolean)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            size="sm"
            variant="ghost"
            onClick={navigateBack}
            disabled={currentPath === '/'}
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <div className="flex items-center gap-1">
            <span>/</span>
            {pathSegments.map((segment, index) => (
              <div key={index} className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto p-0 text-sm"
                  onClick={() => {
                    const newPath = '/' + pathSegments.slice(0, index + 1).join('/')
                    onPathChange(newPath)
                  }}
                >
                  {segment}
                </Button>
                {index < pathSegments.length - 1 && <span>/</span>}
              </div>
            ))}
          </div>
        </div>
        <Input
          placeholder="搜索文件..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-2"
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? '没有找到匹配的文件' : '此目录为空'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                    selectedFiles.some(f => f.id === file.id) ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.some(f => f.id === file.id)}
                    onChange={(e) => e.stopPropagation()}
                    onClick={(e) => handleFileSelect(file, e)}
                    className="rounded"
                  />
                  <div className="flex-shrink-0">
                    {file.type === 'directory' ? (
                      <Folder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <File className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {file.type === 'file' && formatFileSize(file.size)}
                      {file.modified && ` • ${new Date(file.modified).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant={file.type === 'directory' ? 'secondary' : 'outline'}>
                      {file.type === 'directory' ? '目录' : '文件'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="border-t p-3 flex gap-2">
          <Button size="sm" variant="outline" disabled={selectedFiles.length === 0}>
            <Copy className="mr-1 h-3 w-3" />
            复制
          </Button>
          <Button size="sm" variant="outline" disabled={selectedFiles.length === 0}>
            <Move className="mr-1 h-3 w-3" />
            移动
          </Button>
          <Button size="sm" variant="outline" disabled={selectedFiles.length === 0}>
            <RefreshCw className="mr-1 h-3 w-3" />
            同步
          </Button>
          <Button size="sm" variant="outline">
            <Upload className="mr-1 h-3 w-3" />
            上传
          </Button>
          <Button size="sm" variant="outline" disabled={selectedFiles.length === 0}>
            <Download className="mr-1 h-3 w-3" />
            下载
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}